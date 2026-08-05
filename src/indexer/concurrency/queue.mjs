export const createQueue = (maxSize = Infinity) => {
  const items = [];
  const takers = [];
  const putWaiters = [];
  let closed = false;

  const api = {
    push: async (item) => {
      if (closed) throw new Error('Queue closed');
      if (items.length >= maxSize) {
        await new Promise(res => putWaiters.push(res));
      }
      if (takers.length) {
        const t = takers.shift();
        t(item);
      } else {
        items.push(item);
      }
    },
    pop: async () => {
      if (items.length) {
        const it = items.shift();
        if (putWaiters.length) {
          const p = putWaiters.shift();
          p();
        }
        return it;
      }
      if (closed) return null;
      return await new Promise(res => takers.push(res));
    },
    close: () => {
      closed = true;
      while (takers.length) takers.shift()(null);
      while (putWaiters.length) putWaiters.shift()();
    },
    get length() { return items.length; },
  };

  api[Symbol.asyncIterator] = function () {
    const q = this;
    return {
      next: async () => {
        const v = await q.pop();
        if (v === null) return { done: true };
        return { value: v, done: false };
      },
      return: async () => {
        q.close();
        return { done: true };
      }
    };
  };

  return api;
};

export const createSemaphore = (count) => {
  let available = count;
  const waiters = [];
  const acquire = () => new Promise(resolve => {
    if (available > 0) {
      available -= 1;
      return resolve();
    }
    waiters.push(resolve);
  });

  const release = () => {
    available += 1;
    const next = waiters.shift();
    if (next) {
      available -= 1;
      next();
    }
  };

  const withLock = async (fn) => {
    await acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  };

  return {
    acquire,
    release,
    withLock,
    get available() { return available; }
  };
};
