/* deno-lint-ignore-file */
// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

declare const Deno: {
  env: { get(name: string): string | undefined }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!

const openrouterFnUrl = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/openrouter-chat`

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

async function generateSystemPrompt(genre: string, authorName?: string): Promise<string> {
  const persona = authorName ? `Bạn đang nhập vai bút danh "${authorName}".\n\n` : ""
  const parallelWorldNote = "Bối cảnh truyện là thế giới song song hư cấu; không dùng tên có thật."
  const noMarkdown = "Chỉ trả về văn bản thuần, không markdown."
  const flexibility = "Bảo đảm tiến bậc sức mạnh rõ ràng theo thời gian. Nếu không có hệ tu luyện cố định, tránh dùng các tên rập khuôn như 'Luyện Khí/Trúc Cơ/Kim Đan/...'; hãy đặt hệ độc đáo, nhất quán."
  const base = genre === "tien-hiep"
    ? "Bạn là tác giả webnovel tu tiên chuyên nghiệp. Văn phong sinh động, nhiều hội thoại, miêu tả chi tiết. Viết tiếng Việt."
    : "Bạn là tác giả webnovel chuyên nghiệp. Văn phong sinh động, nhiều hội thoại, miêu tả chi tiết. Viết tiếng Việt."
  return `${persona}${base}\n\n${parallelWorldNote}\n${flexibility}\n${noMarkdown}`
}

function buildPrompt(project: any, chapterNumber: number) {
  const title = project?.novel?.title || "Truyện chưa có tên"
  const world = project?.world_description || "Thế giới truyện"
  const target = project?.target_chapter_length || 2500
  const mainChar = project?.main_character || "Nhân vật chính"

  const earlyRule = chapterNumber <= 3
    ? "\n- QUY TẮC CHƯƠNG ĐẦU: Trong 3 chương đầu, để nhân vật chính chủ động (qua hành động/hội thoại) giới thiệu bối cảnh, luật lệ, hệ thống sức mạnh; trình bày tự nhiên, súc tích (tránh info dump)."
    : ""

  const systemRule =
    project.genre === "tien-hiep"
      ? (project.cultivation_system && String(project.cultivation_system).trim().length > 0
          ? `\n- HỆ SỨC MẠNH: Dùng hệ tu luyện đã chỉ định: ${project.cultivation_system}. Thể hiện tiến bậc rõ ràng; 'đột phá' phải gắn mốc cốt truyện.`
          : "\n- HỆ SỨC MẠNH: Tự thiết kế hệ tu luyện độc đáo; tránh dùng tên rập khuôn như 'Luyện Khí/Trúc Cơ/Kim Đan/...'; bảo đảm tiến bậc rõ ràng.")
      : "\n- HỆ SỨC MẠNH: Bảo đảm có tiến bậc tăng trưởng sức mạnh (level up) rõ ràng theo thời gian."

  return `Hãy viết chương ${chapterNumber} cho truyện "${title}".
- Thể loại: ${project.genre}
- Nhân vật chính: ${mainChar}
- Bối cảnh: ${world}
- Độ dài mục tiêu: khoảng ${target} từ
- Phong cách webnovel hiện đại, nhiều hội thoại.${earlyRule}${systemRule}
- Đặt tiêu đề ở đầu theo định dạng: "Chương ${chapterNumber}: [Tiêu đề]"

Chỉ trả về nội dung chương (văn bản thuần, không Markdown).`
}

async function callOpenRouter(model: string, temperature: number, messages: any[]) {
  const r = await fetch(openrouterFnUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY
    },
    body: JSON.stringify({ model, temperature, max_tokens: 8000, messages })
  })
  if (!r.ok) {
    const t = await r.text().catch(() => "")
    throw new Error(`OpenRouter call failed: ${r.status} ${t.slice(0, 200)}`)
  }
  const data = await r.json()
  const content = data?.choices?.[0]?.message?.content as string | undefined
  if (!content) throw new Error("No content from OpenRouter")
  return (content as string).trim()
}

async function writeOneChapter(supabase: any, schedule: any, project: any) {
  // Tính số chương kế tiếp an toàn
  const { data: maxRow } = await supabase
    .from("chapters")
    .select("chapter_number")
    .eq("novel_id", project.novel_id)
    .order("chapter_number", { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextChapter = (maxRow?.chapter_number || 0) + 1
  const sysPrompt = await generateSystemPrompt(project.genre, project?.novel?.author)
  const userPrompt = buildPrompt(project, nextChapter)

  const content = await callOpenRouter(
    project.ai_model || "openai/gpt-4o-mini",
    typeof project.temperature === "number" ? project.temperature : 0.7,
    [
      { role: "system", content: sysPrompt },
      { role: "user", content: userPrompt }
    ]
  )

  // Lấy tiêu đề dòng đầu (nếu có)
  let title = `Chương ${nextChapter}`
  const firstLine = content.split("\n").find((l: string) => l.trim().length > 0) || ""
  const m = firstLine.match(/^Chương\s+\d+:\s*(.+)$/i)
  if (m && m[1]) title = `Chương ${nextChapter}: ${m[1].trim()}`

  const { data: newChapter, error: insertErr } = await supabase
    .from("chapters")
    .insert({
      novel_id: project.novel_id,
      chapter_number: nextChapter,
      title,
      content
    })
    .select("id")
    .single()
  if (insertErr) throw insertErr

  // Cập nhật tiến độ dự án
  await supabase
    .from("ai_story_projects")
    .update({ current_chapter: nextChapter, updated_at: new Date().toISOString() })
    .eq("id", project.id)

  return newChapter?.id as string
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Cho phép gọi thủ công bằng POST; GET để health check
    if (req.method === "GET") {
      return new Response(JSON.stringify({ ok: true, message: "ai-writer-scheduler alive" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const nowIso = new Date().toISOString()

    // Tìm lịch đến hạn
    const { data: dueSchedules, error: scheduleErr } = await supabase
      .from("ai_writing_schedules")
      .select("*")
      .eq("status", "active")
      .lte("next_run_at", nowIso)
      .order("next_run_at", { ascending: true })
      .limit(20)

    if (scheduleErr) {
      return new Response(JSON.stringify({ error: scheduleErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    if (!dueSchedules || dueSchedules.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    let totalChapters = 0
    const results: any[] = []

    for (const s of dueSchedules) {
      // Lấy project + novel cho prompt
      const { data: project, error: pErr } = await supabase
        .from("ai_story_projects")
        .select("*, novel:novels(id, title, author)")
        .eq("id", s.project_id)
        .single()
      if (pErr || !project || project.status !== "active") {
        // Lùi lịch ngày hôm sau nếu project không hợp lệ để tránh kẹt
        const nextRun = addDays(new Date(), 1)
        await supabase
          .from("ai_writing_schedules")
          .update({ next_run_at: nextRun.toISOString(), last_run_at: new Date().toISOString() })
          .eq("id", s.id)
        continue
      }

      const count = Math.max(1, Number(s.chapters_per_run) || 1)
      let written = 0

      for (let i = 0; i < count; i++) {
        try {
          await writeOneChapter(supabase, s, project)
          written += 1
          totalChapters += 1
        } catch (e) {
          // Ghi log và tiếp tục các schedule khác
          // console.error("Write failed:", e)
          break
        }
      }

      // Tính next_run_at cho 'daily' theo time_of_day (UTC). Nếu không có time_of_day, +1 ngày.
      let nextRun = addDays(new Date(), 1)
      if (s.time_of_day) {
        const [hh, mm, ss] = String(s.time_of_day).split(":").map((v: string) => parseInt(v, 10) || 0)
        nextRun.setUTCHours(hh, mm, ss || 0, 0)
        if (nextRun < new Date()) {
          nextRun = addDays(nextRun, 1)
        }
      }

      await supabase
        .from("ai_writing_schedules")
        .update({
          last_run_at: new Date().toISOString(),
          next_run_at: nextRun.toISOString()
        })
        .eq("id", s.id)

      results.push({ scheduleId: s.id, written })
    }

    return new Response(JSON.stringify({ ok: true, processed: dueSchedules.length, chaptersCreated: totalChapters, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})