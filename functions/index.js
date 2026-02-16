const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.createAdminUser = functions.https.onCall(async (data, context) => {
    // 1. Authorization Check (Read sender's profile from Firestore)
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }

    const requesterUid = context.auth.uid;
    const requesterProfileSnap = await admin.firestore().collection("userProfiles").doc(requesterUid).get();

    if (!requesterProfileSnap.exists || requesterProfileSnap.data().role !== 'superUser') {
        throw new functions.https.HttpsError("permission-denied", "Only Super Users can create new admins.");
    }

    const { email, password, role, firstName, lastName, position } = data;

    if (!email || !password) {
        throw new functions.https.HttpsError("invalid-argument", "Email and password are required.");
    }

    try {
        // 2. Create User in Auth (Standard Auth User)
        const user = await admin.auth().createUser({
            email,
            password,
            displayName: `${firstName} ${lastName}`,
        });

        // 3. Create User Profile in Firestore (This is now the source of truth for roles)
        await admin.firestore().collection("userProfiles").doc(user.uid).set({
            uid: user.uid,
            email: user.email,
            firstName: firstName || "",
            lastName: lastName || "",
            position: position || "Admin",
            role: role || "admin", // 'superUser', 'admin', 'viewer', etc.
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
    // 1. Authorization Check (Read sender's profile)
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
    }

    const requesterUid = context.auth.uid;
    const requesterProfileSnap = await admin.firestore().collection("userProfiles").doc(requesterUid).get();

    if (!requesterProfileSnap.exists || requesterProfileSnap.data().role !== 'superUser') {
        throw new functions.https.HttpsError("permission-denied", "Only Super Users can delete accounts.");
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

    if (!requesterProfileSnap.exists || requesterProfileSnap.data().role !== 'superUser') {
        throw new functions.https.HttpsError("permission-denied", "Only Super Users can suspend accounts.");
    }

    const { uid, disabled } = data; // disabled: true (suspend) or false (activate)
    if (!uid || typeof disabled !== 'boolean') {
        throw new functions.https.HttpsError("invalid-argument", "UID and disabled status are required.");
    }

    try {
        // 2. Update Auth Status
        await admin.auth().updateUser(uid, { disabled });

        // 3. Update Firestore Profile
        await admin.firestore().collection("userProfiles").doc(uid).set({
            suspended: disabled,
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

