/**
 * Single source of truth for mobile app store links.
 *
 * Why centralized: 3+ web components (AppDownloadBanner, AppLockGate,
 * DesktopSidebar) hardcoded the iOS URL separately. Future Android launch
 * would require finding all sites + a typo could leave one stale. Now
 * there's exactly one update site.
 */

export const APP_STORE_URL = 'https://apps.apple.com/us/app/truy%E1%BB%87n-city-truy%E1%BB%87n-ch%E1%BB%AF/id6759160705';
export const APP_STORE_ID = '6759160705';

/** Empty until Android app launches. UI components should render
 *  "Android coming soon" disabled state when this is empty. */
export const PLAY_STORE_URL = '';
export const PLAY_STORE_PACKAGE = '';

/** True when Android app is ready for download. Components branch on this
 *  to show enabled CTA vs "sắp ra mắt" badge. */
export const ANDROID_AVAILABLE = !!PLAY_STORE_URL;
