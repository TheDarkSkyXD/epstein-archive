import { getDb } from './connection.js';

export interface Property {
  id: number;
  pcn: string;
  owner_name_1: string | null;
  owner_name_2: string | null;
  street_name: string | null;
  site_address: string | null;
  total_tax_value: number | null;
  acres: number | null;
  property_use: string | null;
  year_built: number | null;
  bedrooms: number | null;
  full_bathrooms: number | null;
  half_bathrooms: number | null;
  stories: number | null;
  building_value: number | null;
  building_area: number | null;
  living_area: number | null;
  is_epstein_property: number;
  is_known_associate: number;
  linked_entity_id: number | null;
}

export interface PropertyStats {
  totalProperties: number;
  epsteinProperties: number;
  knownAssociateProperties: number;
  avgTaxValue: number;
  maxTaxValue: number;
  propertyTypes: { type: string; count: number }[];
}

export const propertiesRepository = {
  /**
   * Get properties with filtering and pagination
   */
  getProperties: (
    filters: {
      page?: number;
      limit?: number;
      ownerSearch?: string;
      minValue?: number;
      maxValue?: number;
      propertyUse?: string;
      knownAssociatesOnly?: boolean;
      sortBy?: 'value' | 'owner' | 'year';
      sortOrder?: 'asc' | 'desc';
    } = {},
  ): {
    properties: Property[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  } => {
    const db = getDb();
    const {
      page = 1,
      limit = 50,
      ownerSearch,
      minValue,
      maxValue,
      propertyUse,
      knownAssociatesOnly = false,
      sortBy = 'value',
      sortOrder = 'desc',
    } = filters;

    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any[] = [];

    if (ownerSearch) {
      conditions.push('(owner_name_1 LIKE ? OR owner_name_2 LIKE ?)');
      params.push(`%${ownerSearch}%`, `%${ownerSearch}%`);
    }

    if (minValue !== undefined) {
      conditions.push('total_tax_value >= ?');
      params.push(minValue);
    }

    if (maxValue !== undefined) {
      conditions.push('total_tax_value <= ?');
      params.push(maxValue);
    }

    if (propertyUse) {
      conditions.push('property_use = ?');
      params.push(propertyUse);
    }

    if (knownAssociatesOnly) {
      conditions.push('is_known_associate = 1');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM palm_beach_properties ${whereClause}`;
    const { total } = db.prepare(countQuery).get(...params) as { total: number };

    // Determine sort column
    let orderClause = '';
    switch (sortBy) {
      case 'owner':
        orderClause = `ORDER BY owner_name_1 ${sortOrder.toUpperCase()}`;
        break;
      case 'year':
        orderClause = `ORDER BY year_built ${sortOrder.toUpperCase()} NULLS LAST`;
        break;
      case 'value':
      default:
        orderClause = `ORDER BY total_tax_value ${sortOrder.toUpperCase()} NULLS LAST`;
    }

    // Get properties
    const query = `
      SELECT * FROM palm_beach_properties
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?
    `;
    const properties = db.prepare(query).all(...params, limit, offset) as Property[];

    return {
      properties,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Get property by ID
   */
  getPropertyById: (id: number): Property | null => {
    const db = getDb();
    return db
      .prepare('SELECT * FROM palm_beach_properties WHERE id = ?')
      .get(id) as Property | null;
  },

  /**
   * Get all properties owned by known associates
   */
  getKnownAssociateProperties: (): Property[] => {
    const db = getDb();
    return db
      .prepare(
        `
      SELECT * FROM palm_beach_properties
      WHERE is_known_associate = 1
      ORDER BY total_tax_value DESC
    `,
      )
      .all() as Property[];
  },

  /**
   * Get Epstein's properties
   */
  getEpsteinProperties: (): Property[] => {
    const db = getDb();
    return db
      .prepare(
        `
      SELECT * FROM palm_beach_properties
      WHERE is_epstein_property = 1
      ORDER BY total_tax_value DESC
    `,
      )
      .all() as Property[];
  },

  /**
   * Get property statistics
   */
  getPropertyStats: (): PropertyStats => {
    const db = getDb();

    const stats = db
      .prepare(
        `
      SELECT 
        COUNT(*) as totalProperties,
        SUM(is_epstein_property) as epsteinProperties,
        SUM(is_known_associate) as knownAssociateProperties,
        ROUND(AVG(total_tax_value), 0) as avgTaxValue,
        MAX(total_tax_value) as maxTaxValue
      FROM palm_beach_properties
    `,
      )
      .get() as any;

    const propertyTypes = db
      .prepare(
        `
      SELECT property_use as type, COUNT(*) as count
      FROM palm_beach_properties
      WHERE property_use IS NOT NULL
      GROUP BY property_use
      ORDER BY count DESC
    `,
      )
      .all() as { type: string; count: number }[];

    return {
      totalProperties: stats.totalProperties || 0,
      epsteinProperties: stats.epsteinProperties || 0,
      knownAssociateProperties: stats.knownAssociateProperties || 0,
      avgTaxValue: stats.avgTaxValue || 0,
      maxTaxValue: stats.maxTaxValue || 0,
      propertyTypes,
    };
  },

  /**
   * Search property owners against entity database
   */
  findMatchingEntities: (
    ownerName: string,
  ): { id: number; full_name: string; match_score: number }[] => {
    const db = getDb();

    // Simple fuzzy search - look for entities with similar names
    const searchTerms = ownerName.split(/\s+/).filter((t) => t.length > 2);
    if (searchTerms.length === 0) return [];

    const conditions = searchTerms.map(() => 'full_name LIKE ?').join(' OR ');
    const params = searchTerms.map((t) => `%${t}%`);

    return db
      .prepare(
        `
      SELECT id, full_name, 
        (SELECT COUNT(*) FROM (
          SELECT 1 WHERE full_name LIKE ?
          ${searchTerms
            .slice(1)
            .map(() => 'UNION ALL SELECT 1 WHERE full_name LIKE ?')
            .join(' ')}
        )) as match_score
      FROM entities
      WHERE ${conditions}
      AND primary_role IS NOT NULL
      ORDER BY match_score DESC, red_flag_rating DESC
      LIMIT 5
    `,
      )
      .all(...params, ...params) as { id: number; full_name: string; match_score: number }[];
  },

  /**
   * Link a property to an entity
   */
  linkPropertyToEntity: (propertyId: number, entityId: number): void => {
    const db = getDb();
    db.prepare(
      `
      UPDATE palm_beach_properties
      SET linked_entity_id = ?
      WHERE id = ?
    `,
    ).run(entityId, propertyId);
  },

  /**
   * Get property value distribution
   */
  getValueDistribution: (): { range: string; count: number }[] => {
    const db = getDb();
    return db
      .prepare(
        `
      SELECT 
        CASE 
          WHEN total_tax_value < 500000 THEN 'Under $500K'
          WHEN total_tax_value < 1000000 THEN '$500K - $1M'
          WHEN total_tax_value < 5000000 THEN '$1M - $5M'
          WHEN total_tax_value < 10000000 THEN '$5M - $10M'
          WHEN total_tax_value < 50000000 THEN '$10M - $50M'
          ELSE 'Over $50M'
        END as range,
        COUNT(*) as count
      FROM palm_beach_properties
      WHERE total_tax_value IS NOT NULL
      GROUP BY range
      ORDER BY MIN(total_tax_value)
    `,
      )
      .all() as { range: string; count: number }[];
  },

  /**
   * Get top property owners by total value
   */
  getTopOwners: (limit = 20): { owner: string; propertyCount: number; totalValue: number }[] => {
    const db = getDb();
    return db
      .prepare(
        `
      SELECT 
        COALESCE(owner_name_1, 'Unknown') as owner,
        COUNT(*) as propertyCount,
        SUM(total_tax_value) as totalValue
      FROM palm_beach_properties
      WHERE owner_name_1 IS NOT NULL
      GROUP BY owner_name_1
      ORDER BY totalValue DESC
      LIMIT ?
    `,
      )
      .all(limit) as { owner: string; propertyCount: number; totalValue: number }[];
  },
};
