const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://bajwsjrqrsglsndgtfpp.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhandzanJxcnNnbHNuZGd0ZnBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDEwMjgsImV4cCI6MjA4Mzk3NzAyOH0.qb_tyJ6ikteGf-v-topAs4ymW37u0Xq2NGB-MeQeLQs";

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Setting up listener...");
supabase.auth.onAuthStateChange((event, session) => {
  console.log(`[AUTH EVENT CAUGHT] ${event}`);
  console.log(`[SESSION USER] ${session?.user?.email || 'null'}`);
});

async function runTest() {
  const testEmail = `testuser${Date.now()}@gmail.com`;
  const password = "password123";

  console.log(`Starting sign up for ${testEmail}...`);
  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: password,
  });

  if (error) {
    console.error("Signup error:", error.message);
  } else {
    console.log("Signup success payload session:", JSON.stringify(data.session, null, 2));
    console.log("Signup success payload user:", JSON.stringify(data.user, null, 2));
  }

  // wait 2s to allow events to process
  await new Promise(r => setTimeout(r, 2000));
  process.exit(0);
}

runTest();
