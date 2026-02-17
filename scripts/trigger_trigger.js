const admin = require("firebase-admin");

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "incaptta-3ee23"
    });
}

const db = admin.firestore();

async function triggerApprovalLetter(id) {
    console.log(`Triggering update for Job Card: ${id}`);
    const docRef = db.collection("jobCards").doc(id);
    await docRef.update({
        triggerRetryAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log("Update sent. Check Cloud Function logs.");
}

const targetId = process.argv[2] || "FCiFutioV0kg55spGWHk";
triggerApprovalLetter(targetId).catch(console.error);
