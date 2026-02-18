import {
    updateDoc,
    arrayUnion,
    serverTimestamp,
    DocumentReference
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { UserProfile } from "@/types";

const approveRequestFn = httpsCallable(functions, 'approveRequest');
const rejectRequestFn = httpsCallable(functions, 'rejectRequest');

/**
 * Helper to determine request type from reference
 */
const getRequestType = (ref: DocumentReference) => {
    const collection = ref.parent.id;
    if (collection === 'transactions') return 'transaction';
    if (collection === 'jobCards') return 'jobCard';
    if (collection === 'jobCardVariations') return 'jobCardVariation';
    return '';
};

export const WorkflowService = {
    /**
     * Submit a request for Accountant approval (Client-side)
     */
    submitRequest: async (requestRef: DocumentReference, profile: UserProfile) => {
        await updateDoc(requestRef, {
            status: 'SUBMITTED',
            'workflow.stage': 'ACCOUNTANT',
            'workflow.submittedAt': serverTimestamp(),
            'workflow.currentApproverRole': 'ACCOUNTANT',
            approvalTrail: arrayUnion({
                stage: 'ACCOUNTANT',
                action: 'SUBMIT',
                byUid: profile.uid,
                byName: profile.displayName,
                at: new Date(),
            })
        });
    },

    /**
     * Accountant approval moves request to Manager stage (Cloud Function)
     */
    approveAsAccountant: async (requestRef: DocumentReference, _profile: UserProfile, note?: string) => {
        await approveRequestFn({
            type: getRequestType(requestRef),
            id: requestRef.id,
            note
        });
    },

    /**
     * Manager approval finalized the request (Cloud Function)
     */
    approveAsManager: async (requestRef: DocumentReference, _profile: UserProfile, note?: string) => {
        await approveRequestFn({
            type: getRequestType(requestRef),
            id: requestRef.id,
            note
        });
    },

    /**
     * Accountant rejection cancels the request (Cloud Function)
     */
    rejectAsAccountant: async (requestRef: DocumentReference, _profile: UserProfile, note: string) => {
        await rejectRequestFn({
            type: getRequestType(requestRef),
            id: requestRef.id,
            note
        });
    },

    /**
     * Manager rejection cancels the request (Cloud Function)
     */
    rejectAsManager: async (requestRef: DocumentReference, _profile: UserProfile, note: string) => {
        await rejectRequestFn({
            type: getRequestType(requestRef),
            id: requestRef.id,
            note
        });
    }
};
