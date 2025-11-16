import { DocumentProcessor } from '../services/documentProcessor';
import { sampleDocuments } from '../data/sampleDocuments';

describe('DocumentProcessor', () => {
  let processor: DocumentProcessor;

  beforeEach(() => {
    processor = new DocumentProcessor();
  });

  describe('Document Processing', () => {
    test('should process sample documents correctly', async () => {
      const documents = await processor.processDocumentBatch(
        sampleDocuments.map(doc => ({
          path: doc.filename,
          content: doc.content
        }))
      );

      expect(documents.length).toBeGreaterThan(0);
      
      documents.forEach(doc => {
        expect(doc).toHaveProperty('id');
        expect(doc).toHaveProperty('title');
        expect(doc).toHaveProperty('content');
        expect(doc).toHaveProperty('fileType');
        expect(doc).toHaveProperty('entities');
        expect(doc).toHaveProperty('spiceScore');
        expect(doc).toHaveProperty('spiceRating');
        expect(doc).toHaveProperty('spicePeppers');
        expect(doc).toHaveProperty('spiceDescription');
      });
    });

    test('should extract entities from documents', async () => {
      const documents = await processor.processDocumentBatch(
        sampleDocuments.map(doc => ({
          path: doc.filename,
          content: doc.content
        }))
      );

      const docWithEntities = documents.find(doc => doc.entities.length > 0);
      expect(docWithEntities).toBeDefined();
      
      if (docWithEntities) {
        expect(docWithEntities.entities.length).toBeGreaterThan(0);
        docWithEntities.entities.forEach(entity => {
          expect(entity).toHaveProperty('name');
          expect(entity).toHaveProperty('type');
          expect(entity).toHaveProperty('mentions');
          expect(entity).toHaveProperty('significance');
        });
      }
    });

    test('should calculate spice ratings correctly', async () => {
      const documents = await processor.processDocumentBatch(
        sampleDocuments.map(doc => ({
          path: doc.filename,
          content: doc.content
        }))
      );

      documents.forEach(doc => {
        expect(doc.spiceRating).toBeGreaterThanOrEqual(1);
        expect(doc.spiceRating).toBeLessThanOrEqual(5);
        expect(doc.spiceScore).toBeGreaterThanOrEqual(0);
        expect(doc.spicePeppers).toMatch(/🌶️/);
      });
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      await processor.processDocumentBatch(
        sampleDocuments.map(doc => ({
          path: doc.filename,
          content: doc.content
        }))
      );
    });

    test('should search documents by content', () => {
      const results = processor.searchDocuments('Epstein');
      expect(results.length).toBeGreaterThan(0);
      
      results.forEach(doc => {
        expect(doc.content.toLowerCase()).toContain('epstein');
      });
    });

    test('should search documents by entity names', () => {
      const results = processor.searchDocuments('Prince Andrew');
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    test('should search documents by title', () => {
      const results = processor.searchDocuments('Meeting');
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    test('should filter search results', () => {
      const results = processor.searchDocuments('Epstein', {
        fileType: ['email'],
        spiceLevel: { min: 2, max: 5 }
      });
      
      results.forEach(doc => {
        expect(doc.fileType).toBe('email');
        expect(doc.spiceRating).toBeGreaterThanOrEqual(2);
        expect(doc.spiceRating).toBeLessThanOrEqual(5);
      });
    });

    test('should sort search results by relevance', () => {
      const results = processor.searchDocuments('Epstein');
      expect(results.length).toBeGreaterThan(0);
      
      // First result should have higher relevance
      if (results.length > 1) {
        const firstDoc = results[0];
        const lastDoc = results[results.length - 1];
        
        // First doc should have more mentions or higher spice score
        const firstScore = firstDoc.entities.length + firstDoc.spiceRating;
        const lastScore = lastDoc.entities.length + lastDoc.spiceRating;
        expect(firstScore).toBeGreaterThanOrEqual(lastScore);
      }
    });
  });

  describe('Browsing Functionality', () => {
    beforeEach(async () => {
      await processor.processDocumentBatch(
        sampleDocuments.map(doc => ({
          path: doc.filename,
          content: doc.content
        }))
      );
    });

    test('should browse all documents', () => {
      const results = processor.browseDocuments({});
      expect(results.length).toBeGreaterThan(0);
    });

    test('should filter by file type', () => {
      const results = processor.browseDocuments({
        fileType: ['email']
      });
      
      results.forEach(doc => {
        expect(doc.fileType).toBe('email');
      });
    });

    test('should filter by spice level', () => {
      const results = processor.browseDocuments({
        spiceLevel: { min: 3, max: 5 }
      });
      
      results.forEach(doc => {
        expect(doc.spiceRating).toBeGreaterThanOrEqual(3);
        expect(doc.spiceRating).toBeLessThanOrEqual(5);
      });
    });

    test('should sort by different criteria', () => {
      const spiceResults = processor.browseDocuments({}, 'spice', 'desc');
      expect(spiceResults.length).toBeGreaterThan(0);
      
      if (spiceResults.length > 1) {
        for (let i = 0; i < spiceResults.length - 1; i++) {
          expect(spiceResults[i].spiceRating).toBeGreaterThanOrEqual(spiceResults[i + 1].spiceRating);
        }
      }
    });
  });

  describe('Relational Features', () => {
    beforeEach(async () => {
      await processor.processDocumentBatch(
        sampleDocuments.map(doc => ({
          path: doc.filename,
          content: doc.content
        }))
      );
    });

    test('should find related documents', () => {
      const allDocs = processor.browseDocuments({});
      if (allDocs.length > 0) {
        const doc = allDocs[0];
        const related = processor.findRelatedDocuments(doc.id, 5);
        
        // Related documents should share entities or categories
        related.forEach(relatedDoc => {
          const hasSharedEntity = doc.entities.some(entity => 
            relatedDoc.entities.some(relatedEntity => relatedEntity.name === entity.name)
          );
          const hasSharedCategory = doc.metadata.categories.some(cat => 
            relatedDoc.metadata.categories.includes(cat)
          );
          
          expect(hasSharedEntity || hasSharedCategory).toBe(true);
        });
      }
    });

    test('should find documents by entity', () => {
      const results = processor.findDocumentsByEntity('Epstein', 'person');
      expect(results.length).toBeGreaterThanOrEqual(0);
      
      results.forEach(doc => {
        const hasEntity = doc.entities.some(entity => 
          entity.name.toLowerCase().includes('epstein')
        );
        expect(hasEntity).toBe(true);
      });
    });

    test('should get entity network', () => {
      const network = processor.getEntityNetwork('Epstein');
      expect(network.entity).toBeDefined();
      expect(Array.isArray(network.connections)).toBe(true);
      
      network.connections.forEach(connection => {
        expect(connection).toHaveProperty('entity');
        expect(connection).toHaveProperty('strength');
        expect(connection).toHaveProperty('sharedDocuments');
        expect(typeof connection.strength).toBe('number');
        expect(Array.isArray(connection.sharedDocuments)).toBe(true);
      });
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await processor.processDocumentBatch(
        sampleDocuments.map(doc => ({
          path: doc.filename,
          content: doc.content
        }))
      );
    });

    test('should handle search caching', () => {
      const start1 = performance.now();
      const results1 = processor.searchDocuments('Epstein');
      const time1 = performance.now() - start1;
      
      const start2 = performance.now();
      const results2 = processor.searchDocuments('Epstein');
      const time2 = performance.now() - start2;
      
      // Second search should be faster due to caching
      expect(results1.length).toBe(results2.length);
      expect(time2).toBeLessThanOrEqual(time1);
    });

    test('should handle large document collections efficiently', () => {
      const start = performance.now();
      const results = processor.browseDocuments({});
      const time = performance.now() - start;
      
      expect(results.length).toBeGreaterThan(0);
      expect(time).toBeLessThan(100); // Should complete in under 100ms
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await processor.processDocumentBatch(
        sampleDocuments.map(doc => ({
          path: doc.filename,
          content: doc.content
        }))
      );
    });

    test('should provide accurate statistics', () => {
      const stats = processor.getStatistics();
      
      expect(stats).toHaveProperty('totalDocuments');
      expect(stats).toHaveProperty('totalEntities');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('averageSpiceScore');
      expect(stats).toHaveProperty('fileTypes');
      expect(stats).toHaveProperty('topEntities');
      expect(stats).toHaveProperty('dateRange');
      
      expect(stats.totalDocuments).toBeGreaterThan(0);
      expect(stats.totalEntities).toBeGreaterThanOrEqual(0);
      expect(stats.averageSpiceScore).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(stats.fileTypes)).toBe(true);
      expect(Array.isArray(stats.topEntities)).toBe(true);
    });

    test('should provide document collection', () => {
      const collection = processor.getDocumentCollection();
      
      expect(collection).toHaveProperty('documents');
      expect(collection).toHaveProperty('entities');
      expect(collection).toHaveProperty('totalFiles');
      expect(collection).toHaveProperty('totalSize');
      expect(collection).toHaveProperty('dateRange');
      expect(collection).toHaveProperty('fileTypes');
      expect(collection).toHaveProperty('categories');
      
      expect(collection.totalFiles).toBeGreaterThan(0);
      expect(Array.isArray(collection.documents)).toBe(true);
    });
  });
});