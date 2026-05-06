const supabase = require('./src/supabaseAdmin');

async function testInsert() {
  const tenantId = 'e941aaf0-c01e-48b8-b07d-f9df534bbe1a';
  const { data: plan } = await supabase.from('plans').select('id').eq('name', 'FREE').single();
  const planId = plan.id;
  const externalUserId = 'test_direct_insert_2';
  
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

testInsert();
