// Plays Japanese text with the browser's own voice, when one is installed. This is a listening aid,
// not a recording of a person, and never an assessment.

let voice = null;

function pickVoice() {
  voice ??= speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('ja')) ?? null;
  return voice;
}

export function canSpeak() {
  return 'speechSynthesis' in window;
}

export function speak(text) {
  if (!canSpeak()) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP';
  u.rate = 0.9;
  const v = pickVoice();
  if (v) u.voice = v;
  speechSynthesis.speak(u);
  return true;
}

if (typeof speechSynthesis !== 'undefined') speechSynthesis.addEventListener?.('voiceschanged', () => { voice = null; });
