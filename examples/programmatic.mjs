import start from '../indexer-cli.mjs';

(async () => {
  const controller = start({ cfg: { TAKEOUT_ROOTS: ['.'], TARGET_ROOT: './.example-output' } });

  controller.on('start', () => console.log('Indexer started'));
  controller.on('done', () => console.log('Indexer done'));
  controller.on('stop', () => console.log('Indexer stopped'));
  controller.on('error', (err) => console.error('Indexer error', err));

  // stop after a short time (demo)
  setTimeout(() => controller.stop(), 500);

  await controller.done;
  console.log('Programmatic example finished');
})();
