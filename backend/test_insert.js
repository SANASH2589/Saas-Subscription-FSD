const supabase = require('./src/supabaseAdmin');

async function testInsert() {
  const tenantId = 'e941aaf0-c01e-48b8-b07d-f9df534bbe1a'; // from logs
  const { data: plan } = await supabase.from('plans').select('id').eq('name', 'FREE').single();
  const planId = plan.id;
  
  console.log("Plan ID:", planId);
  
  const { data, error } = await supabase
    .from('subscriptions')
    .insert([{
      tenant_id: tenantId,
      external_user_id: 'test_direct_insert',
      plan_id: planId,
      status: 'ACTIVE'
    }])
    .select();
    
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success:", data);
  }
}

testInsert();
