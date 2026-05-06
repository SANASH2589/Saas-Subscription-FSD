const { subscribeToPlan } = require('./src/services/subscriptionService');

async function testFull() {
  const tenantId = '2c53bdaa-58dd-499f-b661-5e7511fec106'; // from latest logs
  const planId = 'd3c4c5f9-2dfa-4468-909f-98d0cf72695d'; // FREE plan ID
  
  try {
    const res = await subscribeToPlan(tenantId, planId, 'user_12345');
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", JSON.stringify(err));
  }
}

testFull();
