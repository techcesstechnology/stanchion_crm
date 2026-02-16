import { db } from "@/lib/firebase";
import { Contact } from "@/types";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore";

const COLLECTION_NAME = "contacts";

export const ContactService = {
    // Create
    addContact: async (contact: Omit<Contact, "id" | "createdAt">) => {
        return await addDoc(collection(db, COLLECTION_NAME), {
            ...contact,
            createdAt: serverTimestamp(),
        });
    },

    // Read
    getContacts: async (): Promise<Contact[]> => {
        const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Contact));
    },

    // Update
    updateContact: async (id: string, updates: Partial<Contact>) => {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, updates);
    },

    // Delete
    deleteContact: async (id: string) => {
        const docRef = doc(db, COLLECTION_NAME, id);
        await deleteDoc(docRef);
    }
};
