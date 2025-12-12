
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleMapProps, MapCoordinates, MapLayerType, ScanPoint } from '../types';
import { Sidebar } from './Sidebar';
import { AnalysisPanel } from './AnalysisPanel';
import { db, functions, httpsCallable, collection, onSnapshot, doc } from '../firebase';

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
  const [searchQuery, setSearchQuery] = useState('');
  
  // Search Mode State
  const [searchMode, setSearchMode] = useState<'places' | 'vision'>('places');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Layer State
  const [activeLayer, setActiveLayer] = useState<MapLayerType>('none');
  const [layerLoading, setLayerLoading] = useState(false);
  
  // Drawing State
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  // Search & Job State
  const [searchStatus, setSearchStatus] = useState<{ processed: number; total: number } | null>(null);
  // Added heading to the foundPanos state type definition
  const [foundPanos, setFoundPanos] = useState<Array<{ lat: number; lng: number; panoId: string; heading: number }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [scanPoints, setScanPoints] = useState<Record<string, ScanPoint>>({});
  
  // UI State
  const [showStats, setShowStats] = useState(false);
  const [isPanoramaActive, setIsPanoramaActive] = useState(false);
  const [selectedPanoId, setSelectedPanoId] = useState<string | null>(null);

  // References
  const streetViewLayerRef = useRef<any>(null);
  const mapClickListenerRef = useRef<any>(null);
  const selectionRectRef = useRef<any>(null);
  const drawingListenersRef = useRef<any[]>([]);
  const resultMarkersRef = useRef<Map<string, any>>(new Map()); // Map panoId to Marker instance

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
    resultMarkersRef.current.clear();
  }, []);

  // --- Server Upload & Realtime Sync Logic ---

  const handleSaveToServer = async () => {
    if (foundPanos.length === 0) return;
    setIsSaving(true);

    try {
        const uploadScanData = httpsCallable(functions, 'uploadScanData');
        
        // Calculate center of the scanned area
        const lats = foundPanos.map(p => p.lat);
        const lngs = foundPanos.map(p => p.lng);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;

        // Transform data to match server requirements
        // Server expects: { panoId, location: { latitude, longitude }, heading }
        const scanPointsPayload = foundPanos.map(p => ({
            panoId: p.panoId,
            location: {
                latitude: p.lat,
                longitude: p.lng
            },
            heading: p.heading // Ensure numeric heading is sent
        }));

        const response: any = await uploadScanData({
          region: { 
            latitude: centerLat,
            longitude: centerLng
          },
          scanPoints: scanPointsPayload
        });
        
        const newJobId = response.data.jobId;
        console.log("Job Created:", newJobId);
        setJobId(newJobId);

    } catch (err: any) {
        console.error(err);
        alert(`Failed to upload: ${err.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  // Effect: Subscribe to Firestore when JobID is present
  useEffect(() => {
    if (!jobId) return;

    console.log("Listening for updates on Job:", jobId);
    
    // Subscribe to the scan_points subcollection
    const q = collection(db, 'scan_jobs', jobId, 'scan_points');
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const updates: Record<string, ScanPoint> = {};
      
      snapshot.docChanges().forEach((change: any) => {
        const raw = change.doc.data();
        
        // --- NORMALIZE DATA START ---
        // Map raw Firestore data to internal ScanPoint type
        // 1. Map status: Handle 'analyzing_census_v4' -> 'analyzing'
        let status: ScanPoint['status'] = 'ready';
        if (raw.status === 'done' || raw.status === 'completed') status = 'done';
        else if (raw.status === 'error' || raw.status === 'failed') status = 'error';
        else if (raw.status && raw.status.includes('analyzing')) status = 'analyzing';
        
        // 2. Map aiResult: Support aiResultRaw (flat) -> aiResult (nested expectation)
        // If aiResultRaw exists but aiResult doesn't, use aiResultRaw.
        // Also fallback to constructing one if top-level fields exist.
        const aiResult = raw.aiResult || raw.aiResultRaw || (raw.poleCount !== undefined ? {
            total_pole_count: raw.poleCount,
            description: raw.censusDescription || raw.description || raw.aiResponseText
        } : undefined);

        const data: ScanPoint = {
            panoId: raw.panoId,
            status: status,
            location: {
                latitude: raw.location?.latitude || 0,
                longitude: raw.location?.longitude || 0
            },
            aiResult: aiResult,
            error: raw.error
        };
        // --- NORMALIZE DATA END ---

        console.log(`[Firestore] Normalized ${data.panoId}`, {
           originalStatus: raw.status,
           newStatus: data.status,
           hasResult: !!data.aiResult,
           poleCount: data.aiResult?.total_pole_count
        });

        updates[data.panoId] = data;
        
        // Update marker visual immediately if possible
        const marker = resultMarkersRef.current.get(data.panoId);
        if (marker && marker.content) {
            updateMarkerVisual(marker.content as HTMLElement, data);
        }
      });
      
      setScanPoints(prev => ({ ...prev, ...updates }));
    });

    return () => unsubscribe();
  }, [jobId]);

  // Helper to update marker style based on state
  const updateMarkerVisual = (div: HTMLElement, point: ScanPoint) => {
    // Reset classes
    div.className = "marker-glass";
    
    // Base styles
    div.style.width = "10px";
    div.style.height = "10px";
    div.style.borderRadius = "50%";
    div.style.cursor = "pointer";
    div.style.transition = "all 0.3s ease";
    
    if (point.status === 'analyzing') {
        div.classList.add('marker-analyzing');
    } else if (point.status === 'done') {
        const detected = point.aiResult?.detected_poles || point.aiResult?.poles || [];
        const poleCount = point.aiResult?.total_pole_count ?? 0;
        const highRisk = detected.some(p => p.risk_analysis.risk_grade === 'High');
        
        if (poleCount === 0) {
           div.classList.add('marker-empty');
        } else if (highRisk) {
           div.classList.add('marker-risk');
        } else {
           div.classList.add('marker-safe');
        }
    } else if (point.status === 'error') {
        div.style.backgroundColor = "#64748b"; // slate-500
    } else {
        // Ready
        div.style.backgroundColor = "#8b5cf6"; // violet-500
    }
  };


  // --- Search Logic ---

  const performGridSearch = useCallback(async (bounds: any) => {
    if (!mapInstance) return;

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const latSpan = ne.lat() - sw.lat();
    const lngSpan = ne.lng() - sw.lng();

    if (latSpan > 0.05 || lngSpan > 0.05) {
        alert("Area is too large. Please select a smaller region.");
        return;
    }

    const step = 0.0002; 
    const gridPoints: { lat: number; lng: number }[] = [];

    for (let lat = sw.lat(); lat < ne.lat(); lat += step) {
        for (let lng = sw.lng(); lng < ne.lng(); lng += step) {
            gridPoints.push({ lat, lng });
        }
    }

    if (gridPoints.length === 0) return;

    const MAX_POINTS = 500;
    const finalPoints = gridPoints.length > MAX_POINTS ? gridPoints.slice(0, MAX_POINTS) : gridPoints;

    setSearchStatus({ processed: 0, total: finalPoints.length });
    setFoundPanos([]);
    setJobId(null); // Reset current job
    setScanPoints({});
    setSelectedPanoId(null);
    clearResultMarkers();

    const svService = new window.google.maps.StreetViewService();
    const seenPanos = new Set<string>();
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
            svService.getPanorama({ location: point, radius: 40 }, (data: any, status: any) => {
                if (status === 'OK' && data.location && data.location.pano) {
                    const pid = data.location.pano;
                    
                    // Extract centerHeading from tiles data (typically usually around 0-360)
                    // Fallback to 0 if not available
                    const heading = data.tiles?.centerHeading || 0;

                    if (!seenPanos.has(pid)) {
                        seenPanos.add(pid);
                        setFoundPanos((prev) => [...prev, {
                            lat: data.location.latLng.lat(),
                            lng: data.location.latLng.lng(),
                            panoId: pid,
                            heading: heading
                        }]);
                    }
                }
                resolve();
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
  }, [mapInstance, clearResultMarkers]);

  // Effect: Render Found Markers
  useEffect(() => {
    if (!mapInstance) return;

    const currentMarkerCount = resultMarkersRef.current.size;
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
                div.className = "marker-glass"; 
                div.style.backgroundColor = "#8b5cf6"; 
                div.style.width = "10px";
                div.style.height = "10px";
                div.style.borderRadius = "50%";
                div.style.cursor = "pointer";

                const marker = new AdvancedMarkerElement({
                    map: mapInstance,
                    position: pt, // API accepts object with lat/lng properties, ignores extra
                    content: div,
                    title: `Pano: ${pt.panoId}`
                });

                marker.addListener("click", () => {
                    // Check if we are in analysis mode
                    if (resultMarkersRef.current.size > 0 && document.getElementsByClassName('marker-risk').length > 0) {
                        setSelectedPanoId(pt.panoId);
                    } else {
                        // Default behavior: Open Street View
                        const panorama = mapInstance.getStreetView();
                        panorama.setPano(pt.panoId);
                        panorama.setPov({ heading: 0, pitch: 0 });
                        panorama.setVisible(true);
                    }
                });
                
                // Allow clicking even if not in analysis mode to show panel if data exists
                marker.element.addEventListener('click', (e: Event) => {
                   e.stopPropagation(); // prevent map click
                   setSelectedPanoId(pt.panoId);
                });

                resultMarkersRef.current.set(pt.panoId, marker);
            });
        };
        addMarkers();
    }
  }, [foundPanos, mapInstance]);

  // Effect: Sync visual state from scanPoints (Backup for initial load)
  useEffect(() => {
      Object.values(scanPoints).forEach((point: ScanPoint) => {
          const marker = resultMarkersRef.current.get(point.panoId);
          if (marker && marker.content) {
              updateMarkerVisual(marker.content as HTMLElement, point);
          }
      });
  }, [scanPoints]);


  // --- Layer Implementations ---

  const updateStreetViewLayer = useCallback(async () => {
    if (!mapInstance) return;
    setLayerLoading(true);

    try {
        const { StreetViewCoverageLayer, StreetViewService, StreetViewStatus } = await window.google.maps.importLibrary("streetView");
        
        const coverageLayer = new StreetViewCoverageLayer();
        coverageLayer.setMap(mapInstance);
        streetViewLayerRef.current = coverageLayer;

        const svService = new StreetViewService();
        
        const listener = mapInstance.addListener("click", (event: any) => {
            const clickCoords = event.latLng;
            
            svService.getPanorama({ location: clickCoords, radius: 50 }, (data: any, status: any) => {
                if (status === StreetViewStatus.OK) {
                    const panorama = mapInstance.getStreetView();
                    panorama.setPano(data.location.pano);
                    panorama.setPov({
                        heading: 270,
                        pitch: 0,
                    });
                    panorama.setVisible(true);
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
    const panorama = mapInstance.getStreetView();
    if (!panorama) return;

    const listener = panorama.addListener("visible_changed", () => {
      const isVisible = panorama.getVisible();
      setIsPanoramaActive(isVisible);
    });

    return () => {
      window.google.maps.event.removeListener(listener);
    };
  }, [mapInstance]);

  // --- Drawing Logic ---
  
  const toggleDrawingMode = () => {
    if (activeLayer === 'street') setActiveLayer('none');

    setIsDrawingMode((prev) => {
        const nextMode = !prev;
        
        if (mapInstance) {
            if (nextMode) {
                mapInstance.setOptions({ draggable: false, gestureHandling: 'none' });
                mapInstance.getDiv().style.cursor = 'crosshair';
                clearSelection();
                clearResultMarkers();
                setFoundPanos([]);
                setSearchStatus(null);
                setJobId(null);
                setScanPoints({});
            } else {
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

        const rect = new window.google.maps.Rectangle({
            map: mapInstance,
            bounds: { north: startLat, south: startLat, east: startLng, west: startLng },
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            strokeColor: '#3b82f6',
            strokeWeight: 1,
            clickable: false,
        });
        selectionRectRef.current = rect;

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

        const handleMouseUp = () => {
            drawingListenersRef.current.forEach((l) => window.google.maps.event.removeListener(l));
            drawingListenersRef.current = [];
            window.removeEventListener('mouseup', handleMouseUp);

            setIsDrawingMode(false);
            if (mapInstance) {
                mapInstance.setOptions({ draggable: true, gestureHandling: 'greedy' });
                mapInstance.getDiv().style.cursor = '';
            }
            
            if (rect && rect.getBounds()) {
                performGridSearch(rect.getBounds());
            }
        };

        window.addEventListener('mouseup', handleMouseUp);
    };

    const downListener = mapInstance.addListener('mousedown', handleMouseDown);
    return () => {
        window.google.maps.event.removeListener(downListener);
    };
  }, [mapInstance, isDrawingMode, performGridSearch]);


  // --- Initialization Logic ---
  const initializeMap = useCallback(async (center: MapCoordinates) => {
    if (!mapRef.current) return;

    try {
        let MapConstructor;
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
        streetViewControl: false,
        fullscreenControl: false,
        backgroundColor: '#f5f5f5',
        mapId: "DEMO_MAP_ID",
        styles: GLASS_MAP_STYLES,
        maxZoom: 18,
        minZoom: 3,
        clickableIcons: false,
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
      setIsLoading(false);
      setError("Authorization Failed");
      setShowKeyInput(true);
    };
    return () => { window.gm_authFailure = undefined; };
  }, []);

  useEffect(() => {
    if (showKeyInput) return;
    if (window.google?.maps) {
      initializeMap(initialCenter);
      return;
    }

    if (!apiKey || apiKey === 'undefined') {
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
    script.onload = () => setTimeout(() => initializeMap(initialCenter), 100);
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
          const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
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
              userDiv.className = "marker-user";
              userDiv.style.backgroundColor = "#3b82f6";
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

  // --- UI RENDER: RESTORED & NEW SEARCH BAR ---
  return (
    <div className="relative w-full h-full bg-gray-50">
      {isLoading && <div className="absolute inset-0 z-10"><LoadingSpinner /></div>}

      {/* 1. Map Container (Full Screen) */}
      <div ref={mapRef} className="w-full h-full" />

      {/* 2. Top Controls (Restored) */}
      {!isLoading && !showKeyInput && !isPanoramaActive && (
          <>
            <Sidebar isHidden={isPanoramaActive} user={user} authError={authError} />

            <div className="absolute top-4 right-4 flex flex-col gap-2 z-30">
                <button
                    onClick={toggleDrawingMode}
                    className={`p-3 rounded-full shadow-lg transition-all backdrop-blur-md border border-white/10 ${
                        isDrawingMode 
                        ? 'bg-blue-600 text-white shadow-blue-500/30' 
                        : 'bg-black/80 text-white/80 hover:bg-black hover:text-white'
                    }`}
                    title="Draw Search Area"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </button>
                <button
                    onClick={() => setShowStats(true)}
                    className="p-3 bg-black/80 text-white/80 rounded-full shadow-lg hover:bg-black hover:text-white transition-all backdrop-blur-md border border-white/10"
                    title="Show Stats"
                >
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </button>
            </div>
            
            {/* Analysis Panel */}
            {selectedPanoId && scanPoints[selectedPanoId] && (
                <AnalysisPanel 
                    point={scanPoints[selectedPanoId]} 
                    onClose={() => setSelectedPanoId(null)} 
                />
            )}

            {/* Pricing Stats Modal */}
            {showStats && (
                <PricingStatsModal 
                    count={foundPanos.length} 
                    onClose={() => setShowStats(false)} 
                />
            )}
          </>
      )}

      {/* 3. Bottom Center Search Bar (Updated Design with Dropdown) */}
      {!isLoading && !showKeyInput && !isPanoramaActive && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-30">
            <div className="relative pointer-events-auto shadow-2xl rounded-full transition-transform bg-white/90 backdrop-blur-xl border border-white/40 flex items-center group-focus-within:scale-[1.02]">
                
                {/* Search Mode Dropdown Menu (Appears Above with slide-in animation) */}
                {isDropdownOpen && (
                  <div className="absolute bottom-full left-0 mb-3 w-40 bg-white/95 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-300 z-50 origin-bottom">
                     <button 
                        onClick={() => { setSearchMode('places'); setIsDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors ${searchMode === 'places' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-600'}`}
                     >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <span className="font-medium text-sm">Places</span>
                        {searchMode === 'places' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]"/>}
                     </button>
                     <div className="h-px bg-slate-100 mx-2" />
                     <button 
                        onClick={() => { setSearchMode('vision'); setIsDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-violet-50 transition-colors ${searchMode === 'vision' ? 'text-violet-600 bg-violet-50/50' : 'text-slate-600'}`}
                     >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        <span className="font-medium text-sm">Vision</span>
                        {searchMode === 'vision' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-600 shadow-[0_0_8px_rgba(139,92,246,0.5)]"/>}
                     </button>
                  </div>
                )}

                {/* Left: Mode Dropdown Trigger */}
                <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 pl-5 pr-3 py-4 text-gray-600 hover:text-gray-900 border-r border-gray-200/50 transition-colors active:scale-95"
                >
                    <span className="text-sm font-semibold tracking-tight min-w-[3rem] text-left">
                        {searchMode === 'places' ? 'Places' : 'Vision'}
                    </span>
                    <svg className={`w-3 h-3 text-gray-400 transition-transform duration-300 ease-out ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>

                {/* Center: Input */}
                <input 
                    type="text" 
                    className="flex-1 py-4 px-4 text-base text-gray-900 bg-transparent focus:outline-none placeholder-gray-400 transition-all"
                    placeholder={searchMode === 'places' ? "Search city or address..." : "Describe what to find..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />

                {/* Right: Submit Button (Dynamic Icon with elastic pop effect) */}
                <div className="pr-2">
                    <button className={`p-2 rounded-full text-white transition-all duration-300 shadow-md flex items-center justify-center hover:scale-110 active:scale-90 ${searchMode === 'places' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/30'}`}>
                        {searchMode === 'places' ? (
                            // Search Icon
                            <svg className="w-5 h-5 animate-in zoom-in duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        ) : (
                            // Sparkles/AI Icon
                            <svg className="w-5 h-5 animate-in zoom-in duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        )}
                    </button>
                </div>
            </div>
            
            {/* Overlay to close dropdown when clicking outside (transparent) */}
            {isDropdownOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
            )}
        </div>
      )}

      {/* 4. Key Input Modal (Required for Map Load) */}
      {showKeyInput && (
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
              <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-lg transition-all font-medium shadow-lg">Initialize System</button>
            </form>
             {localStorage.getItem('google_maps_api_key') && (
                <div className="mt-4 text-center">
                   <button onClick={handleClearKey} className="text-xs text-red-400 hover:text-red-500 underline">Clear Key</button>
                </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};
