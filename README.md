# TruyenCity

Nền tảng truyện chữ tiếng Việt. AI viết truyện dài; độc giả đọc trên web và mobile.

- **Web** — Next.js 15 App Router, React 19, TypeScript, Supabase, Vercel
- **Mobile** — Expo SDK 54 tại [`mobile/`](mobile/)
- **Hệ thống viết** — [`src/services/story-factory/`](src/services/story-factory/), tài liệu
  đầy đủ ở [`docs/STORY_FACTORY.md`](docs/STORY_FACTORY.md)

## Story Factory

Một service, một cron, một hàng đợi. 17 file phẳng, không thư mục con.

```
cron */2  →  /api/cron/story-factory  →  claim job (Postgres, SKIP LOCKED)
             setup → cover → plan → write → [revise] → window_review → arc → …
```

Mỗi tick chạy một stage; một lần gọi rút hàng đợi đến hết ngân sách thời gian. Bốn vai AI:
**Planner** và **Plan Judge** quyết định điều gì xảy ra, **Writer** và **Editor** viết và
kiểm chương. Chuyển trạng thái là hàm tất định được `validation.ts` kiểm trước mọi model
call — model không bao giờ tự tạo trạng thái bền vững.

Truyện mới chạy ẩn: viết chương 1–10 với `hidden = true`, window review ở chương 5 và 10,
đạt thì tự động xuất bản.

```bash
npm run factory:writing-smoke -- --apply    # cho phép release hiện tại chạy
npm run factory:operator -- status          # xem toàn đội đang làm gì
npm run factory:operator -- revive --apply  # chỉ thử lại job lỗi hạ tầng
```

Cần `STORY_FACTORY_ENABLED=true` thì hệ thống mới viết bất cứ thứ gì.

## Cài đặt

```bash
npm install
npm run dev
```

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
CRON_SECRET=
STORY_FACTORY_ENABLED=true
```

Tùy chọn: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (rate limit, có fallback
in-memory), `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_ADSENSE_PUB_ID`,
`REVENUECAT_WEBHOOK_SECRET`, `SEPAY_*`.

## Kiểm chứng

```bash
npm run typecheck
npm test                 # 198
npm run security:secrets
npm run build
```

## Thư mục

| Đường dẫn | Nội dung |
|---|---|
| `src/app/` | Next.js App Router — trang đọc, bảng xếp hạng, admin, API |
| `src/services/story-factory/` | Toàn bộ hệ thống viết truyện |
| `src/components/` | UI dùng chung |
| `src/lib/` | Types, auth, Supabase client, tiện ích |
| `scripts/` | Vận hành factory, benchmark, smoke, quét secret |
| `supabase/migrations/` | Schema |
| `supabase/functions/` | Edge functions còn sống: cover, xóa chương, thông báo |
| `mobile/` | Ứng dụng Expo |
| `docs/STORY_FACTORY.md` | Tài liệu hệ thống viết |

## Tài liệu

- [`docs/STORY_FACTORY.md`](docs/STORY_FACTORY.md) — hệ thống viết truyện
- [`CLAUDE.md`](CLAUDE.md) — ngữ cảnh cho AI agent làm việc trên repo
- [`.claude/CLAUDE.md`](.claude/CLAUDE.md) — web, mobile, database, quy trình phát hành

## Giấy phép

Proprietary.
