#!/usr/bin/env node
// tools/script/postinstall.js
// postinstall helper: rebuild tulind, optionally link local exchange if safe,
// and copy built tulind.node to the expected binding directory.
// Finds project root by locating nearest ancestor with package.json (robust to placement).

const { spawnSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, Object.assign({ stdio: 'inherit' }, opts));
  if (res.error) {
    throw res.error;
  }
  return res.status;
}

function safeExec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (e) {
    return null;
  }
}

function findProjectRoot(startDir) {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;
  while (true) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    if (dir === root) return null;
    dir = path.dirname(dir);
  }
}

(async function main() {
  try {
    const scriptDir = __dirname; // location of this script
    const projectRoot = findProjectRoot(scriptDir) || findProjectRoot(process.cwd());
    if (!projectRoot) {
      console.error('postinstall: cannot determine project root (no package.json found). Exiting.');
      process.exit(0);
    }

    console.log('postinstall: projectRoot =', projectRoot);
    console.log('postinstall: rebuilding tulind (may take a while)...');

    try {
      run('npm', ['rebuild', 'tulind', '--build-from-source'], { cwd: projectRoot });
      console.log('postinstall: rebuilt dependencies successfully');
    } catch (e) {
      console.warn('postinstall: npm rebuild failed or exited non-zero (continuing):', e && e.message);
    }

    // Attempt to create local link for exchange only if exchange exists and prefix is user-writable.
    const exchangeDir = path.join(projectRoot, 'exchange');
    if (fs.existsSync(path.join(exchangeDir, 'package.json'))) {
      const prefix = safeExec('npm config get prefix') || '';
      const homedir = os.homedir();
      if (prefix && prefix.startsWith(homedir)) {
        console.log('postinstall: npm global prefix appears to be user-writable. Creating npm link for exchange...');
        try {
          run('npm', ['link'], { cwd: exchangeDir });
          run('npm', ['link', 'exchange'], { cwd: projectRoot });
          console.log('postinstall: npm link exchange completed');
        } catch (err) {
          console.warn('postinstall: npm link failed (continuing):', err && err.message);
        }
      } else {
        console.log(`postinstall: skipping npm link for exchange because prefix is not user-writable (${prefix}).`);
        console.log('If you want the global link, run (under nvm / as the user):\n  cd ./exchange && npm link && cd ../ && npm link exchange');
      }
    } else {
      console.log('postinstall: no local exchange package found at', exchangeDir);
    }

    // Copy tulind built binding to the node ABI-specific path used by some tooling.
    const builtPath = path.join(projectRoot, 'node_modules', 'tulind', 'build', 'Release', 'tulind.node');
    const destDir = path.join(
      projectRoot,
      'node_modules',
      'tulind',
      'lib',
      'binding',
      'Release',
      `node-v${process.versions.modules}-linux-x64`
    );
    if (fs.existsSync(builtPath)) {
      fs.mkdirSync(destDir, { recursive: true });
      const destFile = path.join(destDir, 'tulind.node');
      fs.copyFileSync(builtPath, destFile);
      console.log('postinstall: copied tulind.node to', destFile);
    } else {
      console.warn('postinstall: built tulind.node not found at', builtPath, '(skipping copy)');
    }

    console.log('postinstall: done.');
    process.exit(0);
  } catch (err) {
    console.error('postinstall: unexpected error:', err);
    // Do not fail overall install — keep non-zero exit only if you want strict behavior
    process.exit(0);
  }
})();
