import { OptimizedDataService } from './src/services/optimizedDataLoader.js';

async function testDataService() {
  console.log('Testing OptimizedDataService...');
  
  try {
    const service = new OptimizedDataService();
    console.log('Service created');
    
    await service.initialize();
    console.log('Service initialized');
    
    const result = await service.getPaginatedData({}, 1);
    console.log('First page result:', {
      dataLength: result.data.length,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      pageSize: result.pageSize
    });
    
    // Test a few specific records
    if (result.data.length > 0) {
      console.log('First record:', result.data[0]);
      console.log('Last record:', result.data[result.data.length - 1]);
    }
    
  } catch (error) {
    console.error('Error testing data service:', error);
  }
}

testDataService();