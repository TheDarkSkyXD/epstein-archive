import { getDb } from './connection.js';

export const timelineRepository = {
  getTimelineEvents: () => {
    const db = getDb();
    try {
      // Use investigation_timeline_events instead of legacy timeline_events
      const events = db.prepare(`
        SELECT * FROM investigation_timeline_events 
        ORDER BY start_date DESC
      `).all();
      
      return events.map((event: any) => ({
        ...event,
        entities: event.entities_json ? JSON.parse(event.entities_json) : [],
        date: event.start_date,
        event_date: event.start_date // Backwards compatibility
      }));
    } catch (error) {
      console.error('Error getting timeline events:', error);
      return [];
    }
  }
};