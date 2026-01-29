/**
 * Upload chatbot context to Netlify Blobs
 * Run this script to update the chatbot context in production
 *
 * Usage:
 *   node scripts/upload-chatbot-context.js
 *
 * Or with Netlify CLI:
 *   netlify env:import .env
 *   node scripts/upload-chatbot-context.js
 */

import { getStore } from '@netlify/blobs';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function uploadContext() {
  try {
    // Get the context from environment variable
    const context = process.env.CHATBOT_CONTEXT;

    if (!context) {
      console.error('❌ CHATBOT_CONTEXT not found in environment variables');
      console.error('   Make sure to set it in your .env file');
      process.exit(1);
    }

    console.log('📤 Uploading chatbot context to Netlify Blobs...');
    console.log(`   Context length: ${context.length} characters`);

    // Get the chatbot store
    const store = getStore('chatbot');

    // Upload the context
    await store.set('context', context);

    console.log('✅ Context uploaded successfully!');
    console.log('   The chatbot will now use this context in production');
    console.log('   Update with: node scripts/upload-chatbot-context.js');

  } catch (error) {
    console.error('❌ Failed to upload context:', error.message);

    if (error.message.includes('NETLIFY_BLOBS_CONTEXT')) {
      console.error('');
      console.error('   This script must be run in a Netlify context.');
      console.error('   Options:');
      console.error('   1. Run via Netlify CLI: netlify dev');
      console.error('   2. Deploy to Netlify and run in production');
      console.error('   3. For local testing, context is loaded from .env');
    }

    process.exit(1);
  }
}

uploadContext();
