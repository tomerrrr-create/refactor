import test from 'node:test';
import assert from 'node:assert/strict';
import {flashToolMode} from '../js/tool-mode-glow.js';
test('tool glow is finite, restarts only its own flash and honors reduced motion without persistent styles',async t=>{
 const old=globalThis.window;let reduced=false;globalThis.window={matchMedia:()=>({matches:reduced})};t.after(()=>globalThis.window=old);
 const animations=[];const button={animate(frames,options){let end;const animation={frames,options,cancelled:false,finished:new Promise(resolve=>end=resolve),cancel(){this.cancelled=true;end();},finish(){end();}};animations.push(animation);return animation;}};
 flashToolMode(button);assert.equal(animations[0].options.duration,1100);assert.equal(animations[0].options.fill,undefined);
 flashToolMode(button);assert(animations[0].cancelled);assert(!animations[1].cancelled);
 reduced=true;flashToolMode(button);assert.equal(animations[2].options.duration,180);assert(animations[1].cancelled);
 animations[2].finish();await Promise.resolve();flashToolMode(button);assert(!animations[2].cancelled);animations[3].finish();
});
