#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd, args) {
  try {
    const res = spawnSync(cmd, args, { stdio: 'inherit' });
    if (res.error) throw res.error;
    return res.status === 0;
  } catch (e) {
    console.warn(`Command failed: ${cmd} ${args.join(' ')} — ${e.message}`);
    return false;
  }
}

const repoRoot = path.resolve(__dirname, '..');

// Try to rebuild tulind from source, fallback to install-from-source
if (!run('npm', ['rebuild', 'tulind', '--build-from-source'])) {
  console.warn('npm rebuild tulind failed, trying npm install --build-from-source tulind');
  run('npm', ['install', 'tulind', '--build-from-source']);
}

// keep npm link exchange (original behaviour)
if (!run('npm', ['link', 'exchange'])) {
  console.warn('npm link exchange failed (continuing)');
}

// Compute node ABI/modules version, platform and arch
const modulesVersion = (process.versions && process.versions.modules) ? process.versions.modules : process.versions.node;
const platform = process.platform; // e.g. linux, darwin, win32
const arch = process.arch; // e.g. x64, arm64

const src = path.join(repoRoot, 'node_modules', 'tulind', 'build', 'Release', 'tulind.node');
const destDir = path.join(repoRoot, 'node_modules', 'tulind', 'lib', 'binding', 'Release', `node-v${modulesVersion}-${platform}-${arch}`);
const dest = path.join(destDir, 'tulind.node');

try {
  if (fs.existsSync(src)) {
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`Copied tulind.node to ${dest}`);
  } else {
    console.warn(`tulind.node not found at ${src}. Build may have failed or path changed.`);
  }
} catch (err) {
  console.warn('Failed to copy tulind.node:', err && err.message);
}

process.exit(0);
