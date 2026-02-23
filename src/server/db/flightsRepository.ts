import { db, flightsQueries } from '@epstein/db';

export interface Flight {
  id: number;
  date: string;
  departure_airport: string;
  departure_city: string;
  departure_country: string;
  arrival_airport: string;
  arrival_city: string;
  arrival_country: string;
  aircraft_tail: string;
  aircraft_type: string;
  pilot?: string;
  notes?: string;
  passengers?: FlightPassenger[];
}

export interface FlightPassenger {
  id: number;
  flight_id: number;
  entity_id?: number;
  passenger_name: string;
  role: string;
}

export interface FlightStats {
  totalFlights: number;
  uniquePassengers: number;
  topPassengers: { name: string; count: number }[];
  topRoutes: { route: string; count: number }[];
  flightsByYear: { year: string; count: number }[];
  airports: { code: string; city: string; count: number }[];
}

// Airport coordinates for map
export const AIRPORT_COORDS: Record<string, { lat: number; lng: number; city: string }> = {
  TIST: { lat: 18.3376, lng: -64.9734, city: 'St. Thomas, USVI' },
  TJSJ: { lat: 18.4394, lng: -66.0018, city: 'San Juan, PR' },
  TNCM: { lat: 18.041, lng: -63.1089, city: 'St. Maarten' },
  KTEB: { lat: 40.8501, lng: -74.0608, city: 'Teterboro, NJ' },
  KPBI: { lat: 26.6832, lng: -80.0956, city: 'Palm Beach, FL' },
  KMIA: { lat: 25.7959, lng: -80.287, city: 'Miami, FL' },
  KJFK: { lat: 40.6413, lng: -73.7781, city: 'New York JFK' },
  KLAX: { lat: 33.9416, lng: -118.4085, city: 'Los Angeles, CA' },
  KSFO: { lat: 37.6213, lng: -122.379, city: 'San Francisco, CA' },
  EGLL: { lat: 51.47, lng: -0.4543, city: 'London Heathrow' },
  LFPG: { lat: 49.0097, lng: 2.5479, city: 'Paris CDG' },
  KBED: { lat: 42.47, lng: -71.289, city: 'Bedford, MA' },
  KASE: { lat: 39.2232, lng: -106.8688, city: 'Aspen, CO' },
  KSNA: { lat: 33.6757, lng: -117.8682, city: 'Santa Ana, CA' },
  MMUN: { lat: 21.0365, lng: -86.8771, city: 'Cancun, MX' },
  KLAS: { lat: 36.084, lng: -115.1537, city: 'Las Vegas, NV' },
  KDCA: { lat: 38.8512, lng: -77.0402, city: 'Washington DC' },
  KBOS: { lat: 42.3656, lng: -71.0096, city: 'Boston, MA' },
};

export const flightsRepository = {
  getFlights: async (
    filters: {
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
      passenger?: string;
      airport?: string;
    } = {},
  ) => {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const flights = await flightsQueries.getFlights.run(
      {
        startDate: filters.startDate || null,
        endDate: filters.endDate || null,
        airport: filters.airport || null,
        limit: BigInt(limit),
        offset: BigInt(offset),
      },
      db,
    );

    if (flights.length === 0) return { flights: [], total: 0 };

    const flightIds = flights.map((f) => f.id);
    const passengers = await flightsQueries.getFlightPassengers.run({ flightIds }, db);

    const flightsWithPassengers = flights.map((f) => ({
      ...f,
      id: Number(f.id),
      departure_airport: f.departureAirport || '',
      departure_city: f.departureCity || '',
      departure_country: f.departureCountry || '',
      arrival_airport: f.arrivalAirport || '',
      arrival_city: f.arrivalCity || '',
      arrival_country: f.arrivalCountry || '',
      aircraft_tail: f.aircraftTail || '',
      aircraft_type: f.aircraftType || '',
      passengers: passengers
        .filter((p) => p.flightId === f.id)
        .map((p) => ({
          ...p,
          id: Number(p.id),
          flight_id: Number(p.flightId),
          entity_id: p.entityId ? Number(p.entityId) : undefined,
          passenger_name: p.passengerName,
        })),
    }));

    return {
      flights: flightsWithPassengers,
      total: 0,
    };
  },

  getFlightById: async (id: number): Promise<Flight | null> => {
    const flightRows = await flightsQueries.getFlightById.run({ id: BigInt(id) }, db);
    const f = flightRows[0];
    if (!f) return null;

    const passengers = await flightsQueries.getFlightPassengers.run({ flightIds: [f.id] }, db);

    return {
      ...f,
      id: Number(f.id),
      departure_airport: f.departureAirport || '',
      departure_city: f.departureCity || '',
      departure_country: f.departureCountry || '',
      arrival_airport: f.arrivalAirport || '',
      arrival_city: f.arrivalCity || '',
      arrival_country: f.arrivalCountry || '',
      aircraft_tail: f.aircraftTail || '',
      aircraft_type: f.aircraftType || '',
      passengers: passengers.map((p) => ({
        ...p,
        id: Number(p.id),
        flight_id: Number(p.flightId),
        entity_id: p.entityId ? Number(p.entityId) : undefined,
        passenger_name: p.passengerName,
      })),
    };
  },

  getFlightStats: async (): Promise<FlightStats> => {
    const [basicStats] = await flightsQueries.getFlightStats.run(undefined, db);
    const topPassengers = await flightsQueries.getTopPassengers.run({ limit: BigInt(10) }, db);
    const topRoutes = await flightsQueries.getTopRoutes.run({ limit: BigInt(10) }, db);
    const flightsByYear = await flightsQueries.getFlightsByYear.run(undefined, db);
    const airportStats = await flightsQueries.getAirportStats.run(undefined, db);

    return {
      totalFlights: Number(basicStats?.totalFlights || 0),
      uniquePassengers: Number(basicStats?.uniquePassengers || 0),
      topPassengers: topPassengers.map((p) => ({ name: p.name, count: Number(p.count || 0) })),
      topRoutes: topRoutes.map((r) => ({
        route: r.route || 'Unknown',
        count: Number(r.count || 0),
      })),
      flightsByYear: flightsByYear.map((y) => ({
        year: y.year || 'Unknown',
        count: Number(y.count || 0),
      })),
      airports: airportStats.map((a) => ({
        code: a.airport || 'Unknown',
        city: a.city || 'Unknown',
        count: Number(a.count || 0),
      })),
    };
  },

  getPassengerFlights: async (passengerName: string) => {
    const rows = await db.query(
      db.apiPool,
      `
      SELECT f.*
      FROM flights f
      INNER JOIN flight_passengers fp ON f.id = fp.flight_id
      WHERE fp.passenger_name ILIKE $1
      ORDER BY f.date DESC
    `,
      [`%${passengerName}%`],
    );

    return rows.rows.map((f) => ({
      ...f,
      id: Number(f.id),
    }));
  },

  getUniquePassengers: async () => {
    const rows = await db.query(
      db.apiPool,
      'SELECT DISTINCT passenger_name FROM flight_passengers ORDER BY passenger_name ASC',
    );
    return rows.rows.map((r) => r.passenger_name);
  },

  getAirportCoords: async () => {
    return AIRPORT_COORDS;
  },

  getPassengerCoOccurrences: async (minFlights = 2) => {
    const rows = await db.query(
      db.apiPool,
      `
      SELECT 
        p1.passenger_name as passenger1,
        p2.passenger_name as passenger2,
        COUNT(*) as "flightsTogether",
        MIN(f.date) as "firstFlight",
        MAX(f.date) as "lastFlight"
      FROM flight_passengers p1
      JOIN flight_passengers p2 ON p1.flight_id = p2.flight_id AND p1.passenger_name < p2.passenger_name
      JOIN flights f ON p1.flight_id = f.id
      GROUP BY p1.passenger_name, p2.passenger_name
      HAVING COUNT(*) >= $1
      ORDER BY "flightsTogether" DESC
    `,
      [minFlights],
    );
    return rows.rows;
  },

  getCoPassengers: async (passengerName: string) => {
    const rows = await db.query(
      db.apiPool,
      `
      SELECT 
        p2.passenger_name as name,
        COUNT(*) as "flightsTogether",
        array_agg(f.date ORDER BY f.date DESC) as flights
      FROM flight_passengers p1
      JOIN flight_passengers p2 ON p1.flight_id = p2.flight_id AND p1.passenger_name != p2.passenger_name
      JOIN flights f ON p1.flight_id = f.id
      WHERE p1.passenger_name ILIKE $1
      GROUP BY p2.passenger_name
      ORDER BY "flightsTogether" DESC
    `,
      [`%${passengerName}%`],
    );
    return rows.rows;
  },

  getFrequentRoutes: async (limit = 20) => {
    const rows = await db.query(
      db.apiPool,
      `
      SELECT 
        departure_airport as departure,
        arrival_airport as arrival,
        departure_city as "departureCity",
        arrival_city as "arrivalCity",
        COUNT(*) as count,
        array_agg(DISTINCT date) as dates
      FROM flights
      GROUP BY departure, arrival, "departureCity", "arrivalCity"
      ORDER BY count DESC
      LIMIT $1
    `,
      [limit],
    );
    return rows.rows;
  },

  getPassengerDateRanges: async () => {
    const rows = await db.query(
      db.apiPool,
      `
      SELECT 
        passenger_name as name,
        MIN(f.date) as "firstFlight",
        MAX(f.date) as "lastFlight",
        COUNT(*) as "totalFlights"
      FROM flight_passengers fp
      JOIN flights f ON fp.flight_id = f.id
      GROUP BY passenger_name
      ORDER BY "totalFlights" DESC
    `,
    );
    return rows.rows;
  },

  getFlightsByAircraft: async () => {
    const rows = await db.query(
      db.apiPool,
      `
      SELECT 
        aircraft_tail as aircraft,
        aircraft_type as "aircraftType",
        COUNT(*) as "flightCount",
        (SELECT COUNT(DISTINCT passenger_name) FROM flight_passengers fp WHERE fp.flight_id IN (SELECT id FROM flights f2 WHERE f2.aircraft_tail = f.aircraft_tail)) as "passengerCount"
      FROM flights f
      WHERE aircraft_tail IS NOT NULL AND aircraft_tail != ''
      GROUP BY aircraft, "aircraftType"
      ORDER BY "flightCount" DESC
    `,
    );
    return rows.rows;
  },

  getPassengerDestinations: async (passengerName: string) => {
    const rows = await db.query(
      db.apiPool,
      `
      SELECT 
        airport,
        city,
        COUNT(*) as "visitCount"
      FROM (
        SELECT f.departure_airport as airport, f.departure_city as city
        FROM flights f
        JOIN flight_passengers fp ON f.id = fp.flight_id
        WHERE fp.passenger_name ILIKE $1
        UNION ALL
        SELECT f.arrival_airport as airport, f.arrival_city as city
        FROM flights f
        JOIN flight_passengers fp ON f.id = fp.flight_id
        WHERE fp.passenger_name ILIKE $1
      ) t
      GROUP BY airport, city
      ORDER BY "visitCount" DESC
    `,
      [`%${passengerName}%`],
    );
    return rows.rows;
  },
};
