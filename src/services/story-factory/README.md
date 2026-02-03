# 🏭 Story Factory System - Hệ Thống Công Xưởng Truyện

## Tổng Quan

Story Factory là hệ thống cho phép AI tự động viết **hàng trăm đầu truyện cùng lúc** với chất lượng cao và nhất quán.

## Kiến Trúc Tổng Thể

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         STORY FACTORY SYSTEM                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  LAYER 1: IDEA GENERATION (Tầng sinh ý tưởng)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Trend        │  │ Genre        │  │ Mashup       │                  │
│  │ Scraper      │  │ Templates    │  │ Engine       │                  │
│  │ (Hot topics) │  │ (100+ mẫu)   │  │ (A+B=C)      │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│                           │                                             │
│                           ▼                                             │
│  LAYER 2: BLUEPRINT GENERATION (Tầng tạo đề cương)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Character    │  │ Plot         │  │ World        │                  │
│  │ Generator    │  │ Architect    │  │ Builder      │                  │
│  │ (Nhân vật)   │  │ (Cốt truyện) │  │ (Thế giới)   │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│                           │                                             │
│                           ▼                                             │
│  LAYER 3: PRODUCTION PIPELINE (Tầng sản xuất)                          │
│  ┌──────────────────────────────────────────────────────┐              │
│  │              WORKER POOL (5-20 workers)               │              │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐     │              │
│  │  │Worker 1│  │Worker 2│  │Worker 3│  │Worker N│     │              │
│  │  │Story A │  │Story B │  │Story C │  │Story X │     │              │
│  │  └────────┘  └────────┘  └────────┘  └────────┘     │              │
│  └──────────────────────────────────────────────────────┘              │
│                           │                                             │
│                           ▼                                             │
│  LAYER 4: QUALITY & DISTRIBUTION (Tầng chất lượng)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ AI Critic    │  │ Grammar      │  │ Auto         │                  │
│  │ (Đánh giá)   │  │ Polish       │  │ Publisher    │                  │
│  │              │  │ (Sửa văn)    │  │ (Đăng bài)   │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Các Module Chính

### 1. Idea Bank (`idea-bank.ts`)
- Kho lưu trữ 1000+ ý tưởng truyện
- Hệ thống tags và categories
- Trending topics tracker
- Mashup engine (kết hợp ý tưởng)

### 2. Genre Templates Library (`genre-templates.ts`)
- 100+ template theo thể loại
- Công thức câu chuyện đã được chứng minh
- Character archetypes cho từng thể loại
- Setting blueprints

### 3. Blueprint Generator (`blueprint-generator.ts`)
- Tự động tạo outline 100-500 chương
- Character relationship map
- World building document
- Power system design
- Plot twist planning

### 4. Production Pipeline (`production-pipeline.ts`)
- Parallel worker queue
- Priority scheduling
- Resource management
- Progress tracking

### 5. Quality Gate (`quality-gate.ts`)
- AI-powered content review
- Consistency checker
- Plagiarism detection
- Reader engagement predictor

## Quy Trình Vận Hành

### Bước 1: Khởi tạo batch
```typescript
const factory = new StoryFactory();
await factory.createBatch({
  quantity: 100,           // Số lượng truyện
  genres: ['tien-hiep', 'do-thi', 'huyen-huyen'],
  targetChapters: 200,     // Số chương mỗi truyện
  dailyChaptersPerStory: 3 // Tốc độ viết
});
```

### Bước 2: Factory tự động vận hành
1. Generate 100 unique story ideas
2. Create detailed blueprints for each
3. Spawn workers to write in parallel
4. Quality check each chapter
5. Auto-publish to platforms

### Bước 3: Monitoring
```typescript
const dashboard = factory.getDashboard();
// {
//   totalStories: 100,
//   activeWorkers: 10,
//   chaptersToday: 300,
//   qualityScore: 8.5/10,
//   readerEngagement: 'high'
// }
```

## Công Thức "Đại Thần"

### 10 Nguyên Tắc Vàng

1. **Hook trong 3 câu đầu** - Câu mở đầu quyết định người đọc ở lại
2. **Cliffhanger mỗi chương** - Không bao giờ kết thúc chương "phẳng"
3. **Dopamine mỗi 500 từ** - Face-slap, breakthrough, treasure...
4. **Main char phải "cool"** - Độc giả muốn tự hào về nhân vật chính
5. **Villain phải "đáng ghét"** - Càng ghét càng sướng khi MC thắng
6. **Power system rõ ràng** - Người đọc thích biết MC mạnh cỡ nào
7. **Harem/romance có tiết chế** - Đủ để giữ chân, không quá để loãng
8. **Pace nhanh 50 chương đầu** - Golden window để giữ độc giả
9. **Twist mỗi 30-50 chương** - Giữ sự hứng thú dài hạn
10. **Foreshadowing khéo léo** - Tạo cảm giác "aha!" khi đọc lại

### Công Thức Chương Hoàn Hảo

```
[Opening Hook: 2-3 câu] - Gây tò mò ngay lập tức
    ↓
[Situation Setup: 500 từ] - Thiết lập tình huống
    ↓
[Rising Tension: 800 từ] - Leo thang căng thẳng
    ↓
[Dopamine Moment: 200 từ] - Khoảnh khắc sảng khoái
    ↓
[New Challenge: 300 từ] - Thử thách mới xuất hiện
    ↓
[Cliffhanger: 2-3 câu] - Kết thúc khiến phải đọc tiếp
```

## Scaling Strategy

### Phase 1: 10 truyện (Pilot)
- Test hệ thống
- Tune quality parameters
- Gather reader feedback

### Phase 2: 50 truyện (Beta)
- Optimize AI prompts
- Train genre-specific models
- Build reader analytics

### Phase 3: 100+ truyện (Production)
- Full automation
- 24/7 content generation
- Multi-platform distribution

## Performance Targets

| Metric | Target |
|--------|--------|
| Chapters/day/story | 3-5 |
| Words/chapter | 2500-3000 |
| Quality score | >8/10 |
| Reader retention (ch1→ch10) | >40% |
| Stories running parallel | 100+ |

## Cost Estimation (100 stories, 200ch each)

- Total chapters: 20,000
- Tokens per chapter: ~8,000
- Total tokens: 160M tokens
- Cost with DeepSeek: ~$80-160
- Cost with Claude: ~$480-960
- Time to complete: 2-3 months

## Files Structure

```
/src/services/story-factory/
├── README.md                    # This file
├── index.ts                     # Main exports
├── story-factory.ts             # Main orchestrator
├── idea-bank.ts                 # Idea management
├── genre-templates.ts           # Genre templates library
├── blueprint-generator.ts       # Story blueprint creation
├── character-archetypes.ts      # Character templates
├── production-pipeline.ts       # Parallel production
├── worker-pool.ts               # Worker management
├── quality-gate.ts              # Quality assurance
├── auto-publisher.ts            # Multi-platform publishing
└── types.ts                     # Type definitions
```
