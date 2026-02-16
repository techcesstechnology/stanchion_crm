import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, '../public/fonts');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

async function download(url, filename) {
    console.log(`Downloading ${url}...`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(path.join(outputDir, filename), Buffer.from(buffer));
    console.log(`Saved to ${filename}`);
}

try {
    await download('https://github.com/expo/google-fonts/raw/master/font-packages/montserrat/montserrat_400Regular.ttf', 'Montserrat-Regular.ttf');
    await download('https://github.com/expo/google-fonts/raw/master/font-packages/montserrat/montserrat_700Bold.ttf', 'Montserrat-Bold.ttf');
    console.log('All fonts downloaded successfully.');
} catch (error) {
    console.error('Download failed:', error);
    process.exit(1);
}
