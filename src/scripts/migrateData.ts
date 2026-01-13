import { databaseService } from '../services/DatabaseService';
import { join } from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

interface RawPersonData {
  fullName: string;
  primaryRole?: string;
  secondaryRoles?: string[];
  likelihoodLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
  mentions?: number;
  currentStatus?: string;
  connectionsSummary?: string;
  spiceRating?: number;
  spiceScore?: number;
  fileReferences?: Array<{
    fileName: string;
    filePath: string;
    fileType: string;
    evidenceType: string;
    context?: string;
    mentionType?: string;
  }>;
}

export class DataMigrator {
  private static instance: DataMigrator;
  private readonly BATCH_SIZE = 1000; // Process 1000 records at a time

  private constructor() {}

  static getInstance(): DataMigrator {
    if (!DataMigrator.instance) {
      DataMigrator.instance = new DataMigrator();
    }
    return DataMigrator.instance;
  }

  /**
   * Migrate data from JSON files to SQLite database
   * Uses streaming for large files to avoid memory issues
   */
  async migrateFromJSON(filePath: string): Promise<void> {
    console.log(`Starting migration from ${filePath}`);
    const startTime = Date.now();

    try {
      // Check if file exists and get its size
      const fs = await import('fs');
      const fileStats = fs.statSync(filePath);
      console.log(`File size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);

      if (fileStats.size > 50 * 1024 * 1024) {
        // Files larger than 50MB
        await this.migrateLargeJSONFile(filePath);
      } else {
        await this.migrateSmallJSONFile(filePath);
      }

      const endTime = Date.now();
      console.log(`Migration completed in ${((endTime - startTime) / 1000).toFixed(2)} seconds`);

      // Show final statistics
      const finalStats = await databaseService.getStatistics();
      console.log('Final database statistics:');
      console.log(`- Total entities: ${finalStats.totalEntities.toLocaleString()}`);
      console.log(`- Total documents: ${finalStats.totalDocuments.toLocaleString()}`);
      console.log(`- Total mentions: ${finalStats.totalMentions.toLocaleString()}`);
      console.log(
        `- Database size: ${(databaseService.getDatabaseSize() / 1024 / 1024).toFixed(2)} MB`,
      );
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Handle small JSON files (< 50MB) - load entirely into memory
   */
  private async migrateSmallJSONFile(filePath: string): Promise<void> {
    console.log('Using small file migration strategy');

    const fs = await import('fs');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    const entities = Array.isArray(data) ? data : data.people || data.entities || [];
    console.log(`Found ${entities.length} entities to migrate`);

    await this.processEntitiesInBatches(entities);
  }

  /**
   * Handle large JSON files (>= 50MB) - use streaming to avoid memory issues
   */
  private async migrateLargeJSONFile(filePath: string): Promise<void> {
    console.log('Using large file streaming migration strategy');

    const readStream = createReadStream(filePath, { encoding: 'utf-8' });
    const rl = createInterface({ input: readStream });

    let buffer: string[] = [];
    let entityCount = 0;
    let isInArray = false;
    let currentEntity: string = '';
    let braceCount = 0;

    for await (const line of rl) {
      const trimmedLine = line.trim();

      // Detect start of JSON array
      if (trimmedLine === '[') {
        isInArray = true;
        continue;
      }

      // Detect end of JSON array
      if (trimmedLine === ']' && isInArray) {
        // Process any remaining entity
        if (currentEntity) {
          try {
            const entity = JSON.parse(currentEntity.replace(/,$/, ''));
            buffer.push(entity);
            entityCount++;

            if (buffer.length >= this.BATCH_SIZE) {
              await this.processEntityBatch(buffer);
              console.log(`Processed ${entityCount} entities...`);
              buffer = [];
            }
          } catch (error) {
            console.warn('Failed to parse entity:', error);
          }
        }
        break;
      }

      if (isInArray) {
        // Count braces to detect complete JSON objects
        for (const char of trimmedLine) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
        }

        currentEntity += line;

        // When brace count reaches 0, we have a complete JSON object
        if (braceCount === 0 && currentEntity.trim().startsWith('{')) {
          try {
            const entity = JSON.parse(currentEntity.replace(/,$/, ''));
            buffer.push(entity);
            entityCount++;

            if (buffer.length >= this.BATCH_SIZE) {
              await this.processEntityBatch(buffer);
              console.log(`Processed ${entityCount} entities...`);
              buffer = [];
            }
          } catch (error) {
            console.warn('Failed to parse entity:', error);
          }

          currentEntity = '';
        }
      }
    }

    // Process any remaining entities
    if (buffer.length > 0) {
      await this.processEntityBatch(buffer);
    }

    console.log(`Total entities processed: ${entityCount}`);
  }

  /**
   * Process entities in batches for optimal performance
   */
  private async processEntitiesInBatches(entities: any[]): Promise<void> {
    const totalBatches = Math.ceil(entities.length / this.BATCH_SIZE);
    console.log(`Processing ${entities.length} entities in ${totalBatches} batches`);

    for (let i = 0; i < totalBatches; i++) {
      const startIdx = i * this.BATCH_SIZE;
      const endIdx = Math.min(startIdx + this.BATCH_SIZE, entities.length);
      const batch = entities.slice(startIdx, endIdx);

      await this.processEntityBatch(batch);
      console.log(`Batch ${i + 1}/${totalBatches} completed (${startIdx + 1}-${endIdx})`);
    }
  }

  /**
   * Process a single batch of entities
   */
  private async processEntityBatch(batch: any[]): Promise<void> {
    const processedEntities = batch.map((rawEntity) => this.transformRawEntity(rawEntity));
    await databaseService.bulkInsertEntities(processedEntities);
  }

  /**
   * Transform raw entity data to database format
   */
  private transformRawEntity(rawEntity: any): RawPersonData {
    // Handle different possible input formats
    const entity = rawEntity._source || rawEntity;

    return {
      fullName: entity.fullName || entity.name || entity.FullName || '',
      primaryRole: entity.primaryRole || entity.PrimaryRole || entity.role || null,
      secondaryRoles: this.parseRoles(
        entity.secondaryRoles || entity.SecondaryRoles || entity.roles,
      ),
      likelihoodLevel: this.parseLikelihoodLevel(
        entity.likelihoodLevel || entity.LikelihoodLevel || entity.likelihood,
      ),
      mentions: this.parseNumber(entity.mentions || entity.Mentions || entity.mentionCount || 0),
      currentStatus: entity.currentStatus || entity.CurrentStatus || entity.status || null,
      connectionsSummary:
        entity.connectionsSummary || entity.ConnectionsSummary || entity.connections || null,
      spiceRating: this.calculateSpiceRating(entity),
      spiceScore: this.calculateSpiceScore(entity),
      fileReferences: this.parseFileReferences(
        entity.fileReferences || entity.FileReferences || entity.documents || entity.files,
      ),
    };
  }

  /**
   * Parse roles from various formats
   */
  private parseRoles(roles: any): string[] | undefined {
    if (!roles) return undefined;

    if (Array.isArray(roles)) {
      return roles.filter(Boolean);
    }

    if (typeof roles === 'string') {
      return roles
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);
    }

    return undefined;
  }

  /**
   * Parse likelihood level
   */
  private parseLikelihoodLevel(level: any): 'HIGH' | 'MEDIUM' | 'LOW' | undefined {
    if (!level) return undefined;

    const upperLevel = level.toString().toUpperCase();
    if (['HIGH', 'MEDIUM', 'LOW'].includes(upperLevel)) {
      return upperLevel as 'HIGH' | 'MEDIUM' | 'LOW';
    }

    return undefined;
  }

  /**
   * Parse number values safely
   */
  private parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Calculate spice rating based on mentions and likelihood level
   */
  private calculateSpiceRating(entity: any): number {
    const mentions = this.parseNumber(entity.mentions || entity.Mentions || 0);
    const likelihoodLevel = this.parseLikelihoodLevel(
      entity.likelihoodLevel || entity.LikelihoodLevel,
    );

    const baseSpice = mentions > 1000 ? 4 : mentions > 500 ? 3 : mentions > 100 ? 2 : 1;
    const likelihoodBonus = likelihoodLevel === 'HIGH' ? 1 : 0;

    return Math.min(5, baseSpice + likelihoodBonus);
  }

  /**
   * Calculate spice score based on mentions and connections
   */
  private calculateSpiceScore(entity: any): number {
    const mentions = this.parseNumber(entity.mentions || entity.Mentions || 0);
    const connections = entity.connectionsSummary || entity.ConnectionsSummary || '';
    const connectionCount = connections.split(',').length;

    return mentions + connectionCount * 10;
  }

  /**
   * Parse file references from various formats
   */
  private parseFileReferences(fileRefs: any): any[] {
    if (!fileRefs) return [];

    if (Array.isArray(fileRefs)) {
      return fileRefs.map((ref) => this.transformFileReference(ref)).filter(Boolean);
    }

    return [];
  }

  /**
   * Transform individual file reference
   */
  private transformFileReference(ref: any): any {
    if (!ref) return null;

    const fileRef = ref._source || ref;

    return {
      fileName: fileRef.fileName || fileRef.FileName || fileRef.name || 'Unknown',
      filePath: fileRef.filePath || fileRef.FilePath || fileRef.path || '',
      fileType: fileRef.fileType || fileRef.FileType || fileRef.type || 'unknown',
      evidenceType: fileRef.evidenceType || fileRef.EvidenceType || fileRef.evidence || 'general',
      context: fileRef.context || fileRef.Context || fileRef.snippet || '',
      mentionType: fileRef.mentionType || fileRef.MentionType || fileRef.type || 'mention',
    };
  }

  /**
   * Verify migration integrity
   */
  async verifyMigration(): Promise<{
    success: boolean;
    message: string;
    details: any;
  }> {
    try {
      const stats = await databaseService.getStatistics();

      if (stats.totalEntities === 0) {
        return {
          success: false,
          message: 'No entities found in database',
          details: stats,
        };
      }

      // Test random entity retrieval
      const randomId = Math.floor(Math.random() * stats.totalEntities) + 1;
      const randomEntity = await databaseService.getEntityById(randomId.toString());

      if (!randomEntity) {
        return {
          success: false,
          message: 'Failed to retrieve random entity',
          details: stats,
        };
      }

      // Test search functionality
      const searchResults = await databaseService.search('Epstein', 10);

      return {
        success: true,
        message: 'Migration verification successful',
        details: {
          stats,
          sampleEntity: randomEntity,
          searchResults: {
            entityCount: searchResults.entities.length,
            documentCount: searchResults.documents.length,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Verification failed: ${error instanceof Error ? error.message : String(error)}`,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * Clean up and optimize database after migration
   */
  async optimizeDatabase(): Promise<void> {
    console.log('Optimizing database...');

    try {
      // Run VACUUM to reclaim space and defragment
      console.log('Running VACUUM...');
      await databaseService['db'].exec('VACUUM');

      // Update statistics for query optimization
      console.log('Updating database statistics...');
      await databaseService['db'].exec('ANALYZE');

      console.log('Database optimization completed');
    } catch (error) {
      console.warn('Database optimization failed:', error);
      // Continue anyway - optimization is not critical
    }
  }
}

// CLI interface for running migration
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

if (import.meta.url === `file://${__filename}`) {
  const migrator = DataMigrator.getInstance();

  // Default to the people.json file
  const defaultPath = join(process.cwd(), 'public', 'data', 'people.json');
  const filePath = process.argv[2] || defaultPath;

  console.log(`Starting data migration from: ${filePath}`);

  migrator
    .migrateFromJSON(filePath)
    .then(async () => {
      console.log('Migration completed successfully');

      // Verify migration
      console.log('Verifying migration...');
      const verification = await migrator.verifyMigration();
      console.log('Verification result:', verification.message);

      if (verification.success) {
        // Optimize database
        await migrator.optimizeDatabase();
        console.log('All migration tasks completed successfully!');
      }

      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export const dataMigrator = DataMigrator.getInstance();
