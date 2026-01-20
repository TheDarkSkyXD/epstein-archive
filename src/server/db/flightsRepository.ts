import { getDb } from './connection.js';

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
  getFlights: (
    filters: {
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
      passenger?: string;
      airport?: string;
    } = {},
  ) => {
    const db = getDb();
    const { page = 1, limit = 50, startDate, endDate, passenger, airport } = filters;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];

    if (startDate) {
      conditions.push('f.date >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('f.date <= ?');
      params.push(endDate);
    }
    if (passenger) {
      conditions.push(
        'f.id IN (SELECT flight_id FROM flight_passengers WHERE passenger_name LIKE ?)',
      );
      params.push(`%${passenger}%`);
    }
    if (airport) {
      conditions.push('(f.departure_airport = ? OR f.arrival_airport = ?)');
      params.push(airport, airport);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM flights f ${whereClause}`;
    const { total } = db.prepare(countQuery).get(...params) as { total: number };

    // Get flights
    const query = `
      SELECT f.* FROM flights f
      ${whereClause}
      ORDER BY f.date DESC
      LIMIT ? OFFSET ?
    `;
    const flights = db.prepare(query).all(...params, limit, offset) as Flight[];

    // Get passengers for each flight
    const passengerQuery = db.prepare(`
      SELECT * FROM flight_passengers WHERE flight_id = ?
    `);

    for (const flight of flights) {
      flight.passengers = passengerQuery.all(flight.id) as FlightPassenger[];
    }

    return {
      flights,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  getFlightById: (id: number): Flight | null => {
    const db = getDb();
    const flight = db.prepare('SELECT * FROM flights WHERE id = ?').get(id) as Flight | undefined;

    if (!flight) return null;

    flight.passengers = db
      .prepare('SELECT * FROM flight_passengers WHERE flight_id = ?')
      .all(id) as FlightPassenger[];

    return flight;
  },

  getFlightStats: (): FlightStats => {
    const db = getDb();

    const totalFlights = (
      db.prepare('SELECT COUNT(*) as count FROM flights').get() as { count: number }
    ).count;

    const uniquePassengers = (
      db.prepare('SELECT COUNT(DISTINCT passenger_name) as count FROM flight_passengers').get() as {
        count: number;
      }
    ).count;

    const topPassengers = db
      .prepare(
        `
      SELECT passenger_name as name, COUNT(*) as count
      FROM flight_passengers
      WHERE passenger_name != 'Jeffrey Epstein'
      GROUP BY passenger_name
      ORDER BY count DESC
      LIMIT 10
    `,
      )
      .all() as { name: string; count: number }[];

    const topRoutes = db
      .prepare(
        `
      SELECT departure_airport || ' → ' || arrival_airport as route, COUNT(*) as count
      FROM flights
      GROUP BY route
      ORDER BY count DESC
      LIMIT 10
    `,
      )
      .all() as { route: string; count: number }[];

    const flightsByYear = db
      .prepare(
        `
      SELECT substr(date, 1, 4) as year, COUNT(*) as count
      FROM flights
      GROUP BY year
      ORDER BY year ASC
    `,
      )
      .all() as { year: string; count: number }[];

    // Get all airports used
    const airports = db
      .prepare(
        `
      SELECT airport, SUM(cnt) as count FROM (
        SELECT departure_airport as airport, COUNT(*) as cnt FROM flights GROUP BY departure_airport
        UNION ALL
        SELECT arrival_airport as airport, COUNT(*) as cnt FROM flights GROUP BY arrival_airport
      ) GROUP BY airport ORDER BY count DESC
    `,
      )
      .all() as { airport: string; count: number }[];

    const airportsWithCity = airports.map((a) => ({
      code: a.airport,
      city: AIRPORT_COORDS[a.airport]?.city || a.airport,
      count: a.count,
    }));

    return {
      totalFlights,
      uniquePassengers,
      topPassengers,
      topRoutes,
      flightsByYear,
      airports: airportsWithCity,
    };
  },

  getPassengerFlights: (passengerName: string) => {
    const db = getDb();

    const flights = db
      .prepare(
        `
      SELECT f.*
      FROM flights f
      INNER JOIN flight_passengers fp ON f.id = fp.flight_id
      WHERE fp.passenger_name LIKE ?
      ORDER BY f.date DESC
    `,
      )
      .all(`%${passengerName}%`) as Flight[];

    // Get passengers for each flight
    const passengerQuery = db.prepare('SELECT * FROM flight_passengers WHERE flight_id = ?');
    for (const flight of flights) {
      flight.passengers = passengerQuery.all(flight.id) as FlightPassenger[];
    }

    return flights;
  },

  getUniquePassengers: () => {
    const db = getDb();
    return db
      .prepare(
        `
      SELECT DISTINCT fp.passenger_name as name, fp.entity_id, COUNT(*) as flight_count
      FROM flight_passengers fp
      GROUP BY fp.passenger_name
      ORDER BY flight_count DESC
    `,
      )
      .all() as { name: string; entity_id: number | null; flight_count: number }[];
  },

  getAirportCoords: () => {
    return AIRPORT_COORDS;
  },

  /**
   * Get passenger co-occurrence matrix - who flew together and how often
   */
  getPassengerCoOccurrences: (
    minFlights = 2,
  ): {
    passenger1: string;
    passenger2: string;
    flightsTogether: number;
    firstFlight: string;
    lastFlight: string;
  }[] => {
    const db = getDb();
    return db
      .prepare(
        `
      SELECT 
        fp1.passenger_name as passenger1,
        fp2.passenger_name as passenger2,
        COUNT(DISTINCT fp1.flight_id) as flightsTogether,
        MIN(f.date) as firstFlight,
        MAX(f.date) as lastFlight
      FROM flight_passengers fp1
      JOIN flight_passengers fp2 ON fp1.flight_id = fp2.flight_id AND fp1.passenger_name < fp2.passenger_name
      JOIN flights f ON fp1.flight_id = f.id
      WHERE fp1.passenger_name != 'Jeffrey Epstein' AND fp2.passenger_name != 'Jeffrey Epstein'
      GROUP BY fp1.passenger_name, fp2.passenger_name
      HAVING COUNT(DISTINCT fp1.flight_id) >= ?
      ORDER BY flightsTogether DESC
      LIMIT 50
    `,
      )
      .all(minFlights) as {
      passenger1: string;
      passenger2: string;
      flightsTogether: number;
      firstFlight: string;
      lastFlight: string;
    }[];
  },

  /**
   * Get co-passengers for a specific person
   */
  getCoPassengers: (
    passengerName: string,
  ): { name: string; flightsTogether: number; flights: string[] }[] => {
    const db = getDb();
    const results = db
      .prepare(
        `
      SELECT 
        fp2.passenger_name as name,
        COUNT(DISTINCT fp1.flight_id) as flightsTogether,
        GROUP_CONCAT(DISTINCT f.date) as flightDates
      FROM flight_passengers fp1
      JOIN flight_passengers fp2 ON fp1.flight_id = fp2.flight_id AND fp1.passenger_name != fp2.passenger_name
      JOIN flights f ON fp1.flight_id = f.id
      WHERE fp1.passenger_name LIKE ?
      GROUP BY fp2.passenger_name
      ORDER BY flightsTogether DESC
    `,
      )
      .all(`%${passengerName}%`) as {
      name: string;
      flightsTogether: number;
      flightDates: string;
    }[];

    return results.map((r) => ({
      name: r.name,
      flightsTogether: r.flightsTogether,
      flights: r.flightDates ? r.flightDates.split(',') : [],
    }));
  },

  /**
   * Get most frequent routes
   */
  getFrequentRoutes: (
    limit = 20,
  ): {
    departure: string;
    arrival: string;
    departureCity: string;
    arrivalCity: string;
    count: number;
    passengers: string[];
  }[] => {
    const db = getDb();
    const routes = db
      .prepare(
        `
      SELECT 
        f.departure_airport as departure,
        f.arrival_airport as arrival,
        f.departure_city as departureCity,
        f.arrival_city as arrivalCity,
        COUNT(*) as count,
        GROUP_CONCAT(DISTINCT fp.passenger_name) as passengerList
      FROM flights f
      LEFT JOIN flight_passengers fp ON f.id = fp.flight_id
      GROUP BY f.departure_airport, f.arrival_airport
      ORDER BY count DESC
      LIMIT ?
    `,
      )
      .all(limit) as {
      departure: string;
      arrival: string;
      departureCity: string;
      arrivalCity: string;
      count: number;
      passengerList: string;
    }[];

    return routes.map((r) => ({
      departure: r.departure,
      arrival: r.arrival,
      departureCity: r.departureCity,
      arrivalCity: r.arrivalCity,
      count: r.count,
      passengers: r.passengerList ? r.passengerList.split(',') : [],
    }));
  },

  /**
   * Get first and last flight dates for each passenger
   */
  getPassengerDateRanges: (): {
    name: string;
    firstFlight: string;
    lastFlight: string;
    totalFlights: number;
  }[] => {
    const db = getDb();
    return db
      .prepare(
        `
      SELECT 
        fp.passenger_name as name,
        MIN(f.date) as firstFlight,
        MAX(f.date) as lastFlight,
        COUNT(DISTINCT f.id) as totalFlights
      FROM flight_passengers fp
      JOIN flights f ON fp.flight_id = f.id
      GROUP BY fp.passenger_name
      ORDER BY totalFlights DESC
    `,
      )
      .all() as { name: string; firstFlight: string; lastFlight: string; totalFlights: number }[];
  },

  /**
   * Get flights by aircraft
   */
  getFlightsByAircraft: (): {
    aircraft: string;
    aircraftType: string;
    flightCount: number;
    passengerCount: number;
  }[] => {
    const db = getDb();
    return db
      .prepare(
        `
      SELECT 
        f.aircraft_tail as aircraft,
        f.aircraft_type as aircraftType,
        COUNT(DISTINCT f.id) as flightCount,
        COUNT(DISTINCT fp.passenger_name) as passengerCount
      FROM flights f
      LEFT JOIN flight_passengers fp ON f.id = fp.flight_id
      GROUP BY f.aircraft_tail
      ORDER BY flightCount DESC
    `,
      )
      .all() as {
      aircraft: string;
      aircraftType: string;
      flightCount: number;
      passengerCount: number;
    }[];
  },

  /**
   * Get destination frequency by passenger
   */
  getPassengerDestinations: (
    passengerName: string,
  ): { airport: string; city: string; visitCount: number }[] => {
    const db = getDb();
    return db
      .prepare(
        `
      SELECT 
        f.arrival_airport as airport,
        f.arrival_city as city,
        COUNT(*) as visitCount
      FROM flights f
      JOIN flight_passengers fp ON f.id = fp.flight_id
      WHERE fp.passenger_name LIKE ?
      GROUP BY f.arrival_airport
      ORDER BY visitCount DESC
    `,
      )
      .all(`%${passengerName}%`) as { airport: string; city: string; visitCount: number }[];
  },
};
