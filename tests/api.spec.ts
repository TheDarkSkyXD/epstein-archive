import { test, expect } from '@playwright/test';

/**
 * API Integration Tests (Tier 3 - Testing)
 *
 * These tests verify the critical backend API endpoints work correctly.
 */

test.describe('API Integration Tests', () => {
  const baseUrl = 'http://localhost:3012';

  test('GET /api/health - should return healthy status', async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/health`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.database).toBe('connected');
  });

  test('GET /api/ready - should indicate readiness', async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/ready`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('ready');
  });

  test.describe('Entities API', () => {
    test('GET /api/entities - should return paginated entities', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/entities?page=1&limit=10`);
      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('total');
      expect(body).toHaveProperty('page');
      expect(body).toHaveProperty('pageSize');
      expect(Array.isArray(body.data)).toBe(true);
    });

    test('GET /api/entities/:id - should return entity by ID', async ({ request }) => {
      // First get a valid entity ID
      const listResponse = await request.get(`${baseUrl}/api/entities?limit=1`);
      const list = await listResponse.json();

      if (list.data && list.data.length > 0) {
        const entityId = list.data[0].id;
        const response = await request.get(`${baseUrl}/api/entities/${entityId}`);
        expect(response.ok()).toBeTruthy();

        const entity = await response.json();
        expect(entity).toHaveProperty('id');
        expect(entity).toHaveProperty('fullName');
      }
    });
  });

  test.describe('Documents API', () => {
    test('GET /api/documents - should return paginated documents', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/documents?page=1&limit=10`);
      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('total');
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  test.describe('Relationships API', () => {
    test('GET /api/relationships - should return relationships for entity', async ({ request }) => {
      // First get a valid entity ID
      const listResponse = await request.get(`${baseUrl}/api/entities?limit=1`);
      const list = await listResponse.json();

      if (list.data && list.data.length > 0) {
        const entityId = list.data[0].id;
        const response = await request.get(`${baseUrl}/api/relationships?entityId=${entityId}`);
        // May return empty array if no relationships, but should be 200
        expect(response.ok()).toBeTruthy();

        const body = await response.json();
        expect(Array.isArray(body)).toBe(true);
      }
    });
  });

  test.describe('Graph API', () => {
    test('GET /api/graph - should return graph data', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/graph`);
      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body).toHaveProperty('nodes');
      expect(body).toHaveProperty('edges');
    });
  });

  test.describe('Investigations API', () => {
    test('GET /api/investigations - should return investigations list', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/investigations`);
      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
    });

    test('POST/GET/DELETE /api/investigations - CRUD operations', async ({ request }) => {
      // Create
      const createResponse = await request.post(`${baseUrl}/api/investigations`, {
        data: {
          title: 'Test Investigation',
          description: 'Created by API test',
          status: 'active',
          priority: 'medium',
        },
      });
      expect(createResponse.status()).toBeLessThan(500);

      if (createResponse.ok()) {
        const created = await createResponse.json();
        const investigationId = created.id;

        // Read
        const getResponse = await request.get(`${baseUrl}/api/investigations/${investigationId}`);
        expect(getResponse.ok()).toBeTruthy();

        // Delete (cleanup)
        const deleteResponse = await request.delete(
          `${baseUrl}/api/investigations/${investigationId}`,
        );
        expect(deleteResponse.status()).toBeLessThan(500);
      }
    });
  });

  test.describe('Forensic API', () => {
    test('GET /api/forensic/metrics-summary - should return forensic summary', async ({
      request,
    }) => {
      const response = await request.get(`${baseUrl}/api/forensic/metrics-summary`);
      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body).toHaveProperty('totalDocumentsAnalyzed');
      expect(body).toHaveProperty('riskDistribution');
      expect(body).toHaveProperty('topRiskDocuments');
      expect(Array.isArray(body.topRiskDocuments)).toBe(true);
    });
  });

  test.describe('Search API', () => {
    test('GET /api/search - should return search results', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/search?query=Epstein`);
      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body).toHaveProperty('entities');
      expect(body).toHaveProperty('documents');
    });
  });

  test.describe('Statistics API', () => {
    test('GET /api/stats - should return database statistics', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/stats`);
      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body).toHaveProperty('entities');
      expect(body).toHaveProperty('documents');
    });
  });
});
