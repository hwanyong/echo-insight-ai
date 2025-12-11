import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Configuration provided by user
const firebaseConfig = {
  apiKey: "AIzaSyAF37m9EPDEYlSt3_qUE0GrH2wAU8Y_AUQ",
  authDomain: "echo-insight-ai-server.firebaseapp.com",
  projectId: "echo-insight-ai-server",
  storageBucket: "echo-insight-ai-server.firebasestorage.app",
  messagingSenderId: "478238822786",
  appId: "1:478238822786:web:e3c73d25039ce50e6abf9b",
  measurementId: "G-K1Z8TGG6GC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const db = getFirestore(app);
const functions = getFunctions(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

// Export instances
export { db, functions, auth, analytics };
