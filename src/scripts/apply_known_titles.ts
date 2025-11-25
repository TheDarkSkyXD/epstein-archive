import { databaseService } from '../services/DatabaseService';

// Known titles with years for prominent people
const KNOWN_TITLES: { [name: string]: { title: string; role: string } } = {
  // US Presidents
  'Bill Clinton': { title: 'President', role: '42nd President of the United States (1993-2001)' },
  'Donald Trump': { title: 'President', role: '45th President of the United States (2017-2021)' },
  'Barack Obama': { title: 'President', role: '44th President of the United States (2009-2017)' },
  'George Bush': { title: 'President', role: '43rd President of the United States (2001-2009)' },
  'George W Bush': { title: 'President', role: '43rd President of the United States (2001-2009)' },
  'George H W Bush': { title: 'President', role: '41st President of the United States (1989-1993)' },
  'Jimmy Carter': { title: 'President', role: '39th President of the United States (1977-1981)' },
  'Gerald Ford': { title: 'President', role: '38th President of the United States (1974-1977)' },
  'Richard Nixon': { title: 'President', role: '37th President of the United States (1969-1974)' },
  
  // World Leaders
  'Tony Blair': { title: 'Prime Minister', role: 'Prime Minister of the United Kingdom (1997-2007)' },
  'Jacques Chirac': { title: 'President', role: 'President of France (1995-2007)' },
  'Yoweri Museveni': { title: 'President', role: 'President of Uganda (1986-present)' },
  
  // US Senators
  'Jon Kyl': { title: 'Senator', role: 'U.S. Senator from Arizona (1995-2013, 2018)' },
  'George Mitchell': { title: 'Senator', role: 'U.S. Senator from Maine (1980-1995)' },
  
  // Governors
  'Jerry Brown': { title: 'Governor', role: 'Governor of California (1975-1983, 2011-2019)' },
  'Kenneth Mapp': { title: 'Governor', role: 'Governor of the U.S. Virgin Islands (2015-2019)' },
  
  // Academics
  'Deborah Rhode': { title: 'Professor', role: 'Professor of Law at Stanford University' },
  'Alan Dershowitz': { title: 'Professor', role: 'Professor Emeritus at Harvard Law School' },
  
  // Business Leaders
  'Larry Summers': { title: 'President', role: 'President of Harvard University (2001-2006)' },
  'Lloyd Blankfein': { title: 'CEO', role: 'CEO of Goldman Sachs (2006-2018)' },
};

async function applyKnownTitles() {
  console.log('=== Applying Known Titles with Years ===\n');

  let updated = 0;
  let notFound = 0;

  for (const [name, titleInfo] of Object.entries(KNOWN_TITLES)) {
    try {
      // Find entity by name (exact match first, then partial match)
      let query = `SELECT id, full_name, title, role FROM entities WHERE full_name = ? LIMIT 1`;
      let entity = databaseService.prepare(query).get(name) as any;
      
      // If no exact match, try partial match
      if (!entity) {
        query = `SELECT id, full_name, title, role FROM entities WHERE full_name LIKE ? LIMIT 1`;
        entity = databaseService.prepare(query).get(`%${name}%`) as any;
      }

      if (entity) {
        // Update with detailed title and role
        const updateQuery = `
          UPDATE entities 
          SET title = ?,
              role = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;
        
        databaseService.prepare(updateQuery).run(
          titleInfo.title,
          titleInfo.role,
          entity.id
        );

        console.log(`✅ Updated: ${name} → ${titleInfo.title} (${titleInfo.role})`);
        updated++;
      } else {
        console.log(`⚠️  Not found: ${name}`);
        notFound++;
      }
    } catch (error) {
      console.error(`❌ Error updating ${name}:`, error);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Not found: ${notFound}`);
  console.log(`Total: ${Object.keys(KNOWN_TITLES).length}\n`);
}

applyKnownTitles();
