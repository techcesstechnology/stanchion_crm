import { db, auth } from "@/lib/firebase";
import { JobCard, CreateJobCardDTO } from "@/types/jobCard";
import { CatalogService } from "./catalogService";
import { FinanceService } from "./financeService";
import {
    FieldValue,
    getDoc,
    collection,
    addDoc,
    getDocs,
    updateDoc,
    doc,
    serverTimestamp,
    query,
    orderBy
} from "firebase/firestore";

const COLLECTION_NAME = "jobCards";

// Mock data for local-only mode
const MOCK_JOB_CARDS: JobCard[] = [
    {
        id: "job-1",
        projectName: "Warehouse Renovation",
        description: "Standard renovation including painting and electrical work.",
        clientName: "Global Logistics Ltd",
        clientId: "client-1",
        materials: [
            { id: "mat-1", name: "Paint (White)", quantity: 10, unitCost: 25, totalCost: 250 },
            { id: "mat-2", name: "Copper Wire", quantity: 50, unitCost: 2, totalCost: 100 }
        ],
        totalCost: 350,
        status: "approved",
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(Date.now() - 86400000),
        createdBy: { uid: "mock", name: "Local Admin" }
    }
];

export const JobCardService = {
    // Create
    addJobCard: async (data: CreateJobCardDTO): Promise<string> => {
        const totalCost = data.materials.reduce((acc, current) => acc + current.totalCost, 0);

        if (!import.meta.env.VITE_FIREBASE_API_KEY) {
            console.log("Mock: Adding Job Card", { ...data, totalCost });
            return "mock-id-" + Math.random().toString(36).substr(2, 9);
        }

        const user = auth.currentUser;
        if (!user) throw new Error("User must be authenticated");

        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...data,
            totalCost,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: {
                uid: user.uid,
                name: user.displayName || user.email || "Unknown"
            }
        });
        return docRef.id;
    },

    // Read Specific
    getJobCardById: async (id: string): Promise<JobCard | null> => {
        if (!import.meta.env.VITE_FIREBASE_API_KEY) {
            return MOCK_JOB_CARDS.find(c => c.id === id) || null;
        }

        const docRef = doc(db, COLLECTION_NAME, id);
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) return null;
        return { id: snapshot.id, ...snapshot.data() } as JobCard;
    },

    // Read All
    getJobCards: async (): Promise<JobCard[]> => {
        if (!import.meta.env.VITE_FIREBASE_API_KEY) {
            return MOCK_JOB_CARDS;
        }

        const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(snapDoc => ({
            id: snapDoc.id,
            ...snapDoc.data()
        } as JobCard));
    },

    // Update Status (for Approvals/Completion)
    updateJobCardStatus: async (id: string, status: JobCard['status']) => {
        if (!import.meta.env.VITE_FIREBASE_API_KEY) {
            console.log(`Mock: Updating Job Card ${id} status to ${status}`);
            return;
        }

        const docRef = doc(db, COLLECTION_NAME, id);
        const updateData: Record<string, string | Date | FieldValue> = {
            status,
            updatedAt: serverTimestamp() as unknown as Date
        };

        if (status === 'approved') {
            updateData.approvedAt = serverTimestamp();
            updateData.approvedBy = auth.currentUser?.displayName || auth.currentUser?.email || "Unknown";

            // Deduct stock and record pending financial transaction
            const jobCard = await JobCardService.getJobCardById(id);
            if (jobCard) {
                // 1. Stock Deduction
                if (jobCard.materials) {
                    for (const material of jobCard.materials) {
                        await CatalogService.deductStock(material.id, material.quantity);
                    }
                }

                // 2. Financial Transaction (Pending Approval)
                const accounts = await FinanceService.getAccounts();
                const defaultAccount = accounts.find(a => a.type === 'cash') || accounts[0];

                if (defaultAccount) {
                    await FinanceService.addTransaction({
                        accountId: defaultAccount.id,
                        amount: jobCard.totalCost,
                        type: 'expense',
                        category: 'Project Materials',
                        description: `Job Card Approval: ${jobCard.projectName}`,
                        referenceId: id
                    });
                }
            }
        }

        await updateDoc(docRef, updateData);
    }
};
