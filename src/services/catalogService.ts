import { db } from "@/lib/firebase";
import { CatalogItem } from "@/types";
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    query,
    orderBy
} from "firebase/firestore";

const CATALOG_COLLECTION = "catalogItems";

export const CatalogService = {
    // Get all items ordered by name
    getItems: async (): Promise<CatalogItem[]> => {
        const q = query(collection(db, CATALOG_COLLECTION), orderBy("name", "asc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as CatalogItem));
    },

    // Add a new item
    addItem: async (item: Omit<CatalogItem, "id" | "createdAt" | "updatedAt">) => {
        return await addDoc(collection(db, CATALOG_COLLECTION), {
            ...item,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    },

    // Update an existing item
    updateItem: async (id: string, updates: Partial<CatalogItem>) => {
        const docRef = doc(db, CATALOG_COLLECTION, id);
        return await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
    },

    // Delete an item
    deleteItem: async (id: string) => {
        return await deleteDoc(doc(db, CATALOG_COLLECTION, id));
    },

    // Search is handled client-side for now as Firestore full-text search requires external services
    // or complex indexing. We'll filter the results from getItems().
};
