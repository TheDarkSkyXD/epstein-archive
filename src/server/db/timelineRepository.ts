import { getApiPool } from './connection.js';

export const timelineRepository = {
  getTimelineEvents: async () => {
    const pool = getApiPool();
    try {
      // Fetch Curated Global Events
      const res = await pool.query(`
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
      `);

      const globalEvents = res.rows;

      // Transform Global Events
      const mappedEvents = await Promise.all(
        globalEvents.map(async (e: any) => {
          let entityData: { id: number; name: string }[] = [];

          // Parse entity IDs and look up names
          if (e.entities) {
            try {
              const entityIds =
                typeof e.entities === 'string' ? JSON.parse(e.entities) : e.entities;
              if (Array.isArray(entityIds) && entityIds.length > 0) {
                // Postgres $1, $2, ... indexing for IN clause
                const placeholders = entityIds.map((_, idx) => `$${idx + 1}`).join(',');
                const entRes = await pool.query(
                  `SELECT id, full_name FROM entities WHERE id IN (${placeholders})`,
                  entityIds,
                );
                entityData = entRes.rows.map((ent: any) => ({ id: ent.id, name: ent.full_name }));
              }
            } catch (err) {
              console.warn('[Timeline] Failed to parse entities for event', e.id, err);
              entityData = [];
            }
          }

          // Lookup related document info
          let relatedDocument = null;
          if (e.related_document_id) {
            try {
              const docRes = await pool.query(
                `SELECT id, file_name, file_path FROM documents WHERE id = $1`,
                [e.related_document_id],
              );
              const doc = docRes.rows[0];
              if (doc) {
                relatedDocument = { id: doc.id, name: doc.file_name, path: doc.file_path };
              }
            } catch (err) {
              console.warn(
                '[Timeline] Failed to fetch related document',
                e.related_document_id,
                err,
              );
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
        }),
      );

      return mappedEvents;
    } catch (error) {
      console.error('Error getting timeline events:', error);
      throw error;
    }
  },
};
