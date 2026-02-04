import React from 'react';
import { ShieldCheck, ShieldAlert, BadgeCheck, ExternalLink, HelpCircle } from 'lucide-react';

interface Claim {
  id: number;
  subject_name: string;
  predicate: string;
  object_name: string;
  modality: 'alleged' | 'testified' | 'documented' | 'quoted' | 'inferred' | 'denied' | 'unknown';
  confidence: number;
  evidence_json?: string;
  sentence_id?: number;
}

interface ClaimsListProps {
  claims: Claim[];
}

export function ClaimsList({ claims }: ClaimsListProps) {
  const [feedback, setFeedback] = React.useState<Record<number, 'verified' | 'rejected' | null>>(
    {},
  );

  if (!claims || claims.length === 0) return null;

  const handleFeedback = async (id: number, type: 'verify' | 'reject') => {
    try {
      const response = await fetch(`/api/active-learning/claims/${id}/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body:
          type === 'reject'
            ? JSON.stringify({ rejection_reason: 'User manual rejection' })
            : JSON.stringify({}),
      });

      if (response.ok) {
        setFeedback((prev) => ({ ...prev, [id]: type === 'verify' ? 'verified' : 'rejected' }));
      }
    } catch (err) {
      console.error('Failed to send feedback:', err);
    }
  };

  const getModalityIcon = (modality: string) => {
    switch (modality) {
      case 'testified':
      case 'documented':
        return (
          <span title="High Reliability">
            <ShieldCheck className="w-4 h-4 text-green-600" />
          </span>
        );
      case 'alleged':
      case 'denied':
        return (
          <span title="Disputed/Alleged">
            <ShieldAlert className="w-4 h-4 text-orange-600" />
          </span>
        );
      case 'inferred':
        return (
          <span title="Inferred by System">
            <HelpCircle className="w-4 h-4 text-blue-600" />
          </span>
        );
      default:
        return (
          <span title="Fact">
            <BadgeCheck className="w-4 h-4 text-gray-400" />
          </span>
        );
    }
  };

  const ModalityBadge = ({ modality }: { modality: string }) => {
    const colors: Record<string, string> = {
      testified: 'bg-green-100 text-green-800',
      documented: 'bg-green-100 text-green-800',
      alleged: 'bg-orange-100 text-orange-800',
      denied: 'bg-red-100 text-red-800',
      inferred: 'bg-blue-100 text-blue-800',
      quoted: 'bg-gray-100 text-gray-800',
      unknown: 'bg-gray-100 text-gray-600',
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide ${
          colors[modality] || colors.unknown
        }`}
      >
        {modality}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <BadgeCheck className="w-5 h-5 text-blue-600" />
          Extracted Facts & Claims
        </h3>
        <span className="text-xs text-gray-500">{claims.length} items</span>
      </div>
      <ul className="divide-y divide-gray-200">
        {claims.map((claim) => {
          const status = feedback[claim.id];
          return (
            <li
              key={claim.id}
              className={`p-4 transition-colors group ${
                status === 'rejected'
                  ? 'bg-red-50 opacity-60'
                  : status === 'verified'
                    ? 'bg-green-50'
                    : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <ModalityBadge modality={claim.modality} />
                    {getModalityIcon(claim.modality)}
                    <span className="text-xs text-gray-400 font-mono">
                      {(claim.confidence * 100).toFixed(0)}% Conf.
                    </span>
                    {status && (
                      <span
                        className={`text-xs font-bold uppercase ${
                          status === 'verified' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        • {status}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-900 text-sm mt-1">
                    <span className="font-semibold text-blue-900">{claim.subject_name}</span>{' '}
                    <span className="text-gray-600 px-1 italic">
                      {claim.predicate.replace(/_/g, ' ')}
                    </span>{' '}
                    <span className="font-semibold text-blue-900">{claim.object_name}</span>
                  </p>
                </div>
                {!status && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleFeedback(claim.id, 'verify')}
                      className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                      title="Verify this fact"
                    >
                      <BadgeCheck className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleFeedback(claim.id, 'reject')}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Reject this fact"
                    >
                      <ShieldAlert className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
