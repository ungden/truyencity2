// @ts-nocheck
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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const { novelId, chapterId, chapterNumber, chapterTitle } = await req.json()

    if (!novelId || !chapterId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Get novel info
    const { data: novel, error: novelError } = await supabase
      .from("novels")
      .select("title, author")
      .eq("id", novelId)
      .single()

    if (novelError || !novel) {
      return new Response(JSON.stringify({ error: "Novel not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Get users who bookmarked this novel
    const { data: bookmarks } = await supabase
      .from("bookmarks")
      .select("user_id")
      .eq("novel_id", novelId)

    const targetUsers = (bookmarks || []).map((b: any) => b.user_id)

    // Create notification
    const { data: notification, error: notifError } = await supabase
      .from("notifications")
      .insert({
        title: `Chương mới: ${novel.title}`,
        message: `${chapterTitle || `Chương ${chapterNumber}`} đã được cập nhật!`,
        type: "chapter",
        novel_id: novelId,
        chapter_id: chapterId,
        target_users: targetUsers.length > 0 ? targetUsers : null,
        status: "pending"
      })
      .select("id")
      .single()

    if (notifError || !notification) {
      return new Response(JSON.stringify({ error: "Failed to create notification" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Create user_notifications for each target user
    if (targetUsers.length > 0) {
      const userNotifications = targetUsers.map((userId: string) => ({
        user_id: userId,
        notification_id: notification.id
      }))

      const { error: insertError } = await supabase
        .from("user_notifications")
        .insert(userNotifications)

      if (insertError) {
        console.error("Error creating user notifications:", insertError)
      }

      // Update notification status
      await supabase
        .from("notifications")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          sent_count: targetUsers.length,
          total_recipients: targetUsers.length
        })
        .eq("id", notification.id)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      notificationId: notification.id,
      recipientCount: targetUsers.length 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (e) {
    return new Response(JSON.stringify({ 
      error: e instanceof Error ? e.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})