# Deployment Guide

This guide will help you deploy the Flashcards app to various hosting platforms.

## Pre-Deployment Checklist

✅ Progress data is excluded from git (in .gitignore)
✅ Server auto-creates progress directory on startup
✅ All deck content is committed to repository
✅ Environment variables configured (PORT)
✅ Git repository initialized and committed

## Option 1: Railway (Recommended)

Railway offers the easiest deployment with automatic builds and free tier.

### Steps:

1. **Create Railway account**: Go to https://railway.app and sign up

2. **Create new project**: Click "New Project" → "Deploy from GitHub repo"

3. **Connect repository**: 
   - If deploying from GitHub: Connect your GitHub account and select the repository
   - If deploying locally: Use Railway CLI (see below)

4. **Configure settings**:
   - Railway will auto-detect Node.js
   - Start command: `npm start`
   - Build command: `npm install`

5. **Deploy**: Click "Deploy" - Railway will build and deploy automatically

6. **Get URL**: Your app will be available at a railway.app subdomain

### Using Railway CLI (for local deployment):

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Deploy
railway up
```

## Option 2: Render

Render offers free static site and web service hosting.

### Steps:

1. **Create Render account**: Go to https://render.com and sign up

2. **Create new Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configure service**:
   - Name: flashcards-app
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`

4. **Set environment**:
   - Free tier available
   - Auto-deploy on git push

5. **Deploy**: Click "Create Web Service"

## Option 3: Fly.io

Fly.io offers global edge deployment.

### Steps:

1. **Install flyctl**:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login**:
   ```bash
   flyctl auth login
   ```

3. **Create fly.toml** in project root:
   ```toml
   app = "your-app-name"
   
   [build]
     builder = "heroku/buildpacks:20"
   
   [[services]]
     internal_port = 3000
     protocol = "tcp"
   
     [[services.ports]]
       handlers = ["http"]
       port = 80
   
     [[services.ports]]
       handlers = ["tls", "http"]
       port = 443
   ```

4. **Deploy**:
   ```bash
   flyctl launch
   flyctl deploy
   ```

## Option 4: Vercel

Vercel is primarily for frontend but can host Node.js APIs.

### Steps:

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Create vercel.json**:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "server.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "server.js"
       }
     ]
   }
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

## Post-Deployment Verification

After deploying, verify:

1. **App loads**: Visit your deployment URL
2. **Create user**: Test user creation
3. **Select deck**: Open a deck and start studying
4. **Test progress**: Answer some cards and verify progress is saved
5. **Reset works**: Test reset progress buttons
6. **Persistence**: Refresh page and verify progress persists

## Monitoring

Check that the deployed app:
- Creates `progress/` directory automatically
- Creates `progress/users.json` on first user signup
- Saves progress files in `progress/{username}/{deckId}.json`

## Troubleshooting

### Port Issues
If you see "port already in use":
- Make sure the PORT environment variable is set correctly
- Check: `process.env.PORT || 3000` in server.js

### File System Issues
If progress isn't saving:
- Verify the hosting platform allows file system writes
- Some platforms (like Vercel) have read-only file systems and require external storage
- Consider using a database for such platforms

### Directory Not Created
If progress directory isn't created:
- Check server logs for permissions errors
- Verify `ensureProgressDir()` is called in `startServer()`

## Environment Variables

Set these on your hosting platform:

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Server port (set by platform) |

## Continuous Deployment

To enable automatic deployments:

1. **Push to GitHub**:
   ```bash
   # Create GitHub repository
   # Then push
   git remote add origin https://github.com/yourusername/flashcards.git
   git push -u origin master
   ```

2. **Connect to hosting platform**: Most platforms auto-deploy on git push

## Custom Domain (Optional)

Most platforms allow custom domains:
- Railway: Settings → Domains
- Render: Settings → Custom Domain
- Fly.io: `flyctl certs add yourdomain.com`
- Vercel: Settings → Domains

## Backup Strategy

Since progress is stored as JSON files:

1. **Manual backup**: Download progress folder periodically
2. **Automated backup**: Set up scheduled backups on your hosting platform
3. **Database migration**: For production, consider migrating to a database

---

Need help? Check the hosting platform's documentation or create an issue.
