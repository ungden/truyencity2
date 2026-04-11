import "@/lib/storage"; // ensure localStorage polyfill is installed before we touch it
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

/**
 * Supabase auth storage adapter.
 *
 * ⚠️ Background: `expo-secure-store` wraps the iOS Keychain which enforces a
 * ~2 KB value limit in practice. Supabase sessions (especially after Apple /
 * Google OAuth — which include the identity token + access token + refresh
 * token + user metadata) regularly exceed this limit. The previous
 * implementation wrote to SecureStore, fell back to `localStorage` on failure,
 * but **only read from SecureStore** — meaning large sessions were written to
 * one place and read from another, so the session was effectively lost on the
 * next render. That caused "Sign in with Apple loops back to the sign-in
 * screen" (App Store review rejection, April 2026).
 *
 * New strategy: use the SQLite-backed `localStorage` polyfill (installed via
 * `@/lib/storage`) as the primary auth store. It is:
 *   - sandboxed per-app on iOS (and protected by data protection when the
 *     device is locked),
 *   - unlimited in size,
 *   - synchronous (wrapped in Promise.resolve for the adapter contract).
 *
 * We still read from SecureStore on the first `getItem` miss so existing
 * installs that already had a session saved there continue to work across
 * upgrades. Once migrated we never write back to SecureStore.
 */
const authStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    // 1. Try the primary store (SQLite-backed localStorage polyfill).
    try {
      const value = globalThis.localStorage?.getItem(key);
      if (value != null) return value;
    } catch {
      // fall through
    }

    // 2. Migration read: older builds may still have a session in SecureStore.
    try {
      const legacy = await SecureStore.getItemAsync(key);
      if (legacy != null) {
        // Copy forward to the new store so future reads are fast and consistent.
        try {
          globalThis.localStorage?.setItem(key, legacy);
        } catch {}
        return legacy;
      }
    } catch {
      // SecureStore not available — ignore.
    }

    return null;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch (err) {
      console.warn("[supabase] storage.setItem failed:", err);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {}
    // Clear any leftover legacy copy as well.
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {}
  },
};

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

if (
  !process.env.EXPO_PUBLIC_SUPABASE_URL ||
  !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
) {
  console.error(
    "[Supabase] Missing env vars: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set. App will not function correctly."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for RN - no URL-based auth
  },
});
