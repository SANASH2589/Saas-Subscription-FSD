import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { Package, Zap, AlertCircle, Clock, ShieldCheck, HardDrive } from 'lucide-react';
import { CardSkeleton, FeatureSkeleton } from '../components/LoadingSkeleton';
import UpgradeModal from '../components/UpgradeModal';

const UserDashboard: React.FC = () => {
  const { profile, subscription, loading: authLoading, refreshProfile } = useAuth();
  const { success, error: showError, warning } = useToast();
  
  const [features, setFeatures] = useState<any[]>([]);
  const [entitlements, setEntitlements] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [testLoading, setTestLoading] = useState<string | null>(null);

  // AI Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<any>(null);
  
  const [targetPlanId, setTargetPlanId] = useState<string | null>(null);

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    try {
      const { data } = await api.get('/features');
      setFeatures(data.filter((f: any) => f.is_enabled));
      setLoading(false);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to load features');
      setLoading(false);
    }
  };

  const testAccess = async (featureCode: string) => {
    setTestLoading(featureCode);
    try {
      const { data } = await api.post('/entitlement/check-access', { featureCode });
      setEntitlements(prev => ({ ...prev, [featureCode]: data }));
      
      if (data.allowed) {
        success(`Access granted for ${featureCode}`);
      } else {
        warning(data.message || `Access denied for ${featureCode}`);
        // TRIGER AI RECOMMENDATION
        triggerAIRecommendation(featureCode, data.currentUsage);
      }
    } catch (err: any) {
      showError(err.response?.data?.error || 'Access check failed');
    }
    setTestLoading(null);
  };

  const triggerAIRecommendation = async (featureCode: string, usageData: number) => {
    try {
      setAiModalOpen(true);
      setAiLoading(true);
      const { data } = await api.post('/ai/recommend', {
        currentPlan: subscription?.plan?.name || 'FREE',
        deniedFeature: featureCode,
        usageData: `${usageData} events`
      });
      setAiRecommendation(data);
      
      // Look up plan ID based on recommendation name (simplified logic)
      const plansReq = await api.get('/plans');
      const target = plansReq.data.find((p: any) => p.name === data.recommended_plan);
      if (target) setTargetPlanId(target.id);
      
      setAiLoading(false);
    } catch (err) {
      setAiLoading(false);
      showError('Failed to load AI recommendation');
      setAiModalOpen(false);
    }
  };

  const handleUpgrade = async () => {
    if (!targetPlanId) return;
    try {
      await api.put('/subscriptions/upgrade', { plan_id: targetPlanId });
      success(`Successfully upgraded to ${aiRecommendation?.recommended_plan}!`);
      setAiModalOpen(false);
      await refreshProfile();
    } catch (err) {
      showError('Upgrade failed');
    }
  };

  const trackUsage = async (featureCode: string) => {
    try {
      await api.post('/usage/track', { featureCode });
      success(`Usage tracked for ${featureCode}`);
      // Refresh entitlement to see updated count
      testAccess(featureCode);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to track usage');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="h-8 bg-slate-200 rounded w-1/4 mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
        <div className="h-6 bg-slate-200 rounded w-1/6 mt-12 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureSkeleton /><FeatureSkeleton /><FeatureSkeleton />
        </div>
      </div>
    );
  }

  const planName = subscription?.plan?.name || 'No Active Plan';
  const isActive = subscription?.status === 'ACTIVE';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header Info */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome back, {profile?.full_name || 'User'}</h1>
        <p className="text-slate-500 text-sm">Here's an overview of your workspace capabilities.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Plan Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Package size={64} className="text-indigo-600" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Current Plan</p>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-slate-900">{planName}</h2>
            {isActive && <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">Active</span>}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {subscription?.plan?.price ? `$${subscription.plan.price} / ${subscription.plan.interval.toLowerCase()}` : 'Free tier'}
            </p>
            <button className="text-indigo-600 font-medium text-sm hover:text-indigo-700">Upgrade</button>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500 mb-1">Billing Cycle</p>
          <h2 className="text-3xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            30 <span className="text-lg text-slate-400 font-medium">Days left</span>
          </h2>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Clock size={16} className="text-slate-400" />
            Renews on: {subscription?.end_date ? new Date(subscription.end_date).toLocaleDateString() : 'N/A'}
          </div>
        </div>

      </div>

      {/* Feature Grid */}
      <div className="pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Feature Entitlements Test</h2>
          <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Tenant ID: <span className="font-mono">{profile?.tenant_id.substring(0,8)}</span>
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              No features available to test.
            </div>
          ) : (
            features.map(feature => {
              const ent = entitlements[feature.code];
              
              return (
                <div key={feature.id} className="bg-white border border-slate-200 shadow-sm flex flex-col p-5 rounded-2xl transition hover:shadow-md">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Zap size={18} />
                      </div>
                      <h3 className="font-semibold text-slate-900">{feature.name}</h3>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-500 mb-4 flex-1">{feature.description}</p>

                  {/* Entitlement Result Area */}
                  {ent && (
                    <div className={`mb-4 p-3 rounded-xl border text-sm ${
                      ent.allowed 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                        : 'bg-red-50 border-red-100 text-red-800'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        {ent.allowed ? <ShieldCheck size={16} /> : <AlertCircle size={16} />}
                        <span className="font-semibold">{ent.allowed ? 'Access Granted' : 'Access Denied'}</span>
                      </div>
                      <p className="opacity-90">{ent.message}</p>
                      
                      {/* Usage Bar if applicable */}
                      {feature.usage_tracked && ent.limit > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs mb-1 font-medium">
                            <span>Usage</span>
                            <span>{ent.currentUsage} / {ent.limit}</span>
                          </div>
                          <div className="w-full bg-white rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${ent.currentUsage >= ent.limit ? 'bg-red-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min((ent.currentUsage / ent.limit) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button 
                      onClick={() => testAccess(feature.code)}
                      disabled={testLoading === feature.code}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2 px-3 rounded-xl text-sm font-medium transition disabled:opacity-50"
                    >
                      {testLoading === feature.code ? 'Checking...' : 'Check Access'}
                    </button>
                    
                    {feature.usage_tracked && (
                      <button 
                        onClick={() => trackUsage(feature.code)}
                        title="Simulate Usage"
                        className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition"
                      >
                        <HardDrive size={18} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <UpgradeModal 
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        loading={aiLoading}
        recommendation={aiRecommendation}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
};

export default UserDashboard;
