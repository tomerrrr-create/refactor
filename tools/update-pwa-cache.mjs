import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
async function files(directory, assetRoot) {
    const entries = await readdir(path.join(assetRoot, directory), { withFileTypes: true });
    return (await Promise.all(entries.map(entry => entry.isDirectory()
        ? files(directory + '/' + entry.name, assetRoot) : [directory + '/' + entry.name]))).flat();
}
export async function pwaBuild(assetRoot = root) {
    const assets = ['./', './index.html', './styles.css', './manifest.webmanifest',
        ...(await files('js', assetRoot)).filter(file => file.endsWith('.js')).sort().map(file => './' + file),
        './vendor/tailwind-runtime.js', ...(await files('icons', assetRoot)).filter(file => file.endsWith('.png')).sort().map(file => './' + file)];
    let worker = await readFile(path.join(assetRoot, 'service-worker.js'), 'utf8');
    const template = worker.replace(/const VERSION = '[^']*';/, "const VERSION = 'pending';").replace(/const ASSETS = \[[\s\S]*?\];/, 'const ASSETS = [];');
    const hash = createHash('sha256').update(template);
    for (const asset of assets) hash.update(asset).update(await readFile(path.join(assetRoot, asset === './' ? 'index.html' : asset)));
    const version = hash.digest('hex').slice(0, 20);
    worker = template.replace("const VERSION = 'pending';", `const VERSION = '${version}';`).replace('const ASSETS = [];', `const ASSETS = ${JSON.stringify(assets, null, 4)};`);
    return { assets, version, worker };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const { worker, version, assets } = await pwaBuild();
    await writeFile(path.join(root, 'service-worker.js'), worker);
    console.log(`PWA ${version}: ${assets.length} offline resources`);
}
