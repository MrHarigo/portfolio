import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EXPECTED_MIN_LENGTH = 8000; // Context should be ~9000 characters
const EXPECTED_MAX_LENGTH = 15000; // Sanity check for unexpected content

try {
  // Read the .env.chatbot-context file
  const envFilePath = join(__dirname, '..', '.env.chatbot-context');

  let fileContent;
  try {
    fileContent = readFileSync(envFilePath, 'utf-8');
  } catch (error) {
    console.error(`❌ Failed to read file: ${envFilePath}`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Make sure .env.chatbot-context exists in the project root`);
    process.exit(1);
  }

  // Find the line that starts with CHATBOT_CONTEXT='
  const lines = fileContent.split('\n');
  const startIndex = lines.findIndex(line => line.startsWith('CHATBOT_CONTEXT=\''));

  if (startIndex === -1) {
    console.error('❌ Could not find CHATBOT_CONTEXT in .env.chatbot-context file');
    console.error('   Expected format: CHATBOT_CONTEXT=\'<content>\'');
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

  // Validate extracted context
  const contextLength = context.length;

  if (contextLength === 0) {
    console.error('❌ Extracted context is empty');
    process.exit(1);
  }

  if (contextLength < EXPECTED_MIN_LENGTH) {
    console.error(`⚠️  Warning: Context is only ${contextLength} characters`);
    console.error(`   Expected at least ${EXPECTED_MIN_LENGTH} characters`);
    console.error(`   The context may be incomplete`);
    process.exit(1);
  }

  if (contextLength > EXPECTED_MAX_LENGTH) {
    console.error(`⚠️  Warning: Context is ${contextLength} characters`);
    console.error(`   This is unusually large (expected ~${EXPECTED_MIN_LENGTH}-${EXPECTED_MAX_LENGTH})`);
    console.error(`   Please verify the .env.chatbot-context file format`);
  }

  // Log success to stderr (stdout is used for piping the content)
  console.error(`✅ Successfully extracted ${contextLength} characters from context`);

  // Check if context includes key sections
  const hasPersonalInfo = context.includes('PERSONAL INFORMATION:');
  const hasExperience = context.includes('EXPERIENCE SUMMARY:');
  const hasScopeLimitations = context.includes('STRICT SCOPE LIMITATIONS:');

  if (!hasPersonalInfo || !hasExperience || !hasScopeLimitations) {
    console.error('⚠️  Warning: Context may be incomplete:');
    if (!hasPersonalInfo) console.error('   - Missing PERSONAL INFORMATION section');
    if (!hasExperience) console.error('   - Missing EXPERIENCE SUMMARY section');
    if (!hasScopeLimitations) console.error('   - Missing STRICT SCOPE LIMITATIONS section');
  } else {
    console.error('✅ All expected sections found in context');
  }

  // Output to stdout (will be piped to netlify blobs:set)
  process.stdout.write(context);

} catch (error) {
  console.error('❌ Unexpected error during context extraction:');
  console.error(`   ${error.message}`);
  if (error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  process.exit(1);
}
