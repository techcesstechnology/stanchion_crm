import { db } from "@/lib/firebase";
import { CompanySettings, FinanceSettings } from "@/types";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const SETTINGS_COLLECTION = "settings";
const COMPANY_DOC_ID = "company-config";
const FINANCE_DOC_ID = "finance-config";

// Default values for when settings haven't been configured
const DEFAULT_COMPANY_SETTINGS: Omit<CompanySettings, 'id' | 'updatedAt'> = {
    companyName: "",
    address: "",
    email: "",
    phone: "",
    secondaryPhone: "",
    logoUrl: "",
};

const DEFAULT_FINANCE_SETTINGS: Omit<FinanceSettings, 'id' | 'updatedAt'> = {
    bankName: "",
    accountName: "",
    accountNumber: "",
    branchCode: "",
    swiftCode: "",
    termsAndConditions: "",
    paymentTerms: "",

};

export const SettingsService = {
    // --- COMPANY SETTINGS ---
    getCompanySettings: async (): Promise<CompanySettings> => {
        const docRef = doc(db, SETTINGS_COLLECTION, COMPANY_DOC_ID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            } as CompanySettings;
        } else {
            // Return defaults if not configured yet
            return {
                id: COMPANY_DOC_ID,
                ...DEFAULT_COMPANY_SETTINGS,
                updatedAt: new Date(),
            } as CompanySettings;
        }
    },

    updateCompanySettings: async (settings: Omit<CompanySettings, 'id' | 'updatedAt'>) => {
        const docRef = doc(db, SETTINGS_COLLECTION, COMPANY_DOC_ID);
        await setDoc(docRef, {
            ...settings,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    },

    // Convert logo file to base64 data URL (stored directly in Firestore to bypass CORS)
    uploadLogo: async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error('Failed to convert file to base64'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    },

    // Convert seal file to base64 data URL
    uploadSeal: async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error('Failed to convert file to base64'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    },

    // --- FINANCE SETTINGS ---
    getFinanceSettings: async (): Promise<FinanceSettings> => {
        const docRef = doc(db, SETTINGS_COLLECTION, FINANCE_DOC_ID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            } as FinanceSettings;
        } else {
            // Return defaults if not configured yet
            return {
                id: FINANCE_DOC_ID,
                ...DEFAULT_FINANCE_SETTINGS,
                updatedAt: new Date(),
            } as FinanceSettings;
        }
    },

    updateFinanceSettings: async (settings: Omit<FinanceSettings, 'id' | 'updatedAt'>) => {
        const docRef = doc(db, SETTINGS_COLLECTION, FINANCE_DOC_ID);
        await setDoc(docRef, {
            ...settings,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    },
};
