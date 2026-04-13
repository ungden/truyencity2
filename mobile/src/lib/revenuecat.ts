import { Platform } from "react-native";

// ── RevenueCat Configuration ──────────────────────────────────
// IMPORTANT: react-native-purchases is NOT imported at module level.
// The static import `import Purchases from "react-native-purchases"` triggers
// native TurboModule resolution + NativeEventEmitter construction at import time,
// which can throw an NSException on iOS 26+ and crash the app before any
// try/catch can protect it. Instead, we use lazy require() inside functions.

const REVENUECAT_IOS_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "";
const REVENUECAT_ANDROID_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";

// Entitlement identifier — matches what's configured in RevenueCat dashboard
// Both VIP and Super VIP share the same entitlement "Truyện City"
// We distinguish them by product ID
export const ENTITLEMENT_READER_VIP = "Truyện City";

// Product IDs for Super VIP (used to distinguish from regular VIP)
export const SUPER_VIP_PRODUCT_IDS = [
  "reader_super_vip_monthly",
  "reader_super_vip_yearly",
];

// Product identifiers — matches App Store Connect / Google Play Console
export const PRODUCT_READER_VIP_MONTHLY = "reader_vip_monthly";
export const PRODUCT_READER_VIP_YEARLY = "reader_vip_yearly";

/** Whether RevenueCat SDK initialized successfully */
let revenueCatReady = false;

/** Cached reference to Purchases module (lazy-loaded) */
let _Purchases: typeof import("react-native-purchases").default | null = null;

/**
 * Lazily load the react-native-purchases module.
 * Returns null if the native module is unavailable or throws.
 */
function getPurchases(): typeof import("react-native-purchases").default | null {
  if (_Purchases) return _Purchases;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("react-native-purchases");
    _Purchases = mod.default || mod;
    return _Purchases;
  } catch (err) {
    console.warn("[RevenueCat] Failed to load native module:", err);
    return null;
  }
}

/**
 * Check if RevenueCat SDK is ready for use.
 * Guards all SDK calls to prevent crashes when init failed.
 */
export function isRevenueCatReady(): boolean {
  return revenueCatReady;
}

/**
 * Initialize RevenueCat SDK.
 * Call once at app startup (root layout).
 * Safe to call multiple times — SDK guards against re-init.
 *
 * IMPORTANT: Uses lazy require() to defer native module loading.
 * The entire init is wrapped in try/catch to prevent crash-on-launch.
 */
export async function initRevenueCat(): Promise<void> {
  try {
    const apiKey =
      Platform.OS === "ios" ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;

    if (!apiKey) {
      console.warn(
        "[RevenueCat] No API key found for platform:",
        Platform.OS,
        "— skipping init. Set EXPO_PUBLIC_REVENUECAT_IOS_KEY or EXPO_PUBLIC_REVENUECAT_ANDROID_KEY."
      );
      return;
    }

    const Purchases = getPurchases();
    if (!Purchases) {
      console.warn("[RevenueCat] Native module unavailable — skipping init.");
      return;
    }

    Purchases.configure({ apiKey });

    if (__DEV__) {
      try {
        const { LOG_LEVEL } = require("react-native-purchases");
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      } catch {
        // ignore
      }
    }

    revenueCatReady = true;
  } catch (err) {
    console.warn("[RevenueCat] Init failed — app will run without IAP:", err);
    revenueCatReady = false;
  }
}

/**
 * Identify user with RevenueCat after Supabase auth.
 */
export async function identifyUser(userId: string): Promise<void> {
  if (!revenueCatReady) return;
  try {
    const Purchases = getPurchases();
    if (!Purchases) return;
    await Purchases.logIn(userId);
  } catch (err) {
    console.warn("[RevenueCat] Failed to identify user:", err);
  }
}

/**
 * Reset RevenueCat identity on logout.
 */
export async function logOutRevenueCat(): Promise<void> {
  if (!revenueCatReady) return;
  try {
    const Purchases = getPurchases();
    if (!Purchases) return;
    await Purchases.logOut();
  } catch (err) {
    console.warn("[RevenueCat] Failed to logout:", err);
  }
}

/**
 * Check if user has active Reader VIP entitlement.
 */
export async function hasReaderVipEntitlement(): Promise<boolean> {
  if (!revenueCatReady) return false;
  try {
    const Purchases = getPurchases();
    if (!Purchases) return false;
    const customerInfo = await Purchases.getCustomerInfo();
    return (
      typeof customerInfo.entitlements.active[ENTITLEMENT_READER_VIP] !==
      "undefined"
    );
  } catch {
    return false;
  }
}
