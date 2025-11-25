"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var better_sqlite3_1 = __importDefault(require("better-sqlite3"));
var path_1 = __importDefault(require("path"));
var DB_PATH = path_1.default.join(__dirname, '../epstein-archive.db');
var db = new better_sqlite3_1.default(DB_PATH);
console.log('🚀 Starting Data Enrichment...');
// 1. Enrich Timeline Events
console.log('📅 Enriching Timeline Events...');
// Clear existing generic events if any (optional, but good for clean slate)
// db.prepare('DELETE FROM timeline_events').run();
var timelineEvents = [
    {
        date: '1991-01-01',
        type: 'Financial',
        title: 'Establishment of J. Epstein & Co.',
        description: 'Jeffrey Epstein establishes his own money management firm, J. Epstein & Co., claiming to manage assets for billionaires.',
        significance: 8
    },
    {
        date: '2002-09-15',
        type: 'Travel',
        title: 'Flight to Africa with Bill Clinton',
        description: 'Flight logs indicate a trip to Africa involving Jeffrey Epstein, Bill Clinton, and others aboard the "Lolita Express".',
        significance: 9
    },
    {
        date: '2005-01-01',
        type: 'Legal',
        title: 'Palm Beach Police Investigation Begins',
        description: 'Palm Beach Police Department begins investigating Epstein after a parent complains about his behavior towards their daughter.',
        significance: 10
    },
    {
        date: '2006-07-25',
        type: 'Legal',
        title: 'Epstein Indicted in Florida',
        description: 'Jeffrey Epstein is indicted by a grand jury in Palm Beach County, Florida, on solicitation of prostitution charges.',
        significance: 10
    },
    {
        date: '2008-06-30',
        type: 'Legal',
        title: 'Non-Prosecution Agreement Signed',
        description: 'Epstein signs a controversial non-prosecution agreement with federal prosecutors, granting him and potential co-conspirators immunity.',
        significance: 10
    },
    {
        date: '2019-07-06',
        type: 'Legal',
        title: 'Epstein Arrested in New York',
        description: 'Jeffrey Epstein is arrested at Teterboro Airport in New Jersey on federal charges of sex trafficking of minors.',
        significance: 10
    },
    {
        date: '2019-08-10',
        type: 'Legal',
        title: 'Epstein Found Dead',
        description: 'Jeffrey Epstein is found dead in his cell at the Metropolitan Correctional Center in New York City.',
        significance: 10
    },
    {
        date: '2000-01-01',
        type: 'Social',
        title: 'Ghislaine Maxwell Introduction',
        description: 'Ghislaine Maxwell reportedly introduces Epstein to Prince Andrew and other high-profile figures around this time.',
        significance: 7
    },
    {
        date: '2015-01-02',
        type: 'Legal',
        title: 'Virginia Giuffre Lawsuit',
        description: 'Virginia Giuffre files a defamation lawsuit against Ghislaine Maxwell, bringing many details to public light.',
        significance: 9
    },
    {
        date: '2011-03-01',
        type: 'Financial',
        title: 'JP Morgan Relationship Ends',
        description: 'JP Morgan Chase reportedly ends its client relationship with Jeffrey Epstein.',
        significance: 6
    }
];
var insertEvent = db.prepare("\n  INSERT INTO timeline_events (event_date, event_type, title, description, significance_score)\n  VALUES (@date, @type, @title, @description, @significance)\n");
db.transaction(function () {
    for (var _i = 0, timelineEvents_1 = timelineEvents; _i < timelineEvents_1.length; _i++) {
        var event_1 = timelineEvents_1[_i];
        // Check if event exists to avoid duplicates
        var exists = db.prepare('SELECT 1 FROM timeline_events WHERE title = ?').get(event_1.title);
        if (!exists) {
            insertEvent.run(event_1);
            console.log("   + Added event: ".concat(event_1.title));
        }
    }
})();
// 2. Enrich Document Summaries
console.log('📄 Enriching Document Summaries...');
// Map of filename patterns to better titles/summaries
var documentEnrichments = [
    {
        pattern: 'Flight_Logs',
        title: 'Flight Manifests (1995-2013)',
        summary: 'Detailed logs of flights on Epstein\'s private aircraft, listing passengers, dates, and destinations including Little St. James and New York.'
    },
    {
        pattern: 'Black_Book',
        title: 'Epstein\'s "Little Black Book"',
        summary: 'A contact book containing names, phone numbers, and addresses of hundreds of high-profile individuals connected to Epstein.'
    },
    {
        pattern: 'Indictment',
        title: '2019 Federal Indictment',
        summary: 'The federal indictment charging Jeffrey Epstein with sex trafficking of minors and conspiracy to commit sex trafficking.'
    },
    {
        pattern: 'Police_Report',
        title: 'Palm Beach Police Reports',
        summary: 'Initial police reports and witness statements from the 2005 investigation in Palm Beach, Florida.'
    },
    {
        pattern: 'Settlement',
        title: 'Civil Settlement Agreement',
        summary: 'Legal documents detailing settlement agreements between Epstein and victims.'
    },
    {
        pattern: 'Email',
        title: 'Correspondence Records',
        summary: 'Email communications revealing interactions between Epstein and various associates.'
    }
];
var updateDoc = db.prepare("\n  UPDATE documents \n  SET title = @title, \n      summary = @summary,\n      content_preview = @summary\n  WHERE file_name LIKE @pattern\n");
db.transaction(function () {
    for (var _i = 0, documentEnrichments_1 = documentEnrichments; _i < documentEnrichments_1.length; _i++) {
        var enrichment = documentEnrichments_1[_i];
        var info = updateDoc.run({
            title: enrichment.title,
            summary: enrichment.summary,
            pattern: "%".concat(enrichment.pattern, "%")
        });
        if (info.changes > 0) {
            console.log("   + Updated ".concat(info.changes, " documents matching \"").concat(enrichment.pattern, "\""));
        }
    }
})();
// 3. Ensure Black Book Entries are linked (Basic check)
console.log('📖 Checking Black Book Entries...');
var blackBookCount = db.prepare('SELECT COUNT(*) as count FROM black_book_entries').get();
console.log("   Current Black Book Entries: ".concat(blackBookCount.count));
console.log('✅ Data Enrichment Complete!');
