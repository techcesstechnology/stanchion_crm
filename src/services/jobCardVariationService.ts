import {
    collection,
    updateDoc,
    doc,
    query,
    where,
    getDocs,
    orderBy,
    serverTimestamp,
    runTransaction,
    getDoc
} from "firebase/firestore";
import { JobCardVariation } from "@/types/jobCardVariation";
import { UserProfile, RequestStatus } from "@/types";
import { db } from "@/lib/firebase";

const COLLECTION_NAME = "jobCardVariations";

export const JobCardVariationService = {
    // Create a new variation
    addVariation: async (data: Partial<JobCardVariation>, profile: UserProfile): Promise<string> => {
        return await runTransaction(db, async (transaction) => {
            // 1. Get current variations to determine variation number
            const q = query(
                collection(db, COLLECTION_NAME),
                where("jobCardId", "==", data.jobCardId),
                orderBy("variationNumber", "desc")
            );
            const snapshot = await getDocs(q);
            let nextVariationNumber = 1;
            if (!snapshot.empty) {
                nextVariationNumber = snapshot.docs[0].data().variationNumber + 1;
            }

            // 2. Create the variation document
            const variationRef = doc(collection(db, COLLECTION_NAME));
            transaction.set(variationRef, {
                ...data,
                variationNumber: nextVariationNumber,
                status: 'SUBMITTED',
                workflow: {
                    stage: 'ACCOUNTANT',
                    currentApproverRole: 'ACCOUNTANT'
                },
                submittedBy: {
                    uid: profile.uid,
                    name: profile.displayName || "Anonymous"
                },
                approvalTrail: [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            return variationRef.id;
        });
    },

    // Get variations for a job card
    getVariationsForJobCard: async (jobCardId: string): Promise<JobCardVariation[]> => {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("jobCardId", "==", jobCardId),
            orderBy("variationNumber", "asc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobCardVariation));
    },

    // Get pending variations based on role
    getPendingVariations: async (role: string): Promise<JobCardVariation[]> => {
        const targetStatus = role === 'ACCOUNTANT' ? 'SUBMITTED' : (role === 'MANAGER' ? 'APPROVED_BY_ACCOUNTANT' : null);
        if (!targetStatus && role !== 'ADMIN') return [];

        const q = role === 'ADMIN'
            ? query(collection(db, COLLECTION_NAME), where("status", "in", ['SUBMITTED', 'APPROVED_BY_ACCOUNTANT']))
            : query(collection(db, COLLECTION_NAME), where("status", "==", targetStatus));

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobCardVariation));
    },

    // Get pending variations count based on role
    getPendingVariationsCount: async (role: string): Promise<number> => {
        const targetStatus = role === 'ACCOUNTANT' ? 'SUBMITTED' : (role === 'MANAGER' ? 'APPROVED_BY_ACCOUNTANT' : null);
        if (!targetStatus && role !== 'ADMIN') return 0;

        const q = role === 'ADMIN'
            ? query(collection(db, COLLECTION_NAME), where("status", "in", ['SUBMITTED', 'APPROVED_BY_ACCOUNTANT']))
            : query(collection(db, COLLECTION_NAME), where("status", "==", targetStatus));

        const snapshot = await getDocs(q);
        return snapshot.size;
    },

    // Submit for approval
    submitVariation: async (id: string, reason: string): Promise<void> => {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, {
            status: 'SUBMITTED',
            reason,
            updatedAt: serverTimestamp()
        });
    },

    // Approve/Reject flow
    updateStatus: async (id: string, newStatus: RequestStatus, stage: 'ACCOUNTANT' | 'MANAGER', user: UserProfile, note?: string): Promise<void> => {
        const docRef = doc(db, COLLECTION_NAME, id);
        const action = (newStatus as string).includes('REJECTED') ? 'REJECT' : 'APPROVE';

        await updateDoc(docRef, {
            status: newStatus,
            "workflow.stage": newStatus === 'APPROVED_FINAL' ? 'DONE' : ((newStatus as string).includes('REJECTED') ? 'REJECTED' : 'MANAGER'),
            "workflow.currentApproverRole": (newStatus === 'APPROVED_FINAL' || (newStatus as string).includes('REJECTED')) ? 'NONE' : 'MANAGER',
            approvalTrail: [
                ...(await getDoc(docRef)).data()?.approvalTrail || [],
                {
                    stage,
                    action,
                    byUid: user.uid,
                    byName: user.displayName || "Approver",
                    at: new Date(),
                    note: note || ""
                }
            ],
            updatedAt: serverTimestamp()
        });
    }
};
