import { getDb } from '../src/server/db/connection.js';

const db = getDb();

const LOCATIONS = [
  { name: 'Little St James', lat: 18.3003, lng: -64.8255, label: 'Little St James, USVI' },
  { name: 'Great St James', lat: 18.308, lng: -64.827, label: 'Great St James, USVI' },
  { name: 'Palm Beach', lat: 26.7153, lng: -80.0534, label: 'Palm Beach, FL' },
  { name: 'New York Mansion', lat: 40.7741, lng: -73.9656, label: '9 E 71st St, New York, NY' },
  { name: 'Paris Apartment', lat: 48.868, lng: 2.29, label: 'Avenue Foch, Paris' },
  { name: 'Zorro Ranch', lat: 35.343, lng: -106.027, label: 'Zorro Ranch, NM' },
];

console.log('Seeding location data...');

// Update specific location entities if they exist by name match
for (const loc of LOCATIONS) {
  const info = db
    .prepare(
      'UPDATE entities SET location_lat = ?, location_lng = ?, location_label = ? WHERE full_name LIKE ? OR title LIKE ?',
    )
    .run(loc.lat, loc.lng, loc.label, `%${loc.name}%`, `%${loc.name}%`);
  console.log(`Updated ${loc.name}: ${info.changes} changes`);
}

// Also seed some random entities with locations near these hubs for testing clustering
const hubs = [
  { baseLat: 18.3003, baseLng: -64.8255 }, // LSJ
  { baseLat: 40.7128, baseLng: -74.006 }, // NYC
  { baseLat: 48.8566, baseLng: 2.3522 }, // Paris
];

// Find some top entities to assign random locations to if they don't have one
const topEntities = db
  .prepare(
    'SELECT id, full_name as name FROM entities WHERE location_lat IS NULL ORDER BY mentions DESC LIMIT 20',
  )
  .all();

for (const entity of topEntities as any[]) {
  // Pick a random hub
  const hub = hubs[Math.floor(Math.random() * hubs.length)];
  // Add small jitter
  const lat = hub.baseLat + (Math.random() - 0.5) * 0.1;
  const lng = hub.baseLng + (Math.random() - 0.5) * 0.1;

  db.prepare(
    'UPDATE entities SET location_lat = ?, location_lng = ?, location_label = ? WHERE id = ?',
  ).run(lat, lng, 'Estimated Location', entity.id);
  console.log(`Assigned random location to ${entity.name}`);
}

console.log('Seeding complete.');
