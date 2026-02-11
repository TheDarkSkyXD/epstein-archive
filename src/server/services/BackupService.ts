import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { getDb } from '../db/connection.js';

export interface BackupInfo {
  filename: string;
  size: number;
  createdAt: string;
}

export class BackupService {
  private static BACKUP_DIR = path.join(process.cwd(), 'backups');

  /**
   * Initialize backup directory
   */
  private static ensureBackupDir() {
    if (!fs.existsSync(this.BACKUP_DIR)) {
      fs.mkdirSync(this.BACKUP_DIR, { recursive: true });
    }
  }

  /**
   * Create a zero-downtime backup of the SQLite database
   */
  static async createBackup(): Promise<string> {
    this.ensureBackupDir();

    const db = getDb();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotPath = path.join(this.BACKUP_DIR, `snapshot-${timestamp}.db`);
    const zipPath = path.join(this.BACKUP_DIR, `backup-${timestamp}.zip`);

    console.log(`[BackupService] Starting backup to ${snapshotPath}...`);

    try {
      // 1. Snapshot using better-sqlite3 backup API (zero-downtime)
      await db.backup(snapshotPath);

      console.log(`[BackupService] Snapshot created. Compressing to ${zipPath}...`);

      // 2. Compress the snapshot
      await this.compressFile(snapshotPath, zipPath);

      // 3. Remove the temporary raw database file
      fs.unlinkSync(snapshotPath);

      // 4. Run rotation logic
      this.rotateBackups();

      console.log(`[BackupService] Backup completed: ${zipPath}`);
      return zipPath;
    } catch (error) {
      console.error('[BackupService] Backup failed:', error);
      if (fs.existsSync(snapshotPath)) fs.unlinkSync(snapshotPath);
      throw error;
    }
  }

  /**
   * List available backups
   */
  static listBackups(): BackupInfo[] {
    this.ensureBackupDir();

    return fs
      .readdirSync(this.BACKUP_DIR)
      .filter((file) => file.endsWith('.zip'))
      .map((file) => {
        const stats = fs.statSync(path.join(this.BACKUP_DIR, file));
        return {
          filename: file,
          size: stats.size,
          createdAt: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Zip a single file
   */
  private static compressFile(source: string, destination: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(destination);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));

      archive.pipe(output);
      archive.file(source, { name: path.basename(source) });
      archive.finalize();
    });
  }

  /**
   * Keep only the last 7 backups
   */
  private static rotateBackups() {
    const backups = this.listBackups();
    if (backups.length > 7) {
      const toDelete = backups.slice(7);
      for (const backup of toDelete) {
        try {
          fs.unlinkSync(path.join(this.BACKUP_DIR, backup.filename));
          console.log(`[BackupService] Rotated old backup: ${backup.filename}`);
        } catch (e) {
          console.error(`[BackupService] Failed to rotate backup ${backup.filename}:`, e);
        }
      }
    }
  }
}
