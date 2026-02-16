const fs = require('fs');
const path = require('path');

const imagePath = 'C:/Users/REAL TIME/.gemini/antigravity/brain/23be0197-7d09-44ac-9364-7587ea5356ec/uploaded_media_1770126668800.jpg';
const outputPath = 'c:/Users/REAL TIME/Documents/willardpro/Stanchion_CRM/src/utils/officialSeal.ts';

try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64String = imageBuffer.toString('base64');

    const fileContent = `// Official Seal Image Asset
// Generated from uploaded_media_1770126668800.jpg

export const OFFICIAL_SEAL = 'data:image/jpeg;base64,${base64String}';
`;

    fs.writeFileSync(outputPath, fileContent);
    console.log(`Successfully created ${outputPath}`);
} catch (error) {
    console.error('Error processing image:', error);
    process.exit(1);
}
