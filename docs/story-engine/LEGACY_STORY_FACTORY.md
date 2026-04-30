# Story Factory - Industrial-Scale AI Story Generation

## Overview

Story Factory is an automated system for generating thousands of Vietnamese webnovels with minimal human intervention. It manages the entire lifecycle from idea generation to chapter publishing.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        STORY FACTORY                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐     │
│  │   Idea   │ → │ Blueprint│ → │Production│ → │Publishing│     │
│  │   Bank   │   │  Factory │   │  Queue   │   │ Scheduler│     │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘     │
│       ↓              ↓              ↓              ↓            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Gemini AI (Google)                     │   │
│  │  - Text Generation (gemini-2.0-flash-exp)                 │   │
│  │  - Image Generation (imagen-3.0)                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐     │
│  │  Author  │   │  Chapter │   │ Quality  │   │  Error   │     │
│  │ Manager  │   │  Writer  │   │Controller│   │ Handler  │     │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Production Targets

| Metric | Target |
|--------|--------|
| Active Stories | 500 concurrent |
| Chapters/Story/Day | 20 |
| Total Daily Output | 10,000 chapters |
| New Stories/Day | 20 |
| Story Length | 1,000-2,000 chapters |
| Chapter Length | ~2,000 words |

## Publishing Schedule (Vietnam Time)

| Slot | Hours | Chapters/Story |
|------|-------|----------------|
| Morning | 6:00 - 10:00 | 7 |
| Afternoon | 12:00 - 14:00 | 6 |
| Evening | 18:00 - 22:00 | 7 |

## Genre Distribution

| Genre | Percentage |
|-------|------------|
| System/LitRPG | 20% |
| Urban Modern | 18% |
| Romance | 15% |
| Huyen Huyen | 12% |
| Action/Adventure | 10% |
| Historical | 10% |
| Tien Hiep | 8% |
| Sci-Fi/Apocalypse | 5% |
| Horror/Mystery | 2% |

## Database Tables

| Table | Purpose |
|-------|---------|
| `factory_config` | Global settings |
| `ai_author_profiles` | AI writer personas |
| `story_ideas` | Generated story concepts |
| `story_blueprints` | Full story plans |
| `production_queue` | Active productions |
| `chapter_write_queue` | Pending chapters |
| `chapter_publish_queue` | Publishing schedule |
| `factory_stats` | Daily statistics |
| `factory_errors` | Error tracking |
| `factory_run_log` | Execution history |

## Edge Functions

### factory-daily-tasks
- **Schedule**: Once at midnight (Vietnam time)
- **Tasks**:
  - Reset daily chapter counters
  - Generate new story ideas
  - Auto-approve ideas
  - Create blueprints from ideas
  - Start new productions
  - Activate queued productions
  - Clean up old errors
  - Save daily stats

### factory-main-loop
- **Schedule**: Every 10 minutes
- **Tasks**:
  - Schedule chapters for active productions
  - Trigger writer workers
  - Publish due chapters
  - Handle errors

### factory-writer-worker
- **Schedule**: Every 5 minutes (active hours)
- **Tasks**:
  - Write pending chapters in batches
  - Quality check each chapter
  - Rewrite if below threshold
  - Update production context

### factory-publisher
- **Schedule**: Every 15 minutes
- **Tasks**:
  - Publish scheduled chapters
  - Update novel metadata
  - Handle publish failures

## Admin UI Pages

| Page | Path | Purpose |
|------|------|---------|
| Dashboard | `/admin/factory` | Overview & quick actions |
| Ideas | `/admin/factory/ideas` | Generate/approve/reject ideas |
| Blueprints | `/admin/factory/blueprints` | View/create story plans |
| Production | `/admin/factory/production` | Monitor active stories |
| Publishing | `/admin/factory/publishing` | View/manage schedule |
| Authors | `/admin/factory/authors` | AI author profiles |
| Errors | `/admin/factory/errors` | Error alerts & resolution |
| Config | `/admin/factory/config` | Factory settings |

## Quick Start

### 1. Environment Variables

```env
GEMINI_API_KEY=your_google_ai_studio_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Run Database Migration

```bash
supabase db push
# Or apply migration: 0022_create_factory_tables.sql
```

### 3. Deploy Edge Functions

```bash
supabase functions deploy factory-main-loop
supabase functions deploy factory-daily-tasks
supabase functions deploy factory-writer-worker
supabase functions deploy factory-publisher
```

### 4. Set Up Cron Jobs

See `supabase/migrations/0023_factory_cron_jobs.sql` for pg_cron setup.

### 5. Bootstrap Initial Data

1. Go to `/admin/factory`
2. Click "Bootstrap" button
3. Enter number of stories (e.g., 100)
4. Wait for completion

### 6. Start the Factory

1. Go to `/admin/factory`
2. Click "Start Factory"

## Testing Locally

### Test Edge Functions

```bash
# Serve locally
supabase functions serve

# Test main loop
curl -X POST http://localhost:54321/functions/v1/factory-main-loop \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"

# Test daily tasks
curl -X POST http://localhost:54321/functions/v1/factory-daily-tasks \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Manual Triggers via Admin UI

1. **Run Daily Tasks**: Dashboard → "Run Daily Tasks" button
2. **Run Main Loop**: Dashboard → "Run Main Loop" button
3. **Generate Ideas**: Ideas page → "Generate Ideas" button
4. **Create Blueprints**: Blueprints page → "Create Blueprints" button

## Error Handling

### Auto-Pause Conditions
- 3 consecutive errors on a production
- Quality score below 0.3
- Rate limit errors

### Error Severity Levels
| Level | Action |
|-------|--------|
| Info | Log only |
| Warning | Log + count |
| Error | Log + pause production |
| Critical | Log + stop factory + alert admin |

### Resolution Flow
1. Error appears in Errors page
2. Admin acknowledges
3. Admin investigates
4. Admin resolves with notes
5. Production resumes if applicable

## Quality Control

### Chapter Quality Metrics
- Length score (word count target)
- Pacing score (action/dialogue balance)
- Dialogue ratio
- Consistency score (with blueprint)
- Engagement score (hooks, cliffhangers)

### Minimum Quality Threshold
- Default: 0.6 (60%)
- Below threshold → automatic rewrite
- Max rewrites: 3 per chapter

## AI Author Profiles

Each AI author has:
- **Pen Name**: Vietnamese pseudonym
- **Writing Style**: dramatic, humorous, poetic, etc.
- **Tone**: serious, lighthearted, dark, etc.
- **Primary Genres**: Best at these
- **Avoid Genres**: Won't write these
- **Persona Prompt**: Full AI instructions

### Pre-seeded Authors (10)
See migration `0022_create_factory_tables.sql` for initial authors.

## Monitoring

### Key Metrics to Watch
- Active stories count
- Chapters written today
- Pending publishes
- New errors
- Average chapter quality

### Daily Stats (factory_stats table)
- Stories started/finished/paused/errored
- Chapters written/published/rewritten/failed
- AI calls and token usage
- Estimated cost

## Cost Estimation

Using Gemini API pricing (subject to change):
- Ideas: ~$0.001 per idea
- Blueprints: ~$0.01 per blueprint
- Chapters: ~$0.005 per chapter
- Covers: ~$0.02 per image

**Estimated daily cost at full capacity:**
- 10,000 chapters × $0.005 = $50/day
- Plus ideas/blueprints/covers ≈ $60-70/day total

## Troubleshooting

### Factory won't start
1. Check `factory_config.is_running` is false
2. Look for critical errors in `factory_errors`
3. Verify Gemini API key is valid

### Chapters not publishing
1. Check `chapter_publish_queue` for status
2. Verify scheduled time is in the past
3. Check for publish errors

### Low quality scores
1. Review author persona prompts
2. Adjust temperature in config
3. Check blueprint quality

### Rate limiting
1. Reduce `chapters_per_story_per_day`
2. Increase delay between API calls
3. Consider multiple API keys

## Support

For issues:
1. Check Errors page in admin UI
2. Review `factory_run_log` for recent runs
3. Check Supabase function logs
