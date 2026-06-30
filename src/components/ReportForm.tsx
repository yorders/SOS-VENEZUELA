import React, { useState } from 'react';
import { UserPlus, Heart, Phone, Calendar, Sparkles, Check, Info, FileText } from 'lucide-react';
import MapSelector from './MapSelector';
import CameraCapture from './CameraCapture';
import { Report, LocationInfo, MatchResult } from '../types';

interface ReportFormProps {
  onSuccess: (newReport: Report, matches: MatchResult[]) => void;
}

export default function ReportForm({ onSuccess }: ReportFormProps) {
  const [type, setType] = useState<'missing' | 'found'>('missing');
  const [isPet, setIsPet] = useState(false);
  const [petType, setPetType] = useState("Perro");
  const [petBreedColor, setPetBreedColor] = useState("");
  const [eyeColor, setEyeColor] = useState("");
  const [faceShape, setFaceShape] = useState("");
  const [expression, setExpression] = useState("");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Masculino");
  const [lastLocation, setLastLocation] = useState<LocationInfo>({
    address: "Las Tejerías, Estado Aragua, Venezuela",
    lat: 10.2522,
    lng: -67.1534
  });
  const [lastSeenDate, setLastSeenDate] = useState(new Date().toISOString().split('T')[0]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterContact, setReporterContact] = useState("");
  const [distinctiveFeatures, setDistinctiveFeatures] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!lastLocation.address) {
      setError("Por favor selecciona o introduce una ubicación.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          fullName,
          age,
          gender,
          lastLocation,
          lastSeenDate,
          photoUrl,
          reporterName,
          reporterContact,
          distinctiveFeatures,
          isPet,
          petType: isPet ? petType : "Ninguno",
          petBreedColor: isPet ? petBreedColor : "",
          eyeColor,
          faceShape,
          expression
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Reset fields
          setFullName("");
          setAge("");
          setPhotoUrl("");
          setReporterName("");
          setReporterContact("");
          setDistinctiveFeatures("");
          setIsPet(false);
          setPetBreedColor("");
          setEyeColor("");
          setFaceShape("");
          setExpression("");
          onSuccess(data.report, data.matches);
        } else {
          setError(data.error || "Ocurrió un error al registrar el reporte.");
        }
      } else {
        setError("Error de red al intentar enviar el reporte.");
      }
    } catch (err) {
      setError("No se pudo conectar con el servidor de S.O.S VENEZUELA.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
      
      {/* Tab Switcher for Report Type */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
        <button
          type="button"
          onClick={() => setType('missing')}
          className={`flex-1 py-2.5 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            type === 'missing'
              ? 'bg-white text-brand-blue shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserPlus className="inline-block h-3.5 w-3.5 mr-1" />
          Persona Desaparecida (Búsqueda)
        </button>
        <button
          type="button"
          onClick={() => setType('found')}
          className={`flex-1 py-2.5 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            type === 'found'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Heart className="inline-block h-3.5 w-3.5 mr-1" />
          Persona Encontrada / En Refugio
        </button>
      </div>

      <div className="border-b border-slate-100 pb-2">
        <h2 className="text-base font-semibold font-display text-slate-900">
          {type === 'missing' 
            ? (isPet ? 'Registrar Mascota Desaparecida' : 'Registrar Persona Buscada') 
            : (isPet ? 'Registrar Mascota Encontrada' : 'Registrar Persona Encontrada')
          }
        </h2>
        <p className="text-xs text-slate-500">
          {type === 'missing' 
            ? (isPet 
                ? 'Ingresa los datos y foto de la mascota perdida para cruzarla con los registros de refugios.' 
                : 'Ingresa los datos del familiar o amigo desaparecido para activar el rastreo automático.')
            : (isPet 
                ? 'Registra una mascota encontrada, rescatada o en resguardo para que sus dueños la localicen.' 
                : 'Registra a una persona encontrada, reubicada o desorientada para ayudar a su familia a encontrarla.')
          }
        </p>
      </div>

      {/* Category Selection: Persona vs Mascota */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
          ¿A quién estás reportando?
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setIsPet(false);
              setGender("Masculino");
            }}
            className={`flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              !isPet
                ? 'bg-brand-blue/10 border-brand-blue text-brand-blue shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            🧑 Persona / Humano
          </button>
          <button
            type="button"
            onClick={() => {
              setIsPet(true);
              setGender("Macho");
            }}
            className={`flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              isPet
                ? 'bg-amber-500/10 border-amber-500 text-amber-700 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            🐾 Mascota (Perro, Gato, etc.)
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column: Personal info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {isPet ? 'Nombre / Apodo de la Mascota' : 'Nombre Completo'} {type === 'missing' && <span className="text-brand-red font-semibold">*</span>}
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={isPet 
                ? (type === 'missing' ? "Ej: Toby / Firulais" : "Ej: Mascota rescatada / Sin collar") 
                : (type === 'missing' ? "Ej: Carlos Mendoza" : "Ej: No Identificado / Desorientado")
              }
              required={type === 'missing' && !isPet}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {isPet ? 'Edad de la Mascota' : 'Edad'}
              </label>
              <input
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder={isPet ? "Ej: 2 años, cachorro" : "Ej: 42 o aprox. 40"}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {isPet ? 'Sexo' : 'Género'} <span className="text-brand-red font-semibold">*</span>
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              >
                {isPet ? (
                  <>
                    <option value="Macho">Macho</option>
                    <option value="Hembra">Hembra</option>
                    <option value="Desconocido">Desconocido</option>
                  </>
                ) : (
                  <>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Desconocido">Desconocido</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Detailed physical traits card */}
          <div className="bg-slate-50/75 p-4 rounded-xl border border-slate-200/60 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-brand-yellow" />
              Análisis Físico y Facial Detallado
            </h4>

            {isPet && (
              <div className="grid grid-cols-2 gap-3 pb-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Especie Mascota *</label>
                  <select
                    value={petType}
                    onChange={(e) => setPetType(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  >
                    <option value="Perro">🐶 Perro</option>
                    <option value="Gato">🐱 Gato</option>
                    <option value="Ave">🦜 Ave</option>
                    <option value="Otro">🐾 Otro / Exótico</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Raza y Color de Pelaje *</label>
                  <input
                    type="text"
                    value={petBreedColor}
                    onChange={(e) => setPetBreedColor(e.target.value)}
                    placeholder="Ej: Criollo negro con manchas"
                    required={isPet}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Color Ojos</label>
                <select
                  value={eyeColor}
                  onChange={(e) => setEyeColor(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-[11px] focus:outline-none focus:ring-2 focus:ring-brand-blue"
                >
                  <option value="">Desconocido</option>
                  <option value="Marrón">Marrón</option>
                  <option value="Azul">Azul</option>
                  <option value="Verde">Verde</option>
                  <option value="Ámbar / Amarillo">Ámbar / Amarillo</option>
                  <option value="Negro">Negro</option>
                  <option value="Heterocromía">Heterocromía</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {isPet ? 'Tipo Hocico' : 'Forma de Cara'}
                </label>
                <select
                  value={faceShape}
                  onChange={(e) => setFaceShape(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-[11px] focus:outline-none focus:ring-2 focus:ring-brand-blue"
                >
                  <option value="">Desconocido</option>
                  {isPet ? (
                    <>
                      <option value="Hocico alargado">Hocico alargado</option>
                      <option value="Hocico chato / plano">Hocico chato</option>
                      <option value="Orejas caídas">Orejas caídas</option>
                      <option value="Orejas erguidas / punta">Orejas erguidas</option>
                      <option value="Rostro redondo">Cara redonda</option>
                    </>
                  ) : (
                    <>
                      <option value="Rostro ovalado">Ovalada</option>
                      <option value="Rostro redondo">Redonda</option>
                      <option value="Rostro alargado">Alargada</option>
                      <option value="Rostro cuadrado">Cuadrada</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Expresión</label>
                <select
                  value={expression}
                  onChange={(e) => setExpression(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-[11px] focus:outline-none focus:ring-2 focus:ring-brand-blue"
                >
                  <option value="">Desconocida</option>
                  <option value="Tranquilo">Tranquilo(a)</option>
                  <option value="Asustado">Asustado(a)</option>
                  <option value="Alegre / Alerta">Alegre / Alerta</option>
                  <option value="Triste / Decaído">Triste</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Fecha de {type === 'missing' ? 'Desaparición' : 'Avistamiento'} <span className="text-brand-red font-semibold">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={lastSeenDate}
                onChange={(e) => setLastSeenDate(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              />
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Rasgos Distintivos o Señas Particulares
            </label>
            <textarea
              value={distinctiveFeatures}
              onChange={(e) => setDistinctiveFeatures(e.target.value)}
              placeholder={isPet 
                ? "Ej: Tiene collar rojo con placa, manchas atigradas en la espalda, cicatriz en la oreja derecha..."
                : "Cicatrices, lunares, tatuajes, tipo de cabello, vestimenta que llevaba, lentes, barba, etc..."
              }
              rows={3}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Right Column: Camera / Photo Capture */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Foto de la Víctima
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              Indispensable para el reconocimiento facial automatizado por IA.
            </p>
            <CameraCapture onPhotoSelected={setPhotoUrl} initialPhotoUrl={photoUrl} />
          </div>
        </div>
      </div>

      {/* Geolocator Field */}
      <div className="border-t border-slate-100 pt-4">
        <MapSelector
          value={lastLocation}
          onChange={setLastLocation}
          label={type === 'missing' ? 'Última Ubicación Conocida (Geolocalización)' : 'Ubicación de Avistamiento o Refugio'}
        />
      </div>

      {/* Reporter Contact Information */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider">
          <Phone className="h-4 w-4 text-brand-blue" />
          Datos del Reportero / Familiar de Contacto
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Tu Nombre Completo <span className="text-brand-red font-semibold">*</span>
            </label>
            <input
              type="text"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder="Ej: Beatriz Mendoza"
              required
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Tu Teléfono o Correo de Contacto <span className="text-brand-red font-semibold">*</span>
            </label>
            <input
              type="text"
              value={reporterContact}
              onChange={(e) => setReporterContact(e.target.value)}
              placeholder="Ej: +58 412-1234567 o email@gmail.com"
              required
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-800 text-xs rounded-xl flex items-center gap-2">
          <Info className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-brand-blue hover:bg-brand-blue/95 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
      >
        {submitting ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Analizando datos y rostros con Gemini...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 text-brand-yellow animate-pulse" />
            Publicar Reporte y Activar Coincidencia Automática
          </>
        )}
      </button>

    </form>
  );
}
