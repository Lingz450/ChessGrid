# Quick Start Guide

Get ChessGrid running in 5 minutes.

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Start the Server

```bash
npm start
```

You should see:

```text
ChessGrid server running on port 3000
Frame URL: http://localhost:3000
Ready for Farcaster integration!
```

## Step 3: Test Locally

1. Open your browser: `http://localhost:3000`
2. You should see the frame HTML page.
3. Test the API: `http://localhost:3000/games`

## Step 4: Deploy to Farcaster

### Option A: Deploy to Vercel (Easiest)

1. Install Vercel CLI:

   ```bash
   npm i -g vercel
   ```

2. Deploy:

   ```bash
   vercel
   ```

3. Follow the prompts. Your frame will be live at:

   `https://your-project.vercel.app`

### Option B: Deploy to Railway

1. Go to [railway.app](https://railway.app).
2. Click "New Project", then "Deploy from GitHub".
3. Select your repository.
4. Your frame URL will be shown once deployed.

## Step 5: Share on Farcaster

Post your deployed URL on Warpcast or another Farcaster client:

```text
Play chess on Farcaster!

https://your-deployed-url.com
```

The frame will automatically render as an interactive chess game.

## Making Your First Move

1. Click "Join as White" or "Play Solo".
2. Enter a move in the text input: `e2e4`.
3. Click "Make Move".
4. Keep playing.

## Move Notation

- `e2e4` – Move from e2 to e4.
- `g1f3` – Knight from g1 to f3.
- `e7e8q` – Pawn promotes to queen.

## Need Help?

- Check `README.md` for full documentation.
- See `DEPLOYMENT.md` for detailed deployment guides.
- Test your setup: `node test-game.js` (requires the server running).

## What's Next?

- Add persistent storage (Redis/Database).
- Implement bot opponents.
- Add game history.
- Create tournaments.

Happy chess playing!
