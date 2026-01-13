import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Clock, FileText, Calendar, Users, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { apiClient } from '../services/apiClient';

interface EntityLink {
  id: number;
  name: string;
}

interface TimelineEvent {
  date: Date;
  title: string;
  description: string;
  type:
    | 'email'
    | 'document'
    | 'flight'
    | 'legal'
    | 'financial'
    | 'testimony'
    | 'incident'
    | 'other';
  file: string;
  original_file_path?: string;
  entities: (string | EntityLink)[];
  significance: 'high' | 'medium' | 'low';
  is_curated?: boolean;
  related_document?: { id: number; name: string; path: string } | null; // Linked source document
}

interface TimelineProps {
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = React.memo(({ className = '' }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filteredSignificance, setFilteredSignificance] = useState<('high' | 'medium' | 'low')[]>([
    'high',
    'medium',
    'low',
  ]); // Default to show all

  // Filter events based on significance
  const filteredEvents = useMemo(() => {
    return events.filter((event) => filteredSignificance.includes(event.significance));
  }, [events, filteredSignificance]);

  // Sort events based on current sort order
  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      const dateA = a.date.getTime();
      const dateB = b.date.getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [filteredEvents, sortOrder]);

  // Toggle significance filter
  const toggleSignificanceFilter = (significance: 'high' | 'medium' | 'low') => {
    setFilteredSignificance((prev) => {
      if (prev.includes(significance)) {
        return prev.filter((s) => s !== significance);
      } else {
        return [...prev, significance];
      }
    });
  };

  useEffect(() => {
    loadTimelineData();
  }, []);

  const loadTimelineData = async () => {
    try {
      setLoading(true);

      // Fetch events from API
      const response = await fetch('/api/timeline');
      const data = await response.json();

      console.log('Timeline API response:', data);

      if (Array.isArray(data) && data.length > 0) {
        console.log(`Loaded ${data.length} timeline events from API`);

        const timelineEvents: TimelineEvent[] = data
          .map((event: any) => ({
            date: new Date(event.date),
            title: event.title || 'Untitled Event',
            description: event.description || `Document: ${event.title || 'Untitled'}`,
            type: (event.type?.toLowerCase() as any) || 'document',
            file: event.file_path || '',
            original_file_path: event.original_file_path || '',
            entities: event.entities || (event.primary_entity ? [event.primary_entity] : []),
            significance: event.significance_score || 'medium',
            is_curated: event.is_curated || false,
            related_document: event.related_document || null,
          }))
          .filter((event) => !isNaN(event.date.getTime()));

        console.log(`After filtering invalid dates: ${timelineEvents.length} events`);
        setEvents(timelineEvents);
      } else {
        console.warn('No timeline events found in API response');
        console.log('API response was:', JSON.stringify(data).substring(0, 500));
        // Don't fall back to sample data - show empty state
        setEvents([]);
      }
    } catch (error) {
      console.error('Error loading timeline data:', error);
      // Don't fall back to sample data - show empty state
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr || typeof dateStr !== 'string') return null;

    // Clean up the date string
    let cleanDate = dateStr.replace(/\n/g, ' ').trim();

    // Handle common date formatting issues
    cleanDate = cleanDate.replace(/\s+/g, ' '); // Normalize whitespace
    cleanDate = cleanDate.replace(/[^\d\s\w,:/-]/g, ''); // Remove special characters that aren't part of dates

    // Handle fuzzy date expressions
    const fuzzyDates: Record<string, Date> = {
      'early 2000s': new Date('2000-01-01'),
      'mid 2000s': new Date('2005-01-01'),
      'late 2000s': new Date('2008-01-01'),
      'early 2010s': new Date('2010-01-01'),
      'mid 2010s': new Date('2015-01-01'),
      'late 2010s': new Date('2018-01-01'),
      'early 2019': new Date('2019-01-01'),
      'mid 2019': new Date('2019-06-01'),
      'late 2019': new Date('2019-10-01'),
      'early 2020': new Date('2020-01-01'),
      'mid 2020': new Date('2020-06-01'),
      'late 2020': new Date('2020-10-01'),
    };

    // Check for fuzzy date expressions
    const lowerDate = cleanDate.toLowerCase();
    for (const [expression, date] of Object.entries(fuzzyDates)) {
      if (lowerDate.includes(expression)) {
        return date;
      }
    }

    // Try different date formats with more comprehensive regex patterns
    const formats = [
      // MM/DD/YY or MM/DD/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/,
      // YYYY-MM-DD or YYYY/MM/DD
      /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/,
      // DD-MM-YY or DD-MM-YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{2,4})$/,
      // DD/MM/YY or DD/MM/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/,
      // Month DD, YYYY (e.g., January 1, 2020)
      /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/,
      // DD Month YYYY (e.g., 1 January 2020)
      /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/,
      // Month DD YYYY (e.g., January 1 2020)
      /^([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})$/,
      // DD-Month-YYYY (e.g., 1-January-2020)
      /^(\d{1,2})-([A-Za-z]+)-(\d{4})$/,
      // YYYY Month DD (e.g., 2020 January 1)
      /^(\d{4})\s+([A-Za-z]+)\s+(\d{1,2})$/,
      // ISO format with time (e.g., 2020-01-01T10:30:00)
      /^(\d{4})-(\d{1,2})-(\d{1,2})T\d{2}:\d{2}:\d{2}/,
      // Simple YYYY-MM-DD with possible time (e.g., 2020-01-01 10:30)
      /^(\d{4})-(\d{1,2})-(\d{1,2})\s+\d{1,2}:\d{2}/,
    ];

    // Try each format
    for (const format of formats) {
      const match = cleanDate.match(format);
      if (match) {
        try {
          let date: Date;

          // Handle different format groups
          if (match.length >= 4) {
            // Format with month, day, year groups
            if (
              isNaN(parseInt(match[1])) ||
              isNaN(parseInt(match[2])) ||
              isNaN(parseInt(match[3]))
            ) {
              continue;
            }

            // Determine which group is year based on length
            let year, month, day;
            if (match[1].length === 4) {
              // YYYY-MM-DD format
              year = parseInt(match[1]);
              month = parseInt(match[2]) - 1; // JS months are 0-indexed
              day = parseInt(match[3]);
            } else if (match[3].length === 4) {
              // MM/DD/YYYY or DD Month YYYY format
              if (isNaN(Date.parse(match[1]))) {
                // Numeric month
                month = parseInt(match[1]) - 1;
                day = parseInt(match[2]);
              } else {
                // Named month
                month = new Date(Date.parse(match[1] + ' 1, 2020')).getMonth();
                day = parseInt(match[2]);
              }
              year = parseInt(match[3]);
            } else {
              // MM/DD/YY format
              month = parseInt(match[1]) - 1;
              day = parseInt(match[2]);
              const shortYear = parseInt(match[3]);
              year = shortYear < 50 ? 2000 + shortYear : 1900 + shortYear; // Assume 20xx for years < 50
            }

            date = new Date(year, month, day);
          } else {
            // Simple date parsing
            date = new Date(cleanDate);
          }

          const now = new Date();

          // Enhanced validation
          if (
            !isNaN(date.getTime()) &&
            date.getFullYear() >= 1900 &&
            date.getFullYear() <= now.getFullYear() + 1 && // Allow current year + 1 for documents in progress
            date >= new Date('1900-01-01') &&
            date <= new Date(now.getFullYear() + 1, 11, 31)
          ) {
            // Allow up to end of next year
            return date;
          }
        } catch (e) {
          console.warn(`Error parsing date: ${cleanDate}`, e);
          continue;
        }
      }
    }

    // Try direct date parsing as fallback
    try {
      const directDate = new Date(cleanDate);
      if (!isNaN(directDate.getTime())) {
        const now = new Date();
        if (directDate.getFullYear() >= 1900 && directDate.getFullYear() <= now.getFullYear() + 1) {
          return directDate;
        }
      }
    } catch (e) {
      // Ignore direct parsing errors
    }

    return null;
  };

  const generateEventTitle = (filename: string, date: Date, metadata: any): string => {
    const year = date.getFullYear();
    const basename = filename.split('/').pop() || filename;
    const entities = metadata.entities?.slice(0, 5) || [];

    // Extract key entities with their types if available
    const keyEntities = entities.map((entity: string) => {
      // Try to extract entity type from metadata if available
      const entityInfo = metadata.entity_details?.find((e: any) => e.name === entity);
      return {
        name: entity,
        type: entityInfo?.type || 'person',
        significance: entityInfo?.significance || 'medium',
      };
    });

    // Prioritize high-significance entities
    const highSignificanceEntities = keyEntities.filter((e: any) => e.significance === 'high');
    const significantEntities =
      highSignificanceEntities.length > 0 ? highSignificanceEntities : keyEntities;

    // Extract first names and limit to 3 for brevity
    const entityNames = significantEntities
      .slice(0, 3)
      .map((e: any) => e.name)
      .join(', ');

    // Enhanced title generation with more context

    // Special cases for high-profile events
    if (basename.toLowerCase().includes('epstein') && basename.toLowerCase().includes('arrest')) {
      return `Jeffrey Epstein Arrested on Federal Sex Trafficking Charges`;
    } else if (
      basename.toLowerCase().includes('epstein') &&
      basename.toLowerCase().includes('death')
    ) {
      return `Jeffrey Epstein Found Dead in Manhattan Jail`;
    } else if (
      basename.toLowerCase().includes('maxwell') &&
      basename.toLowerCase().includes('arrest')
    ) {
      return `Ghislaine Maxwell Arrested in New Hampshire`;
    } else if (
      basename.toLowerCase().includes('plea') &&
      basename.toLowerCase().includes('agreement')
    ) {
      return `Controversial Plea Deal Reached in Epstein Case`;
    }

    // Flight logs with specific entities
    if (basename.toLowerCase().includes('flight')) {
      if (entityNames) {
        return `Flight Log: Travel with ${entityNames}`;
      }
      return `Epstein's Private Jet Flight Records`;
    }

    // Email communications
    if (basename.toLowerCase().includes('email')) {
      if (entityNames) {
        return `Email Correspondence: ${entityNames}`;
      }
      return `Email Communications`;
    }

    // Legal documents
    if (
      basename.toLowerCase().includes('legal') ||
      basename.toLowerCase().includes('court') ||
      basename.toLowerCase().includes('deposition')
    ) {
      if (entityNames) {
        // Check for specific legal contexts
        if (basename.toLowerCase().includes('indictment')) {
          return `Indictment Filed Against ${entityNames}`;
        } else if (
          basename.toLowerCase().includes('testimony') ||
          basename.toLowerCase().includes('deposition')
        ) {
          return `Testimony Given by ${entityNames}`;
        } else {
          return `Legal Proceedings Involving ${entityNames}`;
        }
      }
      return `Legal Documentation`;
    }

    // Financial records
    if (basename.toLowerCase().includes('financial')) {
      if (entityNames) {
        return `Financial Transaction: ${entityNames}`;
      }
      return `Financial Records`;
    }

    // Testimonies
    if (
      basename.toLowerCase().includes('testimony') ||
      basename.toLowerCase().includes('deposition')
    ) {
      if (entityNames) {
        return `Sworn Testimony of ${entityNames}`;
      }
      return `Testimony Record`;
    }

    // Photographs
    if (basename.toLowerCase().includes('photo') || basename.toLowerCase().includes('picture')) {
      if (entityNames) {
        return `Photograph Featuring ${entityNames}`;
      }
      return `Photographic Evidence`;
    }

    // Island visits
    if (basename.toLowerCase().includes('island') || basename.toLowerCase().includes('little st')) {
      if (entityNames) {
        return `Island Visit: ${entityNames}`;
      }
      return `Epstein Island Records`;
    }

    // Content-based titles
    if (metadata.word_count > 15000) {
      if (entityNames) {
        return `Major Investigation Document: ${entityNames}`;
      }
      return `Major Investigation Document`;
    }

    // Entity-based titles
    if (significantEntities.length > 3) {
      return `Multiple High-Profile Individuals Documented`;
    } else if (significantEntities.length > 0) {
      const primaryEntity = significantEntities[0];
      if (primaryEntity.type === 'organization') {
        return `Document Related to ${primaryEntity.name}`;
      } else {
        return `Document Featuring ${primaryEntity.name}`;
      }
    }

    // Default file type based titles
    const fileType = basename.includes('email')
      ? 'Email'
      : basename.includes('flight')
        ? 'Flight Log'
        : basename.includes('legal')
          ? 'Legal Document'
          : basename.includes('financial')
            ? 'Financial Record'
            : basename.includes('ocr')
              ? 'Document Scan'
              : basename.includes('testimony')
                ? 'Testimony'
                : basename.includes('photo')
                  ? 'Photograph'
                  : basename.includes('picture')
                    ? 'Photograph'
                    : 'Document';

    return `${fileType} - ${basename.replace(/_/g, ' ').substring(0, 30)}...`;
  };

  const generateEventDescription = (metadata: any): string => {
    const entities = metadata.entities?.slice(0, 8) || [];
    const entityText = entities.length > 0 ? ` Key entities: ${entities.join(', ')}.` : '';
    const basename = metadata.filename?.split('/').pop() || metadata.filename || 'Unknown file';
    const category = metadata.category || 'document';

    // Enhanced description with more detailed context
    let description = `${basename.replace(/_/g, ' ')} (${category}).`;

    // Add word count information with better context
    if (metadata.word_count) {
      if (metadata.word_count > 20000) {
        description += ` Contains ${metadata.word_count.toLocaleString()} words - a highly significant and comprehensive document.`;
      } else if (metadata.word_count > 10000) {
        description += ` Contains ${metadata.word_count.toLocaleString()} words - a major document with extensive content.`;
      } else if (metadata.word_count > 5000) {
        description += ` Contains ${metadata.word_count.toLocaleString()} words - a substantial document.`;
      }
    }

    // Add context based on category with more detail
    switch (category) {
      case 'emails':
        description += ' Contains email communications and correspondence.';
        break;
      case 'flight_logs':
        description += ' Detailed flight log record with passenger and travel information.';
        break;
      case 'legal_documents':
        description += ' Legal documentation including court records and proceedings.';
        break;
      case 'financial_records':
        description += ' Financial records with transaction details and account information.';
        break;
      case 'testimonies':
        description += ' Testimony record with sworn statements and depositions.';
        break;
      case 'investigation_files':
        description += ' Investigation file with evidence and findings.';
        break;
      default:
        description += ' General document with investigative content.';
    }

    // Add entity information with significance context
    if (entities.length > 0) {
      description += entityText;
    }

    return description.trim();
  };

  const mapCategoryToType = (category: string): TimelineEvent['type'] => {
    switch (category) {
      case 'emails':
        return 'email';
      case 'flight_logs':
        return 'flight';
      case 'legal_documents':
        return 'legal';
      case 'financial_records':
        return 'financial';
      case 'testimonies':
        return 'testimony';
      default:
        return 'document';
    }
  };

  const determineSignificance = (metadata: any, filePath: string): 'high' | 'medium' | 'low' => {
    // High significance criteria
    if (metadata.word_count > 25000) return 'high';
    if (metadata.entities?.length > 25) return 'high';
    if (
      filePath.toLowerCase().includes('epstein') &&
      (filePath.toLowerCase().includes('death') ||
        filePath.toLowerCase().includes('arrest') ||
        filePath.toLowerCase().includes('plea') ||
        filePath.toLowerCase().includes('indictment'))
    )
      return 'high';
    if (filePath.toLowerCase().includes('trump') && metadata.entities?.length > 8) return 'high';
    if (filePath.toLowerCase().includes('clinton') && metadata.entities?.length > 8) return 'high';
    if (filePath.toLowerCase().includes('prince') && metadata.entities?.length > 5) return 'high';

    // Medium significance criteria
    if (metadata.word_count > 10000) return 'medium';
    if (metadata.entities?.length > 15) return 'medium';
    if (filePath.toLowerCase().includes('epstein') && metadata.entities?.length > 5)
      return 'medium';
    if (metadata.word_count > 2000 && metadata.entities?.length > 5) return 'medium';
    if (filePath.toLowerCase().includes('maxwell') && metadata.entities?.length > 3)
      return 'medium';

    // Low significance criteria
    if (metadata.word_count > 500 && metadata.entities?.length > 2) return 'low';
    return 'low';
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTypeIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'email':
        return <FileText className="h-4 w-4" />;
      case 'flight':
        return <Calendar className="h-4 w-4" />;
      case 'legal':
        return <Users className="h-4 w-4" />;
      case 'financial':
        return <FileText className="h-4 w-4" />;
      case 'testimony':
        return <Users className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'email':
        return 'bg-blue-500';
      case 'flight':
        return 'bg-green-500';
      case 'legal':
        return 'bg-red-500';
      case 'financial':
        return 'bg-yellow-500';
      case 'testimony':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSignificanceColor = (significance: 'high' | 'medium' | 'low') => {
    switch (significance) {
      case 'high':
        return 'border-red-500/50 bg-red-900/10 hover:bg-red-900/20';
      case 'medium':
        return 'border-yellow-500/50 bg-yellow-900/10 hover:bg-yellow-900/20';
      case 'low':
        return 'border-green-500/50 bg-green-900/10 hover:bg-green-900/20';
    }
  };

  if (loading) {
    return (
      <div
        className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 ${className}`}
      >
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mr-3"></div>
          <span className="text-white">Loading timeline data from evidence database...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Filters and Sort - Sticky bar */}
      <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-sm py-3 -mx-4 px-4 md:-mx-6 md:px-6 border-b border-slate-700/50">
        <div className="flex flex-wrap items-center gap-2">
          {/* Significance Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => toggleSignificanceFilter('high')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-full transition-all duration-200 text-xs h-7 ${
                filteredSignificance.includes('high')
                  ? 'bg-red-900/40 border-red-500/50 text-red-200'
                  : 'bg-red-900/20 border-red-500/30 text-red-300/60 hover:bg-red-900/30'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="hidden sm:inline">High</span>
            </button>
            <button
              onClick={() => toggleSignificanceFilter('medium')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-full transition-all duration-200 text-xs h-7 ${
                filteredSignificance.includes('medium')
                  ? 'bg-yellow-900/40 border-yellow-500/50 text-yellow-200'
                  : 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300/60 hover:bg-yellow-900/30'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span className="hidden sm:inline">Medium</span>
            </button>
            <button
              onClick={() => toggleSignificanceFilter('low')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-full transition-all duration-200 text-xs h-7 ${
                filteredSignificance.includes('low')
                  ? 'bg-green-900/40 border-green-500/50 text-green-200'
                  : 'bg-green-900/20 border-green-500/30 text-green-300/60 hover:bg-green-900/30'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="hidden sm:inline">Low</span>
            </button>
          </div>

          {/* Spacer to push sort button right */}
          <div className="flex-grow"></div>

          {/* Sort Toggle - Far Right */}
          <button
            onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-full hover:bg-slate-700 hover:border-slate-500 transition-all duration-200 text-xs text-slate-200 h-7 whitespace-nowrap"
            title={sortOrder === 'desc' ? 'Showing newest first' : 'Showing oldest first'}
          >
            {sortOrder === 'desc' ? (
              <>
                <ArrowDown className="w-3.5 h-3.5" />
                <span>Newest First</span>
              </>
            ) : (
              <>
                <ArrowUp className="w-3.5 h-3.5" />
                <span>Oldest First</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="relative border-l-2 border-slate-700 ml-4 md:ml-6 space-y-8">
        {sortedEvents.map((event, index) => (
          <div key={index} className="relative pl-8 md:pl-12">
            {/* Timeline Dot */}
            <div
              className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full border-2 border-slate-900 ${
                event.significance === 'high'
                  ? 'bg-red-500'
                  : event.significance === 'medium'
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
              }`}
            ></div>

            {/* Event Card */}
            <div
              className={`rounded-xl border p-5 cursor-pointer transition-all duration-300 ${
                event.is_curated
                  ? 'border-amber-500/50 bg-amber-900/10 hover:bg-amber-900/20'
                  : getSignificanceColor(event.significance)
              }`}
              onClick={() => setSelectedEvent(event)}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-mono text-cyan-400 bg-cyan-900/20 px-2 py-0.5 rounded">
                      {formatDate(event.date)}
                    </span>
                    <div
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider ${
                        event.type === 'legal'
                          ? 'bg-purple-900/30 text-purple-300'
                          : event.type === 'flight'
                            ? 'bg-blue-900/30 text-blue-300'
                            : event.type === 'financial'
                              ? 'bg-emerald-900/30 text-emerald-300'
                              : event.type === 'incident'
                                ? 'bg-amber-900/30 text-amber-300' // New styling
                                : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {getTypeIcon(event.type)}
                      <span>{event.type}</span>
                    </div>
                    {event.is_curated && (
                      <span className="text-xs font-bold text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded bg-amber-900/20">
                        KEY EVENT
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                    {event.title}
                  </h3>

                  <p className="text-slate-300 text-sm leading-relaxed mb-3 line-clamp-2">
                    {event.description}
                  </p>

                  {event.entities.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {event.entities.slice(0, 4).map((entity, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-slate-800 border border-slate-600 text-slate-300 rounded text-xs flex items-center gap-1"
                        >
                          <Users className="w-3 h-3" />
                          {typeof entity === 'string' ? entity : entity.name}
                        </span>
                      ))}
                      {event.entities.length > 4 && (
                        <span className="px-2 py-1 bg-slate-800 border border-slate-600 text-slate-400 rounded text-xs">
                          +{event.entities.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="hidden md:block shrink-0">
                  <div className="w-32 h-24 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center overflow-hidden relative group">
                    <FileText className="w-8 h-8 text-slate-600 group-hover:text-slate-400 transition-colors" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                      <span className="text-xs text-white font-medium">
                        {event.is_curated ? 'View Details' : 'View Source'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedEvent &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={() => setSelectedEvent(null)}
          >
            <div
              className="bg-slate-900 border border-slate-600 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
                <h3 className="text-xl font-bold text-white pr-8">{selectedEvent.title}</h3>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800 p-3 rounded-lg">
                    <span className="text-slate-400 text-xs uppercase tracking-wider block mb-1">
                      Date
                    </span>
                    <span className="text-white font-mono">{formatDate(selectedEvent.date)}</span>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-lg">
                    <span className="text-slate-400 text-xs uppercase tracking-wider block mb-1">
                      Type
                    </span>
                    <span className="text-white capitalize flex items-center gap-2">
                      {getTypeIcon(selectedEvent.type)}
                      {selectedEvent.type}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-xs uppercase tracking-wider block mb-2">
                    Description
                  </span>
                  <p className="text-slate-200 leading-relaxed bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                    {selectedEvent.description}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 text-xs uppercase tracking-wider block mb-2">
                    {selectedEvent.is_curated ? 'Related Documentation' : 'Source Document'}
                  </span>

                  {selectedEvent.related_document ? (
                    <Link
                      to={`/documents?id=${selectedEvent.related_document.id}`}
                      onClick={() => setSelectedEvent(null)}
                      className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg border border-cyan-500/30 hover:bg-cyan-900/20 hover:border-cyan-400 transition-colors group"
                    >
                      <FileText className="w-5 h-5 text-cyan-400" />
                      <span className="text-cyan-300 font-mono text-sm truncate flex-1 group-hover:text-cyan-200">
                        {selectedEvent.related_document.name}
                      </span>
                      <span className="px-3 py-1 bg-cyan-900/30 text-cyan-300 text-xs rounded border border-cyan-500/30">
                        View Document
                      </span>
                    </Link>
                  ) : selectedEvent.file ? (
                    <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg border border-slate-700">
                      <FileText className="w-5 h-5 text-cyan-400" />
                      <span className="text-cyan-300 font-mono text-sm truncate flex-1">
                        {selectedEvent.file.split('/').pop()}
                      </span>
                      <a
                        href={
                          selectedEvent.original_file_path
                            ? `/files/${selectedEvent.original_file_path.replace('/data/originals/', '')}`
                            : '#'
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-cyan-900/30 text-cyan-300 text-xs rounded hover:bg-cyan-900/50 transition-colors border border-cyan-500/30 flex items-center gap-1"
                      >
                        Open PDF
                      </a>
                    </div>
                  ) : (
                    <div className="text-slate-400 italic text-sm">
                      No direct document linked to this event.
                    </div>
                  )}
                </div>

                {selectedEvent.entities.length > 0 && (
                  <div>
                    <span className="text-slate-400 text-xs uppercase tracking-wider block mb-2">
                      Related Entities
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.entities.map((entity, i) => {
                        if (typeof entity === 'object' && entity.id) {
                          return (
                            <Link
                              key={i}
                              to={`/entity/${entity.id}`}
                              onClick={() => setSelectedEvent(null)}
                              className="px-3 py-1.5 bg-slate-800 text-cyan-300 rounded-lg border border-cyan-500/30 text-sm hover:bg-cyan-900/30 hover:border-cyan-400 transition-colors cursor-pointer"
                            >
                              {entity.name}
                            </Link>
                          );
                        }
                        return (
                          <span
                            key={i}
                            className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg border border-slate-700 text-sm"
                          >
                            {typeof entity === 'string' ? entity : entity.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
});
export default Timeline;
