import { Timestamp } from "firebase/firestore";

export type AccountType = 'bank' | 'ecocash' | 'cash';
export type TransactionType = 'income' | 'expense' | 'transfer';

export interface AccountBalance {
    id: string;
    name: string;
    type: AccountType;
    balance: number;
    currency: string;
    updatedAt: Date | Timestamp;
}

export interface Transaction {
    id: string;
    accountId: string;
    amount: number;
    type: TransactionType;
    category: string;
    description: string;
    date: Date | Timestamp;
    referenceId?: string; // e.g. JobCard ID, Invoice ID, or Quote ID
    status: 'pending' | 'approved' | 'rejected';
    createdBy: {
        uid: string;
        name: string;
    };
    approvedBy?: string;
    approvedAt?: Date | Timestamp;
}

export interface CreateTransactionDTO extends Omit<Transaction, 'id' | 'date' | 'status' | 'createdBy'> {
    // Basic fields for creating a transaction
}
