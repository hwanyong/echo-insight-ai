import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleMapProps, MapCoordinates, MapLayerType } from '../types';
import { Sidebar } from './Sidebar';

const DEFAULT_CENTER: MapCoordinates = { lat: 37.5665, lng: 126.9780 }; // Seoul
const DEFAULT_ZOOM = 11;

// --- PRICING CONSTANTS (USD) ---
const PRICE_STATIC_IMAGE = 0.007; // $7.00 per 1000 requests
const PRICE_DYNAMIC_VIEW = 0.014; // $14.00 per 1000 requests
const MONTHLY_FREE_CREDIT = 200.0; // Google Cloud Free Tier

// "Clean Paper" / Light Glass Map Style
const GLASS_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels.text.fill",
    stylers: [{ color: "#bdbdbd" }]
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }]
  },
  {
    featureType: "road.arterial",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#dadada" }]
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#616161" }]
  },
  {
    featureType: "road.local",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9e9e9e" }]
  },
  {
    featureType: "transit.line",
    elementType: "geometry",
    stylers: [{ color: "#e5e5e5" }]
  },
  {
    featureType: "transit.station",
    elementType: "geometry",
    stylers: [{ color: "#eeeeee" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#c9c9c9" }]
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9e9e9e" }]
  }
];

// Simple internal component to avoid unnecessary files
const LoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center w-full h-full bg-gray-50 text-slate-500">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-4"></div>
    <p className="text-sm font-medium tracking-widest uppercase text-slate-400">Loading Map...</p>
  </div>
);

interface PricingStatsModalProps {
  count: number;
  onClose: () => void;
}

const PricingStatsModal: React.FC<PricingStatsModalProps> = ({ count, onClose }) => {
  const estStaticCost = count * PRICE_STATIC_IMAGE;
  const estDynamicCost = count * PRICE_DYNAMIC_VIEW;
  // Calculate percentage relative to $200 free credit
  const freeTierUsedPercent = (estStaticCost / MONTHLY_FREE_CREDIT) * 100;
  // Cap visual bar at 100%
  const barWidth = Math.min(freeTierUsedPercent, 100); 
  // Ensure a tiny sliver is shown if value is > 0 but very small
  const finalWidth = count > 0 && barWidth < 1 ? 1 : barWidth;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/60 p-6 max-w-sm w-full">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="text-xl">📊</span> Cost Estimator
        </h3>
        
        {/* Session Summary */}
        <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
           <div className="flex justify-between mb-2">
             <span className="text-sm text-slate-500">Locations Found</span>
             <span className="text-sm font-bold text-slate-800">{count}</span>
           </div>
           <div className="flex justify-between">
             <span className="text-sm text-slate-500">Current Cost (Metadata)</span>
             <span className="text-sm font-bold text-green-600">$0.00</span>
           </div>
        </div>

        {/* Projections */}
        <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-wider">Projected Costs (If consumed)</h4>
        
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center group">
            <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">Static Images (Download)</span>
            <span className="text-sm font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded">${estStaticCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center group">
             <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">Dynamic View (Interactive)</span>
             <span className="text-sm font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded">${estDynamicCost.toFixed(2)}</span>
          </div>
        </div>

        {/* Free Tier Context */}
        <div className="mb-6">
          <div className="flex justify-between text-xs mb-1">
             <span className="text-slate-500">Monthly Free Credit Impact ($200)</span>
             <span className="text-blue-600 font-bold">{freeTierUsedPercent.toFixed(4)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
             <div 
               className="bg-blue-500 h-full transition-all duration-500 ease-out" 
               style={{ width: `${finalWidth}%` }}
             />
          </div>
          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
            Google provides $200/mo credit (approx. 28,500 static images). 
            Current metadata search is free.
          </p>
        </div>

        <button 
          onClick={onClose}
          className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-medium transition-colors shadow-lg"
        >
          Close Report
        </button>
      </div>
    </div>
  );
};

export const GoogleMap: React.FC<GoogleMapProps> = ({
  apiKey,
  initialCenter = DEFAULT_CENTER,
  initialZoom = DEFAULT_ZOOM,
  user,
  authError,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [manualKey, setManualKey] = useState('');
  
  // Layer State
  const [activeLayer, setActiveLayer] = useState<MapLayerType>('none');
  const [layerLoading, setLayerLoading] = useState(false);
  
  // Drawing State
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  // Search State
  const [searchStatus, setSearchStatus] = useState<{ processed: number; total: number } | null>(null);
  const [foundPanos, setFoundPanos] = useState<Array<{ lat: number; lng: number; panoId: string }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Stats Modal State
  const [showStats, setShowStats] = useState(false);
  const [isPanoramaActive, setIsPanoramaActive] = useState(false);

  // References
  const streetViewLayerRef = useRef<any>(null);
  const mapClickListenerRef = useRef<any>(null);
  const selectionRectRef = useRef<any>(null);
  const drawingListenersRef = useRef<any[]>([]);
  const resultMarkersRef = useRef<any[]>([]); // To store result markers

  // --- Validation Log ---
  useEffect(() => {
    if (apiKey) {
      console.log("📍 GoogleMap: Key received successfully.", apiKey.slice(0, 10) + "...");
    } else {
      console.warn("📍 GoogleMap: No API Key received.");
    }
  }, [apiKey]);
  
  // --- Helpers ---
  
  const clearLayers = useCallback(() => {
    // Clear Street View Coverage
    if (streetViewLayerRef.current) {
      streetViewLayerRef.current.setMap(null);
      streetViewLayerRef.current = null;
    }

    // Remove Map Click Listeners (used for Street View)
    if (mapClickListenerRef.current) {
        window.google.maps.event.removeListener(mapClickListenerRef.current);
        mapClickListenerRef.current = null;
    }
  }, [mapInstance]);

  const clearSelection = useCallback(() => {
    if (selectionRectRef.current) {
      selectionRectRef.current.setMap(null);
      selectionRectRef.current = null;
    }
  }, []);

  const clearResultMarkers = useCallback(() => {
    resultMarkersRef.current.forEach((marker) => {
        if (marker) marker.map = null;
    });
    resultMarkersRef.current = [];
  }, []);

  // --- Server Upload Logic ---
  const handleSaveToServer = async () => {
    if (foundPanos.length === 0) return;
    setIsSaving(true);

    try {
        // --- REAL SERVER IMPLEMENTATION EXAMPLE ---
        /*
        const response = await fetch('https://api.yourdomain.com/streetview/markers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                timestamp: new Date().toISOString(),
                count: foundPanos.length,
                markers: foundPanos
            }),
        });

        if (!response.ok) throw new Error('Failed to upload');
        */
       
        // --- SIMULATION FOR DEMO ---
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
        
        alert(`Successfully uploaded ${foundPanos.length} markers to the server!`);
        
    } catch (err) {
        console.error(err);
        alert("Failed to save markers to server.");
    } finally {
        setIsSaving(false);
    }
  };

  // --- Search Logic ---

  const performGridSearch = useCallback(async (bounds: any) => {
    if (!mapInstance) return;

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const latSpan = ne.lat() - sw.lat();
    const lngSpan = ne.lng() - sw.lng();

    // Safety check for large areas (approx > 5km x 5km)
    if (latSpan > 0.05 || lngSpan > 0.05) {
        alert("Area is too large. Please select a smaller region.");
        return;
    }

    // Generate Grid Points
    // Step size ~0.0002 degrees is roughly 20-22 meters (Optimized for utility pole detection)
    const step = 0.0002; 
    const gridPoints: { lat: number; lng: number }[] = [];

    for (let lat = sw.lat(); lat < ne.lat(); lat += step) {
        for (let lng = sw.lng(); lng < ne.lng(); lng += step) {
            gridPoints.push({ lat, lng });
        }
    }

    if (gridPoints.length === 0) return;

    // Limit points to prevent browser freeze or excessive API usage
    const MAX_POINTS = 500;
    const finalPoints = gridPoints.length > MAX_POINTS ? gridPoints.slice(0, MAX_POINTS) : gridPoints;

    setSearchStatus({ processed: 0, total: finalPoints.length });
    setFoundPanos([]); // Clear previous results

    // Initialize Service
    const svService = new window.google.maps.StreetViewService();
    const seenPanos = new Set<string>();

    // Batch Processing Configuration
    const BATCH_SIZE = 5;
    const DELAY_MS = 100;
    let currentIndex = 0;

    const processBatch = async () => {
        if (currentIndex >= finalPoints.length) {
            setSearchStatus(null);
            return;
        }

        const batch = finalPoints.slice(currentIndex, currentIndex + BATCH_SIZE);
        
        const promises = batch.map((point) => new Promise<void>((resolve) => {
            // Radius 40m to find close roads
            svService.getPanorama({ location: point, radius: 40 }, (data: any, status: any) => {
                if (status === 'OK' && data.location && data.location.pano) {
                    const pid = data.location.pano;
                    // Deduplication
                    if (!seenPanos.has(pid)) {
                        seenPanos.add(pid);
                        setFoundPanos((prev) => [...prev, {
                            lat: data.location.latLng.lat(),
                            lng: data.location.latLng.lng(),
                            panoId: pid
                        }]);
                    }
                }
                resolve(); // Resolve even if failed, to keep batch moving
            });
        }));

        await Promise.all(promises);
        
        currentIndex += BATCH_SIZE;
        setSearchStatus({ 
            processed: Math.min(currentIndex, finalPoints.length), 
            total: finalPoints.length 
        });

        setTimeout(processBatch, DELAY_MS);
    };

    processBatch();
  }, [mapInstance]);

  // Effect: Render Found Markers
  useEffect(() => {
    if (!mapInstance) return;

    // Optimization: Only add new markers instead of re-rendering all
    const currentMarkerCount = resultMarkersRef.current.length;
    if (foundPanos.length > currentMarkerCount) {
        const newPoints = foundPanos.slice(currentMarkerCount);

        const addMarkers = async () => {
            let AdvancedMarkerElement: any;
            if (window.google?.maps?.importLibrary) {
                 const lib = await window.google.maps.importLibrary("marker");
                 AdvancedMarkerElement = lib.AdvancedMarkerElement;
            } else {
                 AdvancedMarkerElement = window.google.maps.marker.AdvancedMarkerElement;
            }

            if (!AdvancedMarkerElement) return;

            newPoints.forEach((pt) => {
                const div = document.createElement("div");
                div.className = "marker-glass"; // CSS class from index.html
                div.style.backgroundColor = "#8b5cf6"; // Violet 500
                div.style.width = "10px";
                div.style.height = "10px";
                div.style.borderRadius = "50%";
                div.style.cursor = "pointer";

                const marker = new AdvancedMarkerElement({
                    map: mapInstance,
                    position: pt,
                    content: div,
                    title: "Click to view Street View"
                });

                marker.addListener("click", () => {
                    const panorama = mapInstance.getStreetView();
                    panorama.setPano(pt.panoId);
                    panorama.setPov({ heading: 0, pitch: 0 });
                    panorama.setVisible(true);
                });

                resultMarkersRef.current.push(marker);
            });
        };
        addMarkers();
    }
  }, [foundPanos, mapInstance]);

  // --- Layer Implementations ---

  const updateStreetViewLayer = useCallback(async () => {
    if (!mapInstance) return;
    setLayerLoading(true);

    try {
        const { StreetViewCoverageLayer, StreetViewService, StreetViewStatus } = await window.google.maps.importLibrary("streetView");
        
        // 1. Add Coverage Layer (Blue Lines)
        const coverageLayer = new StreetViewCoverageLayer();
        coverageLayer.setMap(mapInstance);
        streetViewLayerRef.current = coverageLayer;

        // 2. Add Click Listener to open Street View
        const svService = new StreetViewService();
        
        const listener = mapInstance.addListener("click", (event: any) => {
            const clickCoords = event.latLng;
            
            // Search for nearest pano within 50 meters
            svService.getPanorama({ location: clickCoords, radius: 50 }, (data: any, status: any) => {
                if (status === StreetViewStatus.OK) {
                    const panorama = mapInstance.getStreetView();
                    panorama.setPano(data.location.pano);
                    panorama.setPov({
                        heading: 270,
                        pitch: 0,
                    });
                    panorama.setVisible(true);
                } else {
                    console.log("No Street View available here.");
                }
            });
        });

        mapClickListenerRef.current = listener;

    } catch (e) {
        console.error("Failed to load street view", e);
    } finally {
        setLayerLoading(false);
    }
  }, [mapInstance]);


  // Effect: Handle Layer Switching
  useEffect(() => {
    if (!mapInstance) return;

    clearLayers();

    if (activeLayer === 'street') {
        updateStreetViewLayer();
    }

  }, [activeLayer, mapInstance, updateStreetViewLayer, clearLayers]);

  // Effect: Monitor Street View Visibility
  useEffect(() => {
    if (!mapInstance) return;
    
    // Get the map's native panorama instance
    const panorama = mapInstance.getStreetView();
    if (!panorama) return;

    // Listen for visibility changes (e.g. User clicks X or Back button in street view)
    const listener = panorama.addListener("visible_changed", () => {
      const isVisible = panorama.getVisible();
      setIsPanoramaActive(isVisible); // Local state for hiding UI
    });

    return () => {
      window.google.maps.event.removeListener(listener);
    };
  }, [mapInstance]);

  // --- Drawing Logic (Drag-to-Select) ---
  
  const toggleDrawingMode = () => {
    if (activeLayer === 'street') {
        setActiveLayer('none'); // Turn off street view if on
    }

    setIsDrawingMode((prev) => {
        const nextMode = !prev;
        
        if (mapInstance) {
            if (nextMode) {
                // Enable Drawing Mode
                mapInstance.setOptions({ draggable: false, gestureHandling: 'none' });
                mapInstance.getDiv().style.cursor = 'crosshair';
                
                // Clear previous state when starting fresh
                clearSelection();
                clearResultMarkers();
                setFoundPanos([]);
                setSearchStatus(null);
            } else {
                // Disable Drawing Mode
                mapInstance.setOptions({ draggable: true, gestureHandling: 'greedy' });
                mapInstance.getDiv().style.cursor = '';
            }
        }
        return nextMode;
    });
  };

  useEffect(() => {
    if (!mapInstance || !isDrawingMode) return;

    const handleMouseDown = (e: any) => {
        const startLat = e.latLng.lat();
        const startLng = e.latLng.lng();

        // Create Rectangle Overlay
        const rect = new window.google.maps.Rectangle({
            map: mapInstance,
            bounds: { north: startLat, south: startLat, east: startLng, west: startLng },
            fillColor: '#3b82f6', // Blue 500
            fillOpacity: 0.1,
            strokeColor: '#3b82f6',
            strokeWeight: 1,
            clickable: false, // Important: Allow mouse events to pass through for 'mouseup'
        });
        selectionRectRef.current = rect;

        // Listener: Mouse Move (Resize Rectangle)
        const moveListener = mapInstance.addListener('mousemove', (ev: any) => {
            const curLat = ev.latLng.lat();
            const curLng = ev.latLng.lng();

            const newBounds = {
                north: Math.max(startLat, curLat),
                south: Math.min(startLat, curLat),
                east: Math.max(startLng, curLng),
                west: Math.min(startLng, curLng)
            };
            rect.setBounds(newBounds);
        });
        drawingListenersRef.current.push(moveListener);

        // Listener: Mouse Up (Global Document)
        // We use document listener to catch mouseup even if cursor leaves map area
        const handleMouseUp = () => {
            // Cleanup Listeners
            drawingListenersRef.current.forEach((l) => window.google.maps.event.removeListener(l));
            drawingListenersRef.current = [];
            window.removeEventListener('mouseup', handleMouseUp);

            // Finish Drawing
            setIsDrawingMode(false);
            if (mapInstance) {
                mapInstance.setOptions({ draggable: true, gestureHandling: 'greedy' });
                mapInstance.getDiv().style.cursor = '';
            }
            
            // Trigger Grid Search
            if (rect && rect.getBounds()) {
                performGridSearch(rect.getBounds());
            }
        };

        window.addEventListener('mouseup', handleMouseUp);
    };

    const downListener = mapInstance.addListener('mousedown', handleMouseDown);
    
    // Cleanup function for when effect re-runs or component unmounts
    return () => {
        window.google.maps.event.removeListener(downListener);
    };
  }, [mapInstance, isDrawingMode, performGridSearch]);


  // --- Initialization Logic ---
  const initializeMap = useCallback(async (center: MapCoordinates) => {
    if (!mapRef.current) return;

    try {
        let MapConstructor;
        let mapId = "DEMO_MAP_ID";

        if (window.google?.maps?.importLibrary) {
            const { Map } = await window.google.maps.importLibrary("maps");
            MapConstructor = Map;
        } else {
            MapConstructor = window.google.maps.Map;
        }

        if (!MapConstructor) {
            throw new Error("Google Maps API not loaded correctly.");
        }

      const map = new MapConstructor(mapRef.current, {
        center: center,
        zoom: initialZoom,
        disableDefaultUI: true, 
        zoomControl: false, 
        gestureHandling: 'greedy', 
        mapTypeControl: false,
        streetViewControl: false, // We control this manually via the click listener
        fullscreenControl: false,
        backgroundColor: '#f5f5f5', // Light background
        mapId: mapId,
        styles: GLASS_MAP_STYLES,
        maxZoom: 18,
        minZoom: 3,
        clickableIcons: false, // CRITICAL: Disables default POI popups
      });

      setMapInstance(map);
      setIsLoading(false);
    } catch (e) {
      console.error("Error initializing map:", e);
      setError("Failed to initialize map.");
      setIsLoading(false);
    }
  }, [initialZoom]);

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

  useEffect(() => {
    if (showKeyInput) return;

    if (window.google?.maps) {
      initializeMap(initialCenter);
      return;
    }

    if (!apiKey || apiKey === 'undefined' || apiKey === 'null') {
      setIsLoading(false);
      setShowKeyInput(true);
      return;
    }

    const scriptId = 'google-maps-script';
    
    if (document.getElementById(scriptId)) {
        const intervalId = setInterval(() => {
            if (window.google?.maps) {
                clearInterval(intervalId);
                initializeMap(initialCenter);
            }
        }, 200);
        return () => clearInterval(intervalId);
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=marker,streetView,maps`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setTimeout(() => initializeMap(initialCenter), 100);
    };

    script.onerror = () => {
      setError("Network Error: Failed to load Google Maps script.");
      setIsLoading(false);
      setShowKeyInput(true);
    };

    document.head.appendChild(script);
  }, [apiKey, initialCenter, initializeMap, showKeyInput]);

  useEffect(() => {
    if (mapInstance && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          mapInstance.setCenter(pos);
          
          let AdvancedMarkerElement;
          if (window.google?.maps?.importLibrary) {
               const lib = await window.google.maps.importLibrary("marker");
               AdvancedMarkerElement = lib.AdvancedMarkerElement;
          } else {
               AdvancedMarkerElement = window.google.maps.marker.AdvancedMarkerElement;
          }

          if (AdvancedMarkerElement) {
              const userDiv = document.createElement("div");
              userDiv.className = "marker-user"; // CSS class from index.html
              userDiv.style.backgroundColor = "#3b82f6"; // Blue for user
              userDiv.style.width = "18px";
              userDiv.style.height = "18px";
              userDiv.style.borderRadius = "50%";
              userDiv.style.boxShadow = "0 0 15px rgba(59, 130, 246, 0.6)";
              userDiv.style.border = "3px solid white";
              
              new AdvancedMarkerElement({
                position: pos,
                map: mapInstance,
                content: userDiv,
                title: "You are here",
              });
          }
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
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-50 p-4 absolute inset-0 z-50">
        <div className="bg-white/80 p-6 rounded-2xl shadow-xl w-full max-w-md border border-white/50 backdrop-blur-xl">
          <h2 className="text-xl font-medium mb-2 text-slate-800">System Config</h2>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">
              <p>⚠️ {error}</p>
            </div>
          )}
           <form onSubmit={handleSaveKey}>
            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Enter API Access Key</label>
            <input 
              type="text" 
              value={manualKey}
              onChange={(e) => setManualKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full p-3 bg-white border border-slate-200 rounded-lg mb-2 focus:outline-none focus:border-blue-400 text-slate-800 placeholder-slate-400 shadow-inner"
            />
            <button 
              type="submit"
              className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-lg transition-all font-medium shadow-lg"
            >
              Initialize System
            </button>
          </form>
           {localStorage.getItem('google_maps_api_key') && (
              <div className="mt-4 text-center">
                 <button onClick={handleClearKey} className="text-xs text-red-400 hover:text-red-500 underline">
                    Clear Key
                  </button>
              </div>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-gray-50">
      {isLoading && (
        <div className="absolute inset-0 z-10">
          <LoadingSpinner />
        </div>
      )}

      {/* Sidebar: Menu Button (Left) */}
      <Sidebar isHidden={isPanoramaActive} user={user} authError={authError} />

      {/* Stats Modal */}
      {showStats && (
        <PricingStatsModal count={foundPanos.length} onClose={() => setShowStats(false)} />
      )}
      
      {/* Map Element */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Floating Action Buttons (Right) */}
      {!isLoading && !showKeyInput && !isPanoramaActive && (
        <div className="absolute top-4 right-4 z-30 flex flex-col gap-3">
            {/* Tool: Select Area */}
            <div className="relative group">
                <button 
                    onClick={toggleDrawingMode}
                    className={`w-11 h-11 flex items-center justify-center rounded-full shadow-lg border border-white/40 backdrop-blur-md transition-all duration-300
                        ${isDrawingMode 
                            ? 'bg-blue-600 text-white scale-110' 
                            : 'bg-white/80 text-slate-600 hover:bg-white hover:scale-105'}`}
                    aria-label="Select Area"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                </button>
                <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/80 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Select Area
                </div>
            </div>

            {/* Tool: Street View Coverage */}
            <div className="relative group">
                <button 
                    onClick={() => {
                        if (isDrawingMode) toggleDrawingMode();
                        setActiveLayer(activeLayer === 'street' ? 'none' : 'street');
                    }}
                    className={`w-11 h-11 flex items-center justify-center rounded-full shadow-lg border border-white/40 backdrop-blur-md transition-all duration-300
                        ${activeLayer === 'street' 
                            ? 'bg-violet-600 text-white scale-110' 
                            : 'bg-white/80 text-slate-600 hover:bg-white hover:scale-105'}`}
                    aria-label="Toggle Street View"
                >
                     <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
                </button>
                 <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/80 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Street View Layer
                </div>
            </div>
            
            {/* Status Indicators */}
            {layerLoading && (
                <div className="absolute top-0 right-14 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm text-xs font-medium text-slate-600 flex items-center gap-2 whitespace-nowrap animate-in fade-in slide-in-from-right-2">
                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                    Loading Coverage...
                </div>
            )}
            
            {/* Context Help: Select Area Active */}
            {isDrawingMode && !searchStatus && (
                <div className="absolute top-0 right-14 bg-blue-600/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg text-xs font-medium text-white whitespace-nowrap animate-in fade-in slide-in-from-right-2">
                    Drag to select area
                </div>
            )}
        </div>
      )}

      {/* Results Panel (Center) */}
      {!isLoading && !showKeyInput && !isPanoramaActive && (searchStatus || foundPanos.length > 0) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
             {/* Progress Bar */}
             {searchStatus && (
                <div className="bg-white/90 backdrop-blur-xl px-4 py-2 rounded-full border border-white/50 shadow-xl flex items-center gap-3">
                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase leading-none">Scanning</span>
                        <span className="text-[10px] font-mono text-slate-800 leading-none">{searchStatus.processed} / {searchStatus.total}</span>
                    </div>
                </div>
            )}

            {/* Completed Results */}
            {foundPanos.length > 0 && !searchStatus && (
                <div className="bg-white/80 backdrop-blur-xl p-1.5 rounded-full border border-white/50 shadow-2xl flex items-center gap-1 animate-in slide-in-from-top-4 fade-in">
                    <div className="px-3 flex items-center gap-2 border-r border-slate-200/60 pr-3">
                        <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                        <span className="text-xs font-bold text-slate-700">
                            {foundPanos.length} <span className="font-normal text-slate-500">Found</span>
                        </span>
                    </div>
                    
                    <button
                        onClick={() => setShowStats(true)} 
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 transition-colors"
                        title="Estimate Cost"
                    >
                        <span className="text-xs font-bold">$$?</span>
                    </button>

                    <button
                        onClick={handleSaveToServer}
                        disabled={isSaving}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5
                            ${isSaving 
                                ? 'bg-slate-100 text-slate-400' 
                                : 'bg-violet-600 text-white hover:bg-violet-700 shadow-md hover:shadow-lg'}`}
                    >
                        {isSaving ? '...' : 'Upload'}
                    </button>

                    <button 
                        onClick={() => {
                            setFoundPanos([]);
                            clearResultMarkers();
                            clearSelection();
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                        title="Clear Results"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}
        </div>
      )}
    </div>
  );
};