import { getDb } from './connection.js';

export const bulkOperationsRepository = {
  // Bulk insert entities with prepared statements for performance
  bulkInsertEntities: async (entities: any[]) => {
    const db = getDb();
    const insertEntity = db.prepare(`
      INSERT INTO entities (full_name, primary_role, secondary_roles, likelihood_level, mentions, 
                           current_status, connections_summary, red_flag_rating, red_flag_score)
      VALUES (@full_name, @primary_role, @secondary_roles, @likelihood_level, @mentions,
              @current_status, @connections_summary, @red_flag_rating, @red_flag_score)
    `);

    const insertDocument = db.prepare(`
      INSERT INTO documents (file_name, file_path, file_type, file_size, date_created, content, metadata_json, word_count, red_flag_rating, content_hash)
      VALUES (@file_name, @file_path, @file_type, @file_size, @date_created, @content, @metadata_json, @word_count, @red_flag_rating, @content_hash)
    `);

    const getEvidenceTypeId = db.prepare('SELECT id FROM evidence_types WHERE type_name = ?');

    const insertEntityEvidence = db.prepare(`
      INSERT OR IGNORE INTO entity_evidence_types (entity_id, evidence_type_id)
      VALUES (@entity_id, @evidence_type_id)
    `);

    const transaction = db.transaction((entitiesData: any[]) => {
      for (const entityData of entitiesData) {
        const entityResult = insertEntity.run({
          full_name: entityData.fullName,
          primary_role: entityData.primaryRole,
          secondary_roles: entityData.secondaryRoles ? entityData.secondaryRoles.join(', ') : null,
          likelihood_level: entityData.likelihoodLevel,
          mentions: entityData.mentions || 0,
          current_status: entityData.currentStatus,
          connections_summary: entityData.connectionsSummary,
          red_flag_rating: entityData.redFlagRating,
          red_flag_score: entityData.redFlagScore || 0,
        });

        const entityId = entityResult.lastInsertRowid;

        // Insert evidence types
        if (entityData.evidenceTypes && Array.isArray(entityData.evidenceTypes)) {
          for (const typeName of entityData.evidenceTypes) {
            const typeRow = getEvidenceTypeId.get(typeName) as { id: number } | undefined;
            if (typeRow) {
              insertEntityEvidence.run({
                entity_id: entityId,
                evidence_type_id: typeRow.id,
              });
            }
          }
        }

        // Insert documents and mentions
        if (entityData.fileReferences && entityData.fileReferences.length > 0) {
          for (const fileRef of entityData.fileReferences) {
            // Check if document already exists to avoid duplicates
            // We use a simple check here. For high performance with millions of rows,
            // we might want to cache recent document IDs or use INSERT OR IGNORE with a returning clause if supported.
            // Since we added a UNIQUE index on file_path, we can use that.
            // TODO: Link mentions to documents - see UNUSED_VARIABLES_RECOMMENDATIONS.md
            let _documentId: number | bigint;

            const existingDoc = db
              .prepare('SELECT id FROM documents WHERE file_path = ?')
              .get(fileRef.filePath) as { id: number } | undefined;

            if (existingDoc) {
              _documentId = existingDoc.id;
            } else {
              const docResult = insertDocument.run({
                file_name: fileRef.fileName,
                file_path: fileRef.filePath || fileRef.path,
                file_type: fileRef.fileType,
                file_size: fileRef.fileSize || 0,
                date_created: fileRef.dateCreated || new Date().toISOString(),
                content: fileRef.content || '',
                metadata_json: fileRef.metadataJson || '{}',
                word_count: fileRef.wordCount || 0,
                red_flag_rating: fileRef.redFlagRating || 0,
                content_hash: fileRef.md5Hash || '',
              });
              _documentId = docResult.lastInsertRowid as number;
            }

            // Insert mention
          }
        }
      }
    });

    transaction(entities);
  },
};
