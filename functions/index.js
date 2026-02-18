const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Import PDF generation function
const { generateApprovalLetter } = require("./generateApprovalLetter");
exports.generateApprovalLetter = generateApprovalLetter;

exports.createAdminUser = functions.https.onCall(async (data, context) => {
    // 1. Authorization Check (Read sender's profile from Firestore)
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }

    const requesterUid = context.auth.uid;
    const requesterProfileSnap = await admin.firestore().collection("userProfiles").doc(requesterUid).get();

    if (!requesterProfileSnap.exists || requesterProfileSnap.data().role !== 'ADMIN') {
        throw new functions.https.HttpsError("permission-denied", "Only Administrators can create new accounts.");
    }

    const { email, password, role, displayName, firstName, lastName, position, phoneNumber } = data;

    if (!email || !password) {
        throw new functions.https.HttpsError("invalid-argument", "Email and password are required.");
    }

    try {
        // 2. Create User in Auth
        const user = await admin.auth().createUser({
            email,
            password,
            displayName: displayName || `${firstName} ${lastName}`,
            phoneNumber: phoneNumber || undefined
        });

        // 3. Create User Profile in Firestore
        await admin.firestore().collection("userProfiles").doc(user.uid).set({
            uid: user.uid,
            email: user.email,
            displayName: displayName || `${firstName} ${lastName}` || "",
            firstName: firstName || "",
            lastName: lastName || "",
            position: position || "",
            phoneNumber: phoneNumber || "",
            role: role || "USER",
            active: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { message: `User ${email} created successfully with role ${role}.` };

    } catch (error) {
        console.error("Error creating user:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});

exports.deleteUser = functions.https.onCall(async (data, context) => {
    // 1. Authorization Check
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
    }

    const requesterUid = context.auth.uid;
    const requesterProfileSnap = await admin.firestore().collection("userProfiles").doc(requesterUid).get();

    if (!requesterProfileSnap.exists || requesterProfileSnap.data().role !== 'ADMIN') {
        throw new functions.https.HttpsError("permission-denied", "Only Administrators can delete accounts.");
    }

    const { uid } = data;
    if (!uid) {
        throw new functions.https.HttpsError("invalid-argument", "UID is required.");
    }

    try {
        // 2. Delete from Auth
        await admin.auth().deleteUser(uid);

        // 3. Delete from Firestore Profile
        await admin.firestore().collection("userProfiles").doc(uid).delete();

        return { message: `User ${uid} deleted successfully.` };
    } catch (error) {
        console.error("Error deleting user:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});

exports.toggleUserSuspension = functions.https.onCall(async (data, context) => {
    // 1. Authorization Check
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
    }

    const requesterUid = context.auth.uid;
    const requesterProfileSnap = await admin.firestore().collection("userProfiles").doc(requesterUid).get();

    if (!requesterProfileSnap.exists || requesterProfileSnap.data().role !== 'ADMIN') {
        throw new functions.https.HttpsError("permission-denied", "Only Administrators can suspend accounts.");
    }

    const { uid, disabled } = data;
    if (!uid || typeof disabled !== 'boolean') {
        throw new functions.https.HttpsError("invalid-argument", "UID and disabled status are required.");
    }

    try {
        // 2. Update Auth Status
        await admin.auth().updateUser(uid, { disabled });

        // 3. Update Firestore Profile
        await admin.firestore().collection("userProfiles").doc(uid).set({
            active: !disabled,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return { message: `User ${uid} suspension status set to ${disabled}.` };
    } catch (error) {
        console.error("Error toggling suspension:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});

/**
 * Triggered when a new payment is created in the 'payments' collection.
 * Sends the payment details to an external PHP-based requisition system.
 */
exports.onPaymentCreated = functions.firestore
    .document("payments/{paymentId}")
    .onCreate(async (snapshot, context) => {
        const paymentData = snapshot.data();
        const paymentId = context.params.paymentId;

        console.log(`Processing new payment: ${paymentId}`, paymentData);

        // Prepare the payload for the external system
        const payload = {
            id: paymentId,
            amount: paymentData.amount,
            currency: paymentData.currency || "USD",
            date: paymentData.date ? (paymentData.date.toDate ? paymentData.date.toDate().toISOString() : paymentData.date) : new Date().toISOString(),
            invoiceId: paymentData.invoiceId,
            invoiceNumber: paymentData.invoiceNumber,
            method: paymentData.method,
            notes: paymentData.notes || "",
            clientName: paymentData.clientName || "",
            recordedBy: paymentData.recordedBy ? paymentData.recordedBy.name : "System",
            timestamp: new Date().toISOString()
        };

        // TODO: Replace with the actual external API endpoint
        const EXTERNAL_API_URL = "https://external-php-system.example.com/api/requisition-topup";

        try {
            const response = await fetch(EXTERNAL_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // Add any required auth headers here
                    // "Authorization": `Bearer ${functions.config().external_api.key}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`External system responded with status ${response.status}: ${errorText}`);
            }

            console.log(`Successfully synced payment ${paymentId} to external system.`);

            // Optionally update the payment document with a sync status
            return snapshot.ref.update({
                syncStatus: "success",
                syncedAt: admin.firestore.FieldValue.serverTimestamp()
            });

        } catch (error) {
            console.error(`Error syncing payment ${paymentId}:`, error);

            // Update the payment document with failure details
            return snapshot.ref.update({
                syncStatus: "failed",
                syncError: error.message,
                lastSyncAttempt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    });

/**
 * Triggered when a transaction status changes to 'approved'.
 * Updates the account balance(s) atomically.
 */
exports.onTransactionStatusUpdate = functions.firestore
    .document("transactions/{txId}")
    .onUpdate(async (change, context) => {
        const txId = context.params.txId;
        const newValue = change.after.data();
        const previousValue = change.before.data();

        console.log(`[BalanceUpdate] Trigger fired for tx ${txId}: ${previousValue.status} -> ${newValue.status}`);

        // Check if status changed to APPROVED_FINAL
        if (newValue.status === 'APPROVED_FINAL' && previousValue.status !== 'APPROVED_FINAL') {
            const txData = newValue;
            const db = admin.firestore();

            console.log(`[BalanceUpdate] Processing: type=${txData.type}, amount=${txData.amount}, accountId=${txData.accountId}, toAccountId=${txData.toAccountId || 'N/A'}`);

            try {
                await db.runTransaction(async (t) => {
                    if (txData.type === 'transfer' && txData.toAccountId) {
                        const fromAccRef = db.collection("accounts").doc(txData.accountId);
                        const toAccRef = db.collection("accounts").doc(txData.toAccountId);

                        // Verify accounts exist
                        const fromSnap = await t.get(fromAccRef);
                        const toSnap = await t.get(toAccRef);
                        if (!fromSnap.exists) console.error(`[BalanceUpdate] Source account ${txData.accountId} NOT FOUND!`);
                        if (!toSnap.exists) console.error(`[BalanceUpdate] Dest account ${txData.toAccountId} NOT FOUND!`);

                        t.update(fromAccRef, {
                            balance: admin.firestore.FieldValue.increment(-txData.amount),
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                        t.update(toAccRef, {
                            balance: admin.firestore.FieldValue.increment(txData.amount),
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                        console.log(`[BalanceUpdate] Transfer: -${txData.amount} from ${txData.accountId}, +${txData.amount} to ${txData.toAccountId}`);
                    } else {
                        const adjustment = txData.type === 'income' ? txData.amount : -txData.amount;
                        const accRef = db.collection("accounts").doc(txData.accountId);

                        // Verify account exists
                        const accSnap = await t.get(accRef);
                        if (!accSnap.exists) {
                            console.error(`[BalanceUpdate] Account ${txData.accountId} NOT FOUND! Current accounts in DB need checking.`);
                        }

                        t.update(accRef, {
                            balance: admin.firestore.FieldValue.increment(adjustment),
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                        console.log(`[BalanceUpdate] ${txData.type}: adjustment=${adjustment} on account ${txData.accountId}`);
                    }
                });
                console.log(`[BalanceUpdate] SUCCESS for tx ${txId}`);
            } catch (error) {
                console.error(`[BalanceUpdate] FAILED for tx ${txId}:`, error);
                throw error;
            }
        } else {
            console.log(`[BalanceUpdate] Skipped: not a transition to APPROVED_FINAL`);
        }
        return null;
    });

/**
 * Triggered when a Job Card status changes to 'approved'.
 * Deducts stock from catalog items and records a pending transaction.
 */
// 2. Record Financial Transaction (Skipped or handled elsewhere)

/**
 * Callable function to approve a request (Stage 1 or Stage 2).
 */
exports.approveRequest = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
    }

    const { type, id, note } = data;
    if (!type || !id) {
        throw new functions.https.HttpsError("invalid-argument", "Type and ID are required.");
    }

    const collectionName = type === 'transaction' ? 'transactions' :
        (type === 'jobCard' ? 'jobCards' :
            (type === 'jobCardVariation' ? 'jobCardVariations' : null));
    if (!collectionName) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid request type.");
    }

    const db = admin.firestore();
    const userUid = context.auth.uid;

    try {
        return await db.runTransaction(async (transaction) => {
            // 1. Get User Profile
            const profileSnap = await transaction.get(db.collection("userProfiles").doc(userUid));
            if (!profileSnap.exists) {
                throw new functions.https.HttpsError("not-found", "User profile not found.");
            }
            const userProfile = profileSnap.data();
            const { role, displayName } = userProfile;

            // 2. Get Request Document
            const requestRef = db.collection(collectionName).doc(id);
            const requestSnap = await transaction.get(requestRef);
            if (!requestSnap.exists) {
                throw new functions.https.HttpsError("not-found", "Request not found.");
            }
            const requestData = requestSnap.data();

            let newStatus = "";
            let stage = "";

            // 3. Validate Role and Current Status
            if (requestData.status === 'SUBMITTED') {
                if (role !== 'ACCOUNTANT' && role !== 'ADMIN') {
                    throw new functions.https.HttpsError("permission-denied", "Only Accountants can perform Stage 1 approval.");
                }
                newStatus = 'APPROVED_BY_ACCOUNTANT';
                stage = 'ACCOUNTANT';
            } else if (requestData.status === 'APPROVED_BY_ACCOUNTANT') {
                if (role !== 'MANAGER' && role !== 'ADMIN') {
                    throw new functions.https.HttpsError("permission-denied", "Only Managers can perform Final approval.");
                }
                newStatus = 'APPROVED_FINAL';
                stage = 'MANAGER';

                // --- Inventory Issuance Integration (Idempotent) ---
                if (type === 'jobCard' && !requestData.issuedMovementId) {
                    const materials = requestData.materials || [];
                    const itemsToIssue = [];

                    for (const mat of materials) {
                        const itemRef = db.collection("catalogItems").doc(mat.id);
                        const itemSnap = await transaction.get(itemRef);

                        if (!itemSnap.exists) {
                            throw new functions.https.HttpsError("not-found", `Inventory item ${mat.id} (${mat.name}) not found.`);
                        }

                        const itemData = itemSnap.data();
                        if (itemData.stock < mat.quantity) {
                            throw new functions.https.HttpsError("failed-precondition", `Insufficient stock for ${mat.name}. Available: ${itemData.stock}, Required: ${mat.quantity}`);
                        }

                        itemsToIssue.push({ ref: itemRef, currentQty: itemData.stock, requestedQty: mat.quantity, itemId: mat.id });
                    }

                    if (itemsToIssue.length > 0) {
                        // 1. Deduct stock
                        for (const item of itemsToIssue) {
                            transaction.update(item.ref, {
                                stock: item.currentQty - item.requestedQty,
                                updatedAt: admin.firestore.FieldValue.serverTimestamp()
                            });
                        }

                        // 2. Create Movement Record
                        const movementRef = db.collection("inventoryMovements").doc();
                        const movementId = movementRef.id;
                        transaction.set(movementRef, {
                            type: 'ISSUE',
                            items: itemsToIssue.map(i => ({ itemId: i.itemId, qty: i.requestedQty })),
                            jobCardId: id,
                            createdBy: { uid: userUid, name: displayName || "Manager" },
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            note: `Auto-issued on Approval: ${requestData.projectName}`
                        });

                        // 3. Link movement to Job Card
                        transaction.update(requestRef, { issuedMovementId: movementId });
                    }
                }

                // --- Treasury Integration for Additional Costs ---
                if (type === 'jobCard') {
                    const dynamicExpensesTotal = (requestData.expenses || []).reduce((sum, ex) => sum + (ex.amount || 0), 0);
                    const labor = requestData.laborCost || 0;
                    const equipment = requestData.equipmentRental || 0;
                    const misc = requestData.miscExpenses || 0;
                    const legacyExpensesTotal = labor + equipment + misc;

                    const additionalCostsTotal = dynamicExpensesTotal > 0 ? dynamicExpensesTotal : legacyExpensesTotal;

                    if (additionalCostsTotal > 0) {
                        // Find a default account for deduction
                        const accountsSnap = await transaction.get(db.collection("accounts").limit(1));
                        if (!accountsSnap.empty) {
                            const accountId = accountsSnap.docs[0].id;
                            const txRef = db.collection("transactions").doc();

                            transaction.set(txRef, {
                                type: 'expense',
                                status: 'APPROVED_FINAL',
                                amount: additionalCostsTotal,
                                accountId: accountId,
                                category: 'Job Card Expense',
                                description: `Additional costs (Labor, Equipment, Misc) for Job card: ${requestData.projectName}`,
                                referenceId: id,
                                submittedBy: requestData.submittedBy,
                                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                                workflow: { stage: 'DONE', currentApproverRole: 'NONE' },
                                approvalTrail: [{
                                    stage: 'SYSTEM',
                                    action: 'APPROVE',
                                    byUid: userUid,
                                    byName: 'System Trigger',
                                    at: new Date(),
                                    note: 'Auto-generated from Job Card approval'
                                }]
                            });
                        }
                    }
                }

                // Balance updates for transactions are handled by the
                // onTransactionStatusUpdate Firestore trigger, which fires
                // when this function sets the status to APPROVED_FINAL.
                // Note: The auto-generated expense above will also trigger it.
            } else {
                throw new functions.https.HttpsError("failed-precondition", `Invalid status for approval: ${requestData.status}`);
            }

            // 4. Update Document Status and Trail
            transaction.update(requestRef, {
                status: newStatus,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                "workflow.stage": newStatus === 'APPROVED_FINAL' ? 'DONE' : 'MANAGER',
                "workflow.currentApproverRole": newStatus === 'APPROVED_FINAL' ? 'NONE' : 'MANAGER',
                approvalTrail: admin.firestore.FieldValue.arrayUnion({
                    stage: stage,
                    action: 'APPROVE',
                    byUid: userUid,
                    byName: displayName || "Approver",
                    at: new Date(),
                    note: note || ""
                })
            });

            return { success: true, newStatus };
        });
    } catch (error) {
        console.error("Error in approveRequest:", error);
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError("internal", error.message);
    }
});

/**
 * Callable function to reject a request (Stage 1 or Stage 2).
 */
exports.rejectRequest = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
    }

    const { type, id, note } = data;
    if (!type || !id || !note) {
        throw new functions.https.HttpsError("invalid-argument", "Type, ID, and Reason (note) are required.");
    }

    const collectionName = type === 'transaction' ? 'transactions' :
        (type === 'jobCard' ? 'jobCards' :
            (type === 'jobCardVariation' ? 'jobCardVariations' : null));
    if (!collectionName) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid request type.");
    }

    const db = admin.firestore();
    const userUid = context.auth.uid;

    try {
        return await db.runTransaction(async (transaction) => {
            const profileSnap = await transaction.get(db.collection("userProfiles").doc(userUid));
            const userProfile = profileSnap.data();
            const { role, displayName } = userProfile;

            const requestRef = db.collection(collectionName).doc(id);
            const requestSnap = await transaction.get(requestRef);
            const requestData = requestSnap.data();

            let newStatus = "";
            let stage = "";

            if (requestData.status === 'SUBMITTED') {
                if (role !== 'ACCOUNTANT' && role !== 'ADMIN') {
                    throw new functions.https.HttpsError("permission-denied", "Only Accountants can reject Stage 1.");
                }
                newStatus = 'REJECTED_BY_ACCOUNTANT';
                stage = 'ACCOUNTANT';
            } else if (requestData.status === 'APPROVED_BY_ACCOUNTANT') {
                if (role !== 'MANAGER' && role !== 'ADMIN') {
                    throw new functions.https.HttpsError("permission-denied", "Only Managers can reject Stage 2.");
                }
                newStatus = 'REJECTED_BY_MANAGER';
                stage = 'MANAGER';
            } else {
                throw new functions.https.HttpsError("failed-precondition", `Invalid status for rejection: ${requestData.status}`);
            }

            transaction.update(requestRef, {
                status: newStatus,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                "workflow.stage": 'DONE',
                "workflow.currentApproverRole": 'NONE',
                approvalTrail: admin.firestore.FieldValue.arrayUnion({
                    stage: stage,
                    action: 'REJECT',
                    byUid: userUid,
                    byName: displayName || "Approver",
                    at: new Date(),
                    note: note
                })
            });

            return { success: true, newStatus };
        });
    } catch (error) {
        console.error("Error in rejectRequest:", error);
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError("internal", error.message);
    }
});

exports.processReturn = functions.https.onCall(async (data, context) => {
    // 1. Authentication and Validation
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }

    const { jobCardId, items, note } = data;
    if (!jobCardId || !items || !Array.isArray(items) || items.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "Job Card ID and returned items are required.");
    }

    const userUid = context.auth.uid;
    const db = admin.firestore();

    try {
        return await db.runTransaction(async (transaction) => {
            // 2. Verify Role
            const profileSnap = await transaction.get(db.collection("userProfiles").doc(userUid));
            if (!profileSnap.exists || (profileSnap.data().role !== 'MANAGER' && profileSnap.data().role !== 'ADMIN')) {
                throw new functions.https.HttpsError("permission-denied", "Only Managers can process stock returns.");
            }

            const { displayName } = profileSnap.data();

            // 3. Get Job Card
            const jobRef = db.collection("jobCards").doc(jobCardId);
            const jobSnap = await transaction.get(jobRef);
            if (!jobSnap.exists) {
                throw new functions.https.HttpsError("not-found", "Job Card not found.");
            }

            const jobData = jobSnap.data();
            if (jobData.status !== 'APPROVED_FINAL') {
                throw new functions.https.HttpsError("failed-precondition", "Returns can only be processed for Approved Job Cards.");
            }

            // 4. Process Inventory Returns
            const itemRefsToUpdate = [];
            for (const item of items) {
                const itemRef = db.collection("catalogItems").doc(item.itemId);
                const itemSnap = await transaction.get(itemRef);

                if (!itemSnap.exists) {
                    throw new functions.https.HttpsError("not-found", `Inventory item ${item.itemId} not found.`);
                }

                const itemData = itemSnap.data();
                itemRefsToUpdate.push({
                    ref: itemRef,
                    newQty: itemData.stock + item.qty
                });
            }

            // 5. Apply Updates
            for (const update of itemRefsToUpdate) {
                transaction.update(update.ref, {
                    stock: update.newQty,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            // 6. Record RETURN Movement
            const movementRef = db.collection("inventoryMovements").doc();
            const movementId = movementRef.id;
            transaction.set(movementRef, {
                type: 'RETURN',
                items: items,
                jobCardId: jobCardId,
                createdBy: { uid: userUid, name: displayName || "Manager" },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                note: note || `Return processed for: ${jobData.projectName}`
            });

            // 7. Link to Job Card
            transaction.update(jobRef, {
                returnedMovementIds: admin.firestore.FieldValue.arrayUnion(movementId),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return { success: true, movementId };
        });
    } catch (error) {
        console.error("Error in processReturn:", error);
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError("internal", error.message);
    }
});

exports.manualPromoteUser = functions.https.onRequest(async (req, res) => {
    const email = req.query.email || "faraimufambisi@gmail.com";

    try {
        const user = await admin.auth().getUserByEmail(email);
        const userId = user.uid;

        await admin.auth().setCustomUserClaims(userId, { admin: true });

        await admin.firestore().collection("userProfiles").doc(userId).set({
            uid: userId,
            email: user.email,
            displayName: user.displayName || email.split('@')[0],
            role: 'ADMIN',
            active: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        res.status(200).send(`Successfully promoted ${email} to ADMIN.`);
    } catch (error) {
        console.error("Manual promotion failed:", error);
        res.status(500).send(`Failed to promote: ${error.message}`);
    }
});

exports.bootstrapAccounts = functions.https.onRequest(async (req, res) => {
    try {
        const accountsRef = admin.firestore().collection("accounts");
        const snapshot = await accountsRef.get();

        if (!snapshot.empty) {
            return res.status(200).send("Accounts already exist. Skipping bootstrap.");
        }

        const batch = admin.firestore().batch();

        const accounts = [
            { name: "Bank Account", type: "bank", balance: 0, currency: "USD" },
            { name: "EcoCash", type: "ecocash", balance: 0, currency: "USD" },
            { name: "Cash", type: "cash", balance: 0, currency: "USD" }
        ];

        accounts.forEach(acc => {
            const docRef = accountsRef.doc();
            batch.set(docRef, {
                ...acc,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();
        res.status(200).send("Financial accounts (Bank, EcoCash, Cash) initialized successfully.");
    } catch (error) {
        console.error("Bootstrap failed:", error);
        res.status(500).send(`Failed to bootstrap: ${error.message}`);
    }
});

exports.regenerateApprovalLetter = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Auth required.");

    // Check if admin
    const profileSnap = await admin.firestore().collection("userProfiles").doc(context.auth.uid).get();
    if (!profileSnap.exists || profileSnap.data().role !== 'ADMIN') {
        throw new functions.https.HttpsError("permission-denied", "Admin ONLY.");
    }

    const { type, id } = data;
    const collection = type === 'transaction' ? 'transactions' : (type === 'jobCard' ? 'jobCards' : null);
    if (!collection) throw new functions.https.HttpsError("invalid-argument", "Invalid type.");

    const db = admin.firestore();
    await db.collection(collection).doc(id).update({
        triggerRetryAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, message: `Update triggered for ${collection}/${id}` };
});

exports.triggerPDF = functions.https.onRequest(async (req, res) => {
    const { type, id } = req.query;
    if (!type || !id) return res.status(400).send("Type and ID required.");

    const collection = type === 'transaction' ? 'transactions' : (type === 'jobCard' ? 'jobCards' : null);
    if (!collection) return res.status(400).send("Invalid type.");

    try {
        const db = admin.firestore();
        await db.collection(collection).doc(id).update({
            manualTriggerAt: admin.firestore.FieldValue.serverTimestamp(),
            approvalLetter: admin.firestore.FieldValue.delete(),
            pdfGenerated: admin.firestore.FieldValue.delete(),
            pdfError: admin.firestore.FieldValue.delete()
        });
        res.status(200).send(`Successfully triggered update for ${collection}/${id}`);
    } catch (e) {
        res.status(500).send(`Error: ${e.message}`);
    }
});

/**
 * Triggered when a Job Card Variation status changes to 'APPROVED_FINAL'.
 * Deducts stock from catalog items and records a financial transaction.
 */
exports.onVariationStatusUpdate = functions.firestore
    .document("jobCardVariations/{variationId}")
    .onUpdate(async (change, context) => {
        const variationId = context.params.variationId;
        const newValue = change.after.data();
        const previousValue = change.before.data();

        console.log(`[VariationTrigger] Trigger fired for variation ${variationId}: ${previousValue.status} -> ${newValue.status}`);

        // Check if status changed to APPROVED_FINAL
        if (newValue.status === 'APPROVED_FINAL' && previousValue.status !== 'APPROVED_FINAL') {
            // Idempotency check: if postings already exist, skip
            if (newValue.postings && (newValue.postings.inventoryMovementId || newValue.postings.financeTransactionId)) {
                console.log(`[VariationTrigger] Variation ${variationId} already processed. Skipping.`);
                return null;
            }

            const db = admin.firestore();
            const variationData = newValue;

            try {
                return await db.runTransaction(async (transaction) => {
                    const postings = {};

                    // 1. Process Inventory (Items)
                    const items = variationData.items || [];
                    if (items.length > 0) {
                        const itemsToIssue = [];
                        for (const item of items) {
                            const itemRef = db.collection("catalogItems").doc(item.itemId);
                            const itemSnap = await transaction.get(itemRef);

                            if (!itemSnap.exists) {
                                throw new Error(`Inventory item ${item.itemId} (${item.name}) not found.`);
                            }

                            const stockData = itemSnap.data();
                            // Note: For variations, we allow stock to go negative if needed in case of emergency 
                            if (stockData.stock < item.qty) {
                                console.warn(`[VariationTrigger] Low stock for ${item.name}: available ${stockData.stock}, required ${item.qty}`);
                            }

                            itemsToIssue.push({
                                ref: itemRef,
                                currentQty: stockData.stock,
                                requestedQty: item.qty,
                                itemId: item.itemId
                            });
                        }

                        // Apply stock deductions
                        for (const issue of itemsToIssue) {
                            transaction.update(issue.ref, {
                                stock: issue.currentQty - issue.requestedQty,
                                updatedAt: admin.firestore.FieldValue.serverTimestamp()
                            });
                        }

                        // Create Movement Record
                        const movementRef = db.collection("inventoryMovements").doc();
                        const movementId = movementRef.id;
                        transaction.set(movementRef, {
                            type: 'ISSUE',
                            items: items.map(i => ({ itemId: i.itemId, qty: i.qty })),
                            jobCardId: variationData.jobCardId,
                            variationId: variationId,
                            createdBy: variationData.submittedBy,
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            note: `Variation #${variationData.variationNumber} Issue: ${variationData.reason}`
                        });
                        postings.inventoryMovementId = movementId;
                    }

                    // 2. Process Finance (Expenses)
                    const expensesTotal = variationData.totals?.expensesTotal || 0;
                    if (expensesTotal > 0) {
                        const txRef = db.collection("transactions").doc();
                        const txId = txRef.id;

                        // Use selected account or fallback to first found account
                        let accountId = variationData.expenseAccountId;
                        if (!accountId) {
                            const accountsSnap = await transaction.get(db.collection("accounts").limit(1));
                            if (!accountsSnap.empty) accountId = accountsSnap.docs[0].id;
                        }

                        if (accountId) {
                            transaction.set(txRef, {
                                type: 'expense',
                                status: 'APPROVED_FINAL',
                                amount: expensesTotal,
                                accountId: accountId,
                                category: 'Job Variation Expense',
                                description: `Variation #${variationData.variationNumber} Expenses for Job: ${variationData.jobCardNumber}`,
                                referenceId: variationId,
                                submittedBy: variationData.submittedBy,
                                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                                workflow: { stage: 'DONE', currentApproverRole: 'NONE' },
                                approvalTrail: [{
                                    stage: 'SYSTEM',
                                    action: 'APPROVE',
                                    byUid: 'system',
                                    byName: 'Variation Trigger',
                                    at: new Date(),
                                    note: `Auto-generated from Variation #${variationData.variationNumber} approval`
                                }]
                            });
                            postings.financeTransactionId = txId;
                        } else {
                            console.error("[VariationTrigger] No account found for expense posting.");
                        }
                    }

                    // 3. Complete Variation Record
                    transaction.update(change.after.ref, {
                        postings: {
                            ...postings,
                            postedAt: admin.firestore.FieldValue.serverTimestamp()
                        }
                    });

                    console.log(`[VariationTrigger] SUCCESS for variation ${variationId}`);
                });
            } catch (error) {
                console.error(`[VariationTrigger] FAILED for variation ${variationId}:`, error);
                return null;
            }
        }
        return null;
    });




