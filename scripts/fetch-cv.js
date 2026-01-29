/**
 * Fetch CV from cloud storage at build time
 * This script downloads the CV PDF from a URL specified in environment variables
 */

import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CV_URL = process.env.CV_URL;
const OUTPUT_PATH = join(__dirname, '../public/cv.pdf');

async function fetchCV() {
  if (!CV_URL) {
    console.warn('⚠️  CV_URL not set in environment variables. Skipping CV download.');
    console.warn('   Set CV_URL to your cloud storage URL (S3, Dropbox, Google Drive)');
    return;
  }

  try {
    console.log('📄 Fetching CV from cloud storage...');

    const response = await fetch(CV_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch CV: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();

    // Ensure public directory exists
    await mkdir(dirname(OUTPUT_PATH), { recursive: true });

    // Write the PDF file
    await writeFile(OUTPUT_PATH, Buffer.from(buffer));

    console.log('✅ CV downloaded successfully');
    console.log(`   Size: ${(buffer.byteLength / 1024).toFixed(2)} KB`);
    console.log(`   Location: public/cv.pdf`);

    // Get last-modified header if available
    const lastModified = response.headers.get('last-modified');
    if (lastModified) {
      console.log(`   Last modified: ${new Date(lastModified).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
    }
  } catch (error) {
    console.error('❌ Failed to fetch CV:', error.message);
    console.error('   Make sure CV_URL is a valid, publicly accessible URL');
    process.exit(1);
  }
}

fetchCV();
