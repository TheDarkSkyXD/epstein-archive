import { getDb } from './connection.js';

export const documentsRepository = {
  getDocuments: (
    page: number = 1,
    limit: number = 50,
    filters: { 
        search?: string, 
        fileType?: string, 
        evidenceType?: string, 
        minRedFlag?: number, 
        maxRedFlag?: number, 
        sortBy?: string 
    } = {}
  ) => {
    const db = getDb();
    const whereConditions: string[] = [];
    const params: any[] = [];
    
    // Check if FTS is available and search term is present
    let useFts = false;
    if (filters.search && filters.search.trim()) {
        try {
            // Simple check if table exists (cached or checked once)
            // For now, just try-catch the query construction later? 
            // Better to assume FTS if we are in "production" mode or fallback.
            // Let's stick to LIKE for simple browse, but if search term is complex, FTS is better.
            // For now, I'll keep LIKE for robustness as per previous patterns unless I can guarantee FTS table.
            whereConditions.push('(file_name LIKE ? OR content LIKE ?)');
            const searchPattern = `%${filters.search.trim()}%`;
            params.push(searchPattern, searchPattern);
        } catch (e) {
            // Fallback
        }
    }
    
    if (filters.fileType && filters.fileType !== 'all') {
      const types = filters.fileType.split(',');
      whereConditions.push(`file_type IN (${types.map(() => '?').join(',')})`);
      params.push(...types);
    }
    
    if (filters.evidenceType && filters.evidenceType !== 'all') {
      whereConditions.push('evidence_type = ?');
      params.push(filters.evidenceType);
    }
    
    if (filters.minRedFlag || filters.maxRedFlag) {
       const min = filters.minRedFlag || 0;
       const max = filters.maxRedFlag || 5;
       whereConditions.push('(red_flag_rating IS NULL OR (red_flag_rating >= ? AND red_flag_rating <= ?))');
       params.push(min, max);
    }

    // Default to hiding child pages unless specifically requested or searching deeply
    // If we are searching, we might want to find pages.
    // If we are browsing (no search term), we should hide pages.
    // However, the user might WANT to see pages.
    // Let's hide pages by default if no search term is present, OR if a specific filter is set.
    // Actually, "is_hidden" is 1 for pages.
    // We should add a filter option to show hidden docs?
    // For now, let's just exclude hidden docs by default.
    // If someone searches, we might want to include them?
    // Let's exclude hidden docs unless explicitly asked for.
    // But wait, if I search for "Trump", and it's on page 50, I want to see page 50.
    // So:
    // - If search term is present: Include hidden docs? OR return the parent?
    // - If no search term: Exclude hidden docs.
    
    // Better approach:
    // Always exclude hidden docs from the main browse list.
    // If search term is present, we still search them?
    // The FTS index includes them.
    // If we return a hidden doc, the UI should handle it (maybe show "Page 50 of ...").
    // But for "Hardening", let's just filter them out of the default view.
    
    if (!filters.search) {
        whereConditions.push('(is_hidden = 0 OR is_hidden IS NULL)');
    } else {
        // If searching, we might want to group results by parent?
        // That's complex. For now, let's just show them if they match.
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    let orderByClause = 'ORDER BY ';
    switch (filters.sortBy) {
      case 'date':
        orderByClause += 'date_created DESC';
        break;
      case 'title':
        orderByClause += 'file_name ASC';
        break;
      case 'red_flag':
      default:
        orderByClause += 'red_flag_rating DESC, date_created DESC';
        break;
    }
    
    const offset = (page - 1) * limit;
    
    const countQuery = `SELECT COUNT(*) as total FROM documents ${whereClause}`;
    const totalResult = db.prepare(countQuery).get(...params) as { total: number };
    
    const sql = `
      SELECT 
        id,
        file_name as fileName,
        file_path as filePath,
        file_type as fileType,
        file_size as fileSize,
        date_created as dateCreated,
        substr(content, 1, 300) as contentPreview,
        evidence_type as evidenceType,
        0 as mentionsCount,
        content,
        metadata_json as metadata,
        word_count as wordCount,
        red_flag_rating as redFlagRating,
        content_hash as contentHash,
        file_name as title
      FROM documents
      ${whereClause}
      ${orderByClause}
      LIMIT ? OFFSET ?
    `;
    
    const documents = db.prepare(sql).all(...params, limit, offset);
    
    return {
      documents: documents.map((doc: any) => {
        let metadata = {};
        try {
           if (typeof doc.metadata === 'string') {
             metadata = JSON.parse(doc.metadata);
           } else if (typeof doc.metadata === 'object') {
             metadata = doc.metadata;
           }
        } catch(e) { /* ignore */ }
        return { ...doc, metadata };
      }),
      total: totalResult.total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(totalResult.total / limit)
    };
  },

  // Get document by ID with full content
  getDocumentById: (id: string): any | null => {
    const db = getDb();
    
    const query = `
      SELECT 
        d.id,
        d.file_name as fileName,
        d.file_path as filePath,
        d.file_type as fileType,
        d.file_size as fileSize,
        d.date_created as dateCreated,
        d.content_hash as contentHash,
        d.word_count as wordCount,
        d.red_flag_rating as redFlagRating,
        d.metadata_json as metadataJson,
        d.content,
        d.evidence_type as evidenceType,
        d.original_file_id as originalFileId,
        orig.file_path as original_file_path
      FROM documents d
      LEFT JOIN documents orig ON d.original_file_id = orig.id
      WHERE d.id = ?
    `;
    
    const document = db.prepare(query).get(id) as any;
    
    if (!document) return null;

    // Parse metadata if it's a JSON string
    if (document.metadataJson && typeof document.metadataJson === 'string') {
      try {
        document.metadata = JSON.parse(document.metadataJson);
      } catch (e) {
        console.error('Error parsing document metadata:', e);
        document.metadata = {};
      }
    }

    return {
      ...document,
      source_collection: 'Epstein Files'
    };
  },
  
  search: (query: string, limit: number = 50) => {
     // FTS or LIKE search
     // documentsRepository.getDocuments implies filters, but FTS logic often separate.
     // documentsRepository.getDocuments implies filters, but FTS logic often separate.
     const db = getDb();
     // If documents_fts exists, use it? Currently it's broken or not reliable without title triggers.
     // Fallback to LIKE
     const sql = `
        SELECT id, file_name, substr(content, 1, 300) as contentPreview 
        FROM documents 
        WHERE content LIKE ? OR file_name LIKE ? 
        LIMIT ?
     `;
     const pattern = `%${query}%`;
     return db.prepare(sql).all(pattern, pattern, limit);
  }
};