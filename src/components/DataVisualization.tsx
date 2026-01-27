import React, { useState, useEffect } from 'react';
import { Info, Users, AlertTriangle, Activity, ShieldAlert } from 'lucide-react';
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
  HIGH: '#ef4444', // Red-500
  MEDIUM: '#f59e0b', // Amber-500
  LOW: '#10b981', // Emerald-500
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  accent: '#06b6d4',
  background: '#1e293b',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-slate-700/50">
        <p className="text-white font-bold mb-2 text-sm">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-3 text-sm">
            <div
              className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
              style={{ backgroundColor: entry.color || entry.fill }}
            />
            <span className="text-slate-300 font-medium">{entry.name}:</span>
            <span className="text-white font-mono font-bold">{entry.value.toLocaleString()}</span>
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
  onPersonSelect,
}) => {
  const [stats, setStats] = useState({
    totalPeople: 0,
    highRisk: 0,
    totalMentions: 0,
    avgRedFlag: 0,
    uniqueRoles: 0,
    activeInvestigations: 0,
  });

  useEffect(() => {
    if (analyticsData) {
      setStats({
        totalPeople: analyticsData.totalEntities || 0,
        highRisk:
          analyticsData.likelihoodDistribution?.find((d: any) => d.level === 'HIGH')?.count || 0,
        totalMentions: analyticsData.totalMentions || 0,
        avgRedFlag: analyticsData.averageRedFlagRating || 0,
        uniqueRoles: analyticsData.totalUniqueRoles || analyticsData.roleDistribution?.length || 0,
        activeInvestigations: analyticsData.activeInvestigations || 0,
      });
    } else if (people.length > 0) {
      const highRisk = people.filter((p) => (p.red_flag_rating ?? 0) >= 4).length;
      const totalMentions = people.reduce((acc, p) => acc + (p.mentions || 0), 0);
      const avgRedFlag =
        people.reduce((acc, p) => acc + (p.red_flag_rating || 0), 0) / people.length;

      const uniqueRoles = new Set<string>();
      people.forEach((p) => {
        if (p.role) uniqueRoles.add(p.role);

        if (p.secondaryRoles && Array.isArray(p.secondaryRoles)) {
          p.secondaryRoles.forEach((r) => uniqueRoles.add(r));
        } else if (p.secondary_roles) {
          p.secondary_roles.split(',').forEach((r) => uniqueRoles.add(r.trim()));
        }
      });

      setStats({
        totalPeople: people.length,
        highRisk,
        totalMentions,
        avgRedFlag,
        uniqueRoles: uniqueRoles.size,
        activeInvestigations: 0,
      });
    }
  }, [people, analyticsData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-400 glass-panel rounded-xl">
        <AlertTriangle className="mx-auto h-12 w-12 mb-4 opacity-80" />
        <p className="text-lg mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 border border-slate-600 transition-all hover:scale-105"
        >
          Retry Analysis
        </button>
      </div>
    );
  }

  // Junk entity filter patterns - excludes non-person entities
  const JUNK_PATTERNS = [
    /^The\s/i,
    /\sLike$/i,
    /\sLike\s/i,
    /^They\s/i,
    /\sPrinted/i,
    /\sTowers$/i,
    /^Multiple\s/i,
    /\sMac\s/i,
    /Desktop/i,
    /^Estate\s/i,
    /\sEstate$/i,
    /^Closed\s/i,
    /Contai/i,
    /sensit/i,
    /\sStreet$/i,
    /\sBeach$/i,
    /\sCliffs$/i,
    /\sJames$/i,
    /\sIsland$/i,
    /^New\s/i,
    /Mexico$/i,
    /York/i,
    /\sTimes$/i,
    /^Palm/i,
    /^Wall\s/i,
    /^Little\s/i,
    /^Englewood/i,
    /\d/,
    /^Judge\s.*\s/i,
    // Banking / financial junk
    /Pricing$/i,
    /Checking$/i,
    /Subtractions$/i,
    /Additions$/i,
    /Interest\s/i,
    /^Your\s/i,
    /^Other\s/i,
    /Advantage/i,
    /^sted\s/i,
    /^iered\s/i,
    // Organizations / companies
    /Automobiles$/i,
    /^Zorro\s/i,
    /^Zeero\s/i,
    /Management\sGroup$/i,
    /^estigative\s/i,
    /^Contact\sUs$/i,
    /\sGroup$/i,
    /\sInc$/i,
    /\sLLC$/i,
    /\sCorp$/i,
    /\sLtd$/i,
    /^St\s[A-Z][a-z]+$/, // "St Thomas" etc - places not people
    // Specific exclusions from user feedback
    /All\sRights\sReserved/i,
    /We\sDeliver\sFor/i,
    /Warner\sCable/i,
    /Valuable\sArticles/i,
    /Uh\sFloor/i,
    /Trusted\sDy\sProfessional/i,
    /Taxes\sCellular/i,
    /Sundar\sMonday/i,
    /Tittery\sEpstein/i,
    /Had\sEpstein/i,
    /Timo$/i,
    // Truncated/partial names (starts lowercase or looks like partial word)
    /^[a-z]/,
  ];

  const isJunkEntity = (name: string): boolean => {
    if (!name || name.length <= 3) return true;
    return JUNK_PATTERNS.some((pattern) => pattern.test(name));
  };

  // Filter people to only Person types, excluding junk
  const filteredPersons = people.filter((p) => {
    if (!p.name || isJunkEntity(p.name)) return false;
    const entityType = (p as any).type;
    if (entityType && entityType !== 'Person' && entityType !== 'Unknown') return false;
    return true;
  });

  // Prepare Data
  const riskDistribution = [
    {
      name: 'High Risk (4-5)',
      value: filteredPersons.filter((p) => (p.red_flag_rating ?? 0) >= 4).length,
      color: COLORS.HIGH,
    },
    {
      name: 'Medium Risk (2-3)',
      value: filteredPersons.filter(
        (p) => (p.red_flag_rating ?? 0) >= 2 && (p.red_flag_rating ?? 0) < 4,
      ).length,
      color: COLORS.MEDIUM,
    },
    {
      name: 'Low Risk (0-1)',
      value: filteredPersons.filter((p) => (p.red_flag_rating ?? 0) < 2).length,
      color: COLORS.LOW,
    },
  ];

  // Filter topEntities from analytics data as well
  const rawTopEntities =
    analyticsData?.topEntities ||
    filteredPersons
      .sort((a, b) => (b.mentions || 0) - (a.mentions || 0))
      .slice(0, 15)
      .map((p) => ({
        name: p.name,
        mentions: p.mentions,
        redFlagRating: p.red_flag_rating ?? 0,
        person: p,
      }));

  // Apply junk filter to topEntities (even from API)
  const topEntities = rawTopEntities.filter((e: any) => !isJunkEntity(e.name));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Entities Bar Chart - Enhanced */}
        <div className="glass-card p-6 rounded-xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="h-24 w-24 text-cyan-500" />
          </div>

          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 flex-wrap relative z-10">
            <Users className="h-5 w-5 text-cyan-400" />
            <span className="neon-text-cyan">Top Mentioned Individuals</span>
          </h3>

          {/* Microcopy for Top Entities Chart */}
          <div className="text-xs text-slate-400 mb-6 flex items-start gap-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 backdrop-blur-sm relative z-10">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-cyan-400" />
            <span>
              Individuals with the highest frequency of appearances across all analyzed documents.
              Colors indicate risk level. Click to view details.
            </span>
          </div>

          <div className="h-[400px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topEntities.slice(0, 15)}
                layout="vertical"
                margin={{ left: 0, right: 30, top: 0, bottom: 0 }}
              >
                <defs>
                  {topEntities.slice(0, 15).map((entry: any, index: number) => (
                    <linearGradient
                      key={`gradient-${index}`}
                      id={`barGradient-${index}`}
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop
                        offset="0%"
                        stopColor={
                          entry.redFlagRating >= 5
                            ? '#581c87'
                            : entry.redFlagRating >= 4
                              ? '#b91c1c'
                              : '#1d4ed8'
                        }
                        stopOpacity={0.7}
                      />
                      <stop
                        offset="100%"
                        stopColor={
                          entry.redFlagRating >= 5
                            ? '#7e22ce'
                            : entry.redFlagRating >= 4
                              ? '#ef4444'
                              : '#3b82f6'
                        }
                        stopOpacity={1}
                      />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  horizontal={false}
                  vertical={true}
                  opacity={0.3}
                />
                <XAxis
                  type="number"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#94a3b8"
                  fontSize={11}
                  width={130}
                  tick={{ fill: '#e2e8f0', cursor: 'pointer' }}
                  tickLine={false}
                  axisLine={false}
                  onClick={(data) => {
                    // Creating a map to find person by name since YAxis click returns simple data
                    const person = topEntities.find((p: any) => p.name === data.value)?.person;
                    if (person && onPersonSelect) onPersonSelect(person);
                  }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff', opacity: 0.05 }} />
                <Bar
                  dataKey="mentions"
                  radius={[0, 4, 4, 0]}
                  barSize={18}
                  animationDuration={1000}
                  onClick={(data) => {
                    if (data.person && onPersonSelect) onPersonSelect(data.person);
                  }}
                  className="cursor-pointer"
                >
                  {topEntities.slice(0, 15).map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`url(#barGradient-${index})`}
                      className="hover:opacity-80 transition-opacity"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution Pie Chart */}
        <div className="glass-card p-6 rounded-xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShieldAlert className="h-24 w-24 text-orange-500" />
          </div>

          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 relative z-10">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            <span>Risk Level Distribution</span>
          </h3>
          {/* Microcopy for Risk Distribution Chart */}
          <div className="text-xs text-slate-400 mb-6 flex items-start gap-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 backdrop-blur-sm relative z-10">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-400" />
            <span>
              Breakdown of entities by Red Flag Index score (0-5), indicating the density of
              connection to illicit activities.
            </span>
          </div>
          <div className="h-[400px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                {stats.totalPeople.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 uppercase tracking-wider mt-1 font-semibold">
                Entities
              </span>
            </div>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 mt-4 relative z-10">
            {riskDistribution.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-1 bg-slate-900/40 rounded-full border border-slate-700/30"
              >
                <div
                  className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-slate-300 font-medium">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Tree Map */}
      <div className="glass-card p-6 rounded-xl shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 relative z-10">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-400" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              Interactive Entity Map
            </span>
          </h3>
          <span className="text-xs font-medium px-3 py-1 bg-purple-500/10 text-purple-300 rounded-full border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
            Top 50 by Mentions
          </span>
        </div>

        {/* Microcopy for Tree Map */}
        <div className="text-xs text-slate-400 mb-6 flex items-start gap-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 backdrop-blur-sm relative z-10">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-purple-400" />
          <span>
            Visual representation of entity prominence. Box size correlates to mention frequency.
            Click any box to view detailed evidence.
          </span>
        </div>

        <div className="relative z-10">
          <TreeMap people={people} onPersonClick={onPersonSelect} />
        </div>
      </div>

      {/* Summary Statistics Footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl hover:bg-slate-800/60 transition-colors group">
          <div className="text-3xl font-bold text-white font-mono group-hover:text-cyan-400 transition-colors">
            {stats.totalPeople.toLocaleString()}
          </div>
          <div className="text-slate-400 text-xs mt-1 font-medium uppercase tracking-wide flex items-center gap-1">
            Total Individuals
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl hover:bg-slate-800/60 transition-colors group">
          <div className="text-3xl font-bold text-white font-mono group-hover:text-blue-400 transition-colors">
            {stats.totalPeople > 0 ? Math.round(stats.totalMentions / stats.totalPeople) : 0}
          </div>
          <div className="text-slate-400 text-xs mt-1 font-medium uppercase tracking-wide">
            Avg Mentions
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl hover:bg-slate-800/60 transition-colors group">
          <div className="text-3xl font-bold text-white font-mono group-hover:text-purple-400 transition-colors">
            {stats.uniqueRoles.toLocaleString()}
          </div>
          <div className="text-slate-400 text-xs mt-1 font-medium uppercase tracking-wide">
            Unique Roles
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl hover:bg-slate-800/60 transition-colors group">
          <div className="text-3xl font-bold text-white font-mono group-hover:text-pink-400 transition-colors">
            {people.length > 0
              ? Math.max(...people.map((p) => p?.mentions || 0)).toLocaleString()
              : '0'}
          </div>
          <div className="text-slate-400 text-xs mt-1 font-medium uppercase tracking-wide">
            Max Mentions
          </div>
        </div>
      </div>
    </div>
  );
};
