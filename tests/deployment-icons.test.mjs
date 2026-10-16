import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildVercel } from '../tools/build-vercel.mjs';
import { pwaBuild } from '../tools/update-pwa-cache.mjs';

const root = new URL('../', import.meta.url);
test('identical source builds a green Work app and unchanged production app by branch', async () => {
    const temp = await mkdtemp(path.join(tmpdir(), 'fyi-icons-'));
    try {
        const builds = {};
        for (const branch of ['main', 'work', 'another-branch', undefined]) {
            const directory = path.join(temp, branch || 'unknown');
            builds[branch || 'unknown'] = await buildVercel({ branch, outputDirectory: directory });
            const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.webmanifest'), 'utf8'));
            const html = await readFile(path.join(directory, 'index.html'), 'utf8');
            const work = branch === 'work';
            assert.equal(manifest.name, work ? 'FYI Work' : 'FYI');
            assert.equal(manifest.start_url, './'); assert.equal(manifest.id, './');
            if (work) {
                assert.deepEqual(manifest.icons, [{ src: 'icons/fyi-social-preview.png', sizes: '774x774', type: 'image/png', purpose: 'any' }]);
                assert.match(html, /apple-touch-icon" sizes="774x774" href="icons\/fyi-social-preview.png"/);
                assert.match(html, /apple-mobile-web-app-title" content="FYI Work"/);
                assert.match(html, /<title>FYI Work<\/title>/);
            } else {
                assert.equal(html, await readFile(new URL('index.html', root), 'utf8'));
                assert.equal(await readFile(path.join(directory, 'manifest.webmanifest'), 'utf8'), await readFile(new URL('manifest.webmanifest', root), 'utf8'));
            }
            const built = await pwaBuild(directory);
            assert.equal(await readFile(path.join(directory, 'service-worker.js'), 'utf8'), built.worker);
            for (const asset of built.assets.filter(asset => /\.js$|\.png$|\.css$/.test(asset))) {
                assert.deepEqual(await readFile(path.join(directory, asset)), await readFile(new URL(asset, root)));
            }
            // Sharing metadata must stay identical to production, even in Work.
            const social = text => text.match(/<meta[^>]+(?:og:|twitter:)[^>]+>/g);
            assert.deepEqual(social(html), social(await readFile(new URL('index.html', root), 'utf8')));
        }
        assert.notEqual(builds.work.version, builds.main.version);
        assert.equal(builds.main.version, builds['another-branch'].version);
        assert.equal(builds.main.version, builds.unknown.version);
        const repeated = await buildVercel({ branch: 'work', outputDirectory: builds.work.outputDirectory });
        assert.equal(repeated.version, builds.work.version);
    } finally { await rm(temp, { recursive: true, force: true }); }
});
