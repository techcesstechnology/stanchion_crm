const admin = require('firebase-admin');
const email = process.argv[2];

if (!email) {
    console.error('Please provide an email address.');
    process.exit(1);
}

// Ensure we are using the correct project
process.env.FB_PROJECT_ID = 'incaptta-3ee23';

admin.initializeApp({
    projectId: 'incaptta-3ee23'
});

const db = admin.firestore();

async function promoteUser() {
    try {
        console.log(`Checking if user exists: ${email}...`);

        // 1. Get user by email
        let user;
        try {
            user = await admin.auth().getUserByEmail(email);
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                console.error(`ERROR: User with email ${email} not found in Firebase Auth.`);
                console.log('Please register on the website first, or check the email spelling.');
                process.exit(1);
            }
            throw e;
        }

        console.log(`Found user in Auth: ${user.uid}`);

        // 2. Set Custom Claims
        console.log('Setting custom claims...');
        await admin.auth().setCustomUserClaims(user.uid, { admin: true });
        console.log('Custom claims (admin: true) set successfully.');

        // 3. Update/Create User Profile in Firestore
        console.log('Updating Firestore profile...');
        await db.collection('userProfiles').doc(user.uid).set({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || email.split('@')[0],
            role: 'ADMIN',
            active: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log(`SUCCESS: User ${email} is now a Super Admin.`);
        console.log('You can now log in to https://incaptta-3ee23.web.app and access the Super Admin console.');
        process.exit(0);
    } catch (error) {
        console.error('CRITICAL ERROR:', error.message);
        if (error.code) console.error('Error Code:', error.code);
        process.exit(1);
    }
}

promoteUser();
