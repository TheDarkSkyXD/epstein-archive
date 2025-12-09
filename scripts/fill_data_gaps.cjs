#!/usr/bin/env node

/**
 * Data Enrichment Gap Filler
 * 
 * Objectives:
 * 1. Calculate Document Risk Scores (0% -> 100%)
 * 2. Backfill Entity Risk Scores (60% -> 100%)
 * 3. Backfill Relationship Risk Scores (43% -> 100%)
 */

const Database = require('better-sqlite3');
const fs = require('fs');

const DB_PATH = './epstein-archive.db';

class GapFiller {
  constructor() {
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.stats = {
      documentsScored: 0,
      entitiesScored: 0,
      relationshipsScored: 0
    };
  }

  async run() {
    console.log('🚀 Starting Data Enrichment Gap Filling...\n');
    
    try {
      // 1. Document Risk Scoring
      console.log('📄 Phase 1: Document Risk Scoring');
      await this.scoreDocuments();
      
      // 2. Entity Risk Backfill
      console.log('\n👤 Phase 2: Entity Risk Backfill');
      await this.backfillEntityRisks();
      
      // 3. Relationship Risk Scoring
      console.log('\n🔗 Phase 3: Relationship Risk Scoring');
      await this.scoreRelationships();
      
      console.log('\n✨ Gap Filling Complete!');
      this.printStats();
      
    } catch (error) {
      console.error('❌ Failed:', error);
      throw error;
    } finally {
      this.db.close();
    }
  }

  async scoreDocuments() {
    console.log('  Calculating risk scores for documents...');
    
    // Get all documents
    const documents = this.db.prepare(`
      SELECT id, content, file_name
      FROM documents
      WHERE evidentiary_risk_score IS NULL OR evidentiary_risk_score = 0
    `).all();
    
    console.log(`  Found ${documents.length} documents to score`);
    
    const update = this.db.prepare(`
      UPDATE documents 
      SET evidentiary_risk_score = ? 
      WHERE id = ?
    `);
    
    const highRiskKeywords = ['confidential', 'restricted', 'sealed', 'minor', 'abuse', 'trafficking', 'underage', 'victim'];
    const mediumRiskKeywords = ['flight', 'payment', 'transaction', 'meeting', 'island', 'massage', 'recruit'];
    
    let processed = 0;
    
    const updateTransaction = this.db.transaction((docs) => {
      for (const doc of docs) {
        let score = 10; // Base score
        const content = (doc.content || '') + ' ' + (doc.file_name || '');
        const lowerContent = content.toLowerCase();
        
        // Keyword analysis
        for (const word of highRiskKeywords) {
          if (lowerContent.includes(word)) score += 20;
        }
        for (const word of mediumRiskKeywords) {
          if (lowerContent.includes(word)) score += 10;
        }
        
        // Entity density impact (simplified check for speed)
        // In a full system, we'd join with entity_mentions, but let's do a quick check
        // if we have high risk entities linked
        const highRiskMentions = this.db.prepare(`
          SELECT COUNT(*) as count 
          FROM entity_documents ed
          JOIN entities e ON ed.entity_id = e.id
          WHERE ed.document_id = ? AND e.red_flag_score > 50
        `).get(doc.id).count;
        
        score += (highRiskMentions * 5);
        
        // Cap at 100
        score = Math.min(100, score);
        
        update.run(score, doc.id);
        processed++;
      }
    });
    
    updateTransaction(documents);
    this.stats.documentsScored = processed;
    console.log(`  ✓ Scored ${processed} documents`);
  }

  async backfillEntityRisks() {
    console.log('  Backfilling missing entity risk scores...');
    
    const entities = this.db.prepare(`
      SELECT id, mentions
      FROM entities
      WHERE red_flag_score IS NULL OR red_flag_score = 0
    `).all();
    
    console.log(`  Found ${entities.length} entities to backfill`);
    
    const update = this.db.prepare(`
      UPDATE entities 
      SET red_flag_score = ?, red_flag_rating = ?
      WHERE id = ?
    `);
    
    const updateTransaction = this.db.transaction((ents) => {
      for (const ent of ents) {
        // Heuristic: Base 10 + (Mentions * 2), capped at 50
        // These are low-risk by default since they weren't flagged by the main system
        let score = 10 + ((ent.mentions || 0) * 2);
        score = Math.min(50, score);
        
        // Map score 0-50 to rating 1-5
        let rating = Math.max(1, Math.min(5, Math.ceil(score / 10)));
        
        update.run(score, rating, ent.id);
      }
    });
    
    updateTransaction(entities);
    this.stats.entitiesScored = entities.length;
    console.log(`  ✓ Backfilled ${entities.length} entities`);
  }

  async scoreRelationships() {
    console.log('  Calculating relationship risk scores...');
    
    // We can do this with a single SQL update for efficiency
    const result = this.db.prepare(`
      UPDATE entity_relationships
      SET risk_score = (
        SELECT MIN(100, (
          COALESCE(s.red_flag_score, 10) + 
          COALESCE(t.red_flag_score, 10)
        ) / 2)
        FROM entities s, entities t
        WHERE s.id = entity_relationships.source_id 
        AND t.id = entity_relationships.target_id
      )
      WHERE risk_score IS NULL OR risk_score = 0
    `).run();
    
    this.stats.relationshipsScored = result.changes;
    console.log(`  ✓ Scored ${result.changes} relationships`);
  }

  printStats() {
    console.log('\n📊 Gap Filling Statistics:');
    console.log(`  Documents Scored: ${this.stats.documentsScored.toLocaleString()}`);
    console.log(`  Entities Backfilled: ${this.stats.entitiesScored.toLocaleString()}`);
    console.log(`  Relationships Scored: ${this.stats.relationshipsScored.toLocaleString()}`);
  }
}

// Run
if (require.main === module) {
  const filler = new GapFiller();
  filler.run().catch(console.error);
}
