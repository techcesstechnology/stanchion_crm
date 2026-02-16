/**
 * Script to check and display current company settings from Firestore
 * This will help debug the logo issue
 */

import admin from 'firebase-admin';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccountPath = join(__dirname, '..', 'incaptta-79574-firebase-adminsdk-fbsvc-a411a9066a.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkSettings() {
    try {
        console.log('Checking company settings in Firestore...\n');

        const settingsRef = db.collection('settings').doc('company-config');
        const doc = await settingsRef.get();

        if (doc.exists) {
            const data = doc.data();
            console.log('Company Settings found:');
            console.log('------------------------');
            console.log('Company Name:', data.companyName || '(not set)');
            console.log('Email:', data.email || '(not set)');
            console.log('Phone:', data.phone || '(not set)');
            console.log('Address:', data.address || '(not set)');
            console.log('\nLogo URL:');
            if (data.logoUrl) {
                if (data.logoUrl.startsWith('data:')) {
                    console.log('  Type: Base64 Data URL');
                    console.log('  Length:', data.logoUrl.length, 'characters');
                    console.log('  First 80 chars:', data.logoUrl.substring(0, 80) + '...');
                } else {
                    console.log('  Type: External URL (Firebase Storage)');
                    console.log('  URL:', data.logoUrl);
                    console.log('\n  WARNING: This is a Firebase Storage URL which will cause CORS issues!');
                    console.log('  The user needs to re-upload the logo through the Settings page.');
                }
            } else {
                console.log('  (No logo set)');
            }
        } else {
            console.log('No company settings found in Firestore.');
            console.log('The user needs to configure company settings first.');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        process.exit(0);
    }
}

checkSettings();
