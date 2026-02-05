import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  evidenceId: string;
  onClose: () => void;
}

export const ChainOfCustodyModal: React.FC<Props> = ({ evidenceId, onClose }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [actor, setActor] = useState('');
  const [action, setAction] = useState('analyzed');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const exportReport = async () => {
    const res = await fetch(`/api/evidence/${evidenceId}/custody/report`);
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custody-${evidenceId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const exportCsv = async () => {
    const res = await fetch(`/api/evidence/${evidenceId}/custody/report.csv`);
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custody-${evidenceId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const openPrintable = () => {
    window.open(`/api/evidence/${evidenceId}/custody/report.html`, '_blank');
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/evidence/${evidenceId}/custody`);
        const data = await res.json();
        setEvents(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [evidenceId]);

  const addEvent = async () => {
    await fetch(`/api/evidence/${evidenceId}/custody`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor, action, notes }),
    });
    const res = await fetch(`/api/evidence/${evidenceId}/custody`);
    const data = await res.json();
    setEvents(data);
    setActor('');
    setAction('analyzed');
    setNotes('');
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-slate-800 rounded-lg w-full max-w-2xl">
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-white font-semibold">Chain of Custody</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="text-sm text-slate-300">Evidence ID: {evidenceId}</div>
          <div>
            <button
              onClick={exportReport}
              className="px-3 py-2 bg-slate-700 text-white rounded text-sm hover:bg-slate-600 mr-2"
            >
              Export Report
            </button>
            <button
              onClick={exportCsv}
              className="px-3 py-2 bg-slate-700 text-white rounded text-sm hover:bg-slate-600 mr-2"
            >
              Export CSV
            </button>
            <button
              onClick={openPrintable}
              className="px-3 py-2 bg-slate-700 text-white rounded text-sm hover:bg-slate-600"
            >
              Printable PDF
            </button>
          </div>
          {loading ? (
            <div className="text-slate-400">Loading...</div>
          ) : (
            <div className="space-y-2">
              {events.map((ev) => (
                <div key={ev.id} className="p-3 bg-slate-700 rounded-md">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">{ev.action}</span>
                    <span className="text-slate-400">{ev.date}</span>
                  </div>
                  <div className="text-xs text-slate-400">Actor: {ev.actor}</div>
                  {ev.notes && <div className="text-xs text-slate-400">{ev.notes}</div>}
                </div>
              ))}
              {events.length === 0 && (
                <div className="text-slate-400 text-sm">No custody events yet.</div>
              )}
            </div>
          )}
          <div className="mt-4">
            <h4 className="text-white font-medium mb-2 text-sm">Add Event</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                placeholder="Actor"
                className="bg-slate-700 text-white p-2 rounded"
              />
              <input
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="Action"
                className="bg-slate-700 text-white p-2 rounded"
              />
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes"
                className="bg-slate-700 text-white p-2 rounded"
              />
            </div>
            <button
              onClick={addEvent}
              className="mt-3 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ChainOfCustodyModal;
