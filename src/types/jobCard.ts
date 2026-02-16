import { Timestamp } from "firebase/firestore";

export type JobCardStatus = 'draft' | 'pending_approval' | 'approved' | 'completed' | 'cancelled';

export interface JobCardMaterial {
    id: string;
    name: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    units?: string;
}

export interface JobCard {
    id: string;
    projectName: string;
    description: string;
    clientName: string;
    clientId: string;
    materials: JobCardMaterial[];
    totalCost: number;
    status: JobCardStatus;
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
    approvedAt?: Timestamp | Date;
    approvedBy?: string;
    createdBy: {
        uid: string;
        name: string;
    };
}

export interface CreateJobCardDTO extends Omit<JobCard, 'id' | 'createdAt' | 'updatedAt' | 'totalCost'> {
    projectName: string;
    clientName: string;
}
