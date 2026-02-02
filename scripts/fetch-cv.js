/**
 * Fetch CV from cloud storage at build time
 * This script downloads the CV PDF from a URL specified in environment variables
 * and generates metadata for use in the Astro component
 */

import { writeFile, mkdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CV_URL = process.env.CV_URL;
const OUTPUT_PATH = join(__dirname, '../public/cv.pdf');
const METADATA_PATH = join(__dirname, '../src/data/cv-metadata.json');

async function fetchCV() {
  if (!CV_URL) {
    console.warn('⚠️  CV_URL not set in environment variables. Skipping CV download.');
    console.warn('   Set CV_URL to your cloud storage URL (S3, Dropbox, Google Drive)');

    // Generate default metadata for dev builds
    await generateDefaultMetadata();
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

    // Get last-modified header from HTTP response
    const lastModifiedHeader = response.headers.get('last-modified');

    // Generate metadata using HTTP Last-Modified header if available
    await generateMetadata(lastModifiedHeader);

    if (lastModifiedHeader) {
      console.log(`   Last modified: ${new Date(lastModifiedHeader).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
    }
  } catch (error) {
    console.error('❌ Failed to fetch CV:', error.message);
    console.error('   Make sure CV_URL is a valid, publicly accessible URL');
    process.exit(1);
  }
}

async function generateMetadata(lastModifiedHeader = null) {
  try {
    // Read file stats for size
    const stats = await stat(OUTPUT_PATH);

    // Use HTTP Last-Modified header if available, otherwise fall back to file mtime
    let lastModified;
    if (lastModifiedHeader) {
      lastModified = new Date(lastModifiedHeader);
      console.log('ℹ️  Using Last-Modified from HTTP header');
    } else {
      lastModified = new Date(stats.mtime);
      console.log('⚠️  Using file mtime (HTTP Last-Modified header not available)');
    }

    // Generate metadata
    const metadata = {
      lastModified: lastModified.toISOString(),
      displayDate: lastModified.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      }),
      year: lastModified.getFullYear(),
      month: lastModified.toLocaleDateString('en-US', { month: 'short' }),
      fileName: `CV_Utkin_Timofei_${lastModified.getFullYear()}_${lastModified.toLocaleDateString('en-US', { month: 'short' })}.pdf`,
      sizeKB: Math.round(stats.size / 1024)
    };

    // Ensure data directory exists
    await mkdir(dirname(METADATA_PATH), { recursive: true });

    // Write metadata file
    await writeFile(METADATA_PATH, JSON.stringify(metadata, null, 2));

    console.log('✅ CV metadata generated');
    console.log(`   Filename: ${metadata.fileName}`);
    console.log(`   Display date: ${metadata.displayDate}`);
  } catch (error) {
    console.error('❌ Failed to generate metadata:', error.message);
    process.exit(1);
  }
}

async function generateDefaultMetadata() {
  try {
    // Use current date as fallback
    const now = new Date();

    const metadata = {
      lastModified: now.toISOString(),
      displayDate: now.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      }),
      year: now.getFullYear(),
      month: now.toLocaleDateString('en-US', { month: 'short' }),
      fileName: `CV_Utkin_Timofei_${now.getFullYear()}_${now.toLocaleDateString('en-US', { month: 'short' })}.pdf`,
      sizeKB: 0
    };

    // Ensure data directory exists
    await mkdir(dirname(METADATA_PATH), { recursive: true });

    // Write metadata file
    await writeFile(METADATA_PATH, JSON.stringify(metadata, null, 2));

    console.warn('⚠️  Using default metadata (CV not downloaded)');
  } catch (error) {
    console.error('❌ Failed to generate default metadata:', error.message);
  }
}

fetchCV();
