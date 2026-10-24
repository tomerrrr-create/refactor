import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { openStudio } from '../js/studio-link.js';
import { receiveRecipe } from '../studio/handoff.js';
import { buildVercel } from '../tools/build-vercel.mjs';
import { pwaBuild } from '../tools/update-pwa-cache.mjs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

function harness(blocked=false) {
 const messages=[],listeners=new Map();let captured=false,closed=false;
 const child={postMessage:(data,origin)=>messages.push({data,origin}),close:()=>{closed=true;}};
 const host={crypto:webcrypto,location:{href:'https://example.test/app/index.html'},
   open(url){this.url=url;assert.equal(captured,false);return blocked?null:child;},
   addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type),
   setTimeout:()=>1,clearTimeout:()=>{}};
 const file=new File(['private macro text'],'journey.txt',{type:'text/plain'});
 const capture=()=>{captured=true;return file;};
 return {host,child,file,messages,listeners,capture,get captured(){return captured;},get closed(){return closed;}};
}
test('Studio handoff is local, scoped to the exact child/origin/token, and cleans up on acknowledgment',()=>{
 const h=harness();openStudio({capture:h.capture,language:'he'},h.host);
 const url=new URL(h.host.url),token=new URLSearchParams(url.hash.slice(1)).get('transfer');
 assert.equal(url.pathname,'/app/studio/');assert.equal(url.searchParams.get('lang'),'he');
 assert.equal(url.href.includes('private'),false);assert.equal(h.captured,true);
 const ready={type:'FYI_STUDIO_READY',token};
 for(const bad of [{origin:'https://evil.test',source:h.child},{origin:url.origin,source:{} }]) h.listeners.get('message')({...bad,data:ready});
 h.listeners.get('message')({origin:url.origin,source:h.child,data:{...ready,token:'wrong'}});
 assert.equal(h.messages.length,0);
 h.listeners.get('message')({origin:url.origin,source:h.child,data:ready});
 assert.equal(h.messages[0].data.file,h.file);assert.equal(h.messages[0].origin,url.origin);
 h.listeners.get('message')({origin:url.origin,source:h.child,data:{type:'FYI_STUDIO_RECEIVED',token}});
 assert.equal(h.listeners.size,0);
});
test('blocked popups do not capture or reset the creation',()=>{
 const h=harness(true);let blocked=false;
 assert.equal(openStudio({capture:h.capture,language:'en',onBlocked:()=>{blocked=true;}},h.host),null);
 assert.equal(blocked,true);assert.equal(h.captured,false);assert.equal(h.listeners.size,0);
});
test('Studio accepts one handoff only from its opener, origin and transfer token',()=>{
 const token='a'.repeat(32),file=new File(['macro'],'macro.txt'),messages=[],received=[];
 let listener;
 const opener={postMessage:(data,origin)=>messages.push({data,origin})};
 const host={opener,location:{origin:'https://example.test',pathname:'/studio/',search:'?lang=he',hash:'#transfer='+token},
   addEventListener:(type,fn)=>{listener=fn;},removeEventListener:()=>{},setInterval:()=>1,clearInterval:()=>{},setTimeout:()=>2,clearTimeout:()=>{},
   history:{replaceState:(state,title,url)=>{host.url=url;}}};
 receiveRecipe(value=>received.push(value),host);
 const data={type:'FYI_STUDIO_RECIPE',token,file};
 listener({origin:'https://evil.test',source:opener,data});
 listener({origin:host.location.origin,source:{},data});
 listener({origin:host.location.origin,source:opener,data:{...data,token:'wrong'}});
 assert.equal(received.length,0);
 listener({origin:host.location.origin,source:opener,data});
 listener({origin:host.location.origin,source:opener,data});
 assert.deepEqual(received,[file]);assert.equal(host.opener,null);assert.equal(host.url,'/studio/?lang=he');
 assert.equal(messages.at(-1).data.type,'FYI_STUDIO_RECEIVED');
});
test('a failed capture closes only the new tab and reports failure',()=>{
 const h=harness();let error;
 openStudio({capture:()=>{throw Error('snapshot failed');},language:'en',onError:e=>{error=e;}},h.host);
 assert.equal(h.closed,true);assert.equal(error.message,'snapshot failed');assert.equal(h.listeners.size,0);
});
test('a live Studio snapshot terminates the copy at the current generation without pausing the app',async()=>{
 const source=await readFile(new URL('../js/app.js',import.meta.url),'utf8');
 const log=['[10:00:00.000] INIT_STATE -> {}','[10:00:00.100] PLAY -> gravity'];
 const base=new File([log.join('\n')],'live.txt',{type:'text/plain'});
 const h=vm.createContext({File,Date,isLifePlaying:true,armedSimulation:'gravitationalSort',currentGenerationCount:123,
   createArtRecipeFile:()=>base});
 vm.runInContext(source.slice(source.indexOf('function createStudioRecipeFile()'),source.indexOf('async function saveArtRecipeFile(')),h);
 const file=h.createStudioRecipeFile();
 assert.match(await file.text(),/\[GEN:123\] PAUSE -> ---$/);
 assert.equal(h.isLifePlaying,true);assert.equal(await base.text(),log.join('\n'));
 h.armedSimulation='breathe';assert.equal((await h.createStudioRecipeFile().text()).includes('[GEN:'),false);
 h.armedSimulation='islands';assert.equal(h.createStudioRecipeFile(),base);
 h.isLifePlaying=false;assert.equal(h.createStudioRecipeFile(),base);
});
test('deploy build includes a generated, isolated Studio while normal PWA excludes its heavy code',async()=>{
 const out=await mkdtemp(path.join(os.tmpdir(),'fyi-studio-build-'));
 try {
  await buildVercel({branch:'work',outputDirectory:out});
  const app=await readFile(path.join(out,'js/app.js'),'utf8');
  const studio=await readFile(path.join(out,'studio/index.html'),'utf8');
  // Branding must load without the generated engine, including source hosting
  // beneath a GitHub Pages project path.
  for (const [, ref] of studio.matchAll(/(?:src|href)="([^"]+fyi-eclipse-[^"]+\.png)"/g)) {
   assert.match(ref, /^\.\.\/icons\//);
   assert.equal((await readFile(path.resolve(out, 'studio', ref))).subarray(1, 4).toString(), 'PNG');
   assert.equal(new URL(ref, 'https://example.test/refactor/studio/').pathname, '/refactor/icons/' + path.basename(ref));
  }
  const engine=await readFile(path.join(out,'studio/engine/js/app.js'),'utf8');
  const engineHtml=await readFile(path.join(out,'studio/engine/index.html'),'utf8');
  assert.equal(app.includes('window.macroVideoEngine ='),false);
  assert.match(engine,/window\.macroVideoEngine =/);assert.match(engine,/function createStudioRecipeFile/);
  assert.match(studio,/id="mode"/);assert.equal(studio.includes('<select'),false);
  assert.match(engineHtml,/engine-boot\.js/);assert.equal(engineHtml.includes('src="js/pwa.js"'),false);
  const {assets}=await pwaBuild(out);
  assert.equal(assets.some(asset=>asset.includes('/studio/')),false);
 } finally {await rm(out,{recursive:true,force:true});}
});
