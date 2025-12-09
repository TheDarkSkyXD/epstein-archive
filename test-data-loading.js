// Simple test to verify data loading
fetch('/data/people.json')
  .then(response => response.json())
  .then(data => {
    console.log('Raw data loaded:', data.length, 'people');
    console.log('First person:', data[0]);
    
    // Test the optimized data service
    import('./src/services/optimizedDataLoader.js').then(module => {
      const service = module.OptimizedDataService.getInstance();
      service.initialize().then(() => {
        console.log('Service initialized');
        return service.getPaginatedData({}, 1);
      }).then(result => {
        console.log('Paginated data:', result.data.length, 'people');
        console.log('First transformed person:', result.data[0]);
      });
    });
  })
  .catch(error => console.error('Error loading data:', error));