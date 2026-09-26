/**
 * In-memory stand-in for the ioredis client in src/config/redis.ts.
 * Implements only the commands the app uses (cache + rate limiter).
 * TTLs are accepted but ignored — every test starts from reset() anyway.
 */
const store = new Map();

function globToRegExp(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
}

const fakeRedis = {
  async get(key) {
    return store.get(key) ?? null;
  },

  async set(key, value, ..._options) {
    store.set(key, String(value));
    return 'OK';
  },

  async incr(key) {
    const next = Number(store.get(key) ?? 0) + 1;
    store.set(key, String(next));
    return next;
  },

  async expire(_key, _seconds) {
    return 1;
  },

  async keys(pattern) {
    const regex = globToRegExp(pattern);
    return [...store.keys()].filter((key) => regex.test(key));
  },

  async del(...keys) {
    return keys.filter((key) => store.delete(key)).length;
  },

  reset() {
    store.clear();
  },
};

module.exports = { fakeRedis };
