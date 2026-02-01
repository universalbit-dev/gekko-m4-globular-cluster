#!/usr/bin/env node
/**
 * scripts/postinstall-tfjs-node.js
 *
 * Robust, best-effort installer to build @tensorflow/tfjs-node from source in the
 * postinstall step. This script:
 * - Skips if @tensorflow/tfjs-node is already resolvable.
 * - Performs environment checks (python, node-gyp, compiler / MSBuild) and prints
 *   actionable warnings when missing.
 * - Attempts `npm rebuild` first, then falls back to `npm install --build-from-source`.
 * - Runs cross-platform (POSIX / Windows).
 * - Never fails the overall install (always exits 0). It logs clear next steps when build fails.
 *
 * Notes:
 * - Building tfjs-node requires native build toolchain: Python, node-gyp, C/C++ toolchain.
 * - For CI or developer machines, prefer using a Node 18 image / container where prebuilt binaries exist.
 *
 * Usage: invoked automatically as "postinstall" script. It is safe / best-effort.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PKG = '@tensorflow/tfjs-node';
const PKG_SPEC = '@tensorflow/tfjs-node@^4.22.0'; // change if needed

function log(...args) { console.log('[postinstall-tfjs-node]', ...args); }
function warn(...args) { console.warn('[postinstall-tfjs-node][WARN]', ...args); }
function err(...args) { console.error('[postinstall-tfjs-node][ERR]', ...args); }

/**
 * Run a command and stream output. Resolves with { code, signal }.
 * envAdd is an object of extra env vars to set (merged with process.env).
 */
function runCmd(cmd, args = [], envAdd = {}, opts = {}) {
  return new Promise((resolve) => {
    log(`> ${[cmd, ...args].join(' ')}`);
    const env = Object.assign({}, process.env, envAdd);
    const p = spawn(cmd, args, Object.assign({ stdio: 'inherit', env }, opts));
    p.on('close', (code, signal) => resolve({ code, signal }));
    p.on('error', (e) => {
      err('spawn error', e && e.message ? e.message : e);
      resolve({ code: 1, signal: null });
    });
  });
}

/**
 * Check whether a command exists on PATH. Cross-platform.
 */
function commandExistsSync(cmd) {
  try {
    if (process.platform === 'win32') {
      const where = spawnSyncNoThrow('where', [cmd]);
      return where && where.code === 0;
    } else {
      const which = spawnSyncNoThrow('which', [cmd]);
      return which && which.code === 0;
    }
  } catch (_) { return false; }
}

function spawnSyncNoThrow(cmd, args = []) {
  try {
    const { spawnSync } = require('child_process');
    return spawnSync(cmd, args, { stdio: 'ignore' });
  } catch (_) {
    return null;
  }
}

/**
 * Try to require the package. Returns true on success.
 */
function isPkgAvailable(pkgName) {
  try {
    require.resolve(pkgName);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Helpful diagnostics for common build prerequisites.
 */
function diagnostics() {
  log('Diagnostics:');
  log('Platform:', process.platform, 'Arch:', process.arch);
  log('Node version:', process.version);
  log('Working dir:', process.cwd());
  // python
  const hasPython = commandExistsSync('python3') || commandExistsSync('python');
  log('Python available:', hasPython);
  // node-gyp (local or global)
  let hasNodeGyp = false;
  try {
    // check local node_modules/.bin
    const localNodeGyp = path.join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'node-gyp.cmd' : 'node-gyp');
    if (fs.existsSync(localNodeGyp)) hasNodeGyp = true;
  } catch (_) {}
  if (!hasNodeGyp) hasNodeGyp = commandExistsSync('node-gyp');
  log('node-gyp available:', hasNodeGyp);
  // compiler
  let hasCompiler = false;
  if (process.platform === 'win32') {
    // check for msbuild or vswhere (very rough)
    hasCompiler = commandExistsSync('msbuild') || commandExistsSync('cl') || commandExistsSync('vswhere');
  } else {
    hasCompiler = commandExistsSync('gcc') || commandExistsSync('clang') || commandExistsSync('g++') || commandExistsSync('make');
  }
  log('C/C++ build tools available:', hasCompiler);
  return { hasPython, hasNodeGyp, hasCompiler };
}

/**
 * Best-effort attempt to build using `npm rebuild`.
 */
async function tryRebuild() {
  log('Attempting: npm rebuild', PKG, '--build-from-source');
  // npm rebuild <pkg> --build-from-source
  const args = ['rebuild', PKG, '--build-from-source', '--no-audit', '--no-fund'];
  // Ensure npm_config_build_from_source in env to instruct submodules
  const res = await runCmd(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { npm_config_build_from_source: 'true' });
  return res && res.code === 0;
}

/**
 * Fallback: install the package explicitly from npm (build from source).
 */
async function tryInstall() {
  log('Attempting: npm install', PKG_SPEC, '--build-from-source');
  const args = ['i', PKG_SPEC, '--build-from-source', '--no-audit', '--no-fund', '--no-save'];
  // On some npm versions, --no-save ensures package.json not modified in this step.
  const res = await runCmd(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { npm_config_build_from_source: 'true' });
  return res && res.code === 0;
}

/**
 * Print next steps and platform-specific tips.
 */
function printNextSteps(diag) {
  warn('tfjs-node build did NOT succeed (best-effort). The overall install will continue, but runtime may fall back to @tensorflow/tfjs (pure JS) which is slower and does not support file:// model saving.');
  console.log('');
  console.log('Suggested next steps:');
  console.log('- Ensure build toolchain is installed for your platform:');
  if (process.platform === 'linux') {
    console.log('  * Debian/Ubuntu: sudo apt-get update && sudo apt-get install -y build-essential python3 python3-dev git');
    console.log('  * Then: npm i -g node-gyp');
  } else if (process.platform === 'darwin') {
    console.log('  * macOS: xcode-select --install  (install Xcode CLI tools)');
    console.log('  * Ensure Python 3 is installed (brew install python) and npm i -g node-gyp');
  } else if (process.platform === 'win32') {
    console.log('  * Windows: Install "Desktop development with C++" workload and Python. See https://github.com/nodejs/node-gyp for details.');
  }
  console.log('');
  console.log('Try building manually (recommended to see full logs):');
  if (process.platform === 'win32') {
    console.log('  cmd /C "set npm_config_build_from_source=1 && npm i ' + PKG_SPEC + ' --build-from-source"');
  } else {
    console.log('  npm_config_build_from_source=1 npm i ' + PKG_SPEC + ' --build-from-source');
  }
  console.log('');
  console.log('If you cannot build native modules on this machine, consider:');
  console.log('- Running training inside a Node 18 Docker container where prebuilt tfjs-node binaries are available.');
  console.log('- Using @tensorflow/tfjs (WASM or CPU) as a fallback (you will need a custom file save handler).');
  console.log('');
  console.log('If you want, paste the output of this script and the manual build logs and I can help triage further.');
}

/**
 * Main flow.
 */
(async function main() {
  try {
    log('postinstall for', PKG);
    if (isPkgAvailable(PKG)) {
      log(`${PKG} is already present (skipping build).`);
      return process.exit(0);
    }

    const diag = diagnostics();

    // Warn if obvious prerequisites missing
    if (!diag.hasPython) warn('Python not found on PATH. node-gyp requires Python (v3 recommended).');
    if (!diag.hasNodeGyp) warn('node-gyp not found (local or global). Installing node-gyp globally may help (npm i -g node-gyp).');
    if (!diag.hasCompiler) warn('No C/C++ compiler/toolchain detected. Install platform build tools.');

    // Try npm rebuild first (quieter if package already in node_modules)
    let ok = false;
    try {
      ok = await tryRebuild();
      if (ok) {
        log('npm rebuild succeeded.');
      } else {
        log('npm rebuild did not succeed, will try npm install --build-from-source.');
      }
    } catch (e) {
      warn('npm rebuild attempt failed to run:', e && e.message ? e.message : e);
    }

    if (!ok) {
      try {
        ok = await tryInstall();
        if (ok) log('npm install --build-from-source succeeded.');
      } catch (e) {
        warn('npm install attempt failed to run:', e && e.message ? e.message : e);
      }
    }

    // Final check
    if (ok && isPkgAvailable(PKG)) {
      log(`${PKG} built and available.`);
      return process.exit(0);
    }

    // Some environments install the package into npm global cache or different location;
    // attempt to require again (best-effort)
    if (isPkgAvailable(PKG)) {
      log(`${PKG} available after attempts.`);
      return process.exit(0);
    }

    // If not available, print next steps but do NOT fail the install.
    printNextSteps(diag);
    return process.exit(0);
  } catch (e) {
    err('Unexpected error in postinstall script:', e && e.stack ? e.stack : e && e.message ? e.message : e);
    // Do not fail overall install
    return process.exit(0);
  }
})();
