import { DatabaseService } from '../src/services/DatabaseService';

/**
 * Consolidate name variants and typos
 * E.g., "Donald Trum" → "Donald Trump"
 */

interface NameVariant {
  canonical: string;
  variants: string[];
}

// Known name variants and typos to consolidate
const NAME_CONSOLIDATIONS: NameVariant[] = [
  {
    canonical: 'Donald Trump',
    variants: ['Donald Trum', 'Trump Donald', 'Nt Donald Trump']
  },
  {
    canonical: 'Bill Clinton',
    variants: ['Nt Bill Clinton', 'Clinton Bill', 'William Clinton']
  },
  {
    canonical: 'Hillary Clinton',
    variants: ['Clinton Hillary', 'Hillary Rodham Clinton']
  },
  {
    canonical: 'Barack Obama',
    variants: ['Obama Barack', 'Barack H Obama', 'Barack Hussein Obama']
  },
  {
    canonical: 'Jeffrey Epstein',
    variants: ['Epstein Jeffrey', 'Jeff Epstein', 'J Epstein']
  },
  {
    canonical: 'Ghislaine Maxwell',
    variants: ['Maxwell Ghislaine', 'G Maxwell']
  },
  {
    canonical: 'Alan Dershowitz',
    variants: ['Dershowitz Alan', 'A Dershowitz']
  },
  {
    canonical: 'Prince Andrew',
    variants: ['Andrew Prince', 'Duke Of York']
  }
];

async function consolidateNames() {
  console.log('Starting name consolidation...');
  
  const dbService = DatabaseService.getInstance();
  const db = (dbService as any).db;

  let totalConsolidated = 0;

  for (const consolidation of NAME_CONSOLIDATIONS) {
    const canonical = consolidation.canonical;
    
    // Find the canonical entity
    const canonicalEntity = db.prepare('SELECT id FROM entities WHERE full_name = ?').get(canonical);
    
    if (!canonicalEntity) {
      console.log(`Warning: Canonical entity "${canonical}" not found, skipping consolidation`);
      continue;
    }
    
    const canonicalId = canonicalEntity.id;
    
    for (const variant of consolidation.variants) {
      const variantEntity = db.prepare('SELECT id FROM entities WHERE full_name = ?').get(variant);
      
      if (!variantEntity) {
        continue; // Variant doesn't exist, skip
      }
      
      const variantId = variantEntity.id;
      
      console.log(`Consolidating "${variant}" → "${canonical}"`);
      
      // Update all mentions to point to canonical entity
      db.prepare('UPDATE entity_mentions SET entity_id = ? WHERE entity_id = ?')
        .run(canonicalId, variantId);
      
      // Delete the variant entity
      db.prepare('DELETE FROM entities WHERE id = ?').run(variantId);
      
      totalConsolidated++;
    }
  }

  console.log(`Successfully consolidated ${totalConsolidated} name variants.`);
}

consolidateNames().catch(console.error);
