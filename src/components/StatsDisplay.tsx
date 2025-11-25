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
}

export function StatsDisplay({ stats }: StatsDisplayProps) {
  // Animate all stats with count-up effect

  const totalMentionsCount = useCountUp(stats.totalMentions, 1200);
  const highRiskCount = useCountUp(stats.highRisk, 1400);
  const mediumRiskCount = useCountUp(stats.mediumRisk, 1600);
  const lowRiskCount = useCountUp(stats.lowRisk, 1800);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-8">


      <div className="bg-gradient-to-br from-blue-900 to-blue-700 p-3 md:p-4 rounded-xl transform transition-all duration-300 hover:scale-105">
        <div className="text-2xl md:text-3xl font-bold text-white tabular-nums">
          {totalMentionsCount.toLocaleString()}
        </div>
        <div className="text-blue-200 text-xs md:text-sm">Total Mentions</div>
      </div>

      <div className="bg-gradient-to-br from-red-900 to-red-700 p-3 md:p-4 rounded-xl transform transition-all duration-300 hover:scale-105">
        <div className="text-2xl md:text-3xl font-bold text-white tabular-nums">
          {highRiskCount.toLocaleString()}
        </div>
        <div className="text-red-200 text-xs md:text-sm">High Risk</div>
      </div>

      <div className="bg-gradient-to-br from-yellow-900 to-yellow-700 p-3 md:p-4 rounded-xl transform transition-all duration-300 hover:scale-105">
        <div className="text-2xl md:text-3xl font-bold text-white tabular-nums">
          {mediumRiskCount.toLocaleString()}
        </div>
        <div className="text-yellow-200 text-xs md:text-sm">Medium Risk</div>
      </div>

      <div className="bg-gradient-to-br from-green-900 to-green-700 p-3 md:p-4 rounded-xl transform transition-all duration-300 hover:scale-105">
        <div className="text-2xl md:text-3xl font-bold text-white tabular-nums">
          {lowRiskCount.toLocaleString()}
        </div>
        <div className="text-green-200 text-xs md:text-sm">Low Risk</div>
      </div>
    </div>
  );
}
