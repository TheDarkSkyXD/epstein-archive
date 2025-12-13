import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../epstein-archive-production.db');
const db = new Database(DB_PATH);

console.log('🚀 Starting Entity Enrichment and Categorization...\n');

// Entity type patterns
const ENTITY_PATTERNS = {
  // People indicators
  PERSON_TITLES: [
    'President', 'Vice President', 'VP', 'Senator', 'Representative', 'Rep.', 'Congressman',
    'Governor', 'Mayor', 'Judge', 'Justice', 'Attorney', 'Atty', 'Lawyer', 'Counsel',
    'Dr.', 'Doctor', 'Professor', 'Prof.', 'CEO', 'CFO', 'COO', 'CTO', 'Director',
    'Manager', 'Executive', 'Chairman', 'Prince', 'Princess', 'Duke', 'Duchess',
    'Sir', 'Lady', 'Lord', 'Baron', 'Count', 'Mr.', 'Mrs.', 'Ms.', 'Miss'
  ],
  
  // Organization indicators
  ORGANIZATION_SUFFIXES: [
    'Inc', 'LLC', 'Corp', 'Corporation', 'Company', 'Co.', 'Ltd', 'Limited',
    'Foundation', 'Institute', 'Association', 'Society', 'Trust', 'Fund',
    'Partners', 'Group', 'Holdings', 'Ventures', 'Capital', 'Management',
    'Department', 'Agency', 'Bureau', 'Commission', 'Committee', 'Council'
  ],
  
  ORGANIZATION_KEYWORDS: [
    'State Department', 'White House', 'Department of', 'Ministry of',
    'Bank', 'University', 'College', 'School', 'Hospital', 'Hotel',
    'Airlines', 'Airways', 'Airport', 'Club', 'Resort'
  ],
  
  // Location indicators
  LOCATION_KEYWORDS: [
    'Island', 'Beach', 'City', 'County', 'State', 'Country', 'Street',
    'Avenue', 'Road', 'Boulevard', 'Plaza', 'Square', 'Park', 'Building'
  ],
  
  US_STATES: [
    'New York', 'California', 'Florida', 'Texas', 'Pennsylvania', 'Illinois',
    'Ohio', 'Georgia', 'North Carolina', 'Michigan', 'New Jersey', 'Virginia',
    'Washington', 'Arizona', 'Massachusetts', 'Tennessee', 'Indiana', 'Missouri',
    'Maryland', 'Wisconsin', 'Colorado', 'Minnesota', 'South Carolina', 'Alabama'
  ],
  
  CITIES: [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
    'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
    'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis',
    'Seattle', 'Denver', 'Washington', 'Boston', 'Nashville', 'Detroit',
    'Palm Beach', 'Miami', 'Manhattan', 'London', 'Paris', 'Tokyo'
  ],
  
  // Date/Time indicators
  DATE_PATTERNS: [
    /^On (Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i,
    /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i,
    /^(January|February|March|April|May|June|July|August|September|October|November|December)/i,
    /^\d{1,2}\/\d{1,2}\/\d{2,4}/,
    /^\d{4}-\d{2}-\d{2}/
  ],
  
  // Document/Evidence indicators
  DOCUMENT_KEYWORDS: [
    'Affidavit', 'Deposition', 'Testimony', 'Statement', 'Declaration',
    'Agreement', 'Contract', 'Memo', 'Letter', 'Email', 'Report', 'Document'
  ]
};

interface EntityEnrichment {
  entityType: string;
  title: string | null;
  role: string | null;
  metadata: string | null;
}

function categorizeEntity(fullName: string, primaryRole: string | null): EntityEnrichment {
  const name = fullName.trim();
  const role = (primaryRole || '').trim();
  
  // Check for date/time patterns first
  for (const pattern of ENTITY_PATTERNS.DATE_PATTERNS) {
    if (pattern.test(name)) {
      return {
        entityType: 'Date',
        title: null,
        role: null,
        metadata: JSON.stringify({ category: 'temporal' })
      };
    }
  }
  
  // Check for document/evidence types
  for (const keyword of ENTITY_PATTERNS.DOCUMENT_KEYWORDS) {
    if (name.includes(keyword)) {
      return {
        entityType: 'Document',
        title: null,
        role: keyword,
        metadata: JSON.stringify({ category: 'evidence' })
      };
    }
  }
  
  // Check for organizations
  for (const suffix of ENTITY_PATTERNS.ORGANIZATION_SUFFIXES) {
    if (name.includes(suffix)) {
      return {
        entityType: 'Organization',
        title: null,
        role: extractOrganizationType(name),
        metadata: JSON.stringify({ category: 'corporate', suffix })
      };
    }
  }
  
  for (const keyword of ENTITY_PATTERNS.ORGANIZATION_KEYWORDS) {
    if (name.includes(keyword)) {
      return {
        entityType: 'Organization',
        title: null,
        role: keyword,
        metadata: JSON.stringify({ category: 'government' })
      };
    }
  }
  
  // Check for locations
  for (const state of ENTITY_PATTERNS.US_STATES) {
    if (name === state || name.startsWith(state + ' ')) {
      return {
        entityType: 'Location',
        title: null,
        role: 'US State',
        metadata: JSON.stringify({ category: 'state', country: 'USA' })
      };
    }
  }
  
  for (const city of ENTITY_PATTERNS.CITIES) {
    if (name === city || name.startsWith(city + ' ')) {
      return {
        entityType: 'Location',
        title: null,
        role: 'City',
        metadata: JSON.stringify({ category: 'city' })
      };
    }
  }
  
  for (const keyword of ENTITY_PATTERNS.LOCATION_KEYWORDS) {
    if (name.includes(keyword)) {
      return {
        entityType: 'Location',
        title: null,
        role: keyword,
        metadata: JSON.stringify({ category: 'place' })
      };
    }
  }
  
  // Check for people - extract title from name
  const titleInfo = extractTitleFromName(name);
  if (titleInfo.title) {
    return {
      entityType: 'Person',
      title: titleInfo.title,
      role: titleInfo.role || role || 'Unknown',
      metadata: JSON.stringify({ category: titleInfo.category })
    };
  }
  
  // Check if name looks like a person (has typical name structure)
  if (isLikelyPersonName(name)) {
    return {
      entityType: 'Person',
      title: null,
      role: role || 'Unknown',
      metadata: JSON.stringify({ category: 'individual' })
    };
  }
  
  // Default to Unknown
  return {
    entityType: 'Unknown',
    title: null,
    role: role || 'Unknown',
    metadata: JSON.stringify({ category: 'uncategorized' })
  };
}

function extractTitleFromName(name: string): { title: string | null; role: string | null; category: string } {
  // Check for titles at the beginning of the name
  for (const title of ENTITY_PATTERNS.PERSON_TITLES) {
    const pattern = new RegExp(`^${title}\\s+`, 'i');
    if (pattern.test(name)) {
      return {
        title: title,
        role: determineRoleCategory(title),
        category: getRoleCategory(title)
      };
    }
    
    // Also check for titles in the middle (e.g., "Bill Clinton, President")
    const middlePattern = new RegExp(`,\\s*${title}\\s*`, 'i');
    if (middlePattern.test(name)) {
      return {
        title: title,
        role: determineRoleCategory(title),
        category: getRoleCategory(title)
      };
    }
  }
  
  return { title: null, role: null, category: 'individual' };
}

function determineRoleCategory(title: string): string {
  const titleLower = title.toLowerCase();
  
  if (['president', 'vice president', 'vp', 'senator', 'representative', 'congressman', 'governor', 'mayor'].some(t => titleLower.includes(t))) {
    return 'Political';
  }
  if (['judge', 'justice', 'attorney', 'lawyer', 'counsel'].some(t => titleLower.includes(t))) {
    return 'Legal';
  }
  if (['ceo', 'cfo', 'coo', 'cto', 'director', 'manager', 'executive', 'chairman'].some(t => titleLower.includes(t))) {
    return 'Business';
  }
  if (['dr.', 'doctor', 'professor', 'prof.'].some(t => titleLower.includes(t))) {
    return 'Academic';
  }
  if (['prince', 'princess', 'duke', 'duchess', 'sir', 'lady', 'lord', 'baron', 'count'].some(t => titleLower.includes(t))) {
    return 'Royalty';
  }
  
  return 'Professional';
}

function getRoleCategory(title: string): string {
  const titleLower = title.toLowerCase();
  
  if (['president', 'senator', 'governor'].some(t => titleLower.includes(t))) return 'political';
  if (['ceo', 'cfo', 'director'].some(t => titleLower.includes(t))) return 'business';
  if (['attorney', 'judge', 'lawyer'].some(t => titleLower.includes(t))) return 'legal';
  if (['doctor', 'professor'].some(t => titleLower.includes(t))) return 'academic';
  if (['prince', 'duke', 'sir'].some(t => titleLower.includes(t))) return 'royalty';
  
  return 'professional';
}

function extractOrganizationType(name: string): string {
  if (name.includes('Foundation')) return 'Foundation';
  if (name.includes('Institute')) return 'Institute';
  if (name.includes('University') || name.includes('College')) return 'Educational Institution';
  if (name.includes('Bank')) return 'Financial Institution';
  if (name.includes('Department') || name.includes('Agency')) return 'Government Agency';
  if (name.includes('Hotel') || name.includes('Resort')) return 'Hospitality';
  if (name.includes('Airlines') || name.includes('Airways')) return 'Transportation';
  
  return 'Corporation';
}

function isLikelyPersonName(name: string): boolean {
  // Check if name has typical person name structure
  const words = name.split(/\s+/);
  
  // Single word names are unlikely to be people (unless very short)
  if (words.length === 1) return false;
  
  // Check for common non-person patterns
  if (name.includes('&') || name.includes('@') || name.includes('.com')) return false;
  if (/^\d/.test(name)) return false; // Starts with number
  if (name.length > 50) return false; // Too long for a person name
  
  // Check if words are capitalized (typical for names)
  const capitalizedWords = words.filter(w => /^[A-Z]/.test(w));
  if (capitalizedWords.length >= 2 && capitalizedWords.length === words.length) {
    return true;
  }
  
  return false;
}

// Add entity_type column if it doesn't exist
try {
  db.prepare('ALTER TABLE entities ADD COLUMN entity_type TEXT').run();
  console.log('✓ Added entity_type column');
} catch (e) {
  console.log('  entity_type column already exists');
}

// Add metadata column if it doesn't exist
try {
  db.prepare('ALTER TABLE entities ADD COLUMN metadata TEXT').run();
  console.log('✓ Added metadata column');
} catch (e) {
  console.log('  metadata column already exists');
}

console.log('\n📊 Enriching entities...\n');

// Get all entities
const entities = db.prepare(`
  SELECT id, full_name, primary_role, title, role
  FROM entities
  ORDER BY mentions DESC
`).all() as Array<{
  id: number;
  full_name: string;
  primary_role: string | null;
  title: string | null;
  role: string | null;
}>;

console.log(`Found ${entities.length} entities to process\n`);

const updateStmt = db.prepare(`
  UPDATE entities 
  SET entity_type = ?,
      title = COALESCE(?, title),
      role = COALESCE(?, role),
      metadata = ?
  WHERE id = ?
`);

let stats = {
  people: 0,
  organizations: 0,
  locations: 0,
  documents: 0,
  dates: 0,
  unknown: 0,
  titlesExtracted: 0
};

const transaction = db.transaction(() => {
  for (const entity of entities) {
    const enrichment = categorizeEntity(entity.full_name, entity.primary_role);
    
    updateStmt.run(
      enrichment.entityType,
      enrichment.title,
      enrichment.role,
      enrichment.metadata,
      entity.id
    );
    
    // Update stats
    switch (enrichment.entityType) {
      case 'Person': stats.people++; break;
      case 'Organization': stats.organizations++; break;
      case 'Location': stats.locations++; break;
      case 'Document': stats.documents++; break;
      case 'Date': stats.dates++; break;
      default: stats.unknown++; break;
    }
    
    if (enrichment.title) {
      stats.titlesExtracted++;
    }
  }
});

transaction();

console.log('✅ Entity Enrichment Complete!\n');
console.log('📈 Statistics:');
console.log(`   People: ${stats.people.toLocaleString()}`);
console.log(`   Organizations: ${stats.organizations.toLocaleString()}`);
console.log(`   Locations: ${stats.locations.toLocaleString()}`);
console.log(`   Documents: ${stats.documents.toLocaleString()}`);
console.log(`   Dates: ${stats.dates.toLocaleString()}`);
console.log(`   Unknown: ${stats.unknown.toLocaleString()}`);
console.log(`   Titles Extracted: ${stats.titlesExtracted.toLocaleString()}`);

// Show sample results
console.log('\n📋 Sample Results:');
const samples = db.prepare(`
  SELECT full_name, entity_type, title, role
  FROM entities
  WHERE entity_type IS NOT NULL
  ORDER BY mentions DESC
  LIMIT 20
`).all();

for (const sample of samples) {
  console.log(`   ${sample.full_name} → ${sample.entity_type} ${sample.title ? `(${sample.title})` : ''}`);
}

db.close();
console.log('\n✨ Done!');
