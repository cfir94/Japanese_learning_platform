// Router and boot. Each view exports render(root, params, ctx) and may return a cleanup function.

import { currentUser } from './lib/auth.js';
import { resetAiCheck } from './lib/check.js';
import { bi, jp } from './lib/ui.js';
import * as store from './lib/store.js';
import * as home from './views/home.js';
import * as plan from './views/plan.js';
import * as test from './views/test.js';
import * as journey from './views/journey.js';
import * as login from './views/login.js';
import * as english from './views/english.js';
import * as lesson from './views/lesson.js';
import { learner, selectLearner } from './lib/learner.js';
import { pairState, openPair, subscribePair } from './lib/partners.js';
import { partnerCard, bindPartner } from './lib/partner-view.js';

const root = document.getElementById('app');
const syncButton = document.getElementById('sync');
const VIEWS = { '': home, lesson, plan, journey, test, results: test, join: english };

let cleanup = null;
let current = null;

function parse() {
  const [name = '', ...rest] = location.hash.replace(/^#\/?/, '').split('/');
  return { name: Object.hasOwn(VIEWS, name) ? name : '', rest };
}

function render({ scroll = true } = {}) {
  cleanup?.();
  cleanup = null;
  const user = currentUser();
  const route = parse();
  const mode = learner();
  document.documentElement.dir = mode === 'masami' ? 'ltr' : 'rtl';
  document.documentElement.lang = mode === 'masami' ? 'en' : 'he';
  document.querySelector('[data-learner="kfir"]').innerHTML = `<b>כפיר · Cfir</b><span lang="ja">フィル · ${jp('日本語')}</span>`;
  document.querySelector('[data-learner="masami"]').innerHTML = `<b lang="ja">${jp('正美お母さん')} · Masami</b><span>English</span>`;
  const navKeys = { home: 'navToday', lesson: 'navLesson', plan: 'navPlan', journey: 'navJourney' };
  document.querySelectorAll('[data-learner]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.learner === mode)));
  for (const a of document.querySelectorAll('[data-nav]')) {
    a.innerHTML = bi(navKeys[a.dataset.nav], { stack: true });
    const active = (a.dataset.nav === 'home' && route.name === '') || a.dataset.nav === route.name;
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  if (!user) {
    current = login;
    cleanup = login.render(root, { onDone: start });
    return;
  }
  const readOnly = Boolean(pairState.role && pairState.role !== mode);
  const partner = pairState.snapshots[mode];
  current = mode === 'masami' || route.name === 'join' ? english : VIEWS[route.name];
  if (readOnly && mode === 'kfir' && (!partner || !['plan', 'journey'].includes(route.name))) {
    current = { live: false };
    root.innerHTML = `<div class="stack">${partnerCard()}<section class="card"><p>${bi('pairPrivacy')}</p></section></div>`;
    bindPartner(root);
  } else {
    cleanup = current.render(root, route, { readOnly, partner, rerender: () => render({ scroll: false }) }) ?? null;
  }
  if (scroll) window.scrollTo({ top: 0 });
}

const SYNC_KEY = { syncing: 'syncing', ok: 'synced', offline: 'offline', 'no-table': 'localOnly', error: 'syncError' };

function showSync() {
  syncButton.dataset.state = store.sync.state;
  const key = SYNC_KEY[store.sync.state];
  syncButton.querySelector('.sync-text').innerHTML = key ? bi(key) : '';
  syncButton.title = store.sync.message || syncButton.querySelector('.bi-he')?.textContent || '';
}

syncButton.addEventListener('click', () => store.pull());

// Views that only display data refresh when new events arrive; the test runner manages itself.
store.subscribe(() => {
  showSync();
  if (current?.live) render({ scroll: false });
});

// Furigana are on unless switched off (journey page switch); a per-device preference.
try {
  document.documentElement.classList.toggle('no-furi', localStorage.getItem('kotoba-furigana') === '0');
} catch {
  // Storage blocked: furigana stay on.
}

function start() {
  resetAiCheck();
  if (parse().name === 'join') selectLearner('masami', false);
  const user = currentUser();
  if (user) { store.open(user); openPair(); }
  render();
}

document.querySelectorAll('[data-learner]').forEach((button) => button.addEventListener('click', () => selectLearner(button.dataset.learner)));
addEventListener('kotoba-learner', () => render());
subscribePair(() => {
  if (pairState.role && pairState.role !== learner() && current !== login) render({ scroll: false });
});
addEventListener('hashchange', () => render());
start();

