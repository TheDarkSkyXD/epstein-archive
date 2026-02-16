export type RiskSemanticLevel = 'critical' | 'high' | 'medium' | 'low' | 'minimal' | 'unknown';

export interface RiskSemanticTone {
  level: RiskSemanticLevel;
  className: string;
  label: string;
  cssVar: string;
}

export const riskToneFromRating = (rating: number | null | undefined): RiskSemanticTone => {
  const value = Number.isFinite(Number(rating)) ? Number(rating) : -1;

  if (value >= 5) {
    return {
      level: 'critical',
      className: 'risk-critical',
      label: 'Critical',
      cssVar: 'var(--risk-critical)',
    };
  }
  if (value >= 4) {
    return { level: 'high', className: 'risk-high', label: 'High', cssVar: 'var(--risk-high)' };
  }
  if (value >= 3) {
    return {
      level: 'medium',
      className: 'risk-medium',
      label: 'Medium',
      cssVar: 'var(--risk-medium)',
    };
  }
  if (value >= 2) {
    return { level: 'low', className: 'risk-low', label: 'Low', cssVar: 'var(--risk-low)' };
  }
  if (value >= 1) {
    return {
      level: 'minimal',
      className: 'risk-minimal',
      label: 'Minimal',
      cssVar: 'var(--risk-minimal)',
    };
  }
  return {
    level: 'unknown',
    className: 'risk-unknown',
    label: 'Unknown',
    cssVar: 'var(--risk-unknown)',
  };
};
