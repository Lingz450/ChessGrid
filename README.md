# ChessGrid - Massive Chess Game for Farcaster

A fully-featured chess game built as a Farcaster Frame that works on Warpcast and other Farcaster clients. Play chess directly in your Farcaster feed.

## Features

- Full chess game logic with move validation
- Visual chess board with pieces
- Multiplayer support (two players can join)
- Solo play mode (play against yourself)
- Move history tracking
- Check/Checkmate detection
- Draw detection
- Text input for moves (e.g., `e2e4`)
- Farcaster Frame protocol support
- Responsive board visualization

## How It Works

ChessGrid uses the Farcaster Frame protocol to create an interactive chess experience. Players can:

1. **Join a Game**: Click "Join as White" or "Join as Black"
2. **Play Solo**: Practice by playing both sides
3. **Make Moves**: Enter moves in standard chess notation (e.g., `e2e4`)
4. **View Status**: See check, checkmate, and draw conditions

## Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Clone or download this repository.
2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

The server will run on `http://localhost:3000` by default.

### Testing Locally

1. Open `http://localhost:3000` in your browser to see the frame HTML.
2. Use a Farcaster Frame validator to test the meta tags.
3. Share the URL on Farcaster/Warpcast to play.

## Deployment for Farcaster

### Option 1: Deploy to Vercel (Recommended)

1. Install Vercel CLI:

```bash
npm i -g vercel
```

2. Deploy:

```bash
vercel
```

3. Your frame will be available at `https://your-project.vercel.app`.

### Option 2: Deploy to Railway

1. Connect your GitHub repository to Railway.
2. Railway will auto-detect the Node.js project.
3. Set the port to use the `PORT` environment variable.
4. Deploy.

### Option 3: Deploy to Fly.io

1. Install Fly CLI:

```bash
curl -L https://fly.io/install.sh | sh
```

2. Run:

```bash
fly launch
```

3. Deploy with:

```bash
fly deploy
```

### Option 4: Deploy to Render

1. Create a new Web Service on Render.
2. Connect your GitHub repository.
3. Set build command: `npm install`.
4. Set start command: `npm start`.
5. Deploy.

## Sharing on Farcaster

Once deployed, share your frame URL on Farcaster/Warpcast:

```text
Check out this chess game!

https://your-domain.com
```

Or create a cast with your frame URL, and Farcaster clients will automatically render it as an interactive frame.

## Making Moves

Enter moves in standard chess notation:

- **From and To**: `e2e4` (pawn from e2 to e4)
- **With Promotion**: `e7e8q` (pawn promotes to queen)
- **Castling**: `e1g1` (kingside) or `e1c1` (queenside)
- **Other moves**: `g1f3`, `e1e4`, etc.

## Game Modes

### Multiplayer

1. First player clicks "Join as White".
2. Second player clicks "Join as Black".
3. Game starts automatically.
4. Players take turns making moves.

### Solo Play

1. Click "Play Solo".
2. Play both white and black pieces.
3. Perfect for practice or analysis.

## API Endpoints

### Frame Endpoints (Farcaster)

- `GET /` - Main frame page.
- `POST /frame` - Handle button clicks and moves.

### API Endpoints

- `GET /game/:gameId` - Get game state.
- `POST /move` - Make a move programmatically.
- `GET /games` - List all active games.

### Example Move API Call

```javascript
fetch('https://your-domain.com/move', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    gameId: 'your-game-id',
    from: 'e2',
    to: 'e4',
  }),
});
```

## Game State

Games are currently stored in memory. For production use, consider:

- **Redis** for distributed storage.
- **PostgreSQL** for persistent storage.
- **A database** for game history and statistics.

## Customization

### Change Port

Set the `PORT` environment variable:

```bash
PORT=8080 npm start
```

### Styling

The chess board SVG is generated in `createChessBoardSVG()`. Modify colors, sizes, and piece styles there.

## Roadmap

- [ ] Persistent game storage
- [ ] Game history and replays
- [ ] Elo rating system
- [ ] Tournament mode
- [ ] Bot opponents with varying difficulty
- [ ] Move hints and analysis
- [ ] Time controls (blitz, rapid, classical)
- [ ] Spectator mode
- [ ] Move animations
- [ ] Sound effects

## Troubleshooting

### Frame not showing on Farcaster

- Ensure your server is publicly accessible (not localhost).
- Check that HTTPS is enabled (required for Farcaster).
- Verify meta tags are correct using a Frame validator.
- Make sure the frame image URL is accessible.

### Moves not working

- Verify move notation is correct (e.g., `e2e4`).
- Check that it's your turn.
- Ensure the move is legal.

### Server errors

- Check that port 3000 (or your `PORT`) is available.
- Verify all dependencies are installed.
- Check server logs for detailed error messages.

## License

MIT License – feel free to use and modify.

## Contributing

Contributions welcome. Feel free to:

- Report bugs.
- Suggest features.
- Submit pull requests.

## Support

For issues or questions:

- Open an issue on GitHub.
- Reach out on Farcaster: `@your-handle`.

---

**Made for the Farcaster community.**
