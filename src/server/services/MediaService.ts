import {
  MediaImage,
  Album,
  MediaTag,
  ImageFilter,
  ImageSort,
  MediaStats,
} from '../../types/media.types';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import exifParser from 'exif-parser';
import archiver from 'archiver';
import { db as pgDb, mediaQueries } from '@epstein/db';

export class MediaService {
  private db: any;

  constructor(db: any) {
    // Preserve passed db for compatibility, but default to shared PG wrapper.
    this.db = db || pgDb;
    if (process.env.NODE_ENV === 'production' && this.isLegacyPrepareClient()) {
      throw new Error(
        '[MediaService] Legacy prepare()-based DB client is not allowed in production. Use Postgres pool-backed runtime.',
      );
    }
  }

  private isPgClient(): boolean {
    return typeof this.db?.query === 'function' && typeof this.db?.prepare !== 'function';
  }

  private isLegacyPrepareClient(): boolean {
    return typeof this.db?.prepare === 'function';
  }

  private async pgRows<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const { rows } = await this.db.query(sql, params);
    return rows as T[];
  }

  private async pgRow<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const rows = await this.pgRows<T>(sql, params);
    return rows[0];
  }

  private async pgExec(sql: string, params: any[] = []): Promise<void> {
    await this.db.query(sql, params);
  }

  // ============ TAG OPERATIONS ============

  async getAllTags(): Promise<MediaTag[]> {
    if (this.isPgClient()) {
      return await this.pgRows<MediaTag>(
        `SELECT id, name, category, ''::text as "dateCreated"
         FROM media_tags
         ORDER BY name`,
      );
    }
    return (await this.db.all('SELECT * FROM media_tags ORDER BY name')) as MediaTag[];
  }

  // ============ ALBUM OPERATIONS ============

  async getAllAlbums(): Promise<Album[]> {
    if (this.isPgClient()) {
      const results = await this.pgRows<any>(`
        SELECT
          a.id, a.name, a.description, a.cover_image_id as "coverImageId",
          a.created_at as "dateCreated", a.date_modified as "dateModified",
          COUNT(i.id) as "imageCount",
          ci.file_path as "coverImagePath"
        FROM media_albums a
        LEFT JOIN media_items i ON a.id = i.album_id AND i.file_type LIKE 'image/%'
        LEFT JOIN media_items ci ON a.cover_image_id = ci.id
        GROUP BY a.id, ci.file_path
        HAVING COUNT(i.id) > 0
        ORDER BY a.name
      `);
      return results.map((row) => ({ ...row, imageCount: Number(row.imageCount) }));
    }
    const results = (await this.db.all(`
      SELECT 
        a.id, a.name, a.description, a.cover_image_id as "coverImageId", 
        a.created_at as "dateCreated", a.date_modified as "dateModified",
        COUNT(i.id) as "imageCount",
        ci.file_path as "coverImagePath"
      FROM media_albums a
      LEFT JOIN media_items i ON a.id = i.album_id AND i.file_type LIKE 'image/%'
      LEFT JOIN media_items ci ON a.cover_image_id = ci.id
      GROUP BY a.id, ci.file_path
      HAVING COUNT(i.id) > 0
      ORDER BY a.name
    `)) as any[];
    return results.map((row) => ({
      ...row,
      imageCount: Number(row.imageCount),
    }));
  }

  async getAlbumById(id: number): Promise<Album | undefined> {
    if (this.isPgClient()) {
      const row = await this.pgRow<any>(
        `
        SELECT
          a.id, a.name, a.description, a.cover_image_id as "coverImageId",
          a.created_at as "dateCreated", a.date_modified as "dateModified",
          COUNT(i.id) as "imageCount",
          ci.file_path as "coverImagePath"
        FROM media_albums a
        LEFT JOIN media_items i ON a.id = i.album_id AND i.file_type LIKE 'image/%'
        LEFT JOIN media_items ci ON a.cover_image_id = ci.id
        WHERE a.id = $1
        GROUP BY a.id, ci.file_path
      `,
        [id],
      );
      if (!row) return undefined;
      return { ...row, imageCount: Number(row.imageCount) };
    }
    const row = (await this.db.get(
      `
      SELECT 
        a.id, a.name, a.description, a.cover_image_id as "coverImageId", 
        a.created_at as "dateCreated", a.date_modified as "dateModified",
        COUNT(i.id) as "imageCount",
        ci.file_path as "coverImagePath"
      FROM media_albums a
      LEFT JOIN media_items i ON a.id = i.album_id AND i.file_type LIKE 'image/%'
      LEFT JOIN media_items ci ON a.cover_image_id = ci.id
      WHERE a.id = ?
      GROUP BY a.id, ci.file_path
    `,
      id,
    )) as any;
    if (!row) return undefined;
    return {
      ...row,
      imageCount: Number(row.imageCount),
    };
  }

  async createAlbum(name: string, description?: string): Promise<Album> {
    const query = `
      INSERT INTO media_albums (name, description)
      VALUES (?, ?) RETURNING id
    `;
    const result = (await this.db.get(query, name, description || null)) as any;
    return (await this.getAlbumById(Number(result.id)))!;
  }

  async updateAlbum(id: number, updates: Partial<Album>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.coverImageId !== undefined) {
      fields.push('cover_image_id = ?');
      values.push(updates.coverImageId);
    }

    if (fields.length > 0) {
      values.push(id);
      await this.db.run(
        `
        UPDATE media_albums
        SET ${fields.join(', ')}, date_modified = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        ...values,
      );
    }
  }

  async deleteAlbum(id: number): Promise<void> {
    await this.db.run('DELETE FROM media_albums WHERE id = ?', id);
  }

  /**
   * Get existing album by name or create a new one (idempotent)
   */
  async getOrCreateAlbum(name: string, description?: string): Promise<Album> {
    const existing = (await this.db.get('SELECT id FROM media_albums WHERE name = ?', name)) as
      | { id: number }
      | undefined;

    if (existing) {
      return (await this.getAlbumById(existing.id))!;
    }

    return await this.createAlbum(name, description);
  }

  /**
   * Check if an image already exists by original filename and album
   */
  async imageExists(originalFilename: string, albumId?: number): Promise<boolean> {
    const query = albumId
      ? "SELECT id FROM media_items WHERE original_filename = ? AND album_id = ? AND file_type LIKE 'image/%'"
      : "SELECT id FROM media_items WHERE original_filename = ? AND file_type LIKE 'image/%'";

    const row = albumId
      ? await this.db.get(query, originalFilename, albumId)
      : await this.db.get(query, originalFilename);

    return !!row;
  }

  // ============ IMAGE OPERATIONS ============

  async getAllImages(filter?: ImageFilter, sort?: ImageSort): Promise<MediaImage[]> {
    if (this.isPgClient()) {
      let query = `
        SELECT
          i.*,
          i.file_path as path,
          i.file_path as "filePath",
          a.name as "albumName"
        FROM media_items i
        LEFT JOIN media_albums a ON i.album_id = a.id
        WHERE i.file_type LIKE 'image/%'
      `;

      const conditions: string[] = [];
      const params: any[] = [];
      const bind = (value: any) => {
        params.push(value);
        return `$${params.length}`;
      };

      if (filter) {
        if (filter.albumId) conditions.push(`i.album_id = ${bind(filter.albumId)}`);
        if (filter.personId) {
          conditions.push(
            `i.id IN (SELECT media_item_id FROM media_item_people WHERE entity_id = ${bind(filter.personId)})`,
          );
        }
        if (filter.tagId) {
          conditions.push(
            `i.id IN (SELECT media_item_id FROM media_item_tags WHERE tag_id = ${bind(filter.tagId)})`,
          );
        }
        if (filter.hasPeople) {
          conditions.push(
            'EXISTS (SELECT 1 FROM media_item_people mp WHERE mp.media_item_id = i.id)',
          );
        }
        if (filter.format) conditions.push(`i.file_type = ${bind(`image/${filter.format}`)}`);
        if (filter.dateFrom) conditions.push(`i.date_taken >= ${bind(filter.dateFrom)}`);
        if (filter.dateTo) conditions.push(`i.date_taken <= ${bind(filter.dateTo)}`);
        if (filter.searchQuery) {
          const p1 = bind(`%${filter.searchQuery}%`);
          const p2 = bind(`%${filter.searchQuery}%`);
          conditions.push(`(i.title ILIKE ${p1} OR i.description ILIKE ${p2})`);
        }
      }

      if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ');
      }

      const sortFieldMap: Record<string, string> = {
        id: 'i.id',
        created_at: 'i.created_at',
        date_added: 'i.created_at',
        date_taken: 'i.date_taken',
        title: 'i.title',
        file_size: 'i.file_size',
      };
      const fieldRaw = Array.isArray(sort?.field) ? sort?.field[0] : sort?.field;
      const orderRaw = Array.isArray(sort?.order) ? sort?.order[0] : sort?.order;
      const orderDir = String(orderRaw || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      const orderField = sortFieldMap[String(fieldRaw || 'created_at')] || 'i.created_at';
      query += ` ORDER BY ${orderField} ${orderDir}, i.id DESC`;

      if (filter?.limit) {
        query += ` LIMIT ${bind(Number(filter.limit))}`;
        if (filter?.offset) query += ` OFFSET ${bind(Number(filter.offset))}`;
      }

      const { rows } = await this.db.query(query, params);
      return (rows as any[]).map((row) => ({
        ...row,
        id: Number(row.id),
        path: row.file_path ?? row.path,
        filePath: row.file_path ?? row.filePath,
        thumbnailPath: row.thumbnail_path ?? row.thumbnailPath,
        isSensitive: Boolean(row.is_sensitive ?? row.isSensitive),
        fileSize: Number((row.file_size ?? row.fileSize) || 0),
        dateAdded: row.created_at ? new Date(row.created_at).toISOString() : '',
        dateModified: row.date_modified ? new Date(row.date_modified).toISOString() : '',
        dateTaken: row.date_taken ? new Date(row.date_taken).toISOString() : undefined,
        tags: [],
      })) as MediaImage[];
    }

    let query = `
      SELECT 
        i.*,
        i.file_path as path,
        i.file_path as "filePath",
        a.name as "albumName"
      FROM media_items i
      LEFT JOIN media_albums a ON i.album_id = a.id
      WHERE i.file_type LIKE 'image/%'
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (filter) {
      if (filter.albumId) {
        conditions.push('i.album_id = ?');
        params.push(filter.albumId);
      }
      if (filter.personId) {
        conditions.push(
          'i.id IN (SELECT media_item_id FROM media_item_people WHERE entity_id = ?)',
        );
        params.push(filter.personId);
      }
      if (filter.tagId) {
        conditions.push('i.id IN (SELECT media_item_id FROM media_item_tags WHERE tag_id = ?)');
        params.push(filter.tagId);
      }
      if (filter.hasPeople) {
        conditions.push(
          'EXISTS (SELECT 1 FROM media_item_people mp WHERE mp.media_item_id = i.id)',
        );
      }
      if (filter.format) {
        conditions.push('i.file_type = ?');
        params.push(`image/${filter.format}`);
      }
      if (filter.dateFrom) {
        conditions.push('i.date_taken >= ?');
        params.push(filter.dateFrom);
      }
      if (filter.dateTo) {
        conditions.push('i.date_taken <= ?');
        params.push(filter.dateTo);
      }
      if (filter.searchQuery) {
        conditions.push('(i.title ILIKE ? OR i.description ILIKE ?)');
        params.push(`%${filter.searchQuery}%`, `%${filter.searchQuery}%`);
      }
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    // Default sort
    let orderBy = 'i.id DESC';
    if (sort && sort.field && sort.order) {
      const fieldRaw = Array.isArray(sort.field) ? sort.field[0] : sort.field;
      const orderRaw = Array.isArray(sort.order) ? sort.order[0] : sort.order;

      const field = fieldRaw === 'date_added' ? 'created_at' : fieldRaw;
      orderBy = `i.${field} ${String(orderRaw).toUpperCase()}`;
    } else {
      orderBy = 'i.created_at DESC';
    }
    query += ` ORDER BY ${orderBy}`;

    // Add pagination if specified
    if (filter?.limit) {
      query += ` LIMIT ${filter.limit}`;
      if (filter?.offset) {
        query += ` OFFSET ${filter.offset}`;
      }
    }

    const results = (await this.db.all(query, ...params)) as any[];

    return results.map((row) => ({
      ...row,
      id: Number(row.id),
      path: row.file_path,
      filePath: row.file_path,
      thumbnailPath: row.thumbnail_path,
      isSensitive: Boolean(row.is_sensitive),
      fileSize: Number(row.file_size || 0),
      dateAdded: row.created_at ? new Date(row.created_at).toISOString() : '',
      dateModified: row.date_modified ? new Date(row.date_modified).toISOString() : '',
      dateTaken: row.date_taken ? new Date(row.date_taken).toISOString() : undefined,
      tags: [],
    }));
  }

  async getImageCount(filter?: ImageFilter): Promise<number> {
    if (this.isPgClient()) {
      let query =
        "SELECT COUNT(DISTINCT i.id) as count FROM media_items i WHERE i.file_type LIKE 'image/%'";
      const conditions: string[] = [];
      const params: any[] = [];
      const bind = (value: any) => {
        params.push(value);
        return `$${params.length}`;
      };

      if (filter) {
        if (filter.albumId) conditions.push(`i.album_id = ${bind(filter.albumId)}`);
        if (filter.personId) {
          conditions.push(
            `i.id IN (SELECT media_item_id FROM media_item_people WHERE entity_id = ${bind(filter.personId)})`,
          );
        }
        if (filter.tagId) {
          conditions.push(
            `i.id IN (SELECT media_item_id FROM media_item_tags WHERE tag_id = ${bind(filter.tagId)})`,
          );
        }
        if (filter.hasPeople) {
          conditions.push(
            'EXISTS (SELECT 1 FROM media_item_people mp WHERE mp.media_item_id = i.id)',
          );
        }
        if (filter.format) conditions.push(`i.file_type = ${bind(`image/${filter.format}`)}`);
        if (filter.dateFrom) conditions.push(`i.date_taken >= ${bind(filter.dateFrom)}`);
        if (filter.dateTo) conditions.push(`i.date_taken <= ${bind(filter.dateTo)}`);
        if (filter.searchQuery) {
          const p1 = bind(`%${filter.searchQuery}%`);
          const p2 = bind(`%${filter.searchQuery}%`);
          conditions.push(`(i.title ILIKE ${p1} OR i.description ILIKE ${p2})`);
        }
      }

      if (conditions.length > 0) query += ' AND ' + conditions.join(' AND ');
      const { rows } = await this.db.query(query, params);
      return Number(rows?.[0]?.count || 0);
    }

    let query =
      "SELECT COUNT(DISTINCT i.id) as count FROM media_items i WHERE i.file_type LIKE 'image/%'";

    const conditions: string[] = [];
    const params: any[] = [];

    if (filter) {
      if (filter.albumId) {
        conditions.push('i.album_id = ?');
        params.push(filter.albumId);
      }
      if (filter.personId) {
        conditions.push(
          'i.id IN (SELECT media_item_id FROM media_item_people WHERE entity_id = ?)',
        );
        params.push(filter.personId);
      }
      if (filter.tagId) {
        conditions.push('i.id IN (SELECT media_item_id FROM media_item_tags WHERE tag_id = ?)');
        params.push(filter.tagId);
      }
      if (filter.hasPeople) {
        conditions.push(
          'EXISTS (SELECT 1 FROM media_item_people mp WHERE mp.media_item_id = i.id)',
        );
      }
      if (filter.format) {
        conditions.push('i.file_type = ?');
        params.push(`image/${filter.format}`);
      }
      if (filter.dateFrom) {
        conditions.push('i.date_taken >= ?');
        params.push(filter.dateFrom);
      }
      if (filter.dateTo) {
        conditions.push('i.date_taken <= ?');
        params.push(filter.dateTo);
      }
      if (filter.searchQuery) {
        conditions.push('(i.title ILIKE ? OR i.description ILIKE ?)');
        params.push(`%${filter.searchQuery}%`, `%${filter.searchQuery}%`);
      }
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    const result = (await this.db.get(query, ...params)) as { count: number };
    return Number(result.count);
  }

  async getImageById(id: number): Promise<MediaImage | undefined> {
    if (this.isPgClient()) {
      const { rows } = await this.db.query(
        `
          SELECT
            id,
            entity_id,
            document_id,
            file_path,
            thumbnail_path,
            file_type,
            file_size,
            width,
            height,
            title,
            description,
            is_sensitive,
            verification_status,
            red_flag_rating,
            metadata_json,
            exif_json,
            date_taken,
            created_at
          FROM media_items
          WHERE id = $1
          LIMIT 1
        `,
        [id],
      );
      const item = rows[0];
      if (!item) return undefined;

      return {
        ...item,
        id: Number(item.id),
        path: item.file_path,
        filePath: item.file_path,
        thumbnailPath: item.thumbnail_path,
        isSensitive: Boolean(item.is_sensitive),
        redFlagRating: Number(item.red_flag_rating || 0),
        width: Number(item.width || 0),
        height: Number(item.height || 0),
        fileSize: Number(item.file_size || 0),
        dateAdded: item.created_at ? new Date(item.created_at).toISOString() : '',
        dateModified: '',
        dateTaken: item.date_taken ? new Date(item.date_taken).toISOString() : undefined,
      } as any;
    }

    const rows = await mediaQueries.getMediaItemById.run(
      { id: String(id) },
      this.isPgClient() ? this.db : pgDb,
    );
    const item = rows[0] as any;
    if (!item) return undefined;

    return {
      ...item,
      id: Number(item.id),
      path: item.file_path,
      filePath: item.file_path,
      thumbnailPath: item.thumbnail_path,
      isSensitive: Boolean(item.is_sensitive),
      redFlagRating: Number(item.red_flag_rating || 0),
      width: item.width || 0,
      height: item.height || 0,
      fileSize: Number(item.file_size || 0),
      dateAdded: item.created_at ? new Date(item.created_at).toISOString() : '',
      dateModified: item.date_modified ? new Date(item.date_modified).toISOString() : '',
      dateTaken: item.date_taken ? new Date(item.date_taken).toISOString() : undefined,
    } as any;
  }

  async createImage(
    image: Omit<MediaImage, 'id' | 'dateAdded' | 'dateModified'>,
  ): Promise<MediaImage> {
    const query = `
      INSERT INTO media_items (
        filename, original_filename, file_path, thumbnail_path, title, description,
        album_id, width, height, file_size, file_type, date_taken,
        camera_make, camera_model, lens, focal_length, aperture, shutter_speed,
        iso, latitude, longitude, color_profile, orientation,
        created_at, date_modified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `;

    const result = (await this.db.get(
      query,
      image.filename,
      image.originalFilename,
      image.path,
      image.thumbnailPath || null,
      image.title || null,
      image.description || null,
      image.albumId || null,
      image.width || 0,
      image.height || 0,
      image.fileSize,
      image.format,
      image.dateTaken || null,
      image.cameraMake || null,
      image.cameraModel || null,
      image.lens || null,
      image.focalLength || null,
      image.aperture || null,
      image.shutterSpeed || null,
      image.iso || null,
      image.latitude || null,
      image.longitude || null,
      image.colorProfile || null,
      image.orientation || 1,
    )) as any;

    return (await this.getImageById(Number(result.id)))!;
  }

  async updateImage(id: number, updates: Partial<MediaImage>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    const fieldMap: Record<string, string> = {
      title: 'title',
      description: 'description',
      albumId: 'album_id',
      thumbnailPath: 'thumbnail_path',
      orientation: 'orientation',
      width: 'width',
      height: 'height',
      fileSize: 'file_size',
    };

    Object.entries(updates).forEach(([key, value]) => {
      const dbField = fieldMap[key];
      if (dbField) {
        fields.push(`${dbField} = ?`);
        values.push(value);
      }
    });

    if (fields.length > 0) {
      if (this.isPgClient()) {
        const params: any[] = [];
        const setClauses = fields.map((f, idx) => {
          const dbField = f.split('=')[0].trim();
          params.push(values[idx]);
          return `${dbField} = $${params.length}`;
        });
        params.push(id);
        await this.pgExec(
          `
          UPDATE media_items
          SET ${setClauses.join(', ')}
          WHERE id = $${params.length}
        `,
          params,
        );
      } else {
        values.push(id);
        const query = `
          UPDATE media_items
          SET ${fields.join(', ')}, date_modified = CURRENT_TIMESTAMP
          WHERE id = ?
        `;
        await this.db.run(query, ...values);
      }
    }
  }

  async rotateImage(id: number, degrees: number): Promise<void> {
    const image = await this.getImageById(id);
    if (!image) throw new Error('Image not found');

    // Resolve image path
    let imagePath = image.path;

    // Check if the path exists as-is (absolute path)
    if (!fs.existsSync(imagePath)) {
      if (imagePath.startsWith('/data/') || imagePath.startsWith('/')) {
        const relativePath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
        const resolvedPath = path.join(process.cwd(), relativePath);
        if (fs.existsSync(resolvedPath)) {
          imagePath = resolvedPath;
        }
      }
    }

    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found at: ${imagePath}`);
    }

    let cssRotation = 0;
    switch (image.orientation) {
      case 6:
        cssRotation = 90;
        break;
      case 3:
        cssRotation = 180;
        break;
      case 8:
        cssRotation = 270;
        break;
    }

    const totalRotation = (cssRotation + degrees) % 360;
    const imageExt = path.extname(imagePath) || '.jpg';
    const tempPath = `${imagePath}.tmp${imageExt}`;

    await sharp(imagePath).rotate().rotate(totalRotation).withMetadata().toFile(tempPath);

    fs.renameSync(tempPath, imagePath);
    const metadata = await sharp(imagePath).metadata();

    await this.updateImage(id, {
      orientation: 1,
      width: metadata.width,
      height: metadata.height,
      fileSize: metadata.size,
    });
  }

  async deleteImage(id: number): Promise<void> {
    if (this.isPgClient()) {
      await this.pgExec('DELETE FROM media_items WHERE id = $1', [id]);
      return;
    }
    await this.db.run('DELETE FROM media_items WHERE id = ?', id);
  }

  // ============ TAG OPERATIONS ============

  async createTag(name: string, category?: string): Promise<MediaTag> {
    const query = `
      INSERT INTO media_tags (name, category)
      VALUES (?, ?) RETURNING id
    `;
    const result = (await this.db.get(query, name, category || null)) as any;
    return (await this.getTagById(Number(result.id)))!;
  }

  async getTagById(id: number): Promise<MediaTag | undefined> {
    return (await this.db.get('SELECT * FROM media_tags WHERE id = ?', id)) as MediaTag | undefined;
  }

  async getOrCreateTag(name: string, category?: string): Promise<MediaTag> {
    let tag = (await this.db.get('SELECT * FROM media_tags WHERE name = ?', name)) as
      | MediaTag
      | undefined;

    if (!tag) {
      tag = await this.createTag(name, category);
    }

    return tag;
  }

  async addTagToImage(imageId: number, tagId: number): Promise<void> {
    if (this.isPgClient()) {
      await this.pgExec(
        `
        INSERT INTO media_item_tags (media_item_id, tag_id)
        VALUES ($1, $2) ON CONFLICT DO NOTHING
      `,
        [imageId, tagId],
      );
      return;
    }
    await this.db.run(
      `
      INSERT INTO media_item_tags (media_item_id, tag_id)
      VALUES (?, ?) ON CONFLICT DO NOTHING
    `,
      imageId,
      tagId,
    );
  }

  async removeTagFromImage(imageId: number, tagId: number): Promise<void> {
    if (this.isPgClient()) {
      await this.pgExec(
        `
        DELETE FROM media_item_tags
        WHERE media_item_id = $1 AND tag_id = $2
      `,
        [imageId, tagId],
      );
      return;
    }
    await this.db.run(
      `
      DELETE FROM media_item_tags
      WHERE media_item_id = ? AND tag_id = ?
    `,
      imageId,
      tagId,
    );
  }

  async getImageTags(imageId: number): Promise<MediaTag[]> {
    return (await this.db.all(
      `
      SELECT t.*
      FROM media_tags t
      JOIN media_item_tags it ON t.id = it.tag_id
      WHERE it.media_item_id = ?
      ORDER BY t.name
    `,
      imageId,
    )) as MediaTag[];
  }

  // ============ MEDIA ITEM (AUDIO/VIDEO) TAGS ============

  async addTagToItem(itemId: number, tagId: number): Promise<void> {
    if (this.isPgClient()) {
      await this.pgExec(
        `
        INSERT INTO media_item_tags (media_item_id, tag_id)
        VALUES ($1, $2) ON CONFLICT DO NOTHING
      `,
        [itemId, tagId],
      );
      return;
    }
    await this.db.run(
      `
      INSERT INTO media_item_tags (media_item_id, tag_id)
      VALUES (?, ?) ON CONFLICT DO NOTHING
    `,
      itemId,
      tagId,
    );
  }

  async removeTagFromItem(itemId: number, tagId: number): Promise<void> {
    if (this.isPgClient()) {
      await this.pgExec(
        `
        DELETE FROM media_item_tags
        WHERE media_item_id = $1 AND tag_id = $2
      `,
        [itemId, tagId],
      );
      return;
    }
    await this.db.run(
      `
      DELETE FROM media_item_tags
      WHERE media_item_id = ? AND tag_id = ?
    `,
      itemId,
      tagId,
    );
  }

  async addPersonToItem(itemId: number, personId: number): Promise<void> {
    if (this.isPgClient()) {
      await this.pgExec(
        `
        INSERT INTO media_item_people (media_item_id, entity_id)
        VALUES ($1, $2) ON CONFLICT DO NOTHING
      `,
        [itemId, personId],
      );
      return;
    }
    await this.db.run(
      `
      INSERT INTO media_item_people (media_item_id, entity_id)
      VALUES (?, ?) ON CONFLICT DO NOTHING
    `,
      itemId,
      personId,
    );
  }

  async removePersonFromItem(itemId: number, personId: number): Promise<void> {
    if (this.isPgClient()) {
      await this.pgExec(
        `
        DELETE FROM media_item_people
        WHERE media_item_id = $1 AND entity_id = $2
      `,
        [itemId, personId],
      );
      return;
    }
    await this.db.run(
      `
      DELETE FROM media_item_people
      WHERE media_item_id = ? AND entity_id = ?
    `,
      itemId,
      personId,
    );
  }

  // ============ STATISTICS ============

  async getMediaStats(): Promise<MediaStats> {
    if (this.isPgClient()) {
      const totalImagesRes = (await this.pgRow<{ count: string | number }>(
        "SELECT COUNT(*) as count FROM media_items WHERE file_type LIKE 'image/%'",
      )) || { count: 0 };
      const totalAlbumsRes = (await this.pgRow<{ count: string | number }>(
        'SELECT COUNT(*) as count FROM media_albums',
      )) || { count: 0 };
      const totalSizeRes = (await this.pgRow<{ size: string | number | null }>(
        "SELECT COALESCE(SUM(file_size), 0) as size FROM media_items WHERE file_type LIKE 'image/%'",
      )) || { size: 0 };

      const formatBreakdown = await this.pgRows<{ format: string; count: string | number }>(`
        SELECT file_type as format, COUNT(*) as count
        FROM media_items
        WHERE file_type LIKE 'image/%'
        GROUP BY file_type
      `);

      const albumBreakdown = await this.pgRows<{ name: string; count: string | number }>(`
        SELECT a.name, COUNT(i.id) as count
        FROM media_albums a
        LEFT JOIN media_items i ON a.id = i.album_id AND i.file_type LIKE 'image/%'
        GROUP BY a.id, a.name
      `);

      return {
        totalImages: Number(totalImagesRes.count || 0),
        totalAlbums: Number(totalAlbumsRes.count || 0),
        totalSize: Number(totalSizeRes.size || 0),
        formatBreakdown: Object.fromEntries(
          formatBreakdown.map((f) => [f.format, Number(f.count)]),
        ),
        albumBreakdown: Object.fromEntries(albumBreakdown.map((a) => [a.name, Number(a.count)])),
      };
    }
    const totalImagesRes = (await this.db.get(
      "SELECT COUNT(*) as count FROM media_items WHERE file_type LIKE 'image/%'",
    )) as { count: number };
    const totalAlbumsRes = (await this.db.get('SELECT COUNT(*) as count FROM media_albums')) as {
      count: number;
    };
    const totalSizeRes = (await this.db.get(
      "SELECT SUM(file_size) as size FROM media_items WHERE file_type LIKE 'image/%'",
    )) as { size: number };

    const formatBreakdown = (await this.db.all(`
      SELECT file_type as format, COUNT(*) as count
      FROM media_items
      WHERE file_type LIKE 'image/%'
      GROUP BY file_type
    `)) as { format: string; count: number }[];

    const albumBreakdown = (await this.db.all(`
      SELECT a.name, COUNT(i.id) as count
      FROM media_albums a
      LEFT JOIN media_items i ON a.id = i.album_id AND i.file_type LIKE 'image/%'
      GROUP BY a.id, a.name
    `)) as { name: string; count: number }[];

    return {
      totalImages: Number(totalImagesRes.count || 0),
      totalAlbums: Number(totalAlbumsRes.count || 0),
      totalSize: Number(totalSizeRes.size || 0),
      formatBreakdown: Object.fromEntries(formatBreakdown.map((f) => [f.format, Number(f.count)])),
      albumBreakdown: Object.fromEntries(albumBreakdown.map((a) => [a.name, Number(a.count)])),
    };
  }

  // ============ SEARCH ============

  async searchImages(query: string): Promise<MediaImage[]> {
    return await this.getAllImages({ searchQuery: query });
  }

  // ============ ADVANCED OPERATIONS ============

  async generateThumbnail(
    imagePath: string,
    outputDir: string,
    options: { force?: boolean; orientation?: number } = {},
  ): Promise<string> {
    // Resolve image path for production (relative to app root)
    let resolvedPath = imagePath;

    if (!fs.existsSync(resolvedPath)) {
      if (imagePath.startsWith('/data/') || imagePath.startsWith('/')) {
        const relativePath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
        const candidatePath = path.join(process.cwd(), relativePath);
        if (fs.existsSync(candidatePath)) {
          resolvedPath = candidatePath;
        }
      }
    }

    if (!fs.existsSync(resolvedPath)) {
      console.warn(`Source image for thumbnail not found: ${resolvedPath}`);
      return imagePath;
    }

    // Resolve output dir for production
    let resolvedOutputDir = outputDir;
    if (outputDir.startsWith('/data/') || outputDir.startsWith('/')) {
      const relativePath = outputDir.startsWith('/') ? outputDir.slice(1) : outputDir;
      resolvedOutputDir = path.join(process.cwd(), relativePath);
    }

    const filename = path.basename(imagePath);
    const thumbnailPath = path.join(resolvedOutputDir, `thumb_${filename}`);

    if (fs.existsSync(thumbnailPath) && !options.force) {
      return thumbnailPath;
    }

    if (!fs.existsSync(resolvedOutputDir)) {
      fs.mkdirSync(resolvedOutputDir, { recursive: true });
    }

    try {
      let pipeline = sharp(resolvedPath).rotate();

      // Apply DB-specified orientation if provided
      // 1: 0deg, 3: 180deg, 6: 90deg, 8: 270deg
      if (options.orientation) {
        let degrees = 0;
        switch (options.orientation) {
          case 3:
            degrees = 180;
            break;
          case 6:
            degrees = 90;
            break;
          case 8:
            degrees = 270;
            break;
        }
        if (degrees > 0) {
          pipeline = pipeline.rotate(degrees);
        }
      }

      const isFake =
        /fake/i.test(imagePath) ||
        /confirmed[\s_-]*fake/i.test(imagePath) ||
        /\/fake\//i.test(imagePath);
      const resized = pipeline.resize(300, 300, { fit: 'cover' });
      if (isFake) {
        const svg = Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="rgba(255,0,0,0.0)"/>
                <stop offset="0.5" stop-color="rgba(255,0,0,0.18)"/>
                <stop offset="1" stop-color="rgba(255,0,0,0.0)"/>
              </linearGradient>
            </defs>
            <rect width="300" height="300" fill="url(#g)"/>
            <g transform="translate(150,150) rotate(-30)">
              <text x="0" y="0" text-anchor="middle" dominant-baseline="middle"
                font-family="Arial, Helvetica, sans-serif" font-size="72"
                fill="rgba(255,0,0,0.35)" stroke="rgba(255,255,255,0.25)" stroke-width="2">
                FAKE
              </text>
            </g>
          </svg>`,
        );
        await resized.composite([{ input: svg, gravity: 'center' }]).toFile(thumbnailPath);
      } else {
        await resized.toFile(thumbnailPath);
      }

      return thumbnailPath;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return imagePath; // Fallback to original if thumb fails
    }
  }

  async processUpload(file: any, albumId?: number): Promise<MediaImage> {
    const buffer = fs.readFileSync(file.path);
    let tags: any = {};
    let imageSize: any = {};

    try {
      const parser = exifParser.create(buffer);
      const result = parser.parse();
      tags = result.tags || {};
      imageSize = result.imageSize || {};
    } catch (e) {
      console.warn('Failed to parse EXIF data:', e);
    }

    const isFakePath =
      /fake/i.test(file.path) ||
      /confirmed[\s_-]*fake/i.test(file.path) ||
      /\/fake\//i.test(file.path);
    if (isFakePath) {
      try {
        const meta = await sharp(buffer).metadata();
        const w = meta.width || 0;
        const h = meta.height || 0;
        const svg = Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="rgba(255,0,0,0.0)"/>
                <stop offset="0.5" stop-color="rgba(255,0,0,0.18)"/>
                <stop offset="1" stop-color="rgba(255,0,0,0.0)"/>
              </linearGradient>
            </defs>
            <rect width="${w}" height="${h}" fill="url(#g)"/>
            <g transform="translate(${Math.floor(w / 2)},${Math.floor(h / 2)}) rotate(-30)">
              <text x="0" y="0" text-anchor="middle" dominant-baseline="middle"
                font-family="Arial, Helvetica, sans-serif" font-size="${Math.floor(Math.min(w, h) * 0.18)}"
                fill="rgba(255,0,0,0.35)" stroke="rgba(255,255,255,0.25)" stroke-width="${Math.max(1, Math.floor(Math.min(w, h) * 0.005))}">
                FAKE
              </text>
            </g>
          </svg>`,
        );
        await sharp(buffer)
          .rotate()
          .composite([{ input: svg, gravity: 'center' }])
          .toFile(file.path);
      } catch (e) {
        console.warn('Failed to overlay FAKE watermark on media upload:', e);
      }
    }
    // Insert into DB
    const query = `
      INSERT INTO media_items (
        filename, original_filename, file_path, file_size, file_type,
        width, height, date_taken, album_id,
        camera_make, camera_model, focal_length, aperture,
        shutter_speed, iso, latitude, longitude,
        created_at, date_modified
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING id
    `;

    const info = (await this.db.get(
      query,
      file.filename,
      file.originalname,
      file.path,
      file.size,
      path.extname(file.originalname).slice(1).toLowerCase(),
      imageSize.width || 0,
      imageSize.height || 0,
      tags.DateTimeOriginal ? new Date(tags.DateTimeOriginal * 1000).toISOString() : null,
      albumId || null,
      tags.Make || null,
      tags.Model || null,
      tags.FocalLength?.toString() || null,
      tags.FNumber?.toString() || null,
      tags.ExposureTime?.toString() || null,
      tags.ISO || null,
      tags.GPSLatitude || null,
      tags.GPSLongitude || null,
    )) as any;

    const finalImage = await this.getImageById(Number(info.id));
    return finalImage!;
  }

  async deleteImages(ids: number[]): Promise<void> {
    for (const id of ids) {
      try {
        await this.deleteImage(id);
      } catch (err) {
        console.error(`Failed to delete image ${id} in bulk:`, err);
      }
    }
  }

  async createAlbumArchive(albumId: number, res: any): Promise<void> {
    const album = await this.getAlbumById(albumId);
    if (!album) throw new Error('Album not found');

    const images = await this.getAllImages({ albumId });
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.attachment(`${album.name.replace(/[^a-z0-9]/gi, '_')}.zip`);
    archive.pipe(res);

    for (const image of images) {
      const imgPath = image.path || image.file_path;
      if (imgPath && fs.existsSync(imgPath)) {
        archive.file(imgPath, { name: image.filename || image.file_name || 'image' });
      }
    }

    await archive.finalize();
  }

  close(): void {
    // Shared PG pool handles closing.
  }
}
