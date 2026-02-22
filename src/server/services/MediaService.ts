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

export class MediaService {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  private async hasTable(tableName: string): Promise<boolean> {
    try {
      // In Postgres we usually check pg_tables, but PgWrapper translateSql might handle this.
      // For now, let's use a simpler check or rely on translateSql.
      const row = (await this.db
        .prepare('SELECT tablename FROM pg_catalog.pg_tables WHERE tablename = ?')
        .get(tableName)) as { tablename?: string } | undefined;
      return !!row?.tablename;
    } catch (error) {
      return false;
    }
  }

  // ============ TAG OPERATIONS ============

  async getAllTags(): Promise<MediaTag[]> {
    const stmt = await this.db.prepare('SELECT * FROM media_tags ORDER BY name');
    return (await stmt.all()) as MediaTag[];
  }

  // ============ ALBUM OPERATIONS ============

  async getAllAlbums(): Promise<Album[]> {
    const stmt = await this.db.prepare(`
      SELECT 
        a.*,
        COUNT(i.id) as "imageCount",
        ci.file_path as "coverImagePath"
      FROM media_albums a
      LEFT JOIN media_items i ON a.id = i.album_id AND i.file_type LIKE 'image/%'
      LEFT JOIN media_items ci ON a.cover_image_id = ci.id
      GROUP BY a.id, ci.file_path
      HAVING COUNT(i.id) > 0
      ORDER BY a.name
    `);
    return (await stmt.all()) as Album[];
  }

  async getAlbumById(id: number): Promise<Album | undefined> {
    const stmt = await this.db.prepare(`
      SELECT 
        a.*,
        COUNT(i.id) as "imageCount",
        ci.file_path as "coverImagePath"
      FROM media_albums a
      LEFT JOIN media_items i ON a.id = i.album_id AND i.file_type LIKE 'image/%'
      LEFT JOIN media_items ci ON a.cover_image_id = ci.id
      WHERE a.id = ?
      GROUP BY a.id, ci.file_path
    `);
    return (await stmt.get(id)) as Album | undefined;
  }

  async createAlbum(name: string, description?: string): Promise<Album> {
    const stmt = await this.db.prepare(`
      INSERT INTO media_albums (name, description)
      VALUES (?, ?) RETURNING id
    `);
    const result = (await stmt.run(name, description)) as any;
    return (await this.getAlbumById(result.lastInsertRowid as number))!;
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
      const stmt = await this.db.prepare(`
        UPDATE media_albums
        SET ${fields.join(', ')}, date_modified = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      await stmt.run(...values);
    }
  }

  async deleteAlbum(id: number): Promise<void> {
    const stmt = await this.db.prepare('DELETE FROM media_albums WHERE id = ?');
    await stmt.run(id);
  }

  /**
   * Get existing album by name or create a new one (idempotent)
   */
  async getOrCreateAlbum(name: string, description?: string): Promise<Album> {
    const stmt = await this.db.prepare('SELECT id FROM media_albums WHERE name = ?');
    const existing = (await stmt.get(name)) as { id: number } | undefined;

    if (existing) {
      return (await this.getAlbumById(existing.id))!;
    }

    return await this.createAlbum(name, description);
  }

  /**
   * Check if an image already exists by original filename and album
   */
  async imageExists(originalFilename: string, albumId?: number): Promise<boolean> {
    const stmt = albumId
      ? await this.db.prepare(
          "SELECT id FROM media_items WHERE original_filename = ? AND album_id = ? AND file_type LIKE 'image/%'",
        )
      : await this.db.prepare(
          "SELECT id FROM media_items WHERE original_filename = ? AND file_type LIKE 'image/%'",
        );

    const result = albumId
      ? await stmt.get(originalFilename, albumId)
      : await stmt.get(originalFilename);

    return !!result;
  }

  // ============ IMAGE OPERATIONS ============

  async getAllImages(filter?: ImageFilter, sort?: ImageSort): Promise<MediaImage[]> {
    // Unified media_items table handles all media types.
    let query = `
      SELECT 
        i.*,
        i.file_path as path,
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
        try {
          if (await this.hasTable('media_items_fts')) {
            conditions.push(`i.id IN (
              SELECT rowid FROM media_items_fts 
              WHERE media_items_fts MATCH ?
            )`);
            params.push(filter.searchQuery);
          } else {
            console.warn('MediaService: FTS table missing, falling back to LIKE');
            conditions.push('(i.title LIKE ? OR i.description LIKE ?)');
            params.push(`%${filter.searchQuery}%`, `%${filter.searchQuery}%`);
          }
        } catch (e) {
          console.error('MediaService: Search failed:', e);
        }
      }
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' GROUP BY i.id, a.name';

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

    const stmt = await this.db.prepare(query);
    const results = (await stmt.all(...params)) as any[];

    return results.map((row) => ({
      ...row,
      // Tags are resolved via separate /api/media/images/:id/tags endpoint.
      tags: [],
    }));
  }

  async getImageCount(filter?: ImageFilter): Promise<number> {
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
        try {
          if (await this.hasTable('media_items_fts')) {
            conditions.push(`i.id IN (
              SELECT rowid FROM media_items_fts 
              WHERE media_items_fts MATCH ?
            )`);
            params.push(filter.searchQuery);
          } else {
            conditions.push('(i.title LIKE ? OR i.description LIKE ?)');
            params.push(`%${filter.searchQuery}%`, `%${filter.searchQuery}%`);
          }
        } catch (e) {
          console.error('MediaService: Count search failed:', e);
        }
      }
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    const result = (await this.db.prepare(query).get(...params)) as { count: number };
    return result.count;
  }

  async getImageById(id: number): Promise<MediaImage | undefined> {
    // Keep this focused on core image/album fields; tags are fetched separately.
    const stmt = await this.db.prepare(`
      SELECT 
        i.*,
        i.file_path as path,
        a.name as "albumName"
      FROM media_items i
      LEFT JOIN media_albums a ON i.album_id = a.id
      WHERE i.id = ?
    `);
    const result = (await stmt.get(id)) as any;
    if (!result) return undefined;

    return {
      ...result,
      tags: [],
    };
  }

  async createImage(
    image: Omit<MediaImage, 'id' | 'dateAdded' | 'dateModified'>,
  ): Promise<MediaImage> {
    const stmt = await this.db.prepare(`
      INSERT INTO media_items (
        filename, original_filename, file_path, thumbnail_path, title, description,
        album_id, width, height, file_size, file_type, date_taken,
        camera_make, camera_model, lens, focal_length, aperture, shutter_speed,
        iso, latitude, longitude, color_profile, orientation,
        created_at, date_modified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `);

    const result = (await stmt.run(
      image.filename,
      image.originalFilename,
      image.path,
      image.thumbnailPath || null,
      image.title || null,
      image.description || null,
      image.albumId || null,
      image.width || null,
      image.height || null,
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

    return (await this.getImageById(result.lastInsertRowid as number))!;
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
      values.push(id);
      const stmt = await this.db.prepare(`
        UPDATE media_items
        SET ${fields.join(', ')}, date_modified = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      await stmt.run(...values);
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
    const stmt = await this.db.prepare('DELETE FROM media_items WHERE id = ?');
    await stmt.run(id);
  }

  // ============ TAG OPERATIONS ============

  async createTag(name: string, category?: string): Promise<MediaTag> {
    const stmt = await this.db.prepare(`
      INSERT INTO media_tags (name, category)
      VALUES (?, ?) RETURNING id
    `);
    const result = (await stmt.run(name, category || null)) as any;
    return (await this.getTagById(result.lastInsertRowid as number))!;
  }

  async getTagById(id: number): Promise<MediaTag | undefined> {
    const stmt = await this.db.prepare('SELECT * FROM media_tags WHERE id = ?');
    return (await stmt.get(id)) as MediaTag | undefined;
  }

  async getOrCreateTag(name: string, category?: string): Promise<MediaTag> {
    const stmt = await this.db.prepare('SELECT * FROM media_tags WHERE name = ?');
    let tag = (await stmt.get(name)) as MediaTag | undefined;

    if (!tag) {
      tag = await this.createTag(name, category);
    }

    return tag;
  }

  async addTagToImage(imageId: number, tagId: number): Promise<void> {
    const stmt = await this.db.prepare(`
      INSERT INTO media_item_tags (media_item_id, tag_id)
      VALUES (?, ?) ON CONFLICT DO NOTHING
    `);
    await stmt.run(imageId, tagId);
  }

  async removeTagFromImage(imageId: number, tagId: number): Promise<void> {
    const stmt = await this.db.prepare(`
      DELETE FROM media_item_tags
      WHERE media_item_id = ? AND tag_id = ?
    `);
    await stmt.run(imageId, tagId);
  }

  async getImageTags(imageId: number): Promise<MediaTag[]> {
    const stmt = await this.db.prepare(`
      SELECT t.*
      FROM media_tags t
      JOIN media_item_tags it ON t.id = it.tag_id
      WHERE it.media_item_id = ?
      ORDER BY t.name
    `);
    return (await stmt.all(imageId)) as MediaTag[];
  }

  // ============ MEDIA ITEM (AUDIO/VIDEO) TAGS ============

  async addTagToItem(itemId: number, tagId: number): Promise<void> {
    const stmt = await this.db.prepare(`
      INSERT INTO media_item_tags (media_item_id, tag_id)
      VALUES (?, ?) ON CONFLICT DO NOTHING
    `);
    await stmt.run(itemId, tagId);
  }

  async removeTagFromItem(itemId: number, tagId: number): Promise<void> {
    const stmt = await this.db.prepare(`
      DELETE FROM media_item_tags
      WHERE media_item_id = ? AND tag_id = ?
    `);
    await stmt.run(itemId, tagId);
  }

  async addPersonToItem(itemId: number, personId: number): Promise<void> {
    const stmt = await this.db.prepare(`
      INSERT INTO media_item_people (media_item_id, entity_id)
      VALUES (?, ?) ON CONFLICT DO NOTHING
    `);
    await stmt.run(itemId, personId);
  }

  async removePersonFromItem(itemId: number, personId: number): Promise<void> {
    const stmt = await this.db.prepare(`
      DELETE FROM media_item_people
      WHERE media_item_id = ? AND entity_id = ?
    `);
    await stmt.run(itemId, personId);
  }

  // ============ STATISTICS ============

  async getMediaStats(): Promise<MediaStats> {
    const totalImages = (await this.db
      .prepare("SELECT COUNT(*) as count FROM media_items WHERE file_type LIKE 'image/%'")
      .get()) as {
      count: number;
    };
    const totalAlbums = (await this.db
      .prepare('SELECT COUNT(*) as count FROM media_albums')
      .get()) as {
      count: number;
    };
    const totalSize = (await this.db
      .prepare("SELECT SUM(file_size) as size FROM media_items WHERE file_type LIKE 'image/%'")
      .get()) as {
      size: number;
    };

    const formatBreakdown = (await this.db
      .prepare(
        `
      SELECT file_type as format, COUNT(*) as count
      FROM media_items
      WHERE file_type LIKE 'image/%'
      GROUP BY file_type
    `,
      )
      .all()) as { format: string; count: number }[];

    const albumBreakdown = (await this.db
      .prepare(
        `
      SELECT a.name, COUNT(i.id) as count
      FROM media_albums a
      LEFT JOIN media_items i ON a.id = i.album_id AND i.file_type LIKE 'image/%'
      GROUP BY a.id, a.name
    `,
      )
      .all()) as { name: string; count: number }[];

    return {
      totalImages: totalImages.count,
      totalAlbums: totalAlbums.count,
      totalSize: totalSize.size || 0,
      formatBreakdown: Object.fromEntries(formatBreakdown.map((f) => [f.format, f.count])),
      albumBreakdown: Object.fromEntries(albumBreakdown.map((a) => [a.name, a.count])),
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
    const stmt = this.db.prepare(`
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
        datetime('now'), datetime('now')
      )
    `);

    const info = stmt.run(
      file.filename,
      file.originalname,
      file.path,
      file.size,
      path.extname(file.originalname).slice(1).toLowerCase(),
      imageSize.width || 0,
      imageSize.height || 0,
      tags.DateTimeOriginal ? new Date(tags.DateTimeOriginal * 1000).toISOString() : null,
      albumId || null,
      tags.Make,
      tags.Model,
      tags.FocalLength?.toString(),
      tags.FNumber?.toString(),
      tags.ExposureTime?.toString(),
      tags.ISO,
      tags.GPSLatitude,
      tags.GPSLongitude,
    );

    const finalImage = await this.getImageById(info.lastInsertRowid as number);
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
    this.db.close();
  }
}
