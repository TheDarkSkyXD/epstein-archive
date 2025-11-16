import React from 'react';
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
  AreaChart,
  Area,
  ResponsiveContainer,
  Treemap
} from 'recharts';
import { Person } from '../types';

interface DataVisualizationProps {
  people: Person[];
}

const COLORS = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#10b981',
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  accent: '#06b6d4'
};

export const DataVisualization: React.FC<DataVisualizationProps> = ({ people }) => {
  // Prepare data for visualizations
  const likelihoodData = [
    { name: 'HIGH', value: people.filter(p => p.likelihood_score === 'HIGH').length, color: COLORS.HIGH },
    { name: 'MEDIUM', value: people.filter(p => p.likelihood_score === 'MEDIUM').length, color: COLORS.MEDIUM },
    { name: 'LOW', value: people.filter(p => p.likelihood_score === 'LOW').length, color: COLORS.LOW }
  ];

  const topMentions = people
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 10)
    .map(person => ({
      name: person.name.length > 20 ? person.name.substring(0, 20) + '...' : person.name,
      mentions: person.mentions,
      level: person.likelihood_score
    }));

  const roleData = people.reduce((acc, person) => {
    // Extract role from evidence types or use a default
    const role = person.evidence_types?.[0] || 'Unknown';
    const existing = acc.find(item => item.name === role);
    if (existing) {
      existing.count += 1;
      existing.totalMentions += person.mentions;
    } else {
      acc.push({ name: role, count: 1, totalMentions: person.mentions });
    }
    return acc;
  }, [] as { name: string; count: number; totalMentions: number }[])
  .sort((a, b) => b.count - a.count)
  .slice(0, 8);

  const statusData = people.reduce((acc, person) => {
    const status = person.likelihood_score; // Use likelihood score as status
    const existing = acc.find(item => item.name === status);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ name: status, count: 1 });
    }
    return acc;
  }, [] as { name: string; count: number }[]);

  const treemapData = people.map(person => ({
    name: person.name,
    size: person.mentions,
    level: person.likelihood_score
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 p-3 rounded-lg shadow-lg border border-gray-700">
          <p className="text-white font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-gray-300" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-red-900 to-red-700 p-6 rounded-xl">
          <div className="text-3xl font-bold text-white">
            {people.filter(p => p.likelihood_score === 'HIGH').length}
          </div>
          <div className="text-red-200">High Risk Individuals</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-900 to-yellow-700 p-6 rounded-xl">
          <div className="text-3xl font-bold text-white">
            {people.filter(p => p.likelihood_score === 'MEDIUM').length}
          </div>
          <div className="text-yellow-200">Medium Risk Individuals</div>
        </div>
        <div className="bg-gradient-to-br from-green-900 to-green-700 p-6 rounded-xl">
          <div className="text-3xl font-bold text-white">
            {people.filter(p => p.likelihood_score === 'LOW').length}
          </div>
          <div className="text-green-200">Low Risk Individuals</div>
        </div>
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 p-6 rounded-xl">
          <div className="text-3xl font-bold text-white">
            {people.reduce((sum, p) => sum + p.mentions, 0).toLocaleString()}
          </div>
          <div className="text-blue-200">Total Mentions</div>
        </div>
      </div>

      {/* Top Row - Likelihood Distribution and Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-800 p-6 rounded-xl">
          <h3 className="text-xl font-bold text-white mb-4">Likelihood Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={likelihoodData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }: any) => `${name}: ${value} (${(percent ? percent * 100 : 0).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {likelihoodData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl">
          <h3 className="text-xl font-bold text-white mb-4">Current Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="name" 
                stroke="#9ca3af"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#9ca3af" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Mentions Chart */}
      <div className="bg-gray-800 p-6 rounded-xl">
        <h3 className="text-xl font-bold text-white mb-4">Top 10 Most Mentioned Individuals</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={topMentions} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" stroke="#9ca3af" />
            <YAxis 
              type="category" 
              dataKey="name" 
              stroke="#9ca3af"
              width={150}
              fontSize={12}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="mentions" 
              fill={COLORS.HIGH}
              radius={[0, 4, 4, 0]}
            >
              {topMentions.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={
                  entry.level === 'HIGH' ? COLORS.HIGH :
                  entry.level === 'MEDIUM' ? COLORS.MEDIUM :
                  entry.level === 'LOW' ? COLORS.LOW : COLORS.primary
                } />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Role Distribution */}
      <div className="bg-gray-800 p-6 rounded-xl">
        <h3 className="text-xl font-bold text-white mb-4">Role Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={roleData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="name" 
              stroke="#9ca3af"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis stroke="#9ca3af" />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="count" 
              stackId="1" 
              stroke={COLORS.secondary}
              fill={COLORS.secondary}
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Treemap Visualization */}
      <div className="bg-gray-800 p-6 rounded-xl">
        <h3 className="text-xl font-bold text-white mb-4">Mentions Treemap</h3>
        <ResponsiveContainer width="100%" height={400}>
          <Treemap
            data={treemapData}
            dataKey="size"
            aspectRatio={4/3}
            stroke="#1f2937"
            fill="#3b82f6"
            content={({ x, y, width, height, index, name, size }) => {
              const fontSize = Math.min(width / 8, height / 4, 14);
              return (
                <g>
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={
                      treemapData[index].level === 'HIGH' ? COLORS.HIGH :
                      treemapData[index].level === 'MEDIUM' ? COLORS.MEDIUM :
                      treemapData[index].level === 'LOW' ? COLORS.LOW : COLORS.primary
                    }
                    stroke="#1f2937"
                    strokeWidth={2}
                    rx={4}
                  />
                  {width > 50 && height > 30 && (
                    <>
                      <text
                        x={x + width / 2}
                        y={y + height / 2 - fontSize / 2}
                        textAnchor="middle"
                        fill="white"
                        fontSize={fontSize}
                        fontWeight="bold"
                      >
                        {name.length > 15 ? name.substring(0, 15) + '...' : name}
                      </text>
                      <text
                        x={x + width / 2}
                        y={y + height / 2 + fontSize / 2}
                        textAnchor="middle"
                        fill="white"
                        fontSize={fontSize * 0.8}
                      >
                        {size.toLocaleString()}
                      </text>
                    </>
                  )}
                </g>
              );
            }}
          />
        </ResponsiveContainer>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-900 to-purple-700 p-4 rounded-lg">
          <div className="text-2xl font-bold text-white">
            {people.length}
          </div>
          <div className="text-purple-200 text-sm">Total Individuals</div>
        </div>
        <div className="bg-gradient-to-br from-indigo-900 to-indigo-700 p-4 rounded-lg">
          <div className="text-2xl font-bold text-white">
            {Math.round(people.reduce((sum, p) => sum + p.mentions, 0) / people.length)}
          </div>
          <div className="text-indigo-200 text-sm">Avg Mentions</div>
        </div>
        <div className="bg-gradient-to-br from-pink-900 to-pink-700 p-4 rounded-lg">
          <div className="text-2xl font-bold text-white">
            {roleData.length}
          </div>
          <div className="text-pink-200 text-sm">Unique Roles</div>
        </div>
        <div className="bg-gradient-to-br from-teal-900 to-teal-700 p-4 rounded-lg">
          <div className="text-2xl font-bold text-white">
            {Math.max(...people.map(p => p.mentions)).toLocaleString()}
          </div>
          <div className="text-teal-200 text-sm">Max Mentions</div>
        </div>
      </div>
    </div>
  );
};