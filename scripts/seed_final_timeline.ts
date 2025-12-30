import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'epstein-archive.db');
const db = new Database(dbPath);

const events = [
  // PART 1
  {
    title: "First Overlap in NYC Money Scene",
    date: "1987-01-01",
    description: "Trump and Epstein begin spending winters in Palm Beach. Alan Dershowitz quipped you were 'a nobody' if you didn't know them.",
    type: "other",
    significance: "medium",
    entities: [2343, 112], // Trump, Epstein
    source: "Business Insider"
  },
  {
    title: "Epstein Buys Palm Beach Mansion",
    date: "1990-01-01",
    description: "Epstein buys a mansion two miles from Mar-a-Lago, tightening the social loop between him and Trump.",
    type: "other",
    significance: "medium",
    entities: [2343, 112],
    source: "Business Insider"
  },
  {
    title: "Mar-a-Lago Party Footage",
    date: "1992-11-01",
    description: "NBC cameras capture Trump and Epstein ogling NFL cheerleaders at a 'bachelor life' party in Mar-a-Lago. Footage later airs in 2019.",
    type: "incident",
    significance: "high",
    entities: [2343, 112],
    source: "The Guardian"
  },
  {
    title: "Calendar-Girls Party",
    date: "1992-11-15",
    description: "Organiser George Houraney says only two men showed—Trump and Epstein—plus 28 models.",
    type: "incident",
    significance: "high",
    entities: [2343, 112],
    source: "Business Insider"
  },
  {
    title: "Multiple Photos Together",
    date: "1997-01-01",
    description: "Multiple photos show Trump and Epstein together in Palm Beach and at a Victoria's Secret after-party in NYC.",
    type: "other",
    significance: "medium",
    entities: [2343, 112],
    source: "Business Insider"
  },
  {
    title: "Maxwell & Giuffre Threads",
    date: "1999-01-01",
    description: "Virginia Giuffre testifies she was recruited at Mar-a-Lago in 1999. Ghislaine Maxwell often seen in photos with Trump/Epstein.",
    type: "legal",
    significance: "high",
    entities: [2343, 288, 2245, 112], // Trump, Maxwell, Giuffre, Epstein
    related_document_id: 2319, // Black Book OCR
    source: "Business Insider"
  },
  {
    title: "Epstein Brags About Melania Introduction",
    date: "1998-01-01",
    description: "Epstein brags he introduced Trump to Melania; unverified but often repeated in investigative reports.",
    type: "other",
    significance: "medium",
    entities: [2343, 112, 26082], 
    source: "Business Insider"
  },
  {
    title: "Little Black Book & Flight Logs",
    date: "1997-01-01",
    description: "Epstein's 'little black book' lists 14 Trump-related numbers; Trump flies at least once on Epstein's 727, per flight logs.",
    type: "document",
    significance: "high",
    entities: [2343, 112],
    related_document_id: 51119, // Flight Logs
    source: "Business Insider"
  },
  // PART 2
  {
    title: "Real-Estate Showdown (Maison de l'Amitié)",
    date: "2004-01-01",
    description: "Bankruptcy auction: Trump and Epstein wage a bidding war; Trump wins at ~$41 million. This feuded eventually killed the friendship.",
    type: "financial",
    significance: "high",
    entities: [2343, 112],
    source: "Washington Post"
  },
  {
    title: "Trump Bans Epstein from Mar-a-Lago",
    date: "2007-01-01",
    description: "Trump bans Epstein from Mar-a-Lago after hearing Epstein 'sexually assaulted an underage girl' on-site at the club.",
    type: "incident",
    significance: "high",
    entities: [2343, 112],
    source: "Washington Post"
  },
  {
    title: "Trump Helps Accusers",
    date: "2009-01-01",
    description: "Victims' lawyer Brad Edwards says Trump was 'the only person who picked up the phone' and offered information in 2009.",
    type: "legal",
    significance: "high",
    entities: [2343, 2245, 112], // Trump, Giuffre, Epstein
    source: "Washington Post"
  },
  // PART 3
  {
    title: "Trump's Public Denials",
    date: "2019-07-09",
    description: "Asked about Epstein's arrest, Trump says he hasn't spoken to him 'in 15 years' and 'was not a fan.'",
    type: "other",
    significance: "medium",
    entities: [2343, 112],
    source: "Washington Post"
  },
  {
    title: "Epstein's Death",
    date: "2019-08-10",
    description: "Epstein dies by suicide in a federal jail; DOJ IG (2023) re-affirms suicide finding.",
    type: "incident",
    significance: "high",
    entities: [112],
    source: "DOJ Inspector General"
  },
  {
    title: "Maxwell Conviction",
    date: "2021-12-29",
    description: "Maxwell convicted of sex-trafficking minors; sentenced to 20 years in federal prison.",
    type: "legal",
    significance: "high",
    entities: [288],
    related_document_id: 51123,
    source: "Federal Court Records"
  },
  {
    title: "Maxwell Appeals Process",
    date: "2024-09-01",
    description: "Maxwell loses her 2nd-Circuit appeal and petitions the U.S. Supreme Court.",
    type: "legal",
    significance: "medium",
    entities: [288],
    source: "The Guardian"
  },
  {
    title: "Wolff Tapes Released",
    date: "2024-11-01",
    description: "Michael Wolff releases 2017 audio of Epstein boasting he was Trump's 'closest friend'. Trump's camp calls it 'pure fiction.'",
    type: "incident",
    significance: "high",
    entities: [157, 2343, 112],
    related_document_id: 21209,
    source: "The Guardian"
  },
  {
    title: "Phase 1 File Release",
    date: "2025-02-27",
    description: "AG Pam Bondi declassifies a thin batch of files related to the Epstein investigation.",
    type: "legal",
    significance: "high",
    entities: [112],
    source: "The Washington Post"
  },
  {
    title: "Elon Musk's Claims",
    date: "2025-06-06",
    description: "Elon Musk claims 'Trump is in the secret Epstein files'—though no evidence is provided.",
    type: "other",
    significance: "medium",
    entities: [4853, 2343],
    source: "Business Insider"
  }
];

console.log('Seeding COMPLETE normalized timeline events...');

const insert = db.prepare(`
  INSERT INTO global_timeline_events (title, date, description, type, significance, entities, related_document_id, source)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

db.transaction(() => {
  db.prepare('DELETE FROM global_timeline_events').run();
  
  for (const event of events) {
    insert.run(
      event.title,
      event.date,
      event.description,
      event.type,
      event.significance,
      JSON.stringify(event.entities),
      (event as any).related_document_id || null,
      event.source
    );
  }
})();

console.log(`Successfully seeded ${events.length} human-readable events.`);
db.close();
