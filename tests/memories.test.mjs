import test from 'node:test';
import assert from 'node:assert/strict';
import {stat} from 'node:fs/promises';
import {photoCatalog,dailyMemories,primaryMemories} from '../src/memories.mjs';

test('all memories exist locally and daily placement stays stable without dropping photos',async()=>{
  assert.equal(photoCatalog.length,17);
  const first=dailyMemories('2026-10-29').map(p=>p.id);
  assert.deepEqual(dailyMemories('2026-10-29').map(p=>p.id),first);
  assert.equal(new Set(first).size,17);
  assert.notDeepEqual(dailyMemories('2026-10-30').map(p=>p.id),first);
  for(const photo of photoCatalog){const file=await stat(new URL('../'+photo.src,import.meta.url));assert.ok(file.size>1000&&file.size<300000);}
});

test('the requested opening pair stays fixed independently of the daily shuffle',()=>{
  assert.deepEqual(primaryMemories().map(p=>p.id),['memory-17','memory-02']);
  assert.ok(primaryMemories().every(p=>photoCatalog.includes(p)));
});
