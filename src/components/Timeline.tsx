import React, { useState, useEffect } from 'react';
import { Clock, FileText, Calendar, Users } from 'lucide-react';

interface TimelineEvent {
  date: Date;
  title: string;
  description: string;
  type: 'email' | 'document' | 'flight' | 'legal' | 'financial' | 'testimony';
  file: string;
  entities: string[];
  significance: 'high' | 'medium' | 'low';
}

interface TimelineProps {
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ className = "" }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

  useEffect(() => {
    loadTimelineData();
  }, []);

  const loadTimelineData = async () => {
    try {
      setLoading(true);
      
      // Load evidence database to extract dates
      const response = await fetch('/data/evidence_database.json');
      if (!response.ok) {
        throw new Error('Failed to load evidence data');
      }
      
      const evidenceData = await response.json();
      const timelineEvents: TimelineEvent[] = [];
      
      // Process each file to extract dates and create events
      Object.entries(evidenceData.file_metadata).forEach(([filePath, metadata]: [string, any]) => {
        if (metadata.dates && metadata.dates.length > 0) {
          metadata.dates.forEach((dateStr: string) => {
            const parsedDate = parseDate(dateStr);
            if (parsedDate) {
              const event: TimelineEvent = {
                date: parsedDate,
                title: generateEventTitle(metadata.filename, parsedDate),
                description: generateEventDescription(metadata),
                type: mapCategoryToType(metadata.category),
                file: metadata.filename,
                entities: metadata.entities?.slice(0, 5) || [],
                significance: determineSignificance(metadata, filePath)
              };
              timelineEvents.push(event);
            }
          });
        }
      });
      
      // Sort events by date (newest first)
      timelineEvents.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      // Take top 50 most significant events
      const significantEvents = timelineEvents
        .sort((a, b) => {
          const significanceOrder = { high: 3, medium: 2, low: 1 };
          return significanceOrder[b.significance] - significanceOrder[a.significance];
        })
        .slice(0, 50)
        .sort((a, b) => b.date.getTime() - a.date.getTime());
      
      setEvents(significantEvents);
    } catch (error) {
      console.error('Error loading timeline data:', error);
      // Fallback to sample events
      setEvents(generateSampleEvents());
    } finally {
      setLoading(false);
    }
  };

  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    
    // Clean up the date string
    const cleanDate = dateStr.replace(/\n/g, ' ').trim();
    
    // Try different date formats
    const formats = [
      // MM/DD/YY
      /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/,
      // MM/DD/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // YYYY-MM-DD
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      // Month DD, YYYY
      /^([A-Za-z]+) (\d{1,2}), (\d{4})$/,
      // DD Month YYYY
      /^(\d{1,2}) ([A-Za-z]+) (\d{4})$/
    ];
    
    for (const format of formats) {
      const match = cleanDate.match(format);
      if (match) {
        try {
          const date = new Date(cleanDate);
          if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2030) {
            return date;
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    return null;
  };

  const generateEventTitle = (filename: string, date: Date): string => {
    const year = date.getFullYear();
    const fileType = filename.includes('email') ? 'Email' : 
                    filename.includes('flight') ? 'Flight Log' :
                    filename.includes('legal') ? 'Legal Document' :
                    filename.includes('financial') ? 'Financial Record' :
                    'Document';
    
    return `${fileType} from ${year}`;
  };

  const generateEventDescription = (metadata: any): string => {
    const entities = metadata.entities?.slice(0, 3) || [];
    const entityText = entities.length > 0 ? ` involving ${entities.join(', ')}` : '';
    const category = metadata.category || 'document';
    
    return `${metadata.filename} (${category})${entityText}. File contains ${metadata.word_count?.toLocaleString() || 'numerous'} words.`;
  };

  const mapCategoryToType = (category: string): TimelineEvent['type'] => {
    switch (category) {
      case 'emails': return 'email';
      case 'flight_logs': return 'flight';
      case 'legal_documents': return 'legal';
      case 'financial_records': return 'financial';
      case 'testimonies': return 'testimony';
      default: return 'document';
    }
  };

  const determineSignificance = (metadata: any, filePath: string): 'high' | 'medium' | 'low' => {
    // High significance criteria
    if (metadata.word_count > 10000) return 'high';
    if (metadata.category === 'emails' && metadata.entities?.length > 5) return 'high';
    if (filePath.toLowerCase().includes('epstein') || filePath.toLowerCase().includes('trump')) return 'high';
    
    // Medium significance criteria
    if (metadata.word_count > 1000) return 'medium';
    if (metadata.entities?.length > 2) return 'medium';
    
    return 'low';
  };

  const generateSampleEvents = (): TimelineEvent[] => {
    return [
      {
        date: new Date('2019-08-10'),
        title: 'Jeffrey Epstein Found Dead',
        description: 'Jeffrey Epstein found dead in his Manhattan jail cell. Official ruling: suicide by hanging.',
        type: 'legal',
        file: 'EPSTEIN_DEATH_REPORT.pdf',
        entities: ['Jeffrey Epstein', 'Manhattan Correctional Center', 'Medical Examiner'],
        significance: 'high'
      },
      {
        date: new Date('2019-07-06'),
        title: 'Epstein Arrested',
        description: 'Jeffrey Epstein arrested at Teterboro Airport on sex trafficking charges.',
        type: 'legal',
        file: 'EPSTEIN_ARREST_REPORT.pdf',
        entities: ['Jeffrey Epstein', 'FBI', 'SDNY'],
        significance: 'high'
      },
      {
        date: new Date('2008-06-30'),
        title: 'Plea Deal Finalized',
        description: 'Epstein signs controversial plea deal with federal prosecutors in Florida.',
        type: 'legal',
        file: 'PLEA_AGREEMENT_2008.pdf',
        entities: ['Jeffrey Epstein', 'Alexander Acosta', 'Florida Prosecutors'],
        significance: 'high'
      }
    ];
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTypeIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'email': return <FileText className="h-4 w-4" />;
      case 'flight': return <Calendar className="h-4 w-4" />;
      case 'legal': return <Users className="h-4 w-4" />;
      case 'financial': return <FileText className="h-4 w-4" />;
      case 'testimony': return <Users className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'email': return 'bg-blue-500';
      case 'flight': return 'bg-green-500';
      case 'legal': return 'bg-red-500';
      case 'financial': return 'bg-yellow-500';
      case 'testimony': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getSignificanceColor = (significance: 'high' | 'medium' | 'low') => {
    switch (significance) {
      case 'high': return 'border-red-400 bg-red-900/20';
      case 'medium': return 'border-yellow-400 bg-yellow-900/20';
      case 'low': return 'border-green-400 bg-green-900/20';
    }
  };

  if (loading) {
    return (
      <div className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mr-3"></div>
          <span className="text-white">Building timeline from evidence data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <Clock className="h-6 w-6 mr-2 text-cyan-400" />
          Timeline of Events
        </h2>
        <div className="text-sm text-slate-400">
          {events.length} significant events
        </div>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {events.map((event, index) => (
          <div
            key={index}
            className={`border-l-4 pl-4 py-3 cursor-pointer transition-all duration-300 hover:bg-slate-700/30 rounded-r-lg ${getSignificanceColor(event.significance)}`}
            onClick={() => setSelectedEvent(event)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <div className={`p-1 rounded-full ${getTypeColor(event.type)} text-white`}>
                    {getTypeIcon(event.type)}
                  </div>
                  <span className="text-xs text-slate-400 uppercase tracking-wide">
                    {formatDate(event.date)}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                    event.significance === 'high' ? 'bg-red-600 text-red-100' :
                    event.significance === 'medium' ? 'bg-yellow-600 text-yellow-100' :
                    'bg-green-600 text-green-100'
                  }`}>
                    {event.significance.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-white font-semibold mb-1">{event.title}</h3>
                <p className="text-slate-300 text-sm mb-2">{event.description}</p>
                {event.entities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {event.entities.map((entity, i) => (
                      <span key={i} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">
                        {entity}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedEvent(null)}>
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">{selectedEvent.title}</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-slate-400">Date:</span>
                <span className="text-white ml-2">{formatDate(selectedEvent.date)}</span>
              </div>
              <div>
                <span className="text-slate-400">Type:</span>
                <span className="text-white ml-2 capitalize">{selectedEvent.type}</span>
              </div>
              <div>
                <span className="text-slate-400">File:</span>
                <span className="text-white ml-2 font-mono text-sm">{selectedEvent.file}</span>
              </div>
              <div>
                <p className="text-slate-300">{selectedEvent.description}</p>
              </div>
              {selectedEvent.entities.length > 0 && (
                <div>
                  <span className="text-slate-400 block mb-2">Related Entities:</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.entities.map((entity, i) => (
                      <span key={i} className="px-3 py-1 bg-slate-700 text-slate-300 rounded">
                        {entity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};