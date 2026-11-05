import test from 'node:test';
import assert from 'node:assert/strict';
import { ENTRIES, ENTRY } from '../src/data/journey.js';
import { GUIDE, PRACTICE_NOTES } from '../src/data/guide.js';
import { FURIGANA } from '../src/data/furigana.js';
import { WORD_IMAGE_IDS, wordImage } from '../src/data/word-images.js';
import { VOCAB_PHOTOS } from '../src/data/vocab-photos.js';
import { existsSync } from 'node:fs';

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

test('picture cards resolve to licensed subject photos and abstract words remain text', () => {
  const words = new Set(ENTRIES.flatMap(e => e.words.map(w => w[0])));
  for (const word of Object.keys(WORD_IMAGE_IDS)) {
    assert.ok(words.has(word), word);
    const image = wordImage(word);
    assert.ok(image?.src && image.alt && image.source && image.license && image.author, word);
    assert.match(image.source, /^https:\/\/commons\.wikimedia\.org\//);
  }
  for (const photo of VOCAB_PHOTOS) {
    assert.ok(existsSync(new URL('../' + photo.src.replace(/^\.\//,''), import.meta.url)), photo.src);
  }
  assert.equal(wordImage('政治'), null);
  assert.equal(wordImage('について'), null);
  assert.equal(wordImage('市場').id, 'market');
});
