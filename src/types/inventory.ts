import { Timestamp } from "firebase/firestore";

export type MovementType = 'ISSUE' | 'RETURN' | 'RECEIPT' | 'ADJUSTMENT';

export interface InventoryItem {
    id: string;
    sku: string;
    name: string;
    unit: string;
    onHandQty: number;
    updatedAt: Timestamp;
}

export interface MovementItem {
    itemId: string;
    qty: number;
}

export interface InventoryMovement {
    id: string;
    type: MovementType;
    items: MovementItem[];
    jobCardId?: string;
    requestId?: string;
    createdBy: {
        uid: string;
        name: string;
    };
    createdAt: Timestamp;
    note?: string;
}
