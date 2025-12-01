// Simple test script to verify the chess game API
// Requires Node.js 18+ for built-in fetch

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testGame() {
  console.log('Testing ChessGrid API...\n');

  try {
    // Test 1: Create a game
    console.log('1. Creating a new game...');
    const gameResponse = await fetch(`${BASE_URL}/`);
    const gameHtml = await gameResponse.text();

    // Extract gameId from HTML (simple regex)
    const gameIdMatch = gameHtml.match(/gameId["']\s*:\s*["']([^"']+)/);
    if (!gameIdMatch) {
      console.log('   Could not extract gameId from HTML');
      console.log('   Frame HTML received successfully');
    } else {
      const gameId = gameIdMatch[1];
      console.log(`   Game created with ID: ${gameId}`);

      // Test 2: Get game state
      console.log('\n2. Getting game state...');
      const stateResponse = await fetch(`${BASE_URL}/game/${gameId}`);
      const gameState = await stateResponse.json();
      console.log(`   Game state: ${gameState.status}`);
      console.log(`   Current player: ${gameState.currentPlayer}`);

      // Test 3: Make a move
      console.log('\n3. Making a test move (e2e4)...');
      const moveResponse = await fetch(`${BASE_URL}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          from: 'e2',
          to: 'e4',
        }),
      });

      if (moveResponse.ok) {
        const moveResult = await moveResponse.json();
        console.log(`   Move successful: ${moveResult.move.san}`);
        console.log(`   Move history: ${moveResult.moveHistory.join(', ')}`);
      } else {
        const error = await moveResponse.json();
        console.log(`   Move failed: ${error.error}`);
      }

      // Test 4: Get updated game state
      console.log('\n4. Getting updated game state...');
      const updatedStateResponse = await fetch(`${BASE_URL}/game/${gameId}`);
      const updatedState = await updatedStateResponse.json();
      console.log(`   Updated state: ${updatedState.status}`);
      console.log(`   Current player: ${updatedState.currentPlayer}`);
      console.log(`   Is check: ${updatedState.isCheck}`);
    }

    // Test 5: List games
    console.log('\n5. Listing all games...');
    const gamesResponse = await fetch(`${BASE_URL}/games`);
    const games = await gamesResponse.json();
    console.log(`   Found ${games.games.length} active game(s)`);

    console.log('\nAll tests completed!\n');
  } catch (error) {
    console.error('\nTest failed:', error.message);
    console.error('   Make sure the server is running on', BASE_URL);
    process.exit(1);
  }
}

testGame();
