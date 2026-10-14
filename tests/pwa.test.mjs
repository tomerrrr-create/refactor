import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { pwaBuild } from '../tools/update-pwa-cache.mjs';

test('offline assets and version are regenerated after every app change', async () => {
    const built = await pwaBuild();
    assert.equal(await readFile(new URL('../service-worker.js', import.meta.url), 'utf8'), built.worker,
        'Run node tools/update-pwa-cache.mjs after changing app assets');
    const manifest = JSON.parse(await readFile(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));
    assert.equal(manifest.name, 'FYI');
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.start_url, './');
    for (const icon of manifest.icons) {
        assert(built.assets.includes('./' + icon.src));
        const png = await readFile(new URL('../' + icon.src, import.meta.url));
        assert.equal(png.subarray(1, 4).toString(), 'PNG');
        assert.equal(png.readUInt32BE(16), Number(icon.sizes.split('x')[0]));
    }
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    assert(!/<script[^>]+src="https?:/u.test(html), 'offline boot must not depend on CDN scripts');
});

test('worker isolates this app cache and never intercepts writes or unrelated requests', async () => {
    const handlers = {}, deleted = [];
    const built = await pwaBuild();
    const prefix = 'fyi-pwa-' + encodeURIComponent('/refactor/') + '-';
    const current = prefix + built.version;
    let claimed = false, skipped = false;
    const context = { URL, Request, fetch: () => { throw Error('Unexpected network'); },
        self: { registration: { scope: 'https://example.com/refactor/' }, addEventListener: (name, fn) => { handlers[name] = fn; },
            clients: { claim: async () => { claimed = true; } }, skipWaiting: () => { skipped = true; } },
        caches: { keys: async () => ['unrelated-cache', 'fyi-pwa-%2Fother%2F-old', prefix + 'old', current],
            delete: async name => { deleted.push(name); },
            open: async () => ({ match: async () => new Response('cached') }) } };
    vm.runInNewContext(built.worker, context);
    let activation;
    handlers.activate({ waitUntil: promise => { activation = promise; } });
    await activation;
    assert.deepEqual(deleted, [prefix + 'old']);
    assert(claimed);
    for (const [url, method] of [['https://example.com/refactor/styles.css', 'POST'], ['https://other.com/refactor/styles.css', 'GET'], ['https://example.com/other/index.html', 'GET']]) {
        handlers.fetch({ request: new Request(url, { method }), respondWith: () => assert.fail('unrelated request intercepted') });
    }
    let response;
    handlers.fetch({ request: new Request('https://example.com/refactor/js/app.js?cache=bust'), respondWith: promise => { response = promise; } });
    assert.equal(await (await response).text(), 'cached');
    assert.equal(skipped, false, 'updates must not activate themselves while drawing');
    handlers.message({ data: { type: 'FYI_APPLY_UPDATE' } });
    assert.equal(skipped, true);
});

test('an incomplete offline update is discarded without deleting the active version', async () => {
    const built = await pwaBuild();
    const handlers = {}, deleted = [];
    const oldVersion = 'fyi-pwa-%2Frefactor%2F-previous';
    const context = { URL, Request,
        self: { registration: { scope: 'https://example.com/refactor/' }, addEventListener: (name, fn) => { handlers[name] = fn; } },
        caches: { open: async () => ({ addAll: async () => { throw Error('One asset failed'); } }),
            delete: async key => { deleted.push(key); } } };
    vm.runInNewContext(built.worker, context);
    let installation;
    handlers.install({ waitUntil: promise => { installation = promise; } });
    await assert.rejects(installation, /One asset failed/);
    assert.deepEqual(deleted, ['fyi-pwa-%2Frefactor%2F-' + built.version]);
    assert(!deleted.includes(oldVersion));
});
