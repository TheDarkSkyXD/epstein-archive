import { getDb } from './connection.js';

export const mediaRepository = {
  // Get media items for an entity
  getMediaItems: async (entityId: string) => {
    const db = getDb();
    const query = `
      SELECT 
        id,
        entity_id as entityId,
        document_id as documentId,
        file_path as filePath,
        file_type as fileType,
        title,
        description,
        is_sensitive as isSensitive,
        verification_status as verificationStatus,
        red_flag_rating as redFlagRating,
        metadata_json as metadataJson,
        created_at as createdAt
      FROM media_items
      WHERE entity_id = ?
      ORDER BY red_flag_rating DESC, created_at DESC
    `;

    const mediaItems = db.prepare(query).all(entityId) as any[];

    return mediaItems.map((item) => {
      let metadata = {};
      try {
        if (item.metadataJson) {
          metadata = JSON.parse(item.metadataJson);
        }
      } catch (e) {
        console.error('Error parsing metadata for media item', item.id, e);
      }

      return {
        ...item,
        redFlagRating: item.redFlagRating,
        metadata,
      };
    });
  },

  // Get all media items (for Evidence Media tab)
  getAllMediaItems: async () => {
    const db = getDb();
    const query = `
      SELECT 
        m.id,
        m.entity_id as entityId,
        m.document_id as documentId,
        m.file_path as filePath,
        m.file_type as fileType,
        m.title,
        m.description,
        m.is_sensitive as isSensitive,
        m.verification_status as verificationStatus,
        m.red_flag_rating as redFlagRating,
        m.metadata_json as metadataJson,
        m.created_at as createdAt,
        e.full_name as entityName
      FROM media_items m
      LEFT JOIN entities e ON m.entity_id = e.id
      ORDER BY m.red_flag_rating DESC, m.created_at DESC
    `;

    const mediaItems = db.prepare(query).all() as any[];

    return mediaItems.map((item) => {
      let metadata = {};
      try {
        if (item.metadataJson) {
          metadata = JSON.parse(item.metadataJson);
        }
      } catch (e) {
        console.error('Error parsing metadata for media item', item.id, e);
      }

      return {
        ...item,
        redFlagRating: item.redFlagRating,
        metadata,
        relatedEntities: item.entityName ? [item.entityName] : [],
      };
    });
  },

  // Get single media item by ID
  getMediaItemById: (id: number) => {
    const db = getDb();
    const query = `
      SELECT * FROM media_items WHERE id = ?
    `;
    const item = db.prepare(query).get(id) as any;
    if (!item) return undefined;

    let metadata = {};
    try {
      if (item.metadata_json) {
        metadata = JSON.parse(item.metadata_json);
      }
    } catch (e) {
      console.error('Error parsing metadata for media item', item.id, e);
    }

    return {
      ...item,
      isSensitive: Boolean(item.is_sensitive),
      redFlagRating: item.red_flag_rating,
      metadata,
    };
  },

  // Get paginated media items
  getMediaItemsPaginated: async (
    page: number = 1,
    limit: number = 24,
    filters?: {
      entityId?: string;
      verificationStatus?: string;
      minRedFlagRating?: number;
      fileType?: string; // 'image' or 'audio' or mimetype
    },
  ) => {
    const db = getDb();
    const whereConditions: string[] = [];
    const params: any[] = [];

    if (filters?.entityId) {
      whereConditions.push('entity_id = ?');
      params.push(filters.entityId);
    }

    if (filters?.verificationStatus) {
      whereConditions.push('verification_status = ?');
      params.push(filters.verificationStatus);
    }

    if (filters?.minRedFlagRating) {
      whereConditions.push('red_flag_rating >= ?');
      params.push(filters.minRedFlagRating);
    }

    if (filters?.fileType) {
      if (filters.fileType === 'image') {
        whereConditions.push("file_type LIKE 'image/%'");
      } else if (filters.fileType === 'audio') {
        whereConditions.push("file_type LIKE 'audio/%'");
      } else {
        whereConditions.push('file_type LIKE ?');
        params.push(`${filters.fileType}%`);
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        id,
        entity_id as entityId,
        document_id as documentId,
        file_path as filePath,
        file_type as fileType,
        title,
        description,
        is_sensitive as isSensitive,
        verification_status as verificationStatus,
        red_flag_rating as redFlagRating,
        metadata_json as metadataJson,
        created_at as createdAt
      FROM media_items
      ${whereClause}
      ORDER BY red_flag_rating DESC, created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `SELECT COUNT(*) as total FROM media_items ${whereClause}`;

    const totalResult = db.prepare(countQuery).get(...params) as { total: number };
    const mediaItems = db.prepare(query).all(...params, limit, offset) as any[];

    return {
      mediaItems: mediaItems.map((item) => {
        let metadata = {};
        try {
          if (item.metadataJson) {
            metadata = JSON.parse(item.metadataJson);
          }
        } catch (e) {
          console.error('Error parsing metadata for media item', item.id, e);
        }

        return {
          ...item,
          redFlagRating: item.redFlagRating,
          metadata,
        };
      }),
      total: totalResult.total,
    };
  },

  // Batch get media items for multiple entities (limit 5 per entity)
  getPhotosForEntities: (entityIds: string[]) => {
    if (!entityIds.length) return [];

    const db = getDb();
    const placeholders = entityIds.map(() => '?').join(',');

    // Use window function to limit to 5 per entity
    const query = `
      SELECT * FROM (
        SELECT 
          id,
          entity_id as entityId,
          file_path as filePath,
          title,
          is_sensitive as isSensitive,
          ROW_NUMBER() OVER (PARTITION BY entity_id ORDER BY red_flag_rating DESC, created_at DESC) as rn
        FROM media_items
        WHERE entity_id IN (${placeholders})
          AND file_type LIKE 'image/%'
      ) WHERE rn <= 5
    `;

    return db.prepare(query).all(...entityIds) as any[];
  },
};
