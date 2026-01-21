import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { Link } from 'react-router-dom';
import { AddToInvestigationButton } from './AddToInvestigationButton';
import './FlightTracker.css';

interface Flight {
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
  passengers?: { passenger_name: string; role: string; entity_id?: number }[];
}

interface FlightStats {
  totalFlights: number;
  uniquePassengers: number;
  topPassengers: { name: string; count: number }[];
  topRoutes: { route: string; count: number }[];
  flightsByYear: { year: string; count: number }[];
  airports: { code: string; city: string; count: number }[];
}

interface AirportCoords {
  [code: string]: { lat: number; lng: number; city: string };
}

type ViewMode = 'timeline' | 'map' | 'stats' | 'network';

interface CoOccurrence {
  passenger1: string;
  passenger2: string;
  flights_together: number;
  entity_id1?: number;
  entity_id2?: number;
}

const FlightTracker: React.FC = () => {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [stats, setStats] = useState<FlightStats | null>(null);
  const [airports, setAirports] = useState<AirportCoords>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [selectedPassenger, setSelectedPassenger] = useState<string>('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [passengers, setPassengers] = useState<{ name: string; flight_count: number }[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [coOccurrences, setCoOccurrences] = useState<CoOccurrence[]>([]);
  const [networkLoading, setNetworkLoading] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadData is stable and defined below
  }, [selectedPassenger, dateRange.start, dateRange.end]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedPassenger) params.append('passenger', selectedPassenger);
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);
      params.append('limit', '100');

      const [flightsRes, statsRes, airportsRes, passengersRes] = await Promise.all([
        fetch(`/api/flights?${params}`),
        fetch('/api/flights/stats'),
        fetch('/api/flights/airports'),
        fetch('/api/flights/passengers'),
      ]);

      const flightsData = await flightsRes.json();
      const statsData = await statsRes.json();
      const airportsData = await airportsRes.json();
      const passengersData = await passengersRes.json();

      setFlights(flightsData.flights || []);
      setStats(statsData);
      setAirports(airportsData);
      // Ensure passengersData is an array
      setPassengers(
        Array.isArray(passengersData) ? passengersData : passengersData.passengers || [],
      );
    } catch (error) {
      console.error('Failed to load flight data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCoOccurrences = async () => {
    setNetworkLoading(true);
    try {
      const res = await fetch('/api/flights/co-occurrences?minFlights=2&limit=100');
      const data = await res.json();
      setCoOccurrences(data || []);
    } catch (error) {
      console.error('Failed to load co-occurrences:', error);
    } finally {
      setNetworkLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'network' && coOccurrences.length === 0) {
      loadCoOccurrences();
    }
  }, [viewMode]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Simple SVG world map with flight routes
  const MapView = () => {
    const uniqueRoutes = useMemo(() => {
      const routeMap = new Map<string, number>();
      flights.forEach((f) => {
        const key = `${f.departure_airport}-${f.arrival_airport}`;
        routeMap.set(key, (routeMap.get(key) || 0) + 1);
      });
      return Array.from(routeMap.entries()).map(([key, count]) => {
        const [from, to] = key.split('-');
        return { from, to, count };
      });
    }, [flights]);

    // Convert lat/lng to SVG coordinates (simple Mercator-like projection)
    const toSvgCoords = (lat: number, lng: number) => {
      const x = ((lng + 180) / 360) * 800;
      const y = ((90 - lat) / 180) * 400;
      return { x, y };
    };

    return (
      <div className="flight-map-container">
        <svg viewBox="0 0 800 400" className="flight-map">
          {/* Simple world background */}
          <rect x="0" y="0" width="800" height="400" fill="#0a0a1a" />

          {/* Grid lines */}
          {[...Array(9)].map((_, i) => (
            <line
              key={`h${i}`}
              x1="0"
              y1={i * 50}
              x2="800"
              y2={i * 50}
              stroke="#1a1a2e"
              strokeWidth="0.5"
            />
          ))}
          {[...Array(17)].map((_, i) => (
            <line
              key={`v${i}`}
              x1={i * 50}
              y1="0"
              x2={i * 50}
              y2="400"
              stroke="#1a1a2e"
              strokeWidth="0.5"
            />
          ))}

          {/* Draw routes */}
          {uniqueRoutes.map((route, i) => {
            const fromCoords = airports[route.from];
            const toCoords = airports[route.to];
            if (!fromCoords || !toCoords) return null;

            const from = toSvgCoords(fromCoords.lat, fromCoords.lng);
            const to = toSvgCoords(toCoords.lat, toCoords.lng);

            // Calculate control point for curved line
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2 - 30;

            return (
              <g key={i}>
                <path
                  d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
                  fill="none"
                  stroke={`rgba(0, 200, 255, ${Math.min(0.3 + route.count * 0.1, 0.9)})`}
                  strokeWidth={Math.min(1 + route.count * 0.3, 3)}
                  strokeDasharray="5,3"
                  className="flight-route"
                />
              </g>
            );
          })}

          {/* Draw airports */}
          {Object.entries(airports).map(([code, coords]) => {
            const { x, y } = toSvgCoords(coords.lat, coords.lng);
            const flightCount = stats?.airports.find((a) => a.code === code)?.count || 0;

            return (
              <g key={code} className="airport-marker">
                <circle
                  cx={x}
                  cy={y}
                  r={Math.min(4 + flightCount * 0.3, 10)}
                  fill="#00c8ff"
                  opacity="0.8"
                />
                <circle
                  cx={x}
                  cy={y}
                  r={Math.min(4 + flightCount * 0.3, 10)}
                  fill="none"
                  stroke="#00c8ff"
                  strokeWidth="2"
                  className="airport-pulse"
                />
                <text
                  x={x}
                  y={y - 12}
                  fill="#fff"
                  fontSize="8"
                  textAnchor="middle"
                  className="airport-label"
                >
                  {code}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="map-legend">
          <h4>Key Locations</h4>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-dot primary" /> Primary Hubs
            </div>
            <div className="legend-item">
              <span className="legend-dot secondary" /> Destinations
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Timeline view
  const TimelineView = () => (
    <div className="flight-timeline">
      {flights.map((flight, _index) => (
        <div key={flight.id} className="flight-card" onClick={() => setSelectedFlight(flight)}>
          <div className="flight-date">
            <span className="date-badge">{formatDate(flight.date)}</span>
          </div>

          <div className="flight-route">
            <div className="airport departure">
              <span className="airport-code">{flight.departure_airport}</span>
              <span className="airport-city">{flight.departure_city}</span>
            </div>

            <div className="flight-line">
              <div className="plane-icon">✈</div>
              <div className="dashed-line" />
            </div>

            <div className="airport arrival">
              <span className="airport-code">{flight.arrival_airport}</span>
              <span className="airport-city">{flight.arrival_city}</span>
            </div>
          </div>

          <div className="flight-passengers">
            <span className="passenger-count">
              <Icon name="Users" size="sm" /> {flight.passengers?.length || 0} passengers
            </span>
            <div className="passenger-names">
              {flight.passengers?.slice(0, 3).map((p, i) => (
                <span key={i} className={`passenger-tag ${p.role}`}>
                  {p.passenger_name}
                </span>
              ))}
              {(flight.passengers?.length || 0) > 3 && (
                <span className="more-passengers">
                  +{(flight.passengers?.length || 0) - 3} more
                </span>
              )}
            </div>
          </div>

          <div className="flight-aircraft">
            <span className="tail-number">{flight.aircraft_tail}</span>
            <span className="aircraft-type">{flight.aircraft_type}</span>
          </div>
        </div>
      ))}
    </div>
  );

  // Network/Co-occurrence view
  const NetworkView = () => {
    // Build nodes from unique passengers
    const nodes = useMemo(() => {
      const nodeMap = new Map<string, { name: string; connections: number; entityId?: number }>();
      coOccurrences.forEach((co) => {
        if (!nodeMap.has(co.passenger1)) {
          nodeMap.set(co.passenger1, { name: co.passenger1, connections: 0, entityId: co.entity_id1 });
        }
        if (!nodeMap.has(co.passenger2)) {
          nodeMap.set(co.passenger2, { name: co.passenger2, connections: 0, entityId: co.entity_id2 });
        }
        nodeMap.get(co.passenger1)!.connections += co.flights_together;
        nodeMap.get(co.passenger2)!.connections += co.flights_together;
      });
      return Array.from(nodeMap.values()).sort((a, b) => b.connections - a.connections);
    }, [coOccurrences]);

    // Top connections for the selected view
    const topConnections = useMemo(() => {
      return coOccurrences.slice(0, 30);
    }, [coOccurrences]);

    if (networkLoading) {
      return (
        <div className="loading-state">
          <div className="loading-spinner">
            <div className="radar-sweep" />
            <span>Analyzing passenger connections...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="network-view">
        <div className="network-header">
          <h3><Icon name="Users" size="sm" /> Passenger Co-Occurrence Network</h3>
          <p className="network-description">
            Shows which passengers frequently flew together. Stronger connections indicate more shared flights.
          </p>
        </div>

        {/* Top Co-Travelers */}
        <div className="co-occurrence-list">
          <h4>Top Co-Travelers</h4>
          <div className="co-occurrence-grid">
            {topConnections.map((co, i) => (
              <div key={i} className="co-occurrence-card">
                <div className="co-passengers">
                  <span className="passenger-name">
                    {co.entity_id1 ? (
                      <Link to={`/entity/${co.entity_id1}`}>{co.passenger1}</Link>
                    ) : co.passenger1}
                  </span>
                  <span className="connection-indicator">
                    <Icon name="Link" size="sm" />
                    <span className="flight-count">{co.flights_together}</span>
                  </span>
                  <span className="passenger-name">
                    {co.entity_id2 ? (
                      <Link to={`/entity/${co.entity_id2}`}>{co.passenger2}</Link>
                    ) : co.passenger2}
                  </span>
                </div>
                <div className="connection-bar">
                  <div 
                    className="connection-fill"
                    style={{ width: `${Math.min((co.flights_together / (topConnections[0]?.flights_together || 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most Connected Passengers */}
        <div className="connected-passengers">
          <h4>Most Connected Passengers</h4>
          <div className="passenger-connections-grid">
            {nodes.slice(0, 15).map((node, i) => (
              <div key={i} className="passenger-connection-card">
                <span className="rank">#{i + 1}</span>
                <span className="name">
                  {node.entityId ? (
                    <Link to={`/entity/${node.entityId}`}>{node.name}</Link>
                  ) : node.name}
                </span>
                <span className="connection-count">
                  {node.connections} shared flights
                </span>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          .network-view {
            padding: 20px;
          }
          .network-header {
            margin-bottom: 24px;
          }
          .network-header h3 {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0 0 8px 0;
          }
          .network-description {
            color: #888;
            margin: 0;
          }
          .co-occurrence-list, .connected-passengers {
            background: #1a1a2e;
            border: 1px solid #2a2a4a;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
          }
          .co-occurrence-list h4, .connected-passengers h4 {
            margin: 0 0 16px 0;
            font-size: 1rem;
          }
          .co-occurrence-grid {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .co-occurrence-card {
            background: #0a0a1a;
            border-radius: 8px;
            padding: 12px 16px;
          }
          .co-passengers {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
          }
          .passenger-name {
            flex: 1;
          }
          .passenger-name a {
            color: #6366f1;
            text-decoration: none;
          }
          .passenger-name a:hover {
            text-decoration: underline;
          }
          .connection-indicator {
            display: flex;
            align-items: center;
            gap: 4px;
            color: #10b981;
            font-weight: 600;
          }
          .flight-count {
            background: #10b981;
            color: #000;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.85rem;
          }
          .connection-bar {
            height: 4px;
            background: #2a2a4a;
            border-radius: 2px;
            overflow: hidden;
          }
          .connection-fill {
            height: 100%;
            background: linear-gradient(90deg, #6366f1, #10b981);
            border-radius: 2px;
            transition: width 0.3s ease;
          }
          .passenger-connections-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 12px;
          }
          .passenger-connection-card {
            display: flex;
            align-items: center;
            gap: 12px;
            background: #0a0a1a;
            padding: 12px 16px;
            border-radius: 8px;
          }
          .passenger-connection-card .rank {
            font-weight: 700;
            color: #6366f1;
            min-width: 30px;
          }
          .passenger-connection-card .name {
            flex: 1;
          }
          .passenger-connection-card .name a {
            color: #6366f1;
            text-decoration: none;
          }
          .passenger-connection-card .connection-count {
            color: #888;
            font-size: 0.85rem;
          }
        `}</style>
      </div>
    );
  };

  // Stats view
  const StatsView = () => (
    <div className="flight-stats-grid">
      <div className="stat-card primary">
        <div className="stat-icon">✈</div>
        <div className="stat-value">{stats?.totalFlights || 0}</div>
        <div className="stat-label">Total Flights</div>
      </div>

      <div className="stat-card">
        <div className="stat-icon">👥</div>
        <div className="stat-value">{stats?.uniquePassengers || 0}</div>
        <div className="stat-label">Unique Passengers</div>
      </div>

      <div className="stat-card full-width">
        <h3>Top Passengers</h3>
        <div className="stat-bars">
          {stats?.topPassengers.slice(0, 8).map((p, i) => (
            <div key={i} className="stat-bar-item">
              <span className="bar-label">{p.name}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${(p.count / (stats.topPassengers[0]?.count || 1)) * 100}%` }}
                />
              </div>
              <span className="bar-value">{p.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="stat-card">
        <h3>Top Routes</h3>
        <div className="route-list">
          {stats?.topRoutes.slice(0, 5).map((r, i) => (
            <div key={i} className="route-item">
              <span className="route-path">{r.route}</span>
              <span className="route-count">{r.count}x</span>
            </div>
          ))}
        </div>
      </div>

      <div className="stat-card">
        <h3>Flights by Year</h3>
        <div className="year-chart">
          {stats?.flightsByYear.map((y, i) => (
            <div key={i} className="year-bar">
              <div
                className="year-fill"
                style={{
                  height: `${(y.count / Math.max(...stats.flightsByYear.map((x) => x.count))) * 100}%`,
                }}
              />
              <span className="year-label">{y.year}</span>
              <span className="year-count">{y.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Convert lat/lng to SVG coordinates for flight path map
  const _toSvgCoords = (lat: number, lng: number, width: number, height: number) => {
    const x = ((lng + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return { x, y };
  };

  // Flight path mini-map for modal using SVG (better control than iframe)
  const FlightPathMap = ({ flight }: { flight: Flight }) => {
    const fromCoords = airports[flight.departure_airport];
    const toCoords = airports[flight.arrival_airport];

    if (!fromCoords || !toCoords) {
      return (
        <div className="flight-path-map-placeholder">
          <Icon name="Globe" size="lg" />
          <span>Map coordinates unavailable for this route</span>
        </div>
      );
    }

    // Determine bounds
    const lats = [fromCoords.lat, toCoords.lat];
    const lngs = [fromCoords.lng, toCoords.lng];
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Add 20% padding
    const latPad = Math.max((maxLat - minLat) * 0.4, 2);
    const lngPad = Math.max((maxLng - minLng) * 0.4, 2);

    const viewBoxMinLng = minLng - lngPad;
    const viewBoxMaxLng = maxLng + lngPad;
    const viewBoxMinLat = minLat - latPad;
    const viewBoxMaxLat = maxLat + latPad;

    // Helper to project lat/lng to 0-100 coordinate space
    const project = (lat: number, lng: number) => {
      const x = ((lng - viewBoxMinLng) / (viewBoxMaxLng - viewBoxMinLng)) * 100;
      // Invert Y because SVG Y grows downwards, but Latitude grows upwards
      const y = 100 - ((lat - viewBoxMinLat) / (viewBoxMaxLat - viewBoxMinLat)) * 100;
      return { x, y };
    };

    const start = project(fromCoords.lat, fromCoords.lng);
    const end = project(toCoords.lat, toCoords.lng);

    // Calculate curve control point (offset perpendicular to line)
    // Simple approach: midpoint with Y offset?
    // Better: offset based on direction. For simplicity, just arch "up" (lower Y)
    const midX = (start.x + end.x) / 2;
    const midY = Math.min(start.y, end.y) - 20;

    const googleMapsUrl = `https://www.google.com/maps/dir/${fromCoords.lat},${fromCoords.lng}/${toCoords.lat},${toCoords.lng}`;

    return (
      <div className="flight-path-map">
        <div className="relative h-48 bg-slate-900 rounded-t-lg overflow-hidden border-b border-slate-800">
          {/* SVG Map */}
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meeting"
          >
            {/* Background gradient or solid color is handled by container */}

            {/* Grid/Context cues - simplified */}
            <rect x="0" y="0" width="100" height="100" fill="#0f172a" />

            {/* Route Line */}
            <path
              d={`M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`}
              fill="none"
              stroke="#06b6d4" // cyan-500
              strokeWidth="1.5"
              strokeDasharray="4 2"
              className="animate-[dash_20s_linear_infinite]"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="100"
                to="0"
                dur="2s"
                repeatCount="indefinite"
              />
            </path>

            {/* Start Point */}
            <circle cx={start.x} cy={start.y} r="2" fill="#3b82f6" />
            <text x={start.x} y={start.y + 5} fill="#94a3b8" fontSize="3" textAnchor="middle">
              {flight.departure_airport}
            </text>

            {/* End Point */}
            <circle cx={end.x} cy={end.y} r="2" fill="#ef4444" />
            <text x={end.x} y={end.y + 5} fill="#94a3b8" fontSize="3" textAnchor="middle">
              {flight.arrival_airport}
            </text>
          </svg>

          {/* Route overlay info */}
          <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs pointer-events-none">
            <span className="text-cyan-300 font-bold">{flight.departure_airport}</span>
            <span className="text-slate-400 text-[10px] uppercase tracking-wider">Flight Path</span>
            <span className="text-red-300 font-bold">{flight.arrival_airport}</span>
          </div>
        </div>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium transition-colors rounded-b-lg group"
        >
          <Icon
            name="ExternalLink"
            size="sm"
            className="group-hover:scale-110 transition-transform"
          />
          View Detailed Ground Map
        </a>
      </div>
    );
  };

  // Flight detail modal
  const FlightModal = () => {
    if (!selectedFlight) return null;

    return createPortal(
      <div className="flight-modal-overlay" onClick={() => setSelectedFlight(null)}>
        <div className="flight-modal" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setSelectedFlight(null)}>
            ×
          </button>

          <div className="modal-header" style={{ paddingRight: '3rem' }}>
            <h2>Flight Details</h2>
            <span className="flight-date">{formatDate(selectedFlight.date)}</span>
          </div>

          {/* Flight Path Map */}
          <FlightPathMap flight={selectedFlight} />

          <div className="modal-route">
            <div className="route-endpoint">
              <span className="code">{selectedFlight.departure_airport}</span>
              <span className="city">{selectedFlight.departure_city}</span>
            </div>
            <div className="route-arrow">→</div>
            <div className="route-endpoint">
              <span className="code">{selectedFlight.arrival_airport}</span>
              <span className="city">{selectedFlight.arrival_city}</span>
            </div>
          </div>

          <div className="modal-section">
            <h3>Aircraft</h3>
            <p>
              {selectedFlight.aircraft_type} ({selectedFlight.aircraft_tail})
            </p>
          </div>

          <div className="modal-section">
            <h3>Passenger Manifest ({selectedFlight.passengers?.length || 0})</h3>
            <div className="passenger-list">
              {selectedFlight.passengers?.map((p, i) => (
                <div key={i} className="passenger-row">
                  <span className={`role-badge ${p.role}`}>{p.role}</span>
                  {p.entity_id ? (
                    <Link to={`/entity/${p.entity_id}`} className="passenger-link">
                      {p.passenger_name}
                    </Link>
                  ) : (
                    <span>{p.passenger_name}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add to Investigation */}
          <div className="modal-section" style={{ borderTop: '1px solid #2a2a4a', paddingTop: '16px' }}>
            <AddToInvestigationButton
              item={{
                id: String(selectedFlight.id),
                title: `Flight ${selectedFlight.aircraft_tail}: ${selectedFlight.departure_airport} → ${selectedFlight.arrival_airport}`,
                description: `${formatDate(selectedFlight.date)} - ${selectedFlight.passengers?.length || 0} passengers including ${selectedFlight.passengers?.slice(0, 3).map(p => p.passenger_name).join(', ')}${selectedFlight.passengers && selectedFlight.passengers.length > 3 ? '...' : ''}`,
                type: 'flight',
                sourceId: String(selectedFlight.id),
                metadata: {
                  date: selectedFlight.date,
                  departure: selectedFlight.departure_airport,
                  arrival: selectedFlight.arrival_airport,
                  aircraft: selectedFlight.aircraft_tail,
                  passengerCount: selectedFlight.passengers?.length || 0,
                },
              }}
              variant="button"
            />
          </div>
        </div>
      </div>,
      document.body,
    );
  };

  if (loading) {
    return (
      <div className="flight-tracker loading-state">
        <div className="loading-spinner">
          <div className="radar-sweep" />
          <span>Loading Flight Data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flight-tracker">
      <div className="tracker-header">
        <div className="header-left">
          <h1>
            <Icon name="Navigation" size="lg" />
            Flight Tracker
          </h1>
          <p className="subtitle">Tracking flights on N908JE "Lolita Express"</p>
        </div>

        <div className="header-stats">
          <div className="mini-stat">
            <span className="value">{stats?.totalFlights || 0}</span>
            <span className="label">Flights</span>
          </div>
          <div className="mini-stat">
            <span className="value">{stats?.uniquePassengers || 0}</span>
            <span className="label">Passengers</span>
          </div>
          <div className="mini-stat">
            <span className="value">{Object.keys(airports).length}</span>
            <span className="label">Airports</span>
          </div>
        </div>
      </div>

      <div className="tracker-controls">
        <div className="view-toggle">
          <button
            className={viewMode === 'timeline' ? 'active' : ''}
            onClick={() => setViewMode('timeline')}
          >
            <Icon name="List" size="sm" /> Timeline
          </button>
          <button className={viewMode === 'map' ? 'active' : ''} onClick={() => setViewMode('map')}>
            <Icon name="Globe" size="sm" /> Map
          </button>
          <button
            className={viewMode === 'stats' ? 'active' : ''}
            onClick={() => setViewMode('stats')}
          >
            <Icon name="BarChart3" size="sm" /> Stats
          </button>
          <button
            className={viewMode === 'network' ? 'active' : ''}
            onClick={() => setViewMode('network')}
          >
            <Icon name="Users" size="sm" /> Network
          </button>
        </div>

        <div className="filters">
          <select
            value={selectedPassenger}
            onChange={(e) => setSelectedPassenger(e.target.value)}
            className="passenger-filter"
          >
            <option value="">All Passengers</option>
            {(passengers || []).map((p) => (
              <option key={p.name} value={p.name}>
                {p.name} ({p.flight_count})
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange((r) => ({ ...r, start: e.target.value }))}
            placeholder="From"
            className="date-filter"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange((r) => ({ ...r, end: e.target.value }))}
            placeholder="To"
            className="date-filter"
          />
        </div>
      </div>

      <div className="tracker-content">
        {viewMode === 'timeline' && <TimelineView />}
        {viewMode === 'map' && <MapView />}
        {viewMode === 'stats' && <StatsView />}
        {viewMode === 'network' && <NetworkView />}
      </div>

      <FlightModal />
    </div>
  );
};

export default FlightTracker;
