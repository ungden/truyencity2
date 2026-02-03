// deno-lint-ignore-file

/**
 * Factory Publisher Edge Function
 * Publishes scheduled chapters and handles retry logic
 * 
 * Can be invoked:
 * - By factory-main-loop for batch publishing
 * - Directly for manual publish
 * - Via cron for scheduled publishing
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

interface PublishResult {
  published: number;
  failed: number;
  retried: number;
  errors: string[];
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const result: PublishResult = {
    published: 0,
    failed: 0,
    retried: 0,
    errors: [],
  }

  const startTime = Date.now()

  try {
    // Parse request
    const body = await req.json().catch(() => ({}))
    const action = body.action || 'publish_due'
    const chapterIds = body.chapter_ids as string[] | undefined
    const maxRetries = body.max_retries || 3

    // Log run start
    const { data: runLog } = await supabase
      .from('factory_run_log')
      .insert({
        run_type: 'publisher',
        status: 'running',
      })
      .select()
      .single()

    if (action === 'publish_specific' && chapterIds) {
      // Publish specific chapters
      for (const id of chapterIds) {
        const publishResult = await publishChapter(supabase, id)
        if (publishResult.success) {
          result.published++
        } else {
          result.failed++
          result.errors.push(publishResult.error || 'Unknown error')
        }
      }
    } else if (action === 'retry_failed') {
      // Retry failed publishes
      const { data: failedItems } = await supabase
        .from('chapter_publish_queue')
        .select('*')
        .eq('status', 'failed')
        .lt('retry_count', maxRetries)

      for (const item of failedItems || []) {
        // Reset status to scheduled
        await supabase
          .from('chapter_publish_queue')
          .update({
            status: 'scheduled',
            error_message: null,
          })
          .eq('id', item.id)

        const publishResult = await publishChapter(supabase, item.id)
        if (publishResult.success) {
          result.retried++
          result.published++
        } else {
          result.failed++
          result.errors.push(`Retry ${item.id}: ${publishResult.error}`)
        }
      }
    } else {
      // Default: publish all due chapters
      const now = new Date().toISOString()
      const { data: dueItems } = await supabase
        .from('chapter_publish_queue')
        .select('*')
        .eq('status', 'scheduled')
        .lte('scheduled_time', now)
        .order('scheduled_time', { ascending: true })
        .limit(200)

      for (const item of dueItems || []) {
        try {
          // Mark as publishing
          await supabase
            .from('chapter_publish_queue')
            .update({ status: 'publishing' })
            .eq('id', item.id)

          const publishResult = await publishChapter(supabase, item.id)
          
          if (publishResult.success) {
            result.published++
          } else {
            result.failed++
            result.errors.push(`${item.id}: ${publishResult.error}`)

            // Mark as failed
            await supabase
              .from('chapter_publish_queue')
              .update({
                status: 'failed',
                error_message: publishResult.error,
                retry_count: (item.retry_count || 0) + 1,
              })
              .eq('id', item.id)
          }
        } catch (e) {
          result.failed++
          result.errors.push(`${item.id}: ${e}`)

          await supabase
            .from('chapter_publish_queue')
            .update({
              status: 'failed',
              error_message: String(e),
              retry_count: (item.retry_count || 0) + 1,
            })
            .eq('id', item.id)
        }
      }
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
          items_processed: result.published,
        })
        .eq('id', runLog.id)
    }

    // Log errors if significant
    if (result.failed > 5) {
      await supabase.from('factory_errors').insert({
        error_type: 'publish_failure',
        error_message: `Publisher had ${result.failed} failures`,
        error_details: { errors: result.errors.slice(0, 10) },
        severity: 'warning',
        requires_attention: true,
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
    await supabase.from('factory_errors').insert({
      error_type: 'system_error',
      error_message: `Publisher failed: ${e}`,
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

// Publish a single chapter
async function publishChapter(
  supabase: any,
  queueItemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get queue item
    const { data: queueItem, error: fetchError } = await supabase
      .from('chapter_publish_queue')
      .select('*')
      .eq('id', queueItemId)
      .single()

    if (fetchError || !queueItem) {
      return { success: false, error: 'Queue item not found' }
    }

    // Update chapter status to published
    const { error: chapterError } = await supabase
      .from('chapters')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', queueItem.chapter_id)

    if (chapterError) {
      return { success: false, error: `Chapter update failed: ${chapterError.message}` }
    }

    // Update queue item
    const { error: queueError } = await supabase
      .from('chapter_publish_queue')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', queueItemId)

    if (queueError) {
      return { success: false, error: `Queue update failed: ${queueError.message}` }
    }

    // Update novel's updated_at timestamp
    const { data: chapter } = await supabase
      .from('chapters')
      .select('novel_id')
      .eq('id', queueItem.chapter_id)
      .single()

    if (chapter) {
      await supabase
        .from('novels')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chapter.novel_id)

      // Optionally trigger notifications (if notify-new-chapter function exists)
      // await supabase.functions.invoke('notify-new-chapter', {
      //   body: { novel_id: chapter.novel_id, chapter_id: queueItem.chapter_id }
      // })
    }

    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
