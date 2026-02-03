import { getDb } from '../server/db/connection.js';
import { randomUUID } from 'crypto';
import { basename, extname } from 'path';

export interface FileAsset {
  id: number;
  asset_uuid: string;
  storage_path: string;
  sha256: string;
  mime_type: string;
  file_size: number;
}

export const AssetService = {
  /**
   * Register a file as an asset.
   */
  async registerAsset(data: {
    storagePath: string;
    sha256: string;
    mimeType: string;
    fileSize: number;
    sourceCollection?: string;
    isOriginal?: boolean;
    originalAssetId?: number;
    derivativeKind?: string;
    derivativeParamsJson?: string;
    phash?: string;
  }): Promise<number> {
    const db = getDb();
    const assetUuid = randomUUID();
    const fileName = basename(data.storagePath);
    const fileType = extname(data.storagePath).replace('.', '').toUpperCase();

    const result = db
      .prepare(
        `
      INSERT INTO file_assets (
        asset_uuid, original_asset_id, storage_path, file_name, 
        mime_type, file_type, file_size, sha256, 
        source_collection, is_original, is_derivative, 
        derivative_kind, derivative_params_json, phash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        assetUuid,
        data.originalAssetId || null,
        data.storagePath,
        fileName,
        data.mimeType,
        fileType,
        data.fileSize,
        data.sha256,
        data.sourceCollection || null,
        data.isOriginal !== false ? 1 : 0,
        data.isOriginal === false ? 1 : 0,
        data.derivativeKind || null,
        data.derivativeParamsJson || null,
        data.phash || null,
      );

    return result.lastInsertRowid as number;
  },

  /**
   * Link an asset to a document.
   */
  async linkToDocument(
    documentId: number,
    assetId: number,
    role: string = 'primary',
  ): Promise<void> {
    const db = getDb();
    db.prepare(
      `
      INSERT OR IGNORE INTO document_assets (document_id, asset_id, role)
      VALUES (?, ?, ?)
    `,
    ).run(documentId, assetId, role);
  },

  /**
   * Link an asset to a media item.
   */
  async linkToMedia(mediaId: number, assetId: number, role: string = 'primary'): Promise<void> {
    const db = getDb();
    db.prepare(
      `
      INSERT OR IGNORE INTO media_assets (media_id, asset_id, role)
      VALUES (?, ?, ?)
    `,
    ).run(mediaId, assetId, role);
  },

  /**
   * Find asset by SHA-256.
   */
  async findBySha256(sha256: string): Promise<number | null> {
    const db = getDb();
    const row = db.prepare('SELECT id FROM file_assets WHERE sha256 = ?').get(sha256) as
      | { id: number }
      | undefined;
    return row ? row.id : null;
  },
};
