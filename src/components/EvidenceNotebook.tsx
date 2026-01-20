import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic, Film, FileText, Scissors, GripVertical } from 'lucide-react';

interface EvidenceRecord {
  id: number;
  evidence_type: string;
  title?: string;
  description?: string;
  red_flag_rating?: number;
  created_at?: string;
  notes?: string;
  relevance?: string;
  metadata_json?: string;
}

interface NotebookProps {
  investigationId: number;
}

export const EvidenceNotebook: React.FC<NotebookProps> = ({ investigationId }) => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [mediaCache, setMediaCache] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const parseMeta = (s?: string) => {
    try {
      return s ? JSON.parse(s) : {};
    } catch (_e) {
      return {};
    }
  };

  useEffect(() => {
    const existing = localStorage.getItem(`inv_outline_${investigationId}`);
    if (existing) {
      let arr: any = [];
      try {
        arr = JSON.parse(existing);
      } catch (_e) {
        arr = [];
      }
      if (Array.isArray(arr)) setOrder(arr);
    }
  }, [investigationId]);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/investigation/${investigationId}/evidence-summary`);
        if (res.ok) {
          const json = await res.json();
          setSummary(json);
          if (!order || order.length === 0) {
            const ids = (json.evidence || []).map((e: any) => e.id);
            setOrder(ids);
          }
        }
        const nbRes = await fetch(`/api/investigations/${investigationId}/notebook`);
        if (nbRes.ok) {
          const nb = await nbRes.json();
          if (Array.isArray(nb?.order) && nb.order.length > 0) {
            setOrder(nb.order);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investigationId, order]);

  const grouped = useMemo(() => {
    const result: Record<string, EvidenceRecord[]> = { snippet: [], audio: [], video: [], doc: [] };
    const list: EvidenceRecord[] = (summary?.evidence || []) as EvidenceRecord[];
    for (const e of list) {
      const type = e.evidence_type || '';
      if (type === 'audio') result.audio.push(e);
      else if (type === 'video') result.video.push(e);
      else if (
        type === 'investigative_report' ||
        type === 'correspondence' ||
        type === 'court_filing' ||
        type === 'court_deposition' ||
        type === 'media_scan'
      )
        result.doc.push(e);
      else result.snippet.push(e);
    }
    return result;
  }, [summary]);

  useEffect(() => {
    const audioIds: number[] = [];
    const videoIds: number[] = [];
    for (const e of grouped.audio) {
      const meta = parseMeta(e.metadata_json);
      if (meta.media_item_id) audioIds.push(meta.media_item_id);
    }
    for (const e of grouped.video) {
      const meta = parseMeta(e.metadata_json);
      if (meta.media_item_id) videoIds.push(meta.media_item_id);
    }
    audioIds.forEach((id) => fetchMediaDetails(id, 'audio'));
    videoIds.forEach((id) => fetchMediaDetails(id, 'video'));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchMediaDetails is stable and defined below
  }, [grouped]);

  const saveOrder = (next: number[]) => {
    setOrder(next);
    localStorage.setItem(`inv_outline_${investigationId}`, JSON.stringify(next));
    // Persist server-side
    fetch(`/api/investigations/${investigationId}/notebook`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: next }),
    });
  };

  const move = (id: number, dir: -1 | 1) => {
    const idx = order.indexOf(id);
    if (idx === -1) return;
    const ni = idx + dir;
    if (ni < 0 || ni >= order.length) return;
    const next = [...order];
    const [row] = next.splice(idx, 1);
    next.splice(ni, 0, row);
    saveOrder(next);
  };

  const fetchMediaDetails = async (mediaItemId: number, kind: 'audio' | 'video') => {
    if (mediaCache[mediaItemId]) return;
    try {
      const res = await fetch(`/api/media/${kind}/${mediaItemId}`);
      if (res.ok) {
        const json = await res.json();
        setMediaCache((c) => ({ ...c, [mediaItemId]: json }));
      }
    } catch (_e) {
      return;
    }
  };

  const openAudio = (mediaItemId: number, albumId?: number) => {
    const url = albumId
      ? `/media/audio?id=${mediaItemId}&albumId=${albumId}`
      : `/media/audio?id=${mediaItemId}`;
    navigate(url);
  };
  const openVideo = (mediaItemId: number, albumId?: number) => {
    const url = albumId
      ? `/media/video?id=${mediaItemId}&albumId=${albumId}`
      : `/media/video?id=${mediaItemId}`;
    navigate(url);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse h-6 w-48 bg-slate-700 rounded mb-3"></div>
        <div className="animate-pulse h-3 w-96 bg-slate-800 rounded"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl text-white">Evidence Notebook</h2>
        <div className="flex items-center gap-2">
          <a
            href={`/api/investigations/${investigationId}/briefing`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded bg-blue-700 text-white"
          >
            Publish Briefing
          </a>
          <div className="text-xs text-slate-400">Drag to reorder outline</div>
        </div>
      </div>

      <div className="space-y-6">
        <section>
          <div className="flex items-center gap-2 text-slate-300 mb-3">
            <Scissors size={16} />
            <span>Snippets</span>
          </div>
          <div className="space-y-3">
            {grouped.snippet.map((e) => {
              const meta = parseMeta(e.metadata_json);
              const docId = meta.document_id;
              const highlight = (e as any).description || '';
              const viewUrl = docId
                ? `/documents?docId=${docId}&docTab=content&highlight=${encodeURIComponent(highlight.slice(0, 120))}`
                : undefined;
              return (
                <div key={e.id} className="bg-slate-900 border border-slate-800 rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-200">
                      <GripVertical size={14} />
                      <span>{e.title || 'Snippet'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => move(e.id, -1)}
                        className="text-xs px-2 py-1 bg-slate-800 text-slate-200 rounded"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => move(e.id, 1)}
                        className="text-xs px-2 py-1 bg-slate-800 text-slate-200 rounded"
                      >
                        ↓
                      </button>
                      {viewUrl && (
                        <Link
                          to={viewUrl}
                          className="text-xs px-2 py-1 bg-blue-700 text-white rounded"
                        >
                          View Source
                        </Link>
                      )}
                    </div>
                  </div>
                  {(e as any).description && (
                    <div className="text-sm text-slate-300 mt-2 whitespace-pre-wrap">
                      {(e as any).description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 text-slate-300 mb-3">
            <Mic size={16} />
            <span>Audio</span>
          </div>
          <div className="space-y-3">
            {grouped.audio.map((e) => {
              const meta = parseMeta(e.metadata_json);
              const mediaId = meta.media_item_id;
              const albumId = meta.album_id;
              const details = mediaId ? mediaCache[mediaId] : null;
              const segments: any[] = details?.metadata?.transcript || [];
              return (
                <div key={e.id} className="bg-slate-900 border border-slate-800 rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-200">
                      <GripVertical size={14} />
                      <span>{e.title || 'Audio'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => move(e.id, -1)}
                        className="text-xs px-2 py-1 bg-slate-800 text-slate-200 rounded"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => move(e.id, 1)}
                        className="text-xs px-2 py-1 bg-slate-800 text-slate-200 rounded"
                      >
                        ↓
                      </button>
                      {mediaId && (
                        <button
                          onClick={() => openAudio(mediaId, albumId)}
                          className="text-xs px-2 py-1 bg-blue-700 text-white rounded"
                        >
                          Open
                        </button>
                      )}
                    </div>
                  </div>
                  {segments && segments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {segments.slice(0, 6).map((s, i) => (
                        <button
                          key={i}
                          onClick={() => openAudio(mediaId, albumId)}
                          className="block text-left w-full text-xs text-slate-300 bg-slate-800/60 hover:bg-slate-700 px-2 py-1 rounded"
                          title={`${s.speaker || ''} ${s.start || 0}s`}
                        >
                          {s.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 text-slate-300 mb-3">
            <Film size={16} />
            <span>Video</span>
          </div>
          <div className="space-y-3">
            {grouped.video.map((e) => {
              const meta = parseMeta(e.metadata_json);
              const mediaId = meta.media_item_id;
              const albumId = meta.album_id;
              const details = mediaId ? mediaCache[mediaId] : null;
              const segments: any[] = details?.metadata?.transcript || [];
              return (
                <div key={e.id} className="bg-slate-900 border border-slate-800 rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-200">
                      <GripVertical size={14} />
                      <span>{e.title || 'Video'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => move(e.id, -1)}
                        className="text-xs px-2 py-1 bg-slate-800 text-slate-200 rounded"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => move(e.id, 1)}
                        className="text-xs px-2 py-1 bg-slate-800 text-slate-200 rounded"
                      >
                        ↓
                      </button>
                      {mediaId && (
                        <button
                          onClick={() => openVideo(mediaId, albumId)}
                          className="text-xs px-2 py-1 bg-blue-700 text-white rounded"
                        >
                          Open
                        </button>
                      )}
                    </div>
                  </div>
                  {segments && segments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {segments.slice(0, 6).map((s, i) => (
                        <button
                          key={i}
                          onClick={() => openVideo(mediaId, albumId)}
                          className="block text-left w-full text-xs text-slate-300 bg-slate-800/60 hover:bg-slate-700 px-2 py-1 rounded"
                          title={`${s.speaker || ''} ${s.start || 0}s`}
                        >
                          {s.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 text-slate-300 mb-3">
            <FileText size={16} />
            <span>Documents</span>
          </div>
          <div className="space-y-3">
            {grouped.doc.map((e) => {
              return (
                <div key={e.id} className="bg-slate-900 border border-slate-800 rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-200">
                      <GripVertical size={14} />
                      <span>{e.title || 'Document'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => move(e.id, -1)}
                        className="text-xs px-2 py-1 bg-slate-800 text-slate-200 rounded"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => move(e.id, 1)}
                        className="text-xs px-2 py-1 bg-slate-800 text-slate-200 rounded"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                  {(e as any).description && (
                    <div className="text-sm text-slate-300 mt-2 whitespace-pre-wrap">
                      {(e as any).description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
