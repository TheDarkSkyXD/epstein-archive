import React, { useState, useRef, useEffect } from 'react';
import { TimelineEvent, EvidenceItem, Investigation, Hypothesis } from '../types/investigation';
import { format, parseISO, isValid } from 'date-fns';
import { ChevronDown, ChevronUp, ChevronRight, Calendar, Clock, Link2, FileText, Users, MapPin, Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';

interface TimelineBuilderProps {
  investigation: Investigation;
  events: TimelineEvent[];
  evidence: EvidenceItem[];
  hypotheses: Hypothesis[];
  onEventsUpdate: (events: TimelineEvent[]) => void;
}

interface TimelineGroup {
  startDate: string;
  events: TimelineEvent[];
}

export const InvestigationTimelineBuilder: React.FC<TimelineBuilderProps> = ({
  investigation,
  events,
  evidence,
  hypotheses,
  onEventsUpdate
}) => {
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [timelineScale, setTimelineScale] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [showFilters, setShowFilters] = useState(false);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [draggedEvent, setDraggedEvent] = useState<TimelineEvent | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [newEvent, setNewEvent] = useState<Partial<TimelineEvent> & { startDateString: string }>({
    title: '',
    description: '',
    startDateString: new Date().toISOString(),
    type: 'document',
    confidence: 80,
    documents: [],
    hypothesisIds: []
  });

  const eventTypes = [
    { value: 'document', label: 'Document', icon: FileText, color: 'bg-blue-500' },
    { value: 'meeting', label: 'Meeting', icon: Users, color: 'bg-green-500' },
    { value: 'location', label: 'Location', icon: MapPin, color: 'bg-purple-500' },
    { value: 'communication', label: 'Communication', icon: Link2, color: 'bg-orange-500' },
    { value: 'hypothesis', label: 'Hypothesis', icon: ChevronRight, color: 'bg-red-500' }
  ];

  const groupEventsByDate = (events: TimelineEvent[]): TimelineGroup[] => {
    const groups: { [key: string]: TimelineEvent[] } = {};
    
    events.forEach(event => {
      const eventDate = new Date(event.startDate);
      let groupKey = '';
      
      switch (timelineScale) {
        case 'day':
          groupKey = format(eventDate, 'yyyy-MM-dd');
          break;
        case 'week':
          groupKey = format(eventDate, 'yyyy-MM-dd'); // First day of week
          break;
        case 'month':
          groupKey = format(eventDate, 'yyyy-MM');
          break;
        case 'year':
          groupKey = format(eventDate, 'yyyy');
          break;
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(event);
    });

    return Object.keys(groups)
      .sort()
      .map(key => ({
        startDate: key,
        events: groups[key].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      }));
  };

  const filteredEvents = filterTypes.length > 0 
    ? events.filter(event => filterTypes.includes(event.type))
    : events;

  const timelineGroups = groupEventsByDate(filteredEvents);

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.startDateString) return;

    const event: TimelineEvent = {
      id: `event-${Date.now()}`,
      title: newEvent.title,
      description: newEvent.description || '',
      startDate: new Date(newEvent.startDateString),
      type: newEvent.type || 'document',
      confidence: newEvent.confidence || 80,
      documents: newEvent.documents || [],
      hypothesisIds: newEvent.hypothesisIds || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      layerId: 'default',
      entities: [],
      evidence: [],
      importance: 'medium',
      tags: [],
      sources: [],
      createdBy: 'current-user'
    };

    onEventsUpdate([...events, event]);
    setNewEvent({
      title: '',
      description: '',
      startDateString: new Date().toISOString(),
      type: 'document',
      confidence: 80,
      documents: [],
      hypothesisIds: []
    });
    setIsAddingEvent(false);
  };

  const handleEditEvent = (event: TimelineEvent) => {
    setEditingEvent(event);
    setNewEvent({
      title: event.title,
      description: event.description,
      startDateString: event.startDate.toISOString(),
      type: event.type,
      confidence: event.confidence,
      documents: event.documents,
      hypothesisIds: event.hypothesisIds
    });
  };

  const handleUpdateEvent = () => {
    if (!editingEvent || !newEvent.title || !newEvent.startDateString) return;

    const updatedEvent: TimelineEvent = {
      ...editingEvent,
      title: newEvent.title,
      description: newEvent.description || '',
      startDate: new Date(newEvent.startDateString),
      type: newEvent.type || 'document',
      confidence: newEvent.confidence || 80,
      documents: newEvent.documents || [],
      hypothesisIds: newEvent.hypothesisIds || [],
      updatedAt: new Date()
    };

    const updatedEvents = events.map(e => e.id === editingEvent.id ? updatedEvent : e);
    onEventsUpdate(updatedEvents);
    setEditingEvent(null);
    setNewEvent({
      title: '',
      description: '',
      startDateString: new Date().toISOString(),
      type: 'document',
      confidence: 80,
      documents: [],
      hypothesisIds: []
    });
  };

  const handleDeleteEvent = (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this timeline event?')) {
      onEventsUpdate(events.filter(e => e.id !== eventId));
    }
  };

  const handleDragStart = (event: TimelineEvent) => {
    setDraggedEvent(event);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    if (!draggedEvent) return;

    const updatedEvent = { ...draggedEvent, startDate: new Date(targetDate) };
    const updatedEvents = events.map(ev => ev.id === draggedEvent.id ? updatedEvent : ev);
    onEventsUpdate(updatedEvents);
    setDraggedEvent(null);
  };

  const getEventTypeIcon = (type: string) => {
    const eventType = eventTypes.find(et => et.value === type);
    return eventType ? eventType.icon : FileText;
  };

  const getEventTypeColor = (type: string) => {
    const eventType = eventTypes.find(et => et.value === type);
    return eventType ? eventType.color : 'bg-gray-500';
  };

  const formatGroupDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;

    switch (timelineScale) {
      case 'day':
        return format(date, 'EEEE, MMMM d, yyyy');
      case 'week':
        return `Week of ${format(date, 'MMMM d, yyyy')}`;
      case 'month':
        return format(date, 'MMMM yyyy');
      case 'year':
        return format(date, 'yyyy');
      default:
        return dateStr;
    }
  };

  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Investigation Timeline</h1>
          <p className="text-gray-400">Build and visualize the chronological sequence of events and evidence</p>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <select
                value={timelineScale}
                onChange={(e) => setTimelineScale(e.target.value as any)}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
              Filters
            </button>

            <button
              onClick={() => setIsAddingEvent(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Event
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-700 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Filter by Event Type</h3>
              <div className="flex flex-wrap gap-2">
                {eventTypes.map(type => (
                  <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterTypes.includes(type.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilterTypes([...filterTypes, type.value]);
                        } else {
                          setFilterTypes(filterTypes.filter(t => t !== type.value));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-300">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="space-y-6" ref={timelineRef}>
          {timelineGroups.map((group, groupIndex) => (
            <div key={group.startDate} className="relative">
              {/* Date Header */}
              <div className="flex items-center mb-4">
                <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold">
                  {formatGroupDate(group.startDate)}
                </div>
                <div className="flex-1 h-px bg-gray-700 ml-4"></div>
              </div>

              {/* Events */}
              <div className="ml-8 space-y-4">
                {group.events.map((event, eventIndex) => (
                  <div
                    key={event.id}
                    draggable
                    onDragStart={() => handleDragStart(event)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, group.startDate)}
                    className="relative bg-gray-800 rounded-lg p-4 border-l-4 hover:bg-gray-750 transition-colors cursor-move"
                    style={{ borderLeftColor: getEventTypeColor(event.type).replace('bg-', '#') }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-8 h-8 rounded-full ${getEventTypeColor(event.type)} flex items-center justify-center`}>
                            {React.createElement(getEventTypeIcon(event.type), { className: 'w-4 h-4 text-white' })}
                          </div>
                          <h3 className="text-lg font-semibold text-white">{event.title}</h3>
                          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                            {Math.round(event.confidence)}% confidence
                          </span>
                        </div>
                        
                        {event.description && (
                          <p className="text-gray-300 mb-3 ml-11">{event.description}</p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-400 ml-11">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {format(event.startDate, 'HH:mm')}
                          </div>
                          
                          {event.documents.length > 0 && (
                            <div className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              {event.documents.length} evidence items
                            </div>
                          )}
                          
                          {event.hypothesisIds && event.hypothesisIds.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Link2 className="w-4 h-4" />
                              {event.hypothesisIds.length} hypotheses
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditEvent(event)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Add/Edit Event Modal */}
        {(isAddingEvent || editingEvent) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-4">
                {editingEvent ? 'Edit Timeline Event' : 'Add Timeline Event'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                  <input
                    type="text"
                    value={newEvent.title || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="Enter event title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    value={newEvent.description || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white h-20"
                    placeholder="Enter event description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Date & Time *</label>
                    <input
                      type="datetime-local"
                      value={newEvent.startDateString ? format(parseISO(newEvent.startDateString), "yyyy-MM-dd'T'HH:mm") : ''}
                      onChange={(e) => setNewEvent({ ...newEvent, startDateString: new Date(e.target.value).toISOString() })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Event Type</label>
                    <select
                      value={newEvent.type || 'document'}
                      onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as TimelineEvent['type'] })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    >
                      {eventTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Confidence Level</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={newEvent.confidence || 80}
                      onChange={(e) => setNewEvent({ ...newEvent, confidence: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-white font-medium w-12 text-right">
                      {newEvent.confidence || 80}%
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Linked Evidence</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {evidence.map(ev => (
                      <label key={ev.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newEvent.documents?.includes(ev.id) || false}
                          onChange={(e) => {
                            const documents = newEvent.documents || [];
                            if (e.target.checked) {
                              setNewEvent({ ...newEvent, documents: [...documents, ev.id] });
                            } else {
                              setNewEvent({ ...newEvent, documents: documents.filter(id => id !== ev.id) });
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-300">{ev.title}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Linked Hypotheses</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {hypotheses.map(hyp => (
                      <label key={hyp.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newEvent.hypothesisIds?.includes(hyp.id) || false}
                          onChange={(e) => {
                            const hypothesisIds = newEvent.hypothesisIds || [];
                            if (e.target.checked) {
                              setNewEvent({ ...newEvent, hypothesisIds: [...hypothesisIds, hyp.id] });
                            } else {
                              setNewEvent({ ...newEvent, hypothesisIds: hypothesisIds.filter((id: string) => id !== hyp.id) });
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-300">{hyp.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setIsAddingEvent(false);
                    setEditingEvent(null);
                    setNewEvent({
                      title: '',
                      description: '',
                      startDateString: new Date().toISOString(),
                      type: 'document',
                      confidence: 80,
                      documents: [],
                      hypothesisIds: []
                    });
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingEvent ? handleUpdateEvent : handleAddEvent}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  {editingEvent ? 'Update Event' : 'Add Event'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};