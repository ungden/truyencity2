import { useCallback, useEffect, useState } from "react";
// IMPORTANT: Do NOT import react-native-purchases at module level.
// Use lazy getPurchases() from revenuecat.ts to avoid crash-on-launch.
import type {
  CustomerInfo,
  PurchasesPackage,
} from "react-native-purchases";
import { supabase } from "@/lib/supabase";
import {
  ENTITLEMENT_READER_VIP,
  SUPER_VIP_PRODUCT_IDS,
  identifyUser,
  logOutRevenueCat,
  isRevenueCatReady,
} from "@/lib/revenuecat";

/** Lazy-load Purchases module at call time, not import time */
function getPurchases() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("react-native-purchases");
    return (mod.default || mod) as typeof import("react-native-purchases").default;
  } catch {
    return null;
  }
}

export interface RevenueCatState {
  /** Whether user has active Reader VIP or Super VIP */
  isVip: boolean;
  /** Whether user has Super VIP specifically */
  isSuperVip: boolean;
  /** Full customer info from RevenueCat */
  customerInfo: CustomerInfo | null;
  /** Available packages for purchase */
  packages: PurchasesPackage[];
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refresh customer info */
  refresh: () => Promise<void>;
  /** Purchase a package (triggers Apple/Google payment sheet) */
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  /** Restore purchases (for "Already purchased?" button) */
  restorePurchases: () => Promise<boolean>;
}

export function useRevenueCat(): RevenueCatState {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derive VIP status from RevenueCat entitlements
  // Both VIP and Super VIP share entitlement "Truyện City"
  // Distinguish by checking the active product ID
  const activeEntitlement = customerInfo?.entitlements?.active?.[ENTITLEMENT_READER_VIP];
  const isVip = activeEntitlement !== undefined;
  const isSuperVip = isVip && activeEntitlement?.productIdentifier
    ? SUPER_VIP_PRODUCT_IDS.includes(activeEntitlement.productIdentifier)
    : false;

  // Fetch customer info + available offerings
  const refresh = useCallback(async () => {
    // Guard: skip if RevenueCat SDK failed to init (prevents native crash)
    if (!isRevenueCatReady()) {
      setLoading(false);
      return;
    }

    const Purchases = getPurchases();
    if (!Purchases) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // 1. Identify user with RevenueCat if logged in
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await identifyUser(user.id);
      }

      // 2. Get customer info (subscription status)
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);

      // 3. Get available offerings (products for paywall)
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current?.availablePackages) {
          setPackages(offerings.current.availablePackages);
        }
      } catch (offeringsErr) {
        // Non-fatal — offerings may not be available in Expo Go
        console.warn("[useRevenueCat] Offerings fetch failed:", offeringsErr);
      }
    } catch (err) {
      console.warn("[useRevenueCat] Error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Init on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for auth state changes to re-identify
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await identifyUser(session.user.id);
        await refresh();
      } else if (event === "SIGNED_OUT") {
        await logOutRevenueCat();
        setCustomerInfo(null);
        setPackages([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [refresh]);

  // Listen for RevenueCat customer info updates (e.g. subscription renewal/expiry)
  useEffect(() => {
    if (!isRevenueCatReady()) return;

    const Purchases = getPurchases();
    if (!Purchases) return;

    const listener = (info: CustomerInfo) => {
      setCustomerInfo(info);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  // Purchase a package
  const purchasePackage = useCallback(
    async (pkg: PurchasesPackage): Promise<boolean> => {
      if (!isRevenueCatReady()) {
        setError("Hệ thống thanh toán chưa sẵn sàng");
        return false;
      }
      const Purchases = getPurchases();
      if (!Purchases) {
        setError("Hệ thống thanh toán không khả dụng");
        return false;
      }
      try {
        setError(null);
        const { customerInfo: newInfo } =
          await Purchases.purchasePackage(pkg);
        setCustomerInfo(newInfo);
        return (
          newInfo.entitlements.active[ENTITLEMENT_READER_VIP] !== undefined
        );
      } catch (err: any) {
        // User cancelled purchase
        if (err.userCancelled) {
          return false;
        }
        console.error("[useRevenueCat] Purchase error:", err);
        setError(err.message ?? "Lỗi khi mua hàng");
        return false;
      }
    },
    []
  );

  // Restore purchases
  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!isRevenueCatReady()) {
      setError("Hệ thống thanh toán chưa sẵn sàng");
      return false;
    }
    const Purchases = getPurchases();
    if (!Purchases) {
      setError("Hệ thống thanh toán không khả dụng");
      return false;
    }
    try {
      setError(null);
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      return info.entitlements.active[ENTITLEMENT_READER_VIP] !== undefined;
    } catch (err: any) {
      console.error("[useRevenueCat] Restore error:", err);
      setError(err.message ?? "Lỗi khi khôi phục");
      return false;
    }
  }, []);

  return {
    isVip,
    isSuperVip,
    customerInfo,
    packages,
    loading,
    error,
    refresh,
    purchasePackage,
    restorePurchases,
  };
}
