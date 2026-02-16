import { db, storage } from "@/lib/firebase";
import { UserProfile } from "@/types";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const USERS_COLLECTION = "userProfiles";

export const UserService = {
    getUserProfile: async (uid: string): Promise<UserProfile | null> => {
        const docRef = doc(db, USERS_COLLECTION, uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return {
                uid: docSnap.id,
                ...docSnap.data()
            } as UserProfile;
        }
        return null;
    },

    updateUserProfile: async (uid: string, data: Partial<UserProfile>) => {
        const docRef = doc(db, USERS_COLLECTION, uid);
        await setDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    },

    uploadSignature: async (uid: string, file: Blob): Promise<string> => {
        const storageRef = ref(storage, `signatures/${uid}/${Date.now()}.png`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    }
};
