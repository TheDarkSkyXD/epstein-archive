import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SubjectCardDTO } from '../../types';
import { formatNumber } from '../../utils/search';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';
import Icon from '../common/Icon';
import { getEntityTypeIcon } from '../../utils/entityTypeIcons';
import { SignalPanel } from './cards/SignalPanel';
import { EvidenceBadge } from './cards/EvidenceBadge';
import { DriverChips } from './cards/DriverChips';

interface SubjectCardV2Props {
  subject: SubjectCardDTO;
  style?: React.CSSProperties; // Required for react-window
  onClick?: () => void;
}

const SubjectCardV2: React.FC<SubjectCardV2Props> = React.memo(
  ({ subject, style, onClick }) => {
    const navigate = useNavigate();
    const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);

    // Safety fallbacks
    const stats = subject.stats || {
      mentions: 0,
      documents: 0,
      distinct_sources: 0,
      verified_media: 0,
    };
    const forensics = subject.forensics || {
      risk_level: 'LOW',
      evidence_ladder: 'NONE',
      signal_strength: { exposure: 0, connectivity: 0, corroboration: 0 },
      driver_labels: [],
    };

    const handleCardClick = () => {
      if (onClick) onClick();
      else navigate(`/entities/${subject.id}`);
    };

    const handleProfileClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      navigate(`/entities/${subject.id}`);
    };

    React.useEffect(() => {
      let active = true;
      const hasMedia = (subject.stats?.verified_media || 0) > 0;
      if (!hasMedia) {
        setAvatarUrl(null);
        return;
      }
      (async () => {
        try {
          const res = await fetch(`/api/entities/${subject.id}/media`, { credentials: 'include' });
          const data = await res.json();
          const firstImage = Array.isArray(data)
            ? data.find((m: any) => {
                const t = String(m.file_type || m.type || '').toLowerCase();
                return t.startsWith('image');
              })
            : null;
          if (active && firstImage?.id) {
            setAvatarUrl(`/api/media/images/${firstImage.id}/thumbnail`);
          }
        } catch {
          // ignore
        }
      })();
      return () => {
        active = false;
      };
    }, [subject.id, subject.stats?.verified_media]);
    return (
      <div style={style}>
        <div
          onClick={handleCardClick}
          className="group relative bg-slate-900/90 backdrop-blur-sm border border-slate-800 hover:border-slate-600 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,0,0,0.5)] flex flex-col h-full w-full"
        >
          {/* 1. IDENTITY HEADER */}
          <div className="flex items-start gap-3 mb-2">
            {/* Avatar / Icon */}
            <div className="flex-shrink-0 relative w-10 h-10 rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={subject.name}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600">
                  {getEntityTypeIcon('Person', 'sm', subject.role)}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100 truncate group-hover:text-cyan-400 transition-colors">
                  {subject.name}
                </h3>
                <EvidenceBadge level={forensics.evidence_ladder as any} />
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider truncate">
                {subject.role}
              </div>
            </div>
          </div>

          {/* 2. SIGNAL BLOCK */}
          <div className="mb-2 bg-slate-950/50 rounded-lg p-2 border border-slate-800/50">
            <SignalPanel metrics={forensics.signal_strength} />
            <div className="mt-2 text-[10px] text-slate-500 flex flex-wrap gap-1">
              {/* Driver Chips Lite - we can use the component or just raw spans for max speed if component is heavy. Component is lean. */}
              <DriverChips
                chips={forensics.driver_labels.map((label) => {
                  let type: 'critical' | 'verified' | 'context' | 'unverified' = 'context';
                  const l = label.toLowerCase();
                  if (l.includes('black book') || l.includes('flight')) type = 'critical';
                  else if (l.includes('photo') || l.includes('verified')) type = 'verified';
                  else if (l.includes('ai') || l.includes('derived')) type = 'unverified';

                  return { label, type };
                })}
              />
            </div>
          </div>

          {/* 3. METRICS GRID */}
          <div className="grid grid-cols-4 gap-1 py-2 border-t border-slate-800/50 mb-auto">
            <Metric label="Mentions" value={stats.mentions} />
            <Metric label="Docs" value={stats.documents} />
            <Metric label="Sources" value={stats.distinct_sources} />
            <Metric
              label="Media"
              value={stats.verified_media}
              highlight={stats.verified_media > 0}
            />
          </div>

          {/* 4. FOOTER */}
          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
            <AddToInvestigationButton
              item={{
                id: subject.id,
                title: subject.name,
                description: subject.role,
                type: 'entity',
                sourceId: subject.id,
              }}
              variant="icon"
            />
            <button
              onClick={handleProfileClick}
              className="text-[10px] font-bold uppercase tracking-wider text-cyan-500 hover:text-cyan-400 flex items-center gap-1"
            >
              View <Icon name="ArrowRight" size="xs" />
            </button>
          </div>
        </div>
      </div>
    );
  },
  (prev, next) => prev.subject.id === next.subject.id,
); // Strict equality check on ID for memoization if props are stable

const Metric = ({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) => (
  <div className="flex flex-col items-center">
    <span className="text-[8px] uppercase text-slate-500 font-bold tracking-wider">{label}</span>
    <span className={`text-[10px] font-mono ${highlight ? 'text-amber-400' : 'text-slate-300'}`}>
      {formatNumber(value)}
    </span>
  </div>
);

export default SubjectCardV2;
