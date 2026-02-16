import { db, auth } from "@/lib/firebase";
import {
    AccountBalance,
    Transaction,
    CreateTransactionDTO
} from "@/types/finance";
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    getDoc,
    doc,
    serverTimestamp,
    query,
    orderBy,
    where,
    limit,
    increment
} from "firebase/firestore";

const ACCOUNTS_COLLECTION = "accounts";
const TRANSACTIONS_COLLECTION = "transactions";

// Mock data for local testing
const MOCK_ACCOUNTS: AccountBalance[] = [
    { id: "acc-1", name: "Petty Cash (USD)", type: "cash", balance: 500, currency: "USD", updatedAt: new Date() },
    { id: "acc-2", name: "Bank Account (USD)", type: "bank", balance: 12500, currency: "USD", updatedAt: new Date() },
    { id: "acc-3", name: "EcoCash (USD)", type: "ecocash", balance: 1200, currency: "USD", updatedAt: new Date() }
];

export const FinanceService = {
    // Get all accounts
    getAccounts: async (): Promise<AccountBalance[]> => {
        if (!import.meta.env.VITE_FIREBASE_API_KEY) {
            return MOCK_ACCOUNTS;
        }
        const snapshot = await getDocs(collection(db, ACCOUNTS_COLLECTION));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccountBalance));
    },

    // Record a transaction and update account balance
    addTransaction: async (data: CreateTransactionDTO): Promise<string> => {
        const user = auth.currentUser;

        if (!import.meta.env.VITE_FIREBASE_API_KEY) {
            console.log("Mock: Adding Transaction", data);
            return "mock-tx-id-" + Math.random().toString(36).substr(2, 9);
        }

        if (!user) throw new Error("User must be authenticated");

        // 1. Create transaction record
        const txRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), {
            ...data,
            status: 'pending',
            date: serverTimestamp(),
            createdBy: {
                uid: user.uid,
                name: user.displayName || user.email || "Unknown"
            }
        });

        return txRef.id;
    },

    // Approve transaction and update balance
    approveTransaction: async (txId: string) => {
        if (!import.meta.env.VITE_FIREBASE_API_KEY) {
            console.log("Mock: Approving Transaction", txId);
            return;
        }

        const txRef = doc(db, TRANSACTIONS_COLLECTION, txId);
        const txSnap = await getDoc(txRef);
        if (!txSnap.exists()) throw new Error("Transaction not found");

        const txData = txSnap.data() as Transaction;
        if (txData.status !== 'pending') throw new Error("Transaction already processed");

        // Determine adjustment amount
        const adjustment = txData.type === 'income' ? txData.amount : -txData.amount;

        // 2. Update account balance
        const accRef = doc(db, ACCOUNTS_COLLECTION, txData.accountId);
        await updateDoc(accRef, {
            balance: increment(adjustment),
            updatedAt: serverTimestamp()
        });

        // 3. Update transaction status
        await updateDoc(txRef, {
            status: 'approved',
            approvedAt: serverTimestamp(),
            approvedBy: auth.currentUser?.displayName || auth.currentUser?.email || "Unknown"
        });
    },

    // Get recent transactions
    getRecentTransactions: async (l: number = 10): Promise<Transaction[]> => {
        if (!import.meta.env.VITE_FIREBASE_API_KEY) {
            return [];
        }
        const q = query(collection(db, TRANSACTIONS_COLLECTION), orderBy("date", "desc"), limit(l));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
    }
};
