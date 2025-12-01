# Deployment Guide for ChessGrid

This guide will help you deploy ChessGrid to various platforms so it can be used as a Farcaster Frame.

## Prerequisites

- Your code pushed to a Git repository (GitHub, GitLab, etc.).
- A domain name (optional, but recommended).

## Platform Options

### 1. Vercel (Recommended – Easiest)

**Pros:** Zero-config, automatic HTTPS, CDN, great for Node.js.

1. Go to [vercel.com](https://vercel.com) and sign up or log in.
2. Click "New Project".
3. Import your Git repository.
4. Vercel auto-detects Node.js – no configuration needed.
5. Click "Deploy".
6. Your frame URL will be: `https://your-project.vercel.app`.

**Configuration:**

- Build Command: (auto-detected)
- Output Directory: (not needed)
- Install Command: `npm install`

### 2. Railway

**Pros:** Simple, supports databases, good for Node.js apps.

1. Go to [railway.app](https://railway.app) and sign up.
2. Click "New Project", then "Deploy from GitHub repo".
3. Select your repository.
4. Railway auto-detects the project.
5. Your frame URL will be: `https://your-project.up.railway.app`.

**Environment Variables:**

- `PORT`: Railway sets this automatically.

### 3. Fly.io

**Pros:** Global deployment, good performance.

1. Install Fly CLI:

   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. Login:

   ```bash
   fly auth login
   ```

3. Initialize (in your project directory):

   ```bash
   fly launch
   ```

4. Follow the prompts and deploy:

   ```bash
   fly deploy
   ```

### 4. Render

**Pros:** Free tier available, simple setup.

1. Go to [render.com](https://render.com) and sign up.
2. Click "New +", then "Web Service".
3. Connect your Git repository.
4. Configure:
   - **Name:** `chessgrid-farcaster`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free tier is fine for testing
5. Click "Create Web Service".
6. Your frame URL will be: `https://your-service.onrender.com`.

### 5. Heroku (Classic Platform)

1. Install Heroku CLI.
2. Login: `heroku login`.
3. Create app: `heroku create your-app-name`.
4. Deploy: `git push heroku main`.
5. Your frame URL will be: `https://your-app-name.herokuapp.com`.

### 6. Docker

You can also run ChessGrid as a container using the provided `Dockerfile`.

1. Copy `.env.example` to `.env` and adjust values as needed:

   ```bash
   cp .env.example .env
   ```

2. Build the image:

   ```bash
   docker build -t chessgrid .
   ```

3. Run the container:

   ```bash
   docker run --rm -p 3000:3000 --env-file .env chessgrid
   ```

Your frame will be available at `http://localhost:3000` (or the port you map in Docker).

## After Deployment

### 1. Verify Your Frame Works

Visit your deployed URL in a browser. You should see the frame HTML with meta tags.

### 2. Test on Farcaster

1. Copy your deployed URL.
2. Post it on Farcaster/Warpcast:

   ```text
   Check out this chess game!

   https://your-deployed-url.com
   ```

3. The frame should appear as an interactive component.

### 3. Use a Frame Validator

Test your frame with:

- [Frame Validator](https://warpcast.com/~/developers/frames) (Warpcast)
- Or other Farcaster Frame validators.

## Important Notes

### HTTPS Required

Farcaster frames **require HTTPS**. All platforms above provide HTTPS automatically.

### Image URLs

The chess board images are generated as SVG data URLs. Make sure these are properly encoded (which the server code handles).

### CORS

CORS is enabled in the server to allow Farcaster clients to access your frame.

### Environment Variables

If you need to set environment variables (API keys, etc.):

- **Vercel:** Settings → Environment Variables
- **Railway:** Variables tab
- **Fly.io:** `fly secrets set KEY=value`
- **Render:** Environment tab

## Custom Domain (Optional)

Most platforms allow you to add a custom domain:

1. **Vercel:** Settings → Domains
2. **Railway:** Settings → Custom Domain
3. **Fly.io:** `fly domains add yourdomain.com`

Then update your DNS to point to the platform's servers.

## Scaling Considerations

For production with many concurrent games:

1. **Add Redis** for game state storage:

   ```javascript
   // Use Redis instead of Map for games storage
   import { createClient } from 'redis';
   ```

2. **Add a Database** for persistent game history:
   - PostgreSQL (Railway, Supabase)
   - MongoDB (MongoDB Atlas)

3. **Add Caching** for board images.
4. **Monitor Performance** using platform analytics.

## Troubleshooting

### Frame Not Showing

- Check the URL is publicly accessible (not localhost).
- Verify HTTPS is working.
- Test frame meta tags with a validator.
- Check server logs for errors.

### 500 Errors

- Check server logs on your platform.
- Verify all dependencies are installed.
- Ensure the `PORT` environment variable is set correctly (if required by the platform).

### Images Not Loading

- Verify SVG encoding is working.
- Check CORS headers.
- Test the image data URL in a browser.

## Next Steps

Once deployed:

1. Share your frame URL on Farcaster.
2. Test with friends.
3. Monitor usage.
4. Iterate and improve.

Happy deploying!
