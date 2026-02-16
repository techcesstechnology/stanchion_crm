const admin = require('firebase-admin');
const serviceAccount = require('../incaptta-79574-firebase-adminsdk-fbsvc-a411a9066a.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const email = "edmundtafadzwa@gmail.com";
const password = "password123"; // Default temporary password
const firstName = "Edmund";
const lastName = "Muzata";
const role = "admin";
const position = "Admin";

const createAdmin = async () => {
    try {
        console.log(`Checking if user ${email} exists...`);
        let user;
        try {
            user = await admin.auth().getUserByEmail(email);
            console.log(`User already exists (UID: ${user.uid}). Updating profile...`);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                console.log(`Creating new user ${email}...`);
                user = await admin.auth().createUser({
                    email,
                    password,
                    displayName: `${firstName} ${lastName}`,
                    emailVerified: true
                });
                console.log(`User created (UID: ${user.uid})`);
            } else {
                throw error;
            }
        }

        // Set Custom Claims
        console.log("Setting custom claims...");
        await admin.auth().setCustomUserClaims(user.uid, {
            admin: true,
            role: 'admin'
        });

        // Create/Update Firestore Profile
        console.log("Updating Firestore profile...");
        await admin.firestore().collection("userProfiles").doc(user.uid).set({
            uid: user.uid,
            email: user.email,
            firstName: firstName,
            lastName: lastName,
            position: position,
            role: role,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        console.log(`Success! Admin user ${email} is ready.`);
        process.exit(0);
    } catch (error) {
        console.error("Error creating admin user:", error);
        process.exit(1);
    }
};

createAdmin();
