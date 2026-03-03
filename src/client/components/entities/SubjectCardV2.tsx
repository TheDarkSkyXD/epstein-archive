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
import Tooltip from '../common/Tooltip';
import { riskToneFromRating } from '../../utils/riskSemantics';
import { useAuth } from '../../contexts/AuthContext';

interface SubjectCardV2Props {
  subject: SubjectCardDTO;
  style?: React.CSSProperties; // Required for react-window
  onClick?: () => void;
}

const SubjectCardV2: React.FC<SubjectCardV2Props> = React.memo(
  ({ subject, style, onClick }) => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const topPhotoId = (subject as any).topPhotoId as string | undefined;
    const [avatarUrl, setAvatarUrl] = React.useState<string | null>(
      isAuthenticated && topPhotoId ? `/api/media/images/${topPhotoId}/thumbnail` : null,
    );

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
    const riskRating = Number(
      (forensics as any).red_flag_objective ||
        (forensics as any).red_flag_subjective ||
        (subject as any).red_flag_rating ||
        0,
    );
    const riskTone = riskToneFromRating(riskRating);

    const handleCardClick = () => {
      if (onClick) onClick();
      else navigate(`/entity/${subject.id}`);
    };

    const handleProfileClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      navigate(`/entity/${subject.id}`);
    };

    React.useEffect(() => {
      let active = true;
      if (!isAuthenticated) {
        setAvatarUrl(null);
        return () => {
          active = false;
        };
      }
      if (topPhotoId) {
        setAvatarUrl(`/api/media/images/${topPhotoId}/thumbnail`);
        return () => {
          active = false;
        };
      }
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
    }, [isAuthenticated, subject.id, subject.stats?.verified_media, topPhotoId]);
    return (
      <div style={style}>
        <div
          data-testid="subject-card"
          onClick={handleCardClick}
          className="group relative surface-glass-card p-4 cursor-pointer transition-all duration-300 hover:border-slate-300/35 flex flex-col h-full w-full"
          style={{
            boxShadow: `inset 0 1px 0 rgba(248,250,252,0.05), 0 12px 26px rgba(2,6,23,0.36), 0 0 0 1px color-mix(in srgb, ${riskTone.cssVar} 22%, transparent)`,
          }}
        >
          <div className="flex items-start gap-3 mb-2">
            <div className="flex-shrink-0 relative w-10 h-10 rounded-[var(--radius-md)] overflow-hidden border border-slate-700 bg-slate-950">
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
                <EvidenceBadge
                  level={forensics.evidence_ladder as any}
                  ratingObjective={(forensics as any).red_flag_objective as number | undefined}
                  ratingSubjective={(forensics as any).red_flag_subjective as number | undefined}
                />
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider truncate">
                {subject.role}
              </div>
            </div>
          </div>

          <div className="mb-2">
            <SignalPanel metrics={forensics.signal_strength} />
            <div className="mt-2 text-[10px] text-slate-500 flex flex-wrap gap-1">
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

          <div className="grid grid-cols-3 gap-1 py-2 border-t border-slate-700/50 mb-auto">
            <Metric label="Mentions" value={stats.mentions} />
            <Metric label="Docs" value={stats.documents} />
            <Metric label="Sources" value={stats.distinct_sources} />
          </div>

          <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between">
            <Tooltip content="Add this entity to the current investigation" position="top-end">
              <span>
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
              </span>
            </Tooltip>
            <Tooltip content="Open full profile for this entity" position="top-end">
              <button
                onClick={handleProfileClick}
                className="text-[10px] font-bold uppercase tracking-wider text-cyan-500 hover:text-cyan-400 flex items-center gap-1"
              >
                View <Icon name="ArrowRight" size="xs" />
              </button>
            </Tooltip>
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
}) => {
  const descriptions: Record<string, string> = {
    Mentions: 'Total mentions across documents. Higher implies broader exposure.',
    Docs: 'Approximate count of documents mentioning this entity.',
    Sources: 'Distinct evidence types associated with this entity.',
    Media: 'Verified photos or media linked to this entity.',
  };
  const content = descriptions[label] || '';
  return (
    <Tooltip content={content} position="top">
      <div className="flex flex-col items-center">
        <span className="text-[8px] uppercase text-slate-500 font-bold tracking-wider">
          {label}
        </span>
        <span
          className={`text-[10px] font-mono ${highlight ? 'text-amber-400' : 'text-slate-300'}`}
        >
          {formatNumber(value)}
        </span>
      </div>
    </Tooltip>
  );
};

export default SubjectCardV2;
