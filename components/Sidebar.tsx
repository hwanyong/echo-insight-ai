import React, { useState } from 'react';

interface SidebarProps {
  isHidden?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isHidden = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  // If globally hidden (e.g. Street View active), hide everything
  if (isHidden) return null;

  return (
    <div className="absolute top-4 left-4 z-40 flex flex-col items-start gap-2">
      {/* Menu Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center justify-center w-10 h-10 bg-black/80 backdrop-blur-md text-white rounded-full shadow-lg border border-white/20 hover:scale-105 transition-all duration-300"
        aria-label="Toggle Menu"
      >
        <div className="flex flex-col gap-1.5 items-center justify-center w-5 h-5">
            <span className={`block w-5 h-0.5 bg-white rounded-full transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-0.5 bg-white rounded-full transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-white rounded-full transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </div>
      </button>

      {/* Expanded Menu Card */}
      <div className={`
        origin-top-left transition-all duration-300 ease-out overflow-hidden
        ${isOpen ? 'opacity-100 scale-100 max-h-96' : 'opacity-0 scale-95 max-h-0 pointer-events-none'}
      `}>
        <div className="bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl p-5 rounded-2xl w-64 mt-2">
          <header className="mb-4 border-b border-slate-200/60 pb-3">
            <h1 className="text-2xl font-light tracking-tight text-slate-900">
              Glass<span className="font-semibold text-slate-900">Map</span>
            </h1>
            <p className="text-slate-500 text-[10px] tracking-widest mt-0.5 uppercase">Minimal Explorer</p>
          </header>

          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-800">Usage:</span><br/>
                Use the buttons on the right to select an area or toggle Street View coverage.
              </p>
            </div>
            
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                System Active
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};