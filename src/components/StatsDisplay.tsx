import { useCountUp } from '../hooks/useCountUp';

interface StatsDisplayProps {
  stats: {
    totalPeople: number;
    totalFiles: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    totalMentions: number;
  };
  selectedRiskLevel?: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  onRiskLevelClick?: (level: 'HIGH' | 'MEDIUM' | 'LOW') => void;
  onResetFilters?: () => void;
}

export function StatsDisplay({
  stats,
  selectedRiskLevel,
  onRiskLevelClick,
  onResetFilters,
}: StatsDisplayProps) {
  // Animate all stats with count-up effect
  const highRiskCount = useCountUp(stats.highRisk, 1400);
  const mediumRiskCount = useCountUp(stats.mediumRisk, 1600);
  const lowRiskCount = useCountUp(stats.lowRisk, 1800);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
      <button
        onClick={onResetFilters}
        className="bg-gradient-to-br from-cyan-900 to-cyan-700 p-3 rounded-xl transform transition-all duration-300 hover:scale-105 border border-cyan-500/30 shadow-lg shadow-cyan-900/20 cursor-pointer text-left"
        title="Click to reset all filters"
      >
        <div className="text-xl md:text-2xl font-bold text-white tabular-nums">
          {stats.totalPeople.toLocaleString()}
        </div>
        <div className="text-cyan-200 text-[10px] md:text-xs uppercase tracking-wider font-semibold">
          Subjects
        </div>
      </button>

      <button
        onClick={() => onRiskLevelClick?.('HIGH')}
        className={`bg-gradient-to-br from-red-900 to-red-700 p-3 rounded-xl transform transition-all duration-300 border cursor-pointer text-left ${
          selectedRiskLevel === 'HIGH'
            ? 'scale-105 ring-2 ring-red-400 shadow-lg shadow-red-500/50 border-red-400'
            : 'hover:scale-105 border-red-500/30 hover:shadow-lg'
        }`}
        title="Click to filter by High Risk"
      >
        <div className="text-xl md:text-2xl font-bold text-white tabular-nums">
          {highRiskCount.toLocaleString()}
        </div>
        <div className="text-red-200 text-[10px] md:text-xs uppercase tracking-wider font-semibold">
          High Risk
        </div>
      </button>

      <button
        onClick={() => onRiskLevelClick?.('MEDIUM')}
        className={`bg-gradient-to-br from-yellow-900 to-yellow-700 p-3 rounded-xl transform transition-all duration-300 border cursor-pointer text-left ${
          selectedRiskLevel === 'MEDIUM'
            ? 'scale-105 ring-2 ring-yellow-400 shadow-lg shadow-yellow-500/50 border-yellow-400'
            : 'hover:scale-105 border-yellow-500/30 hover:shadow-lg'
        }`}
        title="Click to filter by Medium Risk"
      >
        <div className="text-xl md:text-2xl font-bold text-white tabular-nums">
          {mediumRiskCount.toLocaleString()}
        </div>
        <div className="text-yellow-200 text-[10px] md:text-xs uppercase tracking-wider font-semibold">
          Medium Risk
        </div>
      </button>

      <button
        onClick={() => onRiskLevelClick?.('LOW')}
        className={`bg-gradient-to-br from-green-900 to-green-700 p-3 rounded-xl transform transition-all duration-300 border cursor-pointer text-left ${
          selectedRiskLevel === 'LOW'
            ? 'scale-105 ring-2 ring-green-400 shadow-lg shadow-green-500/50 border-green-400'
            : 'hover:scale-105 border-green-500/30 hover:shadow-lg'
        }`}
        title="Click to filter by Low Risk"
      >
        <div className="text-xl md:text-2xl font-bold text-white tabular-nums">
          {lowRiskCount.toLocaleString()}
        </div>
        <div className="text-green-200 text-[10px] md:text-xs uppercase tracking-wider font-semibold">
          Low Risk
        </div>
      </button>
    </div>
  );
}
