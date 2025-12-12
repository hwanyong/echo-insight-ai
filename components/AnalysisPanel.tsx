
import React from 'react';
import { ScanPoint, DetectedObject } from '../types';

interface AnalysisPanelProps {
  point: ScanPoint | null;
  onClose: () => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ point, onClose }) => {
  if (!point) return null;

  const { status, aiResult, error } = point;
  
  // Extract generic objects
  const objects = aiResult?.detected_objects || [];
  const summary = aiResult?.summary;
  const matchCount = objects.length;

  // Calculate highest confidence for summary badge
  const maxConfidence = objects.reduce((max, obj) => Math.max(max, obj.confidence), 0);
  const confidencePercent = Math.round(maxConfidence * 100);

  // Layout: 
  // We use -translate-x-1/2 to center horizontally relative to the pin.
  // We use -translate-y-[calc(100%+20px)] to lift it above the pin (100% height + 20px gap).
  return (
    <div className="absolute left-0 top-0 transform -translate-x-1/2 -translate-y-[calc(100%+16px)] z-50 animate-in zoom-in-95 fade-in duration-300 origin-bottom">
      
      <div className="relative bg-white/70 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.2)] rounded-2xl w-80 overflow-hidden flex flex-col max-h-[60vh]">
        
        {/* Header: Search Result Context */}
        <div className="p-4 border-b border-white/40 flex justify-between items-center bg-white/30">
          <div>
            <h2 className="text-base font-bold text-slate-800">Visual Result</h2>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              ID: {point.panoId.slice(0, 8)}
            </p>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }} 
            className="p-1.5 hover:bg-white/50 rounded-full text-slate-500 hover:text-slate-800 transition-colors cursor-pointer pointer-events-auto"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4 no-scrollbar">
          
          {/* Status Badge & Confidence */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${
                status === 'analyzing' ? 'bg-yellow-400 animate-pulse shadow-[0_0_10px_rgba(250,204,21,0.6)]' :
                status === 'done' ? (matchCount > 0 ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.6)]' : 'bg-slate-300') :
                'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]'
              }`} />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">
                {status === 'done' ? (matchCount > 0 ? 'Found' : 'No Match') : status}
              </span>
            </div>
            
            {matchCount > 0 && (
               <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                 confidencePercent > 80 ? 'bg-emerald-100/50 text-emerald-700 border-emerald-200' : 
                 confidencePercent > 50 ? 'bg-yellow-100/50 text-yellow-700 border-yellow-200' : 'bg-slate-100/50 text-slate-600 border-slate-200'
               } backdrop-blur-sm`}>
                 {confidencePercent}% Confidence
               </span>
            )}
          </div>

          {error && (
            <div className="bg-red-50/60 p-3 rounded-xl border border-red-100 text-xs text-red-600 backdrop-blur-sm leading-snug">
              {error}
            </div>
          )}

          {/* Analysis Content */}
          {status === 'done' && (
            <>
              {/* Summary Description */}
              {(summary || (matchCount > 0 && objects[0].description)) && (
                 <div className="bg-white/40 border border-white/60 rounded-xl p-3 shadow-sm backdrop-blur-md">
                   <p className="text-xs text-slate-700 leading-relaxed font-medium">
                     {summary || objects[0].description}
                   </p>
                 </div>
              )}

              {/* Detected Objects List */}
              {matchCount > 0 ? (
                <div className="space-y-2 mt-2">
                  {objects.map((obj, idx) => (
                    <div key={idx} className="group bg-blue-50/30 border border-blue-100/50 rounded-xl p-3 hover:bg-blue-50/50 transition-colors">
                      <div className="flex justify-between items-center mb-1">
                         <span className="text-xs font-bold text-slate-800">
                           {obj.label}
                         </span>
                         <span className="text-[9px] font-mono text-slate-400">#{idx + 1}</span>
                      </div>
                      
                      {/* Spatial Data */}
                      <div className="flex gap-3 text-[10px] text-slate-500 mt-2">
                         <div className="flex items-center gap-1">
                            <span className="font-medium bg-white/40 px-1 rounded">
                                {obj.spatial?.distance ? `${obj.spatial.distance.toFixed(0)}m` : '? m'}
                            </span>
                         </div>
                         <div className="flex items-center gap-1">
                            <span className="font-medium bg-white/40 px-1 rounded flex items-center gap-1">
                                {obj.spatial?.heading !== undefined ? (
                                    <>
                                        {obj.spatial.heading}°
                                        <svg className="w-3 h-3 text-slate-400" style={{ transform: `rotate(${obj.spatial.heading}deg)` }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                        </svg>
                                    </>
                                ) : 'N/A'}
                            </span>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 opacity-60">
                   <p className="text-xs text-slate-500 font-medium">Target not found in this view.</p>
                </div>
              )}
            </>
          )}

          {status === 'analyzing' && (
             <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="relative">
                    <div className="w-10 h-10 border-4 border-white/50 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="text-center">
                    <p className="text-xs font-bold text-slate-700">Scanning Scene...</p>
                </div>
             </div>
          )}

          {/* Debug Data Toggle */}
          <details className="mt-2 pt-2 border-t border-white/30">
             <summary className="text-[9px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer list-none hover:text-slate-600 transition-colors">
                Raw Data
             </summary>
             <div className="bg-slate-900/5 rounded-xl p-2 mt-2 overflow-x-auto max-h-32 border border-black/5">
               <pre className="text-[8px] font-mono text-slate-600 whitespace-pre-wrap break-all">
                 {aiResult ? JSON.stringify(aiResult, null, 2) : 'No data'}
               </pre>
             </div>
          </details>

        </div>
      </div>

      {/* Speech Bubble Arrow pointing DOWN to the pin */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/60 backdrop-blur-2xl border-r border-b border-white/50 rotate-45 z-40"></div>
    </div>
  );
};
