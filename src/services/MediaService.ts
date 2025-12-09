import Database from 'better-sqlite3';
import { MediaImage, Album, MediaTag, ImageFilter, ImageSort, MediaStats } from '../types/media.types';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
// @ts-expect-error exif-parser has no TypeScript types available
import exifParser from 'exif-parser';
import archiver from 'archiver';

export class MediaService {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
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

    query += ' GROUP BY i.id';

    if (sort && sort.field && sort.order) {
      query += ` ORDER BY i.${sort.field} ${sort.order.toUpperCase()}`;
    } else {
      query += ' ORDER BY i.date_added DESC';
    }

    const stmt = this.db.prepare(query);
    const results = stmt.all(...params) as any[];
    
    return results.map(row => ({
      ...row,
      tags: row.tags ? row.tags.split(', ') : []
    }));
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
      tags: result.tags ? result.tags.split(', ') : []
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
      image.orientation || 1
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
      thumbnailPath: 'thumbnail_path'
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

  deleteImage(id: number): void {
    const stmt = this.db.prepare('DELETE FROM media_images WHERE id = ?');
    stmt.run(id);
  }

  // ============ TAG OPERATIONS ============

  getAllTags(): MediaTag[] {
    const stmt = this.db.prepare('SELECT * FROM media_tags ORDER BY name');
    return stmt.all() as MediaTag[];
  }

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

  // ============ STATISTICS ============

  getMediaStats(): MediaStats {
    const totalImages = this.db.prepare('SELECT COUNT(*) as count FROM media_images').get() as { count: number };
    const totalAlbums = this.db.prepare('SELECT COUNT(*) as count FROM media_albums').get() as { count: number };
    const totalSize = this.db.prepare('SELECT SUM(file_size) as size FROM media_images').get() as { size: number };
    
    const formatBreakdown = this.db.prepare(`
      SELECT format, COUNT(*) as count
      FROM media_images
      GROUP BY format
    `).all() as { format: string; count: number }[];

    const albumBreakdown = this.db.prepare(`
      SELECT a.name, COUNT(i.id) as count
      FROM media_albums a
      LEFT JOIN media_images i ON a.id = i.album_id
      GROUP BY a.id
    `).all() as { name: string; count: number }[];

    return {
      totalImages: totalImages.count,
      totalAlbums: totalAlbums.count,
      totalSize: totalSize.size || 0,
      formatBreakdown: Object.fromEntries(formatBreakdown.map(f => [f.format, f.count])),
      albumBreakdown: Object.fromEntries(albumBreakdown.map(a => [a.name, a.count]))
    };
  }

  // ============ SEARCH ============

  searchImages(query: string): MediaImage[] {
    return this.getAllImages({ searchQuery: query });
  }

  // ============ ADVANCED OPERATIONS ============

  async generateThumbnail(imagePath: string, outputDir: string): Promise<string> {
    const filename = path.basename(imagePath);
    const thumbnailPath = path.join(outputDir, `thumb_${filename}`);

    if (fs.existsSync(thumbnailPath)) {
      return thumbnailPath;
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
      await sharp(imagePath)
        .resize(300, 300, { fit: 'cover' })
        .toFile(thumbnailPath);
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
        date_added, date_modified
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
      tags.GPSLongitude
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
