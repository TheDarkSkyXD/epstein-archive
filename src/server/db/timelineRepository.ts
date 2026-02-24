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
          let entityData: Array<{ id: number | null; name: string }> = [];

          // Parse entity IDs and look up names
          if (e.entities) {
            try {
              const parsed = typeof e.entities === 'string' ? JSON.parse(e.entities) : e.entities;
              if (Array.isArray(parsed) && parsed.length > 0) {
                const numericIds = parsed
                  .map((value) =>
                    typeof value === 'number'
                      ? value
                      : typeof value === 'string' && /^\d+$/.test(value)
                        ? Number(value)
                        : null,
                  )
                  .filter((value): value is number => Number.isInteger(value));

                const names = parsed
                  .filter(
                    (value): value is string =>
                      typeof value === 'string' && value.trim().length > 0 && !/^\d+$/.test(value),
                  )
                  .map((value) => value.trim());

                const entityRows: Array<{ id: number; full_name: string }> = [];

                if (numericIds.length > 0) {
                  const entRes = await pool.query(
                    'SELECT id, full_name FROM entities WHERE id = ANY($1::bigint[])',
                    [numericIds],
                  );
                  entityRows.push(...(entRes.rows as Array<{ id: number; full_name: string }>));
                }

                if (names.length > 0) {
                  const entByNameRes = await pool.query(
                    'SELECT id, full_name FROM entities WHERE full_name = ANY($1::text[])',
                    [names],
                  );
                  entityRows.push(
                    ...(entByNameRes.rows as Array<{ id: number; full_name: string }>),
                  );
                }

                const byName = new Map(
                  entityRows.map((ent) => [
                    String(ent.full_name).toLowerCase(),
                    { id: ent.id, name: ent.full_name },
                  ]),
                );
                const byId = new Map(
                  entityRows.map((ent) => [
                    Number(ent.id),
                    { id: Number(ent.id), name: ent.full_name },
                  ]),
                );

                entityData = parsed
                  .map((value) => {
                    if (
                      typeof value === 'number' ||
                      (typeof value === 'string' && /^\d+$/.test(value))
                    ) {
                      const id = Number(value);
                      return byId.get(id) ?? null;
                    }
                    if (typeof value === 'string' && value.trim()) {
                      return (
                        byName.get(value.trim().toLowerCase()) ?? { id: null, name: value.trim() }
                      );
                    }
                    return null;
                  })
                  .filter((value): value is { id: number | null; name: string } => Boolean(value));
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
