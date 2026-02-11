# Vercel Environment Variables Setup

## 🚨 CRITICAL - Missing Environment Variable on Vercel

**Problem**: Your Vercel deployment is missing `NEXT_PUBLIC_SUPABASE_ANON_KEY`, which causes the app to not load any novels.

**Root Cause**: The homepage checks for both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. If either is missing, it shows the error message instead of loading data.

---

## ✅ How to Fix (Vercel Dashboard)

### Step 1: Go to Vercel Project Settings

1. Open https://vercel.com/dashboard
2. Find your project (likely named `truyencity2` or `truyencity`)
3. Click on the project
4. Go to **Settings** → **Environment Variables**

### Step 2: Add Missing Environment Variable

Add this variable:

**Variable Name**:
```
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Value**: (Get from Supabase)
```bash
# Run this command in your terminal to get the anon key:
npx supabase projects api-keys --project-ref jxhpejyowuihvjpqwarm

# Copy the "anon" key value
```

**Environments**: Check all three:
- ✅ Production
- ✅ Preview
- ✅ Development

### Step 3: Verify All Required Variables

Make sure you have these variables set on Vercel:

| Variable Name | Required | Exposed to Browser | Notes |
|---------------|----------|-------------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Yes (`NEXT_PUBLIC_*`) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ **MISSING!** | Yes (`NEXT_PUBLIC_*`) | Public anon key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | No (server-only) | Private service key (NEVER expose) |
| `GEMINI_API_KEY` | ✅ Yes | No (server-only) | For AI content generation |
| `CRON_SECRET` | ✅ Yes | No (server-only) | For cron job authentication |

### Step 4: Redeploy

After adding the missing variable:

1. Go to **Deployments** tab
2. Find the latest deployment
3. Click **⋮** (three dots) → **Redeploy**
4. Select **"Use existing Build Cache"** (faster)
5. Click **Redeploy**

**OR** just push a new commit:
```bash
git commit --allow-empty -m "Trigger redeploy after adding env vars"
git push
```

---

## 🔐 Security Best Practices

### ✅ SAFE to expose (NEXT_PUBLIC_*)
- `NEXT_PUBLIC_SUPABASE_URL` - Public URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key with RLS policies

These are **designed** to be public. Supabase protects data using Row Level Security (RLS) policies, not by hiding the keys.

### ❌ NEVER expose (server-only)
- `SUPABASE_SERVICE_ROLE_KEY` - Bypasses RLS, full database access
- `GEMINI_API_KEY` - Costs money if leaked
- `CRON_SECRET` - Allows unauthorized cron triggers

**How to keep them safe**:
1. ✅ Add to Vercel environment variables (not in code)
2. ✅ Add to `.env.local` for local dev (gitignored)
3. ❌ NEVER commit `.env.local` to git
4. ❌ NEVER hardcode in source code
5. ❌ NEVER add to client-side code

---

## 🛠️ Local Development Setup

### For New Developers

1. **Copy the example file**:
   ```bash
   cp .env.example .env.local
   ```

2. **Get Supabase keys**:
   ```bash
   npx supabase projects api-keys --project-ref jxhpejyowuihvjpqwarm
   ```

3. **Fill in `.env.local`** with actual values:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://jxhpejyowuihvjpqwarm.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from step 2>
   SUPABASE_SERVICE_ROLE_KEY=<service_role key from step 2>
   GEMINI_API_KEY=<your Gemini API key>
   CRON_SECRET=<generate with: openssl rand -hex 32>
   ```

4. **Start dev server**:
   ```bash
   npm run dev
   ```

---

## 🔍 How to Verify Fix

### After redeploying on Vercel:

1. **Check Vercel deployment logs**:
   - Go to Deployments → Latest deployment → Build Logs
   - Should NOT see "Missing Supabase environment variables" error

2. **Visit your production site**:
   - Homepage should show novels (not error message)
   - "Duyệt truyện" (Browse) should show 200+ novels
   - All features should work

3. **Test from browser console** (F12):
   ```javascript
   // This should work on production site:
   fetch('https://jxhpejyowuihvjpqwarm.supabase.co/rest/v1/novels?select=count&limit=1', {
     headers: {
       'apikey': 'YOUR_ANON_KEY_HERE',
       'Authorization': 'Bearer YOUR_ANON_KEY_HERE'
     }
   }).then(r => r.json()).then(console.log)
   
   // Expected: [{"count": 200}]
   ```

---

## ❓ Troubleshooting

### Issue: "Still showing error message after redeploy"

**Check**:
1. Did you add the variable to **Production** environment?
2. Did you redeploy **after** adding the variable?
3. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)

### Issue: "Novels not loading on local dev"

**Fix**:
```bash
# Make sure .env.local has ANON_KEY
cat .env.local | grep ANON_KEY

# If missing, add it:
echo 'NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>' >> .env.local

# Restart dev server
npm run dev
```

### Issue: "How do I know if .env.local is safe?"

**Check**:
```bash
# This should show ".env*"
cat .gitignore | grep env

# This should show "no changes" (not tracked)
git status .env.local
```

---

## 📚 References

- [Vercel Environment Variables Docs](https://vercel.com/docs/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Supabase API Keys](https://supabase.com/docs/guides/api/api-keys)

---

**Created**: 2026-02-11  
**Last Updated**: 2026-02-11  
**Status**: ✅ Ready to implement
