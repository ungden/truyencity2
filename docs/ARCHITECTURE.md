# Architecture Documentation

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Next.js    │  │  React UI    │  │  Tailwind    │      │
│  │  App Router  │  │  Components  │  │     CSS      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Next.js API │  │    Supabase  │  │    Edge      │      │
│  │    Routes    │  │   REST API   │  │  Functions   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ AIStoryWriter│  │  Story Graph │  │ Contradiction│      │
│  │    Class     │  │   Manager    │  │   Detector   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │   Supabase   │  │  OpenRouter  │      │
│  │   Database   │  │    Storage   │  │   AI API     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Component Architecture

### Frontend Components

```
src/
├── app/
│   ├── admin/
│   │   └── ai-writer/
│   │       └── page.tsx          # Main dashboard page
│   └── api/
│       └── ai-writer/
│           ├── jobs/
│           │   ├── route.ts      # Create job
│           │   └── [id]/
│           │       ├── route.ts  # Get job status
│           │       └── stop/
│           │           └── route.ts  # Stop job
│           └── projects/
│               ├── route.ts      # List/create projects
│               └── [id]/
│                   ├── status/
│                   │   └── route.ts  # Update status
│                   └── jobs/
│                       └── route.ts  # List project jobs
├── components/
│   └── admin/
│       └── ai-writer/
│           ├── dashboard.tsx     # Main dashboard component
│           ├── project-card.tsx  # Project list item
│           ├── writing-interface.tsx  # Writing UI
│           ├── project-setup-dialog.tsx  # Create/edit project
│           ├── schedule-dialog.tsx  # Create schedule
│           └── schedule-list.tsx  # Schedule management
├── services/
│   └── ai-story-writer.ts        # Core AI writing logic
└── lib/
    └── types/
        ├── ai-writer.ts          # TypeScript types
        └── genre-config.ts       # Genre configurations
```

### Backend Services

```
supabase/
└── functions/
    ├── openrouter-chat/
    │   └── index.ts              # OpenRouter API wrapper
    ├── ai-writer-scheduler/
    │   └── index.ts              # Cron job for autopilot
    └── notify-new-chapter/
        └── index.ts              # Send notifications
```

## 🔄 Data Flow

### Writing a Chapter

```
1. User clicks "Viết tiếp"
   │
   ▼
2. Frontend: POST /api/ai-writer/jobs
   │
   ▼
3. API Route: Create job in database
   │
   ▼
4. API Route: Call AIStoryWriter.writeNextChapter()
   │
   ▼
5. AIStoryWriter:
   ├─ getStoryContext()
   │  └─ Query story_graph_nodes (5 recent chapters)
   │
   ├─ generatePrompt()
   │  ├─ Get template from ai_prompt_templates
   │  └─ Replace placeholders with context
   │
   ├─ callAI()
   │  └─ Edge Function: openrouter-chat
   │     └─ OpenRouter API (GPT-4/Claude/Qwen)
   │
   ├─ refineContent()
   │  ├─ Check word count
   │  └─ Check dialogue count
   │
   ├─ detectContradictions()
   │  ├─ Check cultivation level
   │  └─ Check character death
   │
   ├─ updateStoryGraph()
   │  ├─ Generate summary
   │  ├─ Extract cultivation level
   │  └─ Insert into story_graph_nodes
   │
   └─ saveChapter()
      ├─ Insert into chapters table
      └─ Update current_chapter in projects
   │
   ▼
6. Edge Function: notify-new-chapter
   │
   ▼
7. Frontend: Poll job status every 2s
   │
   ▼
8. Display chapter preview
```

### Batch Writing

```
1. User enters batch count (e.g., 10)
   │
   ▼
2. Frontend: Loop 10 times
   │
   ├─ POST /api/ai-writer/jobs
   │  │
   │  ▼
   ├─ Wait for job completion (poll every 3s)
   │  │
   │  ▼
   ├─ Update progress bar (1/10, 2/10, ...)
   │  │
   │  ▼
   └─ Show toast notification
   │
   ▼
3. All chapters completed
```

### Autopilot Schedule

```
1. User creates schedule
   │
   ▼
2. Supabase Cron: Every hour
   │
   ▼
3. Edge Function: ai-writer-scheduler
   │
   ├─ Query active schedules
   │  └─ WHERE next_run_at <= NOW()
   │
   ├─ For each schedule:
   │  ├─ Create job
   │  ├─ Update next_run_at
   │  └─ Update last_run_at
   │
   └─ Return results
```

## 🗄️ Database Schema

### Core Tables

**ai_story_projects**
```sql
CREATE TABLE ai_story_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  novel_id UUID REFERENCES novels(id),
  genre TEXT NOT NULL,
  main_character TEXT NOT NULL,
  cultivation_system TEXT,
  world_description TEXT,
  writing_style TEXT DEFAULT 'webnovel_chinese',
  target_chapter_length INTEGER DEFAULT 2500,
  ai_model TEXT DEFAULT 'gpt-4-turbo',
  temperature NUMERIC DEFAULT 0.7,
  current_chapter INTEGER DEFAULT 0,
  total_planned_chapters INTEGER DEFAULT 100,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**story_graph_nodes**
```sql
CREATE TABLE story_graph_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES ai_story_projects(id),
  chapter_number INTEGER NOT NULL,
  chapter_title TEXT,
  summary TEXT NOT NULL,
  key_events JSONB,
  character_states JSONB,
  plot_threads JSONB,
  cultivation_level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**ai_writing_jobs**
```sql
CREATE TABLE ai_writing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES ai_story_projects(id),
  user_id UUID REFERENCES auth.users(id),
  chapter_number INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  step_message TEXT,
  result_chapter_id UUID REFERENCES chapters(id),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**ai_writing_schedules**
```sql
CREATE TABLE ai_writing_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES ai_story_projects(id),
  frequency TEXT DEFAULT 'daily',
  time_of_day TIME,
  chapters_per_run INTEGER DEFAULT 1,
  next_run_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_story_graph_nodes_project ON story_graph_nodes(project_id, chapter_number DESC);
CREATE INDEX idx_ai_writing_jobs_project ON ai_writing_jobs(project_id, created_at DESC);
CREATE INDEX idx_ai_writing_schedules_next_run ON ai_writing_schedules(next_run_at) WHERE status = 'active';
```

## 🔐 Security Architecture

### Authentication Flow

```
1. User logs in
   │
   ▼
2. Supabase Auth: Generate JWT token
   │
   ▼
3. Frontend: Store token in localStorage
   │
   ▼
4. API Request: Include token in Authorization header
   │
   ▼
5. API Route: Verify token with Supabase
   │
   ▼
6. Row Level Security: Filter data by user_id
```

### RLS Policies

```sql
-- Users can only see their own projects
CREATE POLICY "Users can manage their own projects"
ON ai_story_projects
FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- Admins can see all projects
CREATE POLICY "Admins can view all projects"
ON ai_story_projects
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
```

## 🚀 Deployment Architecture

### Production Environment

```
┌─────────────────────────────────────────────────────────────┐
│                         Vercel                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Next.js Application                      │   │
│  │  - Server-side rendering                              │   │
│  │  - API routes                                         │   │
│  │  - Static assets                                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       Supabase                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │     Auth     │  │    Storage   │      │
│  │   Database   │  │   Service    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Edge Functions (Deno)                    │   │
│  │  - openrouter-chat                                    │   │
│  │  - ai-writer-scheduler                                │   │
│  │  - notify-new-chapter                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      OpenRouter                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    GPT-4     │  │    Claude    │  │     Qwen     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Scaling Strategy

**Horizontal Scaling**
- Vercel: Auto-scales based on traffic
- Supabase: Connection pooling (PgBouncer)
- Edge Functions: Auto-scales per region

**Vertical Scaling**
- Database: Upgrade to larger instance
- Edge Functions: Increase memory limit

**Caching**
- Story Graph queries: Redis cache (future)
- Static assets: CDN (Vercel Edge Network)

## 📊 Monitoring & Observability

### Metrics

**Application Metrics**
- Request rate (req/s)
- Response time (p50, p95, p99)
- Error rate (%)
- Active users

**Business Metrics**
- Chapters written per day
- Average chapter length
- Contradiction detection rate
- User retention rate

### Logging

**Frontend**
- Console errors
- User actions (analytics)

**Backend**
- API request logs
- Edge function logs
- Database query logs

### Alerting

**Critical Alerts**
- API error rate > 5%
- Database connection pool exhausted
- Edge function timeout > 30s

**Warning Alerts**
- Response time > 3s
- Disk usage > 80%
- Memory usage > 80%

## 🔧 Development Workflow

### Local Development

```bash
# 1. Clone repo
git clone <repo-url>

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env.local

# 4. Run Supabase locally
npx supabase start

# 5. Run migrations
npx supabase db push

# 6. Start dev server
npm run dev
```

### Testing Strategy

**Unit Tests**
- Services: `ai-story-writer.ts`
- Utils: `lib/utils.ts`
- Coverage target: 80%

**Integration Tests**
- API routes
- Edge functions
- Database queries

**E2E Tests**
- User flows (Playwright)
- Critical paths only

### CI/CD Pipeline

```
1. Push to GitHub
   │
   ▼
2. GitHub Actions
   ├─ Run linter (ESLint)
   ├─ Run type check (TypeScript)
   ├─ Run unit tests (Jest)
   └─ Run integration tests
   │
   ▼
3. Deploy to Vercel (preview)
   │
   ▼
4. Manual approval
   │
   ▼
5. Deploy to production
```

---

**Last Updated**: 2025-01-30
**Version**: 1.0.0