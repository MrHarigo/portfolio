# Chatbot Setup Guide

This guide will help you set up the AI chatbot feature for your portfolio.

## Overview

The chatbot uses Groq's free API to provide an interactive experience where visitors can ask questions about your experience, skills, and projects.

## Features

- ✅ **Free**: Uses Groq's free tier (1,000 requests/day)
- ✅ **Fast**: Powered by Llama 3.1 70B on Groq's LPU hardware
- ✅ **Secure**: Rate-limited to prevent abuse (20 messages per session)
- ✅ **Context-aware**: Pre-loaded with your portfolio information
- ✅ **Persistent**: Chat history saved in browser localStorage

## Getting Your Groq API Key

### Step 1: Create a Groq Account

1. Visit [Groq Console](https://console.groq.com/keys)
2. Sign up for a free account (no credit card required)
3. Verify your email address

### Step 2: Generate API Key

1. Once logged in, go to [API Keys](https://console.groq.com/keys)
2. Click "Create API Key"
3. Give it a name (e.g., "Portfolio Chatbot")
4. Copy the API key (you won't be able to see it again!)

### Step 3: Add to Environment Variables

#### Local Development

1. Open your `.env` file in the project root
2. Add your Groq API key:
   ```bash
   GROQ_API_KEY='gsk_YOUR_ACTUAL_API_KEY_HERE'
   ```
3. **IMPORTANT:** Add your chatbot context from `.env.chatbot-context`:
   - Copy the entire `CHATBOT_CONTEXT='...'` section from `.env.chatbot-context`
   - Paste it into your `.env` file
   - The context includes your CV details, salary expectations, and recruiter FAQ
   - **Keep this private!** Never commit `.env` to your repository
4. Save the file

#### Netlify Deployment

**Method 1: Using Netlify Blobs (Recommended)**

This method bypasses Netlify's 5000 character limit for environment variables.

1. **Add Groq API Key to Netlify**
   - Go to Netlify Dashboard → Your Site → Site Settings → Environment Variables
   - Add:
     - **Key**: `GROQ_API_KEY`
     - **Value**: Your Groq API key (e.g., `gsk_...`)
     - **Scopes**: Check all

2. **Deploy Your Site First**
   - Push your code to GitHub/GitLab
   - Let Netlify deploy it

3. **Upload Context to Netlify Blobs**

   ```bash
   # Install Netlify CLI if you haven't
   npm install -g netlify-cli

   # Login to Netlify
   netlify login

   # Link your site
   netlify link

   # Upload the context (uses .env.chatbot-context file)
   npm run upload-context
   ```

   Or manually:
   ```bash
   netlify blobs:set chatbot context "$(cat .env.chatbot-context | grep CHATBOT_CONTEXT | cut -d"'" -f2)"
   ```

4. **Verify It Works**
   - Visit your site
   - Click "Chat with Me"
   - Ask a question
   - Check Netlify function logs to see "✅ Loaded context from Netlify Blobs"

**Method 2: Environment Variable (If context is under 5000 chars)**

Only use this if you've significantly shortened your context:

1. Go to Netlify Dashboard → Environment Variables
2. Add `CHATBOT_CONTEXT` with your content
3. Deploy

**Note:** The chatbot automatically tries Netlify Blobs first, then falls back to environment variables.

## Testing Locally

1. Make sure you've added the API key to `.env`
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Visit `http://localhost:4321/`
4. Click the "Chat with Me" button in the Contact section
5. The chat page should open in a new tab

## Usage Limits

### Free Tier (Groq)
- **Requests**: 1,000 per day
- **Tokens**: 6,000 per minute
- **Models**: Full access to Llama 3.1, Mixtral, and more

### Rate Limiting (Per Session)
- **Messages**: 20 per session
- **Session timeout**: 1 hour
- **Character limit**: 500 characters per message

For a low-traffic portfolio site (10-50 visitors/day), this is more than enough.

## Customization

### Update Bot Context

Edit the `PORTFOLIO_CONTEXT` in `netlify/functions/chat.js` to customize what the bot knows about you.

### Adjust Rate Limits

In `netlify/functions/chat.js`:
```javascript
const MAX_MESSAGES_PER_SESSION = 20; // Change this number
const SESSION_TIMEOUT = 60 * 60 * 1000; // Change session duration
```

### Styling

The chat interface is in `src/pages/chat.astro`. All styling uses Tailwind classes and matches your portfolio theme.

## Troubleshooting

### "Chat service not configured" error

**Solution**: Make sure `GROQ_API_KEY` is set in your environment variables.

### "Rate limit exceeded" error

**Solution**: Either wait for your Groq daily limit to reset (midnight UTC) or upgrade to a paid plan.

### Chat not responding

1. Check browser console for errors
2. Verify API key is correct in environment variables
3. Check Netlify function logs for errors

## Security Notes

- ✅ **API key stored in environment variables** (never committed to git)
- ✅ **Chatbot context in environment variables** (keeps salary expectations and personal preferences private)
- ✅ **Rate limiting prevents abuse** (20 messages per session)
- ✅ **Input validation** (max 500 characters per message)
- ✅ **Session-based tracking** prevents spam
- ✅ **XSS protection** via HTML escaping
- ⚠️ **Never commit `.env` or `.env.chatbot-context`** - these contain sensitive information

## Cost Estimation

With Groq's free tier:
- **0-1,000 requests/day**: $0/month
- **Over 1,000 requests/day**: Consider upgrading to Groq's paid plan (~$0.27 per million tokens)

For comparison, with 50 visitors/day averaging 5 messages each:
- **Daily**: ~250 requests
- **Monthly**: ~7,500 requests
- **Cost**: $0 (well within free tier)

## Support

If you encounter issues:
1. Check [Groq Documentation](https://console.groq.com/docs)
2. Review Netlify function logs
3. Check browser console for client-side errors

## Next Steps

After setup:
1. Test the chatbot thoroughly
2. Monitor usage in Groq dashboard
3. Adjust rate limits if needed
4. Update bot context with new projects/skills
