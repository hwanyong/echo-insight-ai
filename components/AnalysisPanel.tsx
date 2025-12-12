
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

  return (
    <div className="absolute top-4 right-4 z-50 animate-in slide-in-from-right fade-in duration-500">
      <div className="bg-white/70 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.2)] rounded-3xl w-80 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header: Search Result Context */}
        <div className="p-5 border-b border-white/40 flex justify-between items-center bg-white/20">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Visual Search</h2>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              {point.panoId.slice(0, 12)}...
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full text-slate-500 hover:text-slate-800 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          
          {/* Status Badge & Confidence */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                status === 'analyzing' ? 'bg-yellow-400 animate-pulse shadow-[0_0_10px_rgba(250,204,21,0.6)]' :
                status === 'done' ? (matchCount > 0 ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.6)]' : 'bg-slate-300') :
                'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]'
              }`} />
              <span className="text-sm font-bold text-slate-700 uppercase tracking-tight">
                {status === 'done' ? (matchCount > 0 ? 'Object Found' : 'No Match') : status}
              </span>
            </div>
            
            {matchCount > 0 && (
               <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                 confidencePercent > 80 ? 'bg-emerald-100/50 text-emerald-700 border-emerald-200' : 
                 confidencePercent > 50 ? 'bg-yellow-100/50 text-yellow-700 border-yellow-200' : 'bg-slate-100/50 text-slate-600 border-slate-200'
               } backdrop-blur-sm`}>
                 {confidencePercent}% Match
               </span>
            )}
          </div>

          {error && (
            <div className="bg-red-50/60 p-4 rounded-2xl border border-red-100 text-xs text-red-600 backdrop-blur-sm">
              {error}
            </div>
          )}

          {/* Analysis Content */}
          {status === 'done' && (
            <>
              {/* Summary Description */}
              {summary && (
                 <div className="bg-white/40 border border-white/60 rounded-2xl p-4 shadow-sm backdrop-blur-md">
                   <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">AI Insight</h3>
                   <p className="text-xs text-slate-700 leading-relaxed font-medium">{summary}</p>
                 </div>
              )}

              {/* Detected Objects List */}
              {matchCount > 0 ? (
                <div className="space-y-3 mt-2">
                  <div className="flex items-center justify-between">
                     <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matches ({matchCount})</h3>
                  </div>
                  
                  {objects.map((obj, idx) => (
                    <div key={idx} className="group bg-white/40 border border-white/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all hover:border-blue-300 cursor-default backdrop-blur-md">
                      <div className="flex justify-between items-start mb-2">
                         <span className="text-xs font-bold text-slate-800 bg-white/60 px-2 py-0.5 rounded border border-white/60">
                           {obj.label}
                         </span>
                         <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                      </div>
                      
                      {/* Description */}
                      {obj.description && (
                          <p className="text-[11px] text-slate-600 mb-2 leading-snug">
                              {obj.description}
                          </p>
                      )}

                      <div className="h-px bg-white/50 my-2" />
                      
                      {/* Spatial Data */}
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                         <div className="flex flex-col">
                            <span className="text-slate-400 uppercase text-[9px] mb-0.5">Distance</span>
                            <span className="font-medium text-slate-700 bg-white/30 rounded px-1.5 py-0.5 self-start">
                                {obj.spatial?.distance ? `${obj.spatial.distance.toFixed(1)}m` : 'N/A'}
                            </span>
                         </div>
                         <div className="flex flex-col">
                            <span className="text-slate-400 uppercase text-[9px] mb-0.5">Heading</span>
                            <span className="font-medium text-slate-700 flex items-center gap-1 bg-white/30 rounded px-1.5 py-0.5 self-start">
                                {obj.spatial?.heading ? (
                                    <>
                                        {obj.spatial.heading}°
                                        <svg className="w-3 h-3 text-blue-500" style={{ transform: `rotate(${obj.spatial.heading}deg)` }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                <div className="text-center py-8 opacity-50">
                   <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                   <p className="text-xs text-slate-500 font-medium">No objects found matching your query.</p>
                </div>
              )}
            </>
          )}

          {status === 'analyzing' && (
             <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-white/50 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="text-center">
                    <p className="text-xs font-bold text-slate-700">Scanning Scene...</p>
                    <p className="text-[10px] text-slate-400 mt-1">Analyzing visual features</p>
                </div>
             </div>
          )}

          {/* JSON Debug View (Collapsible) */}
          <details className="mt-4 pt-4 border-t border-white/30 group">
             <summary className="text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer list-none flex items-center gap-2 hover:text-slate-600 transition-colors">
                <span className="transition-transform group-open:rotate-90">▶</span> Developer Data
             </summary>
             <div className="bg-slate-900/5 rounded-2xl p-3 mt-3 overflow-x-auto max-h-40 border border-black/5 inner-shadow-sm">
               <pre className="text-[9px] font-mono text-slate-600 whitespace-pre-wrap break-all">
                 {aiResult ? JSON.stringify(aiResult, null, 2) : 'No data'}
               </pre>
             </div>
          </details>

        </div>
      </div>
    </div>
  );
};
