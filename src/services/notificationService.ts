import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    updateDoc,
    doc,
    serverTimestamp,
    arrayUnion,
    Timestamp as FirestoreTimestamp,
    limit
} from "firebase/firestore";

const COLLECTION_NAME = "notifications";

export interface SystemNotification {
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning';
    link?: string;
    createdAt: FirestoreTimestamp;
    readBy: string[]; // Array of user UIDs
}

export const NotificationService = {
    // Add notification
    addNotification: async (notification: Omit<SystemNotification, "id" | "createdAt" | "readBy">) => {
        return await addDoc(collection(db, COLLECTION_NAME), {
            ...notification,
            readBy: [],
            createdAt: serverTimestamp(),
        });
    },

    // Get notifications (Real-time)
    subscribeToNotifications: (callback: (notifications: SystemNotification[]) => void, maxItems: number = 20) => {
        const q = query(
            collection(db, COLLECTION_NAME),
            orderBy("createdAt", "desc"),
            limit(maxItems)
        );

        return onSnapshot(q, (snapshot) => {
            const notifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as SystemNotification));
            callback(notifications);
        });
    },

    // Mark as read
    markAsRead: async (notificationId: string, userId: string) => {
        const docRef = doc(db, COLLECTION_NAME, notificationId);
        await updateDoc(docRef, {
            readBy: arrayUnion(userId)
        });
    }
};
