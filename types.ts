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