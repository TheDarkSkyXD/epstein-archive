import { getDb } from './connection.js';

export const searchRepository = {
  search: (query: string, limit: number = 50, filters: { evidenceType?: string, redFlagBand?: string } = {}) => {
    const db = getDb();
    const searchTerm = query.trim();
    
    if (!searchTerm) {
      return { entities: [], documents: [] };
    }
    
    try {
      // 1. Try FTS Search first
      // Format query for FTS5 (surround with quotes for phrase, or use near/AND)
      // Simple approach: escape quotes and treat as simple phrase or tokens
      const ftsQuery = `"${searchTerm.replace(/"/g, '""')}"*`; // Prefix search
      
      let entities: any[] = [];
      try {
        const ftsEntityQuery = `
          SELECT 
            e.id,
            e.full_name as fullName,
            e.primary_role as primaryRole,
            'Person' as entityType,
            e.red_flag_rating as redFlagRating,
            e.red_flag_score as redFlagScore,
            e.red_flag_description as redFlagDescription,
            entities_fts.rank
          FROM entities_fts
          JOIN entities e ON e.id = entities_fts.rowid
          WHERE entities_fts MATCH @ftsQuery
          ORDER BY entities_fts.rank
          LIMIT @limit
        `;
        entities = db.prepare(ftsEntityQuery).all({ ftsQuery, limit }) as any[];
      } catch (ftsError) {
        // Fallback to LIKE if FTS table missing or error
        console.warn('FTS search failed, falling back to LIKE:', ftsError);
      }

      // Fallback to LIKE if FTS returned no results (safety net for broken indices)
      if (entities.length === 0) {
        const searchPattern = `%${searchTerm}%`;
        const entityQuery = `
            SELECT 
            e.id,
            e.full_name as fullName,
            e.primary_role as primaryRole,
            'Person' as entityType,
            e.red_flag_rating as redFlagRating,
            e.red_flag_score as redFlagScore,
            e.red_flag_description as redFlagDescription
            FROM entities e
            WHERE e.full_name LIKE @searchPattern 
            OR e.primary_role LIKE @searchPattern
            OR e.connections_summary LIKE @searchPattern
            OR e.aliases LIKE @searchPattern
            ORDER BY e.mentions DESC
            LIMIT @limit
        `;
        entities = db.prepare(entityQuery).all({ searchPattern, limit }) as any[];
      }

      // Build document query with filters
      let documents: any[] = [];
      try {
         // FTS for documents
         let documentQuery = `
            SELECT 
              d.id,
              d.file_name as fileName,
              d.file_path as filePath,
              d.file_type as fileType,
              d.evidence_type as evidenceType,
              d.file_size as fileSize,
              d.date_created as dateCreated,
              d.word_count as wordCount,
              d.red_flag_rating as redFlagRating,
              documents_fts.rank
            FROM documents_fts
            JOIN documents d ON d.id = documents_fts.rowid
            WHERE documents_fts MATCH @ftsQuery
         `;
         
         const params: any = { ftsQuery, limit };
         
         if (filters.evidenceType && filters.evidenceType !== 'ALL') {
            documentQuery += ` AND d.evidence_type = @evidenceType`;
            params.evidenceType = filters.evidenceType.toLowerCase();
         }
         
         if (filters.redFlagBand) {
             // ... (same logic as before) ...
            if (filters.redFlagBand === 'high') documentQuery += ` AND d.red_flag_rating >= 4`;
            else if (filters.redFlagBand === 'medium') documentQuery += ` AND d.red_flag_rating >= 2 AND d.red_flag_rating < 4`;
            else if (filters.redFlagBand === 'low') documentQuery += ` AND d.red_flag_rating < 2`;
         }
         
         documentQuery += ` ORDER BY documents_fts.rank LIMIT @limit`;
         documents = db.prepare(documentQuery).all(params) as any[];

      } catch (ftsError) {
        // Fallback
        const searchPattern = `%${searchTerm}%`;
        let documentQuery = `
            SELECT 
            d.id,
            d.file_name as fileName,
            d.file_path as filePath,
            d.file_type as fileType,
            d.evidence_type as evidenceType,
            d.file_size as fileSize,
            d.date_created as dateCreated,
            d.word_count as wordCount,
            d.red_flag_rating as redFlagRating
            FROM documents d
            WHERE (d.file_name LIKE @searchPattern OR d.content LIKE @searchPattern)
        `;
        const params: any = { searchPattern, limit };
        if (filters.evidenceType && filters.evidenceType !== 'ALL') {
            documentQuery += ` AND d.evidence_type = @evidenceType`;
            params.evidenceType = filters.evidenceType.toLowerCase();
        }
        if (filters.redFlagBand) {
            if (filters.redFlagBand === 'high') documentQuery += ` AND d.red_flag_rating >= 4`;
            else if (filters.redFlagBand === 'medium') documentQuery += ` AND d.red_flag_rating >= 2 AND d.red_flag_rating < 4`;
            else if (filters.redFlagBand === 'low') documentQuery += ` AND d.red_flag_rating < 2`;
        }
        documentQuery += ` ORDER BY d.red_flag_rating DESC LIMIT @limit`;
        documents = db.prepare(documentQuery).all(params) as any[];
      }

      return {
        entities: entities.map(row => ({
          id: row.id.toString(),
          fullName: row.fullName,
          name: row.fullName, // Helper
          primaryRole: row.primaryRole,
          title: row.primaryRole, // Fallback
          entityType: row.entityType,
          secondaryRoles: [],
          likelihoodLevel: 0,
          mentions: 0,
          currentStatus: null,
          connectionsSummary: null,
          redFlagRating: row.redFlagRating,
          redFlagScore: row.redFlagScore,
          redFlagIndicators: [],
          redFlagDescription: row.redFlagDescription,
          titleVariants: [],
          evidenceTypes: [] // Prevent fallback to 'Unknown' or invalid types
        })),
        documents: documents.map(row => ({
          id: row.id.toString(),
          fileName: row.fileName,
          title: row.fileName, // Helper
          filePath: row.filePath,
          fileType: row.fileType,
          evidenceType: row.evidenceType,
          fileSize: row.fileSize,
          dateCreated: row.dateCreated,
          wordCount: row.wordCount,
          redFlagRating: row.redFlagRating,
          createdAt: row.dateCreated
        }))
      };
    } catch (error) {
      console.error('Search error:', error);
      return { entities: [], documents: [] };
    }
  }
};