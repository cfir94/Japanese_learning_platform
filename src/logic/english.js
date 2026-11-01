import { ENGLISH_UNITS } from '../data/english.js';

export function englishProgress(events) {
  const units = Object.fromEntries(ENGLISH_UNITS.map((unit) => [unit.id, { done: false, attempts: 0, words: 0 }]));
  const words = new Map();
  let attempts = 0;
  for (const event of events) {
    const data = event.data ?? {};
    if (event.kind === 'english-unit' && units[data.unit]) units[data.unit].done = Boolean(data.done);
    if (event.kind === 'english-attempt') { attempts += 1; if (units[data.unit]) units[data.unit].attempts += 1; }
    if (event.kind === 'english-vocab' && typeof data.word === 'string') words.set(data.word, Boolean(data.known));
  }
  for (const unit of ENGLISH_UNITS) units[unit.id].words = unit.words.filter(([word]) => words.get(`${unit.id}:${word}`)).length;
  return { units, attempts, words: [...words.values()].filter(Boolean).length, knownWords: words };
}
