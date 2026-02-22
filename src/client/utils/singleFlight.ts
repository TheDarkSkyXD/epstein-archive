const inFlight = new Map<string, Promise<any>>();

export function stableStringify(obj: any): string {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return String(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => `${k}:${stableStringify(obj[k])}`).join(',') + '}';
}

export function singleFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) {
    return existing;
  }
  const req = fn().finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, req);
  return req;
}
