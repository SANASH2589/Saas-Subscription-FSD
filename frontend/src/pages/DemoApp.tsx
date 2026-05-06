import { useState, useEffect, useRef } from 'react';
import {
  CheckCircle, XCircle, Loader2, Zap, FileText, BarChart3,
  CreditCard, User, Terminal, ArrowRight, ShieldCheck,
  Server, Activity, LayoutTemplate
} from 'lucide-react';

const API_BASE = 'http://localhost:8080/api';
const DEMO_USERS = ['user_alice', 'user_bob', 'user_charlie'];

// --- Types ---
interface Plan { id: string; name: string; price: number; }
interface CheckResult {
  success: boolean; allowed: boolean; feature: string;
  plan: string; used: number; limit: number; remaining: number; reason?: string;
}
interface Sub {
  id: string; status: string; plan_name: string; end_date: string;
}
interface ApiLog {
  id: string; time: string; endpoint: string; method: string;
  status: 'pending' | 'success' | 'error';
  request: any; response?: any;
}

export default function DemoApp() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('demo_api_key') || '');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [selectedUser, setSelectedUser] = useState(DEMO_USERS[0]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [subscription, setSubscription] = useState<Sub | null>(null);
  const [checkResults, setCheckResults] = useState<Record<string, CheckResult | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [simPayLoading, setSimPayLoading] = useState(false);
  const [paySuccess, setPaySuccess] = useState('');

  const [logs, setLogs] = useState<ApiLog[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (endpoint: string, method: string, request: any, status: 'pending' | 'success' | 'error', response?: any) => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      time: new Date().toLocaleTimeString(),
      endpoint, method, request, status, response
    }]);
  };

  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    if (!apiKey) return;
    fetch(`${API_BASE}/v1/plans`, { headers: { 'x-api-key': apiKey } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPlans(data); })
      .catch(() => {});
  }, [apiKey]);

  const loadSubscription = () => {
    if (!apiKey || !selectedUser) return;
    addLog('/v1/subscriptions/' + selectedUser, 'GET', {}, 'pending');
    fetch(`${API_BASE}/v1/subscriptions/${selectedUser}`, { headers: { 'x-api-key': apiKey } })
      .then(r => r.json())
      .then(data => {
        addLog('/v1/subscriptions/' + selectedUser, 'GET', {}, 'success', data);
        if (data?.id) {
          setSubscription({
            id: data.id, status: data.status,
            plan_name: data.plans?.name || data.plan_id, end_date: data.end_date,
          });
        } else {
          setSubscription(null);
        }
      })
      .catch(e => addLog('/v1/subscriptions/' + selectedUser, 'GET', {}, 'error', { error: e.message }));
  };

  useEffect(() => {
    setSubscription(null);
    setCheckResults({});
    loadSubscription();
  }, [apiKey, selectedUser, paySuccess]);

  const applyApiKey = () => {
    const key = apiKeyInput.trim();
    if (!key) return;
    localStorage.setItem('demo_api_key', key);
    setApiKey(key);
    setApiKeyInput('');
  };

  const simulatePayment = async () => {
    if (!selectedPlan) return;
    setSimPayLoading(true); setPaySuccess('');
    const reqBody = { external_user_id: selectedUser, plan_id: selectedPlan, payment_status: 'success' };
    addLog('/webhooks/payment-success', 'POST', reqBody, 'pending');
    try {
      const res = await fetch(`${API_BASE}/webhooks/payment-success`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify(reqBody),
      });
      const data = await res.json();
      addLog('/webhooks/payment-success', 'POST', reqBody, data.success ? 'success' : 'error', data);
      if (data.success) {
        setPaySuccess(`✅ Payment successful! Subscription activated: ${data.subscription?.plan}`);
        setCheckResults({});
        loadSubscription();
      }
    } catch (e: any) {
      addLog('/webhooks/payment-success', 'POST', reqBody, 'error', { error: e.message });
    } finally {
      setSimPayLoading(false);
    }
  };

  const checkFeatureAccess = async (featureCode: string) => {
    setLoading(prev => ({ ...prev, [featureCode]: true }));
    setCheckResults(prev => ({ ...prev, [featureCode]: null }));
    const reqBody = { external_user_id: selectedUser, feature_code: featureCode };
    addLog('/v1/check-access', 'POST', reqBody, 'pending');
    try {
      const res = await fetch(`${API_BASE}/v1/check-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify(reqBody),
      });
      const data: CheckResult = await res.json();
      addLog('/v1/check-access', 'POST', reqBody, data.success && data.allowed ? 'success' : 'error', data);
      setCheckResults(prev => ({ ...prev, [featureCode]: data }));
    } catch (e: any) {
      const errRes = { success: false, allowed: false, feature: featureCode, plan: '', used: 0, limit: 0, remaining: 0, reason: e.message };
      addLog('/v1/check-access', 'POST', reqBody, 'error', errRes);
      setCheckResults(prev => ({ ...prev, [featureCode]: errRes }));
    } finally {
      setLoading(prev => ({ ...prev, [featureCode]: false }));
    }
  };

  if (!apiKey) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6 font-sans">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 blur-[100px] opacity-20" />
          <div className="relative bg-[#111111] border border-white/10 rounded-3xl p-10 w-full max-w-md shadow-2xl backdrop-blur-xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-violet-500/20">
                <Zap className="text-white w-8 h-8" />
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">SuperSaaS</h1>
              <p className="text-white/50 text-sm mt-2">Demo integration with EntitleX Engine</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">API Key</label>
                <input
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyApiKey()}
                  placeholder="sk_live_..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white font-mono text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all placeholder:text-white/20"
                />
              </div>
              <button onClick={applyApiKey} className="w-full py-3.5 bg-white text-black hover:bg-white/90 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                Connect Platform <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const FEATURES = [
    { code: 'export', label: 'Export to PDF', icon: FileText, color: 'blue', desc: 'Download reports' },
    { code: 'ai_generate', label: 'AI Generator', icon: Zap, color: 'violet', desc: 'Create content with AI' },
    { code: 'analytics', label: 'Advanced Analytics', icon: BarChart3, color: 'emerald', desc: 'View insights' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-8 font-sans selection:bg-violet-500/30">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* --- LEFT: SAAS APP UI --- */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-6 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                <LayoutTemplate className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">SuperSaaS</h1>
                <p className="text-white/50 text-sm">Demo Client App</p>
              </div>
            </div>
            <button onClick={() => { localStorage.removeItem('demo_api_key'); setApiKey(''); }} className="text-xs font-medium text-white/50 hover:text-white px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
              Disconnect API
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* User Context */}
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[50px] -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/20 rounded-lg"><User size={18} className="text-blue-400" /></div>
                <h2 className="font-semibold text-lg">Current User</h2>
              </div>
              <div className="space-y-3">
                {DEMO_USERS.map(u => (
                  <button
                    key={u} onClick={() => setSelectedUser(u)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      selectedUser === u
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="font-mono">{u}</span>
                    {selectedUser === u && <CheckCircle size={16} className="text-white/80" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Subscription Manager */}
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[50px] -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg"><ShieldCheck size={18} className="text-emerald-400" /></div>
                  <h2 className="font-semibold text-lg">Billing</h2>
                </div>
                {subscription?.status === 'ACTIVE' && (
                   <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-md border border-emerald-500/20">
                     Active
                   </span>
                )}
              </div>

              {subscription?.status === 'ACTIVE' ? (
                <div className="mb-6 bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Current Plan</p>
                  <p className="text-xl font-bold text-white mb-2">{subscription.plan_name}</p>
                  {subscription.end_date && (
                    <p className="text-xs text-white/50">Renews: {new Date(subscription.end_date).toLocaleDateString()}</p>
                  )}
                </div>
              ) : (
                <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400/90 text-sm">
                  No active subscription. Please upgrade.
                </div>
              )}

              <div className="space-y-3">
                <select
                  value={selectedPlan} onChange={e => setSelectedPlan(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all appearance-none"
                >
                  <option value="" className="bg-[#111]">-- Select Plan to Upgrade --</option>
                  {plans.map(p => <option key={p.id} value={p.id} className="bg-[#111]">{p.name} — ${p.price}/mo</option>)}
                </select>
                <button
                  onClick={simulatePayment} disabled={!selectedPlan || simPayLoading}
                  className="w-full py-3 bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {simPayLoading ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                  Buy Subscription
                </button>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Activity size={20} className="text-violet-400"/> Core Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {FEATURES.map(f => {
                const result = checkResults[f.code];
                const isLoading = loading[f.code];
                const Icon = f.icon;

                return (
                  <div key={f.code} className="bg-[#111111] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors group flex flex-col h-full">
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-10 h-10 rounded-xl bg-${f.color}-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                        <Icon size={20} className={`text-${f.color}-400`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{f.label}</h3>
                        <p className="text-xs text-white/50 mt-0.5">{f.desc}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => checkFeatureAccess(f.code)} disabled={isLoading}
                      className="w-full py-2.5 mt-auto bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 border border-white/5"
                    >
                      {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Execute'}
                    </button>

                    {result && (
                      <div className={`mt-4 rounded-xl p-3 text-xs border ${
                        result.allowed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
                      }`}>
                        <div className="flex items-center gap-2 font-bold mb-2">
                          {result.allowed
                            ? <><CheckCircle size={14} className="text-emerald-400" /><span className="text-emerald-400">Granted</span></>
                            : <><XCircle size={14} className="text-red-400" /><span className="text-red-400">Denied</span></>
                          }
                        </div>
                        {result.allowed ? (
                          <div className="space-y-1 mt-2 pt-2 border-t border-emerald-500/20">
                            <div className="flex justify-between text-white/70"><span>Used:</span><span className="font-mono text-white">{result.used} / {result.limit === -1 ? '∞' : result.limit}</span></div>
                          </div>
                        ) : (
                          <div className="mt-2 pt-2 border-t border-red-500/20 text-red-400/80">
                            {result.reason === 'no_active_subscription' ? 'No active subscription.' : result.reason === 'feature_not_in_plan' ? 'Not included in plan.' : 'Usage limit exceeded.'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* --- RIGHT: API LOGS PANEL --- */}
        <div className="lg:col-span-4 flex flex-col h-[800px] bg-black/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/60">
            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-white/50" />
              <h2 className="font-semibold text-sm">Live Entitlement Logs</h2>
            </div>
            <button onClick={() => setLogs([])} className="text-xs text-white/40 hover:text-white transition-colors">Clear</button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-[11px]">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-white/30 text-center px-4">
                 <Server size={32} className="mb-3 opacity-50" />
                 <p>Interact with the app to see API calls to the Entitlement Engine.</p>
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="bg-[#111] border border-white/10 rounded-lg overflow-hidden">
                  <div className={`px-3 py-2 border-b border-white/10 flex justify-between items-center ${
                    log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                    log.status === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{log.method}</span>
                      <span className="truncate max-w-[180px]">{log.endpoint}</span>
                    </div>
                    <span className="text-[10px] opacity-70">{log.time}</span>
                  </div>
                  <div className="p-3 space-y-2">
                    {log.request && Object.keys(log.request).length > 0 && (
                      <div>
                        <span className="text-white/40 uppercase tracking-wider text-[9px] mb-1 block">Request</span>
                        <pre className="text-white/70 whitespace-pre-wrap break-all">{JSON.stringify(log.request, null, 2)}</pre>
                      </div>
                    )}
                    {log.response && (
                      <div>
                        <span className="text-white/40 uppercase tracking-wider text-[9px] mb-1 block">Response</span>
                        <pre className={`whitespace-pre-wrap break-all ${log.status === 'error' ? 'text-red-400' : log.response.allowed === false ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {JSON.stringify(log.response, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

      </div>
    </div>
  );
}
