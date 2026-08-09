import start from '../indexer-cli.mjs';

(async () => {
  const controller = start({ cfg: { TAKEOUT_ROOTS: ['.'], TARGET_ROOT: './.test-output' } });

  // Stop quickly to exercise cooperative shutdown
  setTimeout(() => controller.stop(), 200);

  try {
    await controller.done;
    // success if done resolves (either stopped or completed)
    console.log('Test: controller.done resolved, status=', controller.status);
    process.exit(0);
  } catch (err) {
    console.error('Test failed, done rejected', err);
    process.exit(2);
  }
})();
