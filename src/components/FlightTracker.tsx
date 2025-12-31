import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { Link } from 'react-router-dom';
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

type ViewMode = 'timeline' | 'map' | 'stats';

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

  useEffect(() => {
    loadData();
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
        fetch('/api/flights/passengers')
      ]);

      const flightsData = await flightsRes.json();
      const statsData = await statsRes.json();
      const airportsData = await airportsRes.json();
      const passengersData = await passengersRes.json();

      setFlights(flightsData.flights || []);
      setStats(statsData);
      setAirports(airportsData);
      setPassengers(passengersData);
    } catch (error) {
      console.error('Failed to load flight data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Simple SVG world map with flight routes
  const MapView = () => {
    const uniqueRoutes = useMemo(() => {
      const routeMap = new Map<string, number>();
      flights.forEach(f => {
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
            <line key={`h${i}`} x1="0" y1={i * 50} x2="800" y2={i * 50} stroke="#1a1a2e" strokeWidth="0.5" />
          ))}
          {[...Array(17)].map((_, i) => (
            <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="400" stroke="#1a1a2e" strokeWidth="0.5" />
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
            const flightCount = stats?.airports.find(a => a.code === code)?.count || 0;
            
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
      {flights.map((flight, index) => (
        <div 
          key={flight.id} 
          className="flight-card"
          onClick={() => setSelectedFlight(flight)}
        >
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
                <span className="more-passengers">+{(flight.passengers?.length || 0) - 3} more</span>
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
                style={{ height: `${(y.count / Math.max(...stats.flightsByYear.map(x => x.count))) * 100}%` }}
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
  const toSvgCoords = (lat: number, lng: number, width: number, height: number) => {
    const x = ((lng + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return { x, y };
  };

  // Flight path mini-map for modal using OpenStreetMap
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
    
    // Calculate bounding box to show both markers
    const minLat = Math.min(fromCoords.lat, toCoords.lat);
    const maxLat = Math.max(fromCoords.lat, toCoords.lat);
    const minLng = Math.min(fromCoords.lng, toCoords.lng);
    const maxLng = Math.max(fromCoords.lng, toCoords.lng);
    
    // Add padding to bbox
    const latPadding = (maxLat - minLat) * 0.3 || 0.5;
    const lngPadding = (maxLng - minLng) * 0.3 || 0.5;
    
    // OpenStreetMap embed URL showing both points with bounding box
    const bbox = `${minLng - lngPadding},${minLat - latPadding},${maxLng + lngPadding},${maxLat + latPadding}`;
    const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${fromCoords.lat},${fromCoords.lng}`;
    
    // Google Maps URL for external link
    const googleMapsUrl = `https://www.google.com/maps/dir/${fromCoords.lat},${fromCoords.lng}/${toCoords.lat},${toCoords.lng}`;
    
    return (
      <div className="flight-path-map">
        <div className="relative h-48 bg-slate-900 rounded-t-lg overflow-hidden">
          <iframe
            src={osmUrl}
            className="w-full h-full border-0"
            title={`Flight route: ${flight.departure_airport} to ${flight.arrival_airport}`}
            loading="lazy"
          />
          {/* Route overlay info */}
          <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs">
            <span className="text-cyan-300 font-bold">{flight.departure_airport}</span>
            <span className="text-slate-400">✈ → ✈</span>
            <span className="text-red-300 font-bold">{flight.arrival_airport}</span>
          </div>
        </div>
        <a 
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium transition-colors rounded-b-lg"
        >
          <Icon name="ExternalLink" size="sm" />
          View Full Route in Google Maps
        </a>
      </div>
    );
  };

  // Flight detail modal
  const FlightModal = () => {
    if (!selectedFlight) return null;
    
    return createPortal(
      <div className="flight-modal-overlay" onClick={() => setSelectedFlight(null)}>
        <div className="flight-modal" onClick={e => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setSelectedFlight(null)}>×</button>
          
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
            <p>{selectedFlight.aircraft_type} ({selectedFlight.aircraft_tail})</p>
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
        </div>
      </div>,
      document.body
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
          <button 
            className={viewMode === 'map' ? 'active' : ''} 
            onClick={() => setViewMode('map')}
          >
            <Icon name="Globe" size="sm" /> Map
          </button>
          <button 
            className={viewMode === 'stats' ? 'active' : ''} 
            onClick={() => setViewMode('stats')}
          >
            <Icon name="BarChart3" size="sm" /> Stats
          </button>
        </div>
        
        <div className="filters">
          <select 
            value={selectedPassenger} 
            onChange={(e) => setSelectedPassenger(e.target.value)}
            className="passenger-filter"
          >
            <option value="">All Passengers</option>
            {passengers.map(p => (
              <option key={p.name} value={p.name}>
                {p.name} ({p.flight_count})
              </option>
            ))}
          </select>
          
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(r => ({ ...r, start: e.target.value }))}
            placeholder="From"
            className="date-filter"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(r => ({ ...r, end: e.target.value }))}
            placeholder="To"
            className="date-filter"
          />
        </div>
      </div>
      
      <div className="tracker-content">
        {viewMode === 'timeline' && <TimelineView />}
        {viewMode === 'map' && <MapView />}
        {viewMode === 'stats' && <StatsView />}
      </div>
      
      <FlightModal />
    </div>
  );
};

export default FlightTracker;
