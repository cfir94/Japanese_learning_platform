// Collects every Japanese text the site shows, for tools/build_furigana.py.
// Output (stdout): JSON { texts: [...], known: { text: reading } } — `known` are readings written by hand
// (journey words and sentences) that the generated furigana is checked against.
//
//   node tools/collect_japanese.mjs > /tmp/ja.json

import { GRAMMAR, LESSONS } from '../src/data/grammar.js';
import { ITEMS, PARTS, WRITING, SPEAKING } from '../src/data/placement.js';
import { WEEKS, MILESTONES, AFTER_MARCH } from '../src/data/plan.js';
import { ENTRIES, CATEGORIES } from '../src/data/journey.js';
import { UI_JA } from '../src/data/ui-ja.js';

const KANJI = /[㐀-鿿々]/;
const RUN = /[　-ヿ㐀-鿿！-｠]+(?:\s+[　-ヿ㐀-鿿！-｠]+)*/gu;
const texts = new Set();
const known = {};

const add = (s) => {
  if (typeof s === 'string' && KANJI.test(s)) texts.add(s);
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
  add(w.conversation.expression); addRuns(w.conversation.title); addRuns(w.conversation.target);
  addRuns(w.title); addRuns(w.vocabulary);
  for (const d of w.days) addRuns(d.topic);
}
for (const m of MILESTONES) { addRuns(m.language); addRuns(m.target); }
for (const x of AFTER_MARCH) addRuns(x.focus);
for (const c of CATEGORIES) add(c.ja);
for (const e of ENTRIES) {
  add(e.ja); addRuns(e.intro);
  if (e.reading) known[e.ja] = e.reading;
  for (const w of e.words) { add(w[0]); if (w[1]) known[w[0]] = w[1]; addRuns(w[2]); }
  for (const s of [...e.sentences, e.ask]) { add(s[0]); known[s[0]] = s[1]; addRuns(s[2]); }
}
Object.values(UI_JA).forEach(add);

process.stdout.write(JSON.stringify({ texts: [...texts].sort(), known }));
