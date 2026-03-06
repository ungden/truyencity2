import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

// ── RevenueCat Configuration ──────────────────────────────────
// API keys are set in RevenueCat dashboard, per-platform
const REVENUECAT_IOS_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "";
const REVENUECAT_ANDROID_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";

// Entitlement identifier — matches what's configured in RevenueCat dashboard
export const ENTITLEMENT_READER_VIP = "Truyện City";

// Product identifiers — matches App Store Connect / Google Play Console
export const PRODUCT_READER_VIP_MONTHLY = "reader_vip_monthly";
export const PRODUCT_READER_VIP_YEARLY = "reader_vip_yearly";

/** Whether RevenueCat SDK initialized successfully */
let revenueCatReady = false;

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
 * IMPORTANT: Entire init is wrapped in try/catch to prevent crash-on-launch.
 * On iOS 26+ / new devices, the native SDK may throw NSException during
 * configure() which causes a SIGSEGV in the TurboModule bridge if uncaught.
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

    Purchases.configure({ apiKey });

    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    revenueCatReady = true;
  } catch (err) {
    console.warn("[RevenueCat] Init failed — app will run without IAP:", err);
    revenueCatReady = false;
  }
}

/**
 * Identify user with RevenueCat after Supabase auth.
 * This links the RevenueCat anonymous user to our Supabase user ID,
 * enabling cross-platform subscription sync.
 */
export async function identifyUser(userId: string): Promise<void> {
  if (!revenueCatReady) return;
  try {
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
    await Purchases.logOut();
  } catch (err) {
    console.warn("[RevenueCat] Failed to logout:", err);
  }
}

/**
 * Check if user has active Reader VIP entitlement.
 * This is the primary way to check subscription status —
 * RevenueCat handles receipt validation, expiry, grace periods etc.
 */
export async function hasReaderVipEntitlement(): Promise<boolean> {
  if (!revenueCatReady) return false;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return (
      typeof customerInfo.entitlements.active[ENTITLEMENT_READER_VIP] !==
      "undefined"
    );
  } catch {
    return false;
  }
}
