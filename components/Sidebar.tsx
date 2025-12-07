import React from 'react';

export const Sidebar: React.FC = () => {
  return (
    <div className="
      absolute z-20 
      flex flex-col 
      bg-white/75 backdrop-blur-xl border border-white/50 shadow-2xl
      transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1)
      
      /* Mobile: Bottom Sheet Style */
      bottom-0 left-0 right-0 
      h-[40vh] w-full 
      rounded-t-[2rem]
      
      /* Desktop: Floating Sidebar Style */
      md:top-4 md:left-4 md:bottom-4 
      md:h-auto md:w-[380px] 
      md:rounded-3xl
    ">
      {/* Mobile Drag Handle Indicator */}
      <div className="w-full flex justify-center pt-3 pb-1 md:hidden opacity-50">
        <div className="w-12 h-1.5 bg-gray-400 rounded-full" />
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Minimal Maps</h1>
          <p className="text-gray-500 text-sm font-medium mt-1">Explore the world with zero clutter.</p>
        </header>

        {/* Skeleton UI for Step 1 Visualization */}
        <div className="space-y-4">
          {/* Location Card Skeleton */}
          <div className="p-4 bg-white/50 rounded-2xl border border-white/40 shadow-sm backdrop-blur-md">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100/80 flex items-center justify-center text-blue-600 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div className="flex-1">
                <div className="h-4 w-24 bg-gray-400/20 rounded mb-2"></div>
                <div className="h-3 w-full bg-gray-400/10 rounded"></div>
              </div>
            </div>
            <div className="mt-2 h-16 w-full bg-gray-400/10 rounded-xl"></div>
          </div>

          {/* List Skeleton */}
          <div className="p-4 bg-white/50 rounded-2xl border border-white/40 shadow-sm backdrop-blur-md">
             <div className="flex justify-between items-center mb-3">
               <div className="h-3 w-16 bg-gray-400/30 rounded"></div>
             </div>
             <div className="space-y-3">
               {[1, 2, 3].map((i) => (
                 <div key={i} className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-lg bg-gray-300/20"></div>
                   <div className="flex-1 space-y-1.5">
                     <div className="h-3 w-1/2 bg-gray-400/20 rounded"></div>
                     <div className="h-2 w-1/3 bg-gray-400/10 rounded"></div>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button / Search Area */}
      <div className="p-5 md:p-6 bg-gradient-to-t from-white/80 to-transparent">
        <button className="w-full py-3.5 bg-gray-900 hover:bg-black text-white rounded-xl font-semibold shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 group">
          <span>Search This Area</span>
          <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </button>
      </div>
    </div>
  );
};