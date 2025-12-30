import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'epstein-archive.db');
const db = new Database(dbPath);

// Helper to find entity ID by name
function getEntityId(name: string): number | null {
  const row = db.prepare('SELECT id FROM entities WHERE full_name = ?').get(name) as { id: number } | undefined;
  return row ? row.id : null;
}

// Helper to find document ID by partial filename
function getDocumentId(partialName: string): number | null {
  const row = db.prepare('SELECT id FROM documents WHERE file_name LIKE ? LIMIT 1').get(`%${partialName}%`) as { id: number } | undefined;
  return row ? row.id : null;
}

const eventData = [
  // PART 1: 1980s - 2000
  {
    title: "First Overlap in NYC Money Scene",
    date: "1987-01-01",
    description: "Trump and Epstein begin spending winters in Palm Beach. Alan Dershowitz quipped you were 'a nobody' if you didn't know them.",
    type: "other",
    significance: "medium",
    entityNames: ["Donald Trump", "Jeffrey Epstein", "Alan Dershowitz"],
    source: "Business Insider"
  },
  {
    title: "Epstein Buys Palm Beach Mansion",
    date: "1990-01-01",
    description: "Epstein buys a mansion two miles from Mar-a-Lago, tightening the social loop between him and Trump.",
    type: "other",
    significance: "medium",
    entityNames: ["Donald Trump", "Jeffrey Epstein"],
    source: "Business Insider"
  },
  {
    title: "Mar-a-Lago Party Footage",
    date: "1992-11-01",
    description: "NBC cameras capture Trump and Epstein ogling NFL cheerleaders at a 'bachelor life' party in Mar-a-Lago. Footage later airs in 2019.",
    type: "incident",
    significance: "high",
    entityNames: ["Donald Trump", "Jeffrey Epstein"],
    source: "The Guardian"
  },
  {
    title: "Calendar-Girls Party",
    date: "1992-11-15",
    description: "Organiser George Houraney says only two men showed—Trump and Epstein—plus 28 models.",
    type: "incident",
    significance: "high",
    entityNames: ["Donald Trump", "Jeffrey Epstein"],
    source: "Business Insider"
  },
  {
    title: "Multiple Photos Together",
    date: "1997-01-01",
    description: "Multiple photos show Trump and Epstein together in Palm Beach and at a Victoria's Secret after-party in NYC.",
    type: "other",
    significance: "medium",
    entityNames: ["Donald Trump", "Jeffrey Epstein"],
    source: "Business Insider"
  },
  {
    title: "Maxwell & Giuffre Threads",
    date: "1999-01-01",
    description: "Virginia Giuffre testifies she was recruited at Mar-a-Lago in 1999. Ghislaine Maxwell often seen in photos with Trump/Epstein.",
    type: "legal",
    significance: "high",
    entityNames: ["Donald Trump", "Ghislaine Maxwell", "Virginia Giuffre", "Jeffrey Epstein"],
    docMatch: "Black Book",
    source: "Business Insider"
  },
  {
    title: "Epstein Brags About Melania Introduction",
    date: "1998-01-01",
    description: "Epstein brags he introduced Trump to Melania; unverified but often repeated in investigative reports.",
    type: "other",
    significance: "medium",
    entityNames: ["Donald Trump", "Jeffrey Epstein", "Melania Trump"],
    source: "Business Insider"
  },
  {
    title: "Little Black Book & Flight Logs",
    date: "1997-01-01",
    description: "Epstein's 'little black book' lists 14 Trump-related numbers; Trump flies at least once on Epstein's 727, per flight logs.",
    type: "document",
    significance: "high",
    entityNames: ["Donald Trump", "Jeffrey Epstein"],
    docMatch: "FLIGHT LOGS",
    source: "Business Insider"
  },
  // PART 2: 2001 - 2014
  {
    title: "Real-Estate Showdown (Maison de l'Amitié)",
    date: "2004-01-01",
    description: "Bankruptcy auction: Trump and Epstein wage a bidding war; Trump wins at ~$41 million. This feuded eventually killed the friendship.",
    type: "financial",
    significance: "high",
    entityNames: ["Donald Trump", "Jeffrey Epstein"],
    source: "Washington Post"
  },
  {
    title: "Mar-a-Lago Ban",
    date: "2007-01-01",
    description: "Attorneys for Epstein's victims later state Trump banned Epstein from the club after hearing Epstein 'sexually assaulted an underage girl' on-site.",
    type: "incident",
    significance: "high",
    entityNames: ["Donald Trump", "Jeffrey Epstein"],
    source: "The Washington Post"
  },
  {
    title: "Police Investigation & 'Sweetheart' Plea",
    date: "2005-01-01",
    description: "Palm Beach police open a case in 2005; by 2008 Epstein cuts a federal non-prosecution deal brokered by Alex Acosta.",
    type: "legal",
    significance: "high",
    entityNames: ["Jeffrey Epstein", "Alexander Acosta"],
    source: "The Washington Post"
  },
  {
    title: "Trump Helps Accusers",
    date: "2009-01-01",
    description: "Victims' lawyer Brad Edwards says Trump was 'the only person who picked up the phone' and offered information in 2009.",
    type: "legal",
    significance: "high",
    entityNames: ["Donald Trump", "Virginia Giuffre", "Jeffrey Epstein"],
    source: "Washington Post"
  },
  // PART 3: 2015 - 2025
  {
    title: "Trump's Public Denials",
    date: "2019-07-09",
    description: "Asked about Epstein's arrest, Trump says he hasn't spoken to him 'in 15 years' and 'was not a fan.'",
    type: "other",
    significance: "medium",
    entityNames: ["Donald Trump", "Jeffrey Epstein"],
    source: "Washington Post"
  },
  {
    title: "Epstein's Death",
    date: "2019-08-10",
    description: "Epstein dies by suicide in a federal jail; DOJ IG (2023) re-affirms suicide finding.",
    type: "incident",
    significance: "high",
    entityNames: ["Jeffrey Epstein"],
    source: "DOJ Inspector General"
  },
  {
    title: "Maxwell Conviction",
    date: "2021-12-29",
    description: "Maxwell convicted of sex-trafficking minors; sentenced to 20 years in federal prison.",
    type: "legal",
    significance: "high",
    entityNames: ["Ghislaine Maxwell"],
    docMatch: "Maxwell Exhibit",
    source: "Federal Court Records"
  },
  {
    title: "Wolff Tapes Released",
    date: "2024-11-01",
    description: "Michael Wolff releases 2017 audio of Epstein boasting he was Trump's 'closest friend'. Trump's camp calls it 'pure fiction.'",
    type: "incident",
    significance: "high",
    entityNames: ["Michael Wolff", "Donald Trump", "Jeffrey Epstein"],
    docMatch: "Fire and Fury",
    source: "The Guardian"
  },
  {
    title: "Phase 1 File Release",
    date: "2025-02-27",
    description: "AG Pam Bondi declassifies a thin batch of files related to the Epstein investigation. MAGA influencers call it a 'nothing-burger.'",
    type: "legal",
    significance: "high",
    entityNames: ["Jeffrey Epstein"],
    source: "The Washington Post"
  },
  {
    title: "Elon Musk's Claims",
    date: "2025-06-06",
    description: "Elon Musk claims 'Trump is in the secret Epstein files'—though no evidence is provided.",
    type: "other",
    significance: "medium",
    entityNames: ["Elon Musk", "Donald Trump"],
    source: "Business Insider"
  },
  {
    title: "DOJ/FBI Memo",
    date: "2025-07-01",
    description: "Concludes there is no 'client list,' no evidence Trump was extorted, and Epstein died by suicide.",
    type: "legal",
    significance: "high",
    entityNames: ["Donald Trump", "Jeffrey Epstein"],
    source: "Axios, DOJ"
  },
  {
    title: "House Democrats' Demand",
    date: "2025-07-08",
    description: "Jamie Raskin & Dan Goldman accuse DOJ of shielding Trump; demand unredacted files.",
    type: "legal",
    significance: "medium",
    entityNames: ["Donald Trump"],
    source: "The Guardian"
  },
  {
    title: "MAGA Backlash",
    date: "2025-07-09",
    description: "Pro-Trump influencers turn on Bondi, alleging a cover-up. Trump urges focus on 'real scandals.'",
    type: "incident",
    significance: "medium",
    entityNames: ["Donald Trump"],
    source: "Politico"
  },
  {
    title: "Final DOJ Statement",
    date: "2025-07-10",
    description: "DOJ says no further releases planned; watchdogs vow FOIA suits.",
    type: "legal",
    significance: "medium",
    entityNames: ["Jeffrey Epstein"],
    source: "Business Insider"
  },
  // VIDEO EVIDENCE
  {
    title: "Documentary: epstein harmed over 1,000 victims but no 'client list'",
    date: "2024-01-01",
    description: "Coffeezilla-style breakdown of the newly leaked FBI/DOJ memo: it confirms Epstein abused well over 1,000 victims, yet the Bureau says no 'client list' exists.",
    type: "other",
    significance: "high",
    entityNames: ["Jeffrey Epstein", "Donald Trump"],
    source: "voidzilla (YouTube)"
  },
  {
    title: "Investigation: new epstein footage is a disaster",
    date: "2024-02-01",
    description: "Dissects the 10-hour prison-cell video released by DOJ. Highlights a mysterious 60-second blackout and camera switch-overs.",
    type: "incident",
    significance: "high",
    entityNames: ["Jeffrey Epstein"],
    source: "voidzilla (YouTube)"
  }
];

console.log('--- Comprehensive Timeline Seeding ---');

const insert = db.prepare(`
  INSERT INTO global_timeline_events (title, date, description, type, significance, entities, related_document_id, source)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

db.transaction(() => {
  console.log('Cleaning existing global_timeline_events...');
  db.prepare('DELETE FROM global_timeline_events').run();
  
  let count = 0;
  for (const event of eventData) {
    // Resolve entities
    const entityIds = event.entityNames
      .map(name => getEntityId(name))
      .filter(id => id !== null) as number[];
    
    // Resolve document
    const docId = event.docMatch ? getDocumentId(event.docMatch) : null;
    
    insert.run(
      event.title,
      event.date,
      event.description,
      event.type,
      event.significance,
      JSON.stringify(entityIds),
      docId,
      event.source
    );
    count++;
  }
  console.log(`Successfully seeded ${count} human-readable events.`);
})();

db.close();
console.log('--- Done ---');
