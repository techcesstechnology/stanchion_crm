import { Timestamp } from 'firebase/firestore';

export type ActivityType =
    | 'note'
    | 'call'
    | 'meeting'
    | 'email'
    | 'status_change'
    | 'quote'
    | 'invoice'
    | 'file';

export interface ActivityAttachment {
    name: string;
    url: string;
    path: string;
    size: number;
    contentType: string;
    uploadedAt: string; // ISO string
}

export interface Activity {
    id: string;
    type: ActivityType;
    title: string;
    description?: string;
    eventDate: Timestamp; // Using Firestore Timestamp for consistency with queries
    createdAt: Timestamp;
    createdBy: {
        uid: string;
        name: string;
    };
    contactId?: string;
    leadId?: string;
    quoteId?: string;
    invoiceId?: string;
    attachments?: ActivityAttachment[];
}

export interface CreateActivityDTO {
    type: ActivityType;
    title: string;
    description?: string;
    eventDate: Date;
    contactId?: string;
    leadId?: string;
    quoteId?: string;
    invoiceId?: string;
    attachments?: ActivityAttachment[];
}
