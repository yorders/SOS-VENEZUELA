import React, { useState } from 'react';
import { Camera, Search, UserCheck, AlertCircle, Sparkles, ChevronRight } from 'lucide-react';
import CameraCapture from './CameraCapture';
import { MatchResult, FacialFeatures } from '../types';

interface FaceScannerProps {
  onSearchComplete: (matches: MatchResult[], features: FacialFeatures, photoUrl: string) => void;
}

export default function FaceScanner({ onSearchComplete }: FaceScannerProps) {
  const [photo, setPhoto] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoSelected = (base64Photo: string) => {
    setPhoto(base64Photo);
    setError(null);
  };

  const startScan = async () => {
    if (!photo) {
      setError("Por favor, capture o suba una foto primero.");
      return;
    }

    setScanning(true);
    setError(null);

    try {
      const response = await fetch('/api/search-face', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ photoUrl: photo })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          onSearchComplete(data.matches, data.facialFeatures, photo);
        } else {
          setError(data.error || "Ocurrió un error al procesar la imagen facial.");
        }
      } else {
        setError("Error en el servidor de reconocimiento facial.");
      }
    } catch (err) {
      setError("No se pudo conectar con el servidor de S.O.S VENEZUELA.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-brand-blue/10 rounded-lg text-brand-blue">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold font-display text-slate-900">Búsqueda Rápida por Rostro</h2>
          <p className="text-xs text-slate-500">Sube una foto y S.O.S VENEZUELA escaneará y comparará los rasgos con la base de datos de víctimas.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5 items-center">
        {/* Photo capture frame */}
        <div className="relative">
          <CameraCapture onPhotoSelected={handlePhotoSelected} />

          {/* Sci-Fi Scanning Animation HUD Overlay */}
          {scanning && (
            <div className="absolute inset-0 top-12 bg-black/40 backdrop-blur-[1px] rounded-xl overflow-hidden flex flex-col items-center justify-center pointer-events-none">
              {/* Scan green line bar animation */}
              <div className="absolute left-0 right-0 h-1.5 bg-cyan-400/80 shadow-[0_0_15px_#22d3ee] animate-[bounce_2s_infinite]" />
              
              {/* Vector facial landmarks outline mock */}
              <div className="relative h-32 w-32 border border-cyan-400/30 rounded-full flex items-center justify-center">
                <div className="absolute inset-0 border border-dashed border-cyan-400/50 rounded-full animate-[spin_10s_linear_infinite]" />
                <div className="absolute h-2 w-2 bg-cyan-400 rounded-full top-6 left-10 animate-ping" />
                <div className="absolute h-2 w-2 bg-cyan-400 rounded-full top-6 right-10 animate-ping" />
                <div className="absolute h-2 w-2 bg-cyan-400 rounded-full top-16 left-16 animate-ping" />
                <div className="absolute h-2 w-2 bg-cyan-400 rounded-full bottom-6 left-12 animate-ping" />
                
                {/* Tech brackets */}
                <div className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-cyan-400" />
                <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-cyan-400" />
                <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-cyan-400" />
                <div className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-cyan-400" />
                
                <UserCheck className="h-10 w-10 text-cyan-400 animate-pulse" />
              </div>
              
              <span className="text-[11px] text-cyan-400 font-mono tracking-wider font-semibold mt-4 text-center px-4 drop-shadow">
                EXTRAYENDO CARACTERÍSTICAS FACIALES GEMINI...
              </span>
            </div>
          )}
        </div>

        {/* Action Description */}
        <div className="space-y-3.5">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs text-slate-600 space-y-2">
            <h4 className="font-semibold text-slate-800">¿Cómo funciona el reconocimiento facial?</h4>
            <p>1. <strong>Toma</strong> o <strong>Sube</strong> una fotografía clara del rostro de la víctima.</p>
            <p>2. El sistema analiza las proporciones faciales generales, marcas distintivas, vello, cabello y características biológicas mediante el modelo de visión artificial.</p>
            <p>3. Se efectúa un cruce instantáneo de bases de datos para ubicar coincidencias con reportes activos.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-2.5 bg-red-50 text-red-800 text-xs rounded-lg border border-red-100">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={startScan}
            disabled={scanning || !photo}
            className="w-full py-2.5 bg-brand-blue text-white rounded-xl text-sm font-semibold hover:bg-brand-blue/90 transition duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {scanning ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Escaneando rostro...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Iniciar Escaneo de Rostro
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
