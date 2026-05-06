import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Key, Trash2, Plus, Activity, Users, Box, TerminalSquare,
  BookOpen, BarChart3, Shield, ExternalLink, Zap
} from 'lucide-react';

interface ApiKey { id: string; name: string; status: string; created_at: string; last_used_at: string | null; }
interface Plan { id: string; name: string; description: string; price: number; interval: string; feature_limits: Record<string, number>; }
interface Feature { id: string; code: string; name: string; description: string; usage_tracked: boolean; is_enabled: boolean; }
interface Subscription { id: string; status: string; external_user_id: string; plans: Plan; }
interface LogEvent { id: string; feature_code: string; external_user_id: string; count: number; created_at: string; }

export default function DeveloperDashboard() {
  const [tab, setTab] = useState('overview');
  
  const [overview, setOverview] = useState<any>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [usage, setUsage] = useState<any>(null);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [planFeatures, setPlanFeatures] = useState<any[]>([]);
  
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [subUserId, setSubUserId] = useState('');
  const [subPlanId, setSubPlanId] = useState('');
  
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState('');
  const [newFeatureCode, setNewFeatureCode] = useState('');
  const [newFeatureName, setNewFeatureName] = useState('');
  const [pfPlanId, setPfPlanId] = useState('');
  const [pfFeatureCode, setPfFeatureCode] = useState('');
  const [pfLimit, setPfLimit] = useState('');

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    try {
      if (tab === 'overview') setOverview((await api.get('/tenant/overview')).data);
      if (tab === 'keys') setKeys((await api.get('/tenant/api-keys')).data);
      if (tab === 'plans') setPlans((await api.get('/tenant/plans')).data);
      if (tab === 'features') setFeatures((await api.get('/tenant/features')).data);
      if (tab === 'planFeatures') {
        setPlanFeatures((await api.get('/tenant/plan-features')).data);
        setPlans((await api.get('/tenant/plans')).data);
        setFeatures((await api.get('/tenant/features')).data);
      }
      if (tab === 'subs') {
        setSubs((await api.get('/tenant/subscriptions')).data);
        setPlans((await api.get('/tenant/plans')).data);
      }
      if (tab === 'usage') setUsage((await api.get('/tenant/usage')).data);
      if (tab === 'logs') setLogs((await api.get('/tenant/logs')).data);
    } catch (e) { console.error(e); }
  };

  const genKey = async () => {
    try {
      const r = await api.post('/tenant/api-keys/generate', { name: `Key-${Date.now().toString(36)}` });
      setNewRawKey(r.data.rawKey);
      loadData();
    } catch (e: any) { alert(e?.response?.data?.error || 'Failed'); }
  };

  const revokeKey = async (id: string) => {
    if (!confirm('Revoke?')) return;
    try { await api.delete(`/tenant/api-keys/${id}`); loadData(); } catch (e) { alert('Failed'); }
  };

  const createSub = async () => {
    if (!subUserId || !subPlanId) return alert('Fill fields');
    try {
      await api.post('/tenant/subscriptions', { plan_id: subPlanId, external_user_id: subUserId });
      setSubUserId(''); setSubPlanId('');
      loadData();
    } catch (e: any) { alert(e?.response?.data?.error || 'Failed'); }
  };

  const cancelSub = async (extId: string) => {
    if (!confirm('Cancel?')) return;
    try { await api.delete(`/tenant/subscriptions/${extId}`); loadData(); } catch (e) { alert('Failed'); }
  };

  const createPlan = async () => {
    if (!newPlanName) return alert('Plan name is required');
    try {
      await api.post('/tenant/plans', { name: newPlanName, price: newPlanPrice });
      setNewPlanName(''); setNewPlanPrice(''); loadData();
    } catch (e: any) { alert(e?.response?.data?.error || 'Failed'); }
  };

  const createFeature = async () => {
    if (!newFeatureCode || !newFeatureName) return alert('Code and name required');
    try {
      await api.post('/tenant/features', { code: newFeatureCode, name: newFeatureName });
      setNewFeatureCode(''); setNewFeatureName(''); loadData();
    } catch (e: any) { alert(e?.response?.data?.error || 'Failed'); }
  };

  const assignPlanFeature = async () => {
    if (!pfPlanId || !pfFeatureCode || !pfLimit) return alert('All fields required');
    try {
      await api.post('/tenant/plan-features', { plan_id: pfPlanId, feature_code: pfFeatureCode, limit_value: parseInt(pfLimit) });
      setPfPlanId(''); setPfFeatureCode(''); setPfLimit(''); loadData();
    } catch (e: any) { alert(e?.response?.data?.error || 'Failed'); }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'keys', label: 'API Keys', icon: Key },
    { id: 'plans', label: 'Plans', icon: Box },
    { id: 'features', label: 'Features', icon: Shield },
    { id: 'planFeatures', label: 'Plan Features', icon: Box },
    { id: 'subs', label: 'Subscriptions', icon: Users },
    { id: 'usage', label: 'Usage', icon: BarChart3 },
    { id: 'logs', label: 'API Logs', icon: TerminalSquare },
    { id: 'docs', label: 'API Docs', icon: BookOpen },
  ];

  return (
    <div className="space-y-6 text-white max-w-6xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Developer Dashboard</h1>
          <p className="text-slate-400">Manage your SaaS configuration and monitor usage.</p>
        </div>
        <a
          href="/demo-app"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20 text-sky-400 rounded-xl text-sm font-medium transition-colors"
        >
          <Zap size={15} /> Open Demo App <ExternalLink size={13} />
        </a>
      </div>

      <div className="flex gap-2 bg-slate-800 p-2 rounded-xl overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${tab === t.id ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
            <t.icon size={16} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && overview && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
              <p className="text-slate-400 text-sm">API Calls (Mo)</p>
              <p className="text-3xl font-bold text-sky-400">{overview.apiCallsThisMonth}</p>
            </div>
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
              <p className="text-slate-400 text-sm">Active Users</p>
              <p className="text-3xl font-bold text-emerald-400">{overview.activeUsers}</p>
            </div>
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
              <p className="text-slate-400 text-sm">Active Subscriptions</p>
              <p className="text-3xl font-bold text-violet-400">{overview.activeSubscriptions ?? '—'}</p>
            </div>
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
              <p className="text-slate-400 text-sm">Active API Keys</p>
              <p className="text-3xl font-bold text-amber-400">{overview.activeKeys}/{overview.totalKeys}</p>
            </div>
          </div>
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <p className="text-slate-400 text-sm font-medium mb-1">Tenant Plan</p>
            <p className="text-2xl font-bold text-indigo-400">{overview.currentPlan}</p>
            <p className="text-slate-500 text-sm mt-1">This is your internal platform subscription</p>
          </div>
        </div>
      )}

      {tab === 'keys' && (
        <div className="bg-slate-800 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">API Keys</h2>
            <button onClick={genKey} className="px-4 py-2 bg-sky-500 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-sky-400"><Plus size={16} />Generate Key</button>
          </div>
          {newRawKey && (
            <div className="p-4 mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <p className="text-emerald-400 mb-2">Key created! Copy it now as it won't be shown again:</p>
              <code className="text-emerald-300 bg-slate-900 px-3 py-2 rounded block break-all">{newRawKey}</code>
            </div>
          )}
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400 border-b border-slate-700"><tr><th className="pb-3">Name</th><th className="pb-3">Status</th><th className="pb-3">Created</th><th className="pb-3">Last Used</th><th className="pb-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-700 text-slate-300">
              {keys.map(k => (
                <tr key={k.id}>
                  <td className="py-3 font-medium">{k.name}</td>
                  <td className="py-3">{k.status === 'active' ? <span className="text-emerald-400 font-medium">Active</span> : <span className="text-red-400 font-medium">Revoked</span>}</td>
                  <td className="py-3">{new Date(k.created_at).toLocaleDateString()}</td>
                  <td className="py-3 text-slate-400">{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}</td>
                  <td className="py-3">{k.status === 'active' && <button onClick={() => revokeKey(k.id)} className="text-red-400 hover:text-red-300 transition-colors"><Trash2 size={18} /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'plans' && (
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-2xl p-6 flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm text-slate-400 mb-1 block">Plan Name</label>
              <input value={newPlanName} onChange={e=>setNewPlanName(e.target.value)} placeholder="e.g. PRO" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white" />
            </div>
            <div className="flex-1">
              <label className="text-sm text-slate-400 mb-1 block">Price (Optional)</label>
              <input type="number" value={newPlanPrice} onChange={e=>setNewPlanPrice(e.target.value)} placeholder="e.g. 19.99" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white" />
            </div>
            <button onClick={createPlan} className="px-6 py-2 bg-sky-500 hover:bg-sky-400 font-medium rounded-lg h-10">Create Plan</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map(p => (
              <div key={p.id} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-sky-500/50 transition-colors">
                <h3 className="text-xl font-bold text-white">{p.name}</h3>
                <p className="text-3xl font-bold mt-4 text-sky-400">${p.price}<span className="text-sm font-normal text-slate-500">/mo</span></p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'features' && (
         <div className="space-y-6">
          <div className="bg-slate-800 rounded-2xl p-6 flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm text-slate-400 mb-1 block">Feature Code</label>
              <input value={newFeatureCode} onChange={e=>setNewFeatureCode(e.target.value)} placeholder="e.g. export" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono" />
            </div>
            <div className="flex-1">
              <label className="text-sm text-slate-400 mb-1 block">Feature Name</label>
              <input value={newFeatureName} onChange={e=>setNewFeatureName(e.target.value)} placeholder="e.g. Export to PDF" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white" />
            </div>
            <button onClick={createFeature} className="px-6 py-2 bg-sky-500 hover:bg-sky-400 font-medium rounded-lg h-10">Create Feature</button>
          </div>
          <div className="bg-slate-800 rounded-2xl p-6">
             <h2 className="text-xl font-bold mb-6">Available Features</h2>
             <table className="w-full text-left text-sm">
              <thead className="text-slate-400 border-b border-slate-700"><tr><th className="pb-3">Code</th><th className="pb-3">Name</th></tr></thead>
              <tbody className="divide-y divide-slate-700 text-slate-300">
                {features.map(f => (
                  <tr key={f.id}><td className="py-3 text-sky-400 font-mono">{f.code}</td><td className="py-3 font-medium">{f.name}</td></tr>
                ))}
              </tbody>
            </table>
           </div>
         </div>
      )}

      {tab === 'planFeatures' && (
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-2xl p-6 flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm text-slate-400 mb-1 block">Select Plan</label>
              <select value={pfPlanId} onChange={e=>setPfPlanId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white">
                <option value="">-- Choose Plan --</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm text-slate-400 mb-1 block">Select Feature</label>
              <select value={pfFeatureCode} onChange={e=>setPfFeatureCode(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white">
                <option value="">-- Choose Feature --</option>
                {features.map(f => <option key={f.id} value={f.code}>{f.name} ({f.code})</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm text-slate-400 mb-1 block">Limit (-1 for unlimited)</label>
              <input type="number" value={pfLimit} onChange={e=>setPfLimit(e.target.value)} placeholder="e.g. 5" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white" />
            </div>
            <button onClick={assignPlanFeature} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 font-medium rounded-lg h-10">Assign Limit</button>
          </div>
          <div className="bg-slate-800 rounded-2xl p-6">
             <h2 className="text-xl font-bold mb-6">Plan Entitlements</h2>
             <table className="w-full text-left text-sm">
              <thead className="text-slate-400 border-b border-slate-700"><tr><th className="pb-3">Plan</th><th className="pb-3">Feature Code</th><th className="pb-3">Limit</th></tr></thead>
              <tbody className="divide-y divide-slate-700 text-slate-300">
                {planFeatures.map(pf => (
                  <tr key={pf.id}><td className="py-3 font-medium text-white">{pf.plans?.name}</td><td className="py-3 text-sky-400 font-mono">{pf.feature_code}</td><td className="py-3">{pf.limit_value === -1 ? '∞ Unlimited' : pf.limit_value}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'subs' && (
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-xl">
            <h2 className="text-xl font-bold mb-4">Assign Subscription</h2>
            <input value={subUserId} onChange={e=>setSubUserId(e.target.value)} placeholder="external_user_id (e.g. user_123)" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 mb-3 text-white font-mono" />
            <select value={subPlanId} onChange={e=>setSubPlanId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 mb-4 text-white">
              <option value="">Select Plan</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name} (${p.price})</option>)}
            </select>
            <button onClick={createSub} className="w-full py-3 bg-sky-500 hover:bg-sky-400 font-medium rounded-lg transition-colors">Create Subscription</button>
          </div>
          <div className="bg-slate-800 rounded-2xl p-6">
             <h2 className="text-xl font-bold mb-4">Active Subscriptions</h2>
             <table className="w-full text-left text-sm">
              <thead className="text-slate-400 border-b border-slate-700"><tr><th className="pb-3">External User ID</th><th className="pb-3">Plan</th><th className="pb-3">Status</th><th className="pb-3">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-700 text-slate-300">
                {subs.filter(s => s.external_user_id).map(s => (
                  <tr key={s.id}><td className="py-3 font-mono text-sky-400">{s.external_user_id}</td><td className="py-3 font-medium">{s.plans?.name}</td><td className="py-3"><span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-xs">{s.status}</span></td><td className="py-3">{s.status === 'ACTIVE' && <button onClick={() => cancelSub(s.external_user_id)} className="text-red-400 hover:text-red-300 text-xs px-2 py-1 bg-red-400/10 rounded">Cancel</button>}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'usage' && usage && (
        <div className="bg-slate-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-6">Usage Analytics (Last 30 Days)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-slate-400 font-medium mb-3 border-b border-slate-700 pb-2">Usage By Feature</h3>
              {Object.entries(usage.byFeature || {}).map(([f, c]) => (
                <div key={f} className="flex justify-between text-sm py-3 border-b border-slate-800"><span className="text-slate-300 font-mono">{f}</span><span className="font-bold text-sky-400">{c as React.ReactNode}</span></div>
              ))}
            </div>
            <div>
              <h3 className="text-slate-400 font-medium mb-3 border-b border-slate-700 pb-2">Usage By User</h3>
              {Object.entries(usage.byUser || {}).map(([u, c]) => (
                <div key={u} className="flex justify-between text-sm py-3 border-b border-slate-800"><span className="text-slate-300 font-mono">{u}</span><span className="font-bold text-sky-400">{c as React.ReactNode}</span></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <div className="bg-slate-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-6">Recent API Logs</h2>
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400 border-b border-slate-700"><tr><th className="pb-3">Time</th><th className="pb-3">User ID</th><th className="pb-3">Feature</th><th className="pb-3">Count</th></tr></thead>
            <tbody className="divide-y divide-slate-700 text-slate-300">
              {logs.map(l => (
                <tr key={l.id}><td className="py-3 text-slate-400 text-xs">{new Date(l.created_at).toLocaleString()}</td><td className="py-3 font-mono text-xs">{l.external_user_id}</td><td className="py-3 text-sky-400 text-xs font-mono">{l.feature_code}</td><td className="py-3">{l.count}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'docs' && (
        <div className="bg-slate-800 rounded-2xl p-8 space-y-8 max-w-4xl">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">API Documentation</h2>
            <p className="text-slate-400">Integrate entitlement checks directly into your application.</p>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-sky-400">1. Check Feature Access</h3>
            <p className="text-sm text-slate-300">Use this endpoint before granting a user access to a feature. It validates their subscription, checks feature limits, and automatically tracks usage if allowed.</p>
            
            <div className="bg-[#0f172a] rounded-xl overflow-hidden border border-slate-700">
              <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              </div>
              <div className="p-4 overflow-auto">
                <pre className="text-sm font-mono text-slate-300">
<span className="text-sky-400">POST</span> /api/v1/check-access{'\n'}
<span className="text-emerald-400">Headers:</span>
x-api-key: YOUR_API_KEY{'\n'}
<span className="text-emerald-400">Body:</span>
{'{'}
  <span className="text-sky-300">"external_user_id"</span>: <span className="text-amber-300">"user_123"</span>,
  <span className="text-sky-300">"feature_code"</span>: <span className="text-amber-300">"export"</span>
{'}'}
                </pre>
              </div>
            </div>

            <p className="text-sm font-semibold mt-4 text-slate-300">Expected Response:</p>
            <div className="bg-[#0f172a] rounded-xl overflow-hidden border border-slate-700">
              <div className="p-4 overflow-auto">
                <pre className="text-sm font-mono text-slate-300">
{'{'}
  <span className="text-sky-300">"success"</span>: <span className="text-emerald-400">true</span>,
  <span className="text-sky-300">"allowed"</span>: <span className="text-emerald-400">true</span>,
  <span className="text-sky-300">"feature"</span>: <span className="text-amber-300">"export"</span>,
  <span className="text-sky-300">"plan"</span>: <span className="text-amber-300">"PRO"</span>,
  <span className="text-sky-300">"used"</span>: <span className="text-indigo-400">2</span>,
  <span className="text-sky-300">"limit"</span>: <span className="text-indigo-400">5</span>,
  <span className="text-sky-300">"remaining"</span>: <span className="text-indigo-400">3</span>
{'}'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
