import { db } from "@/lib/firebase";
import { Invoice, Quote, UserProfile } from "@/types";
import { collection, addDoc, getDocs, updateDoc, doc, serverTimestamp, query, orderBy, where, runTransaction } from "firebase/firestore";

const INVOICE_COLLECTION = "invoices";
const QUOTE_COLLECTION = "quotes";
const SETTINGS_COLLECTION = "settings";
const COUNTER_DOC_ID = "counters";

// Helper to remove undefined values for Firestore
const sanitizeData = (data: any): any => {
    if (data === undefined) return null;
    if (data === null || typeof data !== 'object') return data;
    if (data instanceof Date) return data;

    if (Array.isArray(data)) {
        return data.map(sanitizeData);
    }

    const sanitized: any = {};
    for (const key in data) {
        if (data[key] !== undefined) {
            sanitized[key] = sanitizeData(data[key]);
        }
    }
    return sanitized;
};

// Helper to generate next sequential ID
const generateNextId = async (type: 'invoice' | 'quote'): Promise<string> => {
    const counterRef = doc(db, SETTINGS_COLLECTION, COUNTER_DOC_ID);

    return await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let currentCount = 0;

        if (counterDoc.exists()) {
            const data = counterDoc.data();
            currentCount = (type === 'invoice' ? data.invoiceCount : data.quoteCount) || 0;
        }

        const nextCount = currentCount + 1;
        const prefix = type === 'invoice' ? 'INV' : 'Q';
        const formattedId = `${prefix}${nextCount.toString().padStart(4, '0')}`;

        transaction.set(counterRef, {
            [type === 'invoice' ? 'invoiceCount' : 'quoteCount']: nextCount
        }, { merge: true });

        return formattedId;
    });
};

export const InvoiceService = {
    // --- INVOICES ---
    addInvoice: async (invoice: Omit<Invoice, "id" | "createdAt" | "number">, userProfile?: UserProfile | null) => {
        const sequentialId = await generateNextId('invoice');

        const invoiceData = {
            ...invoice,
            number: sequentialId,
            createdAt: serverTimestamp(),
        } as Record<string, unknown>;

        if (userProfile) {
            invoiceData.createdBy = {
                uid: userProfile.uid,
                name: userProfile.displayName,
                position: '',
                email: userProfile.email || '',
                signatureUrl: userProfile.signatureUrl || ''
            };
        }

        const sanitizedData = sanitizeData(invoiceData);
        return await addDoc(collection(db, INVOICE_COLLECTION), sanitizedData);
    },

    getInvoices: async (): Promise<Invoice[]> => {
        const q = query(collection(db, INVOICE_COLLECTION), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Invoice));
    },

    updateInvoice: async (id: string, updates: Partial<Invoice>) => {
        const docRef = doc(db, INVOICE_COLLECTION, id);
        const sanitizedUpdates = sanitizeData(updates);
        await updateDoc(docRef, sanitizedUpdates);
    },

    // --- QUOTES ---
    addQuote: async (quote: Omit<Quote, "id" | "createdAt" | "number">, userProfile?: UserProfile | null) => {
        const sequentialId = await generateNextId('quote');

        const quoteData = {
            ...quote,
            number: sequentialId,
            createdAt: serverTimestamp(),
        } as Record<string, unknown>;

        if (userProfile) {
            quoteData.createdBy = {
                uid: userProfile.uid,
                name: userProfile.displayName,
                position: '',
                email: userProfile.email || '',
                signatureUrl: userProfile.signatureUrl || ''
            };
        }

        const sanitizedData = sanitizeData(quoteData);
        return await addDoc(collection(db, QUOTE_COLLECTION), sanitizedData);
    },

    getQuotes: async (): Promise<Quote[]> => {
        const q = query(collection(db, QUOTE_COLLECTION), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Quote));
    },

    updateQuote: async (id: string, updates: Partial<Quote>) => {
        const docRef = doc(db, QUOTE_COLLECTION, id);
        const sanitizedUpdates = sanitizeData(updates);
        await updateDoc(docRef, sanitizedUpdates);
    },

    getInvoicesByClient: async (clientId: string): Promise<Invoice[]> => {
        const q = query(
            collection(db, INVOICE_COLLECTION),
            where("clientId", "==", clientId),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Invoice));
    },

    getQuotesByClient: async (clientId: string): Promise<Quote[]> => {
        const q = query(
            collection(db, QUOTE_COLLECTION),
            where("clientId", "==", clientId),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Quote));
    },

    addPayment: async (payment: {
        amount: number;
        date: Date;
        method: string;
        notes?: string;
        invoiceId: string;
        invoiceNumber?: string;
        clientName: string;
        clientId: string;
        destinationAccountId: string;
        recordedBy?: { uid: string; name: string; email?: string } | null;
    }) => {
        if (!payment.destinationAccountId) {
            throw new Error("Destination account is required to record a payment.");
        }

        return await runTransaction(db, async (transaction) => {
            // 1. Create the finance transaction first to get its ID
            const txRef = doc(collection(db, "financeTransactions"));
            const financeTxId = txRef.id;

            const financeTxData = {
                type: 'INCOME',
                amount: payment.amount,
                currency: "USD", // Default or fetch from account
                targetAccountId: payment.destinationAccountId,
                referenceType: 'INVOICE_PAYMENT',
                referenceId: payment.invoiceId,
                date: serverTimestamp(),
                status: 'SUBMITTED',
                workflow: {
                    stage: 'ACCOUNTANT',
                    submittedAt: serverTimestamp(),
                    currentApproverRole: 'ACCOUNTANT'
                },
                submittedBy: payment.recordedBy || { uid: "system", name: "System" },
                approvalTrail: [{
                    stage: 'ACCOUNTANT',
                    action: 'SUBMIT',
                    byUid: payment.recordedBy?.uid || "system",
                    byName: payment.recordedBy?.name || "System",
                    at: new Date(),
                    note: `Payment recorded for Invoice ${payment.invoiceNumber}`
                }]
            };

            transaction.set(txRef, sanitizeData(financeTxData));

            // 2. Create the payment record with the link
            const paymentRef = doc(collection(db, "payments"));
            const paymentData = {
                ...payment,
                financeTxId: financeTxId,
                createdAt: serverTimestamp(),
            };

            transaction.set(paymentRef, sanitizeData(paymentData));

            return { paymentId: paymentRef.id, financeTxId };
        });
    }
};
