// Plays Japanese text with the browser's own voice, when one is installed. This is a listening aid,
// not a recording of a person, and never an assessment.

const voices = new Map();

function pickVoice(language) {
  if (!voices.has(language)) voices.set(language, speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith(language.slice(0, 2))) ?? null);
  return voices.get(language);
}

export function canSpeak() {
  return 'speechSynthesis' in window;
}

export function speak(text, language = 'ja-JP') {
  if (!canSpeak()) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = language;
  u.rate = 0.9;
  const v = pickVoice(language);
  if (v) u.voice = v;
  speechSynthesis.speak(u);
  return true;
}

if (typeof speechSynthesis !== 'undefined') speechSynthesis.addEventListener?.('voiceschanged', () => voices.clear());

