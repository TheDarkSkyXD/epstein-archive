import { getDb } from './connection.js';

export const timelineRepository = {
  getTimelineEvents: () => {
    const db = getDb();
    try {
      // Fetch ONLY Curated Global Events - Timeline should show EVENTS, not documents
      // Documents and people should be linked FROM events, not shown AS events
      const globalEvents = db
        .prepare(
          `
        SELECT 
          id,
          title,
          date as start_date,
          description,
          type,
          significance,
          entities,
          related_document_id,
          source
        FROM global_timeline_events
        ORDER BY date DESC
      `,
        )
        .all();

      // Transform Global Events
      const mappedEvents = globalEvents.map((e: any) => {
        // Parse entity IDs and look up their names with IDs for linking
        let entityData: { id: number; name: string }[] = [];
        if (e.entities) {
          try {
            const entityIds = JSON.parse(e.entities);
            if (Array.isArray(entityIds) && entityIds.length > 0) {
              const placeholders = entityIds.map(() => '?').join(',');
              const entities = db
                .prepare(`SELECT id, full_name FROM entities WHERE id IN (${placeholders})`)
                .all(...entityIds) as { id: number; full_name: string }[];
              entityData = entities.map((ent) => ({ id: ent.id, name: ent.full_name }));
            }
          } catch {
            entityData = [];
          }
        }

        // Lookup related document info if available
        let relatedDocument = null;
        if (e.related_document_id) {
          try {
            const doc = db
              .prepare(`SELECT id, file_name, file_path FROM documents WHERE id = ?`)
              .get(e.related_document_id) as
              | { id: number; file_name: string; file_path: string }
              | undefined;
            if (doc) {
              relatedDocument = { id: doc.id, name: doc.file_name, path: doc.file_path };
            }
          } catch {
            relatedDocument = null;
          }
        }

        return {
          id: `evt-${e.id}`,
          title: e.title,
          description: e.description,
          type: e.type || 'other',
          date: e.start_date,
          entities: entityData,
          significance_score: e.significance || 'medium',
          file_path: null,
          original_file_path: null,
          is_curated: true,
          source: e.source || null,
          related_document: relatedDocument,
        };
      });

      return mappedEvents;
    } catch (error) {
      console.error('Error getting timeline events:', error);
      return [];
    }
  },
};
