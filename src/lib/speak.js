// Plays Japanese text with the browser's own voice, when one is installed. This is a listening aid,
// not a recording of a person, and never an assessment.
//
// Phone browsers are fragile here: Chrome on Android drops an utterance spoken right after cancel(),
// can get stuck "paused", and may garbage-collect an utterance nobody holds; and a phone without a
// voice for the language stays silent. So: cancel only what is playing, resume, keep a reference, and
// when nothing starts, say why (once) instead of failing silently.

import { bi } from './ui.js';

let current = null; // the utterance being spoken — held so the browser cannot drop it
const helped = new Set(); // languages we already explained, once per visit

export function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

function pickVoice(language) {
  const list = speechSynthesis.getVoices();
  const want = language.toLowerCase();
  const norm = (v) => String(v.lang ?? '').toLowerCase().replace('_', '-');
  return list.find((v) => norm(v) === want) ?? list.find((v) => norm(v).startsWith(want.slice(0, 2))) ?? null;
}

export function speak(text, language = 'ja-JP') {
  if (!canSpeak()) {
    help(language);
    return false;
  }
  const synth = speechSynthesis;
  if (synth.speaking || synth.pending) synth.cancel();
  synth.resume?.();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = language;
  u.rate = 0.9;
  const voice = pickVoice(language);
  if (voice) u.voice = voice;
  let started = false;
  u.onstart = () => { started = true; };
  u.onerror = (e) => {
    if (e.error !== 'interrupted' && e.error !== 'canceled') help(language);
  };
  u.onend = () => { if (current === u) current = null; };
  current = u;
  synth.speak(u);
  // The device lists its voices and none speaks this language: nothing (or the wrong voice) will play.
  if (!voice && synth.getVoices().length) help(language);
  // Nothing started after a few seconds — most often no voice for the language, or the sound is off.
  setTimeout(() => {
    if (!started && current === u && !synth.speaking) help(language);
  }, 3000);
  return true;
}

// A short note at the bottom of the screen: why there is no sound, and where to add the voice.
function help(language) {
  if (helped.has(language) || typeof document === 'undefined') return;
  helped.add(language);
  const ua = navigator.userAgent;
  const platform = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document) ? 'Ios' : /Android/.test(ua) ? 'Android' : 'Desktop';
  const japanese = language.startsWith('ja');
  const box = document.createElement('div');
  box.className = 'toast';
  box.setAttribute('role', 'status');
  box.innerHTML = `<button type="button" class="toast-close" aria-label="סגירה">✕</button>
    <b>${bi(japanese ? 'voiceMissingJa' : 'voiceMissingEn')}</b>
    <p>${bi(`voiceHelp${platform}`)}</p>`;
  box.querySelector('.toast-close').addEventListener('click', () => box.remove());
  document.body.append(box);
  setTimeout(() => box.remove(), 20_000);
}
