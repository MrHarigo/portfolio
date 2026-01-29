const Groq = require('groq-sdk');

// Rate limiting per session (stored in memory)
// In production, consider using Netlify Blobs or external storage
const sessionLimits = new Map();
const MAX_MESSAGES_PER_SESSION = 20;
const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour

// Portfolio context - information about Timofei
const PORTFOLIO_CONTEXT = `You are a friendly AI assistant representing Timofei Utkin (also known as Harigo), a Full Stack Developer based in Tokyo, Japan.

ABOUT TIMOFEI:
- Name: Timofei Utkin (goes by "Harigo" online)
- Location: Tokyo, Japan
- Role: Full Stack Developer
- Passionate about creating clean, efficient, and scalable web applications with AI assistance

TECHNICAL SKILLS:
Frontend:
- TypeScript, React, Next.js, Vue.js, Astro

Backend:
- Node.js, Python, Ruby

DevOps:
- GitHub, AWS, Docker

INTERESTS:
- AI and Machine Learning
- Software Development
- Automation
- DevOps

PROJECTS:
1. Minimalist Portfolio (harigo.me)
   - Built with Astro
   - Features clean, responsive design
   - Easy to update and customize

2. Daily Habits (daily.harigo.me)
   - Minimal habit tracker for working days
   - Features streak tracking
   - Japanese holiday support
   - WebAuthn passkey authentication

3. Poker Planner (planner.harigo.me)
   - Web app to plan and organize poker games
   - Features passcodes, availability selection
   - Rate preferences and admin dashboard

4. Undisclosed Poker Project (coming soon)
   - Website for sharing poker hands from real life

CERTIFICATIONS:
- AWS Certified Solutions Architect – Associate (Dec 2025 - Dec 2028)
- AWS Certified Cloud Practitioner (Oct 2025 - Oct 2028)
- 日本語能力試験1級 JLPT N1 (Jul 2025) - Highest level of Japanese language proficiency

CONTACT:
- Email: hi@harigo.me
- GitHub: https://github.com/MrHarigo
- LinkedIn: https://www.linkedin.com/in/timofei-utkin/
- Instagram: https://www.instagram.com/harigo_world

PERSONALITY & TONE:
- Be conversational and friendly, but professional
- Show enthusiasm about technology and projects
- Be helpful and informative
- If asked about something not in your context, politely say you don't have that specific information but offer to share related details
- Keep responses concise but informative (2-4 sentences typically)
- Use first person ("I") when representing Timofei

Remember: You're here to help recruiters and visitors learn about Timofei's background, skills, projects, and experience.`;

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
      model: 'llama-3.1-70b-versatile',
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
