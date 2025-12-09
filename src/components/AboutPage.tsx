import React from 'react';
import { Database, Search, Shield, FileText, Image as ImageIcon, Network, AlertTriangle } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold text-white">About the Epstein Archive</h1>
        <p className="text-xl text-slate-300">
          Making government documents accessible through advanced search and analysis
        </p>
      </div>

      {/* What is this */}
      <section className="bg-slate-800/50 rounded-lg p-8 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-8 w-8 text-blue-400" />
          <h2 className="text-3xl font-bold text-white">What is this?</h2>
        </div>
        <p className="text-slate-300 leading-relaxed">
          The Epstein Archive is a comprehensive, searchable database of publicly released court documents, 
          depositions, and evidence related to the Jeffrey Epstein case. Our mission is to make government 
          information more accessible to journalists, researchers, and the public.
        </p>
        <p className="text-slate-300 leading-relaxed">
          This is not a "client list" or conspiracy theory database. It is a forensic analysis tool built 
          on actual court records, applying advanced natural language processing to extract entities, 
          relationships, and patterns from thousands of pages of legal documents.
        </p>
      </section>

      {/* The Dataset */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="h-8 w-8 text-green-400" />
          <h2 className="text-3xl font-bold text-white">The Dataset</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-3">📄 Documents</h3>
            <p className="text-3xl font-bold text-blue-400 mb-2">2,331</p>
            <p className="text-slate-400">Court documents, depositions, emails, and exhibits from multiple sources</p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-3">👥 Entities</h3>
            <p className="text-3xl font-bold text-green-400 mb-2">47,189</p>
            <p className="text-slate-400">People, organizations, and locations extracted from documents</p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-3">📞 Black Book</h3>
            <p className="text-3xl font-bold text-purple-400 mb-2">1,414</p>
            <p className="text-slate-400">Contact entries from Epstein's address book</p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-3">🖼️ Media</h3>
            <p className="text-3xl font-bold text-orange-400 mb-2">231</p>
            <p className="text-slate-400">Images across 13 categorized albums (369 MB)</p>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-6 space-y-3">
          <h3 className="text-xl font-semibold text-white">Document Sources</h3>
          <ul className="space-y-2 text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span><strong>Giuffre v. Maxwell (Jan 2024)</strong> - Civil suit unsealing with depositions naming key figures</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span><strong>USVI Court Production (Dec 2025)</strong> - 177 images from Virgin Islands legal proceedings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span><strong>House Oversight Releases</strong> - Estate emails, birthday book, correspondence</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span><strong>Flight Logs & Black Book</strong> - Travel records and contact information</span>
            </li>
          </ul>
        </div>
      </section>

      {/* How It Works */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Network className="h-8 w-8 text-purple-400" />
          <h2 className="text-3xl font-bold text-white">How It Works</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/50 rounded-lg p-6 space-y-3">
            <Search className="h-10 w-10 text-blue-400 mb-2" />
            <h3 className="text-lg font-semibold text-white">NLP Extraction</h3>
            <p className="text-slate-400 text-sm">
              Advanced natural language processing extracts entities, relationships, and context from documents
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-6 space-y-3">
            <Network className="h-10 w-10 text-green-400 mb-2" />
            <h3 className="text-lg font-semibold text-white">Relationship Mapping</h3>
            <p className="text-slate-400 text-sm">
              Automatically identifies connections between entities based on co-occurrence and context
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-6 space-y-3">
            <Shield className="h-10 w-10 text-orange-400 mb-2" />
            <h3 className="text-lg font-semibold text-white">Red Flag Index</h3>
            <p className="text-slate-400 text-sm">
              Risk scoring system based on document frequency, evidence types, and contextual analysis
            </p>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-6 space-y-3">
          <h3 className="text-xl font-semibold text-white">Key Features</h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300">
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              Full-text search across all documents
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              Entity relationship visualization
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              Timeline of events and document releases
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              Forensic document analysis
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              Investigation workspace with hypothesis tracking
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              Categorized media library with 231 images
            </li>
          </ul>
        </div>
      </section>

      {/* What's Next */}
      <section className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-8 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <ImageIcon className="h-8 w-8 text-blue-400" />
          <h2 className="text-3xl font-bold text-white">Built for Future Releases</h2>
        </div>
        <p className="text-slate-300 leading-relaxed">
          This archive is designed to rapidly ingest and analyze new document releases as they are unsealed. 
          Our automated pipeline can process thousands of pages, extract entities, and update the relationship 
          graph within hours of new documents becoming available.
        </p>
        <p className="text-slate-300 leading-relaxed">
          As more documents are released through ongoing legal proceedings, FOIA requests, and court unsealing 
          orders, this database will continue to grow and provide increasingly comprehensive coverage of the 
          Epstein case and its connections.
        </p>
        <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4 mt-4">
          <p className="text-blue-200 text-sm">
            <strong>Recent Addition:</strong> December 2025 - Imported 177 images from USVI court production, 
            bringing total media library to 231 images across 13 categorized albums.
          </p>
        </div>
      </section>

      {/* Legal Disclaimer */}
      <section className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6 space-y-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-yellow-400" />
          <h2 className="text-2xl font-bold text-yellow-200">Legal Disclaimer</h2>
        </div>
        <div className="text-yellow-100/80 space-y-2 text-sm">
          <p>
            <strong>This is a research and journalism tool.</strong> The presence of a name in this database 
            does not imply criminal activity or wrongdoing. Many individuals appear in documents as witnesses, 
            staff, journalists, or peripheral figures.
          </p>
          <p>
            <strong>Legal thresholds matter:</strong> Mere presence on a flight log or in a contact book is 
            not evidence of a crime. Complicity requires proof of specific intent to aid trafficking. 
            Conspiracy requires proof of an agreement. Association is not guilt.
          </p>
          <p>
            <strong>Source documents:</strong> All data is derived from publicly available court documents, 
            government releases, and verified sources. We do not make claims beyond what is documented in 
            the source material.
          </p>
          <p>
            <strong>Consult professionals:</strong> This tool makes government information more accessible. 
            Please consult qualified legal professionals for advice specific to your circumstances.
          </p>
        </div>
      </section>

      {/* Footer */}
      <div className="text-center text-slate-500 text-sm pt-8 border-t border-slate-700">
        <p>Last updated: December 2025</p>
        <p className="mt-2">Built with transparency and accountability in mind</p>
      </div>
    </div>
  );
};

export default AboutPage;
