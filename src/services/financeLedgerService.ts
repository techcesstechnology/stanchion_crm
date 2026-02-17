import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    getDocs,
    doc,
    serverTimestamp,
    query,
    orderBy,
    limit
} from "firebase/firestore";
import { FinanceAccount, FinanceTransaction, CreateFinanceTransactionDTO } from "@/types/financeLedger";
import { UserProfile } from "@/types";
import { WorkflowService } from "./workflowService";

const ACCOUNTS_COLLECTION = "financeAccounts";
const TRANSACTIONS_COLLECTION = "financeTransactions";

export const FinanceLedgerService = {
    // Get all accounts
    getAccounts: async (): Promise<FinanceAccount[]> => {
        const snapshot = await getDocs(collection(db, ACCOUNTS_COLLECTION));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinanceAccount));
    },

    // Create a transaction in DRAFT
    createTransactionDraft: async (data: CreateFinanceTransactionDTO, profile: UserProfile): Promise<string> => {
        const txRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), {
            ...data,
            status: 'DRAFT',
            date: serverTimestamp(),
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

        return txRef.id;
    },

    // Submit for approval
    submitTransaction: async (txId: string, profile: UserProfile) => {
        const txRef = doc(db, TRANSACTIONS_COLLECTION, txId);
        await WorkflowService.submitRequest(txRef, profile);
    },

    // Read Transactions
    getRecentTransactions: async (l: number = 20): Promise<FinanceTransaction[]> => {
        const q = query(collection(db, TRANSACTIONS_COLLECTION), orderBy("date", "desc"), limit(l));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinanceTransaction));
    }
};
