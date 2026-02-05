import React, { useState } from 'react';
import { MapPin, Maximize2, Minimize2, ExternalLink, Navigation } from 'lucide-react';

interface LocationMapProps {
  latitude: number;
  longitude: number;
  title?: string;
  className?: string;
}

export const LocationMap: React.FC<LocationMapProps> = ({
  latitude,
  longitude,
  title = 'Location',
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Round coordinates for display
  const latDisplay = Math.abs(latitude).toFixed(5) + '° ' + (latitude >= 0 ? 'N' : 'S');
  const lngDisplay = Math.abs(longitude).toFixed(5) + '° ' + (longitude >= 0 ? 'E' : 'W');

  // Generate map URLs
  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  const appleMapsUrl = `https://maps.apple.com/?ll=${latitude},${longitude}&q=${encodeURIComponent(title)}`;

  // OpenStreetMap embed URL (free, no API key needed)
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01}&layer=mapnik&marker=${latitude},${longitude}`;
  const osmLargeUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.05},${latitude - 0.05},${longitude + 0.05},${latitude + 0.05}&layer=mapnik&marker=${latitude},${longitude}`;

  // Detect if user is on Apple device
  const isAppleDevice = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-900/95 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-white font-semibold">{title}</h3>
              <p className="text-sm text-slate-400">
                {latDisplay}, {lngDisplay}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={isAppleDevice ? appleMapsUrl : googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Navigation className="w-4 h-4" />
              Open in Maps
            </a>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Full map */}
        <div className="flex-1">
          <iframe
            src={osmLargeUrl}
            className="w-full h-full border-0"
            title={`Map of ${title}`}
            loading="lazy"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-white">Location</span>
        </div>
        <button
          onClick={() => setIsExpanded(true)}
          className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
          title="Expand map"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Mini map */}
      <div className="relative h-32 cursor-pointer" onClick={() => setIsExpanded(true)}>
        <iframe
          src={osmEmbedUrl}
          className="w-full h-full border-0 pointer-events-none"
          title={`Map of ${title}`}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none" />
      </div>

      {/* Coordinates & Links */}
      <div className="p-3 space-y-2">
        <div className="text-xs text-slate-400 font-mono">
          {latDisplay}, {lngDisplay}
        </div>
        <div className="flex gap-2">
          <a
            href={appleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Apple Maps
          </a>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Google Maps
          </a>
        </div>
      </div>
    </div>
  );
};

export default LocationMap;
