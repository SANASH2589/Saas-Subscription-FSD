import React from 'react';

export const CardSkeleton: React.FC = () => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-pulse">
    <div className="flex justify-between items-start mb-4">
      <div className="space-y-3 flex-1">
        <div className="h-4 bg-slate-200 rounded w-1/3"></div>
        <div className="h-6 bg-slate-200 rounded w-1/2"></div>
      </div>
      <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
    </div>
    <div className="h-4 bg-slate-200 rounded w-3/4 mt-4"></div>
  </div>
);

export const FeatureSkeleton: React.FC = () => (
  <div className="bg-white border text-left flex flex-col p-5 rounded-xl animate-pulse">
    <div className="h-5 bg-slate-200 rounded w-1/2 mb-2"></div>
    <div className="h-4 bg-slate-200 rounded w-full mb-6"></div>
    <div className="h-8 bg-slate-200 rounded w-1/3 mt-auto"></div>
  </div>
);
