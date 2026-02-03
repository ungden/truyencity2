// deno-lint-ignore-file

/**
 * Factory Writer Worker Edge Function
 * Writes chapters from the write queue using Gemini AI
 * 
 * Can be invoked:
 * - By factory-main-loop for batch processing
 * - Directly with specific chapter IDs
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
const TARGET_WORD_COUNT = 2500
const MIN_WORD_COUNT = 1800

interface WriteResult {
  chaptersWritten: number;
  chaptersRewritten: number;
  chaptersFailed: number;
  totalTokens: number;
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

  const result: WriteResult = {
    chaptersWritten: 0,
    chaptersRewritten: 0,
    chaptersFailed: 0,
    totalTokens: 0,
    errors: [],
  }

  const startTime = Date.now()

  try {
    // Parse request body for specific chapter IDs or batch size
    const body = await req.json().catch(() => ({}))
    const chapterIds = body.chapter_ids as string[] | undefined
    const batchSize = body.batch_size || 10
    const maxRewriteAttempts = body.max_rewrite_attempts || 2
    const minQualityScore = body.min_quality_score || 0.6

    // Get config
    const { data: config } = await supabase
      .from('factory_config')
      .select('*')
      .single()

    if (!config?.is_running) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Factory is not running',
        result,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Log run start
    const { data: runLog } = await supabase
      .from('factory_run_log')
      .insert({
        run_type: 'writer_worker',
        status: 'running',
      })
      .select()
      .single()

    // Get chapters to write
    let query = supabase
      .from('chapter_write_queue')
      .select('*')
      .eq('status', 'pending')
      .order('scheduled_time', { ascending: true })

    if (chapterIds && chapterIds.length > 0) {
      query = query.in('id', chapterIds)
    } else {
      query = query.limit(batchSize)
    }

    const { data: queueItems } = await query

    // Process each chapter
    for (const queueItem of queueItems || []) {
      try {
        // Mark as writing
        await supabase
          .from('chapter_write_queue')
          .update({
            status: 'writing',
            started_at: new Date().toISOString(),
            attempt_count: (queueItem.attempt_count || 0) + 1,
          })
          .eq('id', queueItem.id)

        // Get production with blueprint and author
        const { data: production } = await supabase
          .from('production_queue')
          .select(`
            *,
            story_blueprints (*),
            ai_author_profiles (*)
          `)
          .eq('id', queueItem.production_id)
          .single()

        if (!production) {
          throw new Error('Production not found')
        }

        const blueprint = production.story_blueprints
        const author = production.ai_author_profiles

        // Write the chapter
        const chapterResult = await writeChapter({
          apiKey: geminiApiKey,
          blueprint,
          production,
          author,
          queueItem,
        })

        if (!chapterResult.success) {
          throw new Error(chapterResult.error)
        }

        result.totalTokens += chapterResult.tokens || 0

        // Check quality
        const qualityResult = await checkQuality({
          apiKey: geminiApiKey,
          content: chapterResult.content!,
          chapterNumber: queueItem.chapter_number,
          genre: blueprint.genre,
        })

        let finalContent = chapterResult.content!
        let finalScore = qualityResult.score

        // Rewrite if quality is too low
        if (qualityResult.score < minQualityScore * 10 && queueItem.attempt_count < maxRewriteAttempts) {
          await supabase
            .from('chapter_write_queue')
            .update({ status: 'rewriting' })
            .eq('id', queueItem.id)

          const rewriteResult = await rewriteChapter({
            apiKey: geminiApiKey,
            content: chapterResult.content!,
            issues: qualityResult.issues,
            authorPrompt: author?.persona_prompt || '',
          })

          if (rewriteResult.success && rewriteResult.content) {
            finalContent = rewriteResult.content
            result.chaptersRewritten++

            // Re-check quality
            const recheckResult = await checkQuality({
              apiKey: geminiApiKey,
              content: finalContent,
              chapterNumber: queueItem.chapter_number,
              genre: blueprint.genre,
            })
            finalScore = recheckResult.score
          }
        }

        // Save chapter to database
        const { data: savedChapter, error: saveError } = await supabase
          .from('chapters')
          .insert({
            novel_id: production.novel_id,
            chapter_number: queueItem.chapter_number,
            title: chapterResult.title || `Chương ${queueItem.chapter_number}`,
            content: finalContent,
            word_count: countWords(finalContent),
            status: 'draft',
          })
          .select()
          .single()

        if (saveError) {
          throw new Error(`Save failed: ${saveError.message}`)
        }

        // Update queue item as completed
        await supabase
          .from('chapter_write_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            result_chapter_id: savedChapter.id,
            content_preview: finalContent.substring(0, 500),
            word_count: countWords(finalContent),
            quality_score: finalScore,
          })
          .eq('id', queueItem.id)

        // Update production
        const today = new Date().toISOString().split('T')[0]
        const isNewDay = production.last_write_date !== today
        const newChaptersToday = isNewDay ? 1 : (production.chapters_written_today || 0) + 1

        const qualityScores = [...(production.quality_scores || []), finalScore].slice(-10)
        const avgQuality = qualityScores.reduce((a: number, b: number) => a + b, 0) / qualityScores.length

        const isFinished = queueItem.chapter_number >= (production.total_chapters || Infinity)

        await supabase
          .from('production_queue')
          .update({
            current_chapter: queueItem.chapter_number,
            last_chapter_summary: chapterResult.summary || '',
            last_write_date: today,
            chapters_written_today: newChaptersToday,
            quality_scores: qualityScores,
            avg_chapter_quality: avgQuality,
            consecutive_errors: 0,
            ...(isFinished && {
              status: 'finished',
              finished_at: new Date().toISOString(),
            }),
          })
          .eq('id', production.id)

        // Update novel chapter count
        await supabase
          .from('novels')
          .update({ total_chapters: queueItem.chapter_number })
          .eq('id', production.novel_id)

        // Update author stats
        if (author) {
          const newTotalChapters = (author.total_chapters || 0) + 1
          const currentAvg = author.avg_quality_score || finalScore
          const newAvg = (currentAvg * (author.total_chapters || 0) + finalScore) / newTotalChapters

          await supabase
            .from('ai_author_profiles')
            .update({
              total_chapters: newTotalChapters,
              avg_quality_score: newAvg,
            })
            .eq('id', author.id)
        }

        // Schedule for publishing
        await supabase
          .from('chapter_publish_queue')
          .insert({
            production_id: production.id,
            chapter_id: savedChapter.id,
            scheduled_time: queueItem.scheduled_time || new Date().toISOString(),
            publish_slot: queueItem.scheduled_slot || 'evening',
            status: 'scheduled',
          })

        result.chaptersWritten++

      } catch (e) {
        result.chaptersFailed++
        result.errors.push(`Chapter ${queueItem.chapter_number}: ${e}`)

        // Mark as failed
        await supabase
          .from('chapter_write_queue')
          .update({
            status: 'failed',
            error_message: String(e),
          })
          .eq('id', queueItem.id)

        // Record production error
        await supabase
          .from('production_queue')
          .update({
            consecutive_errors: (queueItem.attempt_count || 0) + 1,
            last_error: String(e),
            last_error_at: new Date().toISOString(),
          })
          .eq('id', queueItem.production_id)

        // Log error
        await supabase.from('factory_errors').insert({
          error_type: 'ai_failure',
          error_message: String(e),
          production_id: queueItem.production_id,
          chapter_number: queueItem.chapter_number,
          severity: 'warning',
          requires_attention: (queueItem.attempt_count || 0) >= maxRewriteAttempts,
        })
      }

      // Rate limit protection
      await delay(1000)
    }

    // Log completion
    const duration = Math.floor((Date.now() - startTime) / 1000)
    if (runLog) {
      await supabase
        .from('factory_run_log')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_seconds: duration,
          results: result,
          items_processed: result.chaptersWritten,
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
      error_message: `Writer worker failed: ${e}`,
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

// Write chapter using Gemini
async function writeChapter(params: {
  apiKey: string;
  blueprint: any;
  production: any;
  author: any;
  queueItem: any;
}): Promise<{ success: boolean; content?: string; title?: string; summary?: string; tokens?: number; error?: string }> {
  const { apiKey, blueprint, production, author, queueItem } = params

  const currentArc = blueprint.arc_outlines?.find((a: any) =>
    queueItem.chapter_number >= a.start_chapter && queueItem.chapter_number <= a.end_chapter
  )

  const tensionLevel = queueItem.tension_target > 70 ? 'HIGH' : queueItem.tension_target > 40 ? 'MEDIUM' : 'LOW'

  const prompt = `VIẾT CHƯƠNG ${queueItem.chapter_number} - ${blueprint.title}

=== THÔNG TIN ===
Thể loại: ${blueprint.genre}
Nhân vật chính: ${blueprint.protagonist?.name || 'N/A'}
Thế giới: ${blueprint.world_name || 'N/A'}

=== CONTEXT ===
${production.last_chapter_summary || 'Đây là chương đầu tiên'}

=== ARC ===
${currentArc ? `${currentArc.title}: ${currentArc.summary}` : 'Arc 1'}

=== MỤC TIÊU ===
${queueItem.plot_objectives || 'Phát triển câu chuyện'}

=== DOPAMINE: ${tensionLevel} ===
Tension: ${queueItem.tension_target}/100

=== YÊU CẦU ===
1. Độ dài: ${TARGET_WORD_COUNT} từ (tối thiểu ${MIN_WORD_COUNT})
2. Bắt đầu với: "Chương ${queueItem.chapter_number}: [Tiêu đề]"
3. Dialogue 35-50%
4. Kết thúc với hook/cliffhanger
5. Viết bằng tiếng Việt

${queueItem.special_instructions ? `=== CHỈ DẪN THÊM ===\n${queueItem.special_instructions}` : ''}

Viết chương đầy đủ:`

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/models/${blueprint.ai_model || 'gemini-2.0-flash-exp'}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 8192,
          },
          ...(author?.persona_prompt && {
            systemInstruction: { parts: [{ text: author.persona_prompt }] },
          }),
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `Gemini error: ${response.status} - ${errorText}` }
    }

    const data = await response.json()
    
    if (data.promptFeedback?.blockReason) {
      return { success: false, error: `Blocked: ${data.promptFeedback.blockReason}` }
    }

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    if (!content) {
      return { success: false, error: 'No content generated' }
    }

    const { title, body } = extractTitleAndBody(content, queueItem.chapter_number)
    const tokens = data.usageMetadata?.totalTokenCount || 0

    // Generate summary
    const summaryResult = await generateSummary(apiKey, body, queueItem.chapter_number)

    return {
      success: true,
      content: body,
      title,
      summary: summaryResult,
      tokens,
    }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// Check chapter quality
async function checkQuality(params: {
  apiKey: string;
  content: string;
  chapterNumber: number;
  genre: string;
}): Promise<{ score: number; issues: string[] }> {
  const { apiKey, content, chapterNumber, genre } = params

  const wordCount = countWords(content)
  
  // Basic score based on length
  let score = Math.min(10, (wordCount / TARGET_WORD_COUNT) * 8)
  const issues: string[] = []

  if (wordCount < MIN_WORD_COUNT) {
    issues.push('Chương quá ngắn')
    score = Math.max(3, score - 2)
  }

  // Quick AI check
  try {
    const prompt = `Đánh giá nhanh chương ${chapterNumber} (${genre}):
${content.substring(0, 2000)}...

Score 1-10 và issues nếu có. OUTPUT JSON:
{"score": 7, "issues": []}`

    const response = await fetch(
      `${GEMINI_API_BASE}/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 256 },
        }),
      }
    )

    if (response.ok) {
      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      try {
        let jsonStr = text.trim()
        if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/```json?|```/g, '')
        const parsed = JSON.parse(jsonStr.trim())
        score = (score + (parsed.score || 7)) / 2
        issues.push(...(parsed.issues || []))
      } catch {}
    }
  } catch {}

  return { score, issues }
}

// Rewrite chapter
async function rewriteChapter(params: {
  apiKey: string;
  content: string;
  issues: string[];
  authorPrompt: string;
}): Promise<{ success: boolean; content?: string }> {
  const { apiKey, content, issues, authorPrompt } = params

  const prompt = `REWRITE chương này:

${content.substring(0, 3000)}...

VẤN ĐỀ: ${issues.join(', ')}

YÊU CẦU:
- Sửa các vấn đề
- Giữ nguyên plot
- Tăng engagement

Viết lại đầy đủ:`

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 8192 },
          ...(authorPrompt && {
            systemInstruction: { parts: [{ text: authorPrompt }] },
          }),
        }),
      }
    )

    if (!response.ok) return { success: false }

    const data = await response.json()
    const newContent = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return { success: !!newContent, content: newContent }
  } catch {
    return { success: false }
  }
}

// Generate chapter summary
async function generateSummary(apiKey: string, content: string, chapterNumber: number): Promise<string> {
  try {
    const prompt = `Tóm tắt chương ${chapterNumber} trong 2-3 câu (sự kiện chính, thay đổi nhân vật):
${content.substring(0, 3000)}...`

    const response = await fetch(
      `${GEMINI_API_BASE}/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 256 },
        }),
      }
    )

    if (response.ok) {
      const data = await response.json()
      return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    }
  } catch {}
  return ''
}

// Helper functions
function extractTitleAndBody(content: string, chapterNumber: number): { title: string; body: string } {
  const lines = content.split('\n')
  let title = `Chương ${chapterNumber}`
  let bodyStartIndex = 0

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim()
    if (line.toLowerCase().includes(`chương ${chapterNumber}`) || line.toLowerCase().startsWith('chương ')) {
      const colonIndex = line.indexOf(':')
      if (colonIndex !== -1) {
        title = line.substring(colonIndex + 1).trim() || title
      } else {
        title = line
      }
      bodyStartIndex = i + 1
      break
    }
  }

  return { title, body: lines.slice(bodyStartIndex).join('\n').trim() }
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
