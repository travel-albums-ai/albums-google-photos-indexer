export const createQueue = (maxSize = Infinity) => {
  const items = [];
  const takers = [];
  const putWaiters = [];
  let closed = false;

  return {
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
};

export const createSemaphore = (count) => {
  let available = count;
  const waiters = [];

  return {
    acquire: () => new Promise(resolve => {
      if (available > 0) {
        available -= 1;
        return resolve();
      }
      waiters.push(resolve);
    }),
    release: () => {
      available += 1;
      const next = waiters.shift();
      if (next) {
        available -= 1;
        next();
      }
    },
    get available() { return available; }
  };
};
