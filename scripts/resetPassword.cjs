const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, '../incaptta-79574-firebase-adminsdk-fbsvc-a411a9066a.json');

try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully.');
} catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    process.exit(1);
}

const args = process.argv.slice(2);
const email = args[0];
const newPassword = args[1];

if (!email || !newPassword) {
    console.error('Usage: node scripts/resetPassword.cjs <email> <newPassword>');
    process.exit(1);
}

async function resetPassword(userEmail, password) {
    try {
        console.log(`Looking up user with email: ${userEmail}...`);
        const user = await admin.auth().getUserByEmail(userEmail);

        console.log(`Found user ${user.uid}. Updating password...`);

        await admin.auth().updateUser(user.uid, {
            password: password
        });

        console.log(`Successfully updated password for ${userEmail}`);

    } catch (error) {
        console.error('Error updating password:', error);
        process.exit(1);
    }
}

resetPassword(email, newPassword);
