import { databaseService } from '../services/DatabaseService';

async function populateEvidenceTypes() {
  console.log('Populating evidence_types table...');
  
  try {
    // Get the database instance
    // Insert common evidence types
    databaseService.exec(`
      INSERT OR IGNORE INTO evidence_types (type_name, description) VALUES
      ('financial', 'Financial records and transactions'),
      ('document', 'Official documents and reports'),
      ('testimony', 'Witness testimonies and depositions'),
      ('legal', 'Legal documents and court filings'),
      ('flight_log', 'Flight logs and travel records'),
      ('photo', 'Photographic evidence'),
      ('email', 'Email communications'),
      ('contract', 'Contracts and agreements'),
      ('bank_record', 'Banking and financial records'),
      ('property_record', 'Property and real estate records');
    `);
    
    console.log('Evidence types populated successfully!');
    
    // Verify the population
    const evidenceTypes = databaseService.prepare('SELECT * FROM evidence_types').all();
    console.log('Evidence types in database:');
    evidenceTypes.forEach((type: any) => {
      console.log(`- ${type.type_name}: ${type.description}`);
    });
    
  } catch (error) {
    console.error('Failed to populate evidence_types table:', error);
    process.exit(1);
  }
}

// Run the population script
populateEvidenceTypes().then(() => {
  console.log('Evidence types population completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('Evidence types population failed:', error);
  process.exit(1);
});