import React, { useState, useEffect } from 'react';
import { Info, Users, FileText, AlertTriangle, TrendingUp, Activity, ShieldAlert } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Person } from '../types';
import { TreeMap } from './TreeMap';

interface DataVisualizationProps {
  people: Person[];
  analyticsData?: any;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onPersonSelect?: (person: Person) => void;
}

const COLORS = {
  HIGH: '#ef4444',   // Red-500
  MEDIUM: '#f59e0b', // Amber-500
  LOW: '#10b981',    // Emerald-500
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  accent: '#06b6d4',
  background: '#1e293b'
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 p-4 rounded-lg shadow-xl border border-slate-700">
        <p className="text-white font-bold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-300">{entry.name}:</span>
            <span className="text-white font-mono">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const DataVisualization: React.FC<DataVisualizationProps> = ({ 
  people, 
  analyticsData,
  loading, 
  error, 
  onRetry,
  onPersonSelect
}) => {
  const [stats, setStats] = useState({
    totalPeople: 0,
    highRisk: 0,
    totalMentions: 0,
    avgSpice: 0,
    uniqueRoles: 0,
    activeInvestigations: 0
  });

  useEffect(() => {
    if (analyticsData) {
      setStats({
        totalPeople: analyticsData.totalEntities || 0,
        highRisk: analyticsData.likelihoodDistribution?.find((d: any) => d.level === 'HIGH')?.count || 0,
        totalMentions: analyticsData.totalMentions || 0,
        avgSpice: analyticsData.averageSpiceRating || 0,
        uniqueRoles: analyticsData.totalUniqueRoles || analyticsData.roleDistribution?.length || 0,
        activeInvestigations: analyticsData.activeInvestigations || 0
      });
    } else if (people.length > 0) {
      const highRisk = people.filter(p => (p.red_flag_rating ?? 0) >= 4).length;
      const totalMentions = people.reduce((acc, p) => acc + (p.mentions || 0), 0);
      const avgSpice = people.reduce((acc, p) => acc + (p.red_flag_rating || 0), 0) / people.length;
      
      const uniqueRoles = new Set<string>();
      people.forEach(p => {
        if (p.role) uniqueRoles.add(p.role);
        
        if (p.secondaryRoles && Array.isArray(p.secondaryRoles)) {
          p.secondaryRoles.forEach(r => uniqueRoles.add(r));
        } else if (p.secondary_roles) {
          p.secondary_roles.split(',').forEach(r => uniqueRoles.add(r.trim()));
        }
      });
      
      setStats({
        totalPeople: people.length,
        highRisk,
        totalMentions,
        avgSpice,
        uniqueRoles: uniqueRoles.size,
        activeInvestigations: 0
      });
    }
  }, [people, analyticsData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-400">
        <p>{error}</p>
        <button onClick={onRetry} className="mt-4 px-4 py-2 bg-slate-800 rounded hover:bg-slate-700">
          Retry
        </button>
      </div>
    );
  }

  // Prepare Data
  const riskDistribution = [
    { name: 'High Risk (4-5)', value: people.filter(p => (p.red_flag_rating ?? 0) >= 4).length, color: COLORS.HIGH },
    { name: 'Medium Risk (2-3)', value: people.filter(p => (p.red_flag_rating ?? 0) >= 2 && (p.red_flag_rating ?? 0) < 4).length, color: COLORS.MEDIUM },
    { name: 'Low Risk (0-1)', value: people.filter(p => (p.red_flag_rating ?? 0) < 2).length, color: COLORS.LOW }
  ];

  const topEntities = analyticsData?.topEntities || people
    .sort((a, b) => (b.mentions || 0) - (a.mentions || 0))
    .slice(0, 10)
    .map(p => ({
      name: p.name,
      mentions: p.mentions,
      spice: p.red_flag_rating ?? 0
    }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Key Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 text-sm font-medium">Total Entities</h3>
            <Users className="text-blue-500 h-5 w-5" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.totalPeople.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-2">Tracked individuals</div>
          {/* Microcopy for Total Entities */}
          <div className="text-xs text-slate-400 mt-3 flex items-start gap-1">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>Individuals, organizations, and locations tracked in the database</span>
          </div>
        </div>

        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 text-sm font-medium">High Risk Targets</h3>
            <ShieldAlert className="text-red-500 h-5 w-5" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.highRisk.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-2">Red Flag Index 4+</div>
          {/* Microcopy for High Risk Targets */}
          <div className="text-xs text-slate-400 mt-3 flex items-start gap-1">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>Individuals with strong evidence connections and significant mentions</span>
          </div>
        </div>

        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 text-sm font-medium">Total Mentions</h3>
            <Activity className="text-purple-500 h-5 w-5" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.totalMentions.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-2">Across all documents</div>
          {/* Microcopy for Total Mentions */}
          <div className="text-xs text-slate-400 mt-3 flex items-start gap-1">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>Total references to entities across all documents in the archive</span>
          </div>
        </div>

        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 text-sm font-medium">Active Investigations</h3>
            <FileText className="text-orange-500 h-5 w-5" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.activeInvestigations.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-2">Ongoing cases</div>
          {/* Microcopy for Active Investigations */}
          <div className="text-xs text-slate-400 mt-3 flex items-start gap-1">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>Open investigations currently being pursued by researchers</span>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Entities Bar Chart - Enhanced */}
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur-sm hover:border-slate-600 transition-all">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 flex-wrap">
            <Users className="h-5 w-5 text-blue-400" />
            Top 20 Most Mentioned Individuals
          </h3>
          {/* Microcopy for Top Entities Chart */}
          <div className="text-xs text-slate-400 mb-4 flex items-start gap-1">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>Individuals with the highest number of references across all documents</span>
          </div>
          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topEntities.slice(0, 20)} layout="vertical" margin={{ left: 20, right: 20 }}>
                <defs>
                  {topEntities.slice(0, 20).map((entry, index) => (
                    <linearGradient key={`gradient-${index}`} id={`barGradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={entry.spice >= 5 ? '#ec4899' : entry.spice >= 4 ? '#ef4444' : entry.spice >= 3 ? '#8b5cf6' : entry.spice >= 2 ? '#3b82f6' : '#06b6d4'} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={entry.spice >= 5 ? '#be185d' : entry.spice >= 4 ? '#dc2626' : entry.spice >= 3 ? '#6d28d9' : entry.spice >= 2 ? '#1d4ed8' : '#0e7490'} stopOpacity={1} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  width={140}
                  tick={{ fill: '#e2e8f0' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#334155', opacity: 0.4 }} />
                <Bar dataKey="mentions" radius={[0, 8, 8, 0]} animationDuration={800}>
                  {topEntities.slice(0, 20).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#barGradient-${index})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution Pie Chart */}
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur-sm hover:border-slate-600 transition-all">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            Risk Level Distribution
          </h3>
          {/* Microcopy for Risk Distribution Chart */}
          <div className="text-xs text-slate-400 mb-4 flex items-start gap-1">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>Distribution of entities across risk levels based on evidence connections</span>
          </div>
          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={140}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Interactive Tree Map */}
      <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur-sm hover:border-slate-600 transition-all">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 flex-wrap">
          <Activity className="h-5 w-5 text-purple-400" />
          Interactive Entity Tree Map
          <span className="text-xs text-slate-400 font-normal ml-2">(Top 50 by mentions - hover for details, click to view)</span>
        </h3>
        {/* Microcopy for Tree Map */}
        <div className="text-xs text-slate-400 mb-4 flex items-start gap-1">
          <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>Visual representation of entities sized by mention frequency. Click to view entity details.</span>
        </div>
        <TreeMap people={people} onPersonClick={onPersonSelect} />
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-900 to-purple-700 p-4 rounded-lg shadow-lg">
          <div className="text-2xl font-bold text-white">
            {stats.totalPeople.toLocaleString()}
          </div>
          <div className="text-purple-200 text-sm mt-1">Total Individuals</div>
          <div className="text-purple-300 text-xs mt-1">In the database</div>
        </div>
        <div className="bg-gradient-to-br from-indigo-900 to-indigo-700 p-4 rounded-lg shadow-lg">
          <div className="text-2xl font-bold text-white">
            {stats.totalPeople > 0 ? Math.round(stats.totalMentions / stats.totalPeople) : 0}
          </div>
          <div className="text-indigo-200 text-sm mt-1">Avg Mentions</div>
          <div className="text-indigo-300 text-xs mt-1">Per individual</div>
        </div>
        <div className="bg-gradient-to-br from-pink-900 to-pink-700 p-4 rounded-lg shadow-lg">
          <div className="text-2xl font-bold text-white">
            {stats.uniqueRoles.toLocaleString()}
          </div>
          <div className="text-pink-200 text-sm mt-1">Unique Roles</div>
          <div className="text-pink-300 text-xs mt-1">Job titles/positions</div>
        </div>
        <div className="bg-gradient-to-br from-teal-900 to-teal-700 p-4 rounded-lg shadow-lg">
          <div className="text-2xl font-bold text-white">
            {people.length > 0 ? Math.max(...people.map(p => p?.mentions || 0)).toLocaleString() : '0'}
          </div>
          <div className="text-teal-200 text-sm mt-1">Max Mentions</div>
          <div className="text-teal-300 text-xs mt-1">For a single individual</div>
        </div>
      </div>
    </div>
  );
};