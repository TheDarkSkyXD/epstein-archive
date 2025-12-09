import React from 'react';
import { Shield, Database, Search, TrendingUp, Camera, FileText, Users, Target } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">
          Epstein Archive Investigation Platform
        </h1>
        <p className="text-xl text-slate-400">
          Version 3.1.0 - Comprehensive Evidence Analysis System
        </p>
      </div>

      {/* Mission Statement */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 mb-8 border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
          <Target className="h-6 w-6 text-rose-500" />
          Mission
        </h2>
        <p className="text-slate-300 text-lg leading-relaxed">
          The Epstein Archive is a comprehensive investigative platform designed to organize, 
          analyze, and present evidence related to the Jeffrey Epstein case. Our mission is to 
          provide researchers, journalists, and the public with powerful tools to explore connections, 
          identify patterns, and uncover insights from thousands of documents, flight logs, and evidence records.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Database className="h-8 w-8 text-blue-500" />
            <h3 className="text-xl font-bold text-white">Evidence Pipeline</h3>
          </div>
          <ul className="text-slate-300 space-y-2">
            <li>• 18,054+ enriched evidence records</li>
            <li>• OCR processing for scanned documents</li>
            <li>• Automated entity extraction</li>
            <li>• Red Flag Index (0-5 scale) for evidence rating</li>
            <li>• Risk Index scoring system</li>
          </ul>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-8 w-8 text-purple-500" />
            <h3 className="text-xl font-bold text-white">Entity Network</h3>
          </div>
          <ul className="text-slate-300 space-y-2">
            <li>• 50,370+ entity-evidence connections</li>
            <li>• Person and organization tracking</li>
            <li>• Relationship mapping</li>
            <li>• Connection strength analysis</li>
            <li>• Social network visualization</li>
          </ul>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Search className="h-8 w-8 text-green-500" />
            <h3 className="text-xl font-bold text-white">Advanced Search</h3>
          </div>
          <ul className="text-slate-300 space-y-2">
            <li>• Full-text search across all documents</li>
            <li>• Entity-based filtering</li>
            <li>• Date range queries</li>
            <li>• Evidence type filtering</li>
            <li>• Contextual search results</li>
          </ul>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Camera className="h-8 w-8 text-rose-500" />
            <h3 className="text-xl font-bold text-white">Media Browser</h3>
          </div>
          <ul className="text-slate-300 space-y-2">
            <li>• Photo album organization</li>
            <li>• Image metadata extraction</li>
            <li>• Advanced search and filtering</li>
            <li>• Format and date-based sorting</li>
            <li>• Thumbnail generation</li>
          </ul>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-8 w-8 text-amber-500" />
            <h3 className="text-xl font-bold text-white">Document Analysis</h3>
          </div>
          <ul className="text-slate-300 space-y-2">
            <li>• Flight log parsing and analysis</li>
            <li>• Court document processing</li>
            <li>• Timeline reconstruction</li>
            <li>• Pattern detection</li>
            <li>• Cross-reference verification</li>
          </ul>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-8 w-8 text-cyan-500" />
            <h3 className="text-xl font-bold text-white">Analytics Dashboard</h3>
          </div>
          <ul className="text-slate-300 space-y-2">
            <li>• Interactive data visualizations</li>
            <li>• Statistical analysis tools</li>
            <li>• Trend identification</li>
            <li>• Geographic mapping</li>
            <li>• Timeline analysis</li>
          </ul>
        </div>
      </div>

      {/* Technical Stack */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 mb-8 border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <Shield className="h-6 w-6 text-blue-500" />
          Technical Architecture
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-lg font-semibold text-white mb-3">Frontend</h4>
            <ul className="text-slate-300 space-y-1 text-sm">
              <li>• React 18 with TypeScript</li>
              <li>• Vite build system</li>
              <li>• TailwindCSS styling</li>
              <li>• Recharts visualizations</li>
              <li>• Lucide icons</li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-white mb-3">Backend</h4>
            <ul className="text-slate-300 space-y-1 text-sm">
              <li>• Node.js + Express</li>
              <li>• TypeScript</li>
              <li>• better-sqlite3 database</li>
              <li>• RESTful API architecture</li>
              <li>• MediaService integration</li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-white mb-3">Testing & QA</h4>
            <ul className="text-slate-300 space-y-1 text-sm">
              <li>• Playwright E2E testing</li>
              <li>• ESLint code quality</li>
              <li>• TypeScript type safety</li>
              <li>• Automated testing pipelines</li>
              <li>• Continuous validation</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700 mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Data Sources</h2>
        <p className="text-slate-300 mb-4">
          This archive aggregates publicly available information from various sources:
        </p>
        <ul className="text-slate-300 space-y-2">
          <li>• Court documents and legal filings</li>
          <li>• Flight logs and travel records</li>
          <li>• News articles and media reports</li>
          <li>• Public records and databases</li>
          <li>• Photographic evidence</li>
        </ul>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl p-6">
        <h3 className="text-lg font-bold text-amber-400 mb-3">Disclaimer</h3>
        <p className="text-slate-300 text-sm leading-relaxed">
          This platform is designed for research and investigative purposes. All information 
          presented is derived from publicly available sources. Users should verify information 
          independently and exercise critical judgment when analyzing evidence. The presence of 
          an individual's name in this database does not imply wrongdoing or criminal activity.
        </p>
      </div>

      {/* Footer */}
      <div className="text-center mt-12 pt-8 border-t border-slate-700">
        <p className="text-slate-400">
          Built with transparency and accountability in mind
        </p>
        <p className="text-slate-500 text-sm mt-2">
          Last Updated: December 2025
        </p>
      </div>
    </div>
  );
};
