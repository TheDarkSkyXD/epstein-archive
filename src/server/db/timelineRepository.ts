import { getDb } from './connection.js';

// Map evidence_type to timeline type
const mapEvidenceType = (evidenceType: string): string => {
  const mapping: Record<string, string> = {
    email: 'email',
    legal: 'legal',
    deposition: 'testimony',
    financial: 'financial',
    article: 'document',
    photo: 'document',
    document: 'document',
  };
  return mapping[evidenceType?.toLowerCase()] || 'document';
};

// Calculate significance based on document properties
const calculateSignificance = (doc: any): 'high' | 'medium' | 'low' => {
  const wordCount = doc.word_count || 0;
  const redFlag = doc.red_flag_rating || 0;
  const entityCount = doc.entity_count || 0;
  const title = (doc.title || '').toLowerCase();

  // High significance criteria
  if (redFlag >= 4) return 'high';
  if (wordCount > 15000) return 'high';
  if (entityCount > 15) return 'high';
  if (
    title.includes('epstein') &&
    (title.includes('arrest') || title.includes('death') || title.includes('plea'))
  )
    return 'high';
  if (title.includes('maxwell') && title.includes('arrest')) return 'high';
  if (title.includes('indictment')) return 'high';

  // Medium significance criteria
  if (redFlag >= 2) return 'medium';
  if (wordCount > 5000) return 'medium';
  if (entityCount > 5) return 'medium';

  return 'low';
};

// Generate description from document content
const generateDescription = (doc: any): string => {
  const evidenceType = doc.type || 'document';
  const wordCount = doc.word_count || 0;

  let desc = `${evidenceType.charAt(0).toUpperCase() + evidenceType.slice(1)} document`;

  if (wordCount > 10000) {
    desc += ` with ${wordCount.toLocaleString()} words`;
  } else if (wordCount > 0) {
    desc += ` (${wordCount.toLocaleString()} words)`;
  }

  // Add a snippet from content if available
  if (doc.content) {
    const cleanContent = doc.content.replace(/\s+/g, ' ').trim();
    const snippet = cleanContent.substring(0, 200);
    if (snippet.length > 50) {
      desc += `. ${snippet}${cleanContent.length > 200 ? '...' : ''}`;
    }
  }

  return desc;
};

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
