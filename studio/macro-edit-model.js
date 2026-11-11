// Pure editing model. Inputs are the app's resolved replay queue, never raw
// history line offsets. Source files and actions are never mutated.
// Random resets every tile's k/v/gold. These engines need no retained
// particle/chemical/session buffers; recorded PLAY rules suffice after a fill.
const boardOnlyEngines=new Set(['gravitationalSort','spiral','magnet','gameOfLife','sandpile','brightnessEvo','erosion','nudgeBrighter','nudgeDarker','breathe']);
const modeEvents = {
 'Game of Life Mode Changed':'gameOfLife','Chi Flow Mode Changed':'sandpile',
 'Brightness Evo Mode Changed':'brightnessEvo','Islands Mode Changed':'islands',
 'Cymatics Mode Changed':'cymatics','Cracks Mode Changed':'contour',
 'Gravitational Sort Mode':'gravitationalSort','Spiral Mode Changed':'spiral',
 'Magnet Mode Changed':'magnet','DLA Mode Changed':'dla','Erosion Mode Changed':'erosion','Nudge Mode Changed':'nudgeBrighter'
};
export function simulationOf(action) { return action.details.match(/^Armed: (\w+)\s*\|/)?.[1] ?? (action.eventName==='Nudge Mode Changed'&&action.details!=='off'?action.details:modeEvents[action.eventName]??null); }
function modeOf(action) {
 try { return JSON.parse(action.details).mode; } catch { return action.details; }
}
// A pause alone is not enough: the next engine use must be a new run.
export function freshStartIndices(actions) {
 let armed=null,used=false,running=false,brush=false,wind=false;
 const fresh=[];const idle=[];
 actions.forEach((a,index)=>{
  idle[index]=!running&&!brush&&!wind;
  if(a.eventName==='INIT_STATE'){
   let live=null;try{live=JSON.parse(a.details).liveSimulation;}catch{}
   if(index===0){armed=live?.simulation??null;used=Boolean(live);running=Boolean(live);}else if(live){armed=live.simulation;used=true;running=true;}
  }
  if(a.eventName==='--'&&a.details==='Palette Randomized'&&idle[index]&&boardOnlyEngines.has(armed))used=false;
  if(a.eventName==='BRUSH_START'||a.eventName==='BRUSH_CONTINUE')brush=true;
  if(a.eventName==='BRUSH_END')brush=false;
  if(a.eventName==='WIND_WAVE')wind=true;
  if(a.eventName==='WIND_END')wind=false;
  if(modeEvents[a.eventName]&&!running){
   const mode=modeOf(a),next=mode==='off'?null:a.eventName==='Nudge Mode Changed'?mode:modeEvents[a.eventName];
   if((next!==null||armed===modeEvents[a.eventName]||a.eventName==='Nudge Mode Changed')&&next!==armed){armed=next;used=false;}
  }
  if(['PLAY','STEP FORWARD','SIMULATION_RULES'].includes(a.eventName)){
   const sim=simulationOf(a);if(!running&&sim!==armed){armed=sim;used=false;}
   if(a.eventName==='PLAY'){
    let valid=true;try{const r=JSON.parse(a.details.split(' | Rules: ')[1]);valid=![r?.steps,r?.state?.steps,r?.cracksState?.steps].some(v=>v>0);}catch{valid=false;}
    if(sim&&!running&&!used&&!brush&&!wind&&!a.resume&&valid)fresh.push(index);
    used=true;running=true;
   }
   if(a.eventName==='STEP FORWARD')used=true;
  }
  if(['PAUSE','HISTORY_SETTINGS','Cracks Mode Changed','Cymatics Mode Changed'].includes(a.eventName))running=false;
  if(a.eventName==='HISTORY_SETTINGS'){try{const r=JSON.parse(a.details);armed=r.gravityRules?'gravitationalSort':r.cymaticsState?'cymatics':r.contourState?'contour':r.islandsState?'islands':r.tornadoState?'spiral':r.tuningSimulation??armed;}catch{}}
  if(['HISTORY_SETTINGS','BRUSH_CONTINUE','BRUSH_CHECKPOINT'].includes(a.eventName))used=true;
 });
 // A first version supports engine starts and idle creative actions whose
 // next engine command is a verified fresh PLAY (or no subsequent engine use).
 const safe=new Set(fresh),freshSet=new Set(fresh);let nextFresh=true;
 for(let i=actions.length-1;i>=0;i--){
  const a=actions[i];
  if(['PLAY','STEP FORWARD','SIMULATION_RULES','BRUSH_CONTINUE'].includes(a.eventName))nextFresh=freshSet.has(i);
  if(idle[i]&&nextFresh&&!a.resume&&['INIT_STATE','GO_DARK','DRAW_STROKE','BRUSH_START','--','Palette Change','Invert Colors','SHUFFLE_COLORS'].includes(a.eventName))safe.add(i);
 }
 return [...safe].filter(i=>i>0&&i<actions.length-1).sort((a,b)=>a-b);
}
// Only the full-fill Random command is independent of previous pixels.
// Shuffle-existing-colors intentionally does not qualify.
export function randomStartIndices(actions) {
 const safe=new Set(freshStartIndices(actions));let initial=false;
 return actions.flatMap((a,i)=>{if(a.eventName==='INIT_STATE')initial=true;return initial&&safe.has(i)&&a.eventName==='--'&&a.details==='Palette Randomized'?[i]:[];});
}
export function randomSetupActions(actions,index) {
 if(!randomStartIndices(actions).includes(index))throw Error('This Random point depends on an earlier session.');
 const result=[];
 const push=(eventName,details)=>result.push({eventName,details,delta:0,isGenBased:false});
 const init=value=>{
  const n=value.n,pal=value.pal??value.activePaletteIndex,sort=value.sort??value.currentSortMethod,sep=value.sep??value.separatorPx??0;
  if(!Number.isInteger(n)||n<1||n>327||!Number.isInteger(pal)||typeof sort!=='string')throw Error('Random start has no complete board settings.');
  push('INIT_STATE',JSON.stringify({recipeVersion:2,n,pal,sort,sep,board:`${n*n}x0`,...(value.smoothing?{smoothing:value.smoothing}:{})}));
 };
 const firstInit=actions.findIndex(a=>a.eventName==='INIT_STATE');
 for(const a of actions.slice(firstInit,index)){
  if(a.eventName==='INIT_STATE'||a.eventName==='HISTORY_SETTINGS')init(JSON.parse(a.details));
  else if(a.eventName==='ISLANDS_INIT'){const v=JSON.parse(a.details);if(v.recordingVersion===undefined)init(v);}
  else if(['Palette Change','Sort by','GRID_RESIZE','SEPARATOR_CHANGE'].includes(a.eventName))push(a.eventName,a.details);
  else if(['PLAY','STEP FORWARD','SIMULATION_RULES'].includes(a.eventName)){
   const sort=a.details.match(/\|\s*Sort:\s*([\w-]+)\s*\|/)?.[1];if(sort)push('Sort by',sort);
  }
 }
 if(result[0]?.eventName!=='INIT_STATE')throw Error('No initial board settings before Random.');
 push('--','Palette Randomized');return result;
}
export function serializeActions(actions){return actions.map(a=>line(a,a.delta)).join('\n')+'\n';}
export function actionGroups(actions) {
 const groups=[];let stroke=null,wind=null;
 actions.forEach((a,i)=>{
  if(a.eventName==='BRUSH_START') {stroke={from:i,to:i,eventName:'DRAW_STROKE',actions:[a]};groups.push(stroke);return;}
  if(stroke){stroke.to=i;stroke.actions.push(a);if(a.eventName==='BRUSH_END')stroke=null;return;}
  if(a.eventName==='WIND_WAVE'){
   if(!wind){wind={from:i,to:i,eventName:'WIND_WAVE',actions:[]};groups.push(wind);}
   wind.to=i;wind.actions.push(a);return;
  }
  if(a.eventName==='WIND_END'&&wind){wind.to=i;wind.actions.push(a);wind=null;return;}
  groups.push({from:i,to:i,eventName:a.eventName,actions:[a]});
 });
 return groups;
}
export function makeCheckpoint(state) {
 const runs=[];let last,count=0;
 for(const tile of state.tiles){if(count&&tile.k!==last){runs.push(`${count}x${last}`);count=0;}last=tile.k;count++;}
 if(count)runs.push(`${count}x${last}`);
 return {recipeVersion:2,n:state.n,pal:state.activePaletteIndex,sort:state.currentSortMethod,
  sep:state.separatorPx,board:runs.join(','),
  gold:state.tiles.flatMap((t,i)=>t.isGold?[i]:[])};
}
export function makeBoardCheckpoint(state) {
 const runs=[];
 for(const tile of state.tiles){const gold=tile.isGold?1:0,v=tile.v??tile.k,last=runs.at(-1);
  if(last&&last[1]===tile.k&&last[2]===v&&last[3]===gold)last[0]++;else runs.push([1,tile.k,v,gold]);
 }
 return {islandsVersion:1,seed:1,state:1,steps:0,n:state.n,activePaletteIndex:state.activePaletteIndex,
  currentSortMethod:state.currentSortMethod,separatorPx:state.separatorPx,board:runs};
}
function line(action,delta) {
 const time=new Date(Math.max(0,Math.round(delta))).toISOString().slice(11,23);
 return `[${time}]${action.isGenBased?` [GEN:${action.targetGen}]`:''} ${action.eventName} -> ${action.details}`;
}
export function exportRange(actions,{start=null}={}) {
 const first=start?.index??0,last=actions.length-1;
 if(!Number.isInteger(first)||!Number.isInteger(last)||first<0||last>=actions.length||last<first)throw Error('Choose a valid starting point.');
 if(start&&!freshStartIndices(actions).includes(first))throw Error('Choose a marked safe start.');
 const base=start?actions[first].delta:0;
 const selected=actions.slice(first,last+1).map(a=>({...a,delta:Math.max(0,a.delta-base)}));
 if(start?.random){
  if(!randomStartIndices(actions).includes(first))throw Error('Choose an independent Random point.');
  const init={...start.init,board:`${start.init.n*start.init.n}x0`,gold:[]};
  selected[0].isGenBased=false;
  selected.unshift({eventName:'HISTORY_SETTINGS',details:JSON.stringify(start.settings),delta:0,isGenBased:false});
  selected.unshift({eventName:'Islands Mode Changed',details:'{"mode":"off"}',delta:0,isGenBased:false});
  selected.unshift({eventName:'ISLANDS_INIT',details:JSON.stringify({...start.boardCheckpoint,board:[[init.n*init.n,0,0,0]]}),delta:0,isGenBased:false});
  selected.unshift({eventName:'PAUSE',details:'---',delta:0,isGenBased:false});
  selected.unshift({eventName:'INIT_STATE',details:JSON.stringify(init),delta:0,isGenBased:false});
 } else if(start){
  selected.unshift({eventName:'HISTORY_SETTINGS',details:JSON.stringify(start.settings),delta:0,isGenBased:false});
  // The existing legacy Islands checkpoint is the player's supported full
  // tile codec (k, working v, protected flags). No new app command/field is used.
  selected.unshift({eventName:'Islands Mode Changed',details:'{"mode":"off"}',delta:0,isGenBased:false});
  selected.unshift({eventName:'ISLANDS_INIT',details:JSON.stringify(start.boardCheckpoint),delta:0,isGenBased:false});
  selected.unshift({eventName:'PAUSE',details:'---',delta:0,isGenBased:false});
  selected.unshift({eventName:'INIT_STATE',details:JSON.stringify(start.init),delta:0,isGenBased:false});
 } else {
  const init=selected.find(a=>a.eventName==='INIT_STATE');
  if(!init)throw Error('The file has no valid initial board.');
  init.details=JSON.stringify({...JSON.parse(init.details),recipeVersion:2});
 }
 // A live INIT_STATE expands to its own synthetic PLAY on import. Avoid
 // duplicating it, and keep all other already-resolved effective commands.
 return selected.filter(a=>!a.resume).map(a=>line(a,a.delta)).join('\n')+'\n';
}
