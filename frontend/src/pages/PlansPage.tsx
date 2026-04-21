import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Plus, Package, Edit, Trash2 } from 'lucide-react';
import EmptyState from '../components/EmptyState';

const PlansPage: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [featuresList, setFeaturesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error: showError } = useToast();

  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: '', description: '', price: 0, interval: 'MONTHLY' });
  const [limits, setLimits] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [plansRes, featsRes] = await Promise.all([
        api.get('/plans'),
        api.get('/features')
      ]);
      setPlans(plansRes.data);
      // Pre-fill default limits of 0
      const feats = featsRes.data.filter((f: any) => f.is_enabled);
      setFeaturesList(feats);
      
      const defaultLimits: Record<string, number> = {};
      feats.forEach((f: any) => { defaultLimits[f.code] = 0; });
      setLimits(defaultLimits);
    } catch (err: any) {
      showError('Failed to load plans data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/plans', {
        ...newPlan,
        feature_limits: limits
      });
      success('Plan created successfully');
      setIsCreating(false);
      setNewPlan({ name: '', description: '', price: 0, interval: 'MONTHLY' });
      fetchData();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to create plan');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Plan Packages</h2>
          <p className="text-sm text-slate-500">Bundle features into subcription tiers.</p>
        </div>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition"
        >
          <Plus size={18} /> Create Plan
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4 border-r border-slate-100 pr-6">
              <h3 className="font-semibold text-slate-800">Plan Details</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input required type="text" value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-2 bg-slate-50" placeholder="e.g. Pro Tier" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Price ($)</label>
                  <input required type="number" value={newPlan.price} onChange={e => setNewPlan({...newPlan, price: Number(e.target.value)})} className="w-full border border-slate-300 rounded-xl px-4 py-2 bg-slate-50" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Billing</label>
                  <select value={newPlan.interval} onChange={e => setNewPlan({...newPlan, interval: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-2 bg-slate-50">
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input type="text" value={newPlan.description} onChange={e => setNewPlan({...newPlan, description: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-2 bg-slate-50" />
              </div>
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2">
              <div className="flex justify-between items-end">
                <h3 className="font-semibold text-slate-800">Feature Entitlements</h3>
                <span className="text-xs text-slate-400">(-1 = unlimited)</span>
              </div>
              
              {featuresList.map(f => (
                <div key={f.code} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{f.name}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{f.code}</div>
                  </div>
                  <input 
                    type="number"
                    min="-1"
                    value={limits[f.code]}
                    onChange={e => setLimits({...limits, [f.code]: parseInt(e.target.value) || 0})}
                    className="w-20 border border-slate-300 rounded-lg p-1.5 text-center text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button type="submit" disabled={saving} className="bg-slate-900 text-white px-6 py-2 rounded-xl disabled:opacity-50">{saving ? 'Saving...' : 'Save Plan'}</button>
            <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-2 border rounded-xl text-slate-700 hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading plans...</div>
      ) : plans.length === 0 ? (
        <EmptyState title="No Plans Found" description="Create a plan to start offering subscriptions to your tenants." actionText="Create First Plan" onAction={() => setIsCreating(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div key={plan.id} className="bg-white border border-slate-200 rounded-2xl flex flex-col hover:shadow-lg transition overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">Active</span>
                </div>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-2xl font-extrabold">${plan.price}</span>
                  <span className="text-slate-500 text-sm mb-1">/{plan.interval === 'MONTHLY' ? 'mo' : 'yr'}</span>
                </div>
                <p className="text-sm text-slate-500">{plan.description}</p>
              </div>
              
              <div className="p-6 flex-1 bg-white">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Included Features</h4>
                <ul className="space-y-3">
                  {Object.entries(plan.feature_limits).map(([code, limit]) => {
                    const feat = featuresList.find(f => f.code === code);
                    const name = feat ? feat.name : code;
                    const l = limit as number;
                    if (l === 0) return null; // hide disabled
                    
                    return (
                      <li key={code} className="flex items-start gap-2 text-sm text-slate-600">
                        <Package size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-medium text-slate-800">{name}</span>
                          {feat?.usage_tracked ? (
                            <span className="text-slate-500 ml-1">({l === -1 ? 'Unlimited' : `Up to ${l}`})</span>
                          ) : (
                            <span className="text-emerald-600 ml-1">✓</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
              
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                <button className="flex-1 shrink-0 p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition"><Edit size={18} className="mx-auto" /></button>
                <button className="flex-1 shrink-0 p-2 text-slate-500 hover:text-red-600 hover:bg-white rounded-lg border border-transparent hover:border-red-200 transition"><Trash2 size={18} className="mx-auto" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlansPage;
