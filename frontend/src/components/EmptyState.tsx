import React from 'react';
import { FileQuestion } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, actionText, onAction }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-dashed border-slate-300 rounded-2xl">
    <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-2xl mb-4">
      <FileQuestion size={32} className="text-slate-400" />
    </div>
    <h3 className="text-lg font-bold text-slate-900 mb-1">{title}</h3>
    <p className="text-slate-500 mb-6 max-w-sm">{description}</p>
    {actionText && onAction && (
      <button 
        onClick={onAction}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition"
      >
        {actionText}
      </button>
    )}
  </div>
);

export default EmptyState;
