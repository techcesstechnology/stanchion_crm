import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase"; // Assuming db is exported from your firebase config
import { doc, onSnapshot } from "firebase/firestore";

interface AuthContextType {
    user: (User & { role?: string; claims?: Record<string, unknown> }) | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Determine user role from Firestore 'userProfiles' collection
                const userRef = doc(db, "userProfiles", firebaseUser.uid);

                // Real-time listener for role changes
                const unsubscribeFirestore = onSnapshot(userRef, (docSnap) => {
                    const profileData = docSnap.data();
                    const role = profileData?.role || 'viewer';

                    // Extend user object with role and claims (keeping claims for backward compat if needed)
                    // Note: We are creating a new object reference to trigger re-renders
                    const extendedUser = Object.assign(Object.create(firebaseUser), firebaseUser) as User & { role?: string; claims?: Record<string, unknown> };

                    // We can still fetch claims if needed, but role is now data-driven
                    // firebaseUser.getIdTokenResult().then(token => extendedUser.claims = token.claims);

                    extendedUser.role = role;

                    // Manually define properties that might not copy over via Object.assign for Firebase User object
                    Object.defineProperty(extendedUser, 'uid', { value: firebaseUser.uid });
                    Object.defineProperty(extendedUser, 'email', { value: firebaseUser.email });
                    Object.defineProperty(extendedUser, 'displayName', { value: firebaseUser.displayName });
                    Object.defineProperty(extendedUser, 'photoURL', { value: firebaseUser.photoURL });

                    setUser(extendedUser);
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching user profile:", error);
                    setLoading(false);
                });

                return () => unsubscribeFirestore();
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
