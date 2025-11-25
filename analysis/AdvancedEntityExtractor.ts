/**
 * ADVANCED ENTITY EXTRACTOR
 * Sophisticated NER-based entity extraction with comprehensive filtering
 */

// ============================================================================
// COMPREHENSIVE EXCLUSION LISTS
// ============================================================================

// All major countries
const COUNTRIES = new Set([
  'United States', 'United Kingdom', 'Great Britain', 'Saudi Arabia', 'China', 'Russia',
  'Japan', 'Germany', 'France', 'Italy', 'Spain', 'Canada', 'Australia', 'Brazil',
  'Mexico', 'India', 'South Korea', 'North Korea', 'Israel', 'Iran', 'Iraq', 'Syria',
  'Egypt', 'South Africa', 'Nigeria', 'Kenya', 'Argentina', 'Chile', 'Colombia',
  'Venezuela', 'Peru', 'Turkey', 'Greece', 'Poland', 'Ukraine', 'Sweden', 'Norway',
  'Denmark', 'Finland', 'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Portugal',
  'Ireland', 'New Zealand', 'Thailand', 'Vietnam', 'Philippines', 'Indonesia', 'Malaysia',
  'Singapore', 'Pakistan', 'Bangladesh', 'Afghanistan', 'Cuba', 'Jamaica', 'Haiti',
  'Dominican Republic', 'Costa Rica', 'Panama', 'Guatemala', 'Honduras', 'Nicaragua',
  'El Salvador', 'Czech Republic', 'Hungary', 'Romania', 'Bulgaria', 'Croatia', 'Serbia',
  'Bosnia', 'Albania', 'Macedonia', 'Slovenia', 'Slovakia', 'Lithuania', 'Latvia',
  'Estonia', 'Belarus', 'Moldova', 'Georgia', 'Armenia', 'Azerbaijan', 'Kazakhstan',
  'Uzbekistan', 'Turkmenistan', 'Kyrgyzstan', 'Tajikistan', 'Mongolia', 'Nepal',
  'Sri Lanka', 'Myanmar', 'Cambodia', 'Laos', 'Taiwan', 'Hong Kong', 'Macau',
  'Puerto Rico', 'Guam', 'Virgin Islands', 'Bahamas', 'Barbados', 'Trinidad',
  'Morocco', 'Algeria', 'Tunisia', 'Libya', 'Sudan', 'Ethiopia', 'Somalia', 'Ghana',
  'Ivory Coast', 'Senegal', 'Mali', 'Niger', 'Chad', 'Cameroon', 'Congo', 'Angola',
  'Mozambique', 'Zimbabwe', 'Zambia', 'Botswana', 'Namibia', 'Madagascar', 'Uganda',
  'Tanzania', 'Rwanda', 'Burundi', 'Malawi', 'Mauritius', 'Seychelles', 'Maldives',
  'Fiji', 'Papua New Guinea', 'Solomon Islands', 'Vanuatu', 'Samoa', 'Tonga',
  'Soviet Union', 'Yugoslavia', 'Czechoslovakia', 'East Germany', 'West Germany'
]);

// Major world cities
const CITIES = new Set([
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
  'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
  'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle',
  'Denver', 'Washington', 'Boston', 'Nashville', 'Baltimore', 'Oklahoma City',
  'Louisville', 'Portland', 'Las Vegas', 'Milwaukee', 'Albuquerque', 'Tucson',
  'Fresno', 'Sacramento', 'Kansas City', 'Atlanta', 'Miami', 'Cleveland', 'Raleigh',
  'Omaha', 'Minneapolis', 'Tulsa', 'Arlington', 'New Orleans', 'Wichita', 'Tampa',
  'London', 'Paris', 'Berlin', 'Madrid', 'Rome', 'Vienna', 'Amsterdam', 'Brussels',
  'Copenhagen', 'Stockholm', 'Oslo', 'Helsinki', 'Dublin', 'Lisbon', 'Athens',
  'Prague', 'Budapest', 'Warsaw', 'Bucharest', 'Sofia', 'Zagreb', 'Belgrade',
  'Moscow', 'St Petersburg', 'Kiev', 'Minsk', 'Istanbul', 'Ankara', 'Jerusalem',
  'Tel Aviv', 'Cairo', 'Dubai', 'Abu Dhabi', 'Riyadh', 'Jeddah', 'Tehran', 'Baghdad',
  'Damascus', 'Beirut', 'Amman', 'Doha', 'Kuwait City', 'Muscat', 'Manama',
  'Tokyo', 'Osaka', 'Kyoto', 'Beijing', 'Shanghai', 'Hong Kong', 'Seoul', 'Bangkok',
  'Singapore', 'Manila', 'Jakarta', 'Kuala Lumpur', 'Hanoi', 'Ho Chi Minh',
  'Mumbai', 'Delhi', 'Bangalore', 'Kolkata', 'Chennai', 'Hyderabad', 'Karachi',
  'Lahore', 'Islamabad', 'Dhaka', 'Kathmandu', 'Colombo', 'Kabul', 'Tashkent',
  'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Auckland', 'Wellington',
  'Mexico City', 'Guadalajara', 'Monterrey', 'Sao Paulo', 'Rio De Janeiro',
  'Buenos Aires', 'Lima', 'Bogota', 'Santiago', 'Caracas', 'Havana', 'Kingston',
  'Johannesburg', 'Cape Town', 'Nairobi', 'Lagos', 'Accra', 'Casablanca', 'Algiers'
]);

// US States and regions
const US_STATES = new Set([
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina',
  'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
  'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
]);

// Regions and places
const REGIONS = new Set([
  'Middle East', 'Far East', 'Southeast Asia', 'Central America', 'South America',
  'North America', 'Western Europe', 'Eastern Europe', 'Central Europe', 'Scandinavia',
  'Baltic States', 'Balkans', 'Mediterranean', 'Caribbean', 'Pacific Islands',
  'Sub-Saharan Africa', 'North Africa', 'Horn Of Africa', 'West Africa', 'East Africa',
  'Southern Africa', 'Central Africa', 'Latin America', 'Iberian Peninsula',
  'Arabian Peninsula', 'Indian Subcontinent', 'Indochina', 'Oceania', 'Polynesia',
  'Melanesia', 'Micronesia', 'West Palm Beach', 'Palm Beach', 'Boca Raton',
  'Fort Lauderdale', 'Miami Beach', 'South Beach', 'Manhattan', 'Brooklyn',
  'Queens', 'Bronx', 'Staten Island', 'Long Island', 'Coney Island', 'Times Square',
  'Wall Street', 'Madison Avenue', 'Fifth Avenue', 'Park Avenue', 'Broadway',
  'Hollywood', 'Beverly Hills', 'Silicon Valley', 'Capitol Hill', 'White House',
  'Pentagon', 'State Department', 'Justice Department', 'Treasury Department',
  'Defense Department', 'Homeland Security', 'Supreme Court', 'Congress',
  'Senate', 'House Of Representatives', 'United Nations', 'European Union',
  'World Bank', 'International Monetary Fund', 'World Trade Organization',
  'North Atlantic Treaty Organization', 'Plaza Hotel', 'Trump Tower', 'Empire State',
  'Chrysler Building', 'Rockefeller Center', 'Grand Central', 'Penn Station',
  'Lafayette High School', 'Stuyvesant High School', 'Bronx Science'
]);

// Date fragments and temporal expressions
const DATE_PATTERNS = [
  /^On (Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/i,
  /^On (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i,
  /^On (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i,
  /^On (January|February|March|April|May|June|July|August|September|October|November|December)$/i,
  /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i,
  /^(Last|Next|This) (Week|Month|Year|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i,
  /^\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i,
  /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}$/i,
];

// Generic phrases and salutations
const GENERIC_PHRASES = new Set([
  'Dear Jeffrey', 'Dear Sir', 'Dear Madam', 'Dear Friend', 'Dear Colleague',
  'Best Regards', 'Kind Regards', 'Yours Truly', 'Yours Sincerely', 'Yours Faithfully',
  'Thank You', 'Thanks Again', 'Many Thanks', 'Much Appreciated', 'Well Done',
  'Good Morning', 'Good Afternoon', 'Good Evening', 'Good Night', 'Hello There',
  'Hi There', 'Hey There', 'World War', 'Civil War', 'Cold War', 'Great Depression',
  'Industrial Revolution', 'Renaissance Period', 'Middle Ages', 'Dark Ages',
  'Stone Age', 'Bronze Age', 'Iron Age', 'Ice Age', 'Space Age', 'Information Age',
  'Digital Age', 'Modern Era', 'Ancient Times', 'Medieval Times', 'Victorian Era',
  'Financial Reporter', 'Staff Writer', 'Senior Editor', 'Managing Editor',
  'Executive Director', 'General Manager', 'Chief Executive', 'Chief Financial',
  'Chief Operating', 'Chief Technology', 'Vice President', 'Senior Vice',
  'Executive Vice', 'Assistant Vice', 'Deputy Director', 'Associate Director',
  'Acting Director', 'Interim Director', 'Special Counsel', 'General Counsel',
  'Legal Counsel', 'Outside Counsel', 'Independent Counsel', 'Special Agent',
  'Federal Agent', 'Secret Service', 'Intelligence Agency', 'Law Enforcement',
  'Police Department', 'Sheriff Department', 'Fire Department', 'Public Works',
  'City Council', 'County Council', 'Town Council', 'School Board', 'Planning Commission'
]);

// Document/legal artifacts
const DOCUMENT_ARTIFACTS = new Set([
  'Exhibit Number', 'Case Number', 'Docket Number', 'File Number', 'Reference Number',
  'Control Number', 'Serial Number', 'Identification Number', 'Account Number',
  'Social Security Number', 'Tax Identification Number', 'Employee Identification',
  'Affidavit Number', 'Deposition Number', 'Transcript Number', 'Page Number',
  'Line Number', 'Paragraph Number', 'Section Number', 'Article Number',
  'Attachment Number', 'Appendix Number', 'Schedule Number', 'Addendum Number',
  'Amendment Number', 'Revision Number', 'Version Number', 'Draft Number',
  'Original Message', 'Forwarded Message', 'Reply Message', 'Sent Message',
  'Received Message', 'Deleted Message', 'Spam Message', 'Junk Message',
  'Email Message', 'Text Message', 'Voice Message', 'Instant Message',
  'Unauthorized Use', 'Unauthorized Access', 'Unauthorized Disclosure',
  'Confidential Information', 'Proprietary Information', 'Trade Secret',
  'Attorney Client', 'Work Product', 'Privileged Communication', 'Protected Information',
  'Classified Information', 'Top Secret', 'Secret Clearance', 'Security Clearance',
  'Background Check', 'Credit Check', 'Reference Check', 'Employment Verification'
]);

// Organization markers (for valid organizations)
const ORG_MARKERS = new Set([
  'inc', 'llc', 'ltd', 'plc', 'corp', 'corporation', 'company', 'co',
  'pty', 'gmbh', 'sa', 'ag', 'nv', 'bv', 'spa', 'srl', 'sarl',
  'university', 'college', 'institute', 'school', 'academy', 'foundation',
  'association', 'society', 'union', 'league', 'federation', 'alliance',
  'council', 'commission', 'committee', 'board', 'authority', 'agency',
  'department', 'ministry', 'bureau', 'office', 'administration',
  'bank', 'trust', 'fund', 'capital', 'partners', 'group', 'holdings',
  'ventures', 'investments', 'securities', 'financial', 'insurance',
  'times', 'post', 'herald', 'news', 'journal', 'tribune', 'gazette',
  'chronicle', 'observer', 'examiner', 'register', 'courier', 'press',
  'broadcasting', 'media', 'publications', 'publishing', 'entertainment'
]);

// ============================================================================
// ENTITY CLASSIFICATION
// ============================================================================

export interface ExtractedEntity {
  name: string;
  type: 'PERSON' | 'ORGANIZATION';
  confidence: number;
}

export class AdvancedEntityExtractor {
  
  /**
   * Extract entities from text with sophisticated filtering
   */
  extractEntities(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const seen = new Set<string>();
    
    // Match sequences of 2-5 capitalized words
    const pattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})\b/g;
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      const candidate = match[1].trim();
      
      // Skip if already seen
      if (seen.has(candidate)) continue;
      seen.add(candidate);
      
      // Validate and classify
      const entity = this.validateAndClassify(candidate);
      if (entity) {
        entities.push(entity);
      }
    }
    
    return entities;
  }
  
  /**
   * Validate candidate and classify as PERSON or ORGANIZATION
   */
  private validateAndClassify(candidate: string): ExtractedEntity | null {
    // Quick rejection filters
    if (this.isExcluded(candidate)) return null;
    if (this.isDateFragment(candidate)) return null;
    if (this.isGenericPhrase(candidate)) return null;
    if (this.isDocumentArtifact(candidate)) return null;
    
    // Classify as PERSON or ORGANIZATION
    if (this.isOrganization(candidate)) {
      return { name: candidate, type: 'ORGANIZATION', confidence: 0.9 };
    }
    
    if (this.isPerson(candidate)) {
      return { name: candidate, type: 'PERSON', confidence: 0.85 };
    }
    
    return null;
  }
  
  /**
   * Check if candidate is in exclusion lists
   */
  private isExcluded(name: string): boolean {
    // Check exact matches
    if (COUNTRIES.has(name)) return true;
    if (CITIES.has(name)) return true;
    if (US_STATES.has(name)) return true;
    if (REGIONS.has(name)) return true;
    if (GENERIC_PHRASES.has(name)) return true;
    if (DOCUMENT_ARTIFACTS.has(name)) return true;
    
    // Check partial matches for compound names
    const words = name.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (COUNTRIES.has(this.capitalize(word))) return true;
      if (CITIES.has(this.capitalize(word))) return true;
    }
    
    return false;
  }
  
  /**
   * Check if candidate is a date fragment
   */
  private isDateFragment(name: string): boolean {
    for (const pattern of DATE_PATTERNS) {
      if (pattern.test(name)) return true;
    }
    return false;
  }
  
  /**
   * Check if candidate is a generic phrase
   */
  private isGenericPhrase(name: string): boolean {
    return GENERIC_PHRASES.has(name);
  }
  
  /**
   * Check if candidate is a document artifact
   */
  private isDocumentArtifact(name: string): boolean {
    return DOCUMENT_ARTIFACTS.has(name);
  }
  
  /**
   * Check if candidate is an organization
   */
  private isOrganization(name: string): boolean {
    const words = name.toLowerCase().split(/\s+/);
    
    // Check for org markers
    for (const word of words) {
      if (ORG_MARKERS.has(word)) return true;
    }
    
    // Check for specific patterns
    if (/\b(bank|trust|fund|capital|partners|group|holdings)\b/i.test(name)) return true;
    if (/\b(times|post|herald|news|journal)\b/i.test(name)) return true;
    
    return false;
  }
  
  /**
   * Check if candidate is a person
   */
  private isPerson(name: string): boolean {
    const words = name.split(/\s+/);
    
    // Must have at least 2 words (First Last)
    if (words.length < 2) return false;
    
    // Each word must be properly capitalized
    for (const word of words) {
      // Skip particles and suffixes
      if (/^(de|van|von|der|den|del|della|di|da|le|la|el|al|jr\.?|sr\.?|ii|iii|iv|v)$/i.test(word)) {
        continue;
      }
      
      // Must start with capital letter and be alphabetic
      if (!/^[A-Z][a-z]+(?:[-'][A-Z]?[a-z]+)*$/.test(word)) {
        return false;
      }
    }
    
    // Additional validation: no title-only names
    if (/^(president|senator|governor|secretary|attorney|professor|doctor|mr|mrs|ms|miss)\s+/i.test(name)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}
