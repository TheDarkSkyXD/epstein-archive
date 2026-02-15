import Icon from '../common/Icon';
import { useCountUp } from '../../hooks/useCountUp';

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
  const highRiskCount = useCountUp(stats.highRisk, 1400);
  const mediumRiskCount = useCountUp(stats.mediumRisk, 1600);
  const lowRiskCount = useCountUp(stats.lowRisk, 1800);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 mb-4">
      <button
        onClick={onResetFilters}
        className="surface-glass p-3 text-left hover:border-cyan-400/40 transition-colors"
        title="Reset all filters"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] tracking-[0.12em] uppercase text-slate-400">Subjects</span>
          <Icon name="Users" size="xs" color="info" />
        </div>
        <div className="text-2xl md:text-3xl font-semibold text-white tabular-nums">
          {stats.totalPeople.toLocaleString()}
        </div>
      </button>

      <RiskStat
        label="High Risk"
        icon="AlertTriangle"
        tone="high"
        value={highRiskCount}
        active={selectedRiskLevel === 'HIGH'}
        onClick={() => onRiskLevelClick?.('HIGH')}
      />
      <RiskStat
        label="Medium Risk"
        icon="ShieldAlert"
        tone="medium"
        value={mediumRiskCount}
        active={selectedRiskLevel === 'MEDIUM'}
        onClick={() => onRiskLevelClick?.('MEDIUM')}
      />
      <RiskStat
        label="Low Risk"
        icon="ShieldCheck"
        tone="low"
        value={lowRiskCount}
        active={selectedRiskLevel === 'LOW'}
        onClick={() => onRiskLevelClick?.('LOW')}
      />
    </div>
  );
}

function RiskStat({
  label,
  icon,
  tone,
  value,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  tone: 'high' | 'medium' | 'low';
  value: number;
  active?: boolean;
  onClick: () => void;
}) {
  const toneClass = {
    high: 'text-rose-300 border-rose-300/25',
    medium: 'text-amber-200 border-amber-300/25',
    low: 'text-emerald-200 border-emerald-300/25',
  }[tone];

  return (
    <button
      onClick={onClick}
      className={`surface-glass p-3 text-left transition-colors ${active ? 'ring-2 ring-cyan-400/45' : ''}`}
      title={`Filter by ${label}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] tracking-[0.12em] uppercase text-slate-400">{label}</span>
        <span className={`chip h-6 px-2 flex items-center ${toneClass}`}>
          <Icon name={icon as any} size="xs" />
        </span>
      </div>
      <div className="text-2xl md:text-3xl font-semibold text-white tabular-nums">
        {value.toLocaleString()}
      </div>
    </button>
  );
}
