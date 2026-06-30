export type ReportType = 'missing' | 'found';

export interface FacialFeatures {
  gender?: string;
  approximateAge?: string;
  hairColorStyle?: string;
  facialHair?: string;
  distinctiveMarks?: string;
  skinTone?: string;
  clothing?: string;
  metadataSummary?: string; // Gemini generated descriptive facial signature
  // New properties for pet and advanced physical face recognition
  isPet?: boolean;
  petType?: string; // dog, cat, bird, etc.
  petBreedColor?: string;
  eyeColor?: string;
  faceShape?: string;
  expression?: string;
}

export interface LocationInfo {
  address: string;
  lat: number;
  lng: number;
}

export interface Report {
  id: string;
  type: ReportType;
  fullName: string;
  age: number | string;
  gender: string;
  lastLocation: LocationInfo;
  lastSeenDate: string;
  photoUrl: string; // Base64 data-uri or image url
  reporterName: string;
  reporterContact: string;
  distinctiveFeatures: string;
  status: 'active' | 'resolved';
  facialFeatures?: FacialFeatures;
  createdAt: string;
}

export interface MatchResult {
  reportId: string;
  report: Report;
  confidenceScore: number; // 0 to 100
  matchedFeatures: string[];
  explanation: string;
}

export interface MatchNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  reportIdA: string;
  reportIdB: string;
  read: boolean;
}
