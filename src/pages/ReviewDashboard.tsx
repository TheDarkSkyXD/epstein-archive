import React, { useEffect, useState } from 'react';
import { Shield, Check, X, AlertTriangle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MentionQueueItem {
  id: number;
  entity_name: string;
  document_id: number;
  file_name: string;
  mention_context: string;
  confidence_score: number;
  signal_score: number;
}

interface ClaimQueueItem {
  id: number;
  subject_entity_id: number;
  predicate: string;
  object_text: string;
  confidence: number;
  signal_score: number;
  file_name: string;
}

export function ReviewDashboard() {
  const [activeTab, setActiveTab] = useState<'mentions' | 'claims'>('mentions');
  const [mentions, setMentions] = useState<MentionQueueItem[]>([]);
  const [claims, setClaims] = useState<ClaimQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQueue();
  }, [activeTab]);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      if (activeTab === 'mentions') {
        const res = await fetch('/api/review/mentions/queue?limit=50');
        setMentions(await res.json());
      } else {
        const res = await fetch('/api/review/claims/queue?limit=50');
        setClaims(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const verifyItem = async (id: number, type: 'mentions' | 'claims') => {
    try {
      await fetch(`/api/review/${type}/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      // Remove from list
      if (type === 'mentions') setMentions((p) => p.filter((x) => x.id !== id));
      else setClaims((p) => p.filter((x) => x.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const rejectItem = async (id: number, type: 'mentions' | 'claims') => {
    const reason = prompt('Reason for rejection?');
    if (!reason) return;
    try {
      await fetch(`/api/review/${type}/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: reason }),
      });
      if (type === 'mentions') setMentions((p) => p.filter((x) => x.id !== id));
      else setClaims((p) => p.filter((x) => x.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-600" />
              Active Learning Review
            </h1>
            <p className="text-gray-500 mt-1">
              Verify high-signal extractions to train the system.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-t-lg border-b border-gray-200 px-6 pt-4 flex space-x-6">
          <button
            onClick={() => setActiveTab('mentions')}
            className={`pb-4 text-sm font-medium border-b-2 ${activeTab === 'mentions' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Entity Mentions
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`pb-4 text-sm font-medium border-b-2 ${activeTab === 'claims' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Claims & Facts
          </button>
        </div>

        <div className="bg-white rounded-b-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading queue...</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {activeTab === 'mentions' &&
                mentions.map((item) => (
                  <div key={item.id} className="p-6 flex items-start gap-4 hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-gray-900">{item.entity_name}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${item.confidence_score > 0.8 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                        >
                          Conf: {(item.confidence_score * 100).toFixed(0)}%
                        </span>
                        <span className="text-xs text-gray-400">
                          Signal: {(item.signal_score * 100).toFixed(0)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2 font-mono bg-gray-50 p-2 rounded">
                        "...{item.mention_context}..."
                      </p>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        Source: {item.file_name}
                        <Link to={`/evidence/${item.document_id}`} className="hover:text-blue-500">
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => verifyItem(item.id, 'mentions')}
                        className="p-2 bg-green-50 text-green-600 rounded hover:bg-green-100"
                        title="Verify"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => rejectItem(item.id, 'mentions')}
                        className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100"
                        title="Reject"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}

              {activeTab === 'claims' &&
                claims.map((item) => (
                  <div key={item.id} className="p-6 flex items-start gap-4 hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-gray-900 uppercase text-xs tracking-wider">
                          {item.predicate}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${item.confidence > 0.8 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                        >
                          Conf: {(item.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 mb-1">
                        <span className="font-medium">Subject (ID {item.subject_entity_id})</span>{' '}
                        {item.predicate}{' '}
                        <span className="font-medium bg-yellow-100 px-1">{item.object_text}</span>
                      </p>
                      <div className="text-xs text-gray-400 mt-2">Source: {item.file_name}</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => verifyItem(item.id, 'claims')}
                        className="p-2 bg-green-50 text-green-600 rounded hover:bg-green-100"
                        title="Verify"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => rejectItem(item.id, 'claims')}
                        className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100"
                        title="Reject"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}

              {(activeTab === 'mentions' ? mentions : claims).length === 0 && (
                <div className="p-12 text-center text-gray-500">Queue empty! Good job.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
