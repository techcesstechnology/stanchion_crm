import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { UserProfile, UserRole } from "@/types";

interface AuthContextType {
    user: User | null; // Alias for firebaseUser for backward compatibility
    firebaseUser: User | null;
    profile: UserProfile | null;
    role: UserRole | null;
    loading: boolean;
    hasRole: (requiredRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    firebaseUser: null,
    profile: null,
    role: null,
    loading: true,
    hasRole: () => false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeFirestore: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setFirebaseUser(user);

                // Real-time listener for profile changes
                const userRef = doc(db, "userProfiles", user.uid);
                unsubscribeFirestore = onSnapshot(userRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setProfile(docSnap.data() as UserProfile);
                    } else {
                        console.warn(`No profile found for user ${user.uid}`);
                        setProfile(null);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching user profile:", error);
                    setLoading(false);
                });
            } else {
                setFirebaseUser(null);
                setProfile(null);
                if (unsubscribeFirestore) {
                    unsubscribeFirestore();
                    unsubscribeFirestore = null;
                }
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeFirestore) unsubscribeFirestore();
        };
    }, []);

    const role = profile?.role || null;

    const hasRole = (requiredRoles: UserRole[]) => {
        if (!role) return false;
        return requiredRoles.includes(role);
    };

    const value = {
        user: firebaseUser,
        firebaseUser,
        profile,
        role,
        loading,
        hasRole
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

/**
 * Utility to require a specific role in functions or logic.
 * Throws an error if the role is not present.
 */
export const requireRole = (profile: UserProfile | null, requiredRoles: UserRole[]) => {
    if (!profile || !profile.role || !requiredRoles.includes(profile.role)) {
        throw new Error(`Permission Denied: Required one of ${requiredRoles.join(', ')}`);
    }
    return true;
};
