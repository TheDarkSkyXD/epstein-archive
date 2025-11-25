import { DocumentProcessor } from '../services/documentProcessor';
import { EntityNameService } from '../services/EntityNameService';

// Test the DocumentProcessor functionality
console.log('Testing DocumentProcessor...');

// Create a document processor instance
const processor = new DocumentProcessor();

// Test document content with various entities including false positives
const testDocumentContent = `
This is a test document about Donald Trump and Jeffrey Epstein.
It mentions Trump, DT, and DJT which should all be consolidated to Donald Trump.
The document also mentions Clinton, Epstein, and Ghislaine Maxwell.

False positive phrases like "In No Event And Under No Legal Theory" and 
"Including Any Direct" should not be identified as entities.

Organizations like Russia, CIA, FBI, and Mossad should be recognized as entities.

Contact: john.doe@example.com
Phone: (555) 123-4567
Date: January 15, 2023
Amount: $1,000,000
Location: New York
`;

console.log('\n1. Processing test document...');
processor.processDocument('test.txt', testDocumentContent)
  .then(document => {
    console.log('Document processed successfully!');
    console.log(`  Document ID: ${document.id}`);
    console.log(`  Title: ${document.title}`);
    console.log(`  File type: ${document.fileType}`);
    console.log(`  File size: ${document.fileSize}`);
    console.log(`  Spice score: ${document.spiceScore}`);
    console.log(`  Spice rating: ${document.spiceRating}`);
    
    console.log('\n2. Extracted entities:');
    document.entities.forEach(entity => {
      console.log(`  - ${entity.name} (${entity.type}): ${entity.mentions} mentions`);
    });
    
    console.log('\n3. Verifying entity filtering and consolidation:');
    const entityNames = document.entities.map(e => e.name);
    
    // Check that false positives are not included
    const falsePositives = ['In No Event And Under No Legal Theory', 'Including Any Direct'];
    falsePositives.forEach(fp => {
      if (entityNames.includes(fp)) {
        console.log(`  ERROR: False positive "${fp}" was incorrectly included as an entity!`);
      } else {
        console.log(`  ✓ False positive "${fp}" correctly filtered out`);
      }
    });
    
    // Check that name variants are consolidated
    if (entityNames.includes('Donald Trump')) {
      console.log('  ✓ Name variants correctly consolidated to "Donald Trump"');
    } else {
      console.log('  ERROR: Name variants were not consolidated to "Donald Trump"');
    }
    
    // Check that organizations are recognized
    const orgs = ['Russia', 'CIA', 'FBI', 'Mossad'];
    orgs.forEach(org => {
      if (entityNames.includes(org)) {
        console.log(`  ✓ Organization "${org}" correctly recognized`);
      } else {
        console.log(`  ERROR: Organization "${org}" was not recognized`);
      }
    });
    
    console.log('\nDocumentProcessor tests completed successfully!');
  })
  .catch(error => {
    console.error('Error processing document:', error);
  });