import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pwaBuild } from './update-pwa-cache.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));

// The engine is generated from the same app source on every build. It is never
// downloaded by the app or maintained as a second copy of the simulations.
export async function buildStudio({ outputDirectory = path.join(root, 'studio') } = {}) {
    const sourceDirectory = path.join(root, 'studio');
    const hook = await readFile(new URL('./studio-engine-hook.js',import.meta.url),'utf8');
    await mkdir(outputDirectory, { recursive:true });
    if (path.resolve(outputDirectory) !== sourceDirectory) {
        for (const name of ['index.html','exporter.js','i18n.js','handoff.js','video-effects.js','engine-boot.js','vendor']) {
            await cp(path.join(sourceDirectory,name),path.join(outputDirectory,name),{recursive:true});
        }
    }
    const engine = path.join(outputDirectory,'engine');
    const { assets } = await pwaBuild();
    for (const asset of assets) {
        const file = asset === './' ? 'index.html' : asset;
        const target = path.join(engine,file);
        await mkdir(path.dirname(target),{recursive:true});
        await cp(path.join(root,file),target);
    }
    let html = await readFile(path.join(engine,'index.html'),'utf8');
    html = html.replace('<script type="module" src="js/pwa.js"></script>','')
        .replace('<script type="module" src="js/app.js">','<script src="../vendor/video-clock.js"></script><script src="../engine-boot.js"></script><script type="module" src="js/app.js">');
    await writeFile(path.join(engine,'index.html'),html);
    const marker = '      initializeApp();';
    let source = await readFile(path.join(engine,'js/app.js'),'utf8');
    if(source.split(marker).length !== 2) throw Error('Review Studio adapter: app bootstrap changed');
    source = "import { DEFAULT_VIDEO_EFFECTS, recordedEffects, inspectEffects, compositeGlow } from '../../video-effects.js';\n" + source;
    source = source.replace('function executeMacroAction(action) {','function executeMacroAction(action) {\n    window.macroVideoEngine?.applyRecordedEffects(action);');
    source = source.replace('function renderToScreen(timestamp) {','function renderToScreen(timestamp) { return; // Studio renders only its output canvas\n').replace(marker,hook);
    for (const delay of [5000,1500,2000]) source = source.replace(`await new Promise(r => setTimeout(r, ${delay}));`,'/* No splash delay in Studio engine. */');
    await writeFile(path.join(engine,'js/app.js'),source);
    return { outputDirectory };
}
if(process.argv[1] === fileURLToPath(import.meta.url)) console.log(await buildStudio());
