import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanSnapshot, ProgressRoom } from '../worker/src/pair-room.js';
import { ENGLISH_UNITS, ENGLISH_PARTS, ENGLISH_CHECKIN } from '../src/data/english.js';
import { ENGLISH_JOURNEY } from '../src/data/english-journey.js';
import { ENTRIES } from '../src/data/journey.js';
import { englishProgress } from '../src/logic/english.js';
import { pointStatuses } from '../src/logic/progress.js';
import worker from '../worker/src/index.js';

test('the English path and every journey vocabulary set are complete', () => {
  assert.equal(ENGLISH_UNITS.length, 16);
  assert.equal(new Set(ENGLISH_UNITS.map((unit) => unit.id)).size, ENGLISH_UNITS.length);
  assert.equal(ENGLISH_CHECKIN.length, 5);
  for (const unit of ENGLISH_UNITS) {
    assert.match(unit.id, /^en-\d{2}$/);
    assert.ok(Number(unit.id.slice(3)) >= 13, `${unit.id}: en-01…en-12 are retired`);
    assert.ok(ENGLISH_PARTS.some((part) => part.id === unit.part), unit.id);
    assert.ok(unit.ja && unit.goal && unit.prompts.length >= 2 && unit.examples.length >= 2);
    assert.ok(unit.words.every((word) => word.length === 2 && word[0] && word[1]));
    assert.ok(unit.drills.length >= 3, unit.id);
    for (const [sentence, answers, ja] of unit.drills) {
      assert.equal(sentence.split('___').length, 2, `${unit.id}: ${sentence}`);
      assert.ok(answers.length && ja, `${unit.id}: ${sentence}`);
    }
  }
  for (const entry of ENTRIES) {
    const [name, words, question] = ENGLISH_JOURNEY[entry.id];
    assert.ok(name && question);
    assert.equal(words.length, entry.words.length, entry.id);
    assert.ok(words.every((word) => typeof word === 'string' && word.length));
  }
});

test('English practice keeps Japanese records separate and self-checking is not mastery', () => {
  const events = [
    { kind: 'english-attempt', data: { unit: 'en-13', answer: 'personal answer', usedHelp: true, assessment: 'pending' } },
    { kind: 'english-unit', data: { unit: 'en-13', done: true } },
    { kind: 'english-unit', data: { unit: 'en-13', done: false } },
    { kind: 'english-vocab', data: { word: 'en-13:and', known: true } },
    { kind: 'english-drill', data: { unit: 'en-13', item: 'en-13-d0', answer: 'but', correct: true } },
    { kind: 'vocab', data: { id: 'unrelated', known: true } },
  ];
  const result = englishProgress(events);
  assert.equal(result.attempts, 1);
  assert.equal(result.units['en-13'].done, false);
  assert.equal(result.words, 1);
  assert.deepEqual(pointStatuses(events), pointStatuses([]));
});

test('shared summaries omit personal answers, recordings, sources and extra fields', () => {
  const raw = { answer: 'private answer', audio: 'private audio', original: 'private transcript', grammar: { 'g09-1': 'known', 'g09-2': 'invented' }, pace: { doneDays: 3 }, tasks: { 'w01-d0-grammar': true }, units: { 'en-01': { done: true, attempts: 2, answer: 'private answer' } } };
  for (const role of ['kfir', 'masami']) {
    const value = cleanSnapshot(raw, role);
    assert.doesNotMatch(JSON.stringify(value), /private|original|answer|audio/);
    assert.equal(value.role, role);
  }
  assert.deepEqual(cleanSnapshot(raw, 'kfir').grammar, { 'g09-1': 'known' });
});

function room() {
  const records = new Map();
  return new ProgressRoom({
    blockConcurrencyWhile: (fn) => fn(),
    storage: { get: async (key) => records.get(key), put: async (key, value) => { records.set(key, structuredClone(value)); } },
  });
}
async function act(instance, user, action, snapshot) {
  const response = await instance.fetch(new Request('https://room/internal', { method: 'POST', headers: { 'X-Learner-ID': user }, body: JSON.stringify({ action, snapshot }) }));
  return { status: response.status, data: await response.json() };
}

test('only two invited accounts can view summaries and each writes its own role', async () => {
  const instance = room();
  assert.equal((await act(instance, 'owner', 'create')).data.role, 'kfir');
  assert.equal((await act(instance, 'stranger', 'get')).status, 403);
  assert.equal((await act(instance, 'friend', 'join')).data.role, 'masami');
  assert.equal((await act(instance, 'third', 'join')).status, 409);
  const result = await act(instance, 'friend', 'update', { role: 'kfir', words: 4, grammar: { 'g09-1': 'known' } });
  assert.equal(result.data.snapshots.kfir, undefined);
  assert.equal(result.data.snapshots.masami.words, 4);
  assert.equal(result.data.snapshots.masami.grammar, undefined);
  assert.equal((await act(instance, 'owner', 'get')).data.connected, true);
});

test('disconnect revokes both accounts and the old invitation', async () => {
  const instance = room();
  await act(instance, 'owner', 'create'); await act(instance, 'friend', 'join');
  await act(instance, 'friend', 'leave');
  assert.equal((await act(instance, 'owner', 'get')).status, 404);
  assert.equal((await act(instance, 'third', 'join')).status, 404);
});

test('the public pairing route verifies accounts and keeps the Gemini allowlist intact', async (t) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('owner@example.com'));
  const allowed = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const rooms = new Map();
  const env = {
    SUPABASE_URL: 'https://auth.example.test', SUPABASE_ANON_KEY: 'test',
    ALLOWED_ORIGINS: 'https://cfir94.github.io', ALLOWED_EMAIL_HASHES: allowed,
    PAIR_ROOMS: { idFromName: (id) => id, get: (id) => { if (!rooms.has(id)) rooms.set(id, room()); return rooms.get(id); } },
  };
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://auth.example.test/auth/v1/user');
    const owner = options.headers.Authorization === 'Bearer test-owner-token';
    return new Response(JSON.stringify({ id: owner ? 'owner' : 'friend', email: owner ? 'owner@example.com' : 'friend@example.com' }));
  });
  const request = async (body, token) => {
    const response = await worker.fetch(new Request('https://api.example.test/pair', { method: 'POST', headers: { Origin: 'https://cfir94.github.io', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: typeof body === 'string' ? body : JSON.stringify(body) }), env);
    return { status: response.status, data: await response.json() };
  };
  assert.equal((await request({ action: 'create' })).status, 401);
  assert.equal((await request({ action: 'create' }, 'test-friend-token')).status, 403);
  const created = await request({ action: 'create' }, 'test-owner-token');
  assert.equal(created.status, 200);
  assert.match(created.data.code, /^[a-f0-9]{32}$/);
  const joined = await request({ action: 'join', code: created.data.code }, 'test-friend-token');
  assert.equal(joined.status, 200);
  assert.equal(joined.data.role, 'masami');
  const denied = await worker.fetch(new Request('https://api.example.test/write', { method: 'POST', headers: { Origin: 'https://cfir94.github.io', Authorization: 'Bearer test-friend-token' }, body: '{}' }), env);
  assert.equal(denied.status, 403, 'joining a progress room does not permit Gemini calls');
  assert.equal((await request('{invalid', 'test-owner-token')).status, 400);
});
