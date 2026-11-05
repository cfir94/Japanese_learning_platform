import test from 'node:test';
import assert from 'node:assert/strict';
import { ENTRIES, ENTRY } from '../src/data/journey.js';
import { GUIDE, PRACTICE_NOTES } from '../src/data/guide.js';
import { FURIGANA } from '../src/data/furigana.js';

test('every journey topic has a complete casual guide paragraph and Hebrew translation', () => {
  assert.deepEqual(Object.keys(GUIDE).sort(), ENTRIES.map(e => e.id).sort());
  for (const entry of ENTRIES) {
    const lines = GUIDE[entry.id];
    assert.ok(lines.length >= 3, entry.id);
    for (const [ja, he] of lines) {
      assert.match(ja, /[ぁ-ヿ㐀-鿿]/, entry.id);
      assert.match(he, /[א-ת]/, entry.id);
      assert.doesNotMatch(ja, /(?:です|ます)[。！]/, entry.id);
      if (/[㐀-鿿]/.test(ja)) assert.ok(FURIGANA[ja], ja);
    }
  }
});

test('the practiced three-sentence opening is retained and the new topics have study vocabulary', () => {
  assert.deepEqual(GUIDE['jewish-arab-relations'].slice(0,3).map(s => s[0]), [
    'エルサレムには、ユダヤ人もアラブ人も住んでる。',
    'この町は、ユダヤ教、キリスト教、イスラム教にとって大切な場所なんだ。',
    'でも、土地や政治の問題もあって、状況は複雑なんだ。',
  ]);
  for (const [id, word] of [['sabich','揚げなす'],['market','味見する'],['guiding','つなげて'],['jewish-arab-relations','土地']]) {
    assert.ok(ENTRY[id].words.some(w => w[0] === word), word);
  }
  assert.ok(PRACTICE_NOTES['speaking-patterns'].some(n => n[0] === 'だ／なんだ'));
});
