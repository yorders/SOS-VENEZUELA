import { createClient } from '@supabase/supabase-js';

// Inicializar el cliente usando las variables que pusimos en Vercel
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Función auxiliar para convertir tu foto Base64 en archivo real y subirlo a Storage
async function uploadBase64ToStorage(base64Data: string, fileName: string): Promise<string | null> {
  try {
    if (!base64Data) return null;
    const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Image, 'base64');

    const { data, error } = await supabase.storage
      .from('photos')
      .upload(`reports/${fileName}`, buffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('photos')
      .getPublicUrl(`reports/${fileName}`);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("Error al subir imagen a Supabase Storage:", err);
    return null;
  }
}

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase limits to support base64 photo uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy init Gemini client
let ai: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      try {
        ai = new GoogleGenAI({ apiKey: key });
        console.log("Gemini API initialized successfully.");
      } catch (e) {
        console.error("Error initializing Gemini client:", e);
      }
    } else {
      console.warn("GEMINI_API_KEY not configured or has default value. Falling back to heuristic matching.");
    }
  }
  return ai;
}

// In-Memory Database for MVP
interface LocationInfo {
  address: string;
  lat: number;
  lng: number;
}

interface FacialFeatures {
  gender?: string;
  approximateAge?: string;
  hairColorStyle?: string;
  facialHair?: string;
  distinctiveMarks?: string;
  skinTone?: string;
  clothing?: string;
  metadataSummary?: string;
  isPet?: boolean;
  petType?: string;
  petBreedColor?: string;
  eyeColor?: string;
  faceShape?: string;
  expression?: string;
}

interface Report {
  id: string;
  type: 'missing' | 'found';
  fullName: string;
  age: number | string;
  gender: string;
  lastLocation: LocationInfo;
  lastSeenDate: string;
  photoUrl: string; // base64 or public url
  reporterName: string;
  reporterContact: string;
  distinctiveFeatures: string;
  status: 'active' | 'resolved';
  facialFeatures?: FacialFeatures;
  createdAt: string;
}

interface MatchResult {
  reportId: string;
  report: Report;
  confidenceScore: number;
  matchedFeatures: string[];
  explanation: string;
}

interface MatchNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  reportIdA: string;
  reportIdB: string;
  read: boolean;
}

// In-memory reports store
let reports: Report[] = [];
let notifications: MatchNotification[] = [];

// Helper to parse base64 image
function parseBase64Image(dataUrl: string) {
  if (!dataUrl) return null;
  const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return null;
  }
  return {
    mimeType: matches[1],
    data: matches[2]
  };
}

// Seed Data representing realistic Venezuelan disaster victim search context
const SEED_REPORTS: Report[] = [
  {
    id: "seed-1",
    type: "missing",
    fullName: "Carlos Eduardo Mendoza",
    age: 42,
    gender: "Masculino",
    lastLocation: {
      address: "Sector El Béisbol, Las Tejerías, Estado Aragua",
      lat: 10.2522,
      lng: -67.1534
    },
    lastSeenDate: "2026-06-25",
    photoUrl: "/assets/seed_carlos.jpg", // Will be mocked or styled on client
    reporterName: "Beatriz Mendoza",
    reporterContact: "+58 412-555-0123",
    distinctiveFeatures: "Cicatriz pequeña en la ceja izquierda, barba espesa de unos días, usa gorra deportiva azul con logo de Venezuela.",
    status: "active",
    facialFeatures: {
      gender: "Masculino",
      approximateAge: "40-45 años",
      hairColorStyle: "Cabello negro, corto",
      facialHair: "Barba espesa, de varios días",
      distinctiveMarks: "Cicatriz en ceja izquierda",
      skinTone: "Trigueño",
      clothing: "Camisa de vestir gris, gorra azul",
      metadataSummary: "Hombre de mediana edad, tez trigueña con barba notable de varios días y cicatriz distintiva cerca de la ceja izquierda."
    },
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "seed-2",
    type: "found",
    fullName: "Hombre Desconocido (Refugio)",
    age: "Aproximadamente 40-45 años",
    gender: "Masculino",
    lastLocation: {
      address: "Escuela Básica Jacobo Roth, Las Tejerías, Aragua",
      lat: 10.2498,
      lng: -67.1551
    },
    lastSeenDate: "2026-06-26",
    photoUrl: "/assets/seed_found_carlos.jpg",
    reporterName: "Dra. Elena Silva (Médico Cruz Roja)",
    reporterContact: "+58 424-999-4455",
    distinctiveFeatures: "Llegó desorientado. Tiene cicatriz visible sobre el ojo izquierdo (ceja), barba poblada negra con algunas canas. Tenía una gorra azul en el bolsillo.",
    status: "active",
    facialFeatures: {
      gender: "Masculino",
      approximateAge: "40-45 años",
      hairColorStyle: "Cabello negro con canas",
      facialHair: "Barba densa",
      distinctiveMarks: "Cicatriz en ceja izquierda, confusión severa",
      skinTone: "Trigueño",
      clothing: "Suéter deportivo oscuro humedecido",
      metadataSummary: "Hombre trigueño, edad madura, barba densa con canas, cicatriz horizontal en la ceja izquierda."
    },
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "seed-3",
    type: "missing",
    fullName: "María Alejandra Silva",
    age: 28,
    gender: "Femenino",
    lastLocation: {
      address: "Residencias El Faro, Macuto, Estado La Guaira",
      lat: 10.6133,
      lng: -66.8833
    },
    lastSeenDate: "2026-06-25",
    photoUrl: "/assets/seed_maria.jpg",
    reporterName: "Sofía Silva (Hermana)",
    reporterContact: "sofia.silva@email.com",
    distinctiveFeatures: "Cabello negro muy rizado (afro corto), lunar oscuro muy visible en la mejilla derecha, mide 1.65m.",
    status: "active",
    facialFeatures: {
      gender: "Femenino",
      approximateAge: "25-30 años",
      hairColorStyle: "Cabello negro, rizado abundante",
      facialHair: "Ninguno",
      distinctiveMarks: "Lunar en mejilla derecha",
      skinTone: "Morena",
      clothing: "Franela amarilla",
      metadataSummary: "Mujer joven, tez morena, cabello afro negro corto y rizado, con un lunar prominente en la mejilla derecha."
    },
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Load seeds initially
reports = [...SEED_REPORTS];

// Auto-trigger alerts for existing seeds
notifications = [
  {
    id: "notif-seed",
    title: "Posible coincidencia de rostro detectada",
    message: "El reporte de 'Hombre Desconocido' en Las Tejerías coincide en un 95% con Carlos Eduardo Mendoza.",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    reportIdA: "seed-1",
    reportIdB: "seed-2",
    read: false
  }
];

// Heuristic matching function (Fallback when Gemini is unavailable)
function runHeuristicMatch(reportA: Report, reportB: Report): { confidenceScore: number, matchedFeatures: string[], explanation: string } {
  // 0. Pet detection guard
  const isPetA = reportA.facialFeatures?.isPet || 
                 (reportA.distinctiveFeatures || "").toLowerCase().match(/\b(perro|perra|gato|gata|mascota|pájaro|canino|felino|cachorro|canina|felina)\b/) !== null;
  const isPetB = reportB.facialFeatures?.isPet || 
                 (reportB.distinctiveFeatures || "").toLowerCase().match(/\b(perro|perra|gato|gata|mascota|pájaro|canino|felino|cachorro|canina|felina)\b/) !== null;

  if (isPetA !== isPetB) {
    return { 
      confidenceScore: 0, 
      matchedFeatures: [], 
      explanation: "No coincide la especie: uno de los reportes es de un humano y el otro es de una mascota." 
    };
  }

  let score = 0;
  const matches: string[] = [];
  const explanations: string[] = [];

  // Helper for Location Distance Calculation
  const calculateDistance = () => {
    const lat1 = reportA.lastLocation.lat;
    const lon1 = reportA.lastLocation.lng;
    const lat2 = reportB.lastLocation.lat;
    const lon2 = reportB.lastLocation.lng;
    if (lat1 && lon1 && lat2 && lon2) {
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return 6371 * c; // Km
    }
    return null;
  };

  const distanceKm = calculateDistance();

  // If both are pets
  if (isPetA && isPetB) {
    score += 30; // base score for matching category (Pets)
    matches.push("Ambos reportes son de Mascotas");

    const typeA = (reportA.facialFeatures?.petType || "").toLowerCase();
    const typeB = (reportB.facialFeatures?.petType || "").toLowerCase();
    
    if (typeA && typeB) {
      if (typeA === typeB || typeA.includes(typeB) || typeB.includes(typeA)) {
        score += 25;
        matches.push(`Misma especie: ${reportA.facialFeatures?.petType}`);
      } else {
        return { 
          confidenceScore: 5, 
          matchedFeatures: [], 
          explanation: `Mascotas de especies distintas: una es ${reportA.facialFeatures?.petType} y la otra es ${reportB.facialFeatures?.petType}.` 
        };
      }
    }

    // Breed & Color match
    const breedA = (reportA.facialFeatures?.petBreedColor || "").toLowerCase();
    const breedB = (reportB.facialFeatures?.petBreedColor || "").toLowerCase();
    if (breedA && breedB) {
      const wordsA = breedA.split(/\s+/);
      let matchesBreed = 0;
      wordsA.forEach(w => {
        if (w.length > 2 && breedB.includes(w)) matchesBreed++;
      });
      if (matchesBreed > 0) {
        score += Math.min(matchesBreed * 15, 30);
        matches.push("Raza/Colores de pelaje similares");
      }
    }

    // Eye color
    const eyeA = (reportA.facialFeatures?.eyeColor || "").toLowerCase();
    const eyeB = (reportB.facialFeatures?.eyeColor || "").toLowerCase();
    if (eyeA && eyeB && (eyeA === eyeB || eyeA.includes(eyeB) || eyeB.includes(eyeA))) {
      score += 15;
      matches.push(`Mismo color de ojos: ${reportA.facialFeatures?.eyeColor}`);
    }

    // Full-body & distinctive features keyword alignment for pets
    const descA = ((reportA.distinctiveFeatures || "") + " " + 
                   (reportA.facialFeatures?.metadataSummary || "") + " " + 
                   (reportA.facialFeatures?.distinctiveMarks || "") + " " + 
                   (reportA.facialFeatures?.clothing || "")).toLowerCase();
    const descB = ((reportB.distinctiveFeatures || "") + " " + 
                   (reportB.facialFeatures?.metadataSummary || "") + " " + 
                   (reportB.facialFeatures?.distinctiveMarks || "") + " " + 
                   (reportB.facialFeatures?.clothing || "")).toLowerCase();

    const petKeywords = [
      "collar", "arnes", "atigrad", "manch", "blanc", "negr", "marr", "gris", 
      "canel", "dorad", "oreja", "cola", "calcet", "pech", "rayas", "parche"
    ];
    let petKeywordMatches = 0;
    petKeywords.forEach(word => {
      if (descA.includes(word) && descB.includes(word)) {
        petKeywordMatches++;
        matches.push(`Rasgo corporal/seña coincidente: ${word}`);
      }
    });
    score += Math.min(petKeywordMatches * 10, 25);

    // Distance proximity
    if (distanceKm !== null) {
      if (distanceKm <= 5) {
        score += 20;
        matches.push("Área geográfica muy cercana (< 5 km)");
      } else if (distanceKm <= 25) {
        score += 10;
        matches.push("Mismo municipio/región (< 25 km)");
      }
    }

    const finalScore = Math.min(Math.max(score, 10), 98);
    explanations.push(`Coincidencia de mascota estimada en ${finalScore}%.`);
    if (matches.includes("Raza/Colores de pelaje similares")) explanations.push("Coinciden descripciones de raza o color de pelaje.");
    if (distanceKm !== null && distanceKm <= 10) explanations.push("Los reportes provienen de la misma zona de avistamiento.");

    return {
      confidenceScore: finalScore,
      matchedFeatures: matches.slice(0, 5),
      explanation: explanations.join(" ")
    };
  }

  // Else, if both are humans
  // 1. Gender Match
  if (reportA.gender.toLowerCase() === reportB.gender.toLowerCase()) {
    score += 25;
    matches.push("Mismo género");
  } else if (reportA.gender !== "Desconocido" && reportB.gender !== "Desconocido") {
    return { confidenceScore: 5, matchedFeatures: [], explanation: "Géneros diferentes declarados." };
  }

  // 2. Age Match
  const ageA = parseInt(String(reportA.age));
  const ageB = parseInt(String(reportB.age));
  if (!isNaN(ageA) && !isNaN(ageB)) {
    const diff = Math.abs(ageA - ageB);
    if (diff <= 5) {
      score += 20;
      matches.push("Rango de edad similar");
    } else if (diff <= 12) {
      score += 10;
      matches.push("Edad relativamente cercana");
    }
  } else {
    const ageStrA = String(reportA.age).toLowerCase();
    const ageStrB = String(reportB.age).toLowerCase();
    if (
      (ageStrA.includes("niño") && ageStrB.includes("niño")) ||
      (ageStrA.includes("adulto") && ageStrB.includes("adulto")) ||
      (ageStrA.includes("ancian") && ageStrB.includes("ancian")) ||
      (ageStrA.includes("joven") && ageStrB.includes("joven"))
    ) {
      score += 15;
      matches.push("Grupo de edad coincidente");
    }
  }

  // 3. Location Distance
  if (distanceKm !== null) {
    if (distanceKm <= 5) {
      score += 25;
      matches.push("Área geográfica muy cercana (< 5 km)");
    } else if (distanceKm <= 25) {
      score += 15;
      matches.push("Misma región/municipio (< 25 km)");
    } else if (distanceKm <= 100) {
      score += 5;
      matches.push("Cercanía relativa");
    }
  }

  // 4. Distinctive Features & Eye/Face Shape/Color Keywords Matching
  const textA = ((reportA.distinctiveFeatures || "") + " " + 
                 (reportA.facialFeatures?.metadataSummary || "") + " " +
                 (reportA.facialFeatures?.eyeColor || "") + " " +
                 (reportA.facialFeatures?.faceShape || "")).toLowerCase();
  const textB = ((reportB.distinctiveFeatures || "") + " " + 
                 (reportB.facialFeatures?.metadataSummary || "") + " " +
                 (reportB.facialFeatures?.eyeColor || "") + " " +
                 (reportB.facialFeatures?.faceShape || "")).toLowerCase();

  const keyWords = ["cicatriz", "barba", "lunar", "tatuaje", "afro", "rizado", "canas", "gorra", "anteojos", "lentes", "piercing", "mancha", "ojos verdes", "ojos azules", "rostro ovalado", "rostro redondo", "marrón"];
  let keywordMatchCount = 0;
  keyWords.forEach(word => {
    if (textA.includes(word) && textB.includes(word)) {
      keywordMatchCount++;
      matches.push(`Rasgo coincidente: ${word}`);
    }
  });
  score += Math.min(keywordMatchCount * 12, 30);

  // Bound the score
  const finalScore = Math.min(Math.max(score, 10), 98);

  explanations.push(`Coincidencia calculada con un score de ${finalScore}%.`);
  if (matches.includes("Mismo género")) explanations.push("Ambos son del mismo género.");
  if (keywordMatchCount > 0) explanations.push(`Coinciden rasgos físicos clave descritos como: ${matches.filter(m => m.startsWith("Rasgo")).map(m => m.split(": ")[1]).join(", ")}.`);
  if (matches.includes("Área geográfica muy cercana (< 5 km)")) explanations.push("Fueron vistos por última vez o encontrados en un radio de 5 kilómetros.");

  return {
    confidenceScore: finalScore,
    matchedFeatures: matches.slice(0, 5),
    explanation: explanations.join(" ")
  };
}

// AI Multi-Modal Matcher using Gemini
async function runGeminiMatch(reportA: Report, reportB: Report): Promise<{ confidenceScore: number, matchedFeatures: string[], explanation: string } | null> {
  const aiClient = getGemini();
  if (!aiClient) return null;

  try {
    const photoAParsed = parseBase64Image(reportA.photoUrl);
    const photoBParsed = parseBase64Image(reportB.photoUrl);

    const promptText = `
    Estás analizando la posible coincidencia entre dos reportes (pueden ser de personas o mascotas) afectadas por una catástrofe en Venezuela.
    Debes determinar si se trata del mismo ser vivo comparando detalladamente sus fotos (si se adjuntan), descripciones, rasgos físicos y faciales.

    REPORTE A (Desaparecido/Buscado):
    - Tipo de reporte: ${reportA.facialFeatures?.isPet ? 'MASCOTA' : 'HUMANO'}
    - Nombre / Tipo de animal: ${reportA.fullName}
    - Especie / Raza si aplica: ${reportA.facialFeatures?.petType || 'N/A'} - ${reportA.facialFeatures?.petBreedColor || 'N/A'}
    - Edad: ${reportA.age}
    - Género: ${reportA.gender}
    - Ubicación: ${reportA.lastLocation.address}
    - Rasgos distintivos: ${reportA.distinctiveFeatures}
    - Características de rostro/pelaje/ojos: Ojos: ${reportA.facialFeatures?.eyeColor || 'N/A'}, Rostro/Hocico: ${reportA.facialFeatures?.faceShape || 'N/A'}, Expresión: ${reportA.facialFeatures?.expression || 'N/A'}
    - Análisis Facial/Corporal: ${reportA.facialFeatures?.metadataSummary || 'No disponible'}

    REPORTE B (Encontrado / En Refugio):
    - Tipo de reporte: ${reportB.facialFeatures?.isPet ? 'MASCOTA' : 'HUMANO'}
    - Nombre / Tipo de animal: ${reportB.fullName}
    - Especie / Raza si aplica: ${reportB.facialFeatures?.petType || 'N/A'} - ${reportB.facialFeatures?.petBreedColor || 'N/A'}
    - Edad aproximada: ${reportB.age}
    - Género: ${reportB.gender}
    - Ubicación encontrada: ${reportB.lastLocation.address}
    - Rasgos distintivos: ${reportB.distinctiveFeatures}
    - Características de rostro/pelaje/ojos: Ojos: ${reportB.facialFeatures?.eyeColor || 'N/A'}, Rostro/Hocico: ${reportB.facialFeatures?.faceShape || 'N/A'}, Expresión: ${reportB.facialFeatures?.expression || 'N/A'}
    - Análisis Facial/Corporal: ${reportB.facialFeatures?.metadataSummary || 'No disponible'}

    REGLAS DE ALTA SENSIBILIDAD PARA COMPARAR MASCOTAS (CRÍTICO):
    1. Las mascotas pueden lucir muy distintas en dos fotos diferentes debido a:
       - Ángulo (una foto de primer plano de la cara vs. una de cuerpo entero o de perfil).
       - Estado físico (una foto limpia en casa vs. mojado/sucio tras un desastre).
       - Pose (parado, acostado, sentado).
       - Luz y fondo de la imagen.
    2. NO busques que las imágenes sean idénticas. En su lugar, busca correspondencia de características corporales invariables:
       - Patrones de pelaje únicos: marcas atigradas, parches negros o marrones en el lomo/cola, pecho de color diferente (pecho blanco o "pechera"), o marcas tipo "calcetín" en las patas (patas de color claro).
       - Características anatómicas: Forma de orejas (ambas caídas o erguidas), forma del hocico (chato o alargado), longitud y grosor de la cola.
       - Accesorios: collares similares, marcas de arnés, etc.
    3. Si ambos son del mismo tipo de mascota (ej. ambos perros o ambos gatos) y comparten características de patrón de pelaje, marcas corporales o color de ojos congruentes, la probabilidad de coincidencia (confidenceScore) debe ser proporcionalmente ALTA (ej: >= 75%), incluso si las fotos se tomaron desde ángulos o distancias completamente diferentes.
    4. Si estás razonablemente seguro de que es el mismo animal por sus marcas atigradas, parches o patrón de pelaje corporal completo, asigna un confidenceScore de 85% a 98%.

    IMPORTANTE: Si uno es una persona y el otro es una mascota, la coincidencia debe ser estrictamente 0.
    
    Devuelve un objeto JSON estrictamente formateado de la siguiente manera:
    {
      "confidenceScore": (número de 0 a 100 indicando la confianza de que sean el mismo ser vivo),
      "matchedFeatures": [una lista de strings con hasta 5 rasgos o factores clave en los que coinciden],
      "explanation": "Una explicación clara, empática y profesional de 2 o 3 frases en español detallando minuciosamente las marcas o rasgos físicos corporales que coinciden o justificando por qué no coinciden."
    }
    `;

    const contentsArray: any[] = [{ text: promptText }];

    // If photos are base64, we supply them for multimodal face analysis
    if (photoAParsed) {
      contentsArray.push({
        inlineData: {
          mimeType: photoAParsed.mimeType,
          data: photoAParsed.data
        }
      });
    }
    if (photoBParsed) {
      contentsArray.push({
        inlineData: {
          mimeType: photoBParsed.mimeType,
          data: photoBParsed.data
        }
      });
    }

    const response = await aiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contentsArray,
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text;
    if (responseText) {
      const parsed = JSON.parse(responseText.trim());
      return {
        confidenceScore: Number(parsed.confidenceScore) || 10,
        matchedFeatures: Array.isArray(parsed.matchedFeatures) ? parsed.matchedFeatures : [],
        explanation: parsed.explanation || "Coincidencia evaluada analíticamente."
      };
    }
  } catch (error) {
    console.error("Error in runGeminiMatch:", error);
  }
  return null;
}

// API Routes

// Get all reports
app.get("/api/reports", (req, res) => {
  res.json({ success: true, reports });
});

// Create new report & auto match
app.post("/api/reports", async (req, res) => {
  try {
    const {
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
      petType,
      petBreedColor,
      eyeColor,
      faceShape,
      expression
    } = req.body;

    if (!type || !gender || !lastLocation) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const newReport: Report = {
      id: "report-" + Date.now(),
      type,
      fullName: fullName || (type === "found" ? (isPet ? "Mascota Sin Identificar" : "No Identificado") : (isPet ? "Mascota Desaparecida" : "Desconocido")),
      age: age || "Desconocida",
      gender,
      lastLocation,
      lastSeenDate: lastSeenDate || new Date().toISOString().split('T')[0],
      photoUrl: photoUrl || "",
      reporterName: reporterName || "Anónimo",
      reporterContact: reporterContact || "",
      distinctiveFeatures: distinctiveFeatures || "",
      status: "active",
      createdAt: new Date().toISOString()
    };

    // Analyze facial features using Gemini if we have a photo and API key
    const aiClient = getGemini();
    let facialFeatures: FacialFeatures = {
      isPet: isPet || false,
      petType: petType || "",
      petBreedColor: petBreedColor || "",
      eyeColor: eyeColor || "",
      faceShape: faceShape || "",
      expression: expression || "",
      gender: gender,
      approximateAge: String(age)
    };

    if (photoUrl && aiClient) {
      try {
        const imageParsed = parseBase64Image(photoUrl);
        if (imageParsed) {
          console.log("Analyzing image using Gemini Vision API...");
          const prompt = `
          Analiza esta foto de una persona o mascota afectada por un desastre.
          Debes identificar con precisión si corresponde a un ser humano o a una mascota (como perro, gato, ave, etc.).
          
          CRÍTICO PARA MASCOTAS (PERROS, GATOS, ETC.):
          - El escaneo y análisis de mascotas debe ser corporal completo, no solo del rostro/hocico.
          - Analiza detalladamente todo el cuerpo visible: el pelaje entero, patrones del manto (atigrado, manchas, parches, bicolor, tricolor, marcas tipo calcetín en patas, color del pecho/panza), tipo de cola (larga, corta, enroscada), tipo de orejas (erectas, caídas, dobladas) y complexión corporal (pequeño, musculoso, esbelto).
          - Registra con sumo detalle marcas de pelaje o señas corporales específicas (ej: "mancha blanca con forma de estrella en el pecho", "patas blancas", "puntas de las orejas negras").
          - Si lleva collar, arnés, placa o ropa de mascota, descríbelos minuciosamente en "distinctiveMarks" o "clothing".

          Devuelve un objeto JSON estructurado estrictamente con este formato:
          {
            "isPet": true (si es una mascota/animal) o false (si es un humano),
            "petType": "Perro" | "Gato" | "Ave" | "Otro" | "Ninguno" (si es humano),
            "petBreedColor": "raza y descripción corporal detallada del pelaje y colores (ej. Criollo de pelaje corto color marrón con lomo negro y pecho blanco, siamés blanco y gris con calcetines blancos, etc. Si es humano, poner cadena vacía)",
            "gender": "Masculino" | "Femenino" | "Desconocido" | "Macho" | "Hembra",
            "approximateAge": "rango de edad estimado (ej. 30-35 años, cachorro, gato adulto de aprox 3 años, etc.)",
            "hairColorStyle": "estilo/color de cabello o patrón y textura del pelaje completo (ej. negro rizado, pelaje corto atigrado gris y blanco, lacio rubio)",
            "facialHair": "vello facial si tiene (ej. barba, bigote, o 'Ninguno')",
            "distinctiveMarks": "marcas distintivas del rostro y de todo el cuerpo (ej. cicatrices, lunares, tatuajes, collar de nylon azul con placa, mancha blanca en pata derecha, cola amputada, etc.)",
            "skinTone": "tono de piel aproximado o color predominante de pelaje (ej. morena, blanca, trigueña, dorado, negro, atigrado)",
            "eyeColor": "color de ojos visible de forma muy precisa (ej. marrón oscuro, verde, azul, amarillo, negro)",
            "faceShape": "forma de la cabeza/rostro o características de hocico/orejas (ej. cabeza ovalada, hocico chato, orejas caídas grandes, hocico alargado con nariz negra)",
            "expression": "expresión o estado emocional visible (ej. asustado, tranquilo, alegre, alerta)",
            "clothing": "ropa, arnés, collar o accesorios visibles en la foto (ej. franela roja, collar rojo de cuero, arnés negro)",
            "metadataSummary": "Resumen sumamente detallado de 3 oraciones en español que cubra tanto las facciones del rostro/hocico como los rasgos y marcas de todo el cuerpo del ser vivo para garantizar un indexado infalible de búsqueda."
          }
          `;

          const response = await aiClient.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: imageParsed.mimeType,
                  data: imageParsed.data
                }
              }
            ],
            config: {
              responseMimeType: "application/json"
            }
          });

          // Ruta para eliminar un reporte
// Ruta para eliminar un reporte (Protegida)
app.delete("/api/reports/:id", async (req, res) => {
  const token = req.headers['x-admin-token'];
  
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: "Acceso denegado" });
  }

  const { id } = req.params;
  const { error } = await supabase.from('reports').delete().eq('id', id);
  
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Reporte eliminado con éxito" });
});

// Ruta para editar un reporte
app.put("/api/reports/:id", async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  const { error } = await supabase.from('reports').update(updatedData).eq('id', id);
  
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Reporte actualizado con éxito" });
});

          const resultText = response.text;
          if (resultText) {
            const parsedData = JSON.parse(resultText.trim());
            facialFeatures = {
              ...facialFeatures,
              ...parsedData
            };
            console.log("Image analyzed successfully:", facialFeatures);
          }
        }
      } catch (e) {
        console.error("Failed to analyze image with Gemini:", e);
        // Keep initial features as fallback
        facialFeatures.metadataSummary = `${isPet ? 'Mascota' : 'Persona'} de sexo ${gender}, edad ${age || 'desconocida'}. Rasgos: ${distinctiveFeatures}`;
      }
    } else {
      // Create local fallback summary based on textual input
      facialFeatures.metadataSummary = `${isPet ? 'Mascota' : 'Persona'} registrada sin análisis fotográfico. Edad ${age || 'desconocida'}, género ${gender}. Rasgos: ${distinctiveFeatures}`;
    }

    newReport.facialFeatures = facialFeatures;
    // Overwrite report type-specific properties from analyzed features if available
    if (facialFeatures.isPet) {
      if (facialFeatures.gender === "Macho" || facialFeatures.gender === "Hembra") {
        newReport.gender = facialFeatures.gender;
      }
    }
    // 1. Subir la foto real al almacenamiento de Supabase Storage
    const fotoPublicaUrl = await uploadBase64ToStorage(newReport.photoUrl, `${newReport.id}.png`);
    
    // 2. Si se subió bien, cambiamos el texto Base64 gigante por el enlace de internet
    if (fotoPublicaUrl) {
      newReport.photoUrl = fotoPublicaUrl;
    }

    // 3. Guardar el reporte completo en la base de datos de Supabase
    const { error: dbError } = await supabase
      .from('reports')
      .insert([newReport]);

    if (dbError) {
      console.error("Error guardando el reporte en Supabase DB:", dbError);
    }

    // Mantener la copia local por compatibilidad con el resto de tus funciones
    reports.unshift(newReport);

    // AUTOMATIC MATCHING PROCESS
    // We match the new report against existing reports of the OPPOSITE type
    const searchTargetType = type === "missing" ? "found" : "missing";
    const candidates = reports.filter(r => r.type === searchTargetType && r.status === "active");

    const matchesFound: MatchResult[] = [];

    for (const candidate of candidates) {
      // 1. Try Gemini matching first if available
      let matchResult = null;
      if (aiClient) {
        matchResult = await runGeminiMatch(newReport, candidate);
      }

      // 2. Fall back to heuristic matching if Gemini is unavailable or failed
      if (!matchResult) {
        matchResult = runHeuristicMatch(newReport, candidate);
      }

      if (matchResult && matchResult.confidenceScore >= 60) {
        matchesFound.push({
          reportId: candidate.id,
          report: candidate,
          confidenceScore: matchResult.confidenceScore,
          matchedFeatures: matchResult.matchedFeatures,
          explanation: matchResult.explanation
        });

        // Generate a notifications alert
        const isNewMissing = type === "missing";
        const missingName = isNewMissing ? fullName : candidate.fullName;
        const foundName = isNewMissing ? candidate.fullName : fullName;
        const reporterContactTarget = isNewMissing ? reporterContact : candidate.reporterContact;

        const alertId = "notif-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4);
        notifications.unshift({
          id: alertId,
          title: `¡COINCIDENCIA S.O.S DETECTADA! (${matchResult.confidenceScore}%)`,
          message: isPet
            ? `El sistema inteligente de S.O.S VENEZUELA ha enlazado la mascota '${missingName}' con un reporte de refugio. Contacto: ${reporterContactTarget}.`
            : `El sistema facial/datos de S.O.S VENEZUELA ha enlazado a '${missingName}' con un reporte en refugio. Contacto familiar: ${reporterContactTarget}.`,
          date: new Date().toISOString(),
          reportIdA: newReport.id,
          reportIdB: candidate.id,
          read: false
        });
      }
    }

    res.status(201).json({
      success: true,
      report: newReport,
      matches: matchesFound
    });

  } catch (error: any) {
    console.error("Error creating report:", error);
    res.status(500).json({ success: false, error: error.message || "Internal server error" });
  }
});

// Get matches for a specific report
app.get("/api/reports/:id/matches", async (req, res) => {
  try {
    const reportId = req.params.id;
    const report = reports.find(r => r.id === reportId);
    if (!report) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }

    const oppositeType = report.type === "missing" ? "found" : "missing";
    const candidates = reports.filter(r => r.type === oppositeType && r.status === "active");

    const matches: MatchResult[] = [];
    const aiClient = getGemini();

    for (const candidate of candidates) {
      let matchResult = null;
      if (aiClient) {
        matchResult = await runGeminiMatch(report, candidate);
      }
      if (!matchResult) {
        matchResult = runHeuristicMatch(report, candidate);
      }

      if (matchResult && matchResult.confidenceScore >= 50) {
        matches.push({
          reportId: candidate.id,
          report: candidate,
          confidenceScore: matchResult.confidenceScore,
          matchedFeatures: matchResult.matchedFeatures,
          explanation: matchResult.explanation
        });
      }
    }

    // Sort by confidence score descending
    matches.sort((a, b) => b.confidenceScore - a.confidenceScore);

    res.json({ success: true, matches });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Face Search Endpoint
// Allows uploading a face photo to search in real-time against all active reports
app.post("/api/search-face", async (req, res) => {
  try {
    const { photoUrl } = req.body;
    if (!photoUrl) {
      return res.status(400).json({ success: false, error: "Photo is required for face search" });
    }

    const aiClient = getGemini();
    let facialFeatures: FacialFeatures = {};

    if (aiClient) {
      const imageParsed = parseBase64Image(photoUrl);
      if (imageParsed) {
        try {
          const prompt = `
          Analiza esta foto para búsqueda de coincidencias. Identifica si la foto corresponde a un ser humano o a una mascota (perro, gato, ave, etc.).
          
          CRÍTICO PARA MASCOTAS (PERROS, GATOS, ETC.):
          - El escaneo y análisis de mascotas debe ser corporal completo, no solo del rostro/hocico.
          - Analiza detalladamente todo el cuerpo visible: el pelaje entero, patrones del manto (atigrado, manchas, parches, bicolor, tricolor, marcas tipo calcetín en patas, color del pecho/panza), tipo de cola (larga, corta, enroscada), tipo de orejas (erectas, caídas, dobladas) y complexión corporal (pequeño, musculoso, esbelto).
          - Registra con sumo detalle marcas de pelaje o señas corporales específicas (ej: "mancha blanca con forma de estrella en el pecho", "patas blancas", "puntas de las orejas negras").
          - Si lleva collar, arnés, placa o ropa de mascota, descríbelos minuciosamente en "distinctiveMarks" o "clothing".

          Devuelve un objeto JSON estructurado con el formato:
          {
            "isPet": true (si es mascota/animal) o false (si es persona),
            "petType": "Perro" | "Gato" | "Ave" | "Otro" | "Ninguno" (si es persona),
            "petBreedColor": "raza y descripción corporal detallada del pelaje y colores (ej. Criollo de pelaje corto color marrón con lomo negro y pecho blanco, siamés blanco y gris con calcetines blancos, etc. Si es persona, poner cadena vacía)",
            "gender": "Masculino" | "Femenino" | "Desconocido" | "Macho" | "Hembra",
            "approximateAge": "rango de edad (ej. 30-35 años, cachorro, gato adulto de aprox 3 años, etc.)",
            "hairColorStyle": "estilo/color de cabello o patrón y textura del pelaje completo (ej. negro rizado, corto castaño, atigrado, etc.)",
            "facialHair": "vello facial si tiene (ej. barba, bigote, o 'Ninguno')",
            "distinctiveMarks": "marcas distintivas del rostro y de todo el cuerpo (ej. cicatrices, lunares, tatuajes, collar de nylon azul con placa, mancha blanca en pata derecha, cola amputada, etc.)",
            "skinTone": "tono de piel aproximado o color predominante de pelaje (ej. morena, blanca, trigueña, dorado, negro, atigrado)",
            "eyeColor": "color de ojos visible de forma muy precisa (ej. marrón oscuro, verde, azul, amarillo)",
            "faceShape": "forma de la cabeza/rostro o características de hocico/orejas (ej. cabeza ovalada, hocico chato, orejas caídas grandes, hocico alargado con nariz negra)",
            "expression": "expresión o estado emocional visible (ej. asustado, tranquilo, alegre, alerta)",
            "clothing": "ropa, arnés, collar o accesorios visibles (ej. franela roja, collar rojo de cuero, arnés negro)",
            "metadataSummary": "Resumen sumamente detallado de 3 oraciones en español que cubra tanto las facciones del rostro/hocico como los rasgos y marcas de todo el cuerpo del ser vivo para garantizar un indexado infalible de búsqueda."
          }
          `;

          const response = await aiClient.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              { text: prompt },
              { inlineData: { mimeType: imageParsed.mimeType, data: imageParsed.data } }
            ],
            config: { responseMimeType: "application/json" }
          });

          if (response.text) {
            facialFeatures = JSON.parse(response.text.trim());
          }
        } catch (e) {
          console.error("Failed to analyze search face with Gemini:", e);
        }
      }
    }

    // Now match this search face metadata across all active reports
    const searchMatches: MatchResult[] = [];
    // Mock virtual Search Report to pass to our matchers
    const searchReportVirtual: Report = {
      id: "search-virtual",
      type: "missing", // virtual role
      fullName: "Persona Buscada",
      age: facialFeatures.approximateAge || "Desconocida",
      gender: facialFeatures.gender || "Desconocido",
      lastLocation: { address: "Búsqueda General", lat: 0, lng: 0 },
      lastSeenDate: "",
      photoUrl,
      reporterName: "Buscador",
      reporterContact: "",
      distinctiveFeatures: facialFeatures.distinctiveMarks || "",
      status: "active",
      facialFeatures,
      createdAt: ""
    };

    for (const report of reports) {
      let matchResult = null;
      if (aiClient) {
        matchResult = await runGeminiMatch(searchReportVirtual, report);
      }
      if (!matchResult) {
        matchResult = runHeuristicMatch(searchReportVirtual, report);
      }

      if (matchResult && matchResult.confidenceScore >= 45) {
        searchMatches.push({
          reportId: report.id,
          report,
          confidenceScore: matchResult.confidenceScore,
          matchedFeatures: matchResult.matchedFeatures,
          explanation: matchResult.explanation
        });
      }
    }

    searchMatches.sort((a, b) => b.confidenceScore - a.confidenceScore);

    res.json({
      success: true,
      facialFeatures,
      matches: searchMatches
    });

  } catch (error: any) {
    console.error("Error in search-face:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Notifications Endpoint
app.get("/api/notifications", (req, res) => {
  res.json({ success: true, notifications });
});

app.post("/api/notifications/:id/read", (req, res) => {
  const { id } = req.params;
  const notif = notifications.find(n => n.id === id);
  if (notif) {
    notif.read = true;
  }
  res.json({ success: true });
});

// Resolve a report (mark as matched/found)
app.post("/api/reports/:id/resolve", (req, res) => {
  const { id } = req.params;
  const report = reports.find(r => r.id === id);
  if (report) {
    report.status = "resolved";
    res.json({ success: true, report });
  } else {
    res.status(404).json({ success: false, error: "Report not found" });
  }
});

// Vite Middleware & static fallback handler
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`S.O.S VENEZUELA server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

app.get('/api/test', (req, res) => {
  res.json({ mensaje: "¡El servidor está funcionando correctamente!" });
});

// Al final de server.ts, añade esto:
module.exports = app;
