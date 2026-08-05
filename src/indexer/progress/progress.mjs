import { recordProgress } from './record-progress.mjs';

export function createProgress(startTime) {
  let totalFound = 0, totalFiles = 0, done = 0, preindexed = 0, failed = 0;

  return {
    addFound: () => { totalFound++; },
    addFile: (n = 1) => { totalFiles += n; },
    incDone: () => { done++; },
    incFailed: () => { failed++; },
    setPreindexed: n => { preindexed = n; },
    getState: () => ({ totalFound, totalFiles, done, preindexed, failed }),
    log: () => recordProgress(done, totalFiles, startTime, preindexed, failed),
  };
}
