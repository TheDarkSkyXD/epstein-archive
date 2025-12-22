
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

console.log(`🚀 Seeding Global Timeline Events into ${DB_PATH}...`);

const EVENTS = [
  {
    title: 'Jeffrey Epstein Found Dead in Manhattan Jail',
    date: '2019-08-10',
    description: 'Jeffrey Epstein found dead in his Manhattan jail cell. Official ruling: suicide by hanging. This event marked a turning point in the investigation.',
    type: 'incident',
    significance: 'high',
    entities: JSON.stringify(['Jeffrey Epstein', 'Manhattan Correctional Center', 'William Barr'])
  },
  {
    title: 'FBI Arrests Epstein at Teterboro Airport',
    date: '2019-07-06',
    description: 'Jeffrey Epstein arrested at Teterboro Airport on federal sex trafficking charges. The arrest reopened the investigation into his alleged trafficking network.',
    type: 'legal',
    significance: 'high',
    entities: JSON.stringify(['Jeffrey Epstein', 'FBI', 'SDNY'])
  },
  {
    title: 'SDNY Indictment Unsealed',
    date: '2019-07-08',
    description: 'Federal prosecutors unseal indictment charging Epstein with sex trafficking and conspiracy to commit sex trafficking.',
    type: 'legal',
    significance: 'high',
    entities: JSON.stringify(['Jeffrey Epstein', 'SDNY', 'Geoffrey Berman'])
  },
  {
    title: 'Florida Plea Deal Signed',
    date: '2008-06-30',
    description: 'Epstein signs controversial non-prosecution agreement with federal prosecutors in Florida, granting immunity to potential co-conspirators.',
    type: 'legal',
    significance: 'high',
    entities: JSON.stringify(['Jeffrey Epstein', 'Alexander Acosta', 'Ken Starr'])
  },
  {
    title: 'Palm Beach Police Begin Investigation',
    date: '2006-05-01',
    description: 'Palm Beach Police Department opens "Project Pedophile" investigation after complaints from parents.',
    type: 'incident',
    significance: 'high',
    entities: JSON.stringify(['Jeffrey Epstein', 'Palm Beach Police'])
  },
  {
    title: 'Ghislaine Maxwell Arrested',
    date: '2020-07-02',
    description: 'Ghislaine Maxwell arrested in New Hampshire on federal charges related to her role in Epstein\'s abuse of minors.',
    type: 'legal',
    significance: 'high',
    entities: JSON.stringify(['Ghislaine Maxwell', 'FBI'])
  },
  {
    title: 'Maxwell Convicted',
    date: '2021-12-29',
    description: 'Ghislaine Maxwell found guilty on five of six counts relating to sex trafficking.',
    type: 'legal',
    significance: 'high',
    entities: JSON.stringify(['Ghislaine Maxwell', 'SDNY'])
  },
  {
    title: 'Purchase of Little St. James',
    date: '1998-01-01', // Approximate
    description: 'Epstein purchases Little St. James island in the US Virgin Islands, which would become a primary location for alleged abuse.',
    type: 'other',
    significance: 'medium',
    entities: JSON.stringify(['Jeffrey Epstein', 'Little St. James'])
  },
  {
    title: 'Purchase of NYC Mansion',
    date: '1989-01-01', // Approximate
    description: 'Les Wexner transfers the Herbert N. Straus House to Epstein, one of the largest private homes in Manhattan.',
    type: 'financial',
    significance: 'medium',
    entities: JSON.stringify(['Jeffrey Epstein', 'Les Wexner', 'Manhattan'])
  },
  {
    title: 'First Documented Flight Log',
    date: '1995-01-01', // Illustrative date
    description: 'Earliest records in the Epstein flight logs begin to appear, documenting travel on the "Lolita Express".',
    type: 'flight',
    significance: 'medium',
    entities: JSON.stringify(['Jeffrey Epstein', 'Lolita Express'])
  },
  {
    title: 'Virginia Giuffre Files Civil Suit',
    date: '2015-09-21',
    description: 'Virginia Giuffre files defamation lawsuit against Ghislaine Maxwell, leading to the eventual release of sealed documents.',
    type: 'legal',
    significance: 'high',
    entities: JSON.stringify(['Virginia Giuffre', 'Ghislaine Maxwell'])
  },
  {
    title: 'Miami Herald "Perversion of Justice" Series',
    date: '2018-11-28',
    description: 'Julie K. Brown publishes investigative series exposing the 2008 plea deal and locating victims.',
    type: 'other',
    significance: 'high',
    entities: JSON.stringify(['Julie K. Brown', 'Miami Herald', 'Alexander Acosta'])
  },
   {
    title: 'Acosta Resigns as Labor Secretary',
    date: '2019-07-12',
    description: 'Alexander Acosta resigns following renewed scrutiny of his role in the 2008 plea deal.',
    type: 'incident',
    significance: 'medium',
    entities: JSON.stringify(['Alexander Acosta', 'Donald Trump'])
  },
   {
    title: 'Prince Andrew Interview',
    date: '2019-11-16',
    description: 'Prince Andrew gives disastrous BBC Newsnight interview regarding his friendship with Epstein.',
    type: 'incident',
    significance: 'medium',
    entities: JSON.stringify(['Prince Andrew', 'Emily Maitlis', 'BBC'])
  }
];

const insert = db.prepare(`
  INSERT INTO global_timeline_events (title, date, description, type, significance, entities)
  VALUES (@title, @date, @description, @type, @significance, @entities)
`);

const check = db.prepare('SELECT id FROM global_timeline_events WHERE title = ?');

let added = 0;
let skipped = 0;

db.transaction(() => {
  for (const event of EVENTS) {
    if (check.get(event.title)) {
        skipped++;
        continue;
    }
    insert.run(event);
    added++;
  }
})();

console.log(`✅ Done. Added ${added} events, skipped ${skipped} duplicates.`);
