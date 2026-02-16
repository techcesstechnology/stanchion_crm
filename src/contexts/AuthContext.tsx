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
        let isMounted = true;

        const initializeMock = () => {
            if (!isMounted) return;
            console.log("Running in local-only mock mode");
            const mockUser = {
                uid: "mock-user-id",
                email: "admin@incaptta.com",
                displayName: "Local Admin",
                photoURL: null,
                role: "superUser",
                emailVerified: true,
                isAnonymous: false,
                metadata: {},
                providerData: [],
                refreshToken: "",
                tenantId: null,
                delete: async () => { },
                getIdToken: async () => "mock-token",
                getIdTokenResult: async () => ({ token: "mock-token", expirationTime: "", authTime: "", issuedAtTime: "", signInProvider: null, claims: { role: 'superUser' } } as any),
                reload: async () => { },
                toJSON: () => ({}),
                phoneNumber: null,
            };
            setUser(mockUser as unknown as User & { role?: string });
            setLoading(false);
        };

        // Local-only mock mode: If no API key is provided, use a mock admin user
        if (!import.meta.env.VITE_FIREBASE_API_KEY) {
            initializeMock();
            return () => { isMounted = false; };
        }

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Determine user role from Firestore 'userProfiles' collection
                const userRef = doc(db, "userProfiles", firebaseUser.uid);

                // Real-time listener for role changes
                const unsubscribeFirestore = onSnapshot(userRef, (docSnap) => {
                    if (!isMounted) return;
                    const profileData = docSnap.data();
                    const role = profileData?.role || 'viewer';

                    // Extend user object with role and claims (keeping claims for backward compat if needed)
                    const extendedUser = Object.assign(Object.create(firebaseUser), firebaseUser) as User & { role?: string; claims?: Record<string, unknown> };
                    extendedUser.role = role;

                    // Manually define properties
                    Object.defineProperty(extendedUser, 'uid', { value: firebaseUser.uid });
                    Object.defineProperty(extendedUser, 'email', { value: firebaseUser.email });
                    Object.defineProperty(extendedUser, 'displayName', { value: firebaseUser.displayName });
                    Object.defineProperty(extendedUser, 'photoURL', { value: firebaseUser.photoURL });

                    setUser(extendedUser);
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching user profile:", error);
                    if (isMounted) setLoading(false);
                });

                return () => unsubscribeFirestore();
            } else {
                if (isMounted) {
                    setUser(null);
                    setLoading(false);
                }
            }
        });

        return () => {
            isMounted = false;
            unsubscribeAuth();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
