# Railway Volume Setup - IMPORTANT!

Your flashcards app needs persistent storage for user progress data.

## Problem
Railway uses ephemeral (temporary) file systems. When your app restarts or redeploys, the `progress/` directory is wiped clean, losing all user data.

## Solution: Add a Railway Volume

### Step-by-Step Guide:

1. **Go to Railway Dashboard**
   - Visit: https://railway.app
   - Click on your `flashcards` project

2. **Select Your Service**
   - Click on the `flashcards` service card

3. **Add Volume**
   - Click on the **"Settings"** tab (or look for "Volumes" section)
   - Scroll down to **"Volumes"** section
   - Click **"+ New Volume"**

4. **Configure Volume**
   - **Mount Path**: `/app/progress`
   - **Size**: 1 GB (default is fine, can be adjusted later)
   
5. **Save and Redeploy**
   - Click **"Add"** or **"Create"**
   - Railway will automatically redeploy your app
   - Wait ~1 minute for redeployment

6. **Verify**
   - Open your app: https://flashcards-production-8cce.up.railway.app
   - Create a user and answer some cards
   - Refresh the page - progress should persist!
   - You can even trigger a redeploy - data will survive

## What This Does

The volume creates a persistent disk mounted at `/app/progress` that:
- ✅ Survives container restarts
- ✅ Survives redeployments
- ✅ Survives app crashes
- ✅ Persists across all updates

## Verify Volume is Working

After adding the volume, test it:

1. Create a user and study some cards
2. Note your progress stats
3. Go to Railway dashboard → Settings → Redeploy
4. Wait for redeploy to complete
5. Open your app again
6. Your user and progress should still be there!

## Cost

Railway volumes are included in your plan. The 1GB volume is more than enough for thousands of users' progress data.

## Alternative: Database (Future)

For a production app with many users, consider migrating to a database:
- PostgreSQL (Railway has built-in support)
- MongoDB Atlas (free tier available)
- Supabase (PostgreSQL + real-time features)

But for now, the volume is perfect and keeps your simple JSON file architecture!
