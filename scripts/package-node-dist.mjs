#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const [, , architecture, outputArg] = process.argv;
const outputDir = path.resolve(outputArg || `dist-${architecture}`);
const nodeVersion = '22.14.0';
const targets = {
  arm64: {
    nodeArchive: `node-v${nodeVersion}-win-arm64`,
    zipName: 'TravelAlbums-arm64.zip',
    sharp: '@img/sharp-win32-arm64',
    libvips: '@img/sharp-libvips-win32-arm64',
    launcher: 'run-arm64.cmd',
    trayLauncher: 'launcher.ps1',
  },
  x64: {
    nodeArchive: `node-v${nodeVersion}-win-x64`,
    zipName: 'TravelAlbums-x64.zip',
    sharp: '@img/sharp-win32-x64',
    libvips: '@img/sharp-libvips-win32-x64',
    launcher: 'run-x64.cmd',
    trayLauncher: 'launcher.ps1',
  },
};

if (!targets[architecture]) {
  throw new Error(`Unsupported architecture: ${architecture}`);
}

const target = targets[architecture];
const projectDir = path.resolve(import.meta.dirname, '..');
const zipPath = path.join(projectDir, target.zipName);
const archivePath = path.join(os.tmpdir(), `${target.nodeArchive}.zip`);
const extractDir = path.join(os.tmpdir(), target.nodeArchive);
const nodeUrl = `https://nodejs.org/dist/v${nodeVersion}/${target.nodeArchive}.zip`;

await fs.rm(outputDir, { recursive: true, force: true });
await fs.rm(extractDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

const response = await fetch(nodeUrl);
if (!response.ok) throw new Error(`Failed to download Node.js: ${response.status} ${nodeUrl}`);
await fs.writeFile(archivePath, Buffer.from(await response.arrayBuffer()));
execFileSync('unzip', ['-q', archivePath, '-d', os.tmpdir()]);

await fs.copyFile(path.join(extractDir, 'node.exe'), path.join(outputDir, 'node.exe'));
await fs.cp(path.join(projectDir, 'src'), path.join(outputDir, 'src'), { recursive: true });
await fs.copyFile(path.join(projectDir, 'server.mjs'), path.join(outputDir, 'server.mjs'));
await fs.copyFile(path.join(projectDir, 'indexer-cli.mjs'), path.join(outputDir, 'indexer-cli.mjs'));
await fs.copyFile(path.join(projectDir, 'server-config-win.json'), path.join(outputDir, 'server-config.json'));
await fs.copyFile(path.join(projectDir, 'README.md'), path.join(outputDir, 'README.md'));
await fs.copyFile(path.join(projectDir, target.launcher), path.join(outputDir, target.launcher));
await fs.copyFile(path.join(projectDir, target.trayLauncher), path.join(outputDir, target.trayLauncher));

execFileSync('npm', [
  'install',
  '--prefix', outputDir,
  '--no-save',
  '--package-lock=false',
  '--ignore-scripts',
  '--force',
  '--include=optional',
  'express@5.1.0',
  'sharp@0.35.3',
  `${target.sharp}@0.35.3`,
  `${target.libvips}@1.3.2`,
], { cwd: projectDir, stdio: 'inherit' });

await fs.rm(zipPath, { force: true });
execFileSync('zip', ['-qr', zipPath, path.basename(outputDir)], {
  cwd: path.dirname(outputDir),
  stdio: 'inherit',
});

await fs.rm(archivePath, { force: true });
await fs.rm(extractDir, { recursive: true, force: true });
console.log(`Created ${outputDir} and ${zipPath}`);
