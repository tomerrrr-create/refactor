import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pwaBuild } from './update-pwa-cache.mjs';
import { buildStudio } from './build-studio.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

// Branch identity is resolved once at build time, never in the browser.
// The checked-in app remains the production version for GitHub Pages.
export async function buildVercel({ branch = process.env.VERCEL_GIT_COMMIT_REF,
    outputDirectory = path.join(root, 'dist') } = {}) {
    const work = branch === 'work';
    const source = await pwaBuild();
    await rm(outputDirectory, { recursive: true, force: true });
    await mkdir(outputDirectory, { recursive: true });
    const files = new Set(source.assets.map(asset => asset === './' ? 'index.html' : asset));
    files.add('service-worker.js');
    for (const file of files) {
        const target = path.join(outputDirectory, file);
        await mkdir(path.dirname(target), { recursive: true });
        await copyFile(path.join(root, file), target);
    }
    if (work) {
        const icon = 'icons/fyi-social-preview.png';
        const png = await readFile(path.join(outputDirectory, icon));
        const size = `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
        const manifestPath = path.join(outputDirectory, 'manifest.webmanifest');
        const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
        manifest.name = manifest.short_name = 'FYI Work';
        manifest.icons = [{ src: icon, sizes: size, type: 'image/png', purpose: 'any' }];
        await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
        const htmlPath = path.join(outputDirectory, 'index.html');
        let html = await readFile(htmlPath, 'utf8');
        html = html.replace('<title>Follow Your Intuition</title>', '<title>FYI Work</title>')
            .replace('name="apple-mobile-web-app-title" content="FYI"', 'name="apple-mobile-web-app-title" content="FYI Work"')
            .replace(/<link rel="apple-touch-icon"[^>]*>/, `<link rel="apple-touch-icon" sizes="${size}" href="${icon}">`)
            .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" type="image/png" sizes="${size}" href="${icon}">`);
        await writeFile(htmlPath, html);
    }
    await buildStudio({ outputDirectory:path.join(outputDirectory,'studio') });
    const built = await pwaBuild(outputDirectory);
    await writeFile(path.join(outputDirectory, 'service-worker.js'), built.worker);
    return { variant: work ? 'work' : 'main', branch: branch || 'unspecified', version: built.version, outputDirectory };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const result = await buildVercel();
    console.log(`FYI build: branch=${result.branch}; icon=${result.variant}; PWA=${result.version}`);
}
