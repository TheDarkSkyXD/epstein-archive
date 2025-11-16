const { DocumentProcessor } = require('./dist/services/documentProcessor.js');
const { sampleDocuments } = require('./dist/data/sampleDocuments.js');

async function testDocumentProcessing() {
  console.log('🧪 Testing Document Processing System...\n');
  
  const processor = new DocumentProcessor();
  
  // Test 1: Process sample documents
  console.log('📄 Processing sample documents...');
  const documents = await processor.processDocuments(sampleDocuments);
  console.log(`✅ Processed ${documents.length} documents`);
  
  // Test 2: Verify spice ratings
  console.log('\n🌶️ Testing spice ratings...');
  const highSpiceDocs = documents.filter(doc => doc.spiceRating >= 3);
  console.log(`✅ Found ${highSpiceDocs.length} documents with high spice rating (3+)`);
  
  // Test 3: Test search functionality
  console.log('\n🔍 Testing search functionality...');
  const searchResults = processor.searchDocuments('trump epstein', {
    limit: 5,
    includeSnippets: true
  });
  console.log(`✅ Search returned ${searchResults.length} results`);
  
  // Test 4: Test filtering
  console.log('\n🔎 Testing document filtering...');
  const filteredDocs = processor.filterDocuments({
    spiceLevel: 2,
    fileTypes: ['email'],
    dateRange: { start: new Date('2000-01-01'), end: new Date('2025-01-01') }
  });
  console.log(`✅ Filter returned ${filteredDocs.length} documents`);
  
  // Test 5: Test entity extraction
  console.log('\n👥 Testing entity extraction...');
  const entities = processor.getAllEntities();
  console.log(`✅ Extracted ${entities.length} unique entities`);
  
  // Test 6: Test document relationships
  console.log('\n🔗 Testing document relationships...');
  const relatedDocs = processor.findRelatedDocuments(documents[0].id);
  console.log(`✅ Found ${relatedDocs.length} related documents for first document`);
  
  console.log('\n🎉 All tests completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Total documents: ${documents.length}`);
  console.log(`- High spice documents (3+): ${highSpiceDocs.length}`);
  console.log(`- Total entities: ${entities.length}`);
  console.log(`- Search results for 'trump epstein': ${searchResults.length}`);
  console.log(`- Filtered documents: ${filteredDocs.length}`);
}

// Run the test
testDocumentProcessing().catch(console.error);