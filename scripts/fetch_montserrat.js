import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputDir = path.join(__dirname, '../public/fonts');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

function fetch(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetch(res.headers.location).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode !== 200) {
                res.resume();
                reject(new Error(`Status ${res.statusCode} for ${url}`));
                return;
            }
            const data = [];
            res.on('data', (chunk) => data.push(chunk));
            res.on('end', () => resolve(Buffer.concat(data)));
        }).on('error', reject);
    });
}

async function run() {
    console.log('Fetching Montserrat fonts...');
    try {
        const regularUrl = 'https://github.com/expo/google-fonts/raw/master/font-packages/montserrat/montserrat_400Regular.ttf';
        const boldUrl = 'https://github.com/expo/google-fonts/raw/master/font-packages/montserrat/montserrat_700Bold.ttf';

        console.log(`Downloading Regular: ${regularUrl}`);
        const regularBuffer = await fetch(regularUrl);
        fs.writeFileSync(path.join(outputDir, 'Montserrat-Regular.ttf'), regularBuffer);

        console.log(`Downloading Bold: ${boldUrl}`);
        const boldBuffer = await fetch(boldUrl);
        fs.writeFileSync(path.join(outputDir, 'Montserrat-Bold.ttf'), boldBuffer);

        console.log(`Successfully saved fonts to ${outputDir}`);

    } catch (err) {
        console.error('Fatal Error:', err);
        process.exit(1);
    }
}

run();
