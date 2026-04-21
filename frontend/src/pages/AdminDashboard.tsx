import React from 'react';
import { Users, Package, Activity, DollarSign } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm">Platform overview and key metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total MRR', value: '$12,450', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'Active Tenants', value: '1,204', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100' },
          { label: 'Pro Subscriptions', value: '840', icon: Package, color: 'text-purple-600', bg: 'bg-purple-100' },
          { label: 'API Calls (30d)', value: '1.2M', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-100' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon size={24} className={stat.color} />
              </div>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">{stat.label}</h3>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Activity (Stub)</h2>
        <div className="space-y-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0 last:pb-0">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <Users size={18} className="text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">New tenant registered: Company {i}</p>
                <p className="text-xs text-slate-500">{i * 2} hours ago</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
