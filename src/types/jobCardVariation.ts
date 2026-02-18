import { Timestamp } from "firebase/firestore";
import { BaseRequest } from "./index";
import { JobCardExpense } from "./jobCard";

export interface VariationMaterial {
    itemId: string;
    name: string;
    unit: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
}

export interface JobCardVariation extends BaseRequest {
    id: string;
    jobCardId: string;
    jobCardNumber: string;
    variationNumber: number;
    status: 'DRAFT' | 'SUBMITTED' | 'APPROVED_BY_ACCOUNTANT' | 'REJECTED_BY_ACCOUNTANT' | 'APPROVED_FINAL' | 'REJECTED_BY_MANAGER';
    reason: string;
    notes?: string;
    items: VariationMaterial[];
    expenses: JobCardExpense[];
    totals: {
        inventoryTotal: number;
        expensesTotal: number;
        grandTotal: number;
    };
    expenseAccountId?: string;
    postings?: {
        inventoryMovementId?: string;
        financeTransactionId?: string;
        postedAt?: Timestamp | Date;
    };
    submittedBy: {
        uid: string;
        name: string;
    };
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}

export interface CreateVariationDTO extends Omit<JobCardVariation, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'workflow' | 'submittedBy' | 'approvalTrail' | 'variationNumber' | 'postings'> {
    // These will be calculated or set by the service
}
