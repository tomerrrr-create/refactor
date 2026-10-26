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

test('all simulation groups are session-only until Save; display and Startup still autosave',()=>{
 const disk=storage(), state=createProfileState(initial(),disk), baseline=state.draft();state.observe(baseline);
 const edited=edit(baseline,s=>{
  s.settings.rules.gravity.strength=.25;
  s.settings.rules.erosion.erosionStages.channels=5;
  s.settings.cycles.gameOfLife[0].birth=[2];
  s.settings.cycles.chiFlow[1].reach=8;
  s.identity.gameOfLife.index=2;s.identity.gameOfLife.yoursRules.birth=[2];
  s.settings.evolutionTuning=structuredClone(DEFAULT_EVOLUTION_TUNING);s.settings.evolutionTuning.breathe.speed=2;
  s.settings.nudgeIntervalMs=30;s.settings.startup.boardSize=27;
  s.settings.simulationTheme='silver';s.settings.brush.size=23;
 });
 state.capture(edited);
 state.select(1);state.observe(state.draft());state.select(0);
 assert.deepEqual(state.draft(),edited,'switching retains the session draft');
 const raw=JSON.parse(disk.getItem(PROFILE_STORAGE_KEY)).profiles[0].draft;
 assert.deepEqual(raw.settings.rules,baseline.settings.rules,'temporary rules never enter profile storage');
 const reopened=createProfileState(initial(),disk).draft();
 for(const key of ['rules','cycles','evolutionTuning','nudgeIntervalMs'])assert.deepEqual(reopened.settings[key],baseline.settings[key],key);
 assert.deepEqual(reopened.identity,baseline.identity);
 assert.equal(reopened.settings.startup.boardSize,27);assert.equal(reopened.settings.simulationTheme,'silver');assert.equal(reopened.settings.brush.size,23);
 state.save();const saved=createProfileState(initial(),disk);assert.deepEqual(saved.draft(),edited);
 saved.observe(saved.draft());saved.capture(edit(edited,s=>{s.settings.rules.erosion.erosionStages.channels=1;}));
 assert.deepEqual(createProfileState(initial(),disk).draft(),edited,'later experiments do not overwrite the saved version');
 saved.replace(factoryProfileSnapshot(0));assert.equal(saved.modified(0),false);
 assert.deepEqual(createProfileState(initial(),disk).draft(),factoryProfileSnapshot(0));
});
test('old automatic simulation drafts are discarded while old explicit saves and other preferences survive',()=>{
 const disk=storage(), saved=edit(initial(),s=>{s.settings.rules.erosion.erosionStages.channels=2;});
 const draft=edit(saved,s=>{s.settings.rules.erosion.erosionStages.channels=5;s.settings.cycles.gameOfLife[0].birth=[2];s.settings.startup.boardSize=27;});
 disk.setItem(PROFILE_STORAGE_KEY,JSON.stringify({version:1,defaultsVersion:11,selected:0,profiles:[{saved,draft},...[1,2].map(i=>({saved:factoryProfileSnapshot(i),draft:factoryProfileSnapshot(i)}))]}));
 const state=createProfileState(initial(),disk);
 assert.deepEqual(state.draft().settings.rules,saved.settings.rules);assert.deepEqual(state.draft().settings.cycles,saved.settings.cycles);
 assert.equal(state.draft().settings.startup.boardSize,27);
});
test('orphan legacy preferences cannot become the initial saved simulation defaults',()=>{
 const dirty=edit(initial(),s=>{s.settings.rules.gravity.strength=.25;s.settings.cycles.gameOfLife[0].birth=[2];});
 const state=createProfileState(dirty,storage());
 for(const i of [0,1,2]){
  assert.deepEqual(state.draft(i).settings.rules,factoryProfileSnapshot(i).settings.rules);
  assert.deepEqual(state.draft(i).settings.cycles,factoryProfileSnapshot(i).settings.cycles);
 }
 state.beginReplay(state.draft());assert.throws(()=>state.save());
});
