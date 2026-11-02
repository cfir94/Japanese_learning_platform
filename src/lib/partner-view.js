import { pairState, createPair, leavePair, syncPair, inviteLink, subscribePair } from './partners.js';
import { bi, marks } from './ui.js';
import { learner } from './learner.js';
import { ENGLISH_UNITS } from '../data/english.js';

export function partnerCard() {
  const jp = pairState.snapshots.kfir;
  const en = pairState.snapshots.masami;
  const closed = pairState.state === 'closed';
  return `<section class="card" id="couple-progress">
    <h2>🌱 ${bi('pairTitle')}</h2><p class="small muted">${bi('pairPrivacy')}</p>
    <div class="partner-stats">
      <div><b>כפיר · Cfir · <span lang="ja">フィル</span></b><p class="small">${bi('pairJapanese')}</p>${jp ? `<p class="num">${jp.pace.doneDays} / ${jp.pace.totalDays} ${bi('daysDone')}<br>${Math.round(jp.pace.minutesDone / 6) / 10} ${bi('pairHours')}</p>` : `<p class="small muted">${bi('pairNoProgress')}</p>`}</div>
      <div><b lang="ja">${marks('正美{まさみ}お母{かあ}さん')} · Masami</b><p class="small">${bi('pairEnglish')}</p>${en ? `<p class="num">${Object.values(en.units).filter((u) => u.done).length} / ${ENGLISH_UNITS.length} ${bi('pairUnits')}<br>${en.attempts} ${bi('pairAttempts')} · ${en.words} ${bi('pairWords')}</p>` : `<p class="small muted">${bi('pairNoProgress')}</p>`}</div>
    </div>
    <p class="small muted">${bi(pairState.state === 'offline' ? 'pairOffline' : closed ? 'pairClosed' : pairState.connected ? 'pairConnected' : pairState.code ? 'pairWaiting' : 'pairSetup')}</p>
    <div class="actions">${pairState.code && !closed ? `<button class="btn" data-pair-copy>${bi('pairCopy')}</button><button class="btn quiet" data-pair-refresh>${bi('pairRefresh')}</button><button class="btn quiet small" data-pair-leave>${bi('pairDisconnect')}</button>` : learner() === 'kfir' ? `<button class="btn" data-pair-create>${bi('pairCreate')}</button>` : ''}</div>
    <p class="small" data-pair-message role="status"></p>
  </section>`;
}

export function bindPartner(root = document) {
  const card = root.querySelector('#couple-progress');
  if (!card) return;
  const run = (selector, action) => card.querySelector(selector)?.addEventListener('click', async (event) => {
    event.currentTarget.disabled = true;
    try { await action(); }
    catch { card.querySelector('[data-pair-message]').innerHTML = bi('pairFailed'); }
    finally { if (event.target.isConnected) event.target.disabled = false; }
  });
  run('[data-pair-create]', createPair);
  run('[data-pair-refresh]', syncPair);
  run('[data-pair-leave]', leavePair);
  run('[data-pair-copy]', async () => {
    const link = inviteLink();
    try { await navigator.clipboard.writeText(link); card.querySelector('[data-pair-message]').innerHTML = bi('copied'); }
    catch {
      const field = document.createElement('input'); field.readOnly = true; field.value = link; field.dir = 'ltr';
      card.querySelector('[data-pair-message]').replaceChildren(field); field.select();
    }
  });
}

subscribePair(() => {
  const old = document.querySelector('#couple-progress');
  if (!old) return;
  old.outerHTML = partnerCard();
  bindPartner();
});
