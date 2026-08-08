# TruyenCity — reader app, mobile, data, release

Supplements the root [`CLAUDE.md`](../CLAUDE.md). The writing system is documented in
[`docs/STORY_FACTORY.md`](../docs/STORY_FACTORY.md) — nothing about it belongs here.

## Confirmed decisions — do not re-litigate

- Next.js 15 App Router. Not Vite. No migration planned.
- Dark theme is the default. WebNovel/Wuxiaworld visual language.
- 5-star ratings, not thumbs.
- Brand is **TruyenCity** — one word, no diacritics, capital T and C. Colour `#7c3aed`.
- Covers generated at 2K; optimise at delivery through `next/image`.
- Chapter dialogue uses the Vietnamese em-dash form `—`.
- **No AI mentions in anything a reader can see.** Admin tooling may say it internally.

## Vietnamese text

Every Vietnamese string shown to a user carries full diacritics — labels, buttons, titles,
descriptions, placeholders, errors, toasts, empty and loading states, genre names, admin
panel copy.

Not diacritised: variable names, CSS classes, URL slugs, and the brand name `TruyenCity`.

## Web

Pages
- `src/app/page.tsx` — home: continue-reading, genre sections, latest-updates carousel
- `src/app/truyen/[slug]/page.tsx` — novel detail, ratings, related novels
- `src/app/truyen/[slug]/read/[chapter]/page.tsx` — reader
- `src/app/ranking/`, `src/app/browse/`, `src/app/search/`
- `src/app/admin/factory/` — the only production-related admin page

Components worth knowing: `star-rating`, `related-novels`, `continue-reading`,
`latest-updates-carousel`, `search-modal`, `novel-card`, `chapter-list`,
`layout/desktop-sidebar`, `pwa-provider`.

Types and helpers: `src/lib/types.ts`, `src/lib/types/genre-config.ts` (canonical genre
list), `src/lib/utils.ts` (`cleanNovelDescription`), `src/lib/utils/genre.ts`.

**Never render `novel.description` raw** — always through `cleanNovelDescription()`; older
rows carry metadata blocks.

## Mobile (`/mobile/`)

Expo SDK 54 · expo-router v6 · NativeTabs from `expo-router/unstable-native-tabs` (not JS
Tabs) · SF Symbols via `expo-symbols` · react-native-css 3.0.1 + NativeWind 5.0.0-preview.2
· Tailwind v4.

Hard constraints:
- **`lightningcss` pinned at 1.30.1.** 1.31.1 fails with a deserialization error.
- Metro runs on **8088**; 8081 belongs to another app.
- `expo-sqlite` for the localStorage polyfill — never AsyncStorage.
- `expo-secure-store` for Supabase auth tokens.
- Use `process.env.EXPO_OS`, not `Platform.OS`.
- `expo-image` everywhere, not RN `Image`.

Styling gotchas:
- `bg-gradient-*` does nothing on RN — overlay a `View` with rgba.
- `var(--color-*)` does not resolve in inline `style={{}}` — hardcode.
- `FlatList` is not CSS-wrapped: import from `react-native`, style with `style={{}}`.
- `Link asChild` + a CSS-wrapped `Pressable` can drop styles; fall back to inline.

```bash
cd mobile && npx tsc --noEmit
cd mobile && npx expo export --platform ios
```

Features shipped: 4-tab shell, reader with 4 themes and 3 fonts, TTS (`expo-speech`, vi-VN)
with a mini player, offline download to SQLite, gamified profile (13 cultivation levels, 22
achievements), AdMob banner + interstitial hidden for VIP.

## Database

Core: `novels`, `chapters`, `ai_story_projects`, `ai_authors`, `chapter_reads`,
`reading_progress`, `bookmarks`, `comments`, `ratings`, `app_versions`.

Factory: `story_factory_jobs`, `story_factory_runs`, `story_state_events` — see
[`docs/STORY_FACTORY.md`](../docs/STORY_FACTORY.md).

RPCs: `get_novel_stats`, `get_novels_with_stats` (batch, avoids N+1),
`get_top_novels_by_views|rating|bookmarks`, `get_ranked_novels`, `get_reader_status`,
`record_tts_usage`, `record_download_usage`, `match_story_chunks`.

Notes:
- `novels.chapter_count` is denormalised and maintained by a trigger on chapter
  insert/delete. Query it; do not `count()` the chapters table.
- `ai_story_projects.updated_at` has a trigger forcing `now()` — it cannot be backdated.
- `ai_story_projects` has no `protagonist_name` column.

## Cron

pg_cron is the only scheduler. Secret lives in Supabase Vault as `cron_secret`; every job
sends `Authorization: Bearer ${CRON_SECRET}`.

| Job | Schedule | Purpose |
|---|---|---|
| `story-factory` | `*/2 * * * *` | The writing pipeline. The only one that matters. |

Rotating the secret: `openssl rand -hex 32` → `vault.update_secret` → update `CRON_SECRET`
in Vercel → verify in `cron.job_run_details`.

## Monetisation

- **Reader VIP** — 99,000₫/month or 999,000₫/year. Removes ads, unlocks offline download and
  unlimited audio. Free tier: ads, 1h audio/day, no download.
- **Mobile payments** via RevenueCat (Apple IAP + Google Play). RevenueCat is the source of
  truth for entitlement; the webhook at `/api/webhooks/revenuecat` syncs status to Supabase.
  `POST /api/billing/reader-vip` with `upgrade` returns 403 by design — purchases only go
  through the store.
- **Web payments** via SePay bank transfer + VietQR. `/api/webhooks/sepay` matches the
  `TCVIP…` payment code to a row in `vip_orders`, then activates VIP. The checkout modal
  polls `/api/billing/vip-order`. Orders expire after 30 minutes via pg_cron.
- **Writer tiers** (Free/Creator/Pro/Enterprise) exist for AI writing features.

## iOS release

EAS project `@titanlabs/truyencity` · bundle `com.truyencity.app` · ASC app `6759160705` ·
team `Q8A7CBYV5Z` (Individual).

```bash
cd mobile
EXPO_ASC_API_KEY_PATH="…/AuthKey_K4XKK27BYH.p8" \
EXPO_ASC_KEY_ID="K4XKK27BYH" \
EXPO_ASC_ISSUER_ID="16b1bc8e-5a12-4788-b4d2-4c9ebe0068fb" \
EXPO_APPLE_TEAM_ID="Q8A7CBYV5Z" EXPO_APPLE_TEAM_TYPE="INDIVIDUAL" \
npx eas build --platform ios --profile production --non-interactive --auto-submit
```

### Every new build, in order

1. Bump **only** `version` in `mobile/app.config.ts`. `eas.json` sets
   `appVersionSource: "remote"` with `autoIncrement: true` on the production
   profile, so EAS owns `ios.buildNumber` / `android.versionCode` and raises them
   itself — the values in `app.config.ts` are ignored at build time and are kept
   in sync here only so the file doesn't lie. Editing them by hand does nothing.
2. Build and submit through EAS.
3. **After the store shows Ready for Sale**, update the `app_versions` row:
   ```sql
   UPDATE public.app_versions
   SET latest_version = '1.0.X', latest_build = 'N',
       release_notes = '…', released_at = now(), updated_at = now()
   WHERE platform = 'ios';
   ```
   Only raise `min_supported_version` to force old clients to update; only set
   `force_update` in an emergency.
4. Record the shipped version here.

```bash
npx tsx scripts/update-app-versions.ts
```

Current: **1.0.10**, iOS build 50 (uploaded 2026-08-08, awaiting release). Android
versionCode 8 in config; no Android build cut for this version.

## Git

`type: description` commits. Push to `main` auto-deploys. Never force-push `main`. Never
commit `.env.local` or any secret — `npm run security:secrets` is the check.
