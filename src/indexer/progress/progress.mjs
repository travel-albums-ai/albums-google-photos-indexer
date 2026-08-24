import { recordProgress } from './record-progress.mjs';

export function createProgress(startTime) {
  const initialCpu = process.cpuUsage();
  let totalFound = 0, totalFiles = 0, done = 0, preindexed = 0, failed = 0, bytesConsumed = 0;

  function getMetrics() {
    const elapsedMs = Date.now() - startTime;
    const cpu = process.cpuUsage(initialCpu);
    const cpuUsagePercent = elapsedMs > 0
      ? ((cpu.user + cpu.system) / (elapsedMs * 1000)) * 100
      : 0;

    return {
      imagesPerSecond: elapsedMs > 0 ? done / (elapsedMs / 1000) : 0,
      bytesConsumed,
      ramUsageBytes: process.memoryUsage().rss,
      cpuUsagePercent,
    };
  }

  return {
    addFound: () => { totalFound++; },
    addFile: (n = 1) => { totalFiles += n; },
    incDone: () => { done++; },
    incFailed: () => { failed++; },
    addBytes: (n = 0) => { bytesConsumed += n; },
    setPreindexed: n => { preindexed = n; },
    getState: () => ({ totalFound, totalFiles, done, preindexed, failed, ...getMetrics() }),
    log: () => recordProgress(done, totalFiles, startTime, preindexed, failed, getMetrics()),
  };
}
