
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
  totalPoints: number;
  createdAt: any; // FirebaseFirestore.Timestamp
}

export interface DetectedPole {
  pole_id: string;
  source_heading: number;
  spatial_analysis: {
    position_in_image: string;
    estimated_distance_m: number;
    relative_bearing_deg: number;
    absolute_bearing_deg: number;
    estimated_coordinates: {
      lat: number;
      lon: number;
    };
  };
  asset_attributes: {
    material: string;
    configuration: string;
    transformers: number;
  };
  risk_analysis: {
    ORI_score: number;
    DSI_score: number;
    risk_grade: string; // 'High', 'Medium', 'Low'
    lean_direction: string;
  };
}

export interface AiResult {
  // Legacy / Nested Schema
  meta_info?: {
    total_poles_detected: number;
  };
  detected_poles?: DetectedPole[];

  // Flattened Schema (observed in logs)
  census_success?: boolean;
  total_pole_count?: number;
  poles?: DetectedPole[];
  pole_list?: DetectedPole[]; // Fallback
  
  // Census V4 fields
  description?: string;
  pole_density_level?: string;
}

export interface ScanPoint {
  panoId: string;
  status: 'ready' | 'analyzing' | 'done' | 'error';
  location: { latitude: number; longitude: number };
  aiResult?: AiResult;
  error?: string;
}
