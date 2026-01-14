import { getDb } from './connection.js';

export const mediaRepository = {
  // Get all albums with counts for a specific media type
  getAlbumsByMediaType: (fileType: 'audio' | 'video') => {
    const db = getDb();
    const likePattern = `${fileType}/%`;
    const query = `
      SELECT
        a.id,
        a.name,
        a.description,
        a.created_at as createdAt,
        a.date_modified as dateModified,
        COUNT(m.id) as itemCount,
        SUM(CASE WHEN m.is_sensitive = 1 THEN 1 ELSE 0 END) as sensitiveCount
      FROM media_albums a
      LEFT JOIN media_items m ON a.id = m.album_id AND m.file_type LIKE ?
      GROUP BY a.id
      HAVING itemCount > 0 OR a.id IN (
        SELECT DISTINCT album_id FROM media_items WHERE album_id IS NOT NULL
      )
      ORDER BY a.name
    `;
    const result = db.prepare(query).all(likePattern) as any[];
    console.log(`getAlbumsByMediaType(${fileType}) found ${result.length} albums`);
    const sacha = result.find(a => a.id === 25);
    if (sacha) {
      console.log('Sacha album debug:', sacha);
    }
    return result;
  },

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
      albumId?: number;
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
        // Relaxed filter to catch any audio type
        whereConditions.push("file_type LIKE '%audio%'");
      } else {
        whereConditions.push('file_type LIKE ?');
        params.push(`${filters.fileType}%`);
      }
    }

    console.log('getMediaItemsPaginated params:', { page, limit, filters });
    console.log('getMediaItemsPaginated whereConditions:', whereConditions);

    if (filters?.albumId !== undefined) {
      whereConditions.push('album_id = ?');
      params.push(filters.albumId);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        m.id,
        m.entity_id as entityId,
        m.document_id as documentId,
        m.file_path as filePath,
        m.file_type as fileType,
        m.title,
        m.description,
        m.album_id as albumId,
        m.is_sensitive as isSensitive,
        m.verification_status as verificationStatus,
        m.red_flag_rating as redFlagRating,
        m.metadata_json as metadataJson,
        m.created_at as createdAt,
        GROUP_CONCAT(DISTINCT t.id || ':' || t.name) as tags,
        GROUP_CONCAT(DISTINCT e.id || ':' || e.full_name) as people
      FROM media_items m
      LEFT JOIN media_item_tags mt ON m.id = mt.media_item_id
      LEFT JOIN media_tags t ON mt.tag_id = t.id
      LEFT JOIN media_item_people mp ON m.id = mp.media_item_id
      LEFT JOIN entities e ON mp.entity_id = e.id
      ${whereClause}
      GROUP BY m.id
      ORDER BY m.red_flag_rating DESC, m.created_at DESC
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

        const tags = item.tags
          ? item.tags.split(',').map((t: string) => {
              const [id, name] = t.split(':');
              return { id: parseInt(id), name };
            })
          : [];

        const people = item.people
          ? item.people.split(',').map((p: string) => {
              const [id, name] = p.split(':');
              return { id: parseInt(id), name };
            })
          : [];

        return {
          ...item,
          redFlagRating: item.redFlagRating,
          metadata,
          tags,
          people,
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
