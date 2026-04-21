import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import EmptyState from '../components/EmptyState';

const FeaturesPage: React.FC = () => {
  const [features, setFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error: showError } = useToast();

  const [isCreating, setIsCreating] = useState(false);
  const [newFeature, setNewFeature] = useState({ code: '', name: '', description: '', usage_tracked: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    try {
      const { data } = await api.get('/features');
      setFeatures(data);
    } catch (err: any) {
      showError('Failed to load features');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/features', newFeature);
      success('Feature created successfully');
      setIsCreating(false);
      setNewFeature({ code: '', name: '', description: '', usage_tracked: false });
      fetchFeatures();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to create feature');
    }
    setSaving(false);
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.put(`/features/${id}`, { is_enabled: !currentStatus });
      success(`Feature ${!currentStatus ? 'enabled' : 'disabled'}`);
      fetchFeatures();
    } catch (err: any) {
      showError('Failed to update status');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Feature Management</h2>
          <p className="text-sm text-slate-500">Global registry of all capabilities in your app.</p>
        </div>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition"
        >
          <Plus size={18} /> Add Feature
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Feature Code (Unique)</label>
              <input required type="text" value={newFeature.code} onChange={e => setNewFeature({...newFeature, code: e.target.value.toUpperCase()})} className="w-full border border-slate-300 rounded-xl px-4 py-2 bg-slate-50 uppercase" placeholder="EXPORT_PDF" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
              <input required type="text" value={newFeature.name} onChange={e => setNewFeature({...newFeature, name: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-2 bg-slate-50" placeholder="Export to PDF" />
            </div>
            <div className="col-span-full">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <input type="text" value={newFeature.description} onChange={e => setNewFeature({...newFeature, description: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-2 bg-slate-50" placeholder="Allows user to export reports..." />
            </div>
            <div className="col-span-full flex items-center gap-2 pt-2">
              <input type="checkbox" id="usage" checked={newFeature.usage_tracked} onChange={e => setNewFeature({...newFeature, usage_tracked: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded bg-slate-100 border-slate-300" />
              <label htmlFor="usage" className="text-sm font-medium text-slate-700">Track usage limits for this feature</label>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-slate-900 text-white px-6 py-2 rounded-xl disabled:opacity-50">{saving ? 'Saving...' : 'Save Feature'}</button>
            <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-2 border rounded-xl text-slate-700 hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading features...</div>
      ) : features.length === 0 ? (
        <EmptyState title="No Features Found" description="Register your first application feature to start managing entitlements." />
      ) : (
        <div className="bg-white border text-left border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 w-1/4">Code</th>
                <th className="px-6 py-4 w-1/4">Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {features.map(feature => (
                <tr key={feature.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-md text-xs font-semibold ${feature.is_enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                      {feature.is_enabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded-md text-slate-700 border border-slate-200">
                      {feature.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{feature.name}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[200px]">{feature.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    {feature.usage_tracked ? 
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">Metered (Limits)</span> : 
                      <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">Boolean (On/Off)</span>
                    }
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => toggleStatus(feature.id, feature.is_enabled)}
                      className={`p-1.5 rounded-lg transition ${feature.is_enabled ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                      title={feature.is_enabled ? "Disable Feature" : "Enable Feature"}
                    >
                      {feature.is_enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FeaturesPage;
