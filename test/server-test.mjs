import assert from 'node:assert/strict';
import { once } from 'node:events';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createServer } from '../server.mjs';

const targetRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'albums-indexer-server-'));
const takeoutRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'albums-indexer-takeout-'));
const rootIndex = Buffer.from(path.resolve(takeoutRoot)).toString('base64');
const controllers = [];

function createFakeIndexer() {
  let resolveDone;
  const controller = {
    status: 'running',
    progress: { getState: () => ({ totalFound: 1, totalFiles: 1, done: 0, preindexed: 0, failed: 0 }) },
    outFile: path.join(targetRoot, 'metadata.json'),
    done: new Promise(resolve => { resolveDone = resolve; }),
    stop() {
      this.status = 'stopped';
      resolveDone();
    },
  };
  controllers.push(controller);
  return controller;
}

const { app } = createServer({
  cfg: { TARGET_ROOT: targetRoot, TAKEOUT_ROOTS: [takeoutRoot] },
  indexerStart: createFakeIndexer,
});
const server = app.listen(0);
await once(server, 'listening');
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

async function request(route, options) {
  const response = await fetch(`${baseUrl}${route}`, options);
  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text();
  return { response, body };
}

try {
  let result = await request('/status');
  assert.equal(result.response.status, 200);
  assert.equal(result.body.status, 'idle');

  result = await request('/metadata');
  assert.equal(result.response.status, 404);

  await fsp.mkdir(path.join(takeoutRoot, 'album'), { recursive: true });
  await fsp.mkdir(path.join(targetRoot, 'thumbnails', rootIndex, 'album'), { recursive: true });
  await fsp.writeFile(path.join(takeoutRoot, 'album', 'photo.jpg'), 'original');
  await fsp.writeFile(path.join(targetRoot, 'thumbnails', rootIndex, 'album', 'photo.jpg'), 'thumbnail');

  let imageResponse = await fetch(`${baseUrl}/images/${rootIndex}/album/photo.jpg`);
  assert.equal(imageResponse.status, 200);
  assert.equal(await imageResponse.text(), 'original');
  assert.equal(imageResponse.headers.get('cache-control'), 'public, max-age=36000, immutable');

  imageResponse = await fetch(`${baseUrl}/thumbnails/${rootIndex}/album/photo.jpg`);
  assert.equal(imageResponse.status, 200);
  assert.equal(await imageResponse.text(), 'thumbnail');
  assert.equal(imageResponse.headers.get('cache-control'), 'public, max-age=31536000, immutable');

  imageResponse = await fetch(`${baseUrl}/images/${rootIndex}/../outside.jpg`);
  assert.equal(imageResponse.status, 404);

  result = await request('/on');
  assert.equal(result.response.status, 202);
  assert.equal(result.body.started, true);
  assert.equal(controllers.length, 1);

  result = await request('/on');
  assert.equal(result.response.status, 200);
  assert.equal(result.body.started, false);
  assert.equal(controllers.length, 1);

  result = await request('/off');
  assert.equal(result.response.status, 200);
  assert.equal(result.body.status, 'stopped');

  result = await request('/off');
  assert.equal(result.response.status, 200);
  assert.equal(result.body.status, 'stopped');

  const metadata = '{"ready":true}\n'.repeat(100);
  await fsp.writeFile(path.join(targetRoot, 'metadata.json'), metadata);
  const fileResponse = await fetch(`${baseUrl}/takeout-metadata`, {
    headers: { 'Accept-Encoding': 'gzip' },
  });
  assert.equal(fileResponse.status, 200);
  assert.equal(fileResponse.headers.get('content-encoding'), 'gzip');
  assert.equal(fileResponse.headers.get('vary'), 'Accept-Encoding');
  assert.equal(await fileResponse.text(), metadata);

  result = await request('/on');
  assert.equal(result.response.status, 202);
  assert.equal(result.body.started, true);
  assert.equal(controllers.length, 2);
} finally {
  for (const controller of controllers) {
    if (controller.status === 'running') controller.stop();
  }
  server.close();
  await fsp.rm(targetRoot, { recursive: true, force: true });
  await fsp.rm(takeoutRoot, { recursive: true, force: true });
}

console.log('Server test passed');
