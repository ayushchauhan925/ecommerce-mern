/**
 * In-memory stand-in for the ioredis client in src/config/redis.ts.
 * Implements only the commands the app uses (cache + rate limiter).
 * TTLs are accepted but ignored — every test starts from reset() anyway.
 */
const store = new Map<string, string>();

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
}

export const fakeRedis = {
  async get(key: string): Promise<string | null> {
    return store.get(key) ?? null;
  },

  async set(key: string, value: string, ..._options: unknown[]): Promise<'OK'> {
    store.set(key, String(value));
    return 'OK';
  },

  async incr(key: string): Promise<number> {
    const next = Number(store.get(key) ?? 0) + 1;
    store.set(key, String(next));
    return next;
  },

  async expire(_key: string, _seconds: number): Promise<number> {
    return 1;
  },

  async keys(pattern: string): Promise<string[]> {
    const regex = globToRegExp(pattern);
    return [...store.keys()].filter((key) => regex.test(key));
  },

  async del(...keys: string[]): Promise<number> {
    return keys.filter((key) => store.delete(key)).length;
  },

  reset(): void {
    store.clear();
  },
};
