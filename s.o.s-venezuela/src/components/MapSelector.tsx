import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search, Navigation, AlertTriangle } from 'lucide-react';
import { LocationInfo } from '../types';

interface MapSelectorProps {
  value: LocationInfo;
  onChange: (value: LocationInfo) => void;
  label?: string;
}

export default function MapSelector({ value, onChange, label = "Ubicación" }: MapSelectorProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  
  const [searchQuery, setSearchQuery] = useState(value.address);
  const [searching, setSearching] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize Leaflet Map
  useEffect(() => {
    // Check if Leaflet (window.L) is loaded via CDN
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;

    // Standard coordinates for Venezuela center or Las Tejerías
    const defaultLat = value.lat || 10.2522;
    const defaultLng = value.lng || -67.1534;

    try {
      if (!mapRef.current) {
        // Create map
        mapRef.current = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], 13);
        
        // Load OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapRef.current);

        setMapLoaded(true);

        // Create customizable marker icon or use default
        const defaultIcon = L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
        });

        // Add draggable marker
        markerRef.current = L.marker([defaultLat, defaultLng], {
          icon: defaultIcon,
          draggable: true
        }).addTo(mapRef.current);

        // Set up marker dragend event
        markerRef.current.on('dragend', async () => {
          const position = markerRef.current.getLatLng();
          await handleCoordsChange(position.lat, position.lng);
        });

        // Set up map click event to place marker
        mapRef.current.on('click', async (e: any) => {
          const { lat, lng } = e.latlng;
          markerRef.current.setLatLng([lat, lng]);
          await handleCoordsChange(lat, lng);
        });
      } else {
        // If map already exists, update view
        mapRef.current.setView([defaultLat, defaultLng]);
        markerRef.current.setLatLng([defaultLat, defaultLng]);
      }
    } catch (err) {
      console.error("Error initializing Leaflet:", err);
      setError("No se pudo cargar el mapa interactivo. Se usará el buscador por dirección.");
    }

    return () => {
      // Cleanup map on unmount
      if (mapRef.current) {
        // Note: Map auto cleanup can sometimes fail if DOM is already gone, so we wrap in try/catch
        try {
          mapRef.current.remove();
          mapRef.current = null;
          markerRef.current = null;
        } catch (e) {}
      }
    };
  }, [value.lat, value.lng]);

  // Handle manual coordinate changes (e.g. from marker drag)
  const handleCoordsChange = async (lat: number, lng: number) => {
    try {
      // Reverse geocode via OpenStreetMap Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'es' } }
      );
      if (response.ok) {
        const data = await response.json();
        const address = data.display_name || `Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setSearchQuery(address);
        onChange({ address, lat, lng });
      } else {
        onChange({
          address: `Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          lat,
          lng
        });
      }
    } catch (err) {
      onChange({
        address: `Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        lat,
        lng
      });
    }
  };

  // Search Address (Forward Geocoding)
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=ve&limit=1`,
        { headers: { 'Accept-Language': 'es' } }
      );

      if (response.ok) {
        const results = await response.json();
        if (results && results.length > 0) {
          const { lat, lon, display_name } = results[0];
          const latitude = parseFloat(lat);
          const longitude = parseFloat(lon);

          onChange({
            address: display_name,
            lat: latitude,
            lng: longitude
          });

          setSearchQuery(display_name);

          // Update map if available
          if (mapRef.current && markerRef.current) {
            mapRef.current.setView([latitude, longitude], 15);
            markerRef.current.setLatLng([latitude, longitude]);
          }
        } else {
          setError("No se encontró la dirección en Venezuela. Intenta con más detalles (ej: 'Las Tejerías, Aragua').");
        }
      } else {
        setError("Error al buscar la ubicación. Intente de nuevo.");
      }
    } catch (err) {
      setError("No hay conexión con el servicio de mapas.");
    } finally {
      setSearching(false);
    }
  };

  // Geolocation API (Browser "Use My Location")
  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setError("La geolocalización no está soportada por tu navegador.");
      return;
    }

    setGeolocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await handleCoordsChange(latitude, longitude);
        setGeolocating(false);

        // Update map if loaded
        if (mapRef.current && markerRef.current) {
          mapRef.current.setView([latitude, longitude], 16);
          markerRef.current.setLatLng([latitude, longitude]);
        }
      },
      (err) => {
        console.error(err);
        setError("Permiso de ubicación denegado o no disponible.");
        setGeolocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        {label} <span className="text-brand-red font-semibold">*</span>
      </label>

      {/* Geocoding Input Box */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Introduce dirección, sector, refugio o ciudad de Venezuela..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
          />
          <MapPin className="absolute left-3 top-2.5 h-4 text-slate-400" />
        </div>
        <button
          type="button"
          onClick={() => handleSearch()}
          disabled={searching}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition duration-150 flex items-center gap-1 cursor-pointer disabled:opacity-50"
        >
          {searching ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Buscar
        </button>
        <button
          type="button"
          onClick={handleGeolocation}
          disabled={geolocating}
          title="Usar mi ubicación actual"
          className="p-2 bg-blue-50 text-brand-blue border border-blue-200 rounded-lg hover:bg-blue-100 transition duration-150 flex items-center justify-center cursor-pointer disabled:opacity-50"
        >
          <Navigation className={`h-4 w-4 ${geolocating ? 'animate-pulse' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-2.5 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Map Display area */}
      <div className="relative border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-slate-100 h-64">
        {!(window as any).L && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-slate-500 text-sm">
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-400 border-t-transparent mb-2" />
            <p>Cargando mapa interactivo de Venezuela...</p>
          </div>
        )}
        <div ref={mapContainerRef} className="h-full w-full" />
        
        {/* Floating current coordinates display */}
        <div className="absolute bottom-2 left-2 z-[400] bg-white/95 backdrop-blur px-2.5 py-1 text-[10px] font-mono text-slate-500 rounded border border-slate-200 shadow-sm">
          LAT: {value.lat.toFixed(5)} | LNG: {value.lng.toFixed(5)}
        </div>
      </div>
      
      <p className="text-[11px] text-slate-400 italic">
        * Arrastra el marcador rojo en el mapa para ajustar la ubicación exacta del avistamiento o desaparición.
      </p>
    </div>
  );
}
