import React, { useEffect, useState } from 'react';
import {
  Database,
  Search,
  Shield,
  FileText,
  Image as ImageIcon,
  Network,
  AlertTriangle,
  Eye,
  Download,
} from 'lucide-react';

const DOCUMENT_SOURCES = [
  {
    title: 'Unredacted Black Book',
    description: "Jeffrey Epstein's personal address book (2004-2005).",
    redactionStatus: 'Unredacted (0%)',
    redactionColor: 'red',
    impact: 'CRITICAL',
    impactColor: 'purple',
    link: '/blackbook',
    search: null,
  },
  {
    title: 'Flight Logs',
    description: "Pilot logs for Epstein's aircraft (1991-2003).",
    redactionStatus: 'Unredacted (0%)',
    redactionColor: 'red',
    impact: 'CRITICAL',
    impactColor: 'purple',
    link: null,
    search: 'Flight Log',
  },
  {
    title: 'Giuffre v. Maxwell Unsealed',
    description: 'Jan 2024 unsealing of court motions and exhibits.',
    redactionStatus: 'Minimal (~5%)',
    redactionColor: 'yellow',
    impact: 'HIGH',
    impactColor: 'blue',
    link: null,
    search: 'Unsealed',
  },
  {
    title: 'Maxwell Deposition 2016',
    description: 'Deposition of Ghislaine Maxwell in Giuffre v. Maxwell.',
    redactionStatus: 'Unredacted (0%)',
    redactionColor: 'red',
    impact: 'HIGH',
    impactColor: 'blue',
    link: null,
    search: 'Maxwell Deposition',
  },
  {
    title: 'Giuffre Deposition 2016',
    description: "Transcript of Virginia Giuffre's testimony.",
    redactionStatus: 'Unredacted (0%)',
    redactionColor: 'red',
    impact: 'HIGH',
    impactColor: 'blue',
    link: null,
    search: 'Giuffre Deposition',
  },
  {
    title: 'Sjoberg Deposition 2016',
    description: 'Testimony regarding Prince Andrew and Maxwell.',
    redactionStatus: 'Unredacted (0%)',
    redactionColor: 'red',
    impact: 'HIGH',
    impactColor: 'blue',
    link: null,
    search: 'Sjoberg',
  },
  {
    title: 'Katie Johnson Complaint',
    description: '2016 lawsuit against Epstein and Trump.',
    redactionStatus: 'Unredacted (0%)',
    redactionColor: 'red',
    impact: 'HIGH',
    impactColor: 'blue',
    link: null,
    search: 'Katie Johnson',
  },
  {
    title: 'Federal Indictment 2019',
    description: 'SDNY indictment charging sex trafficking.',
    redactionStatus: 'Unredacted (0%)',
    redactionColor: 'red',
    impact: 'HIGH',
    impactColor: 'blue',
    link: null,
    search: 'Indictment',
  },
  {
    title: "FBI Files 'Phase 1'",
    description: 'FBI interview summaries and internal memos.',
    redactionStatus: 'Moderately Redacted (~35%)',
    redactionColor: 'slate',
    impact: 'MEDIUM',
    impactColor: 'slate',
    link: null,
    search: 'FBI',
  },
  {
    title: 'Estate Emails',
    description: 'Post-2008 correspondence (House Oversight).',
    redactionStatus: 'Low Redaction (~12%)',
    redactionColor: 'yellow',
    impact: 'MEDIUM',
    impactColor: 'slate',
    link: null,
    search: 'Oversight',
  },
  {
    title: 'The Birthday Book',
    description: '2003 Birthday messages and photos.',
    redactionStatus: 'Unredacted (0%)',
    redactionColor: 'red',
    impact: 'MEDIUM',
    impactColor: 'slate',
    link: null,
    search: 'Birthday Book',
  },
  {
    title: 'DOJ Discovery VOL00001',
    description: 'FBI evidence from July 2019 NY mansion search (3,158 items).',
    redactionStatus: 'Unredacted (0%)',
    redactionColor: 'red',
    impact: 'CRITICAL',
    impactColor: 'purple',
    link: null,
    search: 'EFTA',
  },
  {
    title: 'DOJ Discovery VOL00002-6',
    description: 'Additional discovery volumes containing heavily redacted documents.',
    redactionStatus: 'Heavy Redaction (~95%)',
    redactionColor: 'slate',
    impact: 'LOW',
    impactColor: 'slate',
    link: null,
    search: 'DOJ VOL0000',
  },
  {
    title: 'DOJ Discovery VOL00007-8',
    description: 'Dec 2025 release: Financial records, witness statements, and communications.',
    redactionStatus: 'Moderate Redaction (~40%)',
    redactionColor: 'yellow',
    impact: 'HIGH',
    impactColor: 'blue',
    link: null,
    search: 'DOJ VOL00007 OR DOJ VOL00008',
  },
  {
    title: 'USVI Property Evidence',
    description: 'Photos from Little Saint James island properties.',
    redactionStatus: 'Unredacted (0%)',
    redactionColor: 'red',
    impact: 'HIGH',
    impactColor: 'blue',
    link: '/media',
    search: null,
  },
];

const timelineEvents = [
  {
    date: 'Jan 3, 2024',
    source: 'Giuffre v. Maxwell',
    content: 'Depositions naming Prince Andrew, Clinton, Trump, Copperfield.',
  },
  {
    date: 'July 7, 2025',
    source: 'DOJ / FBI Review',
    content: 'Memo stating no "client list" exists and no evidence for 3rd party prosecution.',
  },
  {
    date: 'Sept 8, 2025',
    source: 'House Oversight',
    content: '"Birthday Book" (2003) with photos and notes.',
  },
  {
    date: 'Nov 12, 2025',
    source: 'House Oversight',
    content: '23k+ pages of Estate Emails (2009-2019).',
  },
  {
    date: 'Dec 20, 2025',
    source: 'DOJ Discovery',
    content: 'VOL00001: 3,158 FBI evidence items from 2019 NY search.',
  },
  {
    date: 'Dec 24, 2025',
    source: 'DOJ Discovery',
    content: 'VOL00007-8: Financial records, JPM correspondence, and new witness statements.',
  },
  {
    date: 'Dec 30, 2025',
    source: 'Epstein Archive',
    content: 'V9.0.0: Integrated Side-by-Side PDF Viewer and fuzzy document source linking.',
  },
  {
    date: 'Jan 12, 2026',
    source: 'Epstein Archive',
    content: 'V9.2.0: Operation Spring Cleaning. Complete data unification and Admin Dashboard.',
  },
];

// Helper to get color classes
const getStatusColor = (color: string) => {
  switch (color) {
    case 'red':
      return { bg: 'bg-red-400', text: 'text-red-300' };
    case 'yellow':
      return { bg: 'bg-yellow-400', text: 'text-yellow-300' };
    case 'slate':
      return { bg: 'bg-slate-400', text: 'text-slate-300' };
    default:
      return { bg: 'bg-slate-400', text: 'text-slate-300' };
  }
};

const getImpactColor = (color: string) => {
  switch (color) {
    case 'purple':
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    case 'blue':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case 'slate':
      return 'bg-slate-700 text-slate-300 border-slate-600';
    default:
      return 'bg-slate-700 text-slate-300 border-slate-600';
  }
};

export const AboutPage: React.FC = () => {
  const [stats, setStats] = useState({
    documents: 0,
    entities: 0,
    blackBook: 0,
    media: 0,
    albums: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, blackBookRes, mediaRes] = await Promise.all([
          fetch('/api/stats').then((r) => r.json()),
          fetch('/api/black-book?limit=1').then((r) => r.json()),
          fetch('/api/media/stats').then((r) => r.json()),
        ]);

        setStats({
          documents: statsRes.totalDocuments || 0,
          entities: statsRes.totalEntities || 0,
          blackBook: blackBookRes.total || 0,
          media: mediaRes.totalImages || 0,
          albums: mediaRes.totalAlbums || 0,
        });
      } catch (e) {
        console.error('Failed to fetch about page stats', e);
      }
    };
    fetchData();
  }, []);

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
          The Epstein Archive is a comprehensive, searchable database of publicly released court
          documents, depositions, and evidence related to the Jeffrey Epstein case. Our mission is
          to make government information more accessible to journalists, researchers, and the
          public.
        </p>
        <p className="text-slate-300 leading-relaxed">
          This is not a "client list" or conspiracy theory database. It is a forensic analysis tool
          built on actual court records, applying advanced natural language processing to extract
          entities, relationships, and patterns from thousands of pages of legal documents.
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
            <p className="text-3xl font-bold text-blue-400 mb-2">
              {stats.documents.toLocaleString()}
            </p>
            <p className="text-slate-400">
              Court documents, depositions, emails, and exhibits from multiple sources
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-3">👥 Entities</h3>
            <p className="text-3xl font-bold text-green-400 mb-2">
              {stats.entities.toLocaleString()}
            </p>
            <p className="text-slate-400">
              People, organisations, and locations extracted from documents
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-3">📞 Black Book</h3>
            <p className="text-3xl font-bold text-purple-400 mb-2">
              {stats.blackBook.toLocaleString()}
            </p>
            <p className="text-slate-400">Contact entries from Epstein's address book</p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-3">🖼️ Media</h3>
            <p className="text-3xl font-bold text-orange-400 mb-2">
              {stats.media.toLocaleString()}
            </p>
            <p className="text-slate-400">
              Images across {stats.albums.toLocaleString()} categorised albums
            </p>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-6 space-y-6">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-white">Document Sources</h3>
            <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium">
              Verified Sources
            </span>
          </div>

          {/* Mobile Card View (< md) */}
          <div className="space-y-4 md:hidden">
            {DOCUMENT_SOURCES.map((source, idx) => (
              <div
                key={idx}
                className="bg-slate-700/30 p-4 rounded-lg border border-slate-700/50 space-y-3 shadow-sm"
              >
                <div className="flex justify-between items-start gap-3">
                  <h4 className="font-bold text-white text-lg leading-tight">{source.title}</h4>
                  <span
                    className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${getImpactColor(source.impactColor)}`}
                  >
                    {source.impact}
                  </span>
                </div>

                <p className="text-slate-300 text-sm leading-relaxed">{source.description}</p>

                <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${getStatusColor(source.redactionColor).bg}`}
                    ></span>
                    <span className={getStatusColor(source.redactionColor).text}>
                      {source.redactionStatus}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {source.link ? (
                      <a
                        href={source.link}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors text-xs font-medium border border-blue-500/20"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </a>
                    ) : (
                      <a
                        href={`/documents?search=${encodeURIComponent(source.search || '')}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors text-xs font-medium border border-blue-500/20"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-sm">
                  <th className="py-3 px-4 font-medium">Title</th>
                  <th className="py-3 px-4 font-medium max-w-sm">Description</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Redaction Status</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Impact</th>
                  <th className="py-3 px-4 font-medium text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-700/50">
                {DOCUMENT_SOURCES.map((source, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-white">{source.title}</td>
                    <td className="py-3 px-4 text-slate-300">{source.description}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="flex items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${getStatusColor(source.redactionColor).bg}`}
                        ></span>
                        <span className={getStatusColor(source.redactionColor).text}>
                          {source.redactionStatus}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getImpactColor(source.impactColor)}`}
                      >
                        {source.impact}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {source.link ? (
                          <a
                            href={source.link}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors text-xs font-medium border border-blue-500/20"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </a>
                        ) : (
                          <a
                            href={`/documents?search=${encodeURIComponent(source.search || '')}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors text-xs font-medium border border-blue-500/20"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </a>
                        )}
                        {source.title === 'Unredacted Black Book' && (
                          <a
                            href="/api/downloads/release/black-book"
                            download
                            className="inline-flex items-center justify-center p-1.5 rounded-md bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
                            title="Download Original"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {source.title === 'Flight Logs' && (
                          <a
                            href="/api/downloads/release/flight-logs"
                            download
                            className="inline-flex items-center justify-center p-1.5 rounded-md bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
                            title="Download Original"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {source.title !== 'Unredacted Black Book' &&
                          source.title !== 'Flight Logs' && (
                            <button
                              disabled
                              className="inline-flex items-center justify-center p-1.5 rounded-md bg-slate-800/50 text-slate-600 cursor-not-allowed border border-slate-700/50"
                              title="Download not available"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Analysis Article */}
      <section className="bg-slate-900/50 rounded-lg p-8 space-y-6 border border-slate-700/50">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-700">
          <FileText className="h-8 w-8 text-blue-400" />
          <div>
            <h2 className="text-3xl font-bold text-white">The Epstein Files: Analysis</h2>
            <p className="text-slate-400 mt-1">
              What Documents Exist and What They Prove | Updated Jan 12, 2026
            </p>
          </div>
        </div>

        <div className="prose prose-invert prose-lg max-w-none text-slate-300 space-y-6">
          <p className="lead text-xl text-slate-200">
            The criminal enterprise of Jeffrey Epstein has created one of the most persistent myths
            in modern American history: the existence of a singular, definitive "Client List." A
            forensic examination of the investigative materials available as of late 2025 reveals a
            different reality.
          </p>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">What Documents Actually Exist</h3>
          <p>
            The public discourse often conflates distinct datasets—flight logs, contact books, civil
            lawsuit depositions, and estate emails—into a monolithic "Epstein List." In reality, the
            evidence comprises several disparate categories of information, each with unique
            evidentiary value.
          </p>

          <h4 className="text-xl font-semibold text-white mt-4">The Flight Logs</h4>
          <p>
            Pilot-recorded manifests for Epstein’s private aircraft fleet. These are logistical
            records, not criminal ledgers. The presence of a name establishes only presence, not
            purpose. As legal experts note, "being on the flight log doesn’t prove a crime" without
            corroborating testimony.
          </p>

          <h4 className="text-xl font-semibold text-white mt-4">The Black Book</h4>
          <p>
            A compilation of phone numbers and addresses. It represents the infrastructure of
            Epstein's social climbing. Inclusion indicates Epstein had their contact info, not that
            they were "clients."
          </p>

          <h4 className="text-xl font-semibold text-white mt-4">The Birthday Book</h4>
          <p>
            Released in Sept 2025 by House Oversight. A gift for Epstein's 50th birthday containing
            photos, notes, and ephemera. It offers insight into his social intimacy with the elite
            after initial concerns had arisen.
          </p>

          <h4 className="text-xl font-semibold text-white mt-4">The Estate Emails (2009-2019)</h4>
          <p>
            A massive cache of 23,000+ pages released in Nov 2025. These cover the post-conviction
            era, revealing who remained in his orbit. Key exchanges include Epstein describing Trump
            as "the dog that hasn’t barked," and routine correspondence with figures like Larry
            Summers and Noam Chomsky.
          </p>

          <h4 className="text-xl font-semibold text-white mt-4">DOJ Discovery (VOL00001)</h4>
          <p>
            Ingested Dec 21, 2025. This volume contains 3,158 raw digital evidence files seized
            during the July 2019 FBI raid of Epstein's Manhattan mansion. It includes unredacted
            images, metadata, and financial records that were previously held under seal.
          </p>

          <h4 className="text-xl font-semibold text-white mt-4">DOJ Discovery (VOL00002-6)</h4>
          <p>
            Subsequent volumes contain heavily redacted document productions. Unlike Vol 1's raw
            digital evidence, these volumes consist primarily of procedural documents and
            correspondence where most substantive content has been blacked out under privacy
            protective orders.
          </p>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">
            Key Document Releases Timeline
          </h3>

          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            {/* Mobile Timeline */}
            <div className="md:hidden space-y-4">
              {timelineEvents.map((event, idx) => (
                <div
                  key={idx}
                  className="bg-slate-700/30 p-4 rounded-lg border border-slate-600/50 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50"></div>
                  <div className="flex flex-col gap-1 pl-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-blue-400 font-mono text-xs font-bold uppercase tracking-wider bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        {event.date}
                      </span>
                    </div>
                    <div className="text-white font-bold text-lg">{event.source}</div>
                    <div className="text-slate-300 text-sm leading-relaxed mt-1">
                      {event.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Timeline */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="pb-2 text-left">Date</th>
                    <th className="pb-2 text-left">Source</th>
                    <th className="pb-2 text-left">Key Content</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {timelineEvents.map((event, idx) => (
                    <tr key={idx}>
                      <td className="py-2 text-slate-300 whitespace-nowrap pr-4">{event.date}</td>
                      <td className="py-2 text-slate-300 pr-4">{event.source}</td>
                      <td className="py-2 text-slate-400">{event.content}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-6 mt-8 border border-slate-700/50">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Shield className="h-6 w-6 text-emerald-400" />
              Legal Thresholds: Association vs. Complicity
            </h3>

            <div className="grid gap-4 md:grid-cols-3 mb-6">
              {/* Mere Presence */}
              <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600/30">
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-600 text-slate-200 mb-2">
                  Mere Presence
                </div>
                <p className="text-sm text-slate-300">
                  Being at a scene (e.g., flight) without participating is not a crime.
                </p>
              </div>

              {/* Complicity */}
              <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600/30">
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-900/50 text-orange-300 border border-orange-700/50 mb-2">
                  Complicity
                </div>
                <p className="text-sm text-slate-300">
                  Requires proof of specific intent to aid the trafficking.
                </p>
              </div>

              {/* Conspiracy */}
              <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600/30">
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/50 text-red-300 border border-red-700/50 mb-2">
                  Conspiracy
                </div>
                <p className="text-sm text-slate-300">
                  Requires proof of an agreement to commit a crime.
                </p>
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-4 mb-6">
              <h4 className="text-blue-300 font-semibold mb-2 flex items-center gap-2">
                DOJ Findings (July 2025)
              </h4>
              <p className="text-sm text-blue-100/80 leading-relaxed">
                Concluded that while many powerful men associated with Epstein, obtaining evidence
                sufficient for federal prosecution of third parties remains legally distinct from
                proving social association.
              </p>
            </div>

            <div className="text-slate-400 text-sm italic border-t border-slate-700/50 pt-4">
              <strong className="text-slate-300 not-italic">How we use this:</strong> These legal
              thresholds directly inform our <strong>Red Flag Index</strong>. Entities with mere
              "Flight Log" appearances receive a low risk score (1-2), while those with sworn
              testimony alleging participation or specific knowledge are flagged with higher risk
              scores (4-5).
            </div>
          </div>
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
              Advanced natural language processing extracts entities, relationships, and context
              from documents
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-6 space-y-3">
            <Network className="h-10 w-10 text-green-400 mb-2" />
            <h3 className="text-lg font-semibold text-white">Relationship Mapping</h3>
            <p className="text-slate-400 text-sm">
              Automatically identifies connections between entities based on co-occurrence and
              context
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-6 space-y-3">
            <Shield className="h-10 w-10 text-orange-400 mb-2" />
            <h3 className="text-lg font-semibold text-white">Red Flag Index</h3>
            <p className="text-slate-400 text-sm">
              Risk scoring system based on document frequency, evidence types, and contextual
              analysis
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
            <li className="flex items-center gap-2 text-blue-300 font-semibold">
              <span className="text-blue-400">✨</span>
              Integrated Side-by-Side PDF Viewer
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              Investigation workspace with hypothesis tracking
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              Categorised media library with {stats.media.toLocaleString()} images
            </li>
            <li className="flex items-center gap-2 text-blue-300 font-semibold">
              <span className="text-blue-400">✨</span>
              Audio & Video with synchronized transcripts and chapter markers
            </li>
          </ul>
        </div>
      </section>

      {/* Audio & Video Credits */}
      <section className="bg-slate-900/60 rounded-lg p-8 space-y-6 border border-slate-700/60">
        <div className="flex items-center gap-3 mb-2">
          <ImageIcon className="h-8 w-8 text-blue-400" />
          <h2 className="text-3xl font-bold text-white">Audio & Video with Transcripts</h2>
        </div>
        <p className="text-slate-300">
          The archive features interview audio with precision transcripts, chapter markers, and a
          synchronized reading experience.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <h3 className="text-lg font-semibold text-white mb-2">Credits</h3>
            <ul className="space-y-2 text-slate-300">
              <li>
                Testimony & Interview:
                <a
                  href="https://www.threads.com/@saschabarros"
                  className="text-cyan-400 hover:underline ml-1"
                >
                  Sascha Riley
                </a>
              </li>
              <li>
                Investigation & Publication:
                <a
                  href="https://www.threads.com/@lvoldeng"
                  className="text-cyan-400 hover:underline ml-1"
                >
                  Lisa Noelle Volding
                </a>
              </li>
              <li>
                Transcripts:
                <a
                  href="https://www.threads.com/@roguerevision"
                  className="text-cyan-400 hover:underline ml-1"
                >
                  Gareth Wright
                </a>
              </li>
            </ul>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <h3 className="text-lg font-semibold text-white mb-2">Original Publication</h3>
            <p className="text-slate-300 mb-3">Read the original briefing and recordings:</p>
            <a
              href="https://lisevoldeng.substack.com/p/dont-worry-boys-are-hard-to-find?r=1uodw7&triedRedirect=true"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-900/20"
            >
              Read Full Briefing on Substack
            </a>
          </div>
        </div>
      </section>

      {/* What's Next */}
      <section className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-8 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <ImageIcon className="h-8 w-8 text-blue-400" />
          <h2 className="text-3xl font-bold text-white">Built for Future Releases</h2>
        </div>
        <p className="text-slate-300 leading-relaxed">
          This archive is designed to rapidly ingest and analyse new document releases as they are
          unsealed. Our automated pipeline can process thousands of pages, extract entities, and
          update the relationship graph within hours of new documents becoming available.
        </p>
        <p className="text-slate-300 leading-relaxed">
          As more documents are released through ongoing legal proceedings, FOIA requests, and court
          unsealing orders, this database will continue to grow and provide increasingly
          comprehensive coverage of the Epstein case and its connections.
        </p>
        <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4 mt-4">
          <p className="text-blue-200 text-sm">
            <strong>Latest Addition:</strong> January 12, 2026 - V9.2.0 Major Release: "Operation
            Spring Cleaning" complete. Unified entity data, optimized data quality, and introduced
            advanced Admin Dashboard with Audit Logs. System now features hardened production
            security and a{' '}
            <a
              href="https://github.com/ErikVeland/epstein-archive/tree/main/docs/data-governance-standards.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline underline"
            >
              Forensic Transparancy & Accountability Charter
            </a>
            .
          </p>
        </div>
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4 mt-4">
          <p className="text-purple-200 text-sm">
            <strong>🔥 Find High-Impact Documents:</strong> Use the Document Browser and filter by
            "Red Flag Rating" (highest first) to discover the most significant documents. High-risk
            documents (4-5) contain keywords related to victims, trafficking, key figures, and
            financial transactions.
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
            <strong>This is a research and journalism tool.</strong> The presence of a name in this
            database does not imply criminal activity or wrongdoing. Many individuals appear in
            documents as witnesses, staff, journalists, or peripheral figures.
          </p>
          <p>
            <strong>Legal thresholds matter:</strong> Mere presence on a flight log or in a contact
            book is not evidence of a crime. Complicity requires proof of specific intent to aid
            trafficking. Conspiracy requires proof of an agreement. Association is not guilt.
          </p>
          <p>
            <strong>Source documents:</strong> All data is derived from publicly available court
            documents, government releases, and verified sources. We do not make claims beyond what
            is documented in the source material.
          </p>
          <p>
            <strong>Consult professionals:</strong> This tool makes government information more
            accessible. Please consult qualified legal professionals for advice specific to your
            circumstances.
          </p>
        </div>
      </section>

      {/* Footer */}
      <div className="text-center text-slate-500 text-sm pt-8 border-t border-slate-700">
        <p>Last updated: January 12, 2026</p>
        <p className="mt-2">Built with transparency and accountability in mind</p>
      </div>
    </div>
  );
};

export default AboutPage;
