import { InvestigationService } from '../src/services/InvestigationService';
import Database from 'better-sqlite3';
import { join } from 'path';

/**
 * Test script for Investigation API
 * Tests CRUD operations on investigations table
 */

const DB_PATH = join(process.cwd(), 'epstein-archive.db');

async function testInvestigationAPI() {
  console.log('🧪 Testing Investigation API...\n');
  
  const db = new Database(DB_PATH);
  const service = new InvestigationService(db);
  
  try {
    // Test 1: Create investigation
    console.log('1️⃣ Creating test investigation...');
    const created = await service.createInvestigation({
      title: 'Test Investigation - API Verification',
      description: 'This is a test investigation to verify the API works correctly',
      ownerId: 'system',
      scope: 'Testing Phase 2 implementation',
      collaboratorIds: ['user1', 'user2']
    });
    console.log('✅ Created:', created);
    console.log('   UUID:', created.uuid);
    console.log('   ID:', created.id);
    
    // Test 2: Get by ID
    console.log('\n2️⃣ Fetching investigation by ID...');
    const fetched = await service.getInvestigationById(created.id);
    console.log('✅ Fetched:', fetched?.title);
    
    // Test 3: Update investigation
    console.log('\n3️⃣ Updating investigation...');
    const updated = await service.updateInvestigation(created.id, {
      status: 'in_review',
      description: 'Updated description for testing'
    });
    console.log('✅ Updated status:', updated?.status);
    console.log('   Updated description:', updated?.description);
    
    // Test 4: List investigations
    console.log('\n4️⃣ Listing all investigations...');
    const list = await service.getInvestigations({ limit: 5 });
    console.log('✅ Found', list.total, 'investigations');
    console.log('   Showing first', list.data.length);
    list.data.forEach((inv, idx) => {
      console.log(`   ${idx + 1}. ${inv.title} (${inv.status})`);
    });
    
    // Test 5: Filter by status
    console.log('\n5️⃣ Filtering by status=in_review...');
    const filtered = await service.getInvestigations({ status: 'in_review' });
    console.log('✅ Found', filtered.total, 'investigations in review');
    
    // Test 6: Delete investigation
    console.log('\n6️⃣ Deleting test investigation...');
    const deleted = await service.deleteInvestigation(created.id);
    console.log('✅ Deleted:', deleted);
    
    // Verify deletion
    const shouldBeNull = await service.getInvestigationById(created.id);
    console.log('   Verification:', shouldBeNull === null ? 'Successfully deleted' : 'ERROR: Still exists!');
    
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run tests
testInvestigationAPI();
