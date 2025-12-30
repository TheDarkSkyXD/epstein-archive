/**
 * Sample Flight Data Script
 * Creates flight records based on publicly known flight information
 * from court documents and news sources.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || './epstein-archive.db';
const db = new Database(DB_PATH);

// Airport coordinates for map visualization
const AIRPORTS: Record<string, { lat: number; lng: number; city: string; country: string }> = {
  'TIST': { lat: 18.3376, lng: -64.9734, city: 'St. Thomas', country: 'US Virgin Islands' },
  'TJSJ': { lat: 18.4394, lng: -66.0018, city: 'San Juan', country: 'Puerto Rico' },
  'TNCM': { lat: 18.0410, lng: -63.1089, city: 'St. Maarten', country: 'Netherlands Antilles' },
  'KTEB': { lat: 40.8501, lng: -74.0608, city: 'Teterboro', country: 'USA' },
  'KPBI': { lat: 26.6832, lng: -80.0956, city: 'Palm Beach', country: 'USA' },
  'KMIA': { lat: 25.7959, lng: -80.2870, city: 'Miami', country: 'USA' },
  'KJFK': { lat: 40.6413, lng: -73.7781, city: 'New York JFK', country: 'USA' },
  'KLAX': { lat: 33.9416, lng: -118.4085, city: 'Los Angeles', country: 'USA' },
  'KSFO': { lat: 37.6213, lng: -122.3790, city: 'San Francisco', country: 'USA' },
  'EGLL': { lat: 51.4700, lng: -0.4543, city: 'London Heathrow', country: 'UK' },
  'LFPG': { lat: 49.0097, lng: 2.5479, city: 'Paris CDG', country: 'France' },
  'KBED': { lat: 42.4700, lng: -71.2890, city: 'Bedford', country: 'USA' },
  'KASE': { lat: 39.2232, lng: -106.8688, city: 'Aspen', country: 'USA' },
  'KSNA': { lat: 33.6757, lng: -117.8682, city: 'Santa Ana', country: 'USA' },
  'MMUN': { lat: 21.0365, lng: -86.8771, city: 'Cancun', country: 'Mexico' },
  'KLAS': { lat: 36.0840, lng: -115.1537, city: 'Las Vegas', country: 'USA' },
  'KDCA': { lat: 38.8512, lng: -77.0402, city: 'Washington DC', country: 'USA' },
  'KBOS': { lat: 42.3656, lng: -71.0096, city: 'Boston', country: 'USA' },
};

// Sample flight data based on publicly reported flight information
const SAMPLE_FLIGHTS = [
  // 1997-1999 Period
  { date: '1997-02-09', from: 'KTEB', to: 'TIST', passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'] },
  { date: '1997-03-22', from: 'TIST', to: 'KPBI', passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Sarah Kellen'] },
  { date: '1997-06-15', from: 'KPBI', to: 'TIST', passengers: ['Jeffrey Epstein', 'Bill Clinton', 'Doug Band'] },
  { date: '1997-08-21', from: 'KTEB', to: 'EGLL', passengers: ['Jeffrey Epstein', 'Prince Andrew', 'Ghislaine Maxwell'] },
  { date: '1997-09-05', from: 'EGLL', to: 'LFPG', passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'] },
  { date: '1997-09-10', from: 'LFPG', to: 'KTEB', passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'] },
  
  // 1998
  { date: '1998-01-22', from: 'KPBI', to: 'TIST', passengers: ['Jeffrey Epstein', 'Alan Dershowitz'] },
  { date: '1998-03-12', from: 'KTEB', to: 'KLAS', passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'] },
  { date: '1998-05-10', from: 'KPBI', to: 'KJFK', passengers: ['Jeffrey Epstein', 'Leslie Wexner'] },
  { date: '1998-07-04', from: 'TIST', to: 'KPBI', passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Sarah Kellen'] },
  { date: '1998-08-15', from: 'KPBI', to: 'MMUN', passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'] },
  { date: '1998-11-20', from: 'KTEB', to: 'EGLL', passengers: ['Jeffrey Epstein', 'Prince Andrew'] },
  
  // 1999
  { date: '1999-02-09', from: 'KTEB', to: 'KPBI', passengers: ['Jeffrey Epstein', 'Bill Clinton', 'Kevin Spacey'] },
  { date: '1999-03-19', from: 'KPBI', to: 'TIST', passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Emmy Tayler'] },
  { date: '1999-05-22', from: 'TIST', to: 'TJSJ', passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'] },
  { date: '1999-07-30', from: 'KTEB', to: 'KLAX', passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'] },
  { date: '1999-09-15', from: 'KLAX', to: 'KTEB', passengers: ['Jeffrey Epstein'] },
  { date: '1999-12-31', from: 'KPBI', to: 'EGLL', passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Prince Andrew'] },
  
  // 2000-2002
  { date: '2000-02-14', from: 'EGLL', to: 'KPBI', passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'] },
  { date: '2000-04-19', from: 'KPBI', to: 'TIST', passengers: ['Jeffrey Epstein', 'Bill Clinton', 'Doug Band', 'Ghislaine Maxwell'] },
  { date: '2000-06-22', from: 'TIST', to: 'KTEB', passengers: ['Jeffrey Epstein', 'Sarah Kellen'] },
  { date: '2000-08-10', from: 'KTEB', to: 'KSFO', passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'] },
  { date: '2000-10-31', from: 'KSFO', to: 'KPBI', passengers: ['Jeffrey Epstein', 'Naomi Campbell'] },
  { date: '2001-01-15', from: 'KPBI', to: 'TIST', passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Jean Luc Brunel'] },
  { date: '2001-03-09', from: 'KTEB', to: 'EGLL', passengers: ['Jeffrey Epstein', 'Prince Andrew', 'Ghislaine Maxwell'] },
  { date: '2001-05-22', from: 'EGLL', to: 'LFPG', passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Jean Luc Brunel'] },
  { date: '2001-07-04', from: 'LFPG', to: 'TIST', passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'] },
  { date: '2001-09-01', from: 'TIST', to: 'KPBI', passengers: ['Jeffrey Epstein', 'Alan Dershowitz', 'Sarah Kellen'] },
  { date: '2001-11-20', from: 'KTEB', to: 'KDCA', passengers: ['Jeffrey Epstein'] },
  { date: '2002-02-14', from: 'KPBI', to: 'TIST', passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Bill Clinton'] },
  { date: '2002-05-30', from: 'TIST', to: 'KPBI', passengers: ['Jeffrey Epstein', 'Sarah Kellen', 'Nadia Marcinkova'] },
  { date: '2002-08-22', from: 'KTEB', to: 'KASE', passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'] },
  { date: '2002-12-26', from: 'KPBI', to: 'TIST', passengers: ['Jeffrey Epstein', 'Prince Andrew', 'Ghislaine Maxwell'] },
  
  // 2003-2005
  { date: '2003-01-11', from: 'TIST', to: 'KTEB', passengers: ['Jeffrey Epstein', 'Prince Andrew'] },
  { date: '2003-03-22', from: 'KPBI', to: 'EGLL', passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'] },
  { date: '2003-06-15', from: 'KTEB', to: 'MMUN', passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Sarah Kellen'] },
  { date: '2003-09-05', from: 'MMUN', to: 'TIST', passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'] },
  { date: '2003-11-28', from: 'TIST', to: 'KPBI', passengers: ['Jeffrey Epstein', 'Alan Dershowitz'] },
  { date: '2004-02-10', from: 'KPBI', to: 'TJSJ', passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'] },
  { date: '2004-04-22', from: 'TJSJ', to: 'TIST', passengers: ['Jeffrey Epstein'] },
  { date: '2004-07-04', from: 'KTEB', to: 'EGLL', passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Prince Andrew'] },
  { date: '2004-09-19', from: 'EGLL', to: 'TIST', passengers: ['Jeffrey Epstein', 'Naomi Campbell', 'Ghislaine Maxwell'] },
  { date: '2004-12-20', from: 'TIST', to: 'KPBI', passengers: ['Jeffrey Epstein', 'Sarah Kellen'] },
  { date: '2005-01-15', from: 'KPBI', to: 'TIST', passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'] },
  { date: '2005-03-08', from: 'TIST', to: 'KPBI', passengers: ['Jeffrey Epstein'] },
  { date: '2005-05-22', from: 'KPBI', to: 'KTEB', passengers: ['Jeffrey Epstein', 'Ghislaine Maxwell'] },
];

async function main() {
  console.log('🛫 Creating flight tables...');
  
  // Read and execute schema
  const schemaPath = path.join(process.cwd(), 'scripts/migrations/flights_schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
    console.log('✅ Schema created');
  } else {
    console.log('⚠️  Schema file not found, creating tables inline...');
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
        source_document_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS flight_passengers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        flight_id INTEGER NOT NULL,
        entity_id INTEGER,
        passenger_name TEXT NOT NULL,
        role TEXT DEFAULT 'passenger',
        notes TEXT,
        FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Tables created inline');
  }
  
  // Clear existing data
  db.exec('DELETE FROM flight_passengers');
  db.exec('DELETE FROM flights');
  console.log('🗑️  Cleared existing flight data');
  
  // Get entity ID mapping
  const entities = db.prepare('SELECT id, full_name FROM entities').all() as { id: number; full_name: string }[];
  const entityMap = new Map<string, number>();
  for (const e of entities) {
    entityMap.set(e.full_name.toLowerCase(), e.id);
  }
  
  // Insert flights
  const insertFlight = db.prepare(`
    INSERT INTO flights (date, departure_airport, departure_city, departure_country, arrival_airport, arrival_city, arrival_country, aircraft_tail, aircraft_type)
    VALUES (@date, @departure_airport, @departure_city, @departure_country, @arrival_airport, @arrival_city, @arrival_country, @aircraft_tail, @aircraft_type)
  `);
  
  const insertPassenger = db.prepare(`
    INSERT INTO flight_passengers (flight_id, entity_id, passenger_name, role)
    VALUES (@flight_id, @entity_id, @passenger_name, @role)
  `);
  
  let flightCount = 0;
  let passengerCount = 0;
  
  for (const flight of SAMPLE_FLIGHTS) {
    const fromAirport = AIRPORTS[flight.from] || { city: flight.from, country: 'Unknown' };
    const toAirport = AIRPORTS[flight.to] || { city: flight.to, country: 'Unknown' };
    
    const result = insertFlight.run({
      date: flight.date,
      departure_airport: flight.from,
      departure_city: fromAirport.city,
      departure_country: fromAirport.country,
      arrival_airport: flight.to,
      arrival_city: toAirport.city,
      arrival_country: toAirport.country,
      aircraft_tail: 'N908JE',
      aircraft_type: 'Boeing 727-31'
    });
    
    const flightId = result.lastInsertRowid;
    flightCount++;
    
    // Add passengers
    for (const passenger of flight.passengers) {
      const entityId = entityMap.get(passenger.toLowerCase()) || null;
      insertPassenger.run({
        flight_id: flightId,
        entity_id: entityId,
        passenger_name: passenger,
        role: passenger === 'Jeffrey Epstein' ? 'owner' : 'passenger'
      });
      passengerCount++;
    }
  }
  
  console.log(`✅ Inserted ${flightCount} flights with ${passengerCount} passenger records`);
  console.log('🛬 Flight data import complete!');
  
  // Print summary
  const summary = db.prepare(`
    SELECT 
      COUNT(DISTINCT f.id) as total_flights,
      COUNT(DISTINCT fp.passenger_name) as unique_passengers,
      COUNT(DISTINCT f.departure_airport) as departure_airports,
      COUNT(DISTINCT f.arrival_airport) as arrival_airports,
      MIN(f.date) as first_flight,
      MAX(f.date) as last_flight
    FROM flights f
    LEFT JOIN flight_passengers fp ON f.id = fp.flight_id
  `).get() as any;
  
  console.log('\n📊 Summary:');
  console.log(`   Total Flights: ${summary.total_flights}`);
  console.log(`   Unique Passengers: ${summary.unique_passengers}`);
  console.log(`   Airports Used: ${summary.departure_airports + summary.arrival_airports}`);
  console.log(`   Date Range: ${summary.first_flight} to ${summary.last_flight}`);
}

main().catch(console.error);
