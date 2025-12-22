import { getDb } from './connection.js';

// Map evidence_type to timeline type
const mapEvidenceType = (evidenceType: string): string => {
  const mapping: Record<string, string> = {
    'email': 'email',
    'legal': 'legal',
    'deposition': 'testimony',
    'financial': 'financial',
    'article': 'document',
    'photo': 'document',
    'document': 'document'
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
  if (title.includes('epstein') && (title.includes('arrest') || title.includes('death') || title.includes('plea'))) return 'high';
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
      // 1. Fetch Curated Global Events
      const globalEvents = db.prepare(`
        SELECT 
          id,
          title,
          date as start_date,
          description,
          type,
          significance,
          entities,
          related_document_id,
          'event' as source
        FROM global_timeline_events
        ORDER BY date DESC
      `).all();

      // 2. Fetch High-Significance Documents (limit to prevent clutter)
      const docEvents = db.prepare(`
        SELECT 
          d.id,
          d.title,
          d.date_created as start_date,
          d.evidence_type as type,
          SUBSTR(d.content, 1, 300) as content,
          d.word_count,
          d.file_path,
          d.original_file_path,
          d.red_flag_rating,
          (SELECT COUNT(*) FROM entity_document_mentions WHERE document_id = d.id) as entity_count,
          COALESCE(
            (SELECT GROUP_CONCAT(e.full_name, '|||') 
             FROM entity_document_mentions edm 
             JOIN entities e ON edm.entity_id = e.id 
             WHERE edm.document_id = d.id
             LIMIT 8), ''
          ) as entities_csv,
          'document' as source
        FROM documents d
        WHERE d.date_created IS NOT NULL 
          AND d.date_created != ''
          AND (d.red_flag_rating >= 4 OR d.word_count > 15000 OR (d.title LIKE '%Epstein%' AND d.title LIKE '%Arrest%'))
        ORDER BY d.date_created DESC
        LIMIT 50
      `).all();

      // Transform Global Events
      const mappedGlobal = globalEvents.map((e: any) => ({
        id: `evt-${e.id}`,
        title: e.title,
        description: e.description,
        type: e.type,
        date: e.start_date,
        entities: e.entities ? JSON.parse(e.entities) : [],
        significance_score: e.significance,
        file_path: null,
        original_file_path: null,
        is_curated: true
      }));

      // Transform Document Events
      const mappedDocs = docEvents.map((e: any) => ({
        id: `doc-${e.id}`,
        title: e.title || 'Untitled Document',
        description: generateDescription(e),
        type: mapEvidenceType(e.type),
        date: e.start_date,
        entities: e.entities_csv ? e.entities_csv.split('|||').filter(Boolean).slice(0, 8) : [],
        significance_score: calculateSignificance(e),
        file_path: e.file_path,
        original_file_path: e.original_file_path, // CRITICAL FIX: Return original path
        primary_entity: e.entities_csv ? e.entities_csv.split('|||')[0] : null,
        is_curated: false
      }));

      // Merge and Sort
      const allEvents = [...mappedGlobal, ...mappedDocs].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      
      return allEvents;
    } catch (error) {
      console.error('Error getting timeline events:', error);
      return [];
    }
  }
};