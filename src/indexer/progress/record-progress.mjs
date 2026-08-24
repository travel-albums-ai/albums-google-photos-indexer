
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 'B';
  for (const nextUnit of units) {
    value /= 1024;
    unit = nextUnit;
    if (value < 1024) break;
  }
  return `${value.toFixed(1)} ${unit}`;
}

export function recordProgress(done, totalFiles, startTime, preindexed, failed, metrics) {
  const elapsed = Date.now() - startTime;

  const avg = done ? elapsed / (done) : 0;
  const eta = avg * Math.max(0, totalFiles - done);

  const imgsPerSec = metrics?.imagesPerSecond?.toFixed(1) ?? "0.0";

  const total = totalFiles + preindexed;

  process.stdout.write(
    `\rprocessed: ${done} | total: ${String(total)} | preindexed: ${preindexed} | pending: ${String(Math.max(total - done - preindexed, 0))} | failed: ${failed} | img/s: ${imgsPerSec} | size: ${formatBytes(metrics?.bytesConsumed ?? 0)} | RAM: ${((metrics?.ramUsageBytes ?? 0) / 1024 / 1024).toFixed(1)} MB | CPU: ${(metrics?.cpuUsagePercent ?? 0).toFixed(1)}% | ETA: ${eta}`
  )
}
