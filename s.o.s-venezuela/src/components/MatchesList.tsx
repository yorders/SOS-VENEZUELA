import React, { useState } from 'react';
import { User, MapPin, Phone, ShieldAlert, BadgeCheck, MessageSquare, Check, Mail } from 'lucide-react';
import { MatchResult } from '../types';

interface MatchesListProps {
  matches: MatchResult[];
  onResolveReport?: (id: string) => void;
}

export default function MatchesList({ matches, onResolveReport }: MatchesListProps) {
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);

  const handleResolve = (id: string) => {
    if (onResolveReport) {
      onResolveReport(id);
    }
    setResolvedIds([...resolvedIds, id]);
  };

  if (matches.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500 max-w-lg mx-auto space-y-2">
        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h3 className="font-semibold text-slate-800 text-sm">Sin coincidencias detectadas aún</h3>
        <p className="text-xs">
          S.O.S VENEZUELA continuará analizando los reportes nuevos de forma automatizada las 24 horas del día.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <BadgeCheck className="h-5 w-5 text-emerald-600 animate-pulse" />
          Coincidencias Automáticas Detectadas ({matches.length})
        </h3>
        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-100 animate-pulse">
          Sistema de Rastreo AI Activo
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {matches.map((match) => {
          const report = match.report;
          const isResolved = resolvedIds.includes(report.id) || report.status === "resolved";

          // Calculate match-badge styling
          const score = match.confidenceScore;
          let scoreBadgeColor = "bg-amber-50 text-amber-800 border-amber-200";
          let scoreBarColor = "bg-amber-500";
          if (score >= 80) {
            scoreBadgeColor = "bg-emerald-50 text-emerald-800 border-emerald-200";
            scoreBarColor = "bg-emerald-500";
          } else if (score < 60) {
            scoreBadgeColor = "bg-blue-50 text-blue-800 border-blue-200";
            scoreBarColor = "bg-blue-500";
          }

          return (
            <div
              key={match.reportId}
              className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-200 relative overflow-hidden flex flex-col justify-between ${
                isResolved ? 'opacity-65 border-slate-200 bg-slate-50' : 'border-slate-200'
              }`}
            >
              {/* Flag accent on the card corner */}
              <div className="absolute top-0 left-0 right-0 h-1.5 venezuela-gradient" />

              <div>
                {/* Header row with Match Score badge */}
                <div className="flex items-start justify-between gap-2 mt-2">
                  <div>
                    <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                      {report.type === 'missing' ? 'Familiar lo Busca' : 'Reportado en Refugio / Clínico'}
                    </span>
                    <h4 className="font-semibold text-slate-900 font-display text-sm mt-0.5">
                      {report.fullName}
                    </h4>
                  </div>
                  
                  <div className={`px-2.5 py-1 text-xs font-bold rounded-lg border flex flex-col items-center ${scoreBadgeColor}`}>
                    <span className="text-[10px] uppercase font-medium tracking-wide">Match</span>
                    <span className="text-sm font-black font-display">{score}%</span>
                  </div>
                </div>

                {/* Match confidence bar */}
                <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-3 mb-4">
                  <div className={`h-full ${scoreBarColor}`} style={{ width: `${score}%` }} />
                </div>

                {/* Side-by-side or singular image showcase */}
                {report.photoUrl && (
                  <div className="h-32 w-full rounded-xl overflow-hidden bg-slate-50 mb-4 border border-slate-100 relative">
                    <img
                      src={report.photoUrl}
                      alt={report.fullName}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-2 left-2 bg-slate-900/70 backdrop-blur text-white text-[9px] font-mono px-2 py-0.5 rounded">
                      FOTO DE REPORTE COINCIDENTE
                    </div>
                  </div>
                )}

                {/* Match Features Badges list */}
                {match.matchedFeatures && match.matchedFeatures.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {match.matchedFeatures.map((feat, idx) => (
                      <span key={idx} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        {feat}
                      </span>
                    ))}
                  </div>
                )}

                {/* Explanation text */}
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100/50 mb-4">
                  {match.explanation}
                </p>

                {/* Physical details & Location data */}
                <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  {report.facialFeatures?.isPet ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">🐾</span>
                      <span><strong>Mascota:</strong> {report.facialFeatures?.petType} ({report.facialFeatures?.petBreedColor}) | {report.gender}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span><strong>Edad/Género:</strong> {report.age} | {report.gender}</span>
                    </div>
                  )}

                  {/* Add Eye Color, face shape, and expression if available */}
                  {(report.facialFeatures?.eyeColor || report.facialFeatures?.faceShape || report.facialFeatures?.expression) && (
                    <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] bg-slate-50 border border-slate-100 text-slate-500 px-2.5 py-1 rounded-lg">
                      {report.facialFeatures?.eyeColor && (
                        <span>👁️ <strong>Ojos:</strong> {report.facialFeatures?.eyeColor}</span>
                      )}
                      {report.facialFeatures?.faceShape && (
                        <span>👤 <strong>{report.facialFeatures?.isPet ? 'Hocico' : 'Rostro'}:</strong> {report.facialFeatures?.faceShape}</span>
                      )}
                      {report.facialFeatures?.expression && (
                        <span>🎭 <strong>Expresión:</strong> {report.facialFeatures?.expression}</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2"><strong>Ubicación:</strong> {report.lastLocation.address}</span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
                <a
                  href={`tel:${report.reporterContact}`}
                  className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-950 text-white text-center rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Phone className="h-3 w-3" />
                  Contactar ({report.reporterName})
                </a>
                
                {isResolved ? (
                  <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Reencontrado
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleResolve(report.id)}
                    className="py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition"
                  >
                    ¿Es él/ella? Marcar Encontrado
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
