require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('plan_features').select('*').limit(1);
  console.log("plan_features:", error ? error.message : data);
}
check();
