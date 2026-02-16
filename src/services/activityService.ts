import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    getDocs,
    deleteDoc,
    doc,
    Timestamp,
    serverTimestamp,
    limit,
    startAfter,
    QueryDocumentSnapshot
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Activity, CreateActivityDTO } from '@/types/activity';

const COLLECTION_NAME = 'activities';

export const ActivityService = {
    /**
     * Get recent activities globally
     */
    getRecentActivities: async (maxItems: number = 10): Promise<Activity[]> => {
        if (!import.meta.env.VITE_FIREBASE_API_KEY) {
            return [
                {
                    id: 'act-1',
                    type: 'contact_created',
                    description: 'New contact John Doe was added',
                    eventDate: Timestamp.now(),
                    createdBy: { uid: 'mock', name: 'Local Admin' }
                } as any
            ];
        }
        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                orderBy('eventDate', 'desc'),
                limit(maxItems)
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Activity));
        } catch (error) {
            console.error('Error fetching recent activities:', error);
            return [];
        }
    },

    /**
     * Get activities for a specific contact or lead
     */
    getActivities: async (
        targetId: string,
        targetType: 'contact' | 'lead',
        lastDoc?: QueryDocumentSnapshot,
        pageSize: number = 20
    ): Promise<{ activities: Activity[], lastDoc: QueryDocumentSnapshot | undefined }> => {
        try {
            const field = targetType === 'contact' ? 'contactId' : 'leadId';

            let q = query(
                collection(db, COLLECTION_NAME),
                where(field, '==', targetId),
                orderBy('eventDate', 'desc'),
                limit(pageSize)
            );

            if (lastDoc) {
                q = query(q, startAfter(lastDoc));
            }

            const snapshot = await getDocs(q);

            const activities = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Activity));

            return {
                activities,
                lastDoc: snapshot.docs[snapshot.docs.length - 1]
            };
        } catch (error) {
            console.error('Error fetching activities:', error);
            throw error;
        }
    },

    /**
     * Add a new activity
     */
    addActivity: async (data: CreateActivityDTO): Promise<Activity> => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User must be authenticated');

            const activityData = {
                ...data,
                eventDate: Timestamp.fromDate(data.eventDate),
                createdAt: serverTimestamp(),
                createdBy: {
                    uid: user.uid,
                    name: user.displayName || user.email || 'Unknown User'
                }
            };

            const docRef = await addDoc(collection(db, COLLECTION_NAME), activityData);

            // Return constructed object (serverTimestamp will be null locally until refetch, but acceptable for UI)
            return {
                id: docRef.id,
                ...activityData,
                createdAt: Timestamp.now()
            } as Activity;
        } catch (error) {
            console.error('Error adding activity:', error);
            throw error;
        }
    },

    /**
     * Delete an activity
     */
    deleteActivity: async (activityId: string): Promise<void> => {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, activityId));
        } catch (error) {
            console.error('Error deleting activity:', error);
            throw error;
        }
    }
};
