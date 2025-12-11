import React, { useEffect, useState } from 'react';
import { GoogleMap } from './components/GoogleMap';
import { GOOGLE_MAPS_API_KEY } from './config';
// Initialize Firebase
import { app, analytics, auth, signInAnonymously, onAuthStateChanged } from './firebase';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser: any) => {
      if (currentUser) {
        // User is signed in
        setUser(currentUser);
        setAuthError(null);
      } else {
        // User is signed out; sign in anonymously
        signInAnonymously(auth).catch((error: any) => {
          console.error("Anonymous auth failed", error);
          setAuthError(error.message || "Auth Failed");
        });
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // SECURITY NOTE: 
  // The API key is managed in config.ts.
  
  const envKey = process.env.GOOGLE_MAPS_API_KEY;
  // Support for IDX/GenAI environment variable as fallback
  const genAIKey = process.env.API_KEY;
  
  // Priority: 
  // 1. LocalStorage (Manual User Override for debugging)
  // 2. config.ts (Project configuration)
  // 3. process.env.GOOGLE_MAPS_API_KEY (Specific Env)
  // 4. process.env.API_KEY (General Env from screenshot context)
  const apiKey = localStorage.getItem('google_maps_api_key') || 
                 GOOGLE_MAPS_API_KEY || 
                 (envKey && envKey !== 'undefined' ? envKey : '') ||
                 (genAIKey && genAIKey !== 'undefined' ? genAIKey : '');
  
  console.log("App initialized with User:", user?.uid, "Auth Error:", authError);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-gray-50">
      {/* Map Layer - Full Screen */}
      <div className="absolute inset-0 z-0">
        <GoogleMap apiKey={apiKey} user={user} authError={authError} />
      </div>
    </main>
  );
};

export default App;