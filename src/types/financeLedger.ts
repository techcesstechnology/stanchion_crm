import { Timestamp } from "firebase/firestore";
import { BaseRequest } from "./index";

export type FinanceTransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface FinanceAccount {
    id: string;
    name: string; // CashInHand, EcoCash, Bank, etc.
    balance: number;
    currency: string;
    updatedAt: Timestamp | Date;
}

export interface ApprovalLetter {
    refNo: string;
    storagePath: string;
    url: string;
    generatedAt: Date | Timestamp;
}

export interface FinanceTransaction extends BaseRequest {
    id?: string;
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    amount: number;
    currency: string;
    sourceAccountId?: string;  // For EXPENSE, TRANSFER
    targetAccountId?: string;  // For INCOME, TRANSFER
    referenceType?: 'INVOICE_PAYMENT' | 'JOB_CARD' | 'GENERAL';
    referenceId?: string;
    date: Date | Timestamp;
    appliedAt?: Date | Timestamp;
    approvalLetter?: ApprovalLetter;
}

export type CreateFinanceTransactionDTO = Omit<FinanceTransaction, 'id' | 'date' | 'status' | 'workflow' | 'submittedBy' | 'approvalTrail'>;
