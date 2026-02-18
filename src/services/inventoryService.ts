import { db } from "@/lib/firebase";
import {
    collection,
    doc,
    getDocs,
    query,
    orderBy,
    runTransaction,
    serverTimestamp,
} from "firebase/firestore";
import { InventoryItem, InventoryMovement, MovementItem } from "@/types/inventory";
import { UserProfile } from "@/types";

import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

const ITEMS_COLLECTION = "catalogItems";
const MOVEMENTS_COLLECTION = "inventoryMovements";

const processReturnFn = httpsCallable(functions, 'processReturn');

export const InventoryService = {
    // Get all inventory items from the catalog
    getInventoryItems: async (): Promise<InventoryItem[]> => {
        const q = query(collection(db, ITEMS_COLLECTION), orderBy("name", "asc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                sku: data.sku || "N/A", // Catalog items might not have SKU yet
                name: data.name || "Unnamed Item",
                unit: data.unit || "Unit",
                onHandQty: data.stock || 0,
                updatedAt: data.updatedAt
            } as InventoryItem;
        });
    },

    // Get all inventory movements
    getInventoryMovements: async (): Promise<InventoryMovement[]> => {
        const q = query(collection(db, MOVEMENTS_COLLECTION), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryMovement));
    },

    /**
     * Issue stock for a job card or general request.
     * Uses a transaction to ensure stock levels remain consistent and never go negative.
     */
    issueStock: async (params: {
        requestId?: string,
        jobCardId?: string,
        items: MovementItem[],
        by: UserProfile,
        note?: string
    }) => {
        const { requestId, jobCardId, items, by, note } = params;

        return await runTransaction(db, async (transaction) => {
            const itemSnapshots = [];

            // 1. Fetch current on-hand quantities for all items
            for (const item of items) {
                const itemRef = doc(db, ITEMS_COLLECTION, item.itemId);
                const itemSnap = await transaction.get(itemRef);

                if (!itemSnap.exists()) {
                    throw new Error(`Inventory item ${item.itemId} does not exist.`);
                }

                const itemData = itemSnap.data() as InventoryItem;
                if (itemData.onHandQty < item.qty) {
                    throw new Error(`Insufficient stock for ${itemData.name} (SKU: ${itemData.sku}). On hand: ${itemData.onHandQty}, requested: ${item.qty}`);
                }

                itemSnapshots.push({ ref: itemRef, data: itemData, requestedQty: item.qty });
            }

            // 2. Perform updates
            for (const snap of itemSnapshots) {
                transaction.update(snap.ref, {
                    onHandQty: snap.data.onHandQty - snap.requestedQty,
                    updatedAt: serverTimestamp()
                });
            }

            // 3. Record the movement
            const movementRef = doc(collection(db, MOVEMENTS_COLLECTION));
            transaction.set(movementRef, {
                type: 'ISSUE',
                items: items,
                jobCardId: jobCardId || null,
                requestId: requestId || null,
                createdBy: {
                    uid: by.uid,
                    name: by.displayName
                },
                createdAt: serverTimestamp(),
                note: note || ""
            });

            return movementRef.id;
        });
    },

    /**
     * Process an inventory return using the Cloud Function
     */
    processReturn: async (params: { jobCardId: string, items: MovementItem[], note?: string }) => {
        const { jobCardId, items, note } = params;
        const result = await processReturnFn({ jobCardId, items, note });
        return result.data;
    }
};
