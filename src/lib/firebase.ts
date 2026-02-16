import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
    apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || "",
    authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || "",
    projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || "",
    storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || "",
    messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || "",
    appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || ""
};

// Initialize Firebase only if API key is present
const hasConfig = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "your_api_key_here";

export const app = hasConfig ? initializeApp(firebaseConfig) : null;
export const auth = hasConfig ? getAuth(app!) : ({} as any);
export const db = hasConfig ? getFirestore(app!) : ({} as any);
export const storage = hasConfig ? getStorage(app!) : ({} as any);
export const functions = hasConfig ? getFunctions(app!) : ({} as any);
