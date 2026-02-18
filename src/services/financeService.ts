import { db } from "@/lib/firebase";
import {
    AccountBalance,
    Transaction,
    CreateTransactionDTO
} from "@/types/finance";
import { UserProfile } from "@/types";
import { WorkflowService } from "./workflowService";
import {
    collection,
    addDoc,
    getDocs,
    doc,
    serverTimestamp,
    query,
    orderBy,
    limit,
    onSnapshot
} from "firebase/firestore";

const ACCOUNTS_COLLECTION = "accounts";
const TRANSACTIONS_COLLECTION = "transactions";

export const FinanceService = {
    // Get all accounts
    getAccounts: async (): Promise<AccountBalance[]> => {
        const snapshot = await getDocs(collection(db, ACCOUNTS_COLLECTION));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccountBalance));
    },

    // Record a transaction
    addTransaction: async (data: CreateTransactionDTO, profile: UserProfile): Promise<string> => {
        // 1. Create transaction record in DRAFT status
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

    // Approval Flow
    approveAsAccountant: async (txId: string, profile: UserProfile, note?: string) => {
        const txRef = doc(db, TRANSACTIONS_COLLECTION, txId);
        await WorkflowService.approveAsAccountant(txRef, profile, note);
    },

    rejectAsAccountant: async (txId: string, profile: UserProfile, note: string) => {
        const txRef = doc(db, TRANSACTIONS_COLLECTION, txId);
        await WorkflowService.rejectAsAccountant(txRef, profile, note);
    },

    approveAsManager: async (txId: string, profile: UserProfile, note?: string) => {
        const txRef = doc(db, TRANSACTIONS_COLLECTION, txId);
        await WorkflowService.approveAsManager(txRef, profile, note);
    },

    rejectAsManager: async (txId: string, profile: UserProfile, note: string) => {
        const txRef = doc(db, TRANSACTIONS_COLLECTION, txId);
        await WorkflowService.rejectAsManager(txRef, profile, note);
    },

    // Transfer funds between accounts
    transferFunds: async (fromAccountId: string, toAccountId: string, amount: number, description: string, profile: UserProfile) => {

        // Create a single 'transfer' type transaction
        const txRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), {
            accountId: fromAccountId,
            toAccountId: toAccountId,
            amount: amount,
            type: 'transfer',
            category: 'Internal Transfer',
            description: description,
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

    // Get recent transactions
    getRecentTransactions: async (l: number = 10): Promise<Transaction[]> => {
        const q = query(collection(db, TRANSACTIONS_COLLECTION), orderBy("date", "desc"), limit(l));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
    },

    // Real-time listener for accounts
    subscribeToAccounts: (callback: (accounts: AccountBalance[]) => void) => {
        return onSnapshot(collection(db, ACCOUNTS_COLLECTION), (snapshot) => {
            const accs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccountBalance));
            callback(accs);
        });
    },

    // Real-time listener for transactions
    subscribeToTransactions: (l: number, callback: (txs: Transaction[]) => void) => {
        const q = query(collection(db, TRANSACTIONS_COLLECTION), orderBy("date", "desc"), limit(l));
        return onSnapshot(q, (snapshot) => {
            const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
            callback(txs);
        });
    }
};
