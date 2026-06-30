import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Info, Users, ShieldAlert } from 'lucide-react';
import { Report } from '../types';

interface DirectoryMapProps {
  reports: Report[];
}

export default function DirectoryMap({ reports }: DirectoryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;

    try {
      if (!mapRef.current) {
        // Initialize map centered around north-central Venezuela (Aragua/Vargas/Caracas area)
        mapRef.current = L.map(mapContainerRef.current).setView([10.4806, -66.9036], 9);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapRef.current);

        // Group for all markers to handle dynamic updates
        markersGroupRef.current = L.layerGroup().addTo(mapRef.current);
      }

      // Clear previous markers
      if (markersGroupRef.current) {
        markersGroupRef.current.clearLayers();
      }

      // Create customizable marker icons
      const missingIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      });

      const foundIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      });

      // Plot all active reports as markers
      reports.forEach((report) => {
        const { lat, lng, address } = report.lastLocation;
        if (!lat || !lng) return;

        const isMissing = report.type === 'missing';
        const markerIcon = isMissing ? missingIcon : foundIcon;
        const markerColorText = isMissing ? 'text-brand-blue' : 'text-emerald-700';
        const statusText = isMissing ? 'DESAPARECIDO (BUSCADO)' : 'ENCONTRADO (REFUGIO)';

        const popupContent = `
          <div style="font-family: 'Inter', sans-serif; max-width: 220px; padding: 4px;">
            <div style="font-size: 9px; font-weight: bold; margin-bottom: 4px; color: ${isMissing ? '#00247D' : '#047857'}">
              ${statusText}
            </div>
            ${report.photoUrl ? `
              <div style="height: 90px; width: 100%; border-radius: 6px; overflow: hidden; margin-bottom: 6px;">
                <img src="${report.photoUrl}" style="height: 100%; width: 100%; object-cover: cover;" />
              </div>
            ` : ''}
            <h5 style="margin: 0 0 2px 0; font-weight: 700; font-size: 13px; color: #1e293b;">${report.fullName}</h5>
            <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b;">Edad: ${report.age} | Género: ${report.gender}</p>
            <p style="margin: 0 0 6px 0; font-size: 10px; color: #475569; line-height: 1.3;">
              <strong>Ubicación:</strong> ${address}
            </p>
            <div style="font-size: 10px; font-weight: 600; border-top: 1px solid #f1f5f9; padding-top: 4px; color: #334155;">
              Contacto: ${report.reporterName}<br/>
              <span style="color: #2563eb;">${report.reporterContact}</span>
            </div>
          </div>
        `;

        L.marker([lat, lng], { icon: markerIcon })
          .addTo(markersGroupRef.current)
          .bindPopup(popupContent);
      });

      // Fit map bounds to contain all markers if there are any
      if (reports.length > 0 && markersGroupRef.current) {
        const markerLatLngs = reports.map(r => [r.lastLocation.lat, r.lastLocation.lng]).filter(coords => coords[0] && coords[1]);
        if (markerLatLngs.length > 0) {
          mapRef.current.fitBounds(markerLatLngs, { padding: [40, 40], maxZoom: 14 });
        }
      }

    } catch (err) {
      console.error("Directory map load error:", err);
      setError("No se pudo iniciar el mapa de geolocalización.");
    }

    return () => {
      // Map cleanup
      if (mapRef.current) {
        try {
          mapRef.current.remove();
          mapRef.current = null;
          markersGroupRef.current = null;
        } catch (e) {}
      }
    };
  }, [reports]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold font-display text-slate-900 flex items-center gap-1.5">
            <MapPin className="h-5 w-5 text-brand-red" />
            Mapa de Georreferenciación Humanitaria
          </h2>
          <p className="text-xs text-slate-500">
            Vista territorial de personas desaparecidas (azul) y encontradas/refugiadas (verde) en las zonas de catástrofe de Venezuela.
          </p>
        </div>

        <div className="flex gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-brand-blue">
            <span className="h-3 w-3 rounded-full bg-blue-500 border border-blue-600 block" />
            Desaparecidos / Buscados
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700">
            <span className="h-3 w-3 rounded-full bg-emerald-500 border border-emerald-600 block" />
            Encontrados / En Refugio
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-800 text-xs rounded-xl">
          {error}
        </div>
      )}

      <div className="relative border border-slate-200 rounded-xl overflow-hidden h-[420px] bg-slate-50">
        {!(window as any).L && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-slate-500">
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-400 border-t-transparent mb-2" />
            <p className="text-sm">Iniciando geolocalizador nacional...</p>
          </div>
        )}
        <div ref={mapContainerRef} className="h-full w-full" />
      </div>

      <div className="flex items-start gap-2 bg-blue-50/50 p-3 rounded-xl border border-blue-100/40 text-xs text-slate-600">
        <Info className="h-4 w-4 text-brand-blue flex-shrink-0 mt-0.5" />
        <p>
          Haz clic en cualquier marcador del mapa para visualizar de forma inmediata la ficha humanitaria de la víctima, su foto (si posee), descripción, estado físico y los datos de contacto directo de la familia o el refugio.
        </p>
      </div>
    </div>
  );
}
