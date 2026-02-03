// deno-lint-ignore-file

// @ts-ignore - Deno std import is valid at Edge runtime, not in local TS checker
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
// @ts-ignore - ESM import is valid at Edge runtime, not in local TS checker
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

// Allow TypeScript to compile in Node project context
declare const Deno: {
  env: { get(name: string): string | undefined }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase credentials' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    if (req.method === 'POST') {
      const { action, chapterId, userId } = await req.json()

      if (action === 'check_permissions') {
        // Kiểm tra user role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single()

        if (profileError) {
          return new Response(JSON.stringify({ 
            error: 'Profile error', 
            details: profileError 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return new Response(JSON.stringify({ 
          success: true, 
          userRole: profile?.role,
          isAdmin: profile?.role === 'admin'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (action === 'check_references') {
        // Kiểm tra các bảng tham chiếu đến chapter
        const [progressRes, readsRes, sessionsRes, commentsRes] = await Promise.all([
          supabase.from('reading_progress').select('*', { count: 'exact', head: true }).eq('chapter_id', chapterId),
          supabase.from('chapter_reads').select('*', { count: 'exact', head: true }).eq('chapter_id', chapterId),
          supabase.from('reading_sessions').select('*', { count: 'exact', head: true }).eq('chapter_id', chapterId),
          supabase.from('comments').select('*', { count: 'exact', head: true }).eq('chapter_id', chapterId)
        ])

        return new Response(JSON.stringify({
          success: true,
          references: {
            reading_progress: progressRes.count || 0,
            chapter_reads: readsRes.count || 0,
            reading_sessions: sessionsRes.count || 0,
            comments: commentsRes.count || 0
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (action === 'force_delete') {
        // Get chapter info first
        const { data: chapterInfo } = await supabase
          .from('chapters')
          .select('novel_id, chapter_number')
          .eq('id', chapterId)
          .single()

        if (!chapterInfo) {
          return new Response(JSON.stringify({ 
            error: 'Chapter not found' 
          }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Xóa tất cả references trước
        await Promise.all([
          supabase.from('reading_progress').delete().eq('chapter_id', chapterId),
          supabase.from('chapter_reads').delete().eq('chapter_id', chapterId),
          supabase.from('reading_sessions').delete().eq('chapter_id', chapterId),
          supabase.from('comments').delete().eq('chapter_id', chapterId),
        ])

        // Xóa chương
        const { error: deleteError } = await supabase
          .from('chapters')
          .delete()
          .eq('id', chapterId)

        if (deleteError) {
          return new Response(JSON.stringify({ 
            error: 'Delete failed', 
            details: deleteError 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Update AI projects: recalculate current_chapter based on remaining chapters
        const { data: remainingChapters } = await supabase
          .from('chapters')
          .select('chapter_number')
          .eq('novel_id', chapterInfo.novel_id)
          .order('chapter_number', { ascending: false })
          .limit(1)

        const maxChapterNumber = remainingChapters?.[0]?.chapter_number || 0

        // Update all AI projects for this novel
        await supabase
          .from('ai_story_projects')
          .update({ 
            current_chapter: maxChapterNumber,
            updated_at: new Date().toISOString()
          })
          .eq('novel_id', chapterInfo.novel_id)

        // Clean up story graph nodes for deleted chapter
        const { data: projects } = await supabase
          .from('ai_story_projects')
          .select('id')
          .eq('novel_id', chapterInfo.novel_id)

        if (projects && projects.length > 0) {
          const projectIds = projects.map((p: any) => p.id)
          
          await supabase
            .from('story_graph_nodes')
            .delete()
            .eq('chapter_number', chapterInfo.chapter_number)
            .in('project_id', projectIds)

          // Clean up story graph edges
          await supabase
            .from('story_graph_edges')
            .delete()
            .or(`from_chapter.eq.${chapterInfo.chapter_number},to_chapter.eq.${chapterInfo.chapter_number}`)
            .in('project_id', projectIds)
        }

        return new Response(JSON.stringify({ 
          success: true,
          message: `Đã xóa chương ${chapterInfo.chapter_number} và cập nhật AI projects`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    return new Response(JSON.stringify({ 
      error: e instanceof Error ? e.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})