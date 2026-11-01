import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildMetadata, deploy } from '../worker/deploy.mjs';

const config = JSON.parse(readFileSync(new URL('../worker/wrangler.jsonc', import.meta.url), 'utf8')
  .split('\n').filter(line => !line.trim().startsWith('//')).join('\n'));

test('first deployment adds only the SQLite progress-room migration and preserves secrets', () => {
  const metadata = buildMetadata(config, { bindings: [{ type: 'secret_text', name: 'EXISTING_SECRET' }] }, 'test-key');
  assert.deepEqual(metadata.migrations, { new_tag: 'progress-rooms-v1', steps: [{ new_sqlite_classes: ['ProgressRoom'] }] });
  assert.deepEqual(metadata.keep_bindings, ['secret_text']);
  assert.equal(metadata.bindings.find(b => b.name === 'GEMINI_API_KEY').text, 'test-key');
  assert.equal(metadata.bindings.find(b => b.name === 'ALLOWED_EMAIL_HASHES').text, config.vars.ALLOWED_EMAIL_HASHES);
});

test('a provisioned namespace is preserved and does not repeat its migration', () => {
  const metadata = buildMetadata(config, { bindings: [{
    type: 'durable_object_namespace', name: 'PAIR_ROOMS', class_name: 'ProgressRoom', namespace_id: 'existing-room',
  }] }, 'test-key');
  assert.equal(metadata.migrations, undefined);
  assert.equal(metadata.bindings.filter(b => b.name === 'PAIR_ROOMS').length, 1);
});

test('deployment rejects unexpected targets, migrations and existing bindings', () => {
  assert.throws(() => buildMetadata({ ...config, name: 'other-worker' }, {}, 'x'), /target/);
  assert.throws(() => buildMetadata({ ...config, migrations: [] }, {}, 'x'), /migration/);
  assert.throws(() => buildMetadata(config, { bindings: [{ type: 'kv_namespace', name: 'UNREVIEWED' }] }, 'x'), /binding/);
});

test('script-scoped deployment errors do not expose returned secret values', async () => {
  await assert.rejects(deploy({
    env: { CLOUDFLARE_API_TOKEN: 'token-value', CLOUDFLARE_ACCOUNT_ID: 'account', GEMINI_API_KEY: 'key-value' },
    request: async url => {
      assert.equal(url, 'https://api.cloudflare.com/client/v4/accounts/account/workers/scripts/kotoba-api/settings');
      return { ok: false, status: 403, json: async () => ({
        success: false, errors: [{ code: 10000, message: 'token-value key-value' }],
      }) };
    },
  }), error => {
    assert.match(error.message, /HTTP 403, codes=10000/);
    assert.doesNotMatch(error.message, /token-value|key-value/);
    return true;
  });
});
