
import { DatabaseService } from './src/services/DatabaseService';

async function verifySearch() {
  const dbService = DatabaseService.getInstance();
  
  console.log('Verifying Relational Search...');

  try {
    // Test 1: Search for "Jeffrey Epstein" AND "Michael Wolff" with evidenceType="email"
    console.log('\nTest 1: Search "Jeffrey Epstein" AND "Michael Wolff" (Type: email)');
    const result1 = await dbService.search('"Jeffrey Epstein" AND "Michael Wolff"', 5, { evidenceType: 'email' });
    
    console.log(`Found ${result1.documents.length} documents.`);
    result1.documents.forEach(doc => {
      console.log(`- [${doc.evidenceType}] ${doc.fileName} (Rating: ${doc.redFlagRating})`);
    });

    if (result1.documents.length > 0 && result1.documents.every(d => d.evidenceType === 'email')) {
      console.log('✅ Test 1 Passed: Results found and all are emails.');
    } else if (result1.documents.length === 0) {
       console.log('⚠️ Test 1 Warning: No documents found. Verify data exists.');
    } else {
      console.log('❌ Test 1 Failed: Non-email documents found.');
    }

    // Test 2: Search for "Jeffrey Epstein" with redFlagBand="high"
    console.log('\nTest 2: Search "Jeffrey Epstein" (Band: high)');
    const result2 = await dbService.search('"Jeffrey Epstein"', 5, { redFlagBand: 'high' });
    
    console.log(`Found ${result2.documents.length} documents.`);
    result2.documents.forEach(doc => {
      console.log(`- [${doc.evidenceType}] ${doc.fileName} (Rating: ${doc.redFlagRating})`);
    });

    if (result2.documents.length > 0 && result2.documents.every(d => d.redFlagRating >= 4)) {
      console.log('✅ Test 2 Passed: Results found and all are high risk.');
    } else {
       console.log('❌ Test 2 Failed: Low risk documents found or no results.');
    }

  } catch (error) {
    console.error('Verification failed:', error);
  }
}

verifySearch();
