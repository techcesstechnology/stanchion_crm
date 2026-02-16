const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require('../incaptta-79574-firebase-adminsdk-fbsvc-a411a9066a.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const email = process.argv[2];

if (!email) {
    console.error('Please provide an email address.');
    process.exit(1);
}

const setSuperUser = async (email) => {
    try {
        console.log(`Looking up user by email: ${email}`);
        let user;
        try {
            user = await admin.auth().getUserByEmail(email);
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                console.log('User not found. Creating new user...');
                user = await admin.auth().createUser({
                    email: email,
                    emailVerified: true,
                    password: 'password123', // Default password
                    displayName: 'Super User'
                });
                console.log(`User created with UID: ${user.uid}`);
            } else {
                throw e;
            }
        }

        console.log(`Found user ${user.uid}. Setting custom claims...`);

        await admin.auth().setCustomUserClaims(user.uid, {
            ...user.customClaims,
            superUser: true,
            admin: true // Also grant admin for backwards compatibility if needed
        });

        console.log(`Success! ${email} has been promoted to Super User.`);
        process.exit(0);
    } catch (error) {
        console.error('Error setting super user:', error);
        process.exit(1);
    }
};

setSuperUser(email);
