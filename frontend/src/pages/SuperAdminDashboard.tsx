import React, { useEffect, useState } from 'react';
import { Building2, Package, Activity, BarChart3, Shield } from 'lucide-react';
import api from '../services/api';

export default function SuperAdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [usage, setUsage] = useState<any>(null);
  
  // Forms
  const [newPlan, setNewPlan] = useState({ name: '', price: '0', interval: 'MONTHLY' });
  const [newFeature, setNewFeature] = useState({ code: '', name: '', usage_tracked: false });

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    try {
      if (tab === 'overview') setOverview((await api.get('/admin/overview')).data);
      if (tab === 'tenants') setTenants((await api.get('/admin/tenants')).data);
      if (tab === 'plans') setPlans((await api.get('/admin/plans')).data);
      if (tab === 'features') setFeatures((await api.get('/admin/features')).data);
      if (tab === 'usage') setUsage((await api.get('/admin/usage')).data);
    } catch (e) { console.error(e); }
  };

  const createPlan = async () => {
    try { await api.post('/admin/plans', newPlan); setNewPlan({name:'',price:'0',interval:'MONTHLY'}); loadData(); } catch(e){ alert('Failed'); }
  };
  
  const createFeature = async () => {
    try { await api.post('/admin/features', newFeature); setNewFeature({code:'',name:'',usage_tracked:false}); loadData(); } catch(e){ alert('Failed'); }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'tenants', label: 'Tenants', icon: Building2 },
    { id: 'plans', label: 'Plans', icon: Package },
    { id: 'features', label: 'Features', icon: Shield },
    { id: 'usage', label: 'Global Usage', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6 text-white">
      <div>
        <h1 className="text-3xl font-bold">Platform Admin</h1>
        <p className="text-slate-400">Global metrics, tenants, plans, and feature management.</p>
      </div>

      <div className="flex gap-2 bg-slate-800 p-2 rounded-xl overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${tab === t.id ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
            <t.icon size={16} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && overview && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="bg-slate-800 p-6 rounded-2xl"><p className="text-slate-400 text-sm">Total Tenants</p><p className="text-3xl font-bold text-indigo-400">{overview.totalTenants}</p></div>
          <div className="bg-slate-800 p-6 rounded-2xl"><p className="text-slate-400 text-sm">Active Subs</p><p className="text-3xl font-bold text-sky-400">{overview.activeSubscriptions}</p></div>
          <div className="bg-slate-800 p-6 rounded-2xl"><p className="text-slate-400 text-sm">Active Plans</p><p className="text-3xl font-bold text-emerald-400">{overview.activePlans}</p></div>
          <div className="bg-slate-800 p-6 rounded-2xl"><p className="text-slate-400 text-sm">API Events</p><p className="text-3xl font-bold text-amber-400">{overview.totalApiEvents}</p></div>
        </div>
      )}

      {tab === 'tenants' && (
        <div className="bg-slate-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-6">Tenants</h2>
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400 border-b border-slate-700"><tr><th className="pb-3">Name</th><th className="pb-3">Slug</th><th className="pb-3">Created</th><th className="pb-3">API Events</th><th className="pb-3">Current Plan</th></tr></thead>
            <tbody className="divide-y divide-slate-700 text-slate-300">
              {tenants.map(t => (
                <tr key={t.id}><td className="py-3">{t.name}</td><td className="py-3 text-slate-500 font-mono">{t.slug}</td><td className="py-3">{new Date(t.created_at).toLocaleDateString()}</td><td className="py-3 text-emerald-400">{t.api_events}</td><td className="py-3 text-sky-400">{t.current_plan}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'plans' && (
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-2xl p-6 flex gap-4 items-end">
            <div className="flex-1"><label className="block text-xs text-slate-400 mb-1">Plan Name</label><input value={newPlan.name} onChange={e=>setNewPlan({...newPlan,name:e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2" /></div>
            <div className="w-32"><label className="block text-xs text-slate-400 mb-1">Price</label><input type="number" value={newPlan.price} onChange={e=>setNewPlan({...newPlan,price:e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2" /></div>
            <div className="w-32"><label className="block text-xs text-slate-400 mb-1">Interval</label><select value={newPlan.interval} onChange={e=>setNewPlan({...newPlan,interval:e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2"><option>MONTHLY</option><option>YEARLY</option></select></div>
            <button onClick={createPlan} className="bg-indigo-500 hover:bg-indigo-400 px-4 py-2 rounded font-medium h-10">Create</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map(p => (
              <div key={p.id} className="bg-slate-800 p-6 rounded-2xl">
                <h3 className="text-xl font-bold">{p.name}</h3>
                <p className="text-3xl font-bold mt-2">${p.price}<span className="text-sm text-slate-400">/{p.interval}</span></p>
                <div className="mt-4 pt-4 border-t border-slate-700 space-y-1">
                   {Object.entries(p.feature_limits || {}).map(([c,l]) => <div key={c} className="flex justify-between text-sm text-slate-300"><span>{c}</span><span>{l===-1?'∞':l as number}</span></div>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'features' && (
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-2xl p-6 flex gap-4 items-end">
            <div className="w-48"><label className="block text-xs text-slate-400 mb-1">Feature Code</label><input value={newFeature.code} onChange={e=>setNewFeature({...newFeature,code:e.target.value})} placeholder="e.g. EXPORT_PDF" className="w-full bg-slate-900 border border-slate-700 rounded p-2 font-mono uppercase text-sm" /></div>
            <div className="flex-1"><label className="block text-xs text-slate-400 mb-1">Display Name</label><input value={newFeature.name} onChange={e=>setNewFeature({...newFeature,name:e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2" /></div>
            <div className="flex items-center gap-2 h-10 px-2"><input type="checkbox" checked={newFeature.usage_tracked} onChange={e=>setNewFeature({...newFeature,usage_tracked:e.target.checked})} className="w-4 h-4" /><label className="text-sm">Track Usage?</label></div>
            <button onClick={createFeature} className="bg-indigo-500 hover:bg-indigo-400 px-4 py-2 rounded font-medium h-10">Create Feature</button>
          </div>
          <div className="bg-slate-800 rounded-2xl p-6">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400 border-b border-slate-700"><tr><th className="pb-3">Code</th><th className="pb-3">Name</th><th className="pb-3">Tracked</th><th className="pb-3">Enabled</th></tr></thead>
              <tbody className="divide-y divide-slate-700 text-slate-300">
                {features.map(f => (
                  <tr key={f.id}><td className="py-3 font-mono text-indigo-400">{f.code}</td><td className="py-3">{f.name}</td><td className="py-3">{f.usage_tracked ? 'Yes':'No'}</td><td className="py-3">{f.is_enabled ? 'Yes':'No'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'usage' && usage && (
         <div className="bg-slate-800 rounded-2xl p-6">
           <h2 className="text-xl font-bold mb-6">Global Analytics</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div>
               <h3 className="text-slate-400 mb-4">Events by Feature</h3>
               {Object.entries(usage.byFeature || {}).map(([f,c]) => (
                 <div key={f} className="flex justify-between py-2 border-b border-slate-700 text-sm"><span className="font-mono text-slate-300">{f}</span><span className="text-sky-400 font-bold">{c as React.ReactNode}</span></div>
               ))}
             </div>
             <div>
               <h3 className="text-slate-400 mb-4">Events by Tenant</h3>
               {Object.entries(usage.byTenant || {}).map(([t,c]) => (
                 <div key={t} className="flex justify-between py-2 border-b border-slate-700 text-sm"><span className="font-mono text-slate-500">{t}</span><span className="text-emerald-400 font-bold">{c as React.ReactNode}</span></div>
               ))}
             </div>
           </div>
         </div>
      )}
    </div>
  );
}
