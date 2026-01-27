
import { statsRepository } from './src/server/db/statsRepository';
import { getDb } from './src/server/db/connection';
import Database from 'better-sqlite3';
import path from 'path';

// Mock getDb since we are not running the full server
const DB_PATH = path.join(process.cwd(), 'epstein-archive.db');
console.log(`Using DB: ${DB_PATH}`);

// We need to mock the connection module or just instantiate DB directly and overwrite the getDb function if possible
// But simpler to just copy the query and run it directly with better-sqlite3

const db = new Database(DB_PATH);

const query = `
      SELECT 
        CASE 
          -- Trump variants -> Donald Trump (ONLY actual person references)
          WHEN (full_name = 'Donald Trump' OR full_name = 'President Trump' OR full_name = 'Mr Trump'
                OR full_name = 'Trump' OR full_name = 'Donald J Trump' OR full_name = 'Donald J. Trump')
          THEN 'Donald Trump'
          -- Epstein variants -> Jeffrey Epstein  
          WHEN (full_name = 'Jeffrey Epstein' OR full_name = 'Epstein' OR full_name = 'Jeffrey'
                OR full_name = 'Jeff Epstein' OR full_name = 'Mr Epstein')
          THEN 'Jeffrey Epstein'
          -- Maxwell variants -> Ghislaine Maxwell
          WHEN (full_name = 'Ghislaine Maxwell' OR full_name = 'Maxwell' OR full_name = 'Ghislaine'
                OR full_name = 'Ms Maxwell' OR full_name = 'Miss Maxwell')
          THEN 'Ghislaine Maxwell'
          -- Clinton variants -> Bill Clinton (excluding Hillary)
          WHEN (full_name = 'Bill Clinton' OR full_name = 'President Clinton' OR full_name = 'Mr Clinton'
                OR full_name = 'Clinton' OR full_name = 'William Clinton')
                AND lower(full_name) NOT LIKE '%hillary%' AND lower(full_name) NOT LIKE '%chelsea%'
          THEN 'Bill Clinton'
          -- Prince Andrew
          WHEN (full_name = 'Prince Andrew' OR full_name = 'Duke of York' OR full_name = 'Andrew'
                OR lower(full_name) LIKE '%prince andrew%')
          THEN 'Prince Andrew'
          -- Dershowitz
          WHEN (full_name = 'Alan Dershowitz' OR full_name = 'Dershowitz' OR full_name = 'Mr Dershowitz')
          THEN 'Alan Dershowitz'
          -- Ivanka Trump (separate person)
          WHEN full_name = 'Ivanka Trump' OR full_name = 'Ivanka'
          THEN 'Ivanka Trump'
          -- Melania Trump (separate person)
          WHEN full_name = 'Melania Trump' OR full_name = 'Melania'
          THEN 'Melania Trump'
          ELSE full_name
        END as name,
        SUM(mentions) as mentions,
        MAX(red_flag_rating) as redFlagRating
      FROM entities
      WHERE mentions > 0 
      AND (entity_type = 'Person' OR entity_type IS NULL)
      AND length(full_name) > 3
      GROUP BY name
      ORDER BY mentions DESC
      LIMIT 30
`;

try {
  const rows = db.prepare(query).all();
  console.log('Top Entities Debug Output:');
  const epstein = rows.find((r: any) => r.name === 'Jeffrey Epstein');
  console.log('Jeffrey Epstein entry:', epstein);
  
  if (!epstein) {
      console.log('Jeffrey Epstein NOT FOUND in top 30');
      // Search specifically for him
      const specific = db.prepare("SELECT * FROM entities WHERE full_name LIKE '%Epstein%' LIMIT 5").all();
      console.log('Specific DB lookup:', specific);
  }

} catch (err) {
  console.error(err);
}
