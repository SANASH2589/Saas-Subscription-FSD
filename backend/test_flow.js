const API_BASE = 'http://localhost:8080/api';

async function request(path, method = 'GET', body = null, headers = {}) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  };
  if (body) options.body = JSON.stringify(body);
  
  const res = await fetch(`${API_BASE}${path}`, options);
  const data = await res.json().catch(() => null);
  
  if (!res.ok) throw new Error(data ? JSON.stringify(data) : res.statusText);
  return data;
}

async function testFlow() {
  try {
    console.log("=== 1. Register Tenant ===");
    const tenantSignup = await request('/auth/tenant/signup', 'POST', {
      email: `tenant_${Date.now()}@test.com`,
      password: 'password123',
      full_name: 'Test Tenant Admin',
      company_name: `TestCorp ${Date.now()}`
    });
    console.log("Tenant Registered!", tenantSignup.user.email);
    
    const jwt = tenantSignup.session.access_token;
    const apiKey = tenantSignup.api_key;
    console.log("API Key:", apiKey);

    console.log("\n=== 2. List Plans ===");
    const plans = await request('/tenant/plans', 'GET', null, { Authorization: `Bearer ${jwt}` });
    console.log("Plans found:", plans.map(p => p.name).join(', '));
    const freePlan = plans.find(p => p.name === 'FREE');

    if (!freePlan) {
      console.log("FREE plan not found, creating one for testing...");
      // In a real scenario, this is a super admin task, but we'll assume it exists or fail cleanly.
      throw new Error("FREE Plan missing from database. Please run seed script.");
    }

    console.log("\n=== 3. List Features ===");
    const features = await request('/tenant/features', 'GET', null, { Authorization: `Bearer ${jwt}` });
    console.log("Features found:", features.map(f => f.code).join(', '));
    const featureCode = features[0]?.code || 'EXPORT_PDF';

    console.log("\n=== 4. Subscribe External User ===");
    const extUserId = `user_${Date.now()}`;
    const subRes = await request('/tenant/subscriptions', 'POST', {
      plan_id: freePlan.id,
      external_user_id: extUserId
    }, { Authorization: `Bearer ${jwt}` });
    console.log("Subscribed User:", subRes.external_user_id);

    console.log("\n=== 5. Check Entitlement ===");
    const checkRes1 = await request('/v1/entitlement/check-access', 'POST', {
      featureCode: featureCode,
      external_user_id: extUserId
    }, { 'x-api-key': apiKey });
    console.log("Access Result 1:", checkRes1);

    console.log("\n=== 6. Track Usage ===");
    const trackRes = await request('/v1/usage/track', 'POST', {
      featureCode: featureCode,
      external_user_id: extUserId,
      count: 2
    }, { 'x-api-key': apiKey });
    console.log("Track Result:", trackRes);

    console.log("\n=== 7. Check Entitlement Again ===");
    const checkRes2 = await request('/v1/entitlement/check-access', 'POST', {
      featureCode: featureCode,
      external_user_id: extUserId
    }, { 'x-api-key': apiKey });
    console.log("Access Result 2:", checkRes2);

    console.log("\n=== 8. Check Analytics in Dashboard ===");
    const usageRes = await request('/tenant/usage', 'GET', null, { Authorization: `Bearer ${jwt}` });
    console.log("Dashboard Usage By Feature:", usageRes.byFeature);
    console.log("Dashboard Usage By User:", usageRes.byUser);

    console.log("\n✅ ALL TESTS PASSED!");
  } catch (err) {
    console.error("❌ TEST FAILED:", err.message);
  }
}

testFlow();
