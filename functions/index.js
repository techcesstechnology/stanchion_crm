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
        const newValue = change.after.data();
        const previousValue = change.before.data();

        // Check if status changed to APPROVED_FINAL
        if (newValue.status === 'APPROVED_FINAL' && previousValue.status !== 'APPROVED_FINAL') {
            const txData = newValue;
            const db = admin.firestore();

            return db.runTransaction(async (t) => {
                if (txData.type === 'transfer' && txData.toAccountId) {
                    const fromAccRef = db.collection("accounts").doc(txData.accountId);
                    const toAccRef = db.collection("accounts").doc(txData.toAccountId);

                    t.update(fromAccRef, {
                        balance: admin.firestore.FieldValue.increment(-txData.amount),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    t.update(toAccRef, {
                        balance: admin.firestore.FieldValue.increment(txData.amount),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    // Determine adjustment amount for income/expense
                    const adjustment = txData.type === 'income' ? txData.amount : -txData.amount;
                    const accRef = db.collection("accounts").doc(txData.accountId);

                    t.update(accRef, {
                        balance: admin.firestore.FieldValue.increment(adjustment),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            });
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

    const collectionName = type === 'transaction' ? 'transactions' : (type === 'jobCard' ? 'jobCards' : null);
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
                // --- Finance Balance Integration (Final Approval) ---
                if (type === 'financeTransaction' && !requestData.appliedAt) {
                    const amount = requestData.amount;
                    const txType = requestData.type; // INCOME, EXPENSE, TRANSFER

                    if (txType === 'INCOME' || txType === 'TRANSFER') {
                        const targetRef = db.collection("financeAccounts").doc(requestData.targetAccountId);
                        const targetSnap = await transaction.get(targetRef);
                        if (!targetSnap.exists) throw new functions.https.HttpsError("not-found", "Target finance account not found.");
                        transaction.update(targetRef, {
                            balance: admin.firestore.FieldValue.increment(amount),
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    }

                    if (txType === 'EXPENSE' || txType === 'TRANSFER') {
                        const sourceRef = db.collection("financeAccounts").doc(requestData.sourceAccountId);
                        const sourceSnap = await transaction.get(sourceRef);
                        if (!sourceSnap.exists) throw new functions.https.HttpsError("not-found", "Source finance account not found.");

                        // Optional: Enforce no negative balance for certain account types
                        // if (sourceSnap.data().balance < amount) throw ...

                        transaction.update(sourceRef, {
                            balance: admin.firestore.FieldValue.increment(-amount),
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    }

                    // Mark as applied atomically
                    transaction.update(requestRef, {
                        appliedAt: admin.firestore.FieldValue.serverTimestamp(),
                        // PDF Metadata Placeholder (C3 Step)
                        pdfGenerated: false
                    });

                    // [NOTE: C4 Step will trigger PDF generation via another function or task]
                }
                // ----------------------------------------------------
                // --------------------------------------------------
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

    const collectionName = type === 'transaction' ? 'transactions' : (type === 'jobCard' ? 'jobCards' : null);
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

