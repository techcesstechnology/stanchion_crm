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

export interface UserProfile {
    uid: string;
    firstName: string;
    lastName: string;
    position: string;
    email: string;
    signatureUrl?: string;
    updatedAt: Date | Timestamp;
}

export interface CreatorProfile {
    uid: string;
    name: string;
    position: string;
    email: string;
    signatureUrl?: string;
}

export interface CatalogItem {
    id: string;
    name: string;
    description?: string;
    category?: string;
    price: number;
    stock: number;
    unit?: string;
    createdAt: Date | Timestamp;
    updatedAt: Date | Timestamp;
}
