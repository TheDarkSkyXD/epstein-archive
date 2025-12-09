import { DocumentProcessor } from '../src/services/documentProcessor';

async function testForensicExtraction() {
  const processor = new DocumentProcessor();
  
  // Mock PDF Content with forensic artifacts
  const mockContent = `
    %PDF-1.7
    1 0 obj
    <<
      /Type /Catalog
      /Pages 2 0 R
      /Metadata 3 0 R
    >>
    endobj
    
    % Technical Metadata
    /Producer (Adobe Acrobat Pro 11.0.0)
    /Creator (Microsoft Word 2013)
    /CreationDate (D:20190706120000-04'00')
    /ModDate (D:20190707143000-04'00')
    
    % Structure Artifacts
    /JavaScript (app.alert('Hello');)
    /Font << /F1 4 0 R >>
    /Font << /F2 5 0 R >>
    
    % Content for Linguistics
    The quick brown fox jumps over the lazy dog. This is a simple sentence.
    The flight to the island was long and tiring.
    We need to keep this confidential and sealed.
    Epstein and Maxwell were present at the meeting.
    The pilot confirmed the flight logs were accurate.
    This is a very bad, negative, and poor situation.
    
    % Entities
    Jeffrey Epstein
    Ghislaine Maxwell
    New York
    Little St James
  `;
  
  console.log('Running Forensic Extraction Test...');
  
  const doc = await processor.processDocument('test_forensic.pdf', mockContent);
  
  console.log('\n--- Extracted Forensic Metadata ---');
  console.log(JSON.stringify(doc.metadata, null, 2));
  
  console.log('\n--- Verification ---');
  
  // Technical
  const tech = doc.metadata.technical;
  console.log('Technical - Producer:', tech?.producer === 'Adobe Acrobat Pro 11.0.0' ? '✅' : '❌');
  console.log('Technical - Creator:', tech?.creator === 'Microsoft Word 2013' ? '✅' : '❌');
  console.log('Technical - CreationDate:', tech?.createDate?.includes('2019-07-06') ? '✅' : '❌');
  
  // Structure
  const struct = doc.metadata.structure;
  console.log('Structure - Has JS:', struct?.hasJavascript === true ? '✅' : '❌');
  console.log('Structure - Font Count:', struct?.fontCount === 2 ? '✅' : '❌');
  console.log('Structure - PDF Version:', struct?.pdfVersion === '1.7' ? '✅' : '❌');
  
  // Linguistics
  const ling = doc.metadata.linguistics;
  console.log('Linguistics - Word Count:', ling?.wordCount && ling.wordCount > 0 ? '✅' : '❌');
  console.log('Linguistics - Sentiment:', ling?.sentiment ? '✅' : '❌');
  
  // Temporal
  const temp = doc.metadata.temporal;
  console.log('Temporal - Business Hours:', temp?.isBusinessHours !== undefined ? '✅' : '❌');
  
  // Network
  const net = doc.metadata.network;
  console.log('Network - Entity Density:', net?.entityDensity && net.entityDensity > 0 ? '✅' : '❌');
  console.log('Network - Risk Score:', net?.riskScore && net.riskScore > 0 ? '✅' : '❌');
}

testForensicExtraction().catch(console.error);
