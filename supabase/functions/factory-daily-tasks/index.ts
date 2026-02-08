// deno-lint-ignore-file

/**
 * Factory Daily Tasks Edge Function
 * Runs once at midnight (Vietnam time) via cron
 * 
 * Responsibilities:
 * - Reset daily counters
 * - Generate new story ideas
 * - Create blueprints from approved ideas
 * - Start new productions
 * - Clean up old data
 * - Save daily stats
 */

// @ts-ignore - Deno std import
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
// @ts-ignore - Supabase client import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

declare const Deno: {
  env: { get(name: string): string | undefined }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

interface DailyResult {
  countersReset: number;
  ideasGenerated: number;
  ideasApproved: number;
  blueprintsCreated: number;
  productionsStarted: number;
  productionsActivated: number;
  errorsCleanedUp: number;
  errors: string[];
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const result: DailyResult = {
    countersReset: 0,
    ideasGenerated: 0,
    ideasApproved: 0,
    blueprintsCreated: 0,
    productionsStarted: 0,
    productionsActivated: 0,
    errorsCleanedUp: 0,
    errors: [],
  }

  const startTime = Date.now()

  try {
    // 1. Get factory config
    const { data: config } = await supabase
      .from('factory_config')
      .select('*')
      .single()

    if (!config) {
      throw new Error('Factory config not found')
    }

    // Log run start
    const { data: runLog } = await supabase
      .from('factory_run_log')
      .insert({
        run_type: 'daily_tasks',
        status: 'running',
      })
      .select()
      .single()

    // 2. Reset daily counters
    const { data: resetData } = await supabase
      .from('production_queue')
      .update({ chapters_written_today: 0 })
      .neq('status', 'finished')
      .select('id')

    result.countersReset = resetData?.length || 0

    // Only run generation tasks if factory is running
    if (config.is_running) {
      // 3. Generate new ideas
      const ideasToGenerate = config.ideas_per_day || 30
      const genreDistribution = config.genre_distribution || {}

      for (const [genre, percentage] of Object.entries(genreDistribution)) {
        const count = Math.ceil((ideasToGenerate * (percentage as number)) / 100)
        
        for (let i = 0; i < count && result.ideasGenerated < ideasToGenerate; i++) {
          try {
            const idea = await generateIdea(geminiApiKey, genre)
            if (idea) {
              const { error } = await supabase.from('story_ideas').insert(idea)
              if (!error) {
                result.ideasGenerated++
              }
            }
          } catch (e) {
            result.errors.push(`Idea gen ${genre}: ${e}`)
          }
          
          // Rate limit protection
          await delay(500)
        }
      }

      // 4. Auto-approve ideas
      const { data: approved } = await supabase
        .from('story_ideas')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('status', 'generated')
        .limit(config.new_stories_per_day || 20)
        .select('id')

      result.ideasApproved = approved?.length || 0

      // 5. Get authors for blueprint creation
      const { data: authors } = await supabase
        .from('ai_author_profiles')
        .select('*')
        .eq('status', 'active')

      // 6. Create blueprints from approved ideas
      const { data: approvedIdeas } = await supabase
        .from('story_ideas')
        .select('*')
        .eq('status', 'approved')
        .order('priority', { ascending: false })
        .limit(config.new_stories_per_day || 20)

      for (const idea of approvedIdeas || []) {
        try {
          const author = findAuthorForGenre(authors || [], idea.genre)
          if (!author) continue

          const blueprint = await generateBlueprint(geminiApiKey, idea, author)
          if (blueprint) {
            const { error } = await supabase.from('story_blueprints').insert({
              ...blueprint,
              idea_id: idea.id,
              author_id: author.id,
            })

            if (!error) {
              result.blueprintsCreated++
              
              // Mark idea as blueprint_created
              await supabase
                .from('story_ideas')
                .update({ status: 'blueprint_created' })
                .eq('id', idea.id)
            }
          }
        } catch (e) {
          result.errors.push(`Blueprint ${idea.title}: ${e}`)
        }

        await delay(2000) // Rate limit for blueprint generation
      }

      // 7. Start new productions from blueprints
      const { data: blueprints } = await supabase
        .from('story_blueprints')
        .select('*')
        .in('status', ['generated', 'ready'])
        .order('created_at', { ascending: true })
        .limit(config.new_stories_per_day || 20)

      for (const bp of blueprints || []) {
        try {
          const author = findAuthorForGenre(authors || [], bp.genre)
          if (!author) continue

          // Create novel
          const { data: novel, error: novelError } = await supabase
            .from('novels')
            .insert({
              title: bp.title,
              slug: generateSlug(bp.title),
              author: author.pen_name,
              description: bp.short_synopsis,
              genre: bp.genre,
              cover_url: bp.cover_url,
              status: 'ongoing',
              total_chapters: 0,
              is_premium: false,
            })
            .select()
            .single()

          if (novelError) throw novelError

          // Create project
          const { data: project } = await supabase
            .from('ai_story_projects')
            .insert({
              name: bp.title,
              genre: bp.genre,
              description: bp.full_synopsis,
              status: 'active',
              settings: { blueprint_id: bp.id },
            })
            .select()
            .single()

          // Add to production queue
          const { error: prodError } = await supabase
            .from('production_queue')
            .insert({
              blueprint_id: bp.id,
              novel_id: novel.id,
              project_id: project?.id,
              author_id: author.id,
              status: 'queued',
              priority: 0,
              current_chapter: 0,
              total_chapters: bp.total_planned_chapters || 1500,
              chapters_per_day: config.chapters_per_story_per_day || 20,
              chapters_written_today: 0,
              running_plot_threads: [],
              character_states: {},
              quality_scores: [],
            })

          if (!prodError) {
            result.productionsStarted++

            // Update blueprint and author
            await supabase
              .from('story_blueprints')
              .update({ status: 'in_production' })
              .eq('id', bp.id)

            await supabase
              .from('ai_author_profiles')
              .update({ total_stories: author.total_stories + 1 })
              .eq('id', author.id)
          }
        } catch (e) {
          result.errors.push(`Production ${bp.title}: ${e}`)
        }
      }

      // 8. Activate queued productions
      const maxActive = config.max_active_stories || 500
      const { count: activeCount } = await supabase
        .from('production_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      const slotsAvailable = Math.max(0, maxActive - (activeCount || 0))
      
      if (slotsAvailable > 0) {
        const { data: activated } = await supabase
          .from('production_queue')
          .update({
            status: 'active',
            activated_at: new Date().toISOString(),
          })
          .eq('status', 'queued')
          .order('priority', { ascending: false })
          .order('queued_at', { ascending: true })
          .limit(slotsAvailable)
          .select('id')

        result.productionsActivated = activated?.length || 0
      }
    }

    // 9. Cleanup old errors (always run)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: deletedErrors } = await supabase
      .from('factory_errors')
      .delete()
      .in('status', ['resolved', 'ignored'])
      .lt('created_at', thirtyDaysAgo.toISOString())
      .select('id')

    result.errorsCleanedUp = deletedErrors?.length || 0

    // 10. Auto-resolve old minor errors
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    await supabase
      .from('factory_errors')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: 'system',
        auto_resolved: true,
        requires_attention: false,
      })
      .in('severity', ['info', 'warning'])
      .lt('created_at', sevenDaysAgo.toISOString())
      .eq('status', 'new')

    // 11. Update config last run time
    await supabase
      .from('factory_config')
      .update({ last_daily_run: new Date().toISOString() })

    // 12. Save daily stats
    const today = new Date().toISOString().split('T')[0]
    const { count: activeStories } = await supabase
      .from('production_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    await supabase.from('factory_stats').upsert({
      stat_date: today,
      active_stories: activeStories || 0,
      stories_started: result.productionsStarted,
      ideas_generated: result.ideasGenerated,
      blueprints_created: result.blueprintsCreated,
      total_errors: result.errors.length,
    })

    // 13. Log completion
    const duration = Math.floor((Date.now() - startTime) / 1000)
    if (runLog) {
      await supabase
        .from('factory_run_log')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_seconds: duration,
          results: result,
          items_processed: result.ideasGenerated + result.blueprintsCreated + result.productionsStarted,
        })
        .eq('id', runLog.id)
    }

    return new Response(JSON.stringify({
      success: true,
      result,
      duration_seconds: duration,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    await supabase.from('factory_errors').insert({
      error_type: 'system_error',
      error_message: `Daily tasks failed: ${e}`,
      severity: 'critical',
      requires_attention: true,
    })

    return new Response(JSON.stringify({
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
      result,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Helper functions
async function generateIdea(apiKey: string, genre: string): Promise<any> {
  const prompt = `Tạo ý tưởng truyện webnovel tiếng Việt thể loại ${genre}.

OUTPUT JSON (chỉ JSON):
{
  "title": "Tên truyện hấp dẫn",
  "genre": "${genre}",
  "premise": "Tiền đề truyện 2-3 câu",
  "hook": "Mở đầu cuốn hút",
  "usp": "Điểm độc đáo",
  "protagonist_archetype": "Kiểu nhân vật chính",
  "antagonist_type": "Kiểu phản diện",
  "estimated_chapters": 1500,
  "tags": ["tag1", "tag2"],
  "tropes": ["trope1", "trope2"],
  "status": "generated"
}`

  const response = await fetch(
    `${GEMINI_API_BASE}/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 1024 },
      }),
    }
  )

  if (!response.ok) return null

  const data = await response.json()
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  
  try {
    let jsonStr = content.trim()
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)
    return JSON.parse(jsonStr.trim())
  } catch {
    return null
  }
}

async function generateBlueprint(apiKey: string, idea: any, author: any): Promise<any> {
  const prompt = `Với phong cách của ${author.pen_name}, tạo blueprint cho truyện:

Tiêu đề: ${idea.title}
Thể loại: ${idea.genre}
Tiền đề: ${idea.premise}

OUTPUT JSON:
{
  "title": "${idea.title}",
  "genre": "${idea.genre}",
  "short_synopsis": "2-3 câu giới thiệu",
  "full_synopsis": "5-10 câu mô tả plot",
  "world_name": "Tên thế giới",
  "world_description": "Mô tả thế giới",
  "protagonist": {
    "name": "Tên nhân vật",
    "personality": "Tính cách",
    "goals": ["Mục tiêu"]
  },
  "total_planned_chapters": 1500,
  "arc_outlines": [
    {"arc_number": 1, "title": "Arc 1", "start_chapter": 1, "end_chapter": 200, "summary": "Tóm tắt"}
  ],
  "status": "generated"
}`

  const response = await fetch(
    `${GEMINI_API_BASE}/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 4096 },
        systemInstruction: { parts: [{ text: author.persona_prompt }] },
      }),
    }
  )

  if (!response.ok) return null

  const data = await response.json()
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  
  try {
    let jsonStr = content.trim()
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)
    return JSON.parse(jsonStr.trim())
  } catch {
    return null
  }
}

function findAuthorForGenre(authors: any[], genre: string): any {
  return authors.find(a => a.primary_genres?.includes(genre) && !a.avoid_genres?.includes(genre))
    || authors.find(a => a.secondary_genres?.includes(genre) && !a.avoid_genres?.includes(genre))
    || authors.find(a => !a.avoid_genres?.includes(genre))
    || authors[0]
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100)
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
