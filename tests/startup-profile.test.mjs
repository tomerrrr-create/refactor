import test from 'node:test';
import assert from 'node:assert/strict';
import { STARTUP_PROFILE_KEY, loadStartupProfile, saveStartupProfile } from '../js/startup-profile.js';
import { PROFILE_STORAGE_KEY, factoryProfileSnapshot, loadProfileStartup } from '../js/profile-state.js';
const storage = () => { const values = new Map(); return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}; };
test('opening profile defaults to 1 with missing, invalid or blocked storage', () => {
 for (const value of [null,'','3','-1','NaN','false']) assert.equal(loadStartupProfile({getItem:()=>value}),0);
 assert.equal(loadStartupProfile({getItem(){throw Error('blocked');}}),0);
});
test('explicit opening profile persists independently, rejecting invalid choices',()=>{
 const disk=storage();
 for(const index of [0,1,2]){assert.equal(saveStartupProfile(index,disk),true);assert.equal(loadStartupProfile(disk),index);}
 for(const invalid of [-1,3,1.5,'1'])assert.throws(()=>saveStartupProfile(invalid,disk),RangeError);
 assert.equal(saveStartupProfile(1,{setItem(){throw Error('blocked');}}),false);
});
test('first-frame Startup uses configured profile, ignoring the last-used profile without altering saved data',()=>{
 const disk=storage();const profiles=[0,1,2].map(i=>({saved:factoryProfileSnapshot(i),draft:factoryProfileSnapshot(i)}));
 for(let i=0;i<3;i++)profiles[i].draft.settings.startup.boardSize=[27,35,49][i];
 const data=JSON.stringify({version:1,defaultsVersion:11,selected:2,profiles});disk.setItem(PROFILE_STORAGE_KEY,data);
 const fallback=profiles[0].draft.settings.startup;
 assert.equal(loadProfileStartup(fallback,disk).boardSize,27);
 for(const index of [0,1,2]){saveStartupProfile(index,disk);assert.equal(loadProfileStartup(fallback,disk).boardSize,[27,35,49][index]);assert.equal(disk.getItem(PROFILE_STORAGE_KEY),data);}
 assert.equal(disk.getItem(STARTUP_PROFILE_KEY),'2');
});
