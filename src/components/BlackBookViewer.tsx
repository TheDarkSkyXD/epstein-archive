import React, { useState, useEffect } from 'react';
import { Search, Phone, Mail, MapPin, User, Book } from 'lucide-react';

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

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  useEffect(() => {
    fetchBlackBookEntries();
  }, []);

  useEffect(() => {
    filterEntries();
  }, [searchTerm, selectedLetter, entries]);

  const fetchBlackBookEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/black-book');
      const data = await response.json();
      
      // Parse JSON fields
      const parsedEntries = data.map((entry: any) => ({
        ...entry,
        phone_numbers: entry.phone_numbers ? JSON.parse(entry.phone_numbers) : [],
        addresses: entry.addresses ? JSON.parse(entry.addresses) : [],
        email_addresses: entry.email_addresses ? JSON.parse(entry.email_addresses) : []
      }));
      
      setEntries(parsedEntries);
      setFilteredEntries(parsedEntries);
    } catch (error) {
      console.error('Error fetching Black Book entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEntries = () => {
    let filtered = entries;

    // Filter by letter
    if (selectedLetter !== 'ALL') {
      filtered = filtered.filter(entry => 
        entry.person_name?.toUpperCase().startsWith(selectedLetter)
      );
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.person_name?.toLowerCase().includes(term) ||
        entry.phone_numbers.some(p => p.includes(term)) ||
        entry.email_addresses.some(e => e.toLowerCase().includes(term)) ||
        entry.addresses.some(a => a.toLowerCase().includes(term))
      );
    }

    setFilteredEntries(filtered);
  };

  const extractName = (entryText: string): string => {
    // Extract name from first line
    const lines = entryText.split('\n');
    return lines[0]?.trim() || 'Unknown';
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Book className="w-8 h-8 text-cyan-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Jeffrey Epstein's Black Book</h2>
            <p className="text-slate-400 text-sm">
              {filteredEntries.length} of {entries.length} contacts
            </p>
          </div>
        </div>
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
        {alphabet.map(letter => (
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

      {/* Entries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEntries.map(entry => {
          const name = entry.person_name || extractName(entry.entry_text);
          
          return (
            <div
              key={entry.id}
              className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-cyan-500/50 transition-all"
            >
              {/* Name */}
              <div className="flex items-center space-x-2 mb-3">
                <User className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-semibold text-white">{name}</h3>
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
                          {phone}
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
                        <div key={idx} className="text-sm text-slate-300 break-all">
                          {email}
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
          <p className="text-slate-500 text-sm mt-2">
            Try adjusting your search or filter
          </p>
        </div>
      )}
    </div>
  );
};
