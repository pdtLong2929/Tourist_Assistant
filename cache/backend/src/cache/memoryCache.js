const memoryStore = new Map();

export function getMemory(key) {
  const item = memoryStore.get(key);

  if (!item) return null;

  if (Date.now() > item.expireAt) {
    memoryStore.delete(key);
    return null;
  }

  return item.value;
}

export function setMemory(key, value, ttl = 60000) {
  memoryStore.set(key, {
    value,
    expireAt: Date.now() + ttl,
  });
}