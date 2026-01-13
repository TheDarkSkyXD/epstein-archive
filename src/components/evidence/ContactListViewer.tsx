/**
 * Contact List Viewer Component
 *
 * Displays contact directories like Black Book
 */

import React, { useState, useMemo } from 'react';
import { Search, Phone, Mail, MapPin } from 'lucide-react';

interface ContactListViewerProps {
  evidence: {
    extractedText: string;
    title: string;
  };
}

interface Contact {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  raw: string;
}

export function ContactListViewer({ evidence }: ContactListViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const contacts = useMemo(() => {
    const lines = evidence.extractedText.split('\n').filter((line) => line.trim());
    const contactList: Contact[] = [];

    // Simple parsing: group related lines as contacts
    let currentContact: Partial<Contact> = {};

    for (const line of lines) {
      const trimmed = line.trim();

      // Check for name patterns (capitalized words)
      if (/^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(trimmed) && !trimmed.includes('@')) {
        if (currentContact.name) {
          contactList.push(currentContact as Contact);
        }
        currentContact = {
          name: trimmed,
          raw: trimmed,
        };
      } else if (currentContact.name) {
        // Look for phone, email, or address
        if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(trimmed) || /\+\d+/.test(trimmed)) {
          currentContact.phone = trimmed;
        } else if (trimmed.includes('@')) {
          currentContact.email = trimmed;
        } else if (trimmed.length > 10) {
          currentContact.address = trimmed;
        }
        currentContact.raw += '\n' + trimmed;
      }
    }

    if (currentContact.name) {
      contactList.push(currentContact as Contact);
    }

    return contactList;
  }, [evidence.extractedText]);

  const filteredContacts = useMemo(() => {
    if (!searchTerm.trim()) return contacts;

    const term = searchTerm.toLowerCase();
    return contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(term) ||
        contact.phone?.toLowerCase().includes(term) ||
        contact.email?.toLowerCase().includes(term) ||
        contact.address?.toLowerCase().includes(term),
    );
  }, [contacts, searchTerm]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{evidence.title}</h3>
        <p className="text-sm text-gray-600 mt-1">{contacts.length} contacts found</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContacts.map((contact, index) => (
          <div
            key={index}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition"
          >
            <div className="flex items-start">
              <User className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 truncate">{contact.name}</h4>

                <div className="mt-2 space-y-1">
                  {contact.phone && (
                    <div className="flex items-center text-xs text-gray-600">
                      <Phone className="h-3 w-3 mr-1.5" />
                      {contact.phone}
                    </div>
                  )}

                  {contact.email && (
                    <div className="flex items-center text-xs text-gray-600">
                      <Mail className="h-3 w-3 mr-1.5" />
                      {contact.email}
                    </div>
                  )}

                  {contact.address && (
                    <div className="flex items-start text-xs text-gray-600">
                      <MapPin className="h-3 w-3 mr-1.5 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{contact.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredContacts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No contacts found matching "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
}
