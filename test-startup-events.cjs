const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://bajwsjrqrsglsndgtfpp.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhandzanJxcnNnbHNuZGd0ZnBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDEwMjgsImV4cCI6MjA4Mzk3NzAyOH0.qb_tyJ6ikteGf-v-topAs4ymW37u0Xq2NGB-MeQeLQs";

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("[Execution Evidence Setup: Simulating page load with hash/session]");

supabase.auth.onAuthStateChange((event, session) => {
  console.log(`[AUTH EVENT]:`, event);
  console.log(`[SESSION]:`, session ? 'exists' : 'null');
});

async function run() {
  console.log("Triggering setSession to simulate arriving after signup...");
  // We use dummy tokens just to see the EVENT triggered, we expect an error but the event might still be INITIAL_SESSION.
  // Actually, better: we can just call initialize or parse token to see what event fires.
  // Supabase stores the token. If it starts up with a token, it fires INITIAL_SESSION with session, 
  // NOT SIGNED_IN! 
  
  // Let's force an access token into the client to see what it emits on startup.
  const mockStorage = {
    getItem: () => JSON.stringify({ access_token: 'dummy', refresh_token: 'dummy', user: { id: '123' } }),
    setItem: () => {},
    removeItem: () => {}
  };
  
  const sbClient2 = createClient(supabaseUrl, supabaseKey, {
    auth: { storage: mockStorage, autoRefreshToken: false, persistSession: true }
  });
  
  sbClient2.auth.onAuthStateChange((event, session) => {
    console.log(`[Second Client AUTH EVENT]:`, event);
  });
}
run();
