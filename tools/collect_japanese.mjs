// Collects every Japanese text the site shows, for tools/build_furigana.py.
// Output (stdout): JSON { texts: [...], known: { text: reading } } — `known` are readings written by hand
// (journey words and sentences) that the generated furigana is checked against.
//
//   node tools/collect_japanese.mjs > /tmp/ja.json

import { GRAMMAR, LESSONS } from '../src/data/grammar.js';
import { ITEMS, PARTS, WRITING, SPEAKING } from '../src/data/placement.js';
import { WEEKS, MILESTONES, AFTER_MARCH } from '../src/data/plan.js';
import { ENTRIES, CATEGORIES } from '../src/data/journey.js';
import { GUIDE, PRACTICE_NOTES } from '../src/data/guide.js';
import { UI_JA } from '../src/data/ui-ja.js';
import { ENGLISH_UNITS, ENGLISH_PARTS, ENGLISH_LABELS, ENGLISH_CHECKIN } from '../src/data/english.js';
import { TEACH, FOCUS, FOCUS_WORDS, KANJI_INFO, filled } from '../src/data/lessons.js';
import { POINT } from '../src/data/grammar.js';
import { dayPoints, speakingTask, writingPrompt } from '../src/logic/lesson.js';

const KANJI = /[㐀-鿿々]/;
const RUN = /[　-ヿ㐀-鿿！-｠]+(?:[\s()→/+=-]*[　-ヿ㐀-鿿！-｠]+)*/gu; // same as rich() in src/lib/ui.js
const texts = new Set();
const known = {};

const add = (s) => {
  if (typeof s === 'string' && KANJI.test(s)) texts.add(s);
};
// Japanese the site can read aloud (🔊), kana-only too: tools/build_audio.py records each one once.
const speech = new Set();
const say = (s) => {
  if (typeof s === 'string' && /[ぁ-ヿ㐀-鿿]/.test(s)) speech.add(s.trim());
};
const addRuns = (s) => {
  for (const run of String(s ?? '').match(RUN) ?? []) add(run);
};

for (const g of GRAMMAR) { add(g.pattern); addRuns(g.title); }
for (const l of LESSONS) add(l.ja);
for (const i of ITEMS) {
  add(i.jp); add(i.base); (i.answers ?? []).forEach(add); (i.models ?? []).forEach(add);
  addRuns(i.he); addRuns(i.ask); (i.options ?? []).forEach(addRuns);
}
for (const x of [...PARTS.map((p) => p.title), ...WRITING.map((w) => w.he), ...SPEAKING.map((s) => s.he)]) addRuns(x);
for (const w of WEEKS) {
  add(w.conversation.expression); say(w.conversation.expression); addRuns(w.conversation.title); addRuns(w.conversation.target);
  addRuns(w.title); addRuns(w.vocabulary);
  for (const d of w.days) addRuns(d.topic);
}
for (const m of MILESTONES) { addRuns(m.language); addRuns(m.target); }
for (const x of AFTER_MARCH) addRuns(x.focus);
for (const c of CATEGORIES) add(c.ja);
for (const e of ENTRIES) {
  add(e.ja); addRuns(e.intro);
  if (e.reading) known[e.ja] = e.reading;
  for (const w of e.words) { add(w[0]); say(w[0]); if (w[1]) known[w[0]] = w[1]; addRuns(w[2]); }
  for (const s of [...e.sentences, e.ask]) { add(s[0]); say(s[0]); known[s[0]] = s[1]; addRuns(s[2]); }
}
Object.values(UI_JA).forEach(add);
for (const lines of Object.values(GUIDE)) {
  for (const [ja, he] of lines) { add(ja); say(ja); addRuns(he); }
}
for (const notes of Object.values(PRACTICE_NOTES)) {
  for (const [ja, he] of notes) { add(ja); addRuns(he); }
}
// The daily lesson: explanations, examples, exercises (with the filled-in sentence), focus drills,
// the study kanji's example words, and the day's writing and speaking prompts.
const exercise = (x) => {
  addRuns(x.he); addRuns(x.ask); add(x.base);
  if (x.type === 'blank') { add(x.jp); x.answers.forEach(add); add(filled(x)); say(filled(x)); } else { x.models.forEach(add); x.models.forEach(say); }
};
for (const t of Object.values(TEACH)) {
  t.explain.forEach(addRuns);
  for (const [ja, he] of t.examples) { add(ja); say(ja); addRuns(he); }
  t.drills.forEach(exercise);
}
for (const f of FOCUS) { addRuns(f.title); f.explain.forEach(addRuns); f.drills.forEach(exercise); }
for (const i of ITEMS) {
  if (i.type === 'blank') { add(filled(i)); say(filled(i)); } else (i.models ?? []).forEach(say);
}
for (const [ja, he] of FOCUS_WORDS) { add(ja); say(ja); addRuns(he); }
for (const [, word, he] of Object.values(KANJI_INFO)) { add(word); say(word); addRuns(he); }
for (const w of WEEKS) {
  for (const d of w.days) {
    const patterns = dayPoints(w, d).map((pid) => POINT[pid].pattern);
    addRuns(writingPrompt(patterns));
    addRuns(speakingTask(w, d, [], patterns).he);
  }
}
for (const unit of ENGLISH_UNITS) {
  add(unit.ja); add(unit.goal);
  unit.words.forEach((word) => add(word[1]));
  unit.examples.forEach((sentence) => add(sentence[1]));
  unit.prompts.forEach((prompt) => add(prompt[0]));
}
Object.values(ENGLISH_LABELS).forEach((label) => add(label[1]));
ENGLISH_PARTS.forEach((part) => add(part.ja));
for (const unit of ENGLISH_UNITS) (unit.drills ?? []).forEach((drill) => add(drill[2]));
ENGLISH_CHECKIN.forEach((prompt) => add(prompt[1]));
['正美お母さん', '日本語', '日本語で', '英語で質問してみよう。', '参考資料', '名前とメールアドレスで、自分の学習記録を保存できます。', 'ログインできません。メールアドレスと接続を確認してください。'].forEach(add);

process.stdout.write(JSON.stringify({ texts: [...texts].sort(), known, speech: [...speech].sort() }));


