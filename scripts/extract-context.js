import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the .env.chatbot-context file
const envFilePath = join(__dirname, '..', '.env.chatbot-context');
const fileContent = readFileSync(envFilePath, 'utf-8');

// Find the line that starts with CHATBOT_CONTEXT='
const lines = fileContent.split('\n');
const startIndex = lines.findIndex(line => line.startsWith('CHATBOT_CONTEXT=\''));

if (startIndex === -1) {
  console.error('Could not find CHATBOT_CONTEXT');
  process.exit(1);
}

// Extract everything from CHATBOT_CONTEXT=' onwards
const contextLines = lines.slice(startIndex);
const fullContext = contextLines.join('\n');

// Remove CHATBOT_CONTEXT=' prefix
let context = fullContext.substring('CHATBOT_CONTEXT=\''.length);

// Remove the trailing ' that closes the variable assignment
// The format is: CHATBOT_CONTEXT='<content>'
// We need to find the last ' and remove it along with any whitespace after
context = context.trimEnd();
if (context.endsWith('\'')) {
  context = context.substring(0, context.length - 1);
}

// Unescape single quotes (replace '\'' with ')
context = context.replace(/'\\''/g, "'");

// Output to stdout (will be piped to netlify blobs:set)
process.stdout.write(context);
