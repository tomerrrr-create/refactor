// Pure editing model. Inputs are the app's resolved replay queue, never raw
// history line offsets. Source files and actions are never mutated.
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
export function freshStartIndices(actions) {
 let armed=null,used=false,running=false,brush=false,wind=false;
 const result=[];
 actions.forEach((a,index)=>{
  if(a.eventName==='INIT_STATE'){armed=null;used=false;running=false;}
  if(a.eventName==='BRUSH_START')brush=true;
  if(a.eventName==='BRUSH_END')brush=false;
  if(a.eventName==='WIND_WAVE')wind=true;
  if(a.eventName==='WIND_END')wind=false;
  if(modeEvents[a.eventName] && !running){
   const mode=modeOf(a);
   const next=mode==='off'?null:a.eventName==='Nudge Mode Changed'?mode:modeEvents[a.eventName];
   if((next!==null||armed===modeEvents[a.eventName]||a.eventName==='Nudge Mode Changed')&&next!==armed){armed=next;used=false;}
  }
  if(['PLAY','STEP FORWARD','SIMULATION_RULES'].includes(a.eventName)){
   const sim=simulationOf(a);
   if(!running && sim!==armed){armed=sim;used=false;}
   if(a.eventName==='PLAY'){
    let freshRules=true;
    try {const rules=JSON.parse(a.details.split(' | Rules: ')[1]);freshRules=![rules?.steps,rules?.state?.steps,rules?.cracksState?.steps].some(v=>v>0);} catch {/* Old rule strings have no session cursor. */}
    if(sim && !running && !used && !brush && !wind && !a.resume && freshRules)result.push(index);
    used=true;running=true;
   }
   if(a.eventName==='STEP FORWARD')used=true;
  }
  if(['PAUSE','HISTORY_SETTINGS','Cracks Mode Changed','Cymatics Mode Changed'].includes(a.eventName))running=false;
  // A restored history checkpoint may contain a retained engine session.
  if(['HISTORY_SETTINGS','BRUSH_CONTINUE','BRUSH_CHECKPOINT'].includes(a.eventName))used=true;
 });
 return result;
}
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
export function assertPortableSource(actions) {
 for(const action of actions){
  if(action.eventName!=='INIT_STATE')continue;
  const init=JSON.parse(action.details);
  if(init.values!==undefined||init.freshStart!==undefined)throw Error('UNSUPPORTED_PROTOTYPE_INIT');
 }
}
export function makeCheckpoint(state) {
 if(state.tiles.some(tile=>!Number.isFinite(tile.k)||(tile.v??tile.k)!==tile.k))throw Error('UNSUPPORTED_WORKING_VALUES');
 const runs=[];let last,count=0;
 for(const tile of state.tiles){if(count&&tile.k!==last){runs.push(`${count}x${last}`);count=0;}last=tile.k;count++;}
 if(count)runs.push(`${count}x${last}`);
 return {recipeVersion:2,n:state.n,pal:state.activePaletteIndex,sort:state.currentSortMethod,
  sep:state.separatorPx,board:runs.join(','),
  gold:state.tiles.flatMap((t,i)=>t.isGold?[i]:[])};
}
function line(action,delta) {
 const time=new Date(Math.max(0,Math.round(delta))).toISOString().slice(11,23);
 return `[${time}]${action.isGenBased?` [GEN:${action.targetGen}]`:''} ${action.eventName} -> ${action.details}`;
}
export function exportRange(actions,{start=null,end=null}={}) {
 const first=start?.index??0,last=end?.index??actions.length-1;
 if(!Number.isInteger(first)||!Number.isInteger(last)||first<0||last>=actions.length||last<first)throw Error('Choose an end after the start.');
 if(start&&!freshStartIndices(actions).includes(first))throw Error('Start must be a fresh simulation run.');
 const base=start?actions[first].delta:0;
 const selected=actions.slice(first,last+1).map(a=>({...a,delta:Math.max(0,a.delta-base)}));
 if(start){
  selected.unshift({eventName:'HISTORY_SETTINGS',details:JSON.stringify(start.settings),delta:0,isGenBased:false});
  // Existing app commands clear a previously armed engine without running or
  // painting it. No new event, INIT field or app-parser behavior is required.
  selected.unshift({eventName:'Nudge Mode Changed',details:'off',delta:0,isGenBased:false});
  selected.unshift({eventName:'Nudge Mode Changed',details:'nudgeBrighter',delta:0,isGenBased:false});
  selected.unshift({eventName:'INIT_STATE',details:JSON.stringify(start.init),delta:0,isGenBased:false});
 } else {
  const init=selected.find(a=>a.eventName==='INIT_STATE');
  if(!init)throw Error('The file has no valid initial board.');
  init.details=JSON.stringify({...JSON.parse(init.details),recipeVersion:2});
 }
 const tailTime=end?Math.max(selected.at(-1).delta,end.delta-base):selected.at(-1).delta;
 if(end){
  let brush=false,wind=null;
  for(const a of selected){
   if(a.eventName==='BRUSH_START')brush=true;if(a.eventName==='BRUSH_END')brush=false;
   if(a.eventName==='WIND_WAVE')wind={...JSON.parse(a.details),delta:a.delta};if(a.eventName==='WIND_END')wind=null;
  }
  if(brush)selected.push({eventName:'BRUSH_END',details:'{"version":1}',delta:tailTime,isGenBased:false});
  if(wind)selected.push({eventName:'WIND_END',details:JSON.stringify({windVersion:1,batch:wind.batch,
   elapsed:end.windElapsed??wind.elapsed+tailTime-wind.delta,reason:'stop'}),delta:tailTime,isGenBased:false});
  selected.push({eventName:'PAUSE',details:'---',delta:tailTime,isGenBased:Boolean(end.simulation&&end.simulation!=='breathe'),targetGen:end.generation});
 }
 // A live INIT_STATE expands to its own synthetic PLAY on import. Avoid
 // duplicating it, and keep all other already-resolved effective commands.
 return selected.filter(a=>!a.resume).map(a=>line(a,a.delta)).join('\n')+'\n';
}
