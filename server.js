import express from 'express';
import cors from 'cors';
import { Chess } from 'chess.js';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

if (process.env.NODE_ENV === 'production') {
  app.enable('trust proxy');

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  const limiter = rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(limiter);

  app.use((req, res, next) => {
    const forwardedProto = req.headers['x-forwarded-proto'];
    const isSecure = req.secure || forwardedProto === 'https';
    if (isSecure) {
      return next();
    }
    return res.redirect(301, 'https://' + req.headers.host + req.originalUrl);
  });
}

app.use(cors());
app.use(express.json());
app.use('/static', express.static('public'));

const games = new Map();

const DATA_DIR = join(__dirname, 'data');
const GAMES_FILE = join(DATA_DIR, 'games.json');

const PLAYER_SOURCES = {
  WEB: 'web',
  FRAME: 'frame',
};

function createPlayer({ id, name, token = null, source = PLAYER_SOURCES.WEB }) {
  return {
    id: String(id),
    name: name || 'Player',
    token,
    source,
    joinedAt: Date.now(),
  };
}

function formatPlayerName(name, fallback = 'Player') {
  if (!name) return fallback;
  const trimmed = String(name).trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, 40);
}

function sanitizePlayer(player) {
  if (!player) return null;
  return {
    id: player.id,
    name: player.name,
    source: player.source,
    joinedAt: player.joinedAt,
  };
}

function resetGameState(game) {
  game.chess = new Chess();
  game.currentPlayer = 'w';
  game.selectedSquare = null;
  game.validMoves = [];
  game.lastMove = null;
  game.status = 'waiting';
  game.moveHistory = [];
}

function createNewGame() {
  const game = {
    chess: new Chess(),
    whitePlayer: null,
    blackPlayer: null,
    currentPlayer: 'w',
    selectedSquare: null,
    validMoves: [],
    lastMove: null,
    status: 'waiting',
    moveHistory: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  return game;
}

function getOrCreateGame(gameId) {
  if (!games.has(gameId)) {
    games.set(gameId, createNewGame());
  }
  return games.get(gameId);
}

function serializeGame(game) {
  return {
    whitePlayer: game.whitePlayer,
    blackPlayer: game.blackPlayer,
    currentPlayer: game.currentPlayer,
    lastMove: game.lastMove,
    status: game.status,
    moveHistory: game.moveHistory,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
    fen: game.chess.fen(),
  };
}

function persistGamesToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const payload = {};
    for (const [gameId, game] of games.entries()) {
      payload[gameId] = serializeGame(game);
    }
    fs.writeFileSync(GAMES_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (err) {
    // Best-effort persistence; log but don't crash server
    console.error('Failed to persist games to disk:', err.message);
  }
}

function loadGamesFromDisk() {
  try {
    if (!fs.existsSync(GAMES_FILE)) return;
    const raw = fs.readFileSync(GAMES_FILE, 'utf8');
    if (!raw.trim()) return;
    const parsed = JSON.parse(raw);
    for (const [gameId, data] of Object.entries(parsed)) {
      const chess = new Chess();
      try {
        if (data.fen) {
          chess.load(data.fen);
        }
      } catch {
        // fallback to new game if FEN invalid
      }
      const game = {
        chess,
        whitePlayer: data.whitePlayer || null,
        blackPlayer: data.blackPlayer || null,
        currentPlayer: data.currentPlayer || 'w',
        selectedSquare: null,
        validMoves: [],
        lastMove: data.lastMove || null,
        status: data.status || 'waiting',
        moveHistory: Array.isArray(data.moveHistory) ? data.moveHistory : [],
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now(),
      };
      games.set(gameId, game);
    }
    console.log(`Loaded ${games.size} games from disk.`);
  } catch (err) {
    console.error('Failed to load games from disk:', err.message);
  }
}

loadGamesFromDisk();

function assignPlayer(game, color, player) {
  if (color === 'white') {
    game.whitePlayer = player;
  } else {
    game.blackPlayer = player;
  }

  if (game.status !== 'finished') {
    if (game.whitePlayer && game.blackPlayer) {
      game.status = 'active';
    } else {
      game.status = 'waiting';
    }
  }

  game.updatedAt = Date.now();
}

function getPlayerDisplay(game, color) {
  return color === 'white' ? sanitizePlayer(game.whitePlayer) : sanitizePlayer(game.blackPlayer);
}

function buildShareUrl(req, gameId) {
  return `${req.protocol}://${req.get('host')}/play?gameId=${gameId}`;
}

function createChessBoardSVG(fen, highlightedSquares = [], lastMove = null) {
  const chess = new Chess(fen);
  const board = chess.board();

  const squareSize = 75;
  const boardSize = squareSize * 8;

  const pieceMap = {
    P: '♙',
    p: '♟',
    R: '♖',
    r: '♜',
    N: '♘',
    n: '♞',
    B: '♗',
    b: '♝',
    Q: '♕',
    q: '♛',
    K: '♔',
    k: '♚',
  };

  let svg = `<svg width="${boardSize}" height="${boardSize}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .square-label { font-size: 12px; fill: rgba(0,0,0,0.4); font-weight: bold; }
    </style>
  </defs>
  <rect width="${boardSize}" height="${boardSize}" fill="#f0d9b5"/>
`;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const isLight = (row + col) % 2 === 0;
      const x = col * squareSize;
      const y = row * squareSize;
      const square = `${String.fromCharCode(97 + col)}${8 - row}`;

      let fill = isLight ? '#f0d9b5' : '#b58863';

      if (lastMove && (lastMove.from === square || lastMove.to === square)) {
        fill = '#cdd26a';
      }

      if (highlightedSquares.includes(square)) {
        fill = '#f6f769';
      }

      svg += `<rect x="${x}" y="${y}" width="${squareSize}" height="${squareSize}" fill="${fill}" stroke="#000" stroke-width="1"/>`;

      if (row === 7) {
        svg += `<text x="${x + squareSize - 10}" y="${y + squareSize - 5}" class="square-label">${String.fromCharCode(97 + col)}</text>`;
      }
      if (col === 0) {
        svg += `<text x="${x + 5}" y="${y + 15}" class="square-label">${8 - row}</text>`;
      }

      const piece = board[row][col];
      if (piece) {
        const symbolKey = piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
        const glyph = pieceMap[symbolKey];
        if (glyph) {
          svg += `<text x="${x + squareSize / 2}" y="${
            y + squareSize * 0.7
          }" font-size="50" text-anchor="middle" fill="${
            piece.color === 'w' ? '#ffffff' : '#000000'
          }" stroke="${piece.color === 'w' ? '#ffffff' : '#000000'}" stroke-width="1">${glyph}</text>`;
        }
      }
    }
  }

  svg += `</svg>`;
  return svg;
}

function svgToDataURL(svg) {
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

function generateFrameHTML(
  imageUrl,
  buttons,
  postUrl,
  state = null,
  textInput = null,
  title = null,
) {
  const stateParam = state
    ? `\n    <meta property="fc:frame:state" content="${encodeURIComponent(JSON.stringify(state))}"/>`
    : '';
  const textInputParam = textInput
    ? `\n    <meta property="fc:frame:input:text" content="${textInput}"/>`
    : '';
  const titleParam = title ? `\n    <meta property="og:title" content="${title}"/>` : '';

  const buttonsMeta = buttons
    .map(
      (btn, i) => `
    <meta property="fc:frame:button:${i + 1}" content="${btn.label}"/>
    <meta property="fc:frame:button:${i + 1}:action" content="${btn.action || 'post'}"/>${
      btn.target
        ? `\n    <meta property="fc:frame:button:${i + 1}:target" content="${btn.target}"/>`
        : ''
    }`,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
    <meta property="fc:frame" content="vNext"/>
    <meta property="fc:frame:image" content="${imageUrl}"/>
    <meta property="og:image" content="${imageUrl}"/>${titleParam}${textInputParam}${buttonsMeta}
    <meta property="fc:frame:post_url" content="${postUrl}"/>${stateParam}
    <title>ChessGrid - Farcaster Chess</title>
</head>
<body>
    <h1>ChessGrid - Play Chess on Farcaster!</h1>
    <p>This is a Farcaster Frame. View it on Warpcast or another Farcaster client.</p>
</body>
</html>`;
}

function getCapturedPieces(game) {
  const history = game.chess.history({ verbose: true });
  const captured = {
    white: [],
    black: [],
  };

  history.forEach((move) => {
    if (!move.captured) return;
    const byColor = move.color === 'w' ? 'white' : 'black';
    captured[byColor].push(move.captured);
  });

  return captured;
}

function getValidMoves(chess, square) {
  const moves = chess.moves({ square, verbose: true });
  return moves.map((m) => m.to);
}

app.get('/', (req, res) => {
  const gameId = req.query.gameId || uuidv4();
  const game = getOrCreateGame(gameId);
  const shareUrl = buildShareUrl(req, gameId);

  const whiteDisplay = getPlayerDisplay(game, 'white');
  const blackDisplay = getPlayerDisplay(game, 'black');
  const whiteName = whiteDisplay?.name || 'White';
  const blackName = blackDisplay?.name || 'Black';
  const vsLabel = `${whiteName} vs ${blackName}`;

  const highlightedSquares = game.selectedSquare ? [game.selectedSquare, ...game.validMoves] : [];
  const boardImage = svgToDataURL(
    createChessBoardSVG(game.chess.fen(), highlightedSquares, game.lastMove),
  );

  const buttons = [];
  let title = `ChessGrid - ${vsLabel}`;
  let textInput = null;

  if (game.status === 'waiting') {
    buttons.push({ label: 'Join as White', action: 'post' });
    buttons.push({ label: 'Join as Black', action: 'post' });
    buttons.push({ label: 'Play Solo', action: 'post' });
    buttons.push({ label: 'Open in Browser', action: 'link', target: shareUrl });
    title = `ChessGrid - Waiting (${vsLabel})`;
    if (game.whitePlayer || game.blackPlayer) {
      title += ' (1/2 joined)';
    }
  } else if (game.status === 'active') {
    const isWhiteTurn = game.currentPlayer === 'w';
    const playerColor = isWhiteTurn ? 'White' : 'Black';
    title = `ChessGrid - ${playerColor} to Move (${vsLabel})`;

    buttons.push({ label: 'Make Move', action: 'post' });
    buttons.push({ label: 'New Game', action: 'post' });
    buttons.push({ label: 'Resign', action: 'post' });
    buttons.push({ label: 'Open in Browser', action: 'link', target: shareUrl });

    textInput = 'Enter move (e.g., e2e4)';

    if (game.chess.isCheck()) {
      title += ' - CHECK!';
    }
    if (game.chess.isCheckmate()) {
      title = `ChessGrid - Checkmate (${vsLabel})`;
      game.status = 'finished';
    } else if (game.chess.isDraw()) {
      title = `ChessGrid - Draw (${vsLabel})`;
      game.status = 'finished';
    }
  } else if (game.status === 'finished') {
    title = `ChessGrid - Game Finished (${vsLabel})`;
    buttons.push({ label: 'New Game', action: 'post' });
    buttons.push({ label: 'Open in Browser', action: 'link', target: shareUrl });
  }

  const html = generateFrameHTML(
    boardImage,
    buttons,
    `${req.protocol}://${req.get('host')}/frame`,
    { gameId, action: 'view' },
    textInput,
    title,
  );

  res.send(html);
});

// Informational landing page for browsers
app.get('/info', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.post('/frame', (req, res) => {
  const body = req.body || {};
  const untrustedData = body.untrustedData || {};
  const buttonIndex = untrustedData.buttonIndex || null;
  const inputText = untrustedData.inputText || null;

  let state = {};
  if (untrustedData.state) {
    try {
      state = JSON.parse(decodeURIComponent(untrustedData.state));
    } catch {
      try {
        state = JSON.parse(untrustedData.state);
      } catch {
        state = {};
      }
    }
  }

  const fid = String(untrustedData.fid || 'unknown');
  const gameId = state.gameId || req.query.gameId || uuidv4();
  const game = getOrCreateGame(gameId);
  const shareUrl = buildShareUrl(req, gameId);

  const whiteDisplay = getPlayerDisplay(game, 'white');
  const blackDisplay = getPlayerDisplay(game, 'black');
  const whiteName = whiteDisplay?.name || 'White';
  const blackName = blackDisplay?.name || 'Black';
  const vsLabel = `${whiteName} vs ${blackName}`;

  if (buttonIndex) {
    if (game.status === 'waiting') {
      if (buttonIndex === 1) {
        assignPlayer(
          game,
          'white',
          createPlayer({
            id: fid,
            name: `FID ${fid}`,
            source: PLAYER_SOURCES.FRAME,
          }),
        );
        if (game.blackPlayer) game.status = 'active';
      } else if (buttonIndex === 2) {
        assignPlayer(
          game,
          'black',
          createPlayer({
            id: fid,
            name: `FID ${fid}`,
            source: PLAYER_SOURCES.FRAME,
          }),
        );
        if (game.whitePlayer) game.status = 'active';
      } else if (buttonIndex === 3) {
        const player = createPlayer({
          id: fid,
          name: `FID ${fid}`,
          source: PLAYER_SOURCES.FRAME,
        });
        assignPlayer(game, 'white', player);
        assignPlayer(game, 'black', player);
        game.status = 'active';
      }
    } else if (game.status === 'active') {
      if (buttonIndex === 1 && inputText) {
        const movePattern = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/i;
        const match = inputText.trim().match(movePattern);

        if (match) {
          const from = match[1].toLowerCase();
          const to = match[2].toLowerCase();
          const promotion = match[3] ? match[3].toLowerCase() : null;

          try {
            const piece = game.chess.get(from);
            if (!piece || piece.color === game.currentPlayer) {
              const move = game.chess.move({
                from,
                to,
                promotion: promotion || 'q',
              });

              if (move) {
                game.lastMove = { from, to };
                game.currentPlayer = game.chess.turn();
                game.selectedSquare = null;
                game.validMoves = [];
                game.moveHistory.push(move.san);

                if (game.chess.isCheckmate() || game.chess.isDraw()) {
                  game.status = 'finished';
                }
              }
            }
          } catch {
            // ignore invalid moves for frames
          }
        }
      } else if (buttonIndex === 2) {
        // View History: could be extended to a dedicated view
      } else if (buttonIndex === 3) {
        games.set(gameId, createNewGame());
        persistGamesToDisk();
      } else if (buttonIndex === 4) {
        game.status = 'finished';
      }
    } else if (game.status === 'finished') {
      if (buttonIndex === 1) {
        games.set(gameId, createNewGame());
        persistGamesToDisk();
      }
    }
  }

  const highlightedSquares = game.selectedSquare ? [game.selectedSquare, ...game.validMoves] : [];
  const boardImage = svgToDataURL(
    createChessBoardSVG(game.chess.fen(), highlightedSquares, game.lastMove),
  );

  const buttons = [];
  let title = `ChessGrid - ${vsLabel}`;
  let textInput = null;

  if (game.status === 'waiting') {
    buttons.push({ label: 'Join as White', action: 'post' });
    buttons.push({ label: 'Join as Black', action: 'post' });
    buttons.push({ label: 'Play Solo', action: 'post' });
    buttons.push({ label: 'Open in Browser', action: 'link', target: shareUrl });
    title = `ChessGrid - Waiting (${vsLabel})`;
    if (game.whitePlayer || game.blackPlayer) {
      title += ' (1/2 joined)';
    }
  } else if (game.status === 'active') {
    const isWhiteTurn = game.currentPlayer === 'w';
    const playerColor = isWhiteTurn ? 'White' : 'Black';
    const playerInfo = isWhiteTurn ? game.whitePlayer : game.blackPlayer;
    const isYourTurn =
      (playerInfo && playerInfo.id === fid) ||
      (game.whitePlayer &&
        game.blackPlayer &&
        game.whitePlayer.id === fid &&
        game.blackPlayer.id === fid);

    title = `ChessGrid - ${playerColor} to Move (${vsLabel})`;
    if (!isYourTurn) {
      title += ' (Waiting...)';
    }

    buttons.push({ label: 'Make Move', action: 'post' });
    buttons.push({ label: 'New Game', action: 'post' });
    buttons.push({ label: 'Resign', action: 'post' });
    buttons.push({ label: 'Open in Browser', action: 'link', target: shareUrl });

    textInput = 'Enter move (e.g., e2e4)';

    if (game.chess.isCheck()) {
      title += ' - CHECK!';
    }
    if (game.chess.isCheckmate()) {
      title = `ChessGrid - Checkmate (${vsLabel})`;
      game.status = 'finished';
    } else if (game.chess.isDraw()) {
      title = `ChessGrid - Draw (${vsLabel})`;
      game.status = 'finished';
    }
  } else if (game.status === 'finished') {
    title = `ChessGrid - Game Finished (${vsLabel})`;
    buttons.push({ label: 'New Game', action: 'post' });
    buttons.push({ label: 'Open in Browser', action: 'link', target: shareUrl });
  }

  const html = generateFrameHTML(
    boardImage,
    buttons,
    `${req.protocol}://${req.get('host')}/frame`,
    { gameId, action: 'view' },
    textInput,
    title,
  );

  res.send(html);
});

app.post('/move', (req, res) => {
  const { gameId, from, to, promotion, playerToken } = req.body || {};

  if (!gameId || !from || !to) {
    return res.status(400).json({ error: 'Missing gameId, from or to' });
  }

  if (!games.has(gameId)) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const game = games.get(gameId);

  const hasWebPlayers = Boolean(
    (game.whitePlayer && game.whitePlayer.token) || (game.blackPlayer && game.blackPlayer.token),
  );

  if (hasWebPlayers) {
    if (!playerToken) {
      return res.status(403).json({ error: 'Missing player token' });
    }

    const allowedColors = [];
    if (game.whitePlayer?.token === playerToken) allowedColors.push('white');
    if (game.blackPlayer?.token === playerToken) allowedColors.push('black');

    if (!allowedColors.length) {
      return res.status(403).json({ error: 'Invalid player token' });
    }

    const currentColor = game.currentPlayer === 'w' ? 'white' : 'black';
    if (!allowedColors.includes(currentColor)) {
      return res.status(423).json({ error: 'Not your turn' });
    }
  }

  try {
    const move = game.chess.move({
      from,
      to,
      promotion: promotion || 'q',
    });

    if (!move) {
      return res.status(400).json({ error: 'Invalid move' });
    }

    game.currentPlayer = game.chess.turn();
    game.selectedSquare = null;
    game.validMoves = [];
    game.lastMove = { from, to };
    game.moveHistory.push(move.san);

    if (game.chess.isCheckmate() || game.chess.isDraw()) {
      game.status = 'finished';
    }

    persistGamesToDisk();

    return res.json({
      success: true,
      move,
      fen: game.chess.fen(),
      status: game.status,
      moveHistory: game.moveHistory,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.get('/game/:gameId', (req, res) => {
  const { gameId } = req.params;

  if (!games.has(gameId)) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const game = games.get(gameId);

  res.json({
    gameId,
    fen: game.chess.fen(),
    currentPlayer: game.currentPlayer,
    status: game.status,
    isCheck: game.chess.isCheck(),
    isCheckmate: game.chess.isCheckmate(),
    isDraw: game.chess.isDraw(),
    moveHistory: game.moveHistory,
    lastMove: game.lastMove,
    capturedPieces: getCapturedPieces(game),
    players: {
      white: getPlayerDisplay(game, 'white'),
      black: getPlayerDisplay(game, 'black'),
    },
    availableColors: {
      white: !game.whitePlayer,
      black: !game.blackPlayer,
    },
    shareUrl: buildShareUrl(req, gameId),
  });
});

app.get('/games', (req, res) => {
  const activeGames = Array.from(games.entries()).map(([gameId, game]) => ({
    gameId,
    status: game.status,
    currentPlayer: game.currentPlayer,
    moveCount: game.moveHistory.length,
  }));

  res.json({ games: activeGames });
});

app.get('/play', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'play.html'));
});

app.get('/game/:gameId/pgn', (req, res) => {
  const { gameId } = req.params;

  if (!games.has(gameId)) {
    return res.status(404).send('Game not found');
  }

  const game = games.get(gameId);
  try {
    const pgn = game.chess.pgn();
    res.type('text/plain').send(pgn || '');
  } catch (err) {
    res.status(500).send('Failed to generate PGN');
  }
});

app.post('/api/games', (req, res) => {
  const gameId = uuidv4();
  games.set(gameId, createNewGame());
  persistGamesToDisk();
  res.json({
    success: true,
    gameId,
    shareUrl: buildShareUrl(req, gameId),
  });
});

app.post('/api/games/:gameId/join', (req, res) => {
  const { gameId } = req.params;
  const { color = 'random', name } = req.body || {};

  if (!games.has(gameId)) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const normalizedColor = String(color).toLowerCase();
  const allowedColors = ['white', 'black', 'random'];
  if (!allowedColors.includes(normalizedColor)) {
    return res.status(400).json({ error: 'Invalid color choice' });
  }

  const game = games.get(gameId);
  const openColors = [];
  if (!game.whitePlayer) openColors.push('white');
  if (!game.blackPlayer) openColors.push('black');

  if (!openColors.length) {
    return res.status(409).json({ error: 'Game is full' });
  }

  let targetColor = normalizedColor;
  if (normalizedColor === 'random') {
    targetColor = openColors[Math.floor(Math.random() * openColors.length)];
  }

  if (targetColor === 'white' && game.whitePlayer) {
    return res.status(409).json({ error: 'White is already taken' });
  }
  if (targetColor === 'black' && game.blackPlayer) {
    return res.status(409).json({ error: 'Black is already taken' });
  }

  const token = uuidv4();
  const displayName = formatPlayerName(
    name,
    targetColor === 'white' ? 'White Player' : 'Black Player',
  );

  const player = createPlayer({
    id: `${token}-${targetColor}`,
    name: displayName,
    token,
    source: PLAYER_SOURCES.WEB,
  });

  assignPlayer(game, targetColor, player);

  persistGamesToDisk();

  res.json({
    success: true,
    gameId,
    color: targetColor,
    token,
    player: sanitizePlayer(player),
  });
});

app.post('/api/games/:gameId/solo', (req, res) => {
  const { gameId } = req.params;
  const { name } = req.body || {};

  const soloName = formatPlayerName(name, 'Solo Player');
  const token = uuidv4();

  let game = games.get(gameId);
  if (!game) {
    game = createNewGame();
    games.set(gameId, game);
  }

  resetGameState(game);

  const whitePlayer = createPlayer({
    id: `${token}-white`,
    name: `${soloName} (White)`,
    token,
    source: PLAYER_SOURCES.WEB,
  });
  const blackPlayer = createPlayer({
    id: `${token}-black`,
    name: `${soloName} (Black)`,
    token,
    source: PLAYER_SOURCES.WEB,
  });

  assignPlayer(game, 'white', whitePlayer);
  assignPlayer(game, 'black', blackPlayer);
  game.status = 'active';

  persistGamesToDisk();

  res.json({
    success: true,
    gameId,
    token,
    mode: 'solo',
    player: {
      name: soloName,
    },
  });
});

app.get('/game/:gameId/moves/:square', (req, res) => {
  const { gameId, square } = req.params;

  if (!games.has(gameId)) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const game = games.get(gameId);
  const moves = getValidMoves(game.chess, square);

  res.json({ square, validMoves: moves });
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`ChessGrid server running on port ${PORT}`);
    console.log(`Frame URL: http://localhost:${PORT}`);
    console.log('Ready for Farcaster integration!');
    console.log('\nTo share your frame:');
    console.log(`   Post this URL on Farcaster: http://localhost:${PORT}`);
    console.log(`   Or with a specific game: http://localhost:${PORT}?gameId=YOUR_GAME_ID\n`);
  });
}

export default app;
