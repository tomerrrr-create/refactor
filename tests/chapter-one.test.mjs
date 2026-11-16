import test from 'node:test';
import {CHAPTER_TWO_STEPS,CHAPTER_TWO_ORDERS,orderPracticeProgress} from '../js/chapter-two-tour.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {CHAPTER_ONE_KEY,CHAPTER_ONE_STEPS,readChapterOneProgress,sameSquareRun} from '../js/chapter-one-tour.js';

test('chapter one validates progress and ignores unavailable or corrupt storage',()=>{
    assert.equal(CHAPTER_ONE_STEPS.length,5);
    for(const value of [null,'bad','{}',JSON.stringify({version:2,status:'active',step:'palette'}),JSON.stringify({version:1,status:'active',step:'evolution'})]){
        assert.equal(readChapterOneProgress({getItem:()=>value}),null);
    }
    assert.equal(readChapterOneProgress({getItem(){throw Error('blocked');}}),null);
    const progress={version:1,status:'active',step:'picker'};
    assert.deepEqual(readChapterOneProgress({getItem:key=>{assert.equal(key,CHAPTER_ONE_KEY);return JSON.stringify(progress);}}),progress);
});
test('tile progress needs repeated changes of the same square',()=>{
    const event=(index,color)=>({type:'tile',index,color});
    assert.equal(sameSquareRun([event(2,1),event(3,1),event(2,2)]).count,1);
    assert.equal(sameSquareRun([event(2,1),event(2,1),event(2,1)]).count,1);
    assert.deepEqual(sameSquareRun([event(2,1),{type:'palette'},event(2,2),event(2,3)]),{count:3,index:2});
});
test('practice storage cannot touch the real browser preferences or replace top-level storage',()=>{
    const source=readFileSync(new URL('../js/chapter-one-practice.js',import.meta.url),'utf8').split('export function installChapterOnePractice')[0].replace('export const','const');
    for(const nested of [false,true]){
        const disk=new Map([['artwork','keep'],['userLanguage','en']]);
        const original={getItem:key=>disk.get(key),setItem:(key,value)=>disk.set(key,value)};
        const win={localStorage:original};win.parent=nested?{}:win;
        vm.runInNewContext(source,{window:win,location:{search:'?chapter-one-practice=1&lang=he'},document:{documentElement:{dataset:{}}},URLSearchParams});
        if(!nested){assert.equal(win.localStorage,original);continue;}
        assert.equal(win.localStorage.getItem('artwork'),null);
        assert.equal(win.localStorage.getItem('userLanguage'),'he');
        win.localStorage.setItem('artwork','practice');win.localStorage.clear();
        assert.deepEqual([...disk],[['artwork','keep'],['userLanguage','en']]);
    }
});

test('chapter two progress resumes six palette orders and rejects unknown steps',()=>{
    assert.deepEqual(CHAPTER_TWO_ORDERS,['luminance','dark-rainbow','reversed','center-out','temperature','outside-in']);
    for(const step of CHAPTER_TWO_STEPS){
        const progress={version:1,status:'active',step};
        assert.deepEqual(readChapterOneProgress({getItem:()=>JSON.stringify(progress)}),progress);
    }
    assert.equal(readChapterOneProgress({getItem:()=>JSON.stringify({version:1,status:'active',step:'order-random'})}),null);
});

test('order practice follows the last clicked tile and accepts different tiles',()=>{
 const tile=(index,sortMethod)=>({type:'tile',index,sortMethod});
 const events=[tile(10,'luminance'),tile(11,'dark-rainbow'),tile(12,'dark-rainbow'),tile(13,'dark-rainbow')];
 assert.deepEqual(orderPracticeProgress(events,'dark-rainbow'),{count:3,index:13});
 assert.deepEqual(orderPracticeProgress([], 'dark-rainbow'),{count:0,index:null});
 assert.deepEqual(orderPracticeProgress([tile(1,'luminance')],'dark-rainbow'),{count:0,index:1});
});
