// Native ES module deployment, limited to this Worker's script-scoped API.
// No account-wide subdomain lookup, bundler, or additional token permissions.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const SCRIPT = 'kotoba-api';
const MIGRATION = 'progress-rooms-v1';
const MODULES = ['index.js', 'prompts.js', 'pair-room.js'];

export function buildMetadata(config, settings, geminiKey) {
  if (config.name !== SCRIPT || config.main !== 'src/index.js') throw new Error('Unexpected Worker target.');
  if (!geminiKey) throw new Error('Missing Gemini secret.');
  const migrations = config.migrations;
  if (migrations?.length !== 1 || migrations[0].tag !== MIGRATION ||
      JSON.stringify(migrations[0].new_sqlite_classes) !== '["ProgressRoom"]') {
    throw new Error('Unexpected migration plan.');
  }
  const configured = config.durable_objects?.bindings;
  if (configured?.length !== 1 || configured[0].name !== 'PAIR_ROOMS' ||
      configured[0].class_name !== 'ProgressRoom') throw new Error('Unexpected room binding.');
  const previous = settings.bindings ?? [];
  let provisioned = false;
  for (const binding of previous) {
    if (binding.type === 'secret_text') continue;
    if (binding.type === 'plain_text' && Object.hasOwn(config.vars ?? {}, binding.name)) continue;
    if (binding.type === 'durable_object_namespace' && binding.name === 'PAIR_ROOMS' &&
        binding.class_name === 'ProgressRoom' && !binding.script_name && binding.namespace_id) {
      provisioned = true;
      continue;
    }
    // Never silently drop an independently configured binding.
    throw new Error('Unexpected existing binding; review the deployment configuration.');
  }
  const metadata = {
    main_module: 'index.js',
    compatibility_date: config.compatibility_date,
    compatibility_flags: config.compatibility_flags ?? settings.compatibility_flags ?? [],
    observability: config.observability ?? settings.observability,
    keep_bindings: ['secret_text'],
    bindings: [
      ...Object.entries(config.vars ?? {}).map(([name, text]) => ({ type: 'plain_text', name, text: String(text) })),
      { type: 'secret_text', name: 'GEMINI_API_KEY', text: geminiKey },
      { type: 'durable_object_namespace', name: 'PAIR_ROOMS', class_name: 'ProgressRoom' },
    ],
  };
  // The one supported migration is additive. Its provisioned namespace makes
  // subsequent uploads idempotent without any account-wide API reads.
  if (!provisioned) metadata.migrations = {
    new_tag: MIGRATION, steps: [{ new_sqlite_classes: ['ProgressRoom'] }],
  };
  return metadata;
}

export async function deploy({ env = process.env, request = fetch } = {}) {
  const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account, GEMINI_API_KEY: key } = env;
  if (!token || !account || !key) throw new Error('Missing deployment credentials.');
  const base = 'https://api.cloudflare.com/client/v4/accounts/' +
    encodeURIComponent(account) + '/workers/scripts/' + SCRIPT;
  async function call(suffix, init = {}) {
    const response = await request(base + suffix, {
      ...init, headers: { Authorization: 'Bearer ' + token },
      signal: AbortSignal.timeout(90000),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      // Cloudflare error messages can echo binding values. Log only codes.
      const codes = (data.errors ?? []).map(error => Number(error.code)).filter(Number.isFinite);
      throw new Error('Worker API failed: HTTP ' + response.status + ', codes=' + codes.join(','));
    }
    return data.result;
  }
  const configText = await readFile(new URL('./wrangler.jsonc', import.meta.url), 'utf8');
  const config = JSON.parse(configText.split('\n').filter(line => !line.trim().startsWith('//')).join('\n'));
  const settings = await call('/settings');
  const metadata = buildMetadata(config, settings, key);
  const form = new FormData();
  form.set('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  for (const name of MODULES) {
    const source = await readFile(new URL('./src/' + name, import.meta.url));
    form.set(name, new Blob([source], { type: 'application/javascript+module' }), name);
  }
  await call('', { method: 'PUT', body: form });
  console.log(SCRIPT + ' deployed; progress rooms configured.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  deploy().catch(error => { console.error(error.message); process.exitCode = 1; });
}
