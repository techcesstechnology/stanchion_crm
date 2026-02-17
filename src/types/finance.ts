import { Timestamp } from "firebase/firestore";
import { BaseRequest } from "./index";

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

export interface Transaction extends BaseRequest {
    id: string;
    accountId: string;
    toAccountId?: string; // For transfers
    amount: number;
    type: TransactionType;
    category: string;
    description: string;
    date: Date | Timestamp;
    referenceId?: string; // e.g. JobCard ID, Invoice ID, or Quote ID
}

export type CreateTransactionDTO = Omit<Transaction, 'id' | 'date' | 'status' | 'workflow' | 'submittedBy' | 'approvalTrail'>;
