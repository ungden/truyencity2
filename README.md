# TruyenCity - AI Story Writer Platform

Nền tảng viết truyện tự động bằng AI với khả năng "1 Click = 1 Chương hoàn chỉnh". Hỗ trợ viết truyện dài 1000-2000 chương với hệ thống quản lý cốt truyện thông minh.

## 🚀 Tính năng chính

### ✅ Đã hoàn thành (90%)

#### 1. **Viết thủ công (Manual Writing)**
- ✅ Nút "Viết tiếp" - chỉ cần 1 click
- ✅ AI tự động sinh chương hoàn chỉnh
- ✅ Không cần viết prompt thủ công
- ✅ Preview chương real-time
- ✅ Tự động lưu vào database

#### 2. **Story Graph (Nhớ 100+ chương)**
- ✅ Lưu trữ summary mỗi chương
- ✅ Lưu mối quan hệ giữa các chương
- ✅ Tự động lấy 5 chương gần nhất làm context
- ✅ Query thông minh theo keyword
- ✅ Theo dõi cultivation level/magic level

#### 3. **Tự động sinh Prompt**
- ✅ Template system với `ai_prompt_templates`
- ✅ Tự động tạo prompt từ Story Graph
- ✅ Hỗ trợ 7 thể loại: Tiên Hiệp, Huyền Huyễn, Đô Thị, Khoa Huyễn, Lịch Sử, Đồng Nhân, Võng Du
- ✅ Tự động điều chỉnh prompt theo chương đầu/giữa/cuối

#### 4. **Kiểm tra chất lượng tự động**
- ✅ Kiểm tra độ dài (tự động mở rộng nếu quá ngắn)
- ✅ Kiểm tra số lượng hội thoại (tự động thêm nếu thiếu)
- ✅ **MỚI**: Phát hiện mâu thuẫn cultivation level
- ✅ **MỚI**: Phát hiện mâu thuẫn nhân vật chính tử vong
- ✅ Clean Markdown tự động

#### 5. **Viết hàng loạt (Batch Writing)**
- ✅ **MỚI**: UI viết 1-100 chương liên tục
- ✅ **MỚI**: Progress bar theo dõi tiến độ
- ✅ **MỚI**: Tự động dừng nếu có lỗi
- ✅ **MỚI**: Toast notification cho mỗi chương hoàn thành

#### 6. **Lịch tự động (Autopilot)**
- ✅ Thiết lập lịch viết hàng ngày
- ✅ Edge function `ai-writer-scheduler` chạy tự động
- ✅ Hỗ trợ viết nhiều chương mỗi lần
- ✅ Quản lý lịch: kích hoạt/tạm dừng/xóa

#### 7. **Thông báo (Notifications)**
- ✅ Tự động gửi thông báo khi có chương mới
- ✅ Thông báo cho users đã bookmark truyện
- ✅ Edge function `notify-new-chapter`

---

### 🆕 **Story Engine v2 (MỚI - 2026-02-18)**

Architecture rewrite từ v1 với modular pipeline, giảm 85% code nhưng giữ đầy đủ tính năng:

#### 3-Agent Pipeline
```
Architect → Writer → Critic
   ↓          ↓         ↓
Outline   Content   Review
```

- **Architect**: Lập kế hoạch với constraints, emotional arc, golden rules
- **Writer**: Viết content với multi-POV, vocabulary hints, per-scene pacing  
- **Critic**: Review với full content, hard-enforce continuity, fail-closed on error

#### 4-Layer Context System
1. **Chapter Bridge** - Previous cliffhanger (PHẢI giải quyết), MC state
2. **Story Bible** - World rules, power system
3. **Rolling Synopsis** - Structured fields (mc_state, allies, enemies, threads)
4. **Arc Plan** - Chapter brief + plot threads (advance/resolve/new)

#### Key Features
- ✅ **Multi-POV** - Chuyển góc nhìn per scene
- ✅ **Emotional Arc** - Opening→Midpoint→Climax→Closing
- ✅ **Constraint Extractor** - Load world rules từ DB per project
- ✅ **Style Bible** - Vocabulary & pacing rules theo scene type
- ✅ **Golden Chapter** - Special rules cho ch.1-3
- ✅ **Power Budget** - Chống power-creep (max 3 power-ups/arc)
- ✅ **7 Parallel Tasks** - Summary, RAG, Beats, Rules, Consistency, Bible, Synopsis

**Stats**: 13 files (~3,300 lines) vs v1: 41 files (28,470 lines)

---


### 🆕 **Bản Nâng Cấp "Đại Thần" (Master Writer Update - 2026-02-22)**
Bản cập nhật biến AI thành tác giả chuyên nghiệp với kỹ năng "câu chương", tấu hài và thiết lập đại cương đỉnh cao.

#### 1. Hệ thống Lưu Phái (Sub-Genres) Đồ Sộ
Mở rộng 100+ topics, bao gồm 10 siêu lưu phái (Wave 4) đang làm mưa làm gió:
- **Huyền Huyễn:** Sáng Thế Lưu, Dị Thú Tiến Hóa, Thần Bút Hiện Thực, Thu Đồ Vô Địch.
- **Đô Thị:** Lưỡng Giới Mậu Dịch, Nghề Nghiệp Ẩn, Làm Game Bức Tử Người Chơi, Cá Mặn (Nằm Vạ), Tứ Hợp Viện.
- **Võng Du:** Đệ Tứ Thiên Tai (Triệu hoán game thủ Trái Đất).

#### 2. Kỹ Thuật Viết Truyện Đỉnh Cao
- **Câu Chương (Scene Expansion):** Bắt buộc AI sử dụng 3 kỹ thuật: Miêu tả 5 giác quan, Nội tâm nhiều lớp, Phản ứng đám đông. Cấm tóm tắt cốt truyện.
- **Hội Thoại Kẹp Dao (Subtext Dialogue):** Phản diện không nói tục chửi bậy, nói chuyện lịch sự nhưng sát khí. Ẩn dụ, vi biểu cảm.
- **Từ Điển Chống Rập Khuôn (Anti-Cliché):** Khai tử các cụm từ "Hít một ngụm khí lạnh", "Khẽ nhếch mép"...
- **Tấu Hài Webnovel (Comedy Mechanics):** Bơm muối bằng 4 kỹ thuật: Não bổ (Suy diễn), Mặt dày vô sỉ, Phản kém (Gap Moe), Hệ thống Troll.
- **Clickbait Titles:** Tên chương gợi tò mò tột độ (Nghi vấn, Bức bách, Tương phản).

#### 3. Đại Cương Toàn Truyện (Master Outline)
- Ngay khi tạo dự án, **Chief Editor Agent** tự động sinh ra "Master Outline" (Mục tiêu tối thượng, Trùm cuối, Bản đồ thế giới, 5-10 Arc lớn kéo dài 1000-2000 chương).
- Inject Master Outline vào bộ nhớ (Layer 0.5) trước khi viết mọi chương để AI không bao giờ bị "đầu voi đuôi chuột".

#### 4. Logic & Consistency Checker
- Check logic dòng tiền / sức mạnh bằng mô hình LLM siêu tốc để chống "ngáo giá" trong truyện kinh doanh.
- Ghi nhớ thói quen buồn cười của nhân vật (Personality Quirks) xuyên suốt hàng ngàn chương.
- Giai đoạn "Hạ cánh": Khi tiến độ đạt 80%, tự động ép AI đóng các plot threads phụ để chuẩn bị cho Final Boss.

### 🆕 **Daily Spawn Reliability Update (2026-02-22)**

- Fixed `spawnDailyNovels()` để project mới luôn có đủ `master_outline` + `story_outline` trước khi viết Ch.1.
- Tối ưu hiệu năng cron daily spawn bằng parallel idea generation theo batch, giảm nguy cơ timeout.
- Verified production endpoint `GET /api/cron/daily-spawn?target=20` chạy thành công trong giới hạn timeout pg_cron.
- Backfilled toàn bộ project mới phát sinh trong lúc test/deploy để không còn thiếu outline/cover.
- Giữ lại các novel spawn trong phiên test làm dữ liệu production hợp lệ (không rollback/xóa).

### 🆕 **Hệ thống Scalability 4 Phases (2026-02-11)**

Hệ thống mới hỗ trợ viết truyện dài **1000-2000 chương** mà không bị "lú lẫn" về cốt truyện:

#### **Phase 1: Plot Thread Manager** ✅
- Smart selection: Chọn top 5 plot threads phù hợp nhất cho mỗi chương
- Thread lifecycle: Open → Developing → Climax → Resolved → Legacy
- Character recaps: Tự động recap khi nhân vật quay lại sau >50 chương
- Abandonment detection: Phát hiện threads bị bỏ rơi >100 chương
- Foreshadowing tracking: Theo dõi deadline và urgency

#### **Phase 2: Volume Summary Manager** ✅
- 4-level memory hierarchy: Story → Volume (100 ch) → Arc (20 ch) → Recent (3 ch)
- Auto-generate: Tạo volume summary mỗi 100 chương
- Relevance scoring: Thread (40%) + Character (30%) + Proximity (20%) + Importance (10%)
- Character arc tracking: Theo dõi phát triển nhân vật xuyên suốt

#### **Phase 3: Rule Indexer** ✅
- Tag-based indexing: `power:realm=KimDan`, `location=ThanhVanTong`
- Hybrid search: Tags (40%) + Category (25%) + Text (20%) + Context (15%)
- 8 rule categories: power_system, politics, economy, geography, culture, history, mechanics, restrictions
- Auto-extraction: Tự động trích xuất rules từ nội dung chương
- Usage tracking: Theo dõi tần suất sử dụng rules

#### **Phase 4: Long-term Validator** ✅
- Milestone checks: Validation tại Ch.100, 250, 500, 750, 1000, 1500, 2000
- 5 validation types: Thread resolution, Character arc, Power consistency, Foreshadowing payoff, Pacing
- Auto-recommendations: Tự động đề xuất cách fix issues
- Critical issue detection: Phát hiện vấn đề nghiêm trọng trước khi quá muộn

**Kết quả:**
- Max chapters: 300 → **2000+** (6.7x improvement)
- Thread retention: 40% → **95%** (+55%)
- Context optimized: ~1200 tokens (vẫn trong giới hạn LLM)

---

## Tech Stack

### Frontend (Web)
- **Framework**: Next.js 15 (App Router), React 19
- **Language**: TypeScript
- **UI**: Shadcn/UI + Tailwind CSS
- **Ads**: Google AdSense (lazy loaded, VIP-gated)
- **Analytics**: GA4, Vercel Analytics + Speed Insights
- **SEO**: JSON-LD (WebSite, Organization, Book, Breadcrumb)

### Mobile
- **Framework**: Expo SDK 54, expo-router v6
- **Styling**: NativeWind v5
- **Ads**: Google AdMob (banner + interstitial, VIP-gated)
- **Offline**: SQLite, TTS, auto-scroll, keep-awake

### Backend
- **Database**: Supabase (PostgreSQL + pgvector + pg_cron)
- **Auth**: Supabase Auth
- **AI**: Google Gemini (`gemini-3-flash-preview`)
- **Cache**: Upstash Redis (rate limiting + caching, in-memory fallback)
- **Monitoring**: Sentry (via logger.ts)
- **Hosting**: Vercel Pro (maxDuration 300s)

### Monetization
- **Reader VIP**: 49,000 VND/mo — no ads, unlimited download/TTS, exclusive themes
- **Free tier**: Ads (AdSense web, AdMob mobile), 5 offline chapters/day, 60 min TTS/day
- **Payment**: Not yet integrated (Apple IAP, Google Play Billing, VNPay/MoMo planned)

## 📊 Đánh giá tiến độ

| Tính năng | Mục tiêu | Thực tế | % |
|-----------|----------|---------|---|
| 1-Click Writing | ✅ | ✅ | 100% |
| Story Graph | ✅ | ✅ | 100% |
| Auto Prompt | ✅ | ✅ | 100% |
| Quality Check | ✅ | ✅ | 100% |
| Contradiction Detection | ✅ | ✅ | 100% |
| Batch Writing UI | ✅ | ✅ | 100% |
| Autopilot | ✅ | ✅ | 100% |
| **TỔNG** | | | **100%** |

## 🎯 Cách sử dụng

### 1. Tạo dự án mới
```
1. Vào /admin/ai-writer
2. Click "Tạo mới"
3. Nhập:
   - Tên truyện
   - Nhân vật chính
   - Hệ thống tu luyện (nếu là Tiên Hiệp)
   - Mô tả thế giới
4. Click "Tạo dự án"
```

### 2. Viết chương thủ công
```
1. Chọn dự án từ danh sách
2. Click "Viết tiếp"
3. Đợi 2-3 phút
4. Xem preview chương
5. Click "Xem chương" để đọc full
```

### 3. Viết hàng loạt
```
1. Chọn dự án
2. Chuyển sang tab "Viết hàng loạt"
3. Nhập số chương (1-100)
4. Click "Bắt đầu viết"
5. Theo dõi progress bar
```

### 4. Thiết lập lịch tự động
```
1. Chuyển sang tab "Lịch tự động"
2. Click "Tạo lịch mới"
3. Chọn:
   - Giờ chạy (UTC)
   - Số chương mỗi lần
   - Bắt đầu ngay (optional)
4. Click "Tạo lịch"
```

## 🔧 Cài đặt

### Prerequisites
- Node.js 18+
- Supabase account
- OpenRouter API key

### Environment Variables
```env
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
CRON_SECRET=your_cron_secret

# Optional (graceful fallback if unset)
NEXT_PUBLIC_ADSENSE_PUB_ID=       # Google AdSense publisher ID
NEXT_PUBLIC_GA4_ID=               # Google Analytics 4
NEXT_PUBLIC_SENTRY_DSN=           # Sentry error tracking
UPSTASH_REDIS_REST_URL=           # Upstash Redis (falls back to in-memory)
UPSTASH_REDIS_REST_TOKEN=         # Upstash Redis auth
EXPO_PUBLIC_ADMOB_IOS_APP_ID=     # AdMob iOS (test ID fallback)
EXPO_PUBLIC_ADMOB_ANDROID_APP_ID= # AdMob Android (test ID fallback)
```

### Installation
```bash
# Clone repo
git clone <repo-url>

# Install dependencies
npm install

# Run migrations
npx supabase db push

# Deploy edge functions
npx supabase functions deploy ai-writer-scheduler
npx supabase functions deploy notify-new-chapter
npx supabase functions deploy openrouter-chat

# Start dev server
npm run dev
```

## 📝 Database Schema

### Core Tables
- `novels` - Thông tin truyện
- `chapters` - Nội dung chương
- `ai_story_projects` - Dự án AI Writer
- `story_graph_nodes` - Story Graph nodes
- `story_graph_edges` - Story Graph edges
- `ai_writing_jobs` - Job tracking
- `ai_writing_schedules` - Lịch tự động
- `ai_prompt_templates` - Template prompts

### Security
- ✅ Row Level Security (RLS) enabled
- ✅ User-specific policies
- ✅ Admin override policies

## 🚀 Roadmap

### Phase 1: Core Features (✅ Hoàn thành)
- [x] 1-Click Writing
- [x] Story Graph
- [x] Auto Prompt
- [x] Quality Check
- [x] Batch Writing
- [x] Autopilot

### Phase 2: Scalability System (✅ Hoàn thành - 2026-02-11)
- [x] **Plot Thread Manager** - Smart thread selection & tracking
- [x] **Volume Summary Manager** - 4-level memory hierarchy
- [x] **Rule Indexer** - Tag-based world rules indexing
- [x] **Long-term Validator** - Milestone quality checks
- [x] Support for 1000-2000 chapters
- [x] Character re-introduction system
- [x] Abandoned thread detection
- [x] Foreshadowing payoff tracking

### Phase 3: Story Engine v2 (✅ Hoàn thành - 2026-02-19)
- [x] **3-Agent Pipeline** - Architect → Writer → Critic
- [x] **4-Layer Context** - Bridge → Bible → Synopsis → Arc Plan
- [x] **Multi-POV Support** - Per-scene POV switching
- [x] **Emotional Arc Planning** - Opening/Midpoint/Climax/Closing
- [x] **Constraint Extractor** - Per-project world rules enforcement
- [x] **Style Bible** - Rich vocabulary & pacing rules per scene type
- [x] **Golden Chapter Requirements** - Special rules for ch.1-3
- [x] **Power Budget** - Anti power-creep enforcement
- [x] **7 Parallel Post-Write Tasks** - Summary, RAG, Beats, Rules, etc.
- [x] **Cliffhanger Enforcement** - Hard requirements for ending hooks
- [x] Port 36 missing features from v1 to v2
- [x] Legacy Admin Cleanup - removed deprecated routes
- [x] 13 files, ~3,300 lines (down from 41 files, 28,470 lines)

### Phase 4: Monetization & Mobile (Completed)
- [x] Reader VIP system (Free + VIP tiers)
- [x] Google AdSense (web) + AdMob (mobile)
- [x] VIP context provider (shared, single RPC)
- [x] Mobile app (Expo SDK 54, offline, TTS, rankings, iPad support)
- [x] App Store submission (TestFlight uploaded, screenshots captured)
- [x] SEO (JSON-LD, canonical URLs, /search page)
- [x] Analytics (GA4, Vercel Analytics)
- [x] Infrastructure (Upstash Redis, Sentry, security headers)

### Pending
- [ ] App Store Privacy Review (Manual step required)
- [ ] Google Play submission
- [ ] Payment gateway (Apple IAP, Google Play Billing, VNPay)
- [ ] Email notifications (Resend/SendGrid)

---

## 📚 Tài liệu kỹ thuật

### Hệ thống Scalability
- **Integration Guide**: `docs/SCALABILITY_INTEGRATION_GUIDE.md`
- **Changes Summary**: `SCALABILITY_CHANGES_SUMMARY.md`
- **Test Suite**: `src/__tests__/scalability.test.ts`

### Key Directories
```
src/services/story-engine/       # V2 pipeline (production)
src/services/billing/            # Reader VIP service
src/services/content-seeder/     # Daily novel spawner
src/services/author-generator/   # AI author generation
src/services/novel-enricher/     # Novel metadata enrichment
src/components/ads/              # AdBanner + AdPlacement (web)
src/contexts/vip-context.tsx     # Shared VIP status provider
src/lib/auth/                    # Shared auth utilities
src/lib/redis/                   # Upstash Redis client
mobile/src/components/ads/       # AdBanner + ad-config (mobile)
mobile/src/hooks/                # useVipStatus, useInterstitialAd
```

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenRouter for AI API
- Supabase for backend infrastructure
- Shadcn/UI for beautiful components
- Next.js team for amazing framework

## 📞 Support

- Email: support@example.com
- Discord: [Join our server](https://discord.gg/example)
- Docs: [Read the docs](https://docs.example.com)

---

**Made with ❤️ by the AI Story Writer team**
