import React, { useState, useEffect } from 'react';
import { Search, Phone, Mail, MapPin, User, Book, Eye, FileText, ExternalLink } from 'lucide-react';
import { extractCleanName, formatPhoneNumber } from '../utils/prettifyOCR';
import { Link } from 'react-router-dom';
import { AddToInvestigationButton } from './common/AddToInvestigationButton';
import { EvidenceModal } from './common/EvidenceModal';
import { apiClient } from '../services/apiClient';

interface BlackBookEntry {
  id: number;
  person_id: number;
  entry_text: string;
  phone_numbers: string[];
  addresses: string[];
  email_addresses: string[];
  notes: string;
  person_name?: string;
}

export const BlackBookViewer: React.FC = () => {
  const [entries, setEntries] = useState<BlackBookEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<BlackBookEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState<string>('ALL');
  const [hasPhone, setHasPhone] = useState<boolean>(false);
  const [hasEmail, setHasEmail] = useState<boolean>(false);
  const [hasAddress, setHasAddress] = useState<boolean>(false);
  const [showRaw, setShowRaw] = useState<boolean>(false);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [loadingEntity, setLoadingEntity] = useState<number | null>(null);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  useEffect(() => {
    fetchBlackBookEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchBlackBookEntries is stable and defined below
  }, []);

  useEffect(() => {
    fetchBlackBookEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchBlackBookEntries is stable and defined below
  }, [searchTerm, selectedLetter, hasPhone, hasEmail, hasAddress]);

  const fetchBlackBookEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (selectedLetter) params.set('letter', selectedLetter);
      if (hasPhone) params.set('hasPhone', 'true');
      if (hasEmail) params.set('hasEmail', 'true');
      if (hasAddress) params.set('hasAddress', 'true');
      params.set('limit', '5000');
      const response = await fetch(`/api/black-book?${params.toString()}`);
      const result = await response.json();

      // API now returns {data: [...], total, page, pageSize, totalPages}
      const data = result.data || [];

      // Parse JSON fields safely
      const parsedEntries = data.map((entry: any) => {
        let phone_numbers = [];
        let addresses = [];
        let email_addresses = [];

        try {
          phone_numbers = entry.phone_numbers ? JSON.parse(entry.phone_numbers) : [];
        } catch (_e) {
          console.warn('Failed to parse phone_numbers for entry', entry.id, entry.phone_numbers);
          // Fallback: if it looks like a string, wrap it
          if (typeof entry.phone_numbers === 'string' && !entry.phone_numbers.startsWith('[')) {
            phone_numbers = [entry.phone_numbers];
          }
        }

        try {
          addresses = entry.addresses ? JSON.parse(entry.addresses) : [];
        } catch (_e) {
          console.warn('Failed to parse addresses for entry', entry.id);
        }

        try {
          email_addresses = entry.email_addresses ? JSON.parse(entry.email_addresses) : [];
        } catch (_e) {
          console.warn('Failed to parse email_addresses for entry', entry.id);
        }

        return {
          ...entry,
          phone_numbers,
          addresses,
          email_addresses,
        };
      });

      setEntries(parsedEntries);
      setFilteredEntries(parsedEntries);
    } catch (error) {
      console.error('Error fetching Black Book entries:', error);
    } finally {
      setLoading(false);
    }
  };

  // Client-side fallback remains if needed
  useEffect(() => {
    setFilteredEntries(entries);
  }, [entries]);

  const extractName = (entryText: string): string => {
    // Extract name from first line
    const lines = entryText.split('\n');
    return lines[0]?.trim() || 'Unknown';
  };

  const handleEntityClick = async (personId: number, personName: string) => {
    if (!personName) return; // Not a known entity
    try {
      setLoadingEntity(personId);
      const entity = await apiClient.getEntity(String(personId));
      setSelectedEntity(entity);
    } catch (error) {
      console.error('Error fetching entity:', error);
    } finally {
      setLoadingEntity(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <Book className="w-8 h-8 text-cyan-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Jeffrey Epstein's Black Book</h2>
            <p className="text-slate-400 text-sm">
              {filteredEntries.length} of {entries.length} contacts
            </p>
          </div>
        </div>

        {/* Pretty/Raw Toggle */}
        <button
          onClick={() => setShowRaw(!showRaw)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            showRaw
              ? 'bg-slate-700 text-slate-300 border border-slate-600'
              : 'bg-cyan-600 text-white border border-cyan-500'
          }`}
          title={showRaw ? 'Showing raw OCR text' : 'Showing cleaned text'}
        >
          {showRaw ? <FileText className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span className="text-sm font-medium">{showRaw ? 'Raw OCR' : 'Pretty'}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, phone, email, or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {/* Alphabet Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedLetter('ALL')}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            selectedLetter === 'ALL'
              ? 'bg-cyan-500 text-white'
              : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
          }`}
        >
          ALL
        </button>
        {alphabet.map((letter) => (
          <button
            key={letter}
            onClick={() => setSelectedLetter(letter)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              selectedLetter === letter
                ? 'bg-cyan-500 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Contact Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <label className="flex items-center gap-2 text-slate-300">
          <input
            type="checkbox"
            checked={hasPhone}
            onChange={(e) => setHasPhone(e.target.checked)}
          />
          <span>Has Phone</span>
          <Phone className="w-4 h-4 text-slate-400" />
        </label>
        <label className="flex items-center gap-2 text-slate-300">
          <input
            type="checkbox"
            checked={hasEmail}
            onChange={(e) => setHasEmail(e.target.checked)}
          />
          <span>Has Email</span>
          <Mail className="w-4 h-4 text-slate-400" />
        </label>
        <label className="flex items-center gap-2 text-slate-300">
          <input
            type="checkbox"
            checked={hasAddress}
            onChange={(e) => setHasAddress(e.target.checked)}
          />
          <span>Has Address</span>
          <MapPin className="w-4 h-4 text-slate-400" />
        </label>
      </div>

      {/* Entries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEntries.map((entry) => {
          const rawName = entry.person_name || extractName(entry.entry_text);
          const displayName = showRaw ? rawName : extractCleanName(entry.entry_text) || rawName;

          return (
            <div
              key={entry.id}
              className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-cyan-500/50 transition-all"
            >
              {/* Name - clickable if known entity */}
              <div className="flex items-center space-x-2 mb-3">
                <User className="w-5 h-5 text-cyan-400" />
                {entry.person_name ? (
                  <button
                    onClick={() => handleEntityClick(entry.person_id, entry.person_name!)}
                    className="text-lg font-semibold text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 transition-colors text-left"
                    title="Click to view entity profile"
                    disabled={loadingEntity === entry.person_id}
                  >
                    {loadingEntity === entry.person_id ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : (
                      <>
                        {displayName}
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </>
                    )}
                  </button>
                ) : (
                  <h3 className="text-lg font-semibold text-white">{displayName}</h3>
                )}
                <div className="ml-auto">
                  <AddToInvestigationButton
                    item={{
                      id: `blackbook-${entry.id}`,
                      title: `Black Book: ${displayName}`,
                      description: `Contact entry for ${displayName}`,
                      type: 'entity',
                      sourceId: String(entry.id),
                      metadata: {
                        entryText: entry.entry_text,
                        phones: entry.phone_numbers,
                        emails: entry.email_addresses,
                      },
                    }}
                    variant="icon"
                    className="text-slate-500 hover:text-white"
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2">
                {/* Phone Numbers */}
                {entry.phone_numbers.length > 0 && (
                  <div className="flex items-start space-x-2">
                    <Phone className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      {entry.phone_numbers.map((phone, idx) => (
                        <div key={idx} className="text-sm text-slate-300">
                          {showRaw ? phone : formatPhoneNumber(phone)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emails */}
                {entry.email_addresses.length > 0 && (
                  <div className="flex items-start space-x-2">
                    <Mail className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      {entry.email_addresses.map((email, idx) => (
                        <div
                          key={idx}
                          className="text-sm text-slate-300 break-all flex items-center justify-between gap-2 group/email"
                        >
                          <Link
                            to={`/emails?search=${encodeURIComponent(email)}`}
                            className="hover:text-cyan-400 hover:underline"
                          >
                            {email}
                          </Link>
                          <Link
                            to={`/emails?search=${encodeURIComponent(email)}`}
                            className="opacity-0 group-hover/email:opacity-100 text-slate-500 hover:text-cyan-400"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Addresses */}
                {entry.addresses.length > 0 && (
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      {entry.addresses.slice(0, 2).map((address, idx) => (
                        <div key={idx} className="text-sm text-slate-300">
                          {address}
                        </div>
                      ))}
                      {entry.addresses.length > 2 && (
                        <div className="text-xs text-slate-500 mt-1">
                          +{entry.addresses.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* No contact info */}
                {entry.phone_numbers.length === 0 &&
                  entry.email_addresses.length === 0 &&
                  entry.addresses.length === 0 && (
                    <div className="text-sm text-slate-500 italic">
                      No contact information available
                    </div>
                  )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredEntries.length === 0 && (
        <div className="text-center py-12">
          <Book className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">No contacts found</p>
          <p className="text-slate-500 text-sm mt-2">Try adjusting your search or filter</p>
        </div>
      )}

      {/* Entity Modal */}
      {selectedEntity && (
        <EvidenceModal person={selectedEntity} onClose={() => setSelectedEntity(null)} />
      )}
    </div>
  );
};
