import { db, storage } from "@/lib/firebase";
import { UserProfile } from "@/types";
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, orderBy } from "firebase/firestore";
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

    getAllUsers: async (): Promise<UserProfile[]> => {
        const usersRef = collection(db, USERS_COLLECTION);
        const q = query(usersRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
        })) as UserProfile[];
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
