
// Extending the Window interface to include google maps
export {};

declare global {
  interface Window {
    google: any;
    gm_authFailure?: () => void;
  }
}

export interface MapCoordinates {
  lat: number;
  lng: number;
}

export interface GoogleMapProps {
  apiKey: string;
  initialCenter?: MapCoordinates;
  initialZoom?: number;
  user?: any;
  authError?: string | null;
}

export type MapLayerType = 'none' | 'street';

// --- Server Side Data Models ---

export interface ScanJob {
  jobId: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  // New generic search query structure
  searchQuery?: {
    text: string;
    imageRef?: string;
  };
  totalPoints: number;
  createdAt: any; // FirebaseFirestore.Timestamp
}

// Generic Object for Visual Search
export interface DetectedObject {
  id: string;
  label: string;       // e.g. "Red Fire Hydrant", "Starbucks Logo"
  confidence: number;  // 0.0 to 1.0
  description?: string; // AI generated description
  spatial?: {
    heading: number;   // 0-360 relative to north
    distance: number;  // meters
    location?: {
      lat: number;
      lng: number;
    };
  };
  // Optional crop image of the found object
  image_crop_url?: string;
}

export interface AiResult {
  // Generic Visual Search Schema
  summary?: string; 
  detected_objects?: DetectedObject[];
  
  // Legacy support fields (optional, for backward compatibility if needed)
  total_count?: number; 
}

export interface ScanPoint {
  panoId: string;
  status: 'ready' | 'analyzing' | 'done' | 'error';
  location: { latitude: number; longitude: number };
  heading?: number; // Car heading
  aiResult?: AiResult;
  error?: string;
}
