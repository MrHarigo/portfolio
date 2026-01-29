const Groq = require('groq-sdk');
const { getStore } = require('@netlify/blobs');

// Rate limiting per session (stored in memory)
// In production, consider using Netlify Blobs or external storage
const sessionLimits = new Map();
const MAX_MESSAGES_PER_SESSION = 20;
const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour

// Cache for context to avoid repeated Blob reads
// Cache expires after 5 minutes to allow updates without full redeployment
// Also invalidates immediately when blob ETag changes (content updated)
let cachedContext = null;
let cacheTimestamp = 0;
let cachedETag = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get chatbot context from Netlify Blobs or environment variable
 *
 * Production: Reads from Netlify Blobs (uploaded via: npm run upload-context)
 * Local dev: Reads from CHATBOT_CONTEXT in .env file
 *
 * Context is stored in .env.chatbot-context and uploaded to Blobs to bypass
 * Netlify's 5000 character limit for environment variables
 */
async function getContext() {
  const now = Date.now();

  try {
    // Try to get from Netlify Blobs first (production)
    const store = getStore('chatbot');

    // Check if blob has been updated by comparing ETag
    // This allows immediate cache invalidation when context is updated
    if (cachedContext && cachedETag) {
      try {
        const metadata = await store.getMetadata('context');

        if (metadata && metadata.etag && metadata.etag !== cachedETag) {
          console.log('🔄 Context updated (ETag changed), invalidating cache');
          cachedContext = null;
          cachedETag = null;
        }
      } catch (metadataError) {
        // If metadata fetch fails, fall back to TTL-based caching
        console.log('ℹ️  Could not fetch metadata, using TTL-based cache');
      }
    }

    // Check if cache is still valid (within TTL and not invalidated by ETag)
    if (cachedContext && (now - cacheTimestamp < CACHE_TTL)) {
      console.log('✅ Using cached context');
      return cachedContext;
    }

    // Fetch fresh context from Blobs
    const context = await store.get('context', { type: 'text' });

    if (context) {
      // Get metadata to store ETag for future comparisons
      let etag = null;
      try {
        const metadata = await store.getMetadata('context');
        etag = metadata?.etag;
      } catch (metadataError) {
        console.log('ℹ️  Could not fetch metadata for ETag tracking');
      }

      console.log(`✅ Loaded context from Netlify Blobs (${context.length} characters)`);
      cachedContext = context;
      cacheTimestamp = Date.now();
      cachedETag = etag;

      if (etag) {
        console.log(`📌 Cached with ETag: ${etag.substring(0, 8)}...`);
      }

      return context;
    }
  } catch (error) {
    console.log('ℹ️  Netlify Blobs not available, trying environment variable');
  }

  // Fallback to environment variable (local development)
  if (process.env.CHATBOT_CONTEXT) {
    console.log('✅ Loaded context from environment variable');
    cachedContext = process.env.CHATBOT_CONTEXT;
    cacheTimestamp = Date.now();
    return cachedContext;
  }

  // No context available
  console.error('❌ No chatbot context configured');
  return 'You are a helpful AI assistant. Please configure the chatbot context.';
}

exports.handler = async (event, context) => {
  try {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Parse request body
    const { message, sessionId } = JSON.parse(event.body);

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Message is required' })
      };
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Session ID is required' })
      };
    }

    // Rate limiting check
    const now = Date.now();
    let sessionData = sessionLimits.get(sessionId);

    // Clean up expired session
    if (sessionData && (now - sessionData.startTime > SESSION_TIMEOUT)) {
      sessionLimits.delete(sessionId);
      sessionData = null;
    }

    // Initialize or update session
    if (!sessionData) {
      sessionData = {
        count: 0,
        startTime: now
      };
      sessionLimits.set(sessionId, sessionData);
    }

    // Check rate limit
    if (sessionData.count >= MAX_MESSAGES_PER_SESSION) {
      return {
        statusCode: 429,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'You\'ve reached the maximum number of messages for this session. Please start a new conversation later.'
        })
      };
    }

    // Increment message count
    sessionData.count++;

    // Validate message length (prevent abuse)
    if (message.length > 500) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Message too long (max 500 characters)' })
      };
    }

    // Check if GROQ_API_KEY is configured
    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY not configured');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Chat service not configured',
          message: 'Please contact the site administrator.'
        })
      };
    }

    // Initialize Groq client
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });

    // Get chatbot context (from Blobs or env var)
    const portfolioContext = await getContext();

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: portfolioContext
        },
        {
          role: 'user',
          content: message
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 500,
      top_p: 1,
      stream: false
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error('No response from AI');
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        response,
        remainingMessages: MAX_MESSAGES_PER_SESSION - sessionData.count
      })
    };

  } catch (error) {
    console.error('Error in chat function:', error);

    // Handle specific Groq API errors
    if (error.status === 401) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Authentication failed',
          message: 'Chat service configuration error. Please contact the site administrator.'
        })
      };
    }

    if (error.status === 429) {
      return {
        statusCode: 429,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'The chat service is temporarily unavailable. Please try again later.'
        })
      };
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to process chat message',
        message: 'An error occurred. Please try again.'
      })
    };
  }
};
