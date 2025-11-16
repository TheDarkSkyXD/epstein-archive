import React from 'react';
import { Users, AlertTriangle, FileText, TrendingUp } from 'lucide-react';
import { Person } from '../types';

interface StatsDashboardProps {
  people: Person[];
}

const StatsDashboard: React.FC<StatsDashboardProps> = ({ people }) => {
  const stats = {
    total: people.length,
    highRisk: people.filter(p => p.likelihood_score === 'HIGH').length,
    totalMentions: people.reduce((sum, p) => sum + p.mentions, 0),
    avgMentions: Math.round(people.reduce((sum, p) => sum + p.mentions, 0) / people.length)
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">Total People</p>
            <p className="text-2xl font-bold text-white">{stats.total.toLocaleString()}</p>
          </div>
          <Users className="h-8 w-8 text-primary-400" />
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">High Risk</p>
            <p className="text-2xl font-bold text-danger-400">{stats.highRisk}</p>
          </div>
          <AlertTriangle className="h-8 w-8 text-danger-400" />
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">Total Mentions</p>
            <p className="text-2xl font-bold text-white">{stats.totalMentions.toLocaleString()}</p>
          </div>
          <FileText className="h-8 w-8 text-emerald-400" />
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">Avg Mentions</p>
            <p className="text-2xl font-bold text-white">{stats.avgMentions}</p>
          </div>
          <TrendingUp className="h-8 w-8 text-amber-400" />
        </div>
      </div>
    </div>
  );
};

export default StatsDashboard;