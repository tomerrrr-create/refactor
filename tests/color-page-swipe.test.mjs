import test from 'node:test';
import assert from 'node:assert/strict';
import {bindColorPageSwipe} from '../js/color-page-swipe.js';

function harness() {
    const listeners=new Map(),options=new Map(),pages=[];
    const element={addEventListener(type,callback,config){listeners.set(type,callback);options.set(type,config);}};
    bindColorPageSwipe(element,{onPage:forward=>pages.push(forward)});
    const touch=(x,y,id=1)=>({identifier:id,clientX:x,clientY:y});
    const event=(type,x,y,extra={})=>{
        const point=touch(x,y),e={touches:type==='touchend'?[]:[point],changedTouches:[point],cancelable:true,
            defaultPrevented:false,stopped:false,detail:1,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;},...extra};
        listeners.get(type)(e);return e;
    };
    return {pages,options,event,touch};
}
test('horizontal swipes prevent native movement and page once on release in either direction',()=>{
    const h=harness();
    assert.equal(h.options.get('touchmove').passive,false);
    for(const sign of [-1,1]){
        h.event('touchstart',100,100);
        assert(h.event('touchmove',100+sign*12,103).defaultPrevented);
        assert(h.event('touchmove',100+sign*80,115).defaultPrevented);
        const before=h.pages.length;
        h.event('touchend',100+sign*90,118);
        assert.equal(h.pages.length,before+1);assert.equal(h.pages.at(-1),sign<0);
    }
});
test('vertical intent remains a scroll even when its final displacement becomes horizontal',()=>{
    const h=harness();h.event('touchstart',100,100);
    assert(!h.event('touchmove',103,112).defaultPrevented);
    assert(!h.event('touchmove',180,120).defaultPrevented);
    h.event('touchend',190,121);assert.deepEqual(h.pages,[]);
});
test('an established horizontal swipe remains locked even if the finger then drifts vertically',()=>{
    const h=harness();h.event('touchstart',100,100);
    h.event('touchmove',115,102);
    assert(h.event('touchmove',160,170).defaultPrevented);
    h.event('touchend',170,175);assert.deepEqual(h.pages,[false]);
    assert(h.event('click',0,0,{pointerType:'touch'}).stopped,'no accidental color tap after paging');
});
test('taps and keyboard activation retain their normal behavior',()=>{
    const h=harness();h.event('touchstart',100,100);h.event('touchend',102,101);
    assert(!h.event('click',0,0,{pointerType:'touch'}).defaultPrevented);
    h.event('touchstart',100,100);h.event('touchmove',180,100);h.event('touchend',180,100);
    assert(!h.event('click',0,0,{detail:0}).defaultPrevented);
    h.event('touchstart',100,100);h.event('touchend',100,100);
    assert(!h.event('click',0,0,{pointerType:'touch'}).defaultPrevented);
});
test('short drags, cancellation and multiple fingers never turn into a page or a color choice',()=>{
    const h=harness();h.event('touchstart',100,100);h.event('touchmove',120,100);h.event('touchend',120,100);
    assert.deepEqual(h.pages,[]);assert(h.event('click',0,0,{pointerType:'touch'}).stopped);
    h.event('touchstart',100,100);h.event('touchmove',180,100);h.event('touchcancel',180,100);h.event('touchend',180,100);
    assert.deepEqual(h.pages,[]);
    h.event('touchstart',100,100);h.event('touchmove',180,100,{touches:[h.touch(180,100),h.touch(150,100,2)]});h.event('touchend',180,100);
    assert.deepEqual(h.pages,[]);
    h.event('touchstart',100,100);h.event('touchmove',20,100);h.event('touchend',20,100);assert.deepEqual(h.pages,[true]);
});
