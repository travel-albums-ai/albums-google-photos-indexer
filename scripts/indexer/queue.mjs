export const createQueue = () => {
  const items = [];
  return {
    push: i => items.push(i),
    pop: () => items.pop(),
    get length() { return items.length; },
  };
};
