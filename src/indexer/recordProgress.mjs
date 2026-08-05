
export function recordProgress(done, totalFiles, startTime, preindexed, failed) {
  const elapsed = Date.now() - startTime;

  const avg = done ? elapsed / (done) : 0;
  const eta = avg * Math.max(0, totalFiles - done);

  const imgsPerSec = elapsed > 0
    ? (done / (elapsed / 1000)).toFixed(1)
    : "0.0";

  const total = totalFiles + preindexed;

  process.stdout.write(
    `\rprocessed: ${done} | total: ${String(total)} | generated: ${preindexed} | skipped: ${String(Math.max(total - done - preindexed, 0))} | failed: ${failed} | img/s: ${imgsPerSec} | ETA: ${eta}`
  )
}
