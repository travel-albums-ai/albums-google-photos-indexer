#!/usr/bin/env bun

import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , architecture, outputArg] = process.argv;
const outputDir = path.resolve(outputArg || `dist-${architecture}`);
const targets = {
  arm64: { bunTarget: 'bun-windows-arm64', launcher: 'run-arm64.cmd' },
  x64: { bunTarget: 'bun-windows-x64', launcher: 'run-x64.cmd' },
};

if (!targets[architecture]) throw new Error(`Unsupported architecture: ${architecture}`);

const target = targets[architecture];
const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const zipPath = path.join(projectDir, `TravelAlbums-${architecture}.zip`);

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

execFileSync('bun', [
  'build',
  path.join(projectDir, 'server.mjs'),
  '--compile',
  `--target=${target.bunTarget}`,
  `--outfile=${path.join(outputDir, 'server.exe')}`,
  '--minify',
], { cwd: projectDir, stdio: 'inherit' });

await fs.copyFile(path.join(projectDir, 'server-config-win.json'), path.join(outputDir, 'server-config.json'));
await fs.copyFile(path.join(projectDir, 'README.md'), path.join(outputDir, 'README.md'));
await fs.copyFile(path.join(projectDir, 'logo.ico'), path.join(outputDir, 'logo.ico'));
await fs.copyFile(path.join(projectDir, target.launcher), path.join(outputDir, target.launcher));
await fs.copyFile(path.join(projectDir, 'launcher.ps1'), path.join(outputDir, 'launcher.ps1'));

await fs.rm(zipPath, { force: true });
if (process.platform === 'win32') {
  execFileSync('powershell', [
    '-NoProfile',
    '-Command',
    `Compress-Archive -Force -Path "${path.basename(outputDir)}\\*" -DestinationPath "${zipPath}"`,
  ], { cwd: path.dirname(outputDir), stdio: 'inherit', shell: true });
} else {
  execFileSync('zip', ['-qr', zipPath, path.basename(outputDir)], {
    cwd: path.dirname(outputDir),
    stdio: 'inherit',
  });
}

console.log(`Created ${outputDir} and ${zipPath}`);
