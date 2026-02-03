import { NextRequest, NextResponse } from "next/server";
import { createSupabaseFromAuthHeader } from "@/integrations/supabase/auth-helpers";

function parseTimeToNextRun(timeOfDay?: string) {
  const now = new Date();
  if (!timeOfDay) return new Date(now.getTime() + 5 * 60 * 1000); // mặc định 5 phút nữa

  const [h, m] = timeOfDay.split(":").map((v) => parseInt(v, 10) || 0);
  const next = new Date();
  // Lưu ý: dùng UTC để khớp Edge Function
  next.setUTCHours(h, m, 0, 0);
  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}

export async function GET(request: NextRequest) {
  const { client, token } = createSupabaseFromAuthHeader(request);
  if (!client || !token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await client
    .from("ai_writing_schedules")
    .select(`
      *,
      project:ai_story_projects(id, novel_id, genre, status, current_chapter, novel:novels(id, title, author))
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedules: data || [] });
}

export async function POST(request: NextRequest) {
  const { client, token } = createSupabaseFromAuthHeader(request);
  if (!client || !token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const {
    projectId,
    timeOfDay,            // "HH:MM" UTC
    chaptersPerRun = 1,
    startNow = false
  } = body || {};

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  // Kiểm tra quyền sở hữu project
  const { data: project, error: pErr } = await client
    .from("ai_story_projects")
    .select("id, user_id, status")
    .eq("id", projectId)
    .single();
  if (pErr || !project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (project.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const nextRunAt = startNow ? new Date() : parseTimeToNextRun(timeOfDay);

  const { data, error } = await client
    .from("ai_writing_schedules")
    .insert({
      user_id: user.id,
      project_id: projectId,
      frequency: "daily",
      
      time_of_day: timeOfDay ? `${timeOfDay}:00` : null,
      chapters_per_run: Math.max(1, Number(chaptersPerRun) || 1),
      next_run_at: nextRunAt.toISOString(),
      status: "active"
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedule: data });
}