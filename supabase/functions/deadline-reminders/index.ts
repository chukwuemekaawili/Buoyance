import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Deno Edge Function: `deadline-reminders`
// Triggered nightly via pg_cron to scan `filing_events` and blast email/SMS notifications 
// for upcoming NTA 2025 compliance deadlines.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    // 1. Calculate target window (events exactly 3 days away)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 3);
    const targetDayStr = targetDate.toISOString().split('T')[0];

    console.log(`[Deadline Watchdog] Scanning for filings due on: ${targetDayStr}`);

    // 2. Query upcoming unfulfilled deadlines
    const { data: events, error } = await supabase
      .from('filing_events')
      .select(`
        id,
        title,
        deadline,
        tax_type,
        workspace_id,
        organizations (
          id,
          name,
          workspace_users!inner (
            user_id,
            role,
            profiles (
              display_name,
              email,
              phone
            )
          )
        )
      `)
      .eq('status', 'pending')
      .eq('deadline', targetDayStr);

    if (error) {
      throw error;
    }

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ message: "No deadlines approaching in the 3-day window." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`Found ${events.length} deadlines requiring notification.`);

    const notificationsSent = [];

    // 3. Blast Alerts
    for (const event of events) {
      const org = event.organizations;
      // Alert Owners and Admins only
      const targetUsers = org.workspace_users.filter((wu: any) => wu.role === 'Owner' || wu.role === 'Admin');

      for (const wu of targetUsers) {
        const profile = wu.profiles;

        // Mocking the external SMS / Resend.com email blast
        console.log(`[BLAST] Sending SMS/Email to ${profile.email} (${profile.phone}) for ${event.tax_type} due on ${event.deadline}.`);

        // Log the internal application notification
        await supabase.from('notifications').insert({
          user_id: wu.user_id,
          title: `🚨 Upcoming Deadline: ${event.title}`,
          message: `Your ${event.tax_type} filing for ${org.name} is due in exactly 3 days. Prepare your calculations now to avoid FIRS penalties.`,
          type: 'warning',
          link: '/filings/new',
          read: false
        });

        notificationsSent.push({
          user: profile.email,
          org: org.name,
          event: event.title
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      blasted: notificationsSent.length,
      details: notificationsSent
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    console.error("Cron Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
