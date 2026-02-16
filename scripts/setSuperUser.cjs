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

async function listAllUsers(nextPageToken) {
    // List batch of users, 1000 at a time.
    try {
        const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
        listUsersResult.users.forEach((userRecord) => {
            console.log('user', userRecord.toJSON());
        });
        if (listUsersResult.pageToken) {
            // List next batch of users.
            listAllUsers(listUsersResult.pageToken);
        }
    } catch (error) {
        console.log('Error listing users:', error);
    }
}

async function setSuperUser(userEmail) {
    try {
        console.log(`Looking up user with email: ${userEmail}...`);
        let user;
        try {
            user = await admin.auth().getUserByEmail(userEmail);
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                console.log(`User ${userEmail} not found. Creating new user...`);
                // Create the user with a temporary password
                user = await admin.auth().createUser({
                    email: userEmail,
                    password: 'temporaryPassword123!',
                    displayName: 'Super Admin',
                });
                console.log(`User created with UID: ${user.uid} and password: temporaryPassword123!`);
            } else {
                throw e;
            }
        }

        console.log(`Found user ${user.uid}. Setting superUser claim...`);

        const currentCustomClaims = user.customClaims || {};

        await admin.auth().setCustomUserClaims(user.uid, {
            ...currentCustomClaims,
            superUser: true
        });

        console.log(`Successfully set superUser claim for ${userEmail}`);

        const profileRef = admin.firestore().collection('userProfiles').doc(user.uid);
        const doc = await profileRef.get();

        if (doc.exists) {
            await profileRef.update({
                roles: admin.firestore.FieldValue.arrayUnion('superUser'),
                isSuperUser: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log('Updated existing Firestore userProfiles document.');
        } else {
            console.log('Creating new Firestore userProfiles document.');
            await profileRef.set({
                uid: user.uid,
                email: user.email,
                firstName: 'Super',
                lastName: 'Admin',
                position: 'Super Admin',
                roles: ['superUser', 'admin'],
                isSuperUser: true,
                role: 'admin', // Deprecated but kept for compatibility
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log('Created new Firestore profile.');
        }

    } catch (error) {
        console.error('Error setting superUser claim:', error);
    }
}

if (!email) {
    console.log('No email provided. Listing all users...');
    listAllUsers();
} else {
    setSuperUser(email);
}
