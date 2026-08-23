#!/usr/bin/env bun

import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , platform, architecture] = process.argv;
const targets = {
  windows: {
    config: 'server-config-win.json',
    executable: 'server.exe',
    launchers: ['run-windows.cmd', 'launcher.ps1'],
    targets: { arm64: 'bun-windows-arm64', x64: 'bun-windows-x64' },
  },
  macos: {
    config: 'server-config.default.json',
    executable: 'server',
    launchers: ['run-macos.sh'],
    targets: { arm64: 'bun-darwin-arm64', x64: 'bun-darwin-x64' },
  },
  ubuntu: {
    config: 'server-config.default.json',
    executable: 'server',
    launchers: ['run-ubuntu.sh'],
    targets: { arm64: 'bun-linux-arm64', x64: 'bun-linux-x64' },
  },
};

if (!targets[platform]) throw new Error(`Unsupported platform: ${platform}`);
if (!targets[platform].targets[architecture]) {
  throw new Error(`Unsupported architecture for ${platform}: ${architecture}`);
}

const target = targets[platform];
const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.resolve(`dist-${platform}-${architecture}`);
const archiveExtension = platform === 'windows' ? '.zip' : '.tar.gz';
const archivePath = path.join(projectDir, `TravelAlbums-${platform}-${architecture}${archiveExtension}`);
const executablePath = path.join(outputDir, target.executable);

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

execFileSync('bun', [
  'build',
  path.join(projectDir, 'server.mjs'),
  '--compile',
  `--target=${target.targets[architecture]}`,
  `--outfile=${executablePath}`,
  '--minify',
], { cwd: projectDir, stdio: 'inherit' });

await fs.copyFile(path.join(projectDir, target.config), path.join(outputDir, 'server-config.json'));
await fs.copyFile(path.join(projectDir, 'README.md'), path.join(outputDir, 'README.md'));
for (const launcher of target.launchers) {
  await fs.copyFile(path.join(projectDir, launcher), path.join(outputDir, launcher));
}

if (platform === 'windows') {
  await fs.copyFile(path.join(projectDir, 'logo.ico'), path.join(outputDir, 'logo.ico'));
}

for (const launcher of target.launchers) {
  if (launcher.endsWith('.sh')) {
    await fs.chmod(path.join(outputDir, launcher), 0o755);
  }
}

await fs.rm(archivePath, { force: true });
if (platform === 'windows' && process.platform === 'win32') {
  execFileSync('powershell', [
    '-NoProfile',
    '-Command',
    `Compress-Archive -Force -Path "${path.basename(outputDir)}\\*" -DestinationPath "${archivePath}"`,
  ], { cwd: path.dirname(outputDir), stdio: 'inherit', shell: true });
} else if (platform === 'windows') {
  execFileSync('zip', ['-qr', archivePath, path.basename(outputDir)], {
    cwd: path.dirname(outputDir),
    stdio: 'inherit',
  });
} else {
  execFileSync('tar', ['-czf', archivePath, '-C', path.dirname(outputDir), path.basename(outputDir)], {
    cwd: projectDir,
    stdio: 'inherit',
  });
}

console.log(`Created ${outputDir} and ${archivePath}`);
