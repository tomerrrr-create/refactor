import {freshStartIndices,randomStartIndices,randomSetupActions,serializeActions,makeCheckpoint,makeBoardCheckpoint,exportRange} from './macro-edit-model.js';

// Loaded only by the editor's isolated, controlled-clock engine. Pausing freezes
// the clock itself, including Wind/Breathe/brush timers, rather than pausing and
// restarting the simulation. No shared user storage or app runtime is touched.
export function createMacroEditorEngine(bridge) {
 let actions=[],safe=new Set(),running=false,lastIndex=-1,holdAt=null,boundary=null,rejected=null,origin=0;
 function queueFrom(first=0,base=0){const queue=[];actions.forEach((a,index)=>{if(index<first)return;const delta=Math.max(0,a.delta-base);if(safe.has(index))queue.push({eventName:'STUDIO_EDIT_BOUNDARY',details:'',delta,isGenBased:false,editorIndex:index});queue.push({...a,delta,editorIndex:index});});return queue;}
 function load(text){
  actions=bridge.parse(text);safe=new Set(freshStartIndices(actions));
  const queue=queueFrom();
  bridge.load(text,queue);bridge.previewInit?.(actions.find(a=>a.eventName==='INIT_STATE'));running=false;lastIndex=-1;holdAt=null;boundary=null;rejected=null;origin=bridge.now();
  return structuredClone(actions);
 }
 return {
  load,
  handleAction(action){
   if(action.eventName==='STUDIO_RANDOM_READY'){
    const snapshot=bridge.snapshot();boundary={index:action.editorIndex,random:true,...snapshot};
    lastIndex=action.editorIndex;bridge.pause();running=false;holdAt=null;return true;
   }
   if(action.eventName==='STUDIO_EDIT_BOUNDARY'){
    if(holdAt===action.editorIndex||holdAt==='next'){
     const state=bridge.info();
     const snapshot=bridge.snapshot();
     if(!state.simulation&&!state.wind&&!state.brush&&snapshot.compatible)boundary={index:action.editorIndex,...snapshot};
     else {rejected=action.editorIndex;if(holdAt==='next')return true;}
     bridge.pause();running=false;holdAt=null;
    }
    return true;
   }
   if(Number.isInteger(action.editorIndex)){lastIndex=action.editorIndex;boundary=null;}
   return false;
  },
  async jumpRandom(index){
   if(!randomStartIndices(actions).includes(index))throw Error('Choose a marked Random starting point.');
   const setup=randomSetupActions(actions,index),queue=[...setup,
    {eventName:'STUDIO_RANDOM_READY',details:'',delta:0,isGenBased:false,editorIndex:index},
    ...queueFrom(index+1,actions[index].delta)];
   boundary=null;rejected=null;holdAt=null;lastIndex=index-1;running=false;
   bridge.load(serializeActions(setup),queue);origin=bridge.now()-actions[index].delta;
   running=true;bridge.play();
   try{
    for(let pass=0;pass<setup.length+10&&!boundary;pass++){await bridge.tick(40);if(bridge.error?.())throw Error(bridge.error());}
    if(!boundary)throw Error('Could not prepare Random starting board.');
    bridge.settlePreview?.();
    return structuredClone(boundary);
   }catch(error){bridge.pause();running=false;throw error;}
  },
  play(){running=true;if(!bridge.info().macroPlaying)bridge.play();},
  pause(){running=false;},
  hold(index){if(index!=='next'&&(!safe.has(index)||index<=lastIndex))throw Error('Restart playback to reach this start.');holdAt=index;rejected=null;},
  async advance(ms){if(!running)return;await bridge.tick(Math.max(0,Math.min(ms,40)));if(bridge.error?.())throw Error(bridge.error());if(!bridge.info().macroPlaying)running=false;},
  state(){return {running,lastIndex,holdAt,rejected,boundary:boundary?boundary.index:null,finished:lastIndex===actions.length-1&&!bridge.info().macroPlaying,
   delta:Math.max(actions[lastIndex]?.delta??0,bridge.now()-origin),...bridge.info()};},
  startPoint(){if(running||!boundary)throw Error('Reach a marked safe start first.');return structuredClone(boundary);},
  export(range){return exportRange(actions,range);},
  draw(){bridge.draw();return bridge.output();},
  stop(){running=false;bridge.stop();},
  get actions(){return structuredClone(actions);}
 };
}
export {makeCheckpoint,makeBoardCheckpoint};
