
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
        ${isOpen ? 'opacity-100 scale-100 max-h-96' : 'opacity-0 scale-95 max-h-0 pointer-events-none'}
      `}>
        <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.2)] p-6 rounded-3xl w-72 mt-2">
          <header className="mb-6 border-b border-slate-400/20 pb-4">
            <h1 className="text-2xl font-light tracking-tight text-slate-800">
              Glass<span className="font-semibold text-slate-900">Map</span>
            </h1>
            <p className="text-slate-500 text-[10px] tracking-widest mt-1 uppercase font-medium">Visual Engine</p>
          </header>

          <div className="space-y-4">
            <div className="p-4 bg-white/40 rounded-2xl border border-white/50 shadow-sm">
              <p className="text-xs text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-800">Usage:</span><br/>
                Use the <span className="text-violet-600 font-bold">Vision</span> mode to find objects or <span className="text-blue-600 font-bold">Places</span> for navigation.
              </p>
            </div>
            
            <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-white/30 p-2 rounded-xl border border-white/40">
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
