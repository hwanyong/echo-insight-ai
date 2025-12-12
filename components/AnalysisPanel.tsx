
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
    <div className="absolute top-4 right-4 z-50 animate-in slide-in-from-right fade-in duration-300">
      <div className="bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl rounded-2xl w-80 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header: Search Result Context */}
        <div className="p-4 border-b border-slate-200/60 flex justify-between items-center bg-white/40">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Visual Search</h2>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              {point.panoId.slice(0, 12)}...
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          
          {/* Status Badge & Confidence */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${
                status === 'analyzing' ? 'bg-yellow-400 animate-pulse' :
                status === 'done' ? (matchCount > 0 ? 'bg-blue-600' : 'bg-slate-300') :
                'bg-red-500'
              }`} />
              <span className="text-sm font-bold text-slate-700 uppercase">
                {status === 'done' ? (matchCount > 0 ? 'Object Found' : 'No Match') : status}
              </span>
            </div>
            
            {matchCount > 0 && (
               <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                 confidencePercent > 80 ? 'bg-green-100 text-green-700' : 
                 confidencePercent > 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'
               }`}>
                 {confidencePercent}% Match
               </span>
            )}
          </div>

          {error && (
            <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-xs text-red-600">
              {error}
            </div>
          )}

          {/* Analysis Content */}
          {status === 'done' && (
            <>
              {/* Summary Description */}
              {summary && (
                 <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                   <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">AI Insight</h3>
                   <p className="text-xs text-slate-700 leading-relaxed">{summary}</p>
                 </div>
              )}

              {/* Detected Objects List */}
              {matchCount > 0 ? (
                <div className="space-y-3 mt-2">
                  <div className="flex items-center justify-between">
                     <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matches ({matchCount})</h3>
                  </div>
                  
                  {objects.map((obj, idx) => (
                    <div key={idx} className="group bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-all hover:border-blue-200 cursor-default">
                      <div className="flex justify-between items-start mb-2">
                         <span className="text-xs font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
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

                      <div className="h-px bg-slate-50 my-2" />
                      
                      {/* Spatial Data */}
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                         <div className="flex flex-col">
                            <span className="text-slate-400 uppercase text-[9px]">Distance</span>
                            <span className="font-medium text-slate-700">
                                {obj.spatial?.distance ? `${obj.spatial.distance.toFixed(1)}m` : 'N/A'}
                            </span>
                         </div>
                         <div className="flex flex-col">
                            <span className="text-slate-400 uppercase text-[9px]">Heading</span>
                            <span className="font-medium text-slate-700 flex items-center gap-1">
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
                   <svg className="w-10 h-10 mx-auto mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                   <p className="text-xs text-slate-500">No objects found matching your query.</p>
                </div>
              )}
            </>
          )}

          {status === 'analyzing' && (
             <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="relative">
                    <div className="w-10 h-10 border-4 border-slate-100 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="text-center">
                    <p className="text-xs font-bold text-slate-700">Scanning Scene...</p>
                    <p className="text-[10px] text-slate-400 mt-1">Analyzing visual features</p>
                </div>
             </div>
          )}

          {/* JSON Debug View (Collapsible) */}
          <details className="mt-4 pt-4 border-t border-slate-100 group">
             <summary className="text-[10px] font-bold text-slate-300 uppercase tracking-widest cursor-pointer list-none flex items-center gap-2 hover:text-slate-500 transition-colors">
                <span className="transition-transform group-open:rotate-90">▶</span> Developer Data
             </summary>
             <div className="bg-slate-50 rounded-lg p-3 mt-2 overflow-x-auto max-h-40 border border-slate-200">
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
