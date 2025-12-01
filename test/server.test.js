import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

let app;

before(async () => {
  process.env.NODE_ENV = 'test';
  const mod = await import('../server.js');
  app = mod.default;
});

test('GET /games returns a list of games', async () => {
  const res = await request(app).get('/games').expect(200);
  assert.ok(Array.isArray(res.body.games));
});

test('root frame returns HTML with frame metadata', async () => {
  const res = await request(app).get('/').expect(200);
  const html = res.text;
  assert.ok(html.includes('fc:frame'), 'frame meta tag should be present');
  assert.ok(html.includes('fc:frame:image'), 'frame image meta tag should be present');
  assert.ok(html.includes('fc:frame:post_url'), 'frame post_url meta tag should be present');
});

test('solo game flow: create, move, and inspect game state', async () => {
  const createRes = await request(app).post('/api/games').send({});
  assert.equal(createRes.status, 200);
  assert.equal(createRes.body.success, true);
  const { gameId } = createRes.body;
  assert.ok(gameId);

  const soloRes = await request(app)
    .post(`/api/games/${encodeURIComponent(gameId)}/solo`)
    .send({ name: 'Test Player' });
  assert.equal(soloRes.status, 200);
  assert.equal(soloRes.body.success, true);
  assert.ok(soloRes.body.token);
  const token = soloRes.body.token;

  const moveRes = await request(app).post('/move').send({
    gameId,
    from: 'e2',
    to: 'e4',
    playerToken: token,
  });

  assert.equal(moveRes.status, 200);
  assert.equal(moveRes.body.success, true);
  assert.equal(moveRes.body.status === 'active' || moveRes.body.status === 'finished', true);
  assert.equal(moveRes.body.move.from, 'e2');
  assert.equal(moveRes.body.move.to, 'e4');

  const gameRes = await request(app)
    .get(`/game/${encodeURIComponent(gameId)}`)
    .expect(200);
  assert.equal(gameRes.body.gameId, gameId);
  assert.equal(typeof gameRes.body.fen, 'string');
  assert.ok(Array.isArray(gameRes.body.moveHistory));
  assert.ok(gameRes.body.moveHistory.length >= 1);
  assert.equal(gameRes.body.currentPlayer, 'b', 'after e2e4 it should be black to move');
});
