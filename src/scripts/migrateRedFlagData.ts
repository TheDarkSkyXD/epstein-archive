import { databaseService } from '../services/DatabaseService';

async function migrateRedFlagData() {
  try {
    console.log('🔄 Starting Red Flag Index data migration...');

    // Database is initialized automatically when databaseService is imported
    const db = (databaseService as any).db;

    // Add new red flag columns if they don't exist
    console.log('📊 Adding Red Flag Index columns...');

    const addColumnsSQL = `
      ALTER TABLE entities ADD COLUMN red_flag_rating INTEGER CHECK(red_flag_rating >= 0 AND red_flag_rating <= 5);
      ALTER TABLE entities ADD COLUMN red_flag_score INTEGER DEFAULT 0;
      ALTER TABLE entities ADD COLUMN red_flag_indicators TEXT;
      ALTER TABLE entities ADD COLUMN red_flag_description TEXT;
      ALTER TABLE entities ADD COLUMN red_flag_passages TEXT;
    `;

    try {
      db.exec(addColumnsSQL);
      console.log('✅ Added Red Flag Index columns');
    } catch (error) {
      console.log('⚠️  Columns may already exist, continuing...');
    }

    // Migrate existing spice data to red flag data
    console.log('🔄 Migrating spice data to Red Flag Index...');

    const migrateDataSQL = `
      UPDATE entities SET
        red_flag_rating = spice_rating,
        red_flag_score = spice_score,
        red_flag_indicators = CASE 
          WHEN spice_rating = 0 THEN '⚪'
          WHEN spice_rating = 1 THEN '🟡'
          WHEN spice_rating = 2 THEN '🟠'
          WHEN spice_rating = 3 THEN '🔴'
          WHEN spice_rating = 4 THEN '🟣'
          WHEN spice_rating = 5 THEN '⚫'
          ELSE '⚪'
        END,
        red_flag_description = CASE 
          WHEN spice_rating = 0 THEN 'No Red Flags'
          WHEN spice_rating = 1 THEN 'Minor Concerns'
          WHEN spice_rating = 2 THEN 'Moderate Red Flags'
          WHEN spice_rating = 3 THEN 'Significant Red Flags'
          WHEN spice_rating = 4 THEN 'High Red Flags'
          WHEN spice_rating = 5 THEN 'Critical Red Flags'
          ELSE 'No Red Flags'
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE spice_rating IS NOT NULL;
    `;

    const result = db.exec(migrateDataSQL);
    console.log(`✅ Migrated ${result.changes} entities to Red Flag Index`);

    // Create indexes for red flag fields
    console.log('🔍 Creating Red Flag Index indexes...');

    const createIndexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_entities_red_flag_rating ON entities(red_flag_rating DESC);
      CREATE INDEX IF NOT EXISTS idx_entities_red_flag_score ON entities(red_flag_score DESC);
    `;

    db.exec(createIndexesSQL);
    console.log('✅ Created Red Flag Index indexes');

    // Update the entity_summary view to include red flag data
    console.log('👁️  Updating entity_summary view...');

    const updateViewSQL = `
      DROP VIEW IF EXISTS entity_summary;
      CREATE VIEW entity_summary AS
      SELECT 
        e.id,
        e.full_name,
        e.primary_role,
        e.likelihood_level,
        e.mentions,
        e.spice_rating,
        e.spice_score,
        e.red_flag_rating,
        e.red_flag_score,
        e.red_flag_indicators,
        e.red_flag_description,
        e.title,
        e.role,
        (
          SELECT GROUP_CONCAT(type_name)
          FROM (
            SELECT DISTINCT et.type_name AS type_name
            FROM entity_evidence_types eet2
            JOIN evidence_types et ON eet2.evidence_type_id = et.id
            WHERE eet2.entity_id = e.id
          ) AS distinct_types
        ) AS evidence_types,
        COUNT(DISTINCT em.document_id) as document_count,
        COUNT(DISTINCT em.id) as mention_count
      FROM entities e
      LEFT JOIN entity_mentions em ON e.id = em.entity_id
      GROUP BY e.id;
    `;

    db.exec(updateViewSQL);
    console.log('✅ Updated entity_summary view');

    // Verify the migration
    console.log('🔍 Verifying migration...');

    const verification = db
      .prepare(
        `
      SELECT 
        COUNT(*) as total_entities,
        COUNT(CASE WHEN red_flag_rating IS NOT NULL THEN 1 END) as entities_with_red_flags,
        COUNT(CASE WHEN red_flag_rating = 5 THEN 1 END) as critical_red_flags,
        AVG(red_flag_rating) as avg_red_flag_rating,
        MAX(red_flag_rating) as max_red_flag_rating
      FROM entities;
    `,
      )
      .get();

    console.log('📊 Migration verification:');
    console.log(`   Total entities: ${verification.total_entities}`);
    console.log(`   Entities with Red Flag Index: ${verification.entities_with_red_flags}`);
    console.log(`   Critical Red Flags (5): ${verification.critical_red_flags}`);
    console.log(
      `   Average Red Flag Rating: ${verification.avg_red_flag_rating?.toFixed(2) || 'N/A'}`,
    );
    console.log(`   Maximum Red Flag Rating: ${verification.max_red_flag_rating || 'N/A'}`);

    console.log('🎉 Red Flag Index data migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateRedFlagData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { migrateRedFlagData };
