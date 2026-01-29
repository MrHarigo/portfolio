# CV Setup with Google Drive

Your CV is now automatically fetched from Google Drive at build time, so you never have to commit it to git!

## How it Works

1. You upload/update your CV to Google Drive
2. During build, the `scripts/fetch-cv.js` script downloads it
3. The CV is placed in `public/cv.pdf` (ignored by git)
4. The "Last Updated" date is automatically read from the file

## Setup Instructions

### Step 1: Upload CV to Google Drive

1. Upload your CV PDF to Google Drive
2. Right-click the file → Get link
3. Set sharing to "Anyone with the link"

### Step 2: Get the Direct Download URL

From your Google Drive share link:
```
https://drive.google.com/file/d/1ABC123xyz456DEF/view?usp=sharing
```

Extract the FILE_ID (the part between `/d/` and `/view`):
```
1ABC123xyz456DEF
```

Convert to direct download URL:
```
https://drive.google.com/uc?export=download&id=1ABC123xyz456DEF
```

### Step 3: Add to Environment Variables

Add to your `.env` file:
```bash
CV_URL='https://drive.google.com/uc?export=download&id=YOUR_FILE_ID'
```

**Important:** Also add this to Netlify environment variables:
1. Go to Netlify Dashboard → Your Site → Site Settings → Environment Variables
2. Add variable: `CV_URL` with your Google Drive URL
3. Trigger a new deploy

### Step 4: Test Locally

```bash
npm run build
npm run preview
```

Visit http://localhost:4321 and test the Download CV button.

## Updating Your CV

To update your CV:
1. Replace the file in Google Drive (keep the same file - don't create a new one)
2. Trigger a Netlify deploy (push to git, or manual deploy)
3. The new CV is automatically downloaded during build
4. The "Last Updated" date updates automatically

## Alternative: Dropbox or S3

The same approach works with Dropbox or S3:

**Dropbox:**
```
https://www.dropbox.com/s/YOUR_FILE_ID/cv.pdf?dl=1
```

**S3:**
```
https://your-bucket.s3.amazonaws.com/cv.pdf
```

Just update the `CV_URL` environment variable.

## Troubleshooting

**"Failed to fetch CV" error:**
- Verify the Google Drive link is publicly accessible
- Check that the URL format is correct (use `uc?export=download&id=...`)
- Make sure the file ID is correct

**Date not updating:**
- The date is read from the file's last modified time
- It updates automatically when you build after fetching a new CV

**CV not downloading in browser:**
- Check that `public/cv.pdf` exists after build
- Verify the file is not empty (should be > 0 KB)
