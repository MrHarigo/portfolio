# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a personal portfolio website built with Astro, TailwindCSS, and deployed on Netlify. It features a code editor-inspired design with tabbed navigation showing different sections (About, Projects, Certifications).

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

## Architecture

### SSR Configuration
- **Output mode**: Server-side rendered (`output: 'server'`)
- **Adapter**: Netlify (`@astrojs/netlify`)
- **Deployment**: Configured for Netlify Functions

### Project Structure
```
src/
├── components/     # Reusable Astro components
│   ├── Profile.astro
│   ├── Contact.astro
│   ├── Socials.astro
│   ├── ContentAbout.astro
│   ├── ContentProjects.astro
│   ├── ContentCertifications.astro
│   ├── ContentLink.astro      # Tab navigation component
│   └── SocialIcon.astro
├── layouts/
│   └── Layout.astro            # Base layout with SEO meta tags
├── pages/
│   └── index.astro             # Main page with tab system
├── styles/
│   └── global.scss             # Global CSS reset
└── assets/
    └── profile.png

netlify/functions/
├── ga4-visitors.cjs            # Serverless function for GA4 analytics
└── chat.cjs                    # Serverless function for AI chatbot
```

### Key Architectural Patterns

#### Tabbed Interface System
The main page (`src/pages/index.astro`) uses a CSS-only tab system:
- Hidden radio buttons control tab state (`#tab1`, `#tab2`, `#tab3`)
- CSS sibling selectors show/hide content based on checked state
- Each tab corresponds to a "file" in the code editor theme (about.ts, projects.md, certs.json)
- No JavaScript required for tab switching

#### Component Organization
- **Left sidebar** (`w-full md:w-2/5`): Profile + Contact components
- **Right content area** (`w-full md:w-4/5`): Tabbed content with sticky navigation bar
- Layout uses Flexbox with responsive breakpoints

#### Analytics Integration
- **Netlify Function** (`netlify/functions/ga4-visitors.js`): Fetches visitor counts from Google Analytics 4
- **Caching**: 1-hour cache to reduce API calls
- **Project Mapping**: Maps project IDs to hostnames (harigo.me, daily.harigo.me, planner.harigo.me, share.harigo.me)
- **Environment**: Uses `GA4_CREDENTIALS` from `.env` (stringified service account JSON)
- **GA4 Property**: All projects use property ID `489929948` (measurement ID: `G-WX0M47C15W`)
- **Visitor Counts**: Each project shows separate visitor counts based on hostname dimension

### Styling Architecture

#### TailwindCSS Setup
- Primary color: `#F43F5E` (rose/pink accent)
- Dark theme: Black background (`bg-black`) with gray borders and text
- Responsive utilities: Mobile-first with `md:` breakpoints
- Global reset in `src/styles/global.scss`

#### Design System
- Monospace font (`font-mono`) for code editor aesthetic
- Border style: Gray borders (`border-gray-600`) with rounded corners
- Card-based layout with shadow effects
- Sticky footer with credits

### SEO Configuration
All SEO metadata is centralized in `src/layouts/Layout.astro`:
- Canonical URLs
- Open Graph tags
- Google Analytics (gtag.js)
- Sitemap integration
- Geo region targeting (JP-TOK)

## CV Download Feature

The portfolio includes a downloadable CV feature that fetches the PDF from cloud storage at build time:

### How It Works
- **Build-time fetch**: `scripts/fetch-cv.js` downloads CV from URL during build
- **Cloud storage**: CV stored in Google Drive (or S3/Dropbox)
- **Auto-dating**: Last updated date is automatically read from file metadata
- **Git-excluded**: CV is never committed to repository (in `.gitignore`)

### Implementation Details
- **Download button**: Located in `src/components/Contact.astro`
- **Build process**: `npm run build` fetches CV before Astro build
- **File location**: Downloaded to `public/cv.pdf` (git-ignored)
- **Date detection**: Uses Node.js `fs.statSync()` to read file's `mtime`

### Updating the CV
1. Replace file in Google Drive (keep same file ID)
2. Trigger Netlify deploy
3. Build script automatically downloads new version
4. Last updated date updates automatically

## Chatbot Feature

The portfolio includes an AI-powered chatbot that allows recruiters and visitors to ask questions about experience, skills, and projects.

### How It Works
- **Full-page interface**: Accessible at `/chat/` in a new tab
- **AI Provider**: Uses Groq API with Llama 3.1 70B model (free tier)
- **Context-aware**: Pre-loaded with portfolio information (projects, skills, certifications)
- **Rate limiting**: 20 messages per session to prevent abuse
- **Session persistence**: Chat history stored in localStorage

### Implementation Details
- **Chat page**: `src/pages/chat.astro` - Full-screen chat interface with vanilla JS
- **Button**: Located in `src/components/Contact.astro` - Opens chat in new tab
- **Function**: `netlify/functions/chat.cjs` - Handles Groq API integration
- **Styling**: Matches portfolio aesthetic (dark theme, monospace, rose accent)

### Free Tier Limits
- **Groq API**: 1,000 requests per day (free)
- **Per session**: 20 messages maximum
- **Session timeout**: 1 hour

### Chatbot Context
The bot has knowledge about:
- Full name, location, and role
- Technical skills (frontend, backend, DevOps)
- All portfolio projects with descriptions
- Certifications (AWS SAA, AWS CCP, JLPT N1)
- Contact information

### Getting Groq API Key
1. Visit https://console.groq.com/keys
2. Sign up for a free account
3. Create a new API key
4. Add to `.env` as `GROQ_API_KEY`
5. Deploy to Netlify and add to environment variables

## Environment Variables

Required in `.env`:
```bash
GA4_CREDENTIALS='{...}'  # Stringified GA4 service account JSON
CV_URL='https://drive.google.com/uc?export=download&id=FILE_ID'  # Google Drive direct download URL
GROQ_API_KEY='your_groq_api_key_here'  # Groq API key for chatbot (get at console.groq.com)
```

## Build Optimizations

Configured in `astro.config.mjs`:
- **CSS minification**: Enabled
- **HTML minification**: Collapses whitespace, removes comments
- **JavaScript**: Drops console logs and debugger statements in production
- **Compression**: Via `astro-compress` plugin
- **Sitemap**: Auto-generated
- **Trailing slashes**: Always added to URLs

## Adding New Projects

Edit `src/components/ContentProjects.astro`:
1. Add new project object to the `projects` array with required fields:
   - `name`: Project title
   - `description`: Brief description
   - `link.url`: Project URL
   - `link.buttonLabel`: Button text
   - `id`: Unique identifier for GA4 tracking
2. If project has analytics, update `netlify/functions/ga4-visitors.js`:
   - Add mapping in `PROJECT_HOSTNAMES` object

## Important Notes

- No client-side JavaScript for core functionality (tabs are CSS-only)
- Shiki is used for syntax highlighting in code blocks
- Site uses trailing slashes for all URLs (`trailingSlash: 'always'`)
- Analytics data is cached for 1 hour in the serverless function
