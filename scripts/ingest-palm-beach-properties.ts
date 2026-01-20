#!/usr/bin/env npx tsx
/**
 * Ingest Palm Beach property data from House Oversight CSVs
 * This data contains property records near Epstein's Palm Beach mansion
 *
 * Run with: npx tsx scripts/ingest-palm-beach-properties.ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
console.log(`📂 Using database: ${DB_PATH}`);

const db = new Database(DB_PATH, { timeout: 30000 });
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ============================================
// 1. CREATE PROPERTIES TABLE
// ============================================
console.log('\n🏠 Creating palm_beach_properties table...');

db.exec(`
  CREATE TABLE IF NOT EXISTS palm_beach_properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pcn TEXT UNIQUE,
    owner_name_1 TEXT,
    owner_name_2 TEXT,
    street_name TEXT,
    site_address TEXT,
    total_tax_value REAL,
    acres REAL,
    property_use TEXT,
    year_built INTEGER,
    bedrooms INTEGER,
    full_bathrooms INTEGER,
    half_bathrooms INTEGER,
    stories REAL,
    building_value REAL,
    building_area INTEGER,
    living_area INTEGER,
    is_epstein_property INTEGER DEFAULT 0,
    is_known_associate INTEGER DEFAULT 0,
    linked_entity_id INTEGER,
    source_file TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (linked_entity_id) REFERENCES entities(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_properties_owner ON palm_beach_properties(owner_name_1);
  CREATE INDEX IF NOT EXISTS idx_properties_pcn ON palm_beach_properties(pcn);
  CREATE INDEX IF NOT EXISTS idx_properties_value ON palm_beach_properties(total_tax_value);
`);

// ============================================
// 2. PARSE CSV DATA
// ============================================
console.log('\n📄 Parsing CSV files...');

function parseCSV(content: string): string[][] {
  const lines = content.split('\n');
  const rows: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    // Simple CSV parsing (handles quoted values)
    const row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    rows.push(row);
  }

  return rows;
}

function parseNumber(value: string): number | null {
  if (!value) return null;
  // Remove quotes, commas, dollar signs
  const cleaned = value.replace(/[",$ ]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseInt2(value: string): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[", ]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

// Known Epstein-related names to flag
const KNOWN_ASSOCIATES = [
  'EPSTEIN',
  'MAXWELL',
  'WEXNER',
  'DERSHOWITZ',
  'KELLEN',
  'MARCINKOVA',
  'BRUNEL',
  'TRUMP',
  'CLINTON',
  'DUBIN',
  'DUBINS',
];

// ============================================
// 3. INSERT DATA
// ============================================
const insertProperty = db.prepare(`
  INSERT OR REPLACE INTO palm_beach_properties (
    pcn, owner_name_1, owner_name_2, street_name, site_address,
    total_tax_value, acres, property_use, year_built, bedrooms,
    full_bathrooms, half_bathrooms, stories, building_value,
    building_area, living_area, is_epstein_property, is_known_associate,
    source_file
  ) VALUES (
    @pcn, @owner_name_1, @owner_name_2, @street_name, @site_address,
    @total_tax_value, @acres, @property_use, @year_built, @bedrooms,
    @full_bathrooms, @half_bathrooms, @stories, @building_value,
    @building_area, @living_area, @is_epstein_property, @is_known_associate,
    @source_file
  )
`);

const csvDir = path.join(process.cwd(), 'data/csv/HOUSE_OVERSIGHT_016552');
const palmBeachFile = path.join(csvDir, 'Palm Beach-Table 1.csv');

if (!fs.existsSync(palmBeachFile)) {
  console.error(`❌ Could not find ${palmBeachFile}`);
  process.exit(1);
}

const content = fs.readFileSync(palmBeachFile, 'utf-8');
const rows = parseCSV(content);
const headers = rows[0];

console.log(`  Found ${rows.length - 1} property records`);
console.log(`  Columns: ${headers.length}`);

// Map column indices
const colMap: Record<string, number> = {};
headers.forEach((h, i) => {
  colMap[h.toUpperCase()] = i;
});

// Column index lookups
const COL = {
  PCN: colMap['PCN'] ?? 0,
  OWNER1: colMap['OWNERNAME1'] ?? 1,
  OWNER2: colMap['OWNERNAME2'] ?? 2,
  STREET: colMap['STREETNAME'] ?? 3,
  SITEADDR: colMap['SITEADDR'] ?? 5,
  TAXVAL: colMap['TOTTAXVAL'] ?? 9,
  ACRES: colMap['ACRES'] ?? 10,
  PROPUSE: colMap['PROPUSE'] ?? 11,
  YEARBUILT: colMap['CAMA-RESBLD.YEAR BUILT'] ?? 12,
  BEDROOMS: colMap['NUMBER OF BEDROOMS'] ?? 14,
  FULLBATH: colMap['NUMBER OF FULL BATHROOMS'] ?? 15,
  HALFBATH: colMap['NUMBER OF HALF BATHROOMS'] ?? 16,
  STORIES: colMap['STORY HEIGHT'] ?? 17,
  BLDGVALUE: colMap['CAMA-RESBLD.BUILDING VALUE'] ?? 18,
  BLDGAREA: colMap['CAMA-RESBLD.BUILDING AREA'] ?? 19,
  LIVINGAREA: colMap['SQUARE FOOT LIVING AREA'] ?? 21,
};

console.log('\n📝 Inserting property records...');

const seenPCNs = new Set<string>();
let insertCount = 0;
let skipCount = 0;

const insertBatch = db.transaction(() => {
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 10) continue;

    const pcn = row[COL.PCN];
    if (!pcn || seenPCNs.has(pcn)) {
      skipCount++;
      continue;
    }
    seenPCNs.add(pcn);

    const owner1 = row[COL.OWNER1] || '';
    const owner2 = row[COL.OWNER2] || '';
    const combinedOwner = `${owner1} ${owner2}`.toUpperCase();

    // Check if this is a known associate
    const isKnownAssociate = KNOWN_ASSOCIATES.some((name) => combinedOwner.includes(name)) ? 1 : 0;
    const isEpstein = combinedOwner.includes('EPSTEIN') ? 1 : 0;

    try {
      insertProperty.run({
        pcn,
        owner_name_1: owner1 || null,
        owner_name_2: owner2 || null,
        street_name: row[COL.STREET] || null,
        site_address: row[COL.SITEADDR] || null,
        total_tax_value: parseNumber(row[COL.TAXVAL]),
        acres: parseNumber(row[COL.ACRES]),
        property_use: row[COL.PROPUSE] || null,
        year_built: parseInt2(row[COL.YEARBUILT]),
        bedrooms: parseInt2(row[COL.BEDROOMS]),
        full_bathrooms: parseInt2(row[COL.FULLBATH]),
        half_bathrooms: parseInt2(row[COL.HALFBATH]),
        stories: parseNumber(row[COL.STORIES]),
        building_value: parseNumber(row[COL.BLDGVALUE]),
        building_area: parseInt2(row[COL.BLDGAREA]),
        living_area: parseInt2(row[COL.LIVINGAREA]),
        is_epstein_property: isEpstein,
        is_known_associate: isKnownAssociate,
        source_file: 'HOUSE_OVERSIGHT_016552/Palm Beach-Table 1.csv',
      });
      insertCount++;
    } catch (err) {
      // Skip duplicates
      skipCount++;
    }
  }
});

insertBatch();

console.log(`  ✅ Inserted ${insertCount} unique properties`);
console.log(`  ⏭️  Skipped ${skipCount} duplicates/invalid rows`);

// ============================================
// 4. VERIFY AND REPORT
// ============================================
console.log('\n📊 Property data summary:');

const stats = db
  .prepare(
    `
  SELECT 
    COUNT(*) as total,
    SUM(is_epstein_property) as epstein_properties,
    SUM(is_known_associate) as known_associate_properties,
    ROUND(AVG(total_tax_value), 0) as avg_tax_value,
    ROUND(MAX(total_tax_value), 0) as max_tax_value
  FROM palm_beach_properties
`,
  )
  .get() as any;

console.log(`  Total properties: ${stats.total}`);
console.log(`  Epstein properties: ${stats.epstein_properties}`);
console.log(`  Known associate properties: ${stats.known_associate_properties}`);
console.log(`  Average tax value: $${stats.avg_tax_value?.toLocaleString() || 'N/A'}`);
console.log(`  Max tax value: $${stats.max_tax_value?.toLocaleString() || 'N/A'}`);

// Show known associate properties
console.log('\n🔍 Properties owned by known associates:');
const associateProperties = db
  .prepare(
    `
  SELECT owner_name_1, owner_name_2, total_tax_value, property_use
  FROM palm_beach_properties
  WHERE is_known_associate = 1
  ORDER BY total_tax_value DESC
  LIMIT 20
`,
  )
  .all() as any[];

for (const prop of associateProperties) {
  const owner = [prop.owner_name_1, prop.owner_name_2].filter(Boolean).join(' / ');
  const value = prop.total_tax_value ? `$${prop.total_tax_value.toLocaleString()}` : 'N/A';
  console.log(`  ${owner}: ${value} (${prop.property_use || 'Unknown'})`);
}

// Show top valued properties
console.log('\n💰 Top 10 most valuable properties:');
const topProperties = db
  .prepare(
    `
  SELECT owner_name_1, owner_name_2, total_tax_value, property_use
  FROM palm_beach_properties
  WHERE total_tax_value IS NOT NULL
  ORDER BY total_tax_value DESC
  LIMIT 10
`,
  )
  .all() as any[];

for (const prop of topProperties) {
  const owner = [prop.owner_name_1, prop.owner_name_2].filter(Boolean).join(' / ');
  const value = `$${prop.total_tax_value.toLocaleString()}`;
  console.log(`  ${owner}: ${value}`);
}

db.close();
console.log('\n🎉 Done!');
