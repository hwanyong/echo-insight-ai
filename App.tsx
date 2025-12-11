import React from 'react';
import { GoogleMap } from './components/GoogleMap';
import { GOOGLE_MAPS_API_KEY } from './config';

const App: React.FC = () => {
  // SECURITY NOTE: 
  // The API key is managed in config.ts.
  
  const envKey = process.env.GOOGLE_MAPS_API_KEY;
  
  // Priority: 
  // 1. LocalStorage (Manual User Override for debugging)
  // 2. config.ts (Project configuration)
  // 3. process.env (CI/CD environment variables)
  const apiKey = localStorage.getItem('google_maps_api_key') || GOOGLE_MAPS_API_KEY || (envKey && envKey !== 'undefined' ? envKey : '');

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-gray-50">
      {/* Map Layer - Full Screen */}
      <div className="absolute inset-0 z-0">
        <GoogleMap apiKey={apiKey} />
      </div>
    </main>
  );
};

export default App;