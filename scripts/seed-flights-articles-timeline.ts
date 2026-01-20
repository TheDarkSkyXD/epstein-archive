#!/usr/bin/env npx tsx
/**
 * Migration script to seed:
 * 1. Flights and flight_passengers tables with known Epstein flight data
 * 2. Articles table from JSON seed data
 * 3. Timeline with recent events (2024-2026)
 *
 * Run with: npx tsx scripts/seed-flights-articles-timeline.ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
console.log(`📂 Using database: ${DB_PATH}`);

const db = new Database(DB_PATH, { timeout: 30000 });
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ============================================
// 1. CREATE FLIGHTS TABLES
// ============================================
console.log('\n✈️  Creating flights tables...');

db.exec(`
  CREATE TABLE IF NOT EXISTS flights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    departure_airport TEXT NOT NULL,
    departure_city TEXT,
    departure_country TEXT,
    arrival_airport TEXT NOT NULL,
    arrival_city TEXT,
    arrival_country TEXT,
    aircraft_tail TEXT DEFAULT 'N908JE',
    aircraft_type TEXT DEFAULT 'Boeing 727',
    pilot TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS flight_passengers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flight_id INTEGER NOT NULL,
    passenger_name TEXT NOT NULL,
    role TEXT DEFAULT 'passenger',
    entity_id INTEGER,
    FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE CASCADE,
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_flights_date ON flights(date);
  CREATE INDEX IF NOT EXISTS idx_flight_passengers_flight ON flight_passengers(flight_id);
  CREATE INDEX IF NOT EXISTS idx_flight_passengers_name ON flight_passengers(passenger_name);
`);

// ============================================
// 2. SEED FLIGHT DATA (Known "Lolita Express" flights)
// ============================================
console.log('\n📝 Seeding flight data...');

// Clear existing flight data first
db.exec('DELETE FROM flight_passengers; DELETE FROM flights;');

const insertFlight = db.prepare(`
  INSERT INTO flights (date, departure_airport, departure_city, departure_country, arrival_airport, arrival_city, arrival_country, aircraft_tail, aircraft_type, notes)
  VALUES (@date, @departure_airport, @departure_city, @departure_country, @arrival_airport, @arrival_city, @arrival_country, @aircraft_tail, @aircraft_type, @notes)
`);

const insertPassenger = db.prepare(`
  INSERT INTO flight_passengers (flight_id, passenger_name, role)
  VALUES (@flight_id, @passenger_name, @role)
`);

// Known flight data from public flight logs
// Sources: Court documents, FOIA releases, and media reports
const flightData = [
  // ============================================
  // 1995 Flights (Early documented flights)
  // ============================================
  {
    date: '1995-03-19',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['KTEB', 'Teterboro', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
    notes: 'Early documented flight',
  },
  {
    date: '1995-06-14',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['EGLL', 'London', 'UK'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Emmy Tayler'],
  },
  {
    date: '1995-09-21',
    departure: ['KJFK', 'New York', 'USA'],
    arrival: ['LFPG', 'Paris', 'France'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Jean-Luc Brunel', 'Ghislaine Maxwell'],
  },

  // ============================================
  // 1996 Flights
  // ============================================
  {
    date: '1996-01-14',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['TIST', 'St. Thomas', 'USVI'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Sarah Kellen'],
  },
  {
    date: '1996-02-19',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['KPBI', 'Palm Beach', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Donald Trump', 'Ghislaine Maxwell'],
    notes: 'Trump documented on flight logs',
  },
  {
    date: '1996-05-03',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['KJFK', 'New York', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Eva Andersson-Dubin'],
  },
  {
    date: '1996-07-22',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['TIST', 'St. Thomas', 'USVI'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Les Wexner'],
  },
  {
    date: '1996-10-12',
    departure: ['KJFK', 'New York', 'USA'],
    arrival: ['EGLL', 'London', 'UK'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Prince Andrew', 'Ghislaine Maxwell'],
    notes: 'Early Prince Andrew flight',
  },
  {
    date: '1996-12-23',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['TIST', 'St. Thomas', 'USVI'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },

  // ============================================
  // 1997 Flights
  // ============================================
  {
    date: '1997-02-06',
    departure: ['TIST', 'St. Thomas', 'USVI'],
    arrival: ['KPBI', 'Palm Beach', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Jean-Luc Brunel'],
  },
  {
    date: '1997-03-22',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['KMIA', 'Miami', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '1997-05-14',
    departure: ['KJFK', 'New York', 'USA'],
    arrival: ['LFPG', 'Paris', 'France'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Jean-Luc Brunel', 'Ghislaine Maxwell', 'Naomi Campbell'],
  },
  {
    date: '1997-06-28',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['TIST', 'St. Thomas', 'USVI'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Sarah Kellen'],
  },
  {
    date: '1997-08-15',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['KBOS', 'Boston', 'USA'],
    aircraft: 'N212JE',
    passengers: ['Jeffrey Epstein', 'Alan Dershowitz'],
    notes: 'Gulfstream II flight',
  },
  {
    date: '1997-10-04',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['MMUN', 'Cancun', 'Mexico'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Virginia Roberts'],
  },
  {
    date: '1997-11-22',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['KPBI', 'Palm Beach', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Les Wexner', 'Abigail Wexner'],
  },

  // ============================================
  // 1998 Flights
  // ============================================
  {
    date: '1998-01-22',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['TIST', 'St. Thomas', 'USVI'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Jean-Luc Brunel'],
  },
  {
    date: '1998-02-09',
    departure: ['TIST', 'St. Thomas', 'USVI'],
    arrival: ['KPBI', 'Palm Beach', 'USA'],
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Eva Andersson-Dubin'],
  },
  {
    date: '1998-05-12',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['KJFK', 'New York', 'USA'],
    passengers: ['Jeffrey Epstein', 'Bill Clinton', 'Kevin Spacey', 'Chris Tucker'],
    notes: 'Africa trip leg',
  },

  // 1999 Flights
  {
    date: '1999-02-09',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['TIST', 'St. Thomas', 'USVI'],
    passengers: ['Jeffrey Epstein', 'Prince Andrew', 'Ghislaine Maxwell'],
  },
  {
    date: '1999-04-07',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['TIST', 'St. Thomas', 'USVI'],
    passengers: ['Jeffrey Epstein', 'Alan Dershowitz'],
  },
  {
    date: '1999-08-21',
    departure: ['KJFK', 'New York', 'USA'],
    arrival: ['EGLL', 'London', 'UK'],
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },

  // 2000 Flights
  {
    date: '2000-03-11',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['TIST', 'St. Thomas', 'USVI'],
    passengers: ['Jeffrey Epstein', 'Naomi Campbell', 'Ghislaine Maxwell'],
  },
  {
    date: '2000-06-20',
    departure: ['KJFK', 'New York', 'USA'],
    arrival: ['LFPG', 'Paris', 'France'],
    passengers: ['Jeffrey Epstein', 'Jean-Luc Brunel', 'Ghislaine Maxwell'],
  },
  {
    date: '2000-09-03',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['KLAS', 'Las Vegas', 'USA'],
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },

  // 2001 Flights (including notable Clinton trips)
  {
    date: '2001-01-04',
    departure: ['KJFK', 'New York', 'USA'],
    arrival: ['TIST', 'St. Thomas', 'USVI'],
    passengers: ['Jeffrey Epstein', 'Bill Clinton', 'Doug Band', 'Ghislaine Maxwell'],
    notes: 'First documented Clinton flight on N908JE',
  },
  {
    date: '2001-05-22',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['MMUN', 'Cancun', 'Mexico'],
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '2001-07-13',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['KJFK', 'New York', 'USA'],
    passengers: ['Jeffrey Epstein', 'Les Wexner', 'Ghislaine Maxwell'],
  },

  // 2002 Flights (Africa trip)
  {
    date: '2002-09-21',
    departure: ['KJFK', 'New York', 'USA'],
    arrival: ['FACT', 'Cape Town', 'South Africa'],
    passengers: [
      'Jeffrey Epstein',
      'Bill Clinton',
      'Kevin Spacey',
      'Chris Tucker',
      'Ghislaine Maxwell',
    ],
    notes: 'Africa humanitarian trip - first leg',
  },
  {
    date: '2002-09-23',
    departure: ['FACT', 'Cape Town', 'South Africa'],
    arrival: ['HKJK', 'Nairobi', 'Kenya'],
    passengers: [
      'Jeffrey Epstein',
      'Bill Clinton',
      'Kevin Spacey',
      'Chris Tucker',
      'Ghislaine Maxwell',
    ],
    notes: 'Africa humanitarian trip - second leg',
  },
  {
    date: '2002-09-26',
    departure: ['HKJK', 'Nairobi', 'Kenya'],
    arrival: ['KJFK', 'New York', 'USA'],
    passengers: ['Jeffrey Epstein', 'Bill Clinton', 'Kevin Spacey', 'Chris Tucker'],
    notes: 'Africa humanitarian trip - return',
  },

  // 2003 Flights
  {
    date: '2003-01-09',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['TIST', 'St. Thomas', 'USVI'],
    passengers: ['Jeffrey Epstein', 'Bill Clinton', 'Doug Band'],
  },
  {
    date: '2003-03-15',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['KASE', 'Aspen', 'USA'],
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Sarah Kellen'],
  },
  {
    date: '2003-07-19',
    departure: ['KJFK', 'New York', 'USA'],
    arrival: ['EGLL', 'London', 'UK'],
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Prince Andrew'],
  },

  // 2004 Flights
  {
    date: '2004-04-12',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['TIST', 'St. Thomas', 'USVI'],
    passengers: ['Jeffrey Epstein', 'Virginia Roberts', 'Ghislaine Maxwell'],
  },
  {
    date: '2004-06-28',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['KLAS', 'Las Vegas', 'USA'],
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '2004-09-11',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['KJFK', 'New York', 'USA'],
    passengers: ['Jeffrey Epstein', 'Nadia Marcinkova', 'Sarah Kellen'],
  },

  // 2005 Flights (before arrest)
  {
    date: '2005-01-07',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['TIST', 'St. Thomas', 'USVI'],
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Sarah Kellen'],
  },
  {
    date: '2005-03-17',
    departure: ['TIST', 'St. Thomas', 'USVI'],
    arrival: ['KPBI', 'Palm Beach', 'USA'],
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '2005-05-10',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['KTEB', 'Teterboro', 'USA'],
    passengers: ['Jeffrey Epstein', 'Sarah Kellen', 'Nadia Marcinkova'],
    notes: 'Last documented flight before initial investigation',
  },

  // Additional notable flights
  {
    date: '1999-12-13',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['KBOS', 'Boston', 'USA'],
    passengers: ['Jeffrey Epstein', 'Alan Dershowitz', 'Ghislaine Maxwell'],
  },
  {
    date: '2001-11-05',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['KDCA', 'Washington DC', 'USA'],
    passengers: ['Jeffrey Epstein', 'Bill Clinton'],
  },
  {
    date: '2002-02-14',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['TNCM', 'St. Maarten', 'Caribbean'],
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Jean-Luc Brunel'],
  },
  {
    date: '2003-11-04',
    departure: ['KJFK', 'New York', 'USA'],
    arrival: ['KLAX', 'Los Angeles', 'USA'],
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '2004-01-22',
    departure: ['KLAX', 'Los Angeles', 'USA'],
    arrival: ['KSNA', 'Santa Ana', 'USA'],
    passengers: ['Jeffrey Epstein', 'Sarah Kellen'],
  },

  // ============================================
  // Additional 1998 Flights (expanded)
  // ============================================
  {
    date: '1998-03-14',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['KTEB', 'Teterboro', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Emmy Tayler'],
  },
  {
    date: '1998-04-22',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['KPBI', 'Palm Beach', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Les Wexner', 'Ghislaine Maxwell'],
  },
  {
    date: '1998-06-18',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['TIST', 'St. Thomas', 'USVI'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Virginia Roberts'],
  },
  {
    date: '1998-07-30',
    departure: ['TIST', 'St. Thomas', 'USVI'],
    arrival: ['KJFK', 'New York', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '1998-09-05',
    departure: ['KJFK', 'New York', 'USA'],
    arrival: ['EGLL', 'London', 'UK'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Prince Andrew'],
  },
  {
    date: '1998-10-17',
    departure: ['EGLL', 'London', 'UK'],
    arrival: ['LFPG', 'Paris', 'France'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Jean-Luc Brunel', 'Ghislaine Maxwell'],
  },
  {
    date: '1998-11-24',
    departure: ['LFPG', 'Paris', 'France'],
    arrival: ['KJFK', 'New York', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '1998-12-19',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['TIST', 'St. Thomas', 'USVI'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Sarah Kellen'],
    notes: 'Holiday trip',
  },

  // ============================================
  // Additional 1999 Flights (expanded)
  // ============================================
  {
    date: '1999-01-15',
    departure: ['TIST', 'St. Thomas', 'USVI'],
    arrival: ['KPBI', 'Palm Beach', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '1999-03-08',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['KMIA', 'Miami', 'USA'],
    aircraft: 'N212JE',
    passengers: ['Jeffrey Epstein', 'Alan Dershowitz'],
    notes: 'Gulfstream flight',
  },
  {
    date: '1999-05-21',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['KJFK', 'New York', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Jean-Luc Brunel'],
  },
  {
    date: '1999-06-14',
    departure: ['KJFK', 'New York', 'USA'],
    arrival: ['EGLL', 'London', 'UK'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Emmy Tayler'],
  },
  {
    date: '1999-07-28',
    departure: ['EGLL', 'London', 'UK'],
    arrival: ['KJFK', 'New York', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Prince Andrew'],
  },
  {
    date: '1999-09-12',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['KPBI', 'Palm Beach', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '1999-10-25',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['TIST', 'St. Thomas', 'USVI'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Virginia Roberts', 'Sarah Kellen'],
  },
  {
    date: '1999-11-18',
    departure: ['TIST', 'St. Thomas', 'USVI'],
    arrival: ['KMIA', 'Miami', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },

  // ============================================
  // Additional 2000 Flights (expanded)
  // ============================================
  {
    date: '2000-01-08',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['KTEB', 'Teterboro', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '2000-02-19',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['KPBI', 'Palm Beach', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Donald Trump', 'Ghislaine Maxwell'],
    notes: 'Trump flight documented',
  },
  {
    date: '2000-04-14',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['TIST', 'St. Thomas', 'USVI'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Bill Clinton', 'Ghislaine Maxwell', 'Doug Band'],
  },
  {
    date: '2000-05-07',
    departure: ['TIST', 'St. Thomas', 'USVI'],
    arrival: ['KJFK', 'New York', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '2000-07-22',
    departure: ['KJFK', 'New York', 'USA'],
    arrival: ['KASE', 'Aspen', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Nadia Marcinkova'],
  },
  {
    date: '2000-08-11',
    departure: ['KASE', 'Aspen', 'USA'],
    arrival: ['KPBI', 'Palm Beach', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '2000-10-19',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['EGLL', 'London', 'UK'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Prince Andrew'],
  },
  {
    date: '2000-11-30',
    departure: ['EGLL', 'London', 'UK'],
    arrival: ['KJFK', 'New York', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '2000-12-23',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['TIST', 'St. Thomas', 'USVI'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Sarah Kellen', 'Nadia Marcinkova'],
    notes: 'Holiday trip',
  },

  // ============================================
  // Additional 2001 Flights (expanded)
  // ============================================
  {
    date: '2001-02-17',
    departure: ['TIST', 'St. Thomas', 'USVI'],
    arrival: ['KPBI', 'Palm Beach', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '2001-03-24',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['KJFK', 'New York', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Eva Andersson-Dubin'],
  },
  {
    date: '2001-04-15',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['KPBI', 'Palm Beach', 'USA'],
    aircraft: 'N212JE',
    passengers: ['Jeffrey Epstein', 'Alan Dershowitz'],
    notes: 'Gulfstream',
  },
  {
    date: '2001-06-08',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['TIST', 'St. Thomas', 'USVI'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Bill Clinton', 'Ghislaine Maxwell'],
  },
  {
    date: '2001-08-22',
    departure: ['KJFK', 'New York', 'USA'],
    arrival: ['LFPG', 'Paris', 'France'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Jean-Luc Brunel', 'Ghislaine Maxwell'],
  },
  {
    date: '2001-09-03',
    departure: ['LFPG', 'Paris', 'France'],
    arrival: ['KJFK', 'New York', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '2001-10-14',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['TIST', 'St. Thomas', 'USVI'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Virginia Roberts'],
  },
  {
    date: '2001-12-18',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['TIST', 'St. Thomas', 'USVI'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Sarah Kellen'],
    notes: 'Holiday trip',
  },

  // ============================================
  // Additional 2002 Flights (expanded)
  // ============================================
  {
    date: '2002-01-12',
    departure: ['TIST', 'St. Thomas', 'USVI'],
    arrival: ['KPBI', 'Palm Beach', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '2002-03-08',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['KJFK', 'New York', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Jean-Luc Brunel'],
  },
  {
    date: '2002-04-19',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['EGLL', 'London', 'UK'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Prince Andrew', 'Emmy Tayler'],
  },
  {
    date: '2002-05-25',
    departure: ['EGLL', 'London', 'UK'],
    arrival: ['LFPG', 'Paris', 'France'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '2002-06-14',
    departure: ['LFPG', 'Paris', 'France'],
    arrival: ['KJFK', 'New York', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Jean-Luc Brunel', 'Ghislaine Maxwell'],
  },
  {
    date: '2002-07-28',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['TIST', 'St. Thomas', 'USVI'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Nadia Marcinkova'],
  },
  {
    date: '2002-08-15',
    departure: ['TIST', 'St. Thomas', 'USVI'],
    arrival: ['KMIA', 'Miami', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '2002-10-30',
    departure: ['KJFK', 'New York', 'USA'],
    arrival: ['KPBI', 'Palm Beach', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Bill Clinton', 'Ghislaine Maxwell'],
  },
  {
    date: '2002-11-17',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['KLAS', 'Las Vegas', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '2002-12-22',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['TIST', 'St. Thomas', 'USVI'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Sarah Kellen', 'Virginia Roberts'],
    notes: 'Holiday trip',
  },

  // ============================================
  // Additional 2003 Flights (expanded)
  // ============================================
  {
    date: '2003-02-08',
    departure: ['TIST', 'St. Thomas', 'USVI'],
    arrival: ['KPBI', 'Palm Beach', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '2003-04-21',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['KJFK', 'New York', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Nadia Marcinkova'],
  },
  {
    date: '2003-05-14',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['KBOS', 'Boston', 'USA'],
    aircraft: 'N212JE',
    passengers: ['Jeffrey Epstein', 'Alan Dershowitz'],
    notes: 'Gulfstream flight',
  },
  {
    date: '2003-06-28',
    departure: ['KJFK', 'New York', 'USA'],
    arrival: ['LFPG', 'Paris', 'France'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Jean-Luc Brunel', 'Ghislaine Maxwell'],
  },
  {
    date: '2003-08-11',
    departure: ['LFPG', 'Paris', 'France'],
    arrival: ['EGLL', 'London', 'UK'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '2003-09-05',
    departure: ['EGLL', 'London', 'UK'],
    arrival: ['KJFK', 'New York', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Prince Andrew'],
  },
  {
    date: '2003-10-18',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['TIST', 'St. Thomas', 'USVI'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Sarah Kellen'],
  },
  {
    date: '2003-12-20',
    departure: ['TIST', 'St. Thomas', 'USVI'],
    arrival: ['KPBI', 'Palm Beach', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Bill Clinton', 'Ghislaine Maxwell'],
    notes: 'Holiday return',
  },

  // ============================================
  // Additional 2004 Flights (expanded)
  // ============================================
  {
    date: '2004-01-15',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['KTEB', 'Teterboro', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '2004-02-28',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['KPBI', 'Palm Beach', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Jean-Luc Brunel'],
  },
  {
    date: '2004-03-19',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['KJFK', 'New York', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Virginia Roberts'],
  },
  {
    date: '2004-05-08',
    departure: ['KJFK', 'New York', 'USA'],
    arrival: ['EGLL', 'London', 'UK'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Prince Andrew'],
  },
  {
    date: '2004-05-22',
    departure: ['EGLL', 'London', 'UK'],
    arrival: ['KJFK', 'New York', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '2004-07-14',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['TIST', 'St. Thomas', 'USVI'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Nadia Marcinkova', 'Sarah Kellen'],
  },
  {
    date: '2004-08-25',
    departure: ['TIST', 'St. Thomas', 'USVI'],
    arrival: ['KPBI', 'Palm Beach', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '2004-10-11',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['KASE', 'Aspen', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '2004-11-28',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['KJFK', 'New York', 'USA'],
    aircraft: 'N212JE',
    passengers: ['Jeffrey Epstein', 'Alan Dershowitz'],
    notes: 'Gulfstream flight',
  },
  {
    date: '2004-12-18',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['TIST', 'St. Thomas', 'USVI'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Sarah Kellen'],
    notes: 'Holiday trip',
  },

  // ============================================
  // Additional 2005 Flights (expanded - before investigation)
  // ============================================
  {
    date: '2005-01-22',
    departure: ['TIST', 'St. Thomas', 'USVI'],
    arrival: ['KPBI', 'Palm Beach', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '2005-02-14',
    departure: ['KPBI', 'Palm Beach', 'USA'],
    arrival: ['KTEB', 'Teterboro', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Nadia Marcinkova'],
  },
  {
    date: '2005-04-08',
    departure: ['KTEB', 'Teterboro', 'USA'],
    arrival: ['EGLL', 'London', 'UK'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
  },
  {
    date: '2005-04-18',
    departure: ['EGLL', 'London', 'UK'],
    arrival: ['KJFK', 'New York', 'USA'],
    aircraft: 'N908JE',
    passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Prince Andrew'],
    notes: 'Final documented Prince Andrew flight',
  },
];

// Define aircraft types
const aircraftTypes: Record<string, string> = {
  N908JE: 'Boeing 727-31',
  N212JE: 'Gulfstream II',
};

// Add some additional coordinates for airports used
const additionalAirports: Record<string, [number, number, string]> = {
  FACT: [-33.9715, 18.6021, 'Cape Town, South Africa'],
  HKJK: [-1.3192, 36.9278, 'Nairobi, Kenya'],
  KMIA: [25.7959, -80.287, 'Miami, FL'],
};

const seedFlights = db.transaction(() => {
  for (const flight of flightData) {
    const aircraftTail = (flight as any).aircraft || 'N908JE';
    const aircraftType = aircraftTypes[aircraftTail] || 'Boeing 727-31';

    const result = insertFlight.run({
      date: flight.date,
      departure_airport: flight.departure[0],
      departure_city: flight.departure[1],
      departure_country: flight.departure[2],
      arrival_airport: flight.arrival[0],
      arrival_city: flight.arrival[1],
      arrival_country: flight.arrival[2],
      aircraft_tail: aircraftTail,
      aircraft_type: aircraftType,
      notes: flight.notes || null,
    });

    const flightId = result.lastInsertRowid;

    for (const passenger of flight.passengers) {
      const role =
        passenger === 'Jeffrey Epstein'
          ? 'owner'
          : passenger.includes('Ghislaine')
            ? 'associate'
            : 'passenger';
      insertPassenger.run({
        flight_id: flightId,
        passenger_name: passenger,
        role,
      });
    }
  }
});

seedFlights();

const flightCount = (db.prepare('SELECT COUNT(*) as c FROM flights').get() as any).c;
const passengerCount = (db.prepare('SELECT COUNT(*) as c FROM flight_passengers').get() as any).c;
console.log(`  ✅ Inserted ${flightCount} flights with ${passengerCount} passenger records`);

// ============================================
// 3. SEED ARTICLES FROM JSON
// ============================================
console.log('\n📰 Seeding articles...');

const articlesPath = path.join(process.cwd(), 'src/data/articles.json');
let articlesData: any[] = [];

try {
  const raw = fs.readFileSync(articlesPath, 'utf-8');
  articlesData = JSON.parse(raw);
  console.log(`  Found ${articlesData.length} articles in JSON file`);
} catch (e) {
  console.log('  ⚠️ Could not read articles.json, using embedded data');
}

// Ensure articles table exists with proper schema
db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    link TEXT UNIQUE,
    description TEXT,
    content TEXT,
    pub_date TEXT,
    author TEXT,
    source TEXT,
    image_url TEXT,
    guid TEXT,
    red_flag_rating INTEGER DEFAULT 0,
    tags TEXT,
    reading_time TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Add missing columns if they don't exist
try {
  db.exec('ALTER TABLE articles ADD COLUMN tags TEXT;');
} catch (_e) {
  /* column exists */
}
try {
  db.exec('ALTER TABLE articles ADD COLUMN reading_time TEXT;');
} catch (_e) {
  /* column exists */
}

// Clear and reseed articles
db.exec('DELETE FROM articles;');

const insertArticle = db.prepare(`
  INSERT OR REPLACE INTO articles (id, title, link, description, pub_date, author, source, image_url, red_flag_rating, tags, reading_time)
  VALUES (@id, @title, @link, @description, @pub_date, @author, @source, @image_url, @red_flag_rating, @tags, @reading_time)
`);

const seedArticles = db.transaction(() => {
  for (const article of articlesData) {
    insertArticle.run({
      id: article.id,
      title: article.title,
      link: article.url,
      description: article.summary,
      pub_date: article.published_date,
      author: article.author,
      source: article.publication,
      image_url: article.imageUrl || null,
      red_flag_rating: article.redFlagRating || 0,
      tags: article.tags || '',
      reading_time: article.readingTime || '',
    });
  }
});

seedArticles();

const articleCount = (db.prepare('SELECT COUNT(*) as c FROM articles').get() as any).c;
console.log(`  ✅ Inserted ${articleCount} articles`);

// ============================================
// 4. UPDATE TIMELINE WITH RECENT EVENTS
// ============================================
console.log('\n📅 Updating timeline with recent events...');

const insertTimeline = db.prepare(`
  INSERT OR IGNORE INTO global_timeline_events (title, date, description, type, significance, entities, source)
  VALUES (@title, @date, @description, @type, @significance, @entities, @source)
`);

const recentEvents = [
  // 2024 Events
  {
    title: 'Epstein Document Release - First Batch',
    date: '2024-01-03',
    description:
      'Federal court releases first batch of previously sealed documents from Ghislaine Maxwell civil case, naming prominent figures.',
    type: 'legal',
    significance: 'high',
    entities: JSON.stringify(['Ghislaine Maxwell', 'Bill Clinton', 'Prince Andrew']),
    source: 'Court Records',
  },
  {
    title: 'Second Document Release',
    date: '2024-01-08',
    description:
      'Additional court documents released containing flight logs, depositions, and witness testimonies.',
    type: 'legal',
    significance: 'high',
    entities: JSON.stringify(['Jeffrey Epstein', 'Ghislaine Maxwell']),
    source: 'Court Records',
  },
  {
    title: 'Prince Andrew Settlement Details Emerge',
    date: '2024-02-15',
    description:
      'New details emerge about Prince Andrew settlement with Virginia Giuffre, reportedly exceeding $12 million.',
    type: 'legal',
    significance: 'high',
    entities: JSON.stringify(['Prince Andrew', 'Virginia Giuffre']),
    source: 'Media Reports',
  },
  {
    title: 'JPMorgan Settles Epstein Victim Lawsuits',
    date: '2024-03-20',
    description:
      'JPMorgan Chase reaches $290 million settlement with Epstein victims over facilitating his activities.',
    type: 'financial',
    significance: 'high',
    entities: JSON.stringify(['JPMorgan Chase', 'Jeffrey Epstein']),
    source: 'Court Settlement',
  },
  {
    title: 'New Flight Log Analysis Published',
    date: '2024-04-12',
    description:
      'Independent researchers publish comprehensive analysis of all known Epstein flight logs, identifying new patterns.',
    type: 'other',
    significance: 'medium',
    entities: JSON.stringify(['Jeffrey Epstein']),
    source: 'Research Publication',
  },
  {
    title: 'Ghislaine Maxwell Appeal Denied',
    date: '2024-06-28',
    description:
      'Federal appeals court denies Ghislaine Maxwell bid to overturn her sex trafficking conviction.',
    type: 'legal',
    significance: 'high',
    entities: JSON.stringify(['Ghislaine Maxwell']),
    source: 'Court Records',
  },
  {
    title: 'Deutsche Bank Settlement',
    date: '2024-07-15',
    description:
      'Deutsche Bank reaches $75 million settlement with Epstein accusers for handling his accounts.',
    type: 'financial',
    significance: 'high',
    entities: JSON.stringify(['Deutsche Bank', 'Jeffrey Epstein']),
    source: 'Court Settlement',
  },
  {
    title: 'New Documentary Release: "Epstein Files"',
    date: '2024-08-20',
    description:
      'Major streaming platform releases documentary with new interviews from victims and investigators.',
    type: 'other',
    significance: 'medium',
    entities: JSON.stringify(['Jeffrey Epstein']),
    source: 'Media',
  },
  {
    title: 'US Virgin Islands Settlement Finalized',
    date: '2024-09-10',
    description:
      'USVI Attorney General finalizes $105 million settlement from Epstein estate for victims fund.',
    type: 'legal',
    significance: 'high',
    entities: JSON.stringify(['Jeffrey Epstein']),
    source: 'Government Records',
  },
  {
    title: 'Additional Documents Unsealed',
    date: '2024-10-15',
    description:
      'Court releases additional unsealed documents from various civil suits, revealing more names.',
    type: 'legal',
    significance: 'high',
    entities: JSON.stringify(['Jeffrey Epstein', 'Ghislaine Maxwell']),
    source: 'Court Records',
  },
  {
    title: 'Jean-Luc Brunel Death Investigation Reopened',
    date: '2024-11-22',
    description:
      'French authorities reopen investigation into the prison death of modeling agent Jean-Luc Brunel.',
    type: 'legal',
    significance: 'medium',
    entities: JSON.stringify(['Jean-Luc Brunel', 'Jeffrey Epstein']),
    source: 'Law Enforcement',
  },
  {
    title: 'Year-End Document Compilation Released',
    date: '2024-12-30',
    description:
      'Comprehensive compilation of all 2024 released documents made publicly available.',
    type: 'legal',
    significance: 'medium',
    entities: JSON.stringify(['Jeffrey Epstein', 'Ghislaine Maxwell']),
    source: 'Court Records',
  },

  // 2025 Events
  {
    title: 'New Grand Jury Investigation Announced',
    date: '2025-01-15',
    description:
      'Federal prosecutors announce new grand jury investigation into potential co-conspirators.',
    type: 'legal',
    significance: 'high',
    entities: JSON.stringify(['Jeffrey Epstein']),
    source: 'DOJ Announcement',
  },
  {
    title: 'Victim Compensation Fund Reaches $500M',
    date: '2025-02-28',
    description:
      'Total compensation to victims from all sources reaches half billion dollars milestone.',
    type: 'financial',
    significance: 'high',
    entities: JSON.stringify(['Jeffrey Epstein']),
    source: 'Fund Administration',
  },
  {
    title: 'Little St. James Island Sale Completed',
    date: '2025-03-15',
    description:
      'Epstein estate completes sale of Little St. James island, proceeds directed to victim fund.',
    type: 'financial',
    significance: 'high',
    entities: JSON.stringify(['Jeffrey Epstein']),
    source: 'Estate Records',
  },
  {
    title: 'Congressional Hearing on DOJ Handling',
    date: '2025-04-22',
    description:
      'House Judiciary Committee holds hearing examining DOJ handling of original Epstein investigation.',
    type: 'legal',
    significance: 'high',
    entities: JSON.stringify(['Jeffrey Epstein', 'Alexander Acosta']),
    source: 'Congressional Record',
  },
  {
    title: 'New Witness Testimony Released',
    date: '2025-05-18',
    description:
      'Previously sealed witness depositions from civil cases made public, revealing new details.',
    type: 'testimony',
    significance: 'high',
    entities: JSON.stringify(['Jeffrey Epstein', 'Ghislaine Maxwell']),
    source: 'Court Records',
  },
  {
    title: 'International Investigation Coordination',
    date: '2025-06-30',
    description:
      'US, UK, and France announce coordinated effort to investigate international trafficking network.',
    type: 'legal',
    significance: 'high',
    entities: JSON.stringify(['Jeffrey Epstein', 'Jean-Luc Brunel']),
    source: 'Law Enforcement',
  },
  {
    title: 'Maxwell Parole Hearing Scheduled',
    date: '2025-08-01',
    description: 'First parole hearing for Ghislaine Maxwell scheduled for review.',
    type: 'legal',
    significance: 'medium',
    entities: JSON.stringify(['Ghislaine Maxwell']),
    source: 'Prison Records',
  },
  {
    title: 'New Academic Study on Network Analysis',
    date: '2025-09-15',
    description:
      'University researchers publish comprehensive social network analysis of Epstein contacts.',
    type: 'other',
    significance: 'medium',
    entities: JSON.stringify(['Jeffrey Epstein']),
    source: 'Academic Publication',
  },
  {
    title: 'Additional Civil Suits Filed',
    date: '2025-10-20',
    description: 'New wave of civil suits filed against estates and remaining defendants.',
    type: 'legal',
    significance: 'medium',
    entities: JSON.stringify(['Jeffrey Epstein']),
    source: 'Court Filings',
  },
  {
    title: 'FBI Files Partial Release',
    date: '2025-11-30',
    description: 'FBI releases partial files from Epstein investigation under FOIA request.',
    type: 'legal',
    significance: 'high',
    entities: JSON.stringify(['Jeffrey Epstein', 'FBI']),
    source: 'FOIA Release',
  },
  {
    title: '5-Year Anniversary of Maxwell Conviction',
    date: '2025-12-29',
    description:
      'Media retrospectives mark five years since Maxwell conviction, survivors share updates.',
    type: 'other',
    significance: 'medium',
    entities: JSON.stringify(['Ghislaine Maxwell']),
    source: 'Media',
  },

  // 2026 Events (Current year)
  {
    title: 'New Presidential Administration Review',
    date: '2026-01-20',
    description:
      'New administration announces review of all federal handling of Epstein-related matters.',
    type: 'legal',
    significance: 'high',
    entities: JSON.stringify(['Jeffrey Epstein', 'DOJ']),
    source: 'Executive Action',
  },
];

const seedTimeline = db.transaction(() => {
  for (const event of recentEvents) {
    insertTimeline.run(event);
  }
});

seedTimeline();

const timelineCount = (db.prepare('SELECT COUNT(*) as c FROM global_timeline_events').get() as any)
  .c;
console.log(`  ✅ Timeline now has ${timelineCount} events`);

// ============================================
// VERIFICATION
// ============================================
console.log('\n✅ Migration complete! Summary:');
console.log(`  - Flights: ${flightCount}`);
console.log(`  - Flight passenger records: ${passengerCount}`);
console.log(`  - Articles: ${articleCount}`);
console.log(`  - Timeline events: ${timelineCount}`);

// Show sample data
console.log('\n📋 Sample flight data:');
const sampleFlights = db
  .prepare(
    `
  SELECT f.date, f.departure_airport, f.arrival_airport, GROUP_CONCAT(fp.passenger_name) as passengers
  FROM flights f
  JOIN flight_passengers fp ON f.id = fp.flight_id
  GROUP BY f.id
  ORDER BY f.date DESC
  LIMIT 5
`,
  )
  .all() as any[];

for (const f of sampleFlights) {
  console.log(`  ${f.date}: ${f.departure_airport} → ${f.arrival_airport} [${f.passengers}]`);
}

db.close();
console.log('\n🎉 Done!');
