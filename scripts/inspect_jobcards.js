const admin = require("firebase-admin");

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "incaptta-3ee23"
    });
}

const db = admin.firestore();

async function inspectLatestJobCards() {
    console.log("Fetching latest 5 Job Cards...");
    const snapshot = await db.collection("jobCards")
        .orderBy("updatedAt", "desc")
        .limit(5)
        .get();

    if (snapshot.empty) {
        console.log("No job cards found.");
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`--- Job Card: ${doc.id} ---`);
        console.log(`Project: ${data.projectName}`);
        console.log(`Status: ${data.status}`);
        console.log(`PDF Generated (field): ${data.pdfGenerated}`);
        console.log(`Approval Letter (field):`, JSON.stringify(data.approvalLetter, null, 2));
        if (data.pdfError) {
            console.log(`PDF Error: ${data.pdfError}`);
        }
        console.log('---------------------------');
    });
}

inspectLatestJobCards().catch(console.error);
