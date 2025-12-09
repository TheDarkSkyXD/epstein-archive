import Database from 'better-sqlite3';
import { DocumentProcessor } from '../src/services/documentProcessor';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(dbPath);
const processor = new DocumentProcessor();

async function reindexForensics() {
  console.log('🚀 Starting Forensic Re-indexing...');

  // 1. Fetch all documents
  const documents = db.prepare('SELECT id, file_path, content, metadata_json FROM documents').all();
  console.log(`📄 Found ${documents.length} documents to process.`);

  let updatedCount = 0;
  let errorCount = 0;

  // 2. Process each document
  for (const doc of documents) {
    try {
      const currentMetadata = JSON.parse(doc.metadata_json || '{}');
      
      // Re-process to get new forensic data
      // We use the processor's internal methods via a temporary document object
      // effectively simulating a full process but just merging the new parts
      
      // Note: In a real scenario we might want to expose these methods publicly or static,
      // but for now we can re-process the document fully to get the fresh object
      const processedDoc = await processor.processDocument(doc.file_path, doc.content);
      
      // Merge new forensic metadata into existing
      const newMetadata = {
        ...currentMetadata,
        technical: processedDoc.metadata.technical,
        structure: processedDoc.metadata.structure,
        linguistics: processedDoc.metadata.linguistics,
        temporal: processedDoc.metadata.temporal,
        network: processedDoc.metadata.network
      };

      // 3. Update Database
      db.prepare('UPDATE documents SET metadata_json = ? WHERE id = ?')
        .run(JSON.stringify(newMetadata), doc.id);

      updatedCount++;
      if (updatedCount % 100 === 0) {
        process.stdout.write(`\r✅ Processed ${updatedCount}/${documents.length} documents...`);
      }
    } catch (error) {
      console.error(`\n❌ Error processing document ${doc.id}:`, error);
      errorCount++;
    }
  }

  console.log(`\n\n✨ Re-indexing Complete!`);
  console.log(`✅ Successfully updated: ${updatedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
}

reindexForensics().catch(console.error);
