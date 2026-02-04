# Deployment Guide

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Supabase account
- OpenRouter API key
- Vercel account (for production)
- Git installed

### Environment Variables

Create `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenRouter
OPENROUTER_API_KEY=your-openrouter-key

# Gemini (for novel generation + cover art)
GEMINI_API_KEY=your-gemini-key
```

## 📦 Local Development

### 1. Clone and Install

```bash
# Clone repository
git clone <your-repo-url>
cd <project-name>

# Install dependencies
npm install
```

### 2. Setup Supabase

```bash
# Login to Supabase
npx supabase login

# Link to your project
npx supabase link --project-ref your-project-ref

# Push database schema
npx supabase db push

# Deploy edge functions
npx supabase functions deploy openrouter-chat
npx supabase functions deploy ai-writer-scheduler
npx supabase functions deploy notify-new-chapter
npx supabase functions deploy gemini-cover-generate
```

### 3. Configure Edge Function Secrets

```bash
# Set OpenRouter API key
npx supabase secrets set OPENROUTER_API_KEY=your-key

# Verify secrets
npx supabase secrets list
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## 🌐 Production Deployment

### Option 1: Vercel (Recommended)

#### Step 1: Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository
4. Select the repository

#### Step 2: Configure Environment Variables

Add these in Vercel dashboard:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENROUTER_API_KEY=your-openrouter-key
GEMINI_API_KEY=your-gemini-key
```

#### Step 3: Deploy

```bash
# Deploy via CLI
npx vercel

# Or push to main branch (auto-deploy)
git push origin main
```

#### Step 4: Configure Domain

1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records

### Option 2: Self-Hosted

#### Using Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
# Build image
docker build -t ai-story-writer .

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your-url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key \
  -e SUPABASE_SERVICE_ROLE_KEY=your-key \
  -e OPENROUTER_API_KEY=your-key \
  ai-story-writer
```

#### Using PM2

```bash
# Install PM2
npm install -g pm2

# Build application
npm run build

# Start with PM2
pm2 start npm --name "ai-story-writer" -- start

# Save PM2 configuration
pm2 save

# Setup auto-restart on reboot
pm2 startup
```

## 🗄️ Database Setup

### Initial Schema

```bash
# Push schema to Supabase
npx supabase db push
```

### Seed Data (Optional)

Create `supabase/seed.sql`:

```sql
-- Insert default AI prompt templates
INSERT INTO ai_prompt_templates (name, category, template, is_default) VALUES
('Tiên Hiệp Default', 'cultivation', '...', true),
('Huyền Huyễn Default', 'fantasy', '...', true);

-- Insert default genres
INSERT INTO genres (id, name, icon, description) VALUES
('tien-hiep', 'Tiên Hiệp', 'Sparkles', 'Tu tiên, tu chân'),
('huyen-huyen', 'Huyền Huyễn', 'Wand2', 'Phép thuật, ma pháp');
```

```bash
# Run seed
npx supabase db reset
```

## ⚙️ Edge Functions Configuration

### Setup Cron Job for Autopilot

1. Go to Supabase Dashboard
2. Navigate to Database → Cron Jobs
3. Create new cron job:

```sql
SELECT cron.schedule(
  'ai-writer-autopilot',
  '0 * * * *', -- Every hour
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/ai-writer-scheduler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  );
  $$
);
```

### Configure Edge Function Secrets

In Supabase Dashboard → Edge Functions → Manage Secrets:

```
OPENROUTER_API_KEY=sk-or-v1-...
GEMINI_API_KEY=... (for novel generation + cover art)
```

## 🔐 Security Checklist

### Before Going Live

- [ ] Enable RLS on all tables
- [ ] Review and test all RLS policies
- [ ] Rotate all API keys
- [ ] Enable 2FA on Supabase account
- [ ] Enable 2FA on Vercel account
- [ ] Set up rate limiting
- [ ] Configure CORS properly
- [ ] Enable HTTPS only
- [ ] Set secure cookie flags
- [ ] Review environment variables
- [ ] Enable database backups
- [ ] Set up monitoring alerts

### RLS Policies Verification

```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

## 📊 Monitoring Setup

### Vercel Analytics

1. Enable in Vercel Dashboard
2. Add to `next.config.js`:

```javascript
module.exports = {
  analytics: {
    enabled: true,
  },
};
```

### Supabase Monitoring

1. Go to Supabase Dashboard → Reports
2. Monitor:
   - Database performance
   - API usage
   - Edge function invocations
   - Storage usage

### Custom Logging

Add to edge functions:

```typescript
// Log important events
console.log('[AI Writer]', {
  event: 'chapter_completed',
  projectId: project.id,
  chapterNumber: chapter.number,
  duration: Date.now() - startTime,
});
```

## 🔄 CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run linter
        run: npm run lint
        
      - name: Run type check
        run: npm run type-check
        
      - name: Run tests
        run: npm test
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## 🐛 Troubleshooting

### Common Issues

**1. Edge Functions Not Working**

```bash
# Check function logs
npx supabase functions logs openrouter-chat

# Redeploy function
npx supabase functions deploy openrouter-chat --no-verify-jwt
```

**2. Database Connection Issues**

```bash
# Check connection pooling
npx supabase db inspect connection-pooling

# Reset connection pool
npx supabase db reset --db-url "postgresql://..."
```

**3. Build Failures**

```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules
rm -rf node_modules
npm install

# Rebuild
npm run build
```

**4. Environment Variables Not Loading**

```bash
# Verify .env.local exists
cat .env.local

# Restart dev server
npm run dev
```

## 📈 Performance Optimization

### Database Indexes

```sql
-- Add indexes for common queries
CREATE INDEX idx_chapters_novel_number ON chapters(novel_id, chapter_number);
CREATE INDEX idx_story_graph_project_chapter ON story_graph_nodes(project_id, chapter_number DESC);
CREATE INDEX idx_jobs_status_created ON ai_writing_jobs(status, created_at DESC);
```

### Caching Strategy

```typescript
// Add Redis caching (future)
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

// Cache story context
const cacheKey = `story_context:${projectId}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return cached;
}

const context = await getStoryContext();
await redis.set(cacheKey, context, { ex: 300 }); // 5 minutes
```

### Edge Function Optimization

```typescript
// Use Deno KV for caching
const kv = await Deno.openKv();

// Cache prompt templates
const templateKey = ['template', category];
const cached = await kv.get(templateKey);

if (cached.value) {
  return cached.value;
}

const template = await fetchTemplate(category);
await kv.set(templateKey, template, { expireIn: 3600000 }); // 1 hour
```

## 🔄 Backup & Recovery

### Database Backups

```bash
# Manual backup
npx supabase db dump -f backup.sql

# Restore from backup
npx supabase db reset --db-url "postgresql://..." < backup.sql
```

### Automated Backups

Enable in Supabase Dashboard:
1. Go to Settings → Database
2. Enable Point-in-Time Recovery (PITR)
3. Set retention period (7-30 days)

### Disaster Recovery Plan

1. **Database Failure**
   - Restore from PITR
   - Verify data integrity
   - Resume operations

2. **Edge Function Failure**
   - Redeploy functions
   - Check logs for errors
   - Verify secrets

3. **Complete Outage**
   - Switch to backup Supabase project
   - Update environment variables
   - Redeploy application

## 📞 Support

### Getting Help

- Documentation: [docs.example.com](https://docs.example.com)
- Discord: [discord.gg/example](https://discord.gg/example)
- Email: support@example.com

### Reporting Issues

1. Check existing issues on GitHub
2. Provide reproduction steps
3. Include error logs
4. Specify environment (dev/prod)

---

**Last Updated**: 2025-01-30
**Version**: 1.0.0