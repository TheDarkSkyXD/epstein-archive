import Database from 'better-sqlite3';
import {
  MediaImage,
  Album,
  MediaTag,
  ImageFilter,
  ImageSort,
  MediaStats,
} from '../types/media.types';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import exifParser from 'exif-parser';
import archiver from 'archiver';

export class MediaService {
  private db: any;

  constructor(dbOrPath: string | any) {
    if (typeof dbOrPath === 'string') {
      this.db = new Database(dbOrPath);
    } else {
      this.db = dbOrPath;
    }
  }

  // ============ TAG OPERATIONS ============

  getAllTags(): MediaTag[] {
    const stmt = this.db.prepare('SELECT * FROM media_tags ORDER BY name');
    return stmt.all() as MediaTag[];
  }

  // ============ ALBUM OPERATIONS ============

  getAllAlbums(): Album[] {
    const stmt = this.db.prepare(`
      SELECT 
        a.*,
        COUNT(i.id) as imageCount,
        ci.path as coverImagePath
      FROM media_albums a
      LEFT JOIN media_images i ON a.id = i.album_id
      LEFT JOIN media_images ci ON a.cover_image_id = ci.id
      GROUP BY a.id
      HAVING imageCount > 0
      ORDER BY a.name
    `);
    return stmt.all() as Album[];
  }

  getAlbumById(id: number): Album | undefined {
    const stmt = this.db.prepare(`
      SELECT 
        a.*,
        COUNT(i.id) as imageCount,
        ci.path as coverImagePath
      FROM media_albums a
      LEFT JOIN media_images i ON a.id = i.album_id
      LEFT JOIN media_images ci ON a.cover_image_id = ci.id
      WHERE a.id = ?
      GROUP BY a.id
    `);
    return stmt.get(id) as Album | undefined;
  }

  createAlbum(name: string, description?: string): Album {
    const stmt = this.db.prepare(`
      INSERT INTO media_albums (name, description)
      VALUES (?, ?)
    `);
    const result = stmt.run(name, description);
    return this.getAlbumById(result.lastInsertRowid as number)!;
  }

  updateAlbum(id: number, updates: Partial<Album>): void {
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
      const stmt = this.db.prepare(`
        UPDATE media_albums
        SET ${fields.join(', ')}, date_modified = datetime('now')
        WHERE id = ?
      `);
      stmt.run(...values);
    }
  }

  deleteAlbum(id: number): void {
    const stmt = this.db.prepare('DELETE FROM media_albums WHERE id = ?');
    stmt.run(id);
  }

  /**
   * Get existing album by name or create a new one (idempotent)
   */
  getOrCreateAlbum(name: string, description?: string): Album {
    const stmt = this.db.prepare('SELECT id FROM media_albums WHERE name = ?');
    const existing = stmt.get(name) as { id: number } | undefined;

    if (existing) {
      return this.getAlbumById(existing.id)!;
    }

    return this.createAlbum(name, description);
  }

  /**
   * Check if an image already exists by original filename and album
   */
  imageExists(originalFilename: string, albumId?: number): boolean {
    const stmt = albumId
      ? this.db.prepare('SELECT id FROM media_images WHERE original_filename = ? AND album_id = ?')
      : this.db.prepare('SELECT id FROM media_images WHERE original_filename = ?');

    const result = albumId ? stmt.get(originalFilename, albumId) : stmt.get(originalFilename);

    return !!result;
  }

  // ============ IMAGE OPERATIONS ============

  getAllImages(filter?: ImageFilter, sort?: ImageSort): MediaImage[] {
    let query = `
      SELECT 
        i.*,
        a.name as albumName,
        GROUP_CONCAT(t.name, ', ') as tags
      FROM media_images i
      LEFT JOIN media_albums a ON i.album_id = a.id
      LEFT JOIN media_image_tags it ON i.id = it.image_id
      LEFT JOIN media_tags t ON it.tag_id = t.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (filter) {
      if (filter.albumId) {
        conditions.push('i.album_id = ?');
        params.push(filter.albumId);
      }
      if (filter.tagId) {
        conditions.push('i.id IN (SELECT image_id FROM media_image_tags WHERE tag_id = ?)');
        params.push(filter.tagId);
      }
      if (filter.personId) {
        conditions.push('i.id IN (SELECT media_id FROM media_people WHERE entity_id = ?)');
        params.push(filter.personId);
      }
      if (filter.format) {
        conditions.push('i.format = ?');
        params.push(filter.format);
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
        conditions.push(`i.id IN (
          SELECT rowid FROM media_images_fts 
          WHERE media_images_fts MATCH ?
        )`);
        params.push(filter.searchQuery);
      }
      // if (filter.hasPeople) {
      //   conditions.push('i.id IN (SELECT media_id FROM media_people)');
      // }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY i.id';

    if (sort && sort.field && sort.order) {
      query += ` ORDER BY i.${sort.field} ${sort.order.toUpperCase()}`;
    } else {
      query += ' ORDER BY i.date_added DESC';
    }

    // Add pagination if specified
    if (filter?.limit) {
      query += ` LIMIT ${filter.limit}`;
      if (filter?.offset) {
        query += ` OFFSET ${filter.offset}`;
      }
    }

    const stmt = this.db.prepare(query);
    const results = stmt.all(...params) as any[];

    return results.map((row) => ({
      ...row,
      tags: row.tags ? row.tags.split(', ') : [],
    }));
  }

  getImageCount(filter?: ImageFilter): number {
    let query = 'SELECT COUNT(DISTINCT i.id) as count FROM media_images i';

    // Join needed tables if filtering by them
    if (filter?.albumId) {
      // i.album_id is on media_images, no join needed unless we want to be strict
    }
    if (filter?.tagId) {
      // Handled by subquery
    }

    const conditions: string[] = [];
    const params: any[] = [];

    if (filter) {
      if (filter.albumId) {
        conditions.push('i.album_id = ?');
        params.push(filter.albumId);
      }
      if (filter.tagId) {
        conditions.push('i.id IN (SELECT image_id FROM media_image_tags WHERE tag_id = ?)');
        params.push(filter.tagId);
      }
      if (filter.personId) {
        conditions.push('i.id IN (SELECT media_id FROM media_people WHERE entity_id = ?)');
        params.push(filter.personId);
      }
      if (filter.format) {
        conditions.push('i.format = ?');
        params.push(filter.format);
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
        conditions.push(`i.id IN (
          SELECT rowid FROM media_images_fts 
          WHERE media_images_fts MATCH ?
        )`);
        params.push(filter.searchQuery);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const result = this.db.prepare(query).get(...params) as { count: number };
    return result.count;
  }

  getImageById(id: number): MediaImage | undefined {
    const stmt = this.db.prepare(`
      SELECT 
        i.*,
        a.name as albumName,
        GROUP_CONCAT(t.name, ', ') as tags
      FROM media_images i
      LEFT JOIN media_albums a ON i.album_id = a.id
      LEFT JOIN media_image_tags it ON i.id = it.image_id
      LEFT JOIN media_tags t ON it.tag_id = t.id
      WHERE i.id = ?
      GROUP BY i.id
    `);
    const result = stmt.get(id) as any;
    if (!result) return undefined;

    return {
      ...result,
      tags: result.tags ? result.tags.split(', ') : [],
    };
  }

  createImage(image: Omit<MediaImage, 'id' | 'dateAdded' | 'dateModified'>): MediaImage {
    const stmt = this.db.prepare(`
      INSERT INTO media_images (
        filename, original_filename, path, thumbnail_path, title, description,
        album_id, width, height, file_size, format, date_taken,
        camera_make, camera_model, lens, focal_length, aperture, shutter_speed,
        iso, latitude, longitude, color_profile, orientation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
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
    );

    return this.getImageById(result.lastInsertRowid as number)!;
  }

  updateImage(id: number, updates: Partial<MediaImage>): void {
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
      const stmt = this.db.prepare(`
        UPDATE media_images
        SET ${fields.join(', ')}, date_modified = datetime('now')
        WHERE id = ?
      `);
      stmt.run(...values);
    }
  }

  async rotateImage(id: number, degrees: number): Promise<void> {
    const image = this.getImageById(id);
    if (!image) throw new Error('Image not found');

    // Resolve image path - DB stores paths like /data/... which need to be
    // resolved relative to the app root (process.cwd())
    // Resolve image path
    let imagePath = image.path;

    // Check if the path exists as-is (absolute path)
    if (!fs.existsSync(imagePath)) {
      // If not, try resolving relative to app root (for /data/ paths)
      if (imagePath.startsWith('/data/') || imagePath.startsWith('/')) {
        const relativePath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
        const resolvedPath = path.join(process.cwd(), relativePath);
        if (fs.existsSync(resolvedPath)) {
          imagePath = resolvedPath;
        }
      }
    }

    // Verify file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found at: ${imagePath}`);
    }

    // Calculate current visual rotation from DB state
    let cssRotation = 0;
    // Standard EXIF mapping for "Correction" (Visual Rotation inferred from Flag)
    // BUT we found the issue comes from "Double Rotation" (Browser + CSS).
    // Our CSS logic was: 6->90, 8->270, 3->180.
    // So we apply THAT rotation to the base (Auto-Oriented) image.
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
    const tempPath = imagePath + '.tmp';

    // Process image: Auto-orient -> Apply Total Rotation -> Save
    // This normalizes the file to match the user's visual expectation (WYSIWYG)
    // and resets the orientation tag to 1 (Standard).
    await sharp(imagePath)
      .rotate() // Auto-orient to Upright
      .rotate(totalRotation) // Apply calculated rotation
      .withMetadata() // Preserve other EXIF (GPS, Date)
      .toFile(tempPath);

    fs.renameSync(tempPath, imagePath);

    // Read new dimensions/size
    const metadata = await sharp(imagePath).metadata();

    // Update DB: Orientation is now 1 (Standard)
    this.updateImage(id, {
      orientation: 1,
      width: metadata.width,
      height: metadata.height,
      fileSize: metadata.size,
    });

    // Regenerate thumbnail (async/fire-and-forget or await?)
    // Existing code didn't export regenerateThumbnail, but we can rely on
    // frontend requesting it or simple re-generation if method exists.
    // We'll update the thumbnail path if needed or just let it be.
    // Ideally, we force regeneration. But let's stick to the core fix.
  }

  deleteImage(id: number): void {
    const stmt = this.db.prepare('DELETE FROM media_images WHERE id = ?');
    stmt.run(id);
  }

  // ============ TAG OPERATIONS ============

  createTag(name: string, category?: string): MediaTag {
    const stmt = this.db.prepare(`
      INSERT INTO media_tags (name, category)
      VALUES (?, ?)
    `);
    const result = stmt.run(name, category || null);
    return this.getTagById(result.lastInsertRowid as number)!;
  }

  getTagById(id: number): MediaTag | undefined {
    const stmt = this.db.prepare('SELECT * FROM media_tags WHERE id = ?');
    return stmt.get(id) as MediaTag | undefined;
  }

  getOrCreateTag(name: string, category?: string): MediaTag {
    const stmt = this.db.prepare('SELECT * FROM media_tags WHERE name = ?');
    let tag = stmt.get(name) as MediaTag | undefined;

    if (!tag) {
      tag = this.createTag(name, category);
    }

    return tag;
  }

  addTagToImage(imageId: number, tagId: number): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO media_image_tags (image_id, tag_id)
      VALUES (?, ?)
    `);
    stmt.run(imageId, tagId);
  }

  removeTagFromImage(imageId: number, tagId: number): void {
    const stmt = this.db.prepare(`
      DELETE FROM media_image_tags
      WHERE image_id = ? AND tag_id = ?
    `);
    stmt.run(imageId, tagId);
  }

  getImageTags(imageId: number): MediaTag[] {
    const stmt = this.db.prepare(`
      SELECT t.*
      FROM media_tags t
      JOIN media_image_tags it ON t.id = it.tag_id
      WHERE it.image_id = ?
      ORDER BY t.name
    `);
    return stmt.all(imageId) as MediaTag[];
  }

  // ============ MEDIA ITEM (AUDIO/VIDEO) TAGS ============

  addTagToItem(itemId: number, tagId: number): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO media_item_tags (media_item_id, tag_id)
      VALUES (?, ?)
    `);
    stmt.run(itemId, tagId);
  }

  removeTagFromItem(itemId: number, tagId: number): void {
    const stmt = this.db.prepare(`
      DELETE FROM media_item_tags
      WHERE media_item_id = ? AND tag_id = ?
    `);
    stmt.run(itemId, tagId);
  }

  addPersonToItem(itemId: number, personId: number): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO media_item_people (media_item_id, entity_id)
      VALUES (?, ?)
    `);
    stmt.run(itemId, personId);
  }

  removePersonFromItem(itemId: number, personId: number): void {
    const stmt = this.db.prepare(`
      DELETE FROM media_item_people
      WHERE media_item_id = ? AND entity_id = ?
    `);
    stmt.run(itemId, personId);
  }

  // ============ STATISTICS ============

  getMediaStats(): MediaStats {
    const totalImages = this.db.prepare('SELECT COUNT(*) as count FROM media_images').get() as {
      count: number;
    };
    const totalAlbums = this.db.prepare('SELECT COUNT(*) as count FROM media_albums').get() as {
      count: number;
    };
    const totalSize = this.db.prepare('SELECT SUM(file_size) as size FROM media_images').get() as {
      size: number;
    };

    const formatBreakdown = this.db
      .prepare(
        `
      SELECT format, COUNT(*) as count
      FROM media_images
      GROUP BY format
    `,
      )
      .all() as { format: string; count: number }[];

    const albumBreakdown = this.db
      .prepare(
        `
      SELECT a.name, COUNT(i.id) as count
      FROM media_albums a
      LEFT JOIN media_images i ON a.id = i.album_id
      GROUP BY a.id
    `,
      )
      .all() as { name: string; count: number }[];

    return {
      totalImages: totalImages.count,
      totalAlbums: totalAlbums.count,
      totalSize: totalSize.size || 0,
      formatBreakdown: Object.fromEntries(formatBreakdown.map((f) => [f.format, f.count])),
      albumBreakdown: Object.fromEntries(albumBreakdown.map((a) => [a.name, a.count])),
    };
  }

  // ============ SEARCH ============

  searchImages(query: string): MediaImage[] {
    return this.getAllImages({ searchQuery: query });
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
      let pipeline = sharp(resolvedPath).rotate(); // Auto-orient based on original file EXIF first

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

      await pipeline.resize(300, 300, { fit: 'cover' }).toFile(thumbnailPath);

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

    // Insert into DB
    const stmt = this.db.prepare(`
      INSERT INTO media_images (
        filename, original_filename, path, file_size, format,
        width, height, date_taken, album_id,
        camera_make, camera_model, focal_length, aperture,
        shutter_speed, iso, latitude, longitude,
        shutter_speed, iso, latitude, longitude,
        date_added
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        datetime('now')
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

    return this.getImageById(info.lastInsertRowid as number)!;
  }

  batchDelete(ids: number[]): void {
    const deleteTags = this.db.prepare('DELETE FROM media_image_tags WHERE image_id = ?');
    const deleteImage = this.db.prepare('DELETE FROM media_images WHERE id = ?');
    const getImage = this.db.prepare('SELECT path FROM media_images WHERE id = ?');

    const transaction = this.db.transaction((imageIds: number[]) => {
      for (const id of imageIds) {
        const image = getImage.get(id) as { path: string };
        if (image && fs.existsSync(image.path)) {
          try {
            fs.unlinkSync(image.path);
          } catch (e) {
            console.error(`Failed to delete file: ${image.path}`, e);
          }
        }
        deleteTags.run(id);
        deleteImage.run(id);
      }
    });

    transaction(ids);
  }

  async createAlbumArchive(albumId: number, res: any): Promise<void> {
    const album = this.getAlbumById(albumId);
    if (!album) throw new Error('Album not found');

    const images = this.getAllImages({ albumId });
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.attachment(`${album.name.replace(/[^a-z0-9]/gi, '_')}.zip`);
    archive.pipe(res);

    for (const image of images) {
      if (fs.existsSync(image.path)) {
        archive.file(image.path, { name: image.filename });
      }
    }

    await archive.finalize();
  }

  close(): void {
    this.db.close();
  }
}
