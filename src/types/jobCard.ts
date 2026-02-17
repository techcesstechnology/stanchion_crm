import { Timestamp } from "firebase/firestore";
import { BaseRequest } from "./index";

export interface JobCardMaterial {
    id: string;
    name: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    units?: string;
}

export interface JobCard extends BaseRequest {
    id: string;
    projectName: string;
    description: string;
    clientName: string;
    clientId: string;
    materials: JobCardMaterial[];
    totalCost: number;
    issuedMovementId?: string;
    returnedMovementIds?: string[];
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}

export interface CreateJobCardDTO extends Omit<JobCard, 'id' | 'createdAt' | 'updatedAt' | 'totalCost' | 'status' | 'workflow' | 'submittedBy' | 'approvalTrail'> {
    projectName: string;
    clientName: string;
}
