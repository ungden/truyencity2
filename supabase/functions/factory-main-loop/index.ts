// deno-lint-ignore-file

/**
 * Factory Main Loop Edge Function
 * Runs every 5-10 minutes via cron or manual trigger
 * 
 * Responsibilities:
 * - Schedule chapters for active productions
 * - Trigger chapter writing workers
 * - Publish due chapters
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

interface RunResult {
  chaptersScheduled: number;
  chaptersWriteTriggered: number;
  chaptersPublished: number;
  errors: string[];
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const result: RunResult = {
    chaptersScheduled: 0,
    chaptersWriteTriggered: 0,
    chaptersPublished: 0,
    errors: [],
  }

  const startTime = Date.now()

  try {
    // 1. Check if factory is running
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

    // 2. Log run start
    const { data: runLog } = await supabase
      .from('factory_run_log')
      .insert({
        run_type: 'main_loop',
        status: 'running',
      })
      .select()
      .single()

    // 3. Get active productions needing chapters today
    const today = new Date().toISOString().split('T')[0]
    const { data: productions } = await supabase
      .from('production_queue')
      .select('*')
      .eq('status', 'active')
      .or(`last_write_date.is.null,last_write_date.neq.${today}`)
      .order('priority', { ascending: false })
      .limit(100)

    // 4. Schedule chapters for each production
    for (const prod of productions || []) {
      try {
        const isNewDay = prod.last_write_date !== today
        const chaptersToSchedule = isNewDay
          ? prod.chapters_per_day
          : prod.chapters_per_day - (prod.chapters_written_today || 0)

        if (chaptersToSchedule <= 0) continue
        if (prod.current_chapter >= (prod.total_chapters || Infinity)) continue

        // Check if chapters already scheduled
        const { count: existingCount } = await supabase
          .from('chapter_write_queue')
          .select('*', { count: 'exact', head: true })
          .eq('production_id', prod.id)
          .in('status', ['pending', 'writing'])

        if ((existingCount || 0) >= chaptersToSchedule) continue

        // Schedule new chapters
        const toSchedule = chaptersToSchedule - (existingCount || 0)
        const scheduleItems = []
        let chapterNum = prod.current_chapter + (existingCount || 0) + 1

        for (let i = 0; i < toSchedule; i++) {
          const slotIndex = i % 3
          const slot = ['morning', 'afternoon', 'evening'][slotIndex]
          
          scheduleItems.push({
            production_id: prod.id,
            chapter_number: chapterNum,
            arc_number: Math.ceil(chapterNum / 200),
            status: 'pending',
            attempt_count: 0,
            previous_summary: prod.last_chapter_summary,
            tension_target: calculateTensionTarget(chapterNum, prod.total_chapters),
            scheduled_slot: slot,
            scheduled_time: getScheduledTime(slot),
          })
          chapterNum++
        }

        if (scheduleItems.length > 0) {
          const { error } = await supabase
            .from('chapter_write_queue')
            .insert(scheduleItems)

          if (!error) {
            result.chaptersScheduled += scheduleItems.length
          } else {
            result.errors.push(`Schedule error for ${prod.id}: ${error.message}`)
          }
        }
      } catch (e) {
        result.errors.push(`Production ${prod.id}: ${e}`)
      }
    }

    // 5. Trigger writer workers for pending chapters
    const { data: pendingChapters } = await supabase
      .from('chapter_write_queue')
      .select('id')
      .eq('status', 'pending')
      .order('scheduled_time', { ascending: true })
      .limit(20)

    if (pendingChapters && pendingChapters.length > 0) {
      // Invoke writer worker for each batch
      // In production, this would call the factory-writer-worker function
      result.chaptersWriteTriggered = pendingChapters.length

      // Mark as queued for writing (the writer worker will pick them up)
      // For now, just count them - actual writing happens in factory-writer-worker
    }

    // 6. Publish due chapters
    const now = new Date().toISOString()
    const { data: duePublishes } = await supabase
      .from('chapter_publish_queue')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_time', now)
      .limit(100)

    for (const pub of duePublishes || []) {
      try {
        // Update chapter to published
        const { error: chapterError } = await supabase
          .from('chapters')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
          })
          .eq('id', pub.chapter_id)

        if (chapterError) {
          throw new Error(chapterError.message)
        }

        // Update publish queue
        await supabase
          .from('chapter_publish_queue')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
          })
          .eq('id', pub.id)

        // Update novel timestamp
        const { data: chapter } = await supabase
          .from('chapters')
          .select('novel_id')
          .eq('id', pub.chapter_id)
          .single()

        if (chapter) {
          await supabase
            .from('novels')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', chapter.novel_id)
        }

        result.chaptersPublished++
      } catch (e) {
        result.errors.push(`Publish ${pub.id}: ${e}`)

        await supabase
          .from('chapter_publish_queue')
          .update({
            status: 'failed',
            error_message: String(e),
            retry_count: (pub.retry_count || 0) + 1,
          })
          .eq('id', pub.id)
      }
    }

    // 7. Log run completion
    const duration = Math.floor((Date.now() - startTime) / 1000)
    if (runLog) {
      await supabase
        .from('factory_run_log')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_seconds: duration,
          results: result,
          items_processed: result.chaptersScheduled + result.chaptersPublished,
        })
        .eq('id', runLog.id)
    }

    // 8. Log errors if any
    if (result.errors.length > 0) {
      await supabase.from('factory_errors').insert({
        error_type: 'system_error',
        error_message: `Main loop errors: ${result.errors.length} errors`,
        error_details: { errors: result.errors },
        severity: 'warning',
        requires_attention: result.errors.length > 5,
      })
    }

    return new Response(JSON.stringify({
      success: true,
      result,
      duration_seconds: duration,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    // Log critical error
    await supabase.from('factory_errors').insert({
      error_type: 'system_error',
      error_message: `Main loop failed: ${e}`,
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
function calculateTensionTarget(chapterNumber: number, totalChapters: number): number {
  const progress = chapterNumber / (totalChapters || 1500)
  const baseWave = Math.sin(chapterNumber * 0.05) * 30
  const progressBonus = progress * 30
  const randomVariation = Math.random() * 20 - 10
  return Math.max(10, Math.min(100, Math.floor(40 + baseWave + progressBonus + randomVariation)))
}

function getScheduledTime(slot: string): string {
  const now = new Date()
  const vietnamOffset = 7 * 60 * 60 * 1000
  const vietnamNow = new Date(now.getTime() + vietnamOffset)

  const slotHours: Record<string, [number, number]> = {
    morning: [6, 10],
    afternoon: [12, 14],
    evening: [18, 22],
  }

  const [startHour, endHour] = slotHours[slot] || [18, 22]
  const scheduled = new Date(vietnamNow)
  scheduled.setHours(startHour + Math.floor(Math.random() * (endHour - startHour)), Math.floor(Math.random() * 60), 0, 0)

  // If past, move to tomorrow
  if (scheduled <= vietnamNow) {
    scheduled.setDate(scheduled.getDate() + 1)
  }

  return new Date(scheduled.getTime() - vietnamOffset).toISOString()
}
