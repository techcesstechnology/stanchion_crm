import { db } from "@/lib/firebase";
import { Lead } from "@/types";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore";

const COLLECTION_NAME = "leads";

export const LeadService = {
    // Create
    addLead: async (lead: Omit<Lead, "id" | "createdAt">) => {
        return await addDoc(collection(db, COLLECTION_NAME), {
            ...lead,
            createdAt: serverTimestamp(),
        });
    },

    // Read
    getLeads: async (): Promise<Lead[]> => {
        const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Lead));
    },

    // Update
    updateLead: async (id: string, updates: Partial<Lead>) => {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, updates);
    },

    // Delete
    deleteLead: async (id: string) => {
        const docRef = doc(db, COLLECTION_NAME, id);
        await deleteDoc(docRef);
    }
};
