const supabase = require('./src/supabaseAdmin');

async function testMutation() {
  const token = process.argv[2]; // pass a token
  
  if (token) {
    console.log("Calling getUser with token...");
    await supabase.auth.getUser(token);
  }
  
  const tenantId = 'e941aaf0-c01e-48b8-b07d-f9df534bbe1a';
  const { data: plan } = await supabase.from('plans').select('id').eq('name', 'FREE').single();
  const planId = plan.id;
  const externalUserId = 'test_mutation_' + Date.now();
  
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);
  
  const { data, error } = await supabase
    .from('subscriptions')
    .insert([{
      tenant_id: tenantId,
      external_user_id: externalUserId,
      plan_id: planId,
      status: 'ACTIVE',
      start_date: new Date().toISOString(),
      end_date: endDate.toISOString()
    }])
    .select('*, plans(id, name, description, price, interval, feature_limits)')
    .single();
    
  if (error) {
    console.error("Error:", JSON.stringify(error));
  } else {
    console.log("Success:", data.id);
  }
}

testMutation();
