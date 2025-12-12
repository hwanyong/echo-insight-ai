
import React from 'react';
import { ScanPoint, DetectedPole } from '../types';

interface AnalysisPanelProps {
  point: ScanPoint | null;
  onClose: () => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ point, onClose }) => {
  // --- DEBUG LOG START ---
  console.log(`[AnalysisPanel] Rendering with point:`, point);
  // --- DEBUG LOG END ---

  if (!point) return null;

  const { status, aiResult, error } = point;
  
  // Robust data extraction handling different schema versions
  // Schema 1 (Nested): meta_info.total_poles_detected, detected_poles
  // Schema 2 (Flat): total_pole_count, poles (or pole_list)
  const poles = aiResult?.poles || aiResult?.detected_poles || aiResult?.pole_list || [];
  const poleCount = aiResult?.total_pole_count ?? aiResult?.meta_info?.total_poles_detected ?? 0;
  const description = aiResult?.description;

  return (
    <div className="absolute top-4 right-4 z-50 animate-in slide-in-from-right fade-in duration-300">
      <div className="bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl rounded-2xl w-80 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200/60 flex justify-between items-center bg-white/40">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Inspection Report</h2>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{point.panoId}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              status === 'analyzing' ? 'bg-yellow-400 animate-pulse' :
              status === 'done' ? (poleCount > 0 ? 'bg-red-500' : 'bg-green-500') :
              status === 'error' ? 'bg-gray-500' : 'bg-slate-300'
            }`} />
            <span className="text-sm font-medium text-slate-700 uppercase">
              {status === 'done' ? (poleCount > 0 ? 'Issues Detected' : 'Clear') : status}
            </span>
          </div>

          {error && (
            <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-xs text-red-600">
              {error}
            </div>
          )}

          {/* AI Findings */}
          {status === 'done' && (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-800">{poleCount}</span>
                  <span className="text-[10px] text-slate-500 uppercase">Poles Found</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
                   <span className="text-2xl font-bold text-slate-800">
                     {poles.filter(p => p.risk_analysis?.risk_grade === 'High').length}
                   </span>
                   <span className="text-[10px] text-red-500 font-bold uppercase">High Risk</span>
                </div>
              </div>

              {/* Description (for Census Mode where poles array is empty but we have a count/desc) */}
              {poleCount > 0 && poles.length === 0 && description && (
                 <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                   <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">AI Summary</h3>
                   <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{description}</p>
                 </div>
              )}

              {/* Pole List */}
              {poles.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Detected Assets</h3>
                  {poles.map((pole, idx) => (
                    <div key={idx} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                         <span className="text-xs font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                           ID: {pole.pole_id}
                         </span>
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                           pole.risk_analysis?.risk_grade === 'High' ? 'bg-red-100 text-red-600' : 
                           pole.risk_analysis?.risk_grade === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 
                           'bg-green-100 text-green-700'
                         }`}>
                           {pole.risk_analysis?.risk_grade || 'Unknown'} Risk
                         </span>
                      </div>
                      
                      <div className="space-y-1">
                        {/* Risk Scores */}
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">ORI Score</span>
                          <span className="font-mono text-slate-700">{pole.risk_analysis?.ORI_score?.toFixed(2) || 'N/A'}</span>
                        </div>
                         <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Lean</span>
                          <span className="font-medium text-slate-800">{pole.risk_analysis?.lean_direction || 'N/A'}</span>
                        </div>
                        
                        <div className="h-px bg-slate-100 my-1.5" />
                        
                        {/* Attributes */}
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-500">
                           <span>Mat: <span className="text-slate-800">{pole.asset_attributes?.material || '-'}</span></span>
                           <span>Trans: <span className="text-slate-800">{pole.asset_attributes?.transformers || 0}</span></span>
                           <span>Dist: <span className="text-slate-800">{pole.spatial_analysis?.estimated_distance_m || 0}m</span></span>
                           <span>Head: <span className="text-slate-800">{pole.source_heading}°</span></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                    {poleCount === 0 && (
                        <div className="text-center py-6 text-slate-400 text-sm">
                          No utility poles detected in 360° view.
                        </div>
                    )}
                </>
              )}
            </>
          )}

          {status === 'analyzing' && (
             <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-medium text-slate-500 animate-pulse">Analyzing 360° Imagery...</p>
             </div>
          )}

          {/* DEBUG SECTION - Always visible to debug data structure */}
          <div className="mt-6 pt-4 border-t border-slate-200">
             <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Debug: Server Response</h4>
             <div className="bg-slate-900 rounded-lg p-3 overflow-x-auto max-h-60">
               <pre className="text-[10px] font-mono text-green-400 whitespace-pre-wrap break-all leading-tight">
                 {aiResult ? JSON.stringify(aiResult, null, 2) : 'No result data yet.'}
               </pre>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};
