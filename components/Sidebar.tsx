
import React, { useState } from 'react';

interface SidebarProps {
  isHidden?: boolean;
  user?: any;
  authError?: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ isHidden = false, user, authError }) => {
  const [isOpen, setIsOpen] = useState(false);

  // If globally hidden (e.g. Street View active), hide everything
  if (isHidden) return null;

  return (
    <div className="absolute top-4 left-4 z-40 flex flex-col items-start gap-2">
      {/* Menu Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center justify-center w-12 h-12 bg-white/40 backdrop-blur-xl text-slate-700 rounded-full shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] border border-white/50 hover:bg-white/60 hover:scale-105 transition-all duration-300"
        aria-label="Toggle Menu"
      >
        <div className="flex flex-col gap-1.5 items-center justify-center w-5 h-5">
            <span className={`block w-5 h-0.5 bg-slate-700 rounded-full transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-0.5 bg-slate-700 rounded-full transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-slate-700 rounded-full transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </div>
      </button>

      {/* Expanded Menu Card */}
      <div className={`
        origin-top-left transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) overflow-hidden
        ${isOpen ? 'opacity-100 scale-100 max-h-[80vh]' : 'opacity-0 scale-95 max-h-0 pointer-events-none'}
      `}>
        <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.2)] p-6 rounded-3xl w-80 mt-2 flex flex-col gap-4">
          <header className="border-b border-slate-400/20 pb-4">
            <h1 className="text-2xl font-light tracking-tight text-slate-800">
              Glass<span className="font-semibold text-slate-900">Map</span>
            </h1>
            <p className="text-slate-500 text-[10px] tracking-widest mt-1 uppercase font-medium">Visual Engine</p>
          </header>

          <div className="space-y-4 overflow-y-auto custom-scrollbar pr-1" style={{ maxHeight: '60vh' }}>
            
            {/* 1. Introduction */}
            <div className="p-4 bg-white/40 rounded-2xl border border-white/50 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-wide">About Engine</h3>
              <p className="text-[11px] text-slate-600 leading-relaxed text-justify">
                GlassMap is an AI-powered geospatial analysis tool. It combines <span className="font-semibold text-slate-800">Google Street View</span> with <span className="font-semibold text-violet-600">Gemini Vision AI</span> to scan urban environments, detecting objects and analyzing visual data in real-time.
              </p>
            </div>

            {/* 2. Detailed Usage */}
            <div className="p-4 bg-white/40 rounded-2xl border border-white/50 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wide">How to Use</h3>
              <ul className="space-y-3">
                <li className="flex gap-3 text-[11px] text-slate-600 leading-tight">
                    <span className="shrink-0 w-5 h-5 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full font-bold text-[9px] shadow-sm">1</span>
                    <span>
                        <span className="font-bold text-blue-600">Places Mode:</span> Search for cities or specific addresses to navigate the map quickly.
                    </span>
                </li>
                <li className="flex gap-3 text-[11px] text-slate-600 leading-tight">
                    <span className="shrink-0 w-5 h-5 flex items-center justify-center bg-violet-100 text-violet-600 rounded-full font-bold text-[9px] shadow-sm">2</span>
                    <span>
                        <span className="font-bold text-violet-600">Vision Mode:</span> Toggle the area tool <span className="inline-block w-3 h-3 border border-slate-400 border-dashed rounded-sm mx-0.5"></span> to draw search regions on the map.
                    </span>
                </li>
                <li className="flex gap-3 text-[11px] text-slate-600 leading-tight">
                    <span className="shrink-0 w-5 h-5 flex items-center justify-center bg-violet-100 text-violet-600 rounded-full font-bold text-[9px] shadow-sm">3</span>
                    <span>
                        <span className="font-bold text-slate-700">Context:</span> Type a description (e.g., "Red Hydrant") or <span className="font-semibold">Paste (Ctrl+V)</span> / Upload a reference image.
                    </span>
                </li>
                 <li className="flex gap-3 text-[11px] text-slate-600 leading-tight">
                    <span className="shrink-0 w-5 h-5 flex items-center justify-center bg-emerald-100 text-emerald-600 rounded-full font-bold text-[9px] shadow-sm">4</span>
                    <span>
                        <span className="font-bold text-slate-700">Analyze:</span> Click the lightning button. Hover over the purple dots <span className="inline-block w-2 h-2 rounded-full bg-violet-500 mx-0.5"></span> to view AI detection results.
                    </span>
                </li>
              </ul>
            </div>
            
            {/* User Status */}
            <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-white/30 p-2 rounded-xl border border-white/40 mt-2">
                <div className={`w-2 h-2 rounded-full ${user ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : (authError ? 'bg-red-500' : 'bg-amber-500')} animate-pulse`}></div>
                {user 
                  ? `User: ${user.uid.slice(0, 6)}...` 
                  : (authError ? `Offline (${authError.includes('key') ? 'Key Expired' : 'Auth Failed'})` : 'Connecting...')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
