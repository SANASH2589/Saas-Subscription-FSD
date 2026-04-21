import React from 'react';
import { Sparkles, X, ChevronRight, CheckCircle2 } from 'lucide-react';



interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendation: {
    recommended_plan: string;
    reason: string;
    features_unlocked: string[];
  } | null;
  onUpgrade: () => void;
  loading: boolean;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, recommendation, onUpgrade, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
        
        {/* Header - AI Gradient */}
        <div className="p-6 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition"
          >
            <X size={18} />
          </button>
          
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={20} className="text-white" />
            <span className="font-semibold tracking-wide text-sm opacity-90">AI RECOMMENDATION</span>
          </div>
          
          <h2 className="text-2xl font-bold">Time for an upgrade!</h2>
        </div>

        <div className="p-8">
          {loading ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
              <p className="text-slate-500 font-medium">Gemini AI is analyzing your usage...</p>
            </div>
          ) : recommendation ? (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                <p className="text-slate-700 leading-relaxed text-[15px]">
                  {recommendation.reason}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">What you get with {recommendation.recommended_plan}</h3>
                <ul className="space-y-3">
                  {recommendation.features_unlocked.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-700">
                      <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={onClose}
                  className="flex-1 py-3 px-4 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Maybe Later
                </button>
                <button 
                  onClick={onUpgrade}
                  className="flex-[2] py-3 px-4 bg-slate-900 hover:bg-indigo-600 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  Upgrade to {recommendation.recommended_plan}
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500">Failed to load recommendation.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
