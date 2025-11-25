import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, SkipForward, AlertCircle, Save } from 'lucide-react';

interface ReviewEntry {
  id: number;
  person_id: number;
  original_name: string;
  cleaned_name: string;
  entry_text: string;
  phone_numbers: string[];
  addresses: string[];
  email_addresses: string[];
  needs_review: boolean;
}

export const BlackBookReview: React.FC = () => {
  const [entries, setEntries] = useState<ReviewEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editedName, setEditedName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ total: 0, reviewed: 0, remaining: 0 });

  useEffect(() => {
    fetchReviewEntries();
  }, []);

  useEffect(() => {
    if (entries.length > 0 && currentIndex < entries.length) {
      setEditedName(entries[currentIndex].cleaned_name);
    }
  }, [currentIndex, entries]);

  const fetchReviewEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/black-book/review');
      const data = await response.json();
      
      // Parse JSON fields
      const parsed = data.entries.map((entry: any) => ({
        ...entry,
        phone_numbers: entry.phone_numbers ? JSON.parse(entry.phone_numbers) : [],
        addresses: entry.addresses ? JSON.parse(entry.addresses) : [],
        email_addresses: entry.email_addresses ? JSON.parse(entry.email_addresses) : []
      }));
      
      setEntries(parsed);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching review entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'approve' | 'skip' | 'delete') => {
    if (currentIndex >= entries.length) return;
    
    const entry = entries[currentIndex];
    setSaving(true);
    
    try {
      await fetch(`/api/black-book/review/${entry.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correctedName: editedName,
          action
        })
      });
      
      // Move to next entry
      if (currentIndex < entries.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Refresh to get updated stats
        await fetchReviewEntries();
        setCurrentIndex(0);
      }
      
      // Update stats
      setStats(prev => ({
        ...prev,
        reviewed: prev.reviewed + 1,
        remaining: prev.remaining - 1
      }));
    } catch (error) {
      console.error('Error saving review:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">All Done!</h3>
        <p className="text-slate-400">All Black Book entries have been reviewed.</p>
      </div>
    );
  }

  const current = entries[currentIndex];
  const progress = ((stats.reviewed / stats.total) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header & Progress */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Black Book Review</h2>
            <p className="text-slate-400 text-sm mt-1">
              Manually correct flagged entries with poor OCR quality
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-cyan-400">{stats.remaining}</div>
            <div className="text-sm text-slate-400">remaining</div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-slate-400">
            <span>Progress</span>
            <span>{stats.reviewed} of {stats.total} ({progress}%)</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Review Card */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">Needs Review</span>
          </div>
          <div className="text-sm text-slate-500">
            Entry {currentIndex + 1} of {entries.length}
          </div>
        </div>

        {/* Original OCR Text */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Original OCR Text
          </label>
          <div className="bg-slate-900/50 border border-slate-600 rounded p-3 font-mono text-sm text-slate-400 whitespace-pre-wrap">
            {current.entry_text}
          </div>
        </div>

        {/* Current Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Current Name (AI Cleaned)
          </label>
          <div className="bg-slate-900/50 border border-slate-600 rounded p-3 text-slate-300">
            {current.cleaned_name}
          </div>
        </div>

        {/* Editable Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Corrected Name
          </label>
          <input
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="Enter corrected name..."
            disabled={saving}
          />
        </div>

        {/* Contact Info */}
        {(current.phone_numbers.length > 0 || current.email_addresses.length > 0 || current.addresses.length > 0) && (
          <div className="mb-6 p-4 bg-slate-900/30 border border-slate-600 rounded-lg">
            <h4 className="text-sm font-medium text-slate-300 mb-3">Contact Information</h4>
            <div className="space-y-2 text-sm">
              {current.phone_numbers.length > 0 && (
                <div>
                  <span className="text-slate-500">Phones:</span>
                  <span className="text-slate-300 ml-2">{current.phone_numbers.join(', ')}</span>
                </div>
              )}
              {current.email_addresses.length > 0 && (
                <div>
                  <span className="text-slate-500">Emails:</span>
                  <span className="text-slate-300 ml-2">{current.email_addresses.join(', ')}</span>
                </div>
              )}
              {current.addresses.length > 0 && (
                <div>
                  <span className="text-slate-500">Addresses:</span>
                  <span className="text-slate-300 ml-2">{current.addresses.slice(0, 2).join('; ')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={() => handleAction('approve')}
            disabled={saving || !editedName.trim()}
            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <CheckCircle className="w-5 h-5" />
            <span>Approve & Save</span>
          </button>
          
          <button
            onClick={() => handleAction('skip')}
            disabled={saving}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <SkipForward className="w-5 h-5" />
            <span>Skip</span>
          </button>
          
          <button
            onClick={() => handleAction('delete')}
            disabled={saving}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg font-medium hover:from-red-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <XCircle className="w-5 h-5" />
            <span>Delete</span>
          </button>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="mt-4 pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-500 text-center">
            Tip: Use Tab to focus name field, Enter to approve, or click buttons
          </p>
        </div>
      </div>
    </div>
  );
};
