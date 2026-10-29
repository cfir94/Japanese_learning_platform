// kotoba-api — Gemini checks for written and spoken Japanese answers.
//
// The Gemini key lives only here (a Worker secret). Every request must carry the
// learner's Supabase access token; the Worker verifies it with Supabase and accepts
// only the accounts listed (as email hashes) in ALLOWED_EMAIL_HASHES, so nobody else
// can spend the quota.
//
// Routes:
//   GET  /health
//   POST /grade   { items: [{ id, prompt, target, models, answer }] }      → { results }
//   POST /write   { id, prompt, answer, catalog }                          → { result }
//   POST /speech  { id, prompt, catalog, audio (base64), mime }            → { result }

import { GRADE_SCHEMA, WRITE_SCHEMA, SPEECH_SCHEMA, gradePrompt, writePrompt, speechPrompt, SYSTEM } from './prompts.js';

const MAX_ITEMS = 12;
const MAX_TEXT = 4000;
const MAX_AUDIO_BASE64 = 8_000_000; // ≈ 6 MB of audio, a few minutes of webm/opus

const tokenCache = new Map(); // access token → { email, until }

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    try {
      if (url.pathname === '/health') return json({ ok: true, model: env.GEMINI_MODEL }, 200, cors);
      if (request.method !== 'POST') return json({ error: 'not_found' }, 404, cors);
      if (!cors['Access-Control-Allow-Origin']) return json({ error: 'forbidden_origin' }, 403, cors);

      const user = await verifyUser(request, env);
      if (!user) return json({ error: 'unauthorized' }, 401, cors);

      const body = await request.json().catch(() => null);
      if (!body || typeof body !== 'object') return json({ error: 'bad_request' }, 400, cors);

      if (url.pathname === '/grade') return json(await grade(body, env), 200, cors);
      if (url.pathname === '/write') return json(await write(body, env), 200, cors);
      if (url.pathname === '/speech') return json(await speech(body, env), 200, cors);
      return json({ error: 'not_found' }, 404, cors);
    } catch (error) {
      console.error(JSON.stringify({ event: 'error', message: String(error?.message || error).slice(0, 300) }));
      const status = error.status || 500;
      return json({ error: error.code || 'server_error' }, status, cors);
    }
  },
};

async function grade(body, env) {
  const items = Array.isArray(body.items) ? body.items.slice(0, MAX_ITEMS) : [];
  if (!items.length) throw httpError(400, 'no_items');
  const clean = items.map((item) => ({
    id: text(item.id, 40),
    prompt: text(item.prompt, 600),
    target: text(item.target, 300),
    models: (Array.isArray(item.models) ? item.models : []).slice(0, 6).map((m) => text(m, 300)),
    answer: text(item.answer, 600),
  }));
  const out = await gemini(env, [{ text: gradePrompt(clean) }], GRADE_SCHEMA);
  const byId = new Map((out.results || []).map((r) => [r.id, r]));
  return { results: clean.map((item) => normalizeGrade(byId.get(item.id), item.id)) };
}

async function write(body, env) {
  const task = {
    id: text(body.id, 40),
    prompt: text(body.prompt, 800),
    answer: text(body.answer, MAX_TEXT),
    catalog: catalogText(body.catalog),
  };
  if (!task.answer.trim()) throw httpError(400, 'empty');
  const out = await gemini(env, [{ text: writePrompt(task) }], WRITE_SCHEMA);
  return { result: out };
}

async function speech(body, env) {
  const audio = typeof body.audio === 'string' ? body.audio : '';
  const mime = /^audio\/[a-z0-9.+-]+(;.*)?$/i.test(body.mime || '') ? body.mime.split(';')[0] : '';
  if (!audio || !mime) throw httpError(400, 'no_audio');
  if (audio.length > MAX_AUDIO_BASE64) throw httpError(413, 'audio_too_long');
  const task = { id: text(body.id, 40), prompt: text(body.prompt, 800), catalog: catalogText(body.catalog) };
  const out = await gemini(
    env,
    [{ text: speechPrompt(task) }, { inline_data: { mime_type: mime, data: audio } }],
    SPEECH_SCHEMA,
  );
  return { result: out };
}

async function gemini(env, parts, schema) {
  const model = env.GEMINI_MODEL || 'gemini-flash-latest';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: schema },
      }),
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    console.error(JSON.stringify({ event: 'gemini_error', status: response.status, detail: detail.slice(0, 400) }));
    throw httpError(response.status === 429 ? 429 : 502, response.status === 429 ? 'rate_limited' : 'gemini_unavailable');
  }
  const data = await response.json();
  const raw = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  try {
    return JSON.parse(raw);
  } catch {
    throw httpError(502, 'bad_model_output');
  }
}

async function verifyUser(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || token.length > 4096) return null;
  const now = Date.now();
  const cached = tokenCache.get(token);
  if (cached && cached.until > now) return cached;

  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  const user = await response.json();
  const email = String(user?.email || '').trim().toLowerCase();
  const allowed = String(env.ALLOWED_EMAIL_HASHES || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
  if (!email || !allowed.includes(await sha256(email))) return null;
  const entry = { email, until: now + 5 * 60_000 };
  tokenCache.set(token, entry);
  if (tokenCache.size > 50) tokenCache.delete(tokenCache.keys().next().value);
  return entry;
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function normalizeGrade(result, id) {
  const score = [0, 1, 2].includes(result?.score) ? result.score : null;
  return {
    id,
    score,
    corrected: text(result?.corrected, 400),
    feedback: text(result?.feedback, 600),
    other: text(result?.other, 400),
  };
}

function catalogText(catalog) {
  if (!Array.isArray(catalog)) return '';
  return catalog
    .slice(0, 120)
    .map((c) => `${text(c.id, 12)}: ${text(c.pattern, 80)} — ${text(c.title, 80)}`)
    .join('\n');
}

function text(value, max) {
  return String(value ?? '').slice(0, max);
}

function httpError(status, code) {
  return Object.assign(new Error(code), { status, code });
}

function corsHeaders(origin, env) {
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim());
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
