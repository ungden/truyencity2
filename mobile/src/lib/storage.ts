// localStorage polyfill via expo-sqlite (synchronous, same API as web)
// Wrapped in try/catch to prevent crash-on-launch if native module fails
try {
  require("expo-sqlite/localStorage/install");
} catch (err) {
  console.warn("[storage] expo-sqlite localStorage polyfill failed:", err);
  // Provide a no-op fallback so the app can still run
  if (typeof globalThis.localStorage === "undefined") {
    const memStore = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (key: string) => memStore.get(key) ?? null,
      setItem: (key: string, value: string) => memStore.set(key, value),
      removeItem: (key: string) => memStore.delete(key),
      clear: () => memStore.clear(),
      get length() { return memStore.size; },
      key: (index: number) => [...memStore.keys()][index] ?? null,
    };
  }
}

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const value = localStorage.getItem(key);
      if (value === null) return defaultValue;
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable — silently ignore
    }
    listeners.get(key)?.forEach((fn) => fn());
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
    listeners.get(key)?.forEach((fn) => fn());
  },

  subscribe(key: string, listener: Listener): () => void {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(listener);
    return () => listeners.get(key)?.delete(listener);
  },
};
