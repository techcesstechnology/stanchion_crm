export type Timestamp = {
    seconds: number;
    nanoseconds: number;
};

export interface Contact {
    id: string;
    name: string;
    email: string;
    phone: string;
    company?: string;
    address?: string;
    createdAt: Date | Timestamp;
    status: 'active' | 'inactive';
}

export interface Lead {
    id: string;
    name: string;
    email: string;
    phone?: string;
    status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
    source?: string;
    value?: number;
    createdAt: Date | Timestamp;
    notes?: string;
}

export interface InvoiceItem {
    id: string;
    description: string;
    longDescription?: string;
    category?: string;
    quantity: number;
    price: number;
}

export interface Payment {
    id: string;
    amount: number;
    date: Date | Timestamp;
    method: 'cash' | 'transfer' | 'card' | 'other';
    notes?: string;
    destinationAccountId?: string;
    financeTxId?: string;
}

export interface Invoice {
    id: string;
    number?: string;
    clientId: string;
    clientName: string;
    clientEmail?: string;
    items: InvoiceItem[];
    total: number;
    payments?: Payment[];
    status: 'draft' | 'sent' | 'paid' | 'overdue' | 'partial';
    date: Date | Timestamp;
    dueDate: Date | Timestamp;
    createdAt: Date | Timestamp;
    createdBy?: CreatorProfile;
    discountValue?: number;
    discountType?: 'percent' | 'amount';
}

export interface Quote {
    id: string;
    number?: string;
    clientId: string;
    clientName: string;
    clientEmail?: string;
    items: InvoiceItem[];
    total: number;
    status: 'draft' | 'sent' | 'accepted' | 'rejected';
    date: Date | Timestamp;
    expiryDate: Date | Timestamp;
    createdAt: Date | Timestamp;
    createdBy?: CreatorProfile;
    discountValue?: number;
    discountType?: 'percent' | 'amount';
}

export interface Task {
    id: string;
    title: string;
    description?: string;
    status: 'todo' | 'in-progress' | 'done';
    priority: 'low' | 'medium' | 'high';
    createdAt: Date | Timestamp;
    dueDate?: string;
}

export interface CompanySettings {
    id: string;
    companyName: string;
    address: string;
    email: string;
    phone: string;
    secondaryPhone?: string;
    logoUrl?: string;
    updatedAt: Date | Timestamp;
    defaultSignatoryName?: string;
    defaultSignatoryPosition?: string;
    officialSealUrl?: string;
}

export interface FinanceSettings {
    id: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
    accountNumberZwg?: string;
    branchCode?: string;
    swiftCode?: string;
    termsAndConditions: string;
    paymentTerms?: string;

    updatedAt: Date | Timestamp;
    // Secondary Bank Account
    bankName2?: string;
    accountName2?: string;
    accountNumber2?: string;
    branchCode2?: string;
    swiftCode2?: string;
    otherInfo?: string;
}

export type UserRole = 'ADMIN' | 'ACCOUNTANT' | 'MANAGER' | 'STORES_APPROVER' | 'USER';

export interface UserProfile {
    uid: string;
    displayName: string;
    firstName?: string;
    lastName?: string;
    position?: string;
    phoneNumber?: string;
    email: string;
    role: UserRole;
    active: boolean;
    createdAt: Date | Timestamp;
    updatedAt: Date | Timestamp;
    signatureUrl?: string;
}

export interface CreatorProfile {
    uid: string;
    name: string;
    position: string;
    email: string;
    signatureUrl?: string;
}

export type RequestStatus =
    | 'DRAFT'
    | 'SUBMITTED'
    | 'APPROVED_BY_ACCOUNTANT'
    | 'REJECTED_BY_ACCOUNTANT'
    | 'APPROVED_FINAL'
    | 'REJECTED_BY_MANAGER'
    | 'CANCELLED';

export interface ApprovalTrailEntry {
    stage: 'ACCOUNTANT' | 'MANAGER';
    action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'CANCEL';
    byUid: string;
    byName: string;
    at: Date | Timestamp;
    note?: string;
}

export interface RequestWorkflow {
    stage: 'ACCOUNTANT' | 'MANAGER' | 'DONE';
    submittedAt: Date | Timestamp | null;
    currentApproverRole: UserRole | 'NONE';
}

export interface BaseRequest {
    status: RequestStatus;
    workflow: RequestWorkflow;
    submittedBy: {
        uid: string;
        name: string;
    };
    approvalTrail: ApprovalTrailEntry[];
    pdfGenerated?: boolean;
    approvalLetter?: {
        refNo: string;
        storagePath: string;
        url: string;
        generatedAt: Date | Timestamp;
    };
}

export interface CatalogItem {
    id: string;
    name: string;
    description?: string;
    category?: string;
    price: number;
    stock: number;
    unit?: string;
    pricing?: {
        purchasePrice: number;
        freightAndDuty: number;
        totalCost: number;
        markupPercent: number;
        sellingPrice: number;
        twidMarkupPercent: number;
    };
    createdAt: Date | Timestamp;
    updatedAt: Date | Timestamp;
}
