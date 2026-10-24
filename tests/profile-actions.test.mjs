import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfileState, factoryProfileSnapshot, PROFILE_STORAGE_KEY } from '../js/profile-state.js';
import { DEFAULT_EVOLUTION_TUNING } from '../js/evolution-tuning.js';
const storage = () => { const values=new Map(); return { getItem:key=>values.get(key)??null, setItem:(key,value)=>values.set(key,value) }; };
const initial = () => factoryProfileSnapshot(0);
const edit = (value, change) => { const next=structuredClone(value); change(next); return next; };

test('default star compares each profile with its factory, survives Save and reopening, and clears on manual reversion',()=>{
 const disk=storage(), state=createProfileState(initial(),disk);
 assert.deepEqual([0,1,2].map(i=>state.modified(i)),[false,false,false]);
 const before=state.draft();state.observe(before);
 state.capture(edit(before,s=>{s.settings.evolutionTuning=structuredClone(DEFAULT_EVOLUTION_TUNING);s.settings.evolutionTuning.breathe.speed=2;}));
 assert(state.modified(0));state.save();assert(state.modified(0),'legacy Save cannot clear default star');
 const reopened=createProfileState(initial(),disk);assert(reopened.modified(0));
 state.capture(before);assert.equal(state.modified(0),false);
});
test('equivalent optional defaults and preset label identities do not create a false star',()=>{
 const state=createProfileState(initial(),storage());
 const snapshot=initial();snapshot.settings.evolutionTuning=structuredClone(DEFAULT_EVOLUTION_TUNING);
 snapshot.settings.separatorCycle=[5,3,1,0];snapshot.identity.chiFlow.sources=['custom-0','custom-1','custom-2'];
 state.replace(snapshot);assert.equal(state.modified(0),false);
});
test('copy preserves cycle identities and independent rules without changing source, selection or observation',()=>{
 const disk=storage(), state=createProfileState(initial(),disk);
 const snapshot=edit(initial(),s=>{
  s.settings.rules.erosion.erosionStages.channels=1;
  s.identity.chiFlow.index=2;s.identity.chiFlow.sources=['custom-0','custom-1','Alexis'];
  s.identity.chiFlow.yoursRules={awakening:[1,2],flow:[3],reach:0};
 });
 state.replace(snapshot);const before=state.draft(),third=state.draft(2);
 assert.equal(state.copyTo(1),true);assert.equal(state.selected,0);assert.deepEqual(state.draft(),before);
 assert.deepEqual(state.draft(1),before);assert.deepEqual(state.draft(2),third);assert(state.modified(1));
 assert.equal(state.capture(before),false,'copy must not change active observation');
 const read=state.draft(1);read.identity.chiFlow.sources[0]='changed';assert.deepEqual(state.draft(1),before);
 state.capture(edit(before,s=>{s.settings.rules.gravity.strength=.25;}));assert.deepEqual(state.draft(1),before);
 assert.deepEqual(createProfileState(initial(),disk).draft(1),before);
 state.select(1);state.replace(factoryProfileSnapshot(1));assert.equal(state.modified(1),false);
});
test('copy validates before overwriting and is blocked for same profile or replay',()=>{
 const disk=storage(), state=createProfileState(initial(),disk);state.persist();const before=disk.getItem(PROFILE_STORAGE_KEY);
 for(const index of [-1,0,3])assert.throws(()=>state.copyTo(index));
 assert.throws(()=>state.copyTo(1,{settings:{unknown:true}}));assert.equal(disk.getItem(PROFILE_STORAGE_KEY),before);
 state.beginReplay(initial());assert.throws(()=>state.copyTo(1));assert.deepEqual(state.draft(1),factoryProfileSnapshot(1));
});
test('copy reports blocked persistence instead of reporting durable success',()=>{
 const disk={getItem:()=>null,setItem(){throw Error('blocked');}},state=createProfileState(initial(),disk);
 assert.equal(state.copyTo(1),false);assert(state.storageError);assert.equal(state.selected,0);
});
