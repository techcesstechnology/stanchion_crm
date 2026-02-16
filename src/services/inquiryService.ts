import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, updateDoc, doc, serverTimestamp, query, orderBy, Timestamp } from "firebase/firestore";

const COLLECTION_NAME = "inquiries";

export interface Inquiry {
    id: string;
    phoneNumber: string;
    note: string;
    status: 'pending' | 'received';
    acknowledgedBy?: string;
    acknowledgedAt?: Date | Timestamp;
    createdAt: Date | Timestamp;
}

export const InquiryService = {
    // Create
    addInquiry: async (inquiry: Omit<Inquiry, "id" | "createdAt" | "status">) => {
        return await addDoc(collection(db, COLLECTION_NAME), {
            ...inquiry,
            status: 'pending',
            createdAt: serverTimestamp(),
        });
    },

    // Read
    getInquiries: async (): Promise<Inquiry[]> => {
        const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Inquiry));
    },

    // Acknowledge
    acknowledgeInquiry: async (id: string, userName: string) => {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, {
            status: 'received',
            acknowledgedBy: userName,
            acknowledgedAt: serverTimestamp()
        });
    }
};
