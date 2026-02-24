import { mediaQueries } from '@epstein/db';
import { getApiPool } from './connection.js';

export const mediaRepository = {
  // Get all albums with counts for a specific media type
  getAlbumsByMediaType: async (fileType: 'audio' | 'video') => {
    let likePattern: string;
    if (fileType === 'audio') {
      likePattern = '%audio%';
    } else {
      likePattern = `${fileType}/%`;
    }

    const result = await mediaQueries.getAlbumsByMediaType.run({ likePattern }, getApiPool());
    return result.map((row) => ({
      ...row,
      itemCount: Number(row.itemCount || 0),
      sensitiveCount: Number(row.sensitiveCount || 0),
    }));
  },

  // Get media items for an entity
  getMediaItems: async (entityId: string) => {
    const mediaItems = await mediaQueries.getMediaItemsByEntity.run({ entityId }, getApiPool());

    return mediaItems.map((item) => {
      let metadata = {};
      try {
        if (item.metadataJson) {
          metadata =
            typeof item.metadataJson === 'string'
              ? JSON.parse(item.metadataJson)
              : item.metadataJson;
        }
      } catch (e) {
        console.error('Error parsing metadata for media item', item.id, e);
      }

      return {
        ...item,
        id: Number(item.id),
        fileSize: Number((item as any).fileSize || 0),
        redFlagRating: Number(item.redFlagRating || 0),
        metadata,
      };
    });
  },

  // Get all media items (for Evidence Media tab)
  getAllMediaItems: async () => {
    const mediaItems = await mediaQueries.getAllMediaItems.run(undefined, getApiPool());

    return mediaItems.map((item) => {
      let metadata = {};
      try {
        if (item.metadataJson) {
          metadata =
            typeof item.metadataJson === 'string'
              ? JSON.parse(item.metadataJson)
              : item.metadataJson;
        }
      } catch (e) {
        console.error('Error parsing metadata for media item', item.id, e);
      }

      return {
        ...item,
        id: Number(item.id),
        fileSize: Number((item as any).fileSize || 0),
        redFlagRating: Number(item.redFlagRating || 0),
        metadata,
        relatedEntities: item.relatedEntities
          ? item.relatedEntities.split(',')
          : item.entityName
            ? [item.entityName]
            : [],
      };
    });
  },

  // Get single media item by ID
  getMediaItemById: async (id: number) => {
    const rows = await mediaQueries.getMediaItemById.run({ id: String(id) }, getApiPool()); // id is text in Postgres
    const item = rows[0];
    if (!item) return undefined;

    let metadata = {};
    try {
      if (item.metadataJson) {
        metadata =
          typeof item.metadataJson === 'string' ? JSON.parse(item.metadataJson) : item.metadataJson;
      }
    } catch (e) {
      console.error('Error parsing metadata for media item', item.id, e);
    }

    return {
      ...item,
      id: Number(item.id),
      isSensitive: Boolean(item.isSensitive),
      redFlagRating: Number(item.redFlagRating || 0),
      fileSize: Number((item as any).fileSize || 0),
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
      sortBy?: 'title' | 'date' | 'rating';
      transcriptQuery?: string;
      hasPeople?: boolean;
    },
  ) => {
    const offset = (page - 1) * limit;

    let fileTypePattern: string | null = null;
    if (filters?.fileType) {
      if (filters.fileType === 'image') {
        fileTypePattern = 'image/%';
      } else if (filters.fileType === 'audio') {
        fileTypePattern = '%audio%';
      } else {
        fileTypePattern = `${filters.fileType}%`;
      }
    }

    const countRes = await mediaQueries.countMediaItems.run(
      {
        entityId: filters?.entityId ? BigInt(filters.entityId) : null,
        fileType: fileTypePattern,
        minRedFlag: filters?.minRedFlagRating || null,
      },
      getApiPool(),
    );

    const total = Number(countRes[0]?.total || 0);

    const mediaItems = await mediaQueries.searchPaginatedMedia.run(
      {
        entityId: filters?.entityId ? BigInt(filters.entityId) : null,
        fileType: fileTypePattern,
        minRedFlag: filters?.minRedFlagRating || null,
        limit: BigInt(limit),
        offset: BigInt(offset),
      },
      getApiPool(),
    );

    return {
      mediaItems: mediaItems.map((item) => {
        let metadata = {};
        try {
          if (item.metadataJson) {
            metadata =
              typeof item.metadataJson === 'string'
                ? JSON.parse(item.metadataJson)
                : item.metadataJson;
          }
        } catch (e) {
          console.error('Error parsing metadata for media item', item.id, e);
        }

        const people = item.people
          ? item.people.split(',').map((p: string) => {
              const [id, name] = p.split(':');
              return { id: parseInt(id), name };
            })
          : [];

        return {
          ...item,
          id: Number(item.id),
          fileSize: Number(item.fileSize || 0),
          isSensitive: Boolean(item.isSensitive),
          redFlagRating: Number(item.redFlagRating || 0),
          metadata,
          tags: [], // Tags missing in current Postgres schema
          people,
        };
      }),
      total,
    };
  },

  // Batch get media items for multiple entities (limit 5 per entity)
  getPhotosForEntities: async (entityIds: string[]) => {
    if (!entityIds.length) return [];
    const ids = entityIds.map((id) => BigInt(id));
    const pool = getApiPool();
    const result = await pool.query(
      `
        SELECT * FROM (
          SELECT DISTINCT
            m.id,
            COALESCE(mip.entity_id, m.entity_id) as "entityId",
            m.file_path as "filePath",
            m.title,
            m.is_sensitive as "isSensitive",
            m.red_flag_rating as "redFlagRating",
            ROW_NUMBER() OVER (
              PARTITION BY COALESCE(mip.entity_id, m.entity_id)
              ORDER BY m.red_flag_rating DESC, m.created_at DESC
            ) as rn
          FROM media_items m
          LEFT JOIN media_item_people mip ON m.id = mip.media_item_id::text
          WHERE (
            mip.entity_id = ANY($1::bigint[])
            OR m.entity_id = ANY($1::bigint[])
          )
            AND m.file_type LIKE 'image/%'
        ) t
        WHERE rn <= 5
      `,
      [ids],
    );
    return result.rows;
  },
};
