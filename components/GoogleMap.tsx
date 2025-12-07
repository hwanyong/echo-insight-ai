import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleMapProps, MapCoordinates } from '../types';

const DEFAULT_CENTER: MapCoordinates = { lat: 37.5665, lng: 126.9780 }; // Seoul
const DEFAULT_ZOOM = 15;

// Simple internal component to avoid unnecessary files
const LoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center w-full h-full bg-gray-50 text-gray-500">
    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
    <p className="text-sm font-medium animate-pulse">Loading Map...</p>
  </div>
);

export const GoogleMap: React.FC<GoogleMapProps> = ({
  apiKey,
  initialCenter = DEFAULT_CENTER,
  initialZoom = DEFAULT_ZOOM,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [manualKey, setManualKey] = useState('');

  // Function to initialize the map once script is loaded
  const initializeMap = useCallback((center: MapCoordinates) => {
    if (!mapRef.current || !window.google?.maps) return;

    try {
      const map = new window.google.maps.Map(mapRef.current, {
        center: center,
        zoom: initialZoom,
        disableDefaultUI: true, // Minimalist: disable all default UI
        zoomControl: false, 
        gestureHandling: 'greedy', // Better mobile experience
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        backgroundColor: '#f3f4f6',
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }] // Cleaner look
          }
        ]
      });

      setMapInstance(map);
      setIsLoading(false);
    } catch (e) {
      console.error("Error initializing map:", e);
      setError("Failed to initialize map.");
      setIsLoading(false);
    }
  }, [initialZoom]);

  // Handle Auth Failure Global Callback
  useEffect(() => {
    window.gm_authFailure = () => {
      console.error("Google Maps Auth Failure");
      setIsLoading(false);
      setError("Authorization Failed");
      setShowKeyInput(true);
    };

    return () => {
      window.gm_authFailure = undefined;
    };
  }, []);

  // Load Google Maps Script
  useEffect(() => {
    if (showKeyInput) return;

    // 1. If google maps is already fully loaded
    if (window.google?.maps) {
      initializeMap(initialCenter);
      return;
    }

    // 2. Validate API Key presence
    if (!apiKey || apiKey === 'undefined' || apiKey === 'null') {
      setIsLoading(false);
      setShowKeyInput(true);
      return;
    }

    const scriptId = 'google-maps-script';
    
    // 3. If script tag exists but maybe not loaded yet
    if (document.getElementById(scriptId)) {
        const intervalId = setInterval(() => {
            if (window.google?.maps) {
                clearInterval(intervalId);
                initializeMap(initialCenter);
            }
        }, 200);

        // Safety timeout to prevent infinite loading if script fails silently
        const timeoutId = setTimeout(() => {
             clearInterval(intervalId);
             if (!window.google?.maps && !showKeyInput) {
                 // Check if it's a network error or just slow
                 // If significantly delayed, we might want to show input, but let's wait for auth failure mostly.
             }
        }, 8000);

        return () => {
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        };
    }

    // 4. Create and append script
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      initializeMap(initialCenter);
    };

    script.onerror = () => {
      setError("Network Error: Failed to load Google Maps script.");
      setIsLoading(false);
      setShowKeyInput(true);
    };

    document.head.appendChild(script);
  }, [apiKey, initialCenter, initializeMap, showKeyInput]);

  // Handle Geolocation
  useEffect(() => {
    if (mapInstance && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          mapInstance.setCenter(pos);
          
          new window.google.maps.Marker({
            position: pos,
            map: mapInstance,
            title: "You are here",
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#4285F4",
              fillOpacity: 1,
              strokeColor: "white",
              strokeWeight: 2,
            },
          });
        },
        (err) => console.log("Geolocation permission denied", err)
      );
    }
  }, [mapInstance]);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualKey.trim()) {
      localStorage.setItem('google_maps_api_key', manualKey.trim());
      window.location.reload();
    }
  };

  const handleClearKey = () => {
    localStorage.removeItem('google_maps_api_key');
    window.location.reload();
  };

  if (showKeyInput) {
    const currentUrl = window.location.href;
    
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-100 p-4 absolute inset-0 z-50">
        <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md border-t-4 border-red-500 overflow-y-auto max-h-full">
          <h2 className="text-xl font-bold mb-2 text-gray-800">Map Configuration</h2>
          
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4 border border-red-200">
              <p className="font-bold">⚠️ {error}</p>
              <p className="mt-1">Google blocked the map request.</p>
            </div>
          )}

          <div className="bg-yellow-50 p-4 rounded-lg mb-6 text-sm text-yellow-800 border border-yellow-200">
            <p className="font-bold mb-2">Security & Troubleshooting:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Is <strong>Maps JavaScript API</strong> enabled?
              </li>
              <li>
                Is a <strong>Billing Account</strong> linked?
              </li>
              <li>
                <strong>Restrict your key!</strong> In Google Cloud Console, set 'Application restrictions' to <strong>Websites</strong> and add:
                <div className="mt-1 p-2 bg-white border border-gray-300 rounded text-xs break-all select-all font-mono">
                  {currentUrl}
                </div>
              </li>
            </ul>
          </div>

          <form onSubmit={handleSaveKey}>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Enter a valid API Key</label>
            <input 
              type="text" 
              value={manualKey}
              onChange={(e) => setManualKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full p-3 border border-gray-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mb-4">
               * This key will be stored locally in your browser. Do not use on public devices.
            </p>
            <button 
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-md"
            >
              Load Map
            </button>
          </form>
          
           {localStorage.getItem('google_maps_api_key') && (
              <div className="mt-4 text-center">
                 <button onClick={handleClearKey} className="text-xs text-red-400 hover:text-red-600 underline">
                    Clear stored key
                  </button>
              </div>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-gray-200">
      {isLoading && (
        <div className="absolute inset-0 z-10">
          <LoadingSpinner />
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};