// Router and boot. Each view exports render(root, params, ctx) and may return a cleanup function.

import { currentUser } from './lib/auth.js';
import { resetAiCheck } from './lib/check.js';
import { bi } from './lib/ui.js';
import * as store from './lib/store.js';
import * as home from './views/home.js';
import * as plan from './views/plan.js';
import * as test from './views/test.js';
import * as journey from './views/journey.js';
import * as login from './views/login.js';

const root = document.getElementById('app');
const syncButton = document.getElementById('sync');
const VIEWS = { '': home, plan, journey, test, results: test };

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
  for (const a of document.querySelectorAll('[data-nav]')) {
    const active = (a.dataset.nav === 'home' && route.name === '') || a.dataset.nav === route.name || (a.dataset.nav === 'test' && route.name === 'results');
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  if (!user) {
    current = login;
    cleanup = login.render(root, { onDone: start });
    return;
  }
  current = VIEWS[route.name];
  cleanup = current.render(root, route, { rerender: () => render({ scroll: false }) }) ?? null;
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
  const user = currentUser();
  if (user) store.open(user);
  render();
}

addEventListener('hashchange', () => render());
start();
