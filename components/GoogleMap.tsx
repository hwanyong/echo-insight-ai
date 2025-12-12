
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleMapProps, MapCoordinates, MapLayerType, ScanPoint } from '../types';
import { Sidebar } from './Sidebar';
import { AnalysisPanel } from './AnalysisPanel';
import { db, functions, httpsCallable, collection, onSnapshot, doc } from '../firebase';

const DEFAULT_CENTER: MapCoordinates = { lat: 37.5665, lng: 126.9780 }; // Seoul
const DEFAULT_ZOOM = 11;

// --- PRICING CONSTANTS (USD) ---
const PRICE_STATIC_IMAGE = 0.007; 
const PRICE_DYNAMIC_VIEW = 0.014; 
const MONTHLY_FREE_CREDIT = 200.0;
const MIN_CELL_SIZE = 0.0005; // Approx 50-55m

// Vibrant colors for regions
const REGION_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#84cc16", // lime
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#d946ef", // fuchsia
  "#f43f5e", // rose
];

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
  const freeTierUsedPercent = (estStaticCost / MONTHLY_FREE_CREDIT) * 100;
  const barWidth = Math.min(freeTierUsedPercent, 100); 
  const finalWidth = count > 0 && barWidth < 1 ? 1 : barWidth;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/60 p-6 max-w-sm w-full">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="text-xl">📊</span> Cost Estimator
        </h3>
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

// Image Interface for Upload
interface UploadedImage {
    id: string;
    file: File;
    previewUrl: string;
}

// Region Interface for Selection
interface SearchRegion {
    id: string;
    bounds: { north: number, south: number, east: number, west: number };
    center: { lat: number, lng: number };
    label: string;
    color: string;
    gridConfig?: { rows: number, cols: number };
}

// Interface for Found Panoramas
interface FoundPano {
    lat: number;
    lng: number;
    panoId: string;
    heading: number;
    regionId: string; // Linked to SearchRegion.id
}

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
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);

  // Region Selection State
  const [searchRegions, setSearchRegions] = useState<SearchRegion[]>([]);
  const [isRegionSelectMode, setIsRegionSelectMode] = useState(false);

  // Layer State
  const [activeLayer, setActiveLayer] = useState<MapLayerType>('none');
  const [layerLoading, setLayerLoading] = useState(false);
  
  // Search & Job State
  const [searchStatus, setSearchStatus] = useState<{ processed: number; total: number } | null>(null);
  const [foundPanos, setFoundPanos] = useState<FoundPano[]>([]);
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
  
  // Ref to track overlays (rectangles + markers + grid lines) to sync with state
  const regionOverlaysRef = useRef<Map<string, { 
      rect: any, 
      labelMarker: any, 
      closeMarker: any,
      gridLines: any[] // Store grid lines for cleanup
  }>>(new Map());

  const drawingListenersRef = useRef<any[]>([]);
  const resultMarkersRef = useRef<Map<string, any>>(new Map());

  // Ref to track found pano IDs to prevent duplicates across multiple scans
  const foundPanoIdsRef = useRef<Set<string>>(new Set());

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
    if (streetViewLayerRef.current) {
      streetViewLayerRef.current.setMap(null);
      streetViewLayerRef.current = null;
    }
    if (mapClickListenerRef.current) {
        window.google.maps.event.removeListener(mapClickListenerRef.current);
        mapClickListenerRef.current = null;
    }
  }, [mapInstance]);

  const clearResultMarkers = useCallback(() => {
    resultMarkersRef.current.forEach((marker) => {
        if (marker) marker.map = null;
    });
    resultMarkersRef.current.clear();
  }, []);

  const getRandomColor = () => {
      return REGION_COLORS[Math.floor(Math.random() * REGION_COLORS.length)];
  };

  // --- Image Upload Logic ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const newImages: UploadedImage[] = Array.from(e.target.files).map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file: file,
            previewUrl: URL.createObjectURL(file)
        }));
        setUploadedImages(prev => [...prev, ...newImages]);
    }
  };

  const removeImage = (id: string) => {
      setUploadedImages(prev => prev.filter(img => img.id !== id));
  };

  // --- Region Logic ---
  const removeRegion = useCallback((id: string) => {
      // 1. Remove Region State
      setSearchRegions(prev => prev.filter(r => r.id !== id));
      
      // 2. Remove associated Panos/Markers
      setFoundPanos(prev => {
          const keepList: FoundPano[] = [];
          const removeIds: string[] = [];

          prev.forEach(p => {
              if (p.regionId === id) {
                  removeIds.push(p.panoId);
              } else {
                  keepList.push(p);
              }
          });

          // Cleanup Markers and Refs
          removeIds.forEach(panoId => {
              // Remove Marker from Map
              const marker = resultMarkersRef.current.get(panoId);
              if (marker) {
                  marker.map = null;
                  resultMarkersRef.current.delete(panoId);
              }
              // Remove ID from duplicate check set
              foundPanoIdsRef.current.delete(panoId);
          });
          
          // Cleanup ScanPoints (Analysis Results)
          setScanPoints(prevPoints => {
              const newPoints = { ...prevPoints };
              removeIds.forEach(pid => delete newPoints[pid]);
              return newPoints;
          });

          return keepList;
      });

  }, []);

  const focusRegion = (center: { lat: number; lng: number }) => {
      if(mapInstance) {
          mapInstance.panTo(center);
          mapInstance.setZoom(15);
      }
  }

  // --- Server Upload & Realtime Sync Logic ---
  const handleSaveToServer = async () => {
    if (foundPanos.length === 0) return;
    setIsSaving(true);
    try {
        const uploadScanData = httpsCallable(functions, 'uploadScanData');
        const lats = foundPanos.map(p => p.lat);
        const lngs = foundPanos.map(p => p.lng);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;
        const scanPointsPayload = foundPanos.map(p => ({
            panoId: p.panoId,
            location: { latitude: p.lat, longitude: p.lng },
            heading: p.heading 
        }));
        const response: any = await uploadScanData({
          region: { latitude: centerLat, longitude: centerLng },
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
    const q = collection(db, 'scan_jobs', jobId, 'scan_points');
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const updates: Record<string, ScanPoint> = {};
      snapshot.docChanges().forEach((change: any) => {
        const raw = change.doc.data();
        let status: ScanPoint['status'] = 'ready';
        if (raw.status === 'done' || raw.status === 'completed') status = 'done';
        else if (raw.status === 'error' || raw.status === 'failed') status = 'error';
        else if (raw.status && raw.status.includes('analyzing')) status = 'analyzing';
        
        // Flexible Mapping for Generic Visual Search
        const aiResultRaw = raw.aiResult || raw.aiResultRaw;
        
        // Check for detected objects array (New Generic Schema)
        const detectedObjects = aiResultRaw?.detected_objects || aiResultRaw?.poles || [];
        
        const data: ScanPoint = {
            panoId: raw.panoId,
            status: status,
            location: { latitude: raw.location?.latitude || 0, longitude: raw.location?.longitude || 0 },
            heading: raw.heading || 0,
            aiResult: {
                summary: aiResultRaw?.summary || aiResultRaw?.description,
                detected_objects: detectedObjects,
                total_count: detectedObjects.length
            },
            error: raw.error
        };
        updates[data.panoId] = data;
        const marker = resultMarkersRef.current.get(data.panoId);
        if (marker && marker.content) {
            updateMarkerVisual(marker.content as HTMLElement, data);
        }
      });
      setScanPoints(prev => ({ ...prev, ...updates }));
    });
    return () => unsubscribe();
  }, [jobId]);

  const updateMarkerVisual = (div: HTMLElement, point: ScanPoint) => {
    div.className = "marker-glass";
    div.style.width = "10px";
    div.style.height = "10px";
    div.style.borderRadius = "50%";
    div.style.cursor = "pointer";
    div.style.transition = "all 0.3s ease";

    // Visual State Logic for General Object Search
    if (point.status === 'analyzing') {
        div.classList.add('marker-analyzing');
    } else if (point.status === 'done') {
        const foundCount = point.aiResult?.detected_objects?.length || 0;
        
        if (foundCount === 0) {
             div.classList.add('marker-empty');
        } else {
             // Found Something -> Use Green/Blue (formerly Safe) style logic, or specific 'found' logic
             // Reusing 'marker-safe' class but logically it means 'Found Object'
             div.classList.add('marker-safe');
             div.style.backgroundColor = "#3b82f6"; // Blue 500 for found
             div.style.borderColor = "#93c5fd";
        }
    } else if (point.status === 'error') {
        div.style.backgroundColor = "#64748b"; 
    } else {
        div.style.backgroundColor = "#8b5cf6"; 
    }
  };

  // --- Auto-Scan Logic for Single Region ---
  const scanSingleRegion = useCallback(async (region: SearchRegion) => {
    if (!mapInstance) return;

    const svService = new window.google.maps.StreetViewService();
    const { north, south, east, west } = region.bounds;
    // Use gridConfig if available, otherwise fallback to 8x8
    const { rows, cols } = region.gridConfig || { rows: 8, cols: 8 };

    // Calculate steps based on dynamic rows/cols
    const latStep = (north - south) / rows;
    const lngStep = (east - west) / cols;

    // Collect grid line intersection points
    const points: { lat: number; lng: number }[] = [];
    
    // Include corners and edges by iterating 0 to rows/cols inclusive
    for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
            points.push({ 
                lat: south + latStep * r, 
                lng: west + lngStep * c 
            });
        }
    }

    if (points.length === 0) return;

    const BATCH_SIZE = 10;
    const DELAY_MS = 50;
    let currentIndex = 0;

    const processBatch = async () => {
        if (currentIndex >= points.length) return;
        
        const batch = points.slice(currentIndex, currentIndex + BATCH_SIZE);
        const promises = batch.map((point) => new Promise<void>((resolve) => {
            svService.getPanorama({ location: point, radius: 50 }, (data: any, status: any) => {
                if (status === 'OK' && data.location && data.location.pano) {
                    const pid = data.location.pano;
                    const heading = data.tiles?.centerHeading || 0;
                    if (!foundPanoIdsRef.current.has(pid)) {
                        foundPanoIdsRef.current.add(pid);
                        setFoundPanos((prev) => [...prev, {
                            lat: data.location.latLng.lat(),
                            lng: data.location.latLng.lng(),
                            panoId: pid,
                            heading: heading,
                            regionId: region.id // Associate with Region ID
                        }]);
                    }
                }
                resolve();
            });
        }));
        await Promise.all(promises);
        currentIndex += BATCH_SIZE;
        setTimeout(processBatch, DELAY_MS);
    };
    
    processBatch();
  }, [mapInstance]);


  // --- Global Search Logic (Multi-Region / Refresh) ---
  const performMultiRegionSearch = useCallback(async () => {
    if (!mapInstance || searchRegions.length === 0) {
        if(searchMode === 'vision') alert("Please select at least one area.");
        return;
    }
    setSearchStatus({ processed: 0, total: 0 }); 
    setFoundPanos([]);
    setJobId(null);
    setScanPoints({});
    setSelectedPanoId(null);
    clearResultMarkers();
    
    // Clear the ref to allow re-discovery
    foundPanoIdsRef.current.clear();

    const svService = new window.google.maps.StreetViewService();
    const allGridPoints: { lat: number; lng: number; regionId: string }[] = [];

    searchRegions.forEach(region => {
        const { north, south, east, west } = region.bounds;
        const { rows, cols } = region.gridConfig || { rows: 8, cols: 8 };
        const latStep = (north - south) / rows;
        const lngStep = (east - west) / cols;

        const points: { lat: number; lng: number; regionId: string }[] = [];
        
        // Include corners and edges by iterating 0 to rows/cols inclusive
        for (let r = 0; r <= rows; r++) {
            for (let c = 0; c <= cols; c++) {
                points.push({ 
                    lat: south + latStep * r, 
                    lng: west + lngStep * c,
                    regionId: region.id
                });
            }
        }
        allGridPoints.push(...points);
    });

    if (allGridPoints.length === 0) return;
    
    // Safety cap
    const MAX_POINTS = 1000;
    const finalPoints = allGridPoints.length > MAX_POINTS ? allGridPoints.slice(0, MAX_POINTS) : allGridPoints;
    setSearchStatus({ processed: 0, total: finalPoints.length });

    const BATCH_SIZE = 10;
    const DELAY_MS = 50;
    let currentIndex = 0;

    const processBatch = async () => {
        if (currentIndex >= finalPoints.length) {
            setSearchStatus(null);
            return;
        }
        const batch = finalPoints.slice(currentIndex, currentIndex + BATCH_SIZE);
        const promises = batch.map((point) => new Promise<void>((resolve) => {
            svService.getPanorama({ location: point, radius: 50 }, (data: any, status: any) => {
                if (status === 'OK' && data.location && data.location.pano) {
                    const pid = data.location.pano;
                    const heading = data.tiles?.centerHeading || 0;
                    if (!foundPanoIdsRef.current.has(pid)) {
                        foundPanoIdsRef.current.add(pid);
                        setFoundPanos((prev) => [...prev, {
                            lat: data.location.latLng.lat(),
                            lng: data.location.latLng.lng(),
                            panoId: pid,
                            heading: heading,
                            regionId: point.regionId // Pass through correct region ID
                        }]);
                    }
                }
                resolve();
            });
        }));
        await Promise.all(promises);
        currentIndex += BATCH_SIZE;
        setSearchStatus({ processed: Math.min(currentIndex, finalPoints.length), total: finalPoints.length });
        setTimeout(processBatch, DELAY_MS);
    };
    processBatch();
  }, [mapInstance, searchRegions, clearResultMarkers, searchMode]);

  useEffect(() => {
    if (!mapInstance) return;
    const currentMarkerCount = resultMarkersRef.current.size;
    if (foundPanos.length > currentMarkerCount) {
        // Only process new items
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
                // If marker already exists (e.g. from a different region overlapping), skip or update?
                // Currently foundPanoIdsRef prevents duplicates so we are safe.
                const div = document.createElement("div");
                div.className = "marker-glass"; 
                div.style.backgroundColor = "#8b5cf6"; 
                div.style.width = "10px";
                div.style.height = "10px";
                div.style.borderRadius = "50%";
                div.style.cursor = "pointer";
                const marker = new AdvancedMarkerElement({
                    map: mapInstance,
                    position: pt, 
                    content: div,
                    title: `Pano: ${pt.panoId}`
                });
                marker.addListener("click", () => {
                    if (resultMarkersRef.current.size > 0 && document.getElementsByClassName('marker-safe').length > 0) {
                        setSelectedPanoId(pt.panoId);
                    } else {
                        const panorama = mapInstance.getStreetView();
                        panorama.setPano(pt.panoId);
                        panorama.setPov({ heading: 0, pitch: 0 });
                        panorama.setVisible(true);
                    }
                });
                marker.element.addEventListener('click', (e: Event) => {
                   e.stopPropagation(); 
                   setSelectedPanoId(pt.panoId);
                });
                resultMarkersRef.current.set(pt.panoId, marker);
            });
        };
        addMarkers();
    }
  }, [foundPanos, mapInstance]);

  useEffect(() => {
      Object.values(scanPoints).forEach((point: ScanPoint) => {
          const marker = resultMarkersRef.current.get(point.panoId);
          if (marker && marker.content) {
              updateMarkerVisual(marker.content as HTMLElement, point);
          }
      });
  }, [scanPoints]);

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
                    panorama.setPov({ heading: 270, pitch: 0 });
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

  useEffect(() => {
    if (!mapInstance) return;
    clearLayers();
    if (activeLayer === 'street') updateStreetViewLayer();
  }, [activeLayer, mapInstance, updateStreetViewLayer, clearLayers]);

  useEffect(() => {
    if (!mapInstance) return;
    const panorama = mapInstance.getStreetView();
    if (!panorama) return;
    const listener = panorama.addListener("visible_changed", () => {
      const isVisible = panorama.getVisible();
      setIsPanoramaActive(isVisible);
    });
    return () => { window.google.maps.event.removeListener(listener); };
  }, [mapInstance]);

  // --- Multi-Area Drawing Logic ---
  
  // 1. Handle Map Mode Changes (Drag vs Draw)
  useEffect(() => {
     if (!mapInstance) return;
     if (isRegionSelectMode) {
         mapInstance.setOptions({ draggable: false, gestureHandling: 'none' });
         mapInstance.getDiv().style.cursor = 'crosshair';
     } else {
         mapInstance.setOptions({ draggable: true, gestureHandling: 'greedy' });
         mapInstance.getDiv().style.cursor = '';
     }
  }, [isRegionSelectMode, mapInstance]);

  // 2. Sync State `searchRegions` to Map Overlays (Rectangles + Markers)
  useEffect(() => {
      if(!mapInstance) return;

      const activeIds = new Set(searchRegions.map(r => r.id));

      // Remove Old
      regionOverlaysRef.current.forEach((overlay, id) => {
          if(!activeIds.has(id)) {
              overlay.rect.setMap(null);
              if(overlay.labelMarker) overlay.labelMarker.map = null;
              if(overlay.closeMarker) overlay.closeMarker.map = null;
              // Clean up grid lines
              if(overlay.gridLines) overlay.gridLines.forEach(l => l.setMap(null));
              
              regionOverlaysRef.current.delete(id);
          }
      });

      // Add New
      const addOverlays = async () => {
        let AdvancedMarkerElement: any;
        if (window.google?.maps?.importLibrary) {
            const lib = await window.google.maps.importLibrary("marker");
            AdvancedMarkerElement = lib.AdvancedMarkerElement;
        } else {
            AdvancedMarkerElement = window.google.maps.marker.AdvancedMarkerElement;
        }

        searchRegions.forEach(region => {
            if (!regionOverlaysRef.current.has(region.id)) {
                // Draw Border Rectangle
                const rect = new window.google.maps.Rectangle({
                    map: mapInstance,
                    bounds: region.bounds,
                    fillColor: region.color, 
                    fillOpacity: 0.1, // Very transparent
                    strokeColor: region.color, 
                    strokeWeight: 2, // Thicker border
                    clickable: false,
                });

                // --- Draw Grid Lines Based on Dynamic Config ---
                const gridLines: any[] = [];
                const { rows, cols } = region.gridConfig || { rows: 8, cols: 8 };
                
                const latSpan = region.bounds.north - region.bounds.south;
                const lngSpan = region.bounds.east - region.bounds.west;
                const latStep = latSpan / rows;
                const lngStep = lngSpan / cols;

                // Vertical lines (1 to cols-1)
                for (let i = 1; i < cols; i++) {
                    const lng = region.bounds.west + (lngStep * i);
                    const line = new window.google.maps.Polyline({
                        map: mapInstance,
                        path: [{lat: region.bounds.south, lng}, {lat: region.bounds.north, lng}],
                        strokeColor: region.color,
                        strokeOpacity: 0.5,
                        strokeWeight: 1,
                        clickable: false
                    });
                    gridLines.push(line);
                }

                // Horizontal lines (1 to rows-1)
                for (let i = 1; i < rows; i++) {
                    const lat = region.bounds.south + (latStep * i);
                    const line = new window.google.maps.Polyline({
                        map: mapInstance,
                        path: [{lat, lng: region.bounds.west}, {lat, lng: region.bounds.east}],
                        strokeColor: region.color,
                        strokeOpacity: 0.5,
                        strokeWeight: 1,
                        clickable: false
                    });
                    gridLines.push(line);
                }

                let labelMarker = null;
                let closeMarker = null;

                if(AdvancedMarkerElement) {
                    
                    // --- 1. Label Marker at NW Corner (Inside) ---
                    const labelContainer = document.createElement("div");
                    labelContainer.className = "flex items-center transform translate-x-2 translate-y-4"; 
                    labelContainer.style.pointerEvents = "none"; 
                    
                    const labelSpan = document.createElement("span");
                    labelSpan.className = "px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-sm whitespace-nowrap backdrop-blur-sm";
                    labelSpan.style.backgroundColor = region.color;
                    labelSpan.innerText = region.label;
                    
                    labelContainer.appendChild(labelSpan);

                    labelMarker = new AdvancedMarkerElement({
                        map: mapInstance,
                        position: { lat: region.bounds.north, lng: region.bounds.west }, // NW
                        content: labelContainer,
                        title: region.label
                    });

                    // --- 2. Close Button Marker at NE Corner (Inside) ---
                    const closeContainer = document.createElement("div");
                    closeContainer.className = "flex items-center transform -translate-x-2 translate-y-4";
                    
                    const btn = document.createElement("button");
                    btn.innerHTML = `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path></svg>`;
                    btn.className = "bg-white text-slate-500 hover:text-red-500 rounded-full p-1 shadow-md border border-slate-200 transition-colors cursor-pointer";
                    btn.title = "Remove Area";
                    btn.addEventListener('click', (e: any) => {
                        e.stopPropagation();
                        removeRegion(region.id);
                    });

                    closeContainer.appendChild(btn);

                    closeMarker = new AdvancedMarkerElement({
                        map: mapInstance,
                        position: { lat: region.bounds.north, lng: region.bounds.east }, // NE
                        content: closeContainer,
                        title: "Remove"
                    });
                }

                regionOverlaysRef.current.set(region.id, { rect, labelMarker, closeMarker, gridLines });
            }
        });
      };
      
      addOverlays();

  }, [searchRegions, mapInstance, removeRegion]);

  // 3. Drawing Interaction Listener
  useEffect(() => {
    if (!mapInstance || !isRegionSelectMode) return;

    let tempRect: any = null;
    let startLatLng: any = null;

    const handleMouseDown = (e: any) => {
        startLatLng = e.latLng;
        const startLat = e.latLng.lat();
        const startLng = e.latLng.lng();
        
        // Random Color for drawing (temp) - will be finalized on mouseup
        const tempColor = getRandomColor();

        tempRect = new window.google.maps.Rectangle({
            map: mapInstance,
            bounds: { north: startLat, south: startLat, east: startLng, west: startLng },
            fillColor: tempColor, 
            fillOpacity: 0.2,
            strokeColor: tempColor,
            strokeWeight: 2,
            clickable: false,
        });

        const moveListener = mapInstance.addListener('mousemove', (ev: any) => {
            if(!startLatLng || !tempRect) return;
            const curLat = ev.latLng.lat();
            const curLng = ev.latLng.lng();
            const newBounds = {
                north: Math.max(startLatLng.lat(), curLat),
                south: Math.min(startLatLng.lat(), curLat),
                east: Math.max(startLatLng.lng(), curLng),
                west: Math.min(startLatLng.lng(), curLng)
            };
            tempRect.setBounds(newBounds);
        });
        drawingListenersRef.current.push(moveListener);

        const handleMouseUp = () => {
            drawingListenersRef.current.forEach((l) => window.google.maps.event.removeListener(l));
            drawingListenersRef.current = [];
            window.removeEventListener('mouseup', handleMouseUp);

            if (tempRect) {
                const bounds = tempRect.getBounds();
                if (bounds) {
                    const ne = bounds.getNorthEast();
                    const sw = bounds.getSouthWest();
                    const center = { lat: (ne.lat() + sw.lat()) / 2, lng: (ne.lng() + sw.lng()) / 2 };
                    
                    // --- Dynamic Grid Calculation ---
                    const latSpan = ne.lat() - sw.lat();
                    const lngSpan = ne.lng() - sw.lng();
                    
                    // Calculate rows/cols based on MIN_CELL_SIZE, capped at 8
                    const rows = Math.max(1, Math.min(8, Math.floor(latSpan / MIN_CELL_SIZE)));
                    const cols = Math.max(1, Math.min(8, Math.floor(lngSpan / MIN_CELL_SIZE)));

                    const newRegion: SearchRegion = {
                        id: Math.random().toString(36).substr(2, 9),
                        bounds: {
                            north: ne.lat(),
                            south: sw.lat(),
                            east: ne.lng(),
                            west: sw.lng()
                        },
                        center: center,
                        label: `Area ${searchRegions.length + 1}`,
                        color: getRandomColor(), // Final color assignment
                        gridConfig: { rows, cols } // Store grid dimension
                    };

                    setSearchRegions(prev => [...prev, newRegion]);
                    // Trigger auto-scan for the new region immediately
                    scanSingleRegion(newRegion);
                }
                tempRect.setMap(null); 
                tempRect = null;
            }
            startLatLng = null;
            setIsRegionSelectMode(false); // Auto disable drawing mode
        };

        window.addEventListener('mouseup', handleMouseUp);
    };

    const downListener = mapInstance.addListener('mousedown', handleMouseDown);
    return () => {
        window.google.maps.event.removeListener(downListener);
    };
  }, [mapInstance, isRegionSelectMode, searchRegions.length, scanSingleRegion]); 

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
        if (!MapConstructor) throw new Error("Google Maps API not loaded correctly.");

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

  // --- UI RENDER ---
  return (
    <div className="relative w-full h-full bg-gray-50">
      {isLoading && <div className="absolute inset-0 z-10"><LoadingSpinner /></div>}

      <div ref={mapRef} className="w-full h-full" />

      {!isLoading && !showKeyInput && !isPanoramaActive && (
          <>
            <Sidebar isHidden={isPanoramaActive} user={user} authError={authError} />

            <div className="absolute top-4 right-4 flex flex-col gap-2 z-30">
                <button
                    onClick={() => setShowStats(true)}
                    className="p-3 bg-black/80 text-white/80 rounded-full shadow-lg hover:bg-black hover:text-white transition-all backdrop-blur-md border border-white/10"
                    title="Show Stats"
                >
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </button>
            </div>
            
            {selectedPanoId && scanPoints[selectedPanoId] && (
                <AnalysisPanel 
                    point={scanPoints[selectedPanoId]} 
                    onClose={() => setSelectedPanoId(null)} 
                />
            )}

            {showStats && (
                <PricingStatsModal 
                    count={foundPanos.length} 
                    onClose={() => setShowStats(false)} 
                />
            )}
          </>
      )}

      {/* Bottom Center Search Bar with Asset Tray */}
      {!isLoading && !showKeyInput && !isPanoramaActive && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-30 flex flex-col items-center">
            
            {/* Asset Tray (Vision Mode Only) */}
            {searchMode === 'vision' && (
                <div className="w-full mb-3 flex gap-2 overflow-x-auto py-1 px-1 animate-in slide-in-from-bottom-4 fade-in duration-300 no-scrollbar">
                    
                    {/* 1. Add Image Button */}
                    <label className="flex-shrink-0 cursor-pointer group" title="Upload Reference Image">
                        <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                        <div className="w-14 h-14 bg-white/80 backdrop-blur-md rounded-xl border border-white/40 shadow-lg flex items-center justify-center text-violet-500 group-hover:bg-white group-hover:scale-105 transition-all">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                    </label>

                    {/* 2. Add Area Toggle Button */}
                    <button 
                        onClick={() => setIsRegionSelectMode(!isRegionSelectMode)}
                        className={`flex-shrink-0 w-14 h-14 backdrop-blur-md rounded-xl border shadow-lg flex items-center justify-center transition-all ${
                            isRegionSelectMode 
                            ? 'bg-blue-600 border-blue-400 text-white scale-105 ring-2 ring-blue-300' 
                            : 'bg-white/80 border-white/40 text-blue-500 hover:bg-white hover:scale-105'
                        }`}
                        title="Select Search Area"
                    >
                        {/* Dashed Square Icon */}
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} strokeDasharray="4 4" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                    </button>

                    {/* 3. Image Thumbnails */}
                    {uploadedImages.map((img) => (
                        <div key={img.id} className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden shadow-lg border border-white/40 group animate-in zoom-in duration-200">
                            <img src={img.previewUrl} alt="preview" className="w-full h-full object-cover" />
                            <button 
                                onClick={() => removeImage(img.id)}
                                className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ))}

                    {/* 4. Region Thumbnails (Color Sync) */}
                    {searchRegions.map((region, idx) => (
                         <div 
                            key={region.id} 
                            onClick={() => focusRegion(region.center)}
                            // Applying dynamic background/border colors based on region.color
                            style={{ 
                                backgroundColor: `${region.color}20`, // 20 hex = approx 12% opacity
                                borderColor: region.color 
                            }}
                            className="relative flex-shrink-0 w-14 h-14 backdrop-blur-md rounded-xl border shadow-lg flex flex-col items-center justify-center cursor-pointer group animate-in zoom-in duration-200"
                        >
                            <span 
                                className="text-[10px] font-bold uppercase"
                                style={{ color: region.color }}
                            >Area</span>
                            <span 
                                className="text-xs font-bold brightness-75 contrast-125"
                                style={{ color: region.color }}
                            >{idx + 1}</span>
                            
                            <button 
                                onClick={(e) => { e.stopPropagation(); removeRegion(region.id); }}
                                className="absolute top-0.5 right-0.5 bg-black/20 text-slate-700 hover:bg-red-500 hover:text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ))}

                </div>
            )}

            {/* Search Bar */}
            <div className="w-full h-14 relative pointer-events-auto shadow-2xl rounded-full transition-transform bg-white/90 backdrop-blur-xl border border-white/40 flex items-stretch group-focus-within:scale-[1.02]">
                
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

                <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 pl-6 pr-4 h-full rounded-l-full text-gray-600 hover:text-gray-900 hover:bg-black/5 border-r border-gray-200/50 transition-colors cursor-pointer active:scale-95 z-10 outline-none"
                >
                    <span className="text-sm font-semibold tracking-tight min-w-[3rem] text-left">
                        {searchMode === 'places' ? 'Places' : 'Vision'}
                    </span>
                    <svg className={`w-3 h-3 text-gray-400 transition-transform duration-300 ease-out ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>

                <input 
                    type="text" 
                    className="flex-1 h-full px-4 text-base text-gray-900 bg-transparent focus:outline-none placeholder-gray-400 transition-all"
                    placeholder={searchMode === 'places' ? "Search city or address..." : (searchRegions.length > 0 ? `Search in ${searchRegions.length} areas...` : "Describe what to find...")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && performMultiRegionSearch()}
                />

                <div className="pr-2 flex items-center z-10">
                    <button 
                        onClick={performMultiRegionSearch}
                        className={`p-2 rounded-full text-white transition-all duration-300 shadow-md flex items-center justify-center hover:scale-110 active:scale-90 ${searchMode === 'places' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/30'}`}
                    >
                        {searchMode === 'places' ? (
                            <svg className="w-5 h-5 animate-in zoom-in duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        ) : (
                            <svg className="w-5 h-5 animate-in zoom-in duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        )}
                    </button>
                </div>
            </div>
            
            {isDropdownOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
            )}
        </div>
      )}

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
