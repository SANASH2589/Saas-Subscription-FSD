const supabase = require('./src/supabaseAdmin');

async function testUpdate() {
  const tenantId = 'e941aaf0-c01e-48b8-b07d-f9df534bbe1a';
  
  const query = supabase
    .from('subscriptions')
    .update({ status: 'CANCELLED' })
    .eq('tenant_id', tenantId)
    .eq('status', 'ACTIVE');

  const { data, error } = await query;
    
  if (error) {
    console.error("Error:", JSON.stringify(error));
  } else {
    console.log("Success update!");
  }
}

testUpdate();
