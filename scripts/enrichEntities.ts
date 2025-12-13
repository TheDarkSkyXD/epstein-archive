/**
 * Entity Enrichment and Cleanup Script
 * 
 * This script:
 * 1. Removes garbage entities (OCR artifacts, single words, etc.)
 * 2. Enriches remaining entities with proper roles based on name patterns
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive-production.db');

// Garbage patterns - entities to delete
const GARBAGE_PATTERNS = [
  // Single common words that are OCR artifacts
  /^(Now|New|Line|Office|Number|Page|Date|Time|Name|File|Case|Room|Floor|Street|Avenue|Road|Drive|Lane|Court|Place|Way|Suite|Unit|Box|Building|Center|House|Hall|Tower|Plaza|Square|Park|Garden|Bridge|Point|Hill|View|Lake|River|Bay|Island|Beach|Mountain|Valley|Forest|Grove|Meadow|Field|Farm|Ranch|Estate|Manor|Castle|Palace|Villa|Cottage|Lodge|Inn|Hotel|Motel|Resort|Club|Bar|Cafe|Restaurant|Store|Shop|Market|Mall|Outlet|Depot|Warehouse|Factory|Plant|Mill|Mine|Port|Airport|Station|Terminal|Dock|Pier|Marina|Harbor|Camp|Base|Fort|Post|Site|Lot|Block|Zone|Area|Region|District|County|Parish|Borough|Township|Village|Town|City|Metro|Urban|Rural|North|South|East|West|Central|Upper|Lower|Old|New|Big|Little|Great|Grand|Royal|National|International|Global|World|Universal|General|Special|Standard|Premium|Elite|Select|Choice|Prime|Top|Best|First|Last|Next|Final|Total|Full|Complete|Whole|Entire|Every|All|Any|Some|Few|Many|Most|More|Less|Other|Same|Different|Similar|Various|Certain|Specific|Particular|Individual|Single|Double|Triple|Multiple|Usual|Normal|Regular|Common|Rare|Unique|Extra|Super|Ultra|Mega|Mini|Micro|Macro|Main|Major|Minor|Primary|Secondary|Basic|Advanced|Simple|Complex|Easy|Hard|Fast|Slow|Quick|Long|Short|High|Low|Deep|Shallow|Wide|Narrow|Thick|Thin|Heavy|Light|Strong|Weak|Hot|Cold|Warm|Cool|Dry|Wet|Fresh|Stale|Clean|Dirty|Clear|Cloudy|Bright|Dark|White|Black|Red|Blue|Green|Yellow|Orange|Purple|Pink|Brown|Gray|Silver|Gold|Bronze|Copper|Iron|Steel|Wood|Stone|Glass|Plastic|Metal|Paper|Cloth|Leather|Cotton|Silk|Wool|Nylon|Rubber|Oil|Gas|Water|Air|Fire|Earth|Sun|Moon|Star|Sky|Cloud|Rain|Snow|Wind|Storm|Thunder|Lightning|Ice|Heat|Cold|Energy|Power|Force|Pressure|Weight|Mass|Volume|Size|Length|Width|Height|Depth|Distance|Speed|Rate|Frequency|Angle|Shape|Form|Pattern|Style|Design|Color|Colour|Shade|Tone|Hue|Tint|Sound|Voice|Noise|Music|Song|Note|Tone|Beat|Rhythm|Melody|Harmony|Chord|Scale|Key|Pitch)$/i,
  
  // Very short names (likely OCR artifacts)
  /^[A-Z]{1,2}$/,
  /^[a-z]{1,3}$/i,
  
  // Numbers only
  /^\d+$/,
  /^[\d\s\-\.\,\/]+$/,
  
  // Single words that are common OCR mistakes
  /^(The|This|That|These|Those|Here|There|Where|When|What|Which|Who|Whom|Whose|Why|How|And|But|Or|Nor|For|Yet|So|If|Then|Than|As|At|By|In|On|To|Up|Of|Off|Out|Down|Over|Under|Into|Onto|Upon|From|With|Within|Without|Between|Among|Through|During|Before|After|Above|Below|Against|About|Around|Behind|Beside|Beyond|Inside|Outside|Across|Along|Near|Next|Past|Since|Until|Unto|Via|Per|Pro|Versus|Via|Re|Etc|Ie|Eg|Am|Is|Are|Was|Were|Be|Been|Being|Have|Has|Had|Having|Do|Does|Did|Doing|Done|Will|Would|Shall|Should|May|Might|Must|Can|Could|Ought|Need|Dare|Used|Let|Make|Made|See|Saw|Seen|Go|Went|Gone|Come|Came|Get|Got|Give|Gave|Take|Took|Put|Set|Say|Said|Tell|Told|Ask|Asked|Think|Thought|Know|Knew|Feel|Felt|Find|Found|Leave|Left|Call|Called|Keep|Kept|Try|Tried|Start|Started|Show|Showed|Hear|Heard|Play|Played|Move|Moved|Live|Lived|Believe|Believed|Hold|Held|Bring|Brought|Write|Wrote|Stand|Stood|Lose|Lost|Pay|Paid|Meet|Met|Include|Included|Continue|Continued|Learn|Learned|Change|Changed|Watch|Watched|Follow|Followed|Stop|Stopped|Speak|Spoke|Read|Create|Created|Spend|Spent|Grow|Grew|Open|Opened|Walk|Walked|Win|Won|Offer|Offered|Remember|Remembered|Consider|Considered|Appear|Appeared|Buy|Bought|Wait|Waited|Serve|Served|Die|Died|Send|Sent|Build|Built|Stay|Stayed|Fall|Fell|Cut|Remain|Remained|Suggest|Suggested|Raise|Raised|Pass|Passed|Sell|Sold|Require|Required|Report|Reported|Decide|Decided|Pull|Pulled|Pai|Capit)$/i,
  
  // Fragments and partial words
  /^[A-Z][a-z]{0,2}$/,
  
  // Contains only special characters
  /^[\W\s]+$/,
  
  // Page references
  /^Page\s*\d+$/i,
  /^P\.?\s*\d+$/i,
  
  // Common document artifacts
  /^(Exhibit|Attachment|Appendix|Schedule|Annex|Section|Chapter|Part|Article|Paragraph|Clause|Item|Entry|Record|Document|Form|Report|Statement|Letter|Notice|Order|Request|Response|Reply|Motion|Brief|Memo|Note|List|Table|Figure|Chart|Graph|Map|Photo|Image|Picture|Video|Audio|Tape|Disk|File|Folder|Binder|Box|Carton|Envelope|Package|Parcel|Bundle|Batch|Set|Group|Series|Collection|Archive|Database|System|Program|Software|Hardware|Device|Machine|Tool|Equipment|Instrument|Apparatus|Mechanism|Component|Module|Unit|Element|Part|Piece|Section|Segment|Portion|Fragment|Sample|Specimen|Example|Instance|Case|Situation|Circumstance|Condition|Status|State|Mode|Phase|Stage|Level|Degree|Grade|Class|Category|Type|Kind|Sort|Form|Format|Version|Edition|Release|Issue|Copy|Original|Duplicate|Replica|Model|Prototype|Template|Pattern|Standard|Specification|Requirement|Guideline|Procedure|Process|Method|Technique|Approach|Strategy|Plan|Scheme|Project|Program|Campaign|Initiative|Effort|Activity|Action|Step|Move|Task|Job|Work|Assignment|Duty|Responsibility|Function|Role|Position|Title|Rank|Status)$/i,
];

// Role classification patterns
const ROLE_PATTERNS: { pattern: RegExp; role: string }[] = [
  // Politicians
  { pattern: /\b(President|Senator|Congressman|Congresswoman|Governor|Mayor|Secretary|Ambassador|Minister|Chancellor|Prime Minister|Vice President|Representative|Delegate|Councilman|Councilwoman|Alderman|Commissioner|Assemblyman|Assemblywoman)\b/i, role: 'Politician' },
  { pattern: /\b(Trump|Clinton|Obama|Bush|Biden|Obama|Reagan|Carter|Nixon|Kennedy|Johnson|Ford|Eisenhower|Truman|Roosevelt|Wilson|Taft|McKinley)\b/i, role: 'Politician' },
  
  // Royalty
  { pattern: /\b(Prince|Princess|King|Queen|Duke|Duchess|Earl|Countess|Baron|Baroness|Lord|Lady|Sir|Dame|Viscount|Marquess|Marquis)\b/i, role: 'Royalty' },
  { pattern: /\b(Andrew|Charles|William|Harry|Edward|Philip|Elizabeth|Diana|Camilla|Kate|Meghan)\s+(of\s+)?(Wales|York|Cambridge|Sussex|Edinburgh|Kent|Gloucester)/i, role: 'Royalty' },
  
  // Lawyers/Legal
  { pattern: /\b(Attorney|Lawyer|Counsel|Solicitor|Barrister|Advocate|Litigator|Prosecutor|Defender|Judge|Justice|Magistrate|Arbiter|Mediator)\b/i, role: 'Lawyer' },
  { pattern: /\b(Dershowitz|Starr|Barr|Acosta|Epstein.*Attorney|Maxwell.*Lawyer)\b/i, role: 'Lawyer' },
  { pattern: /\bEsq\.?\b/i, role: 'Lawyer' },
  
  // Business/Finance
  { pattern: /\b(CEO|CFO|COO|CTO|Chairman|Chairwoman|Director|Executive|Manager|President|Vice\s*President|Partner|Principal|Founder|Owner|Investor|Trader|Broker|Banker|Financier|Entrepreneur|Businessman|Businesswoman|Billionaire|Millionaire|Tycoon|Mogul|Magnate)\b/i, role: 'Business Executive' },
  { pattern: /\b(Wexner|Black|Bronfman|Lauder|Murdoch|Bloomberg|Soros|Adelson|Koch|Walton|Bezos|Gates|Buffett|Zuckerberg)\b/i, role: 'Business Executive' },
  
  // Scientists/Academics
  { pattern: /\b(Professor|Doctor|Dr\.|PhD|Scientist|Researcher|Scholar|Academic|Dean|Provost|Chancellor|Rector|Fellow|Lecturer|Instructor)\b/i, role: 'Academic' },
  { pattern: /\b(Hawking|Krauss|Minsky|Pinker|Chomsky|Dawkins)\b/i, role: 'Scientist' },
  
  // Entertainment/Media
  { pattern: /\b(Actor|Actress|Singer|Musician|Artist|Performer|Entertainer|Celebrity|Model|Director|Producer|Writer|Author|Journalist|Reporter|Anchor|Host|Presenter|Comedian|Dancer)\b/i, role: 'Entertainment' },
  { pattern: /\b(Spacey|Woody Allen|Weinstein|Travolta|DiCaprio|Clooney|Pitt|Jolie|Aniston|Roberts|Hanks|Streep|Winfrey|DeGeneres)\b/i, role: 'Entertainment' },
  
  // Law Enforcement/Government
  { pattern: /\b(FBI|CIA|NSA|DEA|ATF|Secret Service|Police|Sheriff|Detective|Agent|Officer|Marshal|Trooper|Investigator|Inspector)\b/i, role: 'Law Enforcement' },
  { pattern: /\b(Comey|Mueller|McCabe|Strzok|Brennan|Clapper|Pompeo|Bolton)\b/i, role: 'Government Official' },
  
  // Medical
  { pattern: /\b(Doctor|Physician|Surgeon|Nurse|Therapist|Psychiatrist|Psychologist|Dentist|Pharmacist|Veterinarian|Paramedic|EMT)\b/i, role: 'Medical Professional' },
  
  // Key Figures (Epstein case specific)
  { pattern: /\b(Jeffrey\s*Epstein|Ghislaine\s*Maxwell|Jean-Luc\s*Brunel|Sarah\s*Kellen|Lesley\s*Groff|Nadia\s*Marcinkova)\b/i, role: 'Key Figure' },
  
  // Victims/Accusers (handle sensitively)
  { pattern: /\b(Virginia\s*(Giuffre|Roberts)|Courtney\s*Wild|Annie\s*Farmer|Maria\s*Farmer)\b/i, role: 'Accuser' },
  
  // Organizations
  { pattern: /\b(Inc\.?|Corp\.?|LLC|LLP|Ltd\.?|Company|Corporation|Foundation|Trust|Fund|Institute|Association|Society|Organization|Group|Agency|Bureau|Department|Office|Commission|Committee|Council|Board|Authority)\b/i, role: 'Organization' },
  { pattern: /\b(Bank|Financial|Capital|Investment|Securities|Holdings|Partners|Ventures|Management|Consulting|Services|Solutions|Systems|Technologies|Industries|Enterprises)\b/i, role: 'Corporation' },
  
  // Universities
  { pattern: /\b(University|College|School|Academy|Institute)\s+(of\s+)?[A-Z]/i, role: 'Educational Institution' },
  { pattern: /\b(Harvard|Yale|Princeton|Stanford|MIT|Columbia|Oxford|Cambridge|NYU|UCLA|USC|Berkeley)\b/i, role: 'University' },
  
  // Locations
  { pattern: /\b(Island|Beach|Resort|Hotel|Villa|Estate|Ranch|Farm|Manor|Castle|Palace|Mansion|Residence|Property)\b/i, role: 'Location' },
  { pattern: /\b(New York|Los Angeles|Miami|Palm Beach|London|Paris|Virgin Islands|Little St\. James|Zorro Ranch)\b/i, role: 'Location' },
  
  // Airlines/Travel
  { pattern: /\b(Airline|Airways|Aviation|Flight|Aircraft|Jet|Plane|Airport)\b/i, role: 'Aviation' },
  { pattern: /\b(Lolita Express|Boeing 727|Gulfstream)\b/i, role: 'Aircraft' },
];

function isGarbage(name: string): boolean {
  if (!name || name.length < 2) return true;
  
  // Check against garbage patterns
  for (const pattern of GARBAGE_PATTERNS) {
    if (pattern.test(name)) return true;
  }
  
  // Additional heuristics
  // Too short (less than 3 characters)
  if (name.replace(/\s/g, '').length < 3) return true;
  
  // All uppercase single word (likely abbreviation or OCR error)
  if (/^[A-Z]+$/.test(name) && name.length < 4) return true;
  
  // Mostly numbers
  const numCount = (name.match(/\d/g) || []).length;
  if (numCount > name.length / 2) return true;
  
  // Common OCR fragments
  const commonFragments = ['lhe', 'tbe', 'ibe', 'fhe', 'rhe', 'whe', 'che', 'ehe', 'ihe', 'ohe', 'ahe', 'uhe'];
  if (commonFragments.includes(name.toLowerCase())) return true;
  
  return false;
}

function classifyRole(name: string, currentRole: string): string {
  // If already has a non-Unknown role, keep it
  if (currentRole && currentRole !== 'Unknown') {
    return currentRole;
  }
  
  // Check against role patterns
  for (const { pattern, role } of ROLE_PATTERNS) {
    if (pattern.test(name)) {
      return role;
    }
  }
  
  // Heuristics for person names vs organizations
  const words = name.split(/\s+/);
  
  // Likely a person if has 2-4 words and starts with capital
  if (words.length >= 2 && words.length <= 4) {
    const allCapitalized = words.every(w => /^[A-Z]/.test(w));
    const hasCommonSuffix = /\b(Jr\.?|Sr\.?|III|IV|II)\b/i.test(name);
    
    if (allCapitalized || hasCommonSuffix) {
      return 'Person';
    }
  }
  
  // Check if it looks like an organization
  if (/\b(Inc|Corp|LLC|Ltd|Co|Association|Foundation|Institute|University|College|Bank|Group|Partners)\b/i.test(name)) {
    return 'Organization';
  }
  
  // Check if it looks like a location
  if (/\b(Street|Avenue|Road|Drive|Lane|Boulevard|Court|Place|Way|Circle|Square|Park|Building|Floor|Suite|Room)\b/i.test(name)) {
    return 'Location';
  }
  
  return 'Unknown';
}

async function main() {
  console.log('🔄 Starting entity enrichment and cleanup...\n');
  console.log(`📂 Database: ${DB_PATH}`);
  
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  
  // Get all entities
  const entities = db.prepare('SELECT id, full_name, primary_role, mentions FROM entities').all() as any[];
  console.log(`\n📊 Total entities: ${entities.length}`);
  
  // Phase 1: Delete garbage entities
  console.log('\n🗑️  Phase 1: Removing garbage entities...');
  
  const garbageIds: number[] = [];
  for (const entity of entities) {
    if (isGarbage(entity.full_name)) {
      garbageIds.push(entity.id);
    }
  }
  
  console.log(`   Found ${garbageIds.length} garbage entities to remove`);
  
  // Delete in batches
  const deleteStmt = db.prepare('DELETE FROM entities WHERE id = ?');
  const deleteRelStmt = db.prepare('DELETE FROM entity_relationships WHERE source_entity_id = ? OR target_entity_id = ?');
  
  let deletedCount = 0;
  const deleteTransaction = db.transaction(() => {
    for (const id of garbageIds) {
      deleteRelStmt.run(id, id);
      deleteStmt.run(id);
      deletedCount++;
      
      if (deletedCount % 1000 === 0) {
        console.log(`   Deleted ${deletedCount}/${garbageIds.length}...`);
      }
    }
  });
  
  deleteTransaction();
  console.log(`   ✅ Deleted ${deletedCount} garbage entities\n`);
  
  // Phase 2: Enrich remaining entities with roles
  console.log('📝 Phase 2: Enriching entity roles...');
  
  const remainingEntities = db.prepare('SELECT id, full_name, primary_role FROM entities WHERE primary_role = ? OR primary_role IS NULL').all('Unknown') as any[];
  console.log(`   Found ${remainingEntities.length} entities with Unknown role`);
  
  const updateStmt = db.prepare('UPDATE entities SET primary_role = ? WHERE id = ?');
  
  let enrichedCount = 0;
  const roleCounts: Record<string, number> = {};
  
  const enrichTransaction = db.transaction(() => {
    for (const entity of remainingEntities) {
      const newRole = classifyRole(entity.full_name, entity.primary_role);
      
      if (newRole !== 'Unknown') {
        updateStmt.run(newRole, entity.id);
        enrichedCount++;
        roleCounts[newRole] = (roleCounts[newRole] || 0) + 1;
      }
      
      if ((enrichedCount + 1) % 1000 === 0) {
        console.log(`   Enriched ${enrichedCount}...`);
      }
    }
  });
  
  enrichTransaction();
  console.log(`   ✅ Enriched ${enrichedCount} entities\n`);
  
  // Print role distribution
  console.log('📊 Role enrichment summary:');
  const sortedRoles = Object.entries(roleCounts).sort((a, b) => b[1] - a[1]);
  for (const [role, count] of sortedRoles) {
    console.log(`   ${role}: ${count}`);
  }
  
  // Final stats
  console.log('\n📊 Final statistics:');
  const finalStats = db.prepare(`
    SELECT primary_role, COUNT(*) as count 
    FROM entities 
    GROUP BY primary_role 
    ORDER BY count DESC 
    LIMIT 20
  `).all() as any[];
  
  for (const stat of finalStats) {
    console.log(`   ${stat.primary_role || 'NULL'}: ${stat.count}`);
  }
  
  const totalRemaining = db.prepare('SELECT COUNT(*) as count FROM entities').get() as any;
  const unknownRemaining = db.prepare("SELECT COUNT(*) as count FROM entities WHERE primary_role = 'Unknown' OR primary_role IS NULL").get() as any;
  
  console.log(`\n✅ Cleanup complete!`);
  console.log(`   Total entities: ${totalRemaining.count}`);
  console.log(`   Entities with Unknown role: ${unknownRemaining.count} (${((unknownRemaining.count / totalRemaining.count) * 100).toFixed(1)}%)`);
  console.log(`   Entities deleted: ${deletedCount}`);
  console.log(`   Entities enriched: ${enrichedCount}`);
  
  db.close();
}

main().catch(console.error);
