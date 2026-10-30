import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { FURIGANA, KANJI } from '../src/data/furigana.js';
import { UI } from '../src/data/ui-ja.js';
import { WEEKS } from '../src/data/plan.js';

// Japanese always appears with furigana: every Japanese text the site shows is in the generated table,
// so a new sentence without readings fails here until tools/build_furigana.py is run again.
test('every Japanese text the site shows has furigana', () => {
  const { texts } = JSON.parse(execFileSync(process.execPath, ['tools/collect_japanese.mjs'], { encoding: 'utf8' }));
  const missing = texts.filter((t) => !FURIGANA[t]);
  assert.deepEqual(missing, [], 'run: node tools/collect_japanese.mjs > /tmp/ja.json && python3 tools/build_furigana.py /tmp/ja.json');
});

test('furigana segments spell the text back, and every kanji has a reading', () => {
  for (const [text, segs] of Object.entries(FURIGANA)) {
    assert.equal(segs.map(([base]) => base).join(''), text);
    for (const [base, reading] of segs) {
      if (/[㐀-鿿々]/.test(base)) assert.ok(reading, `${text}: ${base}`);
      if (reading) assert.match(reading, /^[ぁ-ゖー・()]+$/, `${text}: ${reading}`);
    }
  }
});

test('every study kanji of the plan has its readings', () => {
  for (const w of WEEKS) {
    for (const k of w.kanji.split(/\s+/)) assert.ok(KANJI[k], `${w.kanji}: ${k}`);
  }
});

test('every label has Hebrew and Japanese', () => {
  for (const [key, pair] of Object.entries(UI)) {
    assert.equal(pair.length, 2, key);
    assert.match(pair[0], /[א-ת]/, key);
    assert.match(pair[1], /[ぁ-ゖァ-ヺ㐀-鿿]/, key);
  }
});
