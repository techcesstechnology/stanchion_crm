import { db } from "@/lib/firebase";
import { JobCard, CreateJobCardDTO } from "@/types/jobCard";
import { UserProfile } from "@/types";
import { WorkflowService } from "./workflowService";
import {
    getDoc,
    collection,
    addDoc,
    getDocs,
    doc,
    serverTimestamp,
    query,
    orderBy
} from "firebase/firestore";

const COLLECTION_NAME = "jobCards";

export const JobCardService = {
    // Create
    addJobCard: async (data: CreateJobCardDTO, profile: UserProfile): Promise<string> => {
        const totalCost = data.materials.reduce((acc, current) => acc + current.totalCost, 0);

        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...data,
            totalCost,
            status: 'DRAFT',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            workflow: {
                stage: 'ACCOUNTANT',
                submittedAt: null,
                currentApproverRole: 'NONE'
            },
            submittedBy: {
                uid: profile.uid,
                name: profile.displayName
            },
            approvalTrail: []
        });
        return docRef.id;
    },

    // Submit for approval
    submitJobCard: async (id: string, profile: UserProfile) => {
        const docRef = doc(db, COLLECTION_NAME, id);
        await WorkflowService.submitRequest(docRef, profile);
    },

    // Read Specific
    getJobCardById: async (id: string): Promise<JobCard | null> => {
        const docRef = doc(db, COLLECTION_NAME, id);
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) return null;
        return { id: snapshot.id, ...snapshot.data() } as JobCard;
    },

    // Read All
    getJobCards: async (): Promise<JobCard[]> => {
        const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(snapDoc => ({
            id: snapDoc.id,
            ...snapDoc.data()
        } as JobCard));
    },

    // Approval Flow
    approveAsAccountant: async (id: string, profile: UserProfile, note?: string) => {
        const docRef = doc(db, COLLECTION_NAME, id);
        await WorkflowService.approveAsAccountant(docRef, profile, note);
    },

    rejectAsAccountant: async (id: string, profile: UserProfile, note: string) => {
        const docRef = doc(db, COLLECTION_NAME, id);
        await WorkflowService.rejectAsAccountant(docRef, profile, note);
    },

    approveAsManager: async (id: string, profile: UserProfile, note?: string) => {
        const docRef = doc(db, COLLECTION_NAME, id);
        await WorkflowService.approveAsManager(docRef, profile, note);
    },

    rejectAsManager: async (id: string, profile: UserProfile, note: string) => {
        const docRef = doc(db, COLLECTION_NAME, id);
        await WorkflowService.rejectAsManager(docRef, profile, note);
    }
};
