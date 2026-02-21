// Compliance Reminder Edge Function
// Sends email reminders for upcoming tax deadlines
// Schedule: Run daily via Supabase pg_cron or external cron

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Find tasks due within the next 7 days that haven't been completed
    const { data: upcomingTasks, error: tasksError } = await supabase
      .from("compliance_tasks")
      .select("*")
      .neq("status", "completed")
      .gte("due_date", now.toISOString().split("T")[0])
      .lte("due_date", sevenDaysFromNow.toISOString().split("T")[0]);

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      throw tasksError;
    }

    const results: { user_id: string; tasks_notified: number; urgency: string }[] = [];

    // Group tasks by user
    const tasksByUser = new Map<string, typeof upcomingTasks>();
    for (const task of upcomingTasks || []) {
      const userId = task.user_id;
      if (!tasksByUser.has(userId)) {
        tasksByUser.set(userId, []);
      }
      tasksByUser.get(userId)!.push(task);
    }

    // Send reminders per user
    for (const [userId, userTasks] of tasksByUser) {
      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      if (!userData?.user?.email) continue;

      const urgentTasks = userTasks.filter((t: any) => {
        const due = new Date(t.due_date);
        return due <= threeDaysFromNow;
      });

      const upcomingNonUrgent = userTasks.filter((t: any) => {
        const due = new Date(t.due_date);
        return due > threeDaysFromNow;
      });

      const urgency = urgentTasks.length > 0 ? "urgent" : "upcoming";

      // Format email body
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1a237e; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 20px;">🔔 Tax Compliance Reminder</h1>
            <p style="margin: 8px 0 0; opacity: 0.9;">Buoyance Tax Platform</p>
          </div>
          
          <div style="padding: 20px; background: #f5f5f5; border-radius: 0 0 8px 8px;">
            ${urgentTasks.length > 0 ? `
              <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <h2 style="color: #856404; margin: 0 0 8px;">⚠️ Urgent — Due within 3 days</h2>
                ${urgentTasks.map((t: any) => `
                  <div style="padding: 8px 0; border-bottom: 1px solid #ffeaa7;">
                    <strong>${t.title}</strong><br/>
                    <span style="color: #666; font-size: 13px;">Due: ${t.due_date} • ${t.regulator}</span>
                  </div>
                `).join("")}
              </div>
            ` : ""}
            
            ${upcomingNonUrgent.length > 0 ? `
              <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px;">
                <h2 style="color: #333; margin: 0 0 8px;">📅 Coming up this week</h2>
                ${upcomingNonUrgent.map((t: any) => `
                  <div style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                    <strong>${t.title}</strong><br/>
                    <span style="color: #666; font-size: 13px;">Due: ${t.due_date} • ${t.regulator}</span>
                  </div>
                `).join("")}
              </div>
            ` : ""}
            
            <div style="text-align: center; margin-top: 20px;">
              <a href="https://buoyance.app/compliance-calendar" 
                style="display: inline-block; background: #1a237e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                View Compliance Calendar →
              </a>
            </div>
          </div>
        </div>
      `;

      // Integrate with Resend for email delivery
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from: "Buoyance Compliance <compliance@buoyance.ng>",
            to: [userData.user.email],
            subject: urgency === "urgent" ? "⚠️ Urgent Tax Compliance Reminder" : "📅 Upcoming Tax Compliance Reminder",
            html: emailBody
          })
        });

        if (!resendRes.ok) {
          const errorData = await resendRes.text();
          console.error(`[Resend Error] Failed to send email to ${userData.user.email}:`, errorData);
        } else {
          console.log(`Successfully sent priority reminder email to ${userData.user.email}`);
        }
      } else {
        console.log(`[STUB] Reminder for ${userData.user.email}: ${userTasks.length} tasks (${urgency}). Need RESEND_API_KEY to send real email.`);
      }

      // Insert reminder record
      await supabase.from("task_reminders").insert({
        user_id: userId,
        task_id: userTasks[0]?.id || null,
        reminder_type: urgency === "urgent" ? "3_day" : "7_day",
        sent_at: new Date().toISOString(),
        email_body: emailBody,
      });

      results.push({
        user_id: userId,
        tasks_notified: userTasks.length,
        urgency,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        reminders_sent: results.length,
        details: results,
        checked_at: now.toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
