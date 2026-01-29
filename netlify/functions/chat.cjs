const Groq = require('groq-sdk');

// Rate limiting per session (stored in memory)
// In production, consider using Netlify Blobs or external storage
const sessionLimits = new Map();
const MAX_MESSAGES_PER_SESSION = 20;
const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour

// Portfolio context - Load from environment variable to keep sensitive info out of repo
// This includes CV details, salary expectations, and personal preferences
// Set CHATBOT_CONTEXT in your .env file or Netlify environment variables
// See .env.chatbot-context file for the full context template
const PORTFOLIO_CONTEXT = process.env.CHATBOT_CONTEXT || `You are a helpful AI assistant. Please configure the CHATBOT_CONTEXT environment variable with your full context.`;

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

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: PORTFOLIO_CONTEXT
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
