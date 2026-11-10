import {freshStartIndices,makeCheckpoint,exportRange,assertPortableSource} from './macro-edit-model.js';

// All editor transport is local to the Studio adapter. The app player/logger
// and its public recipe format are never patched or replaced.
export function createMacroEditorEngine(bridge) {
 let actions=[],safe=new Set(),running=false,lastIndex=-1,holdAt=null,boundary=null,rejected=null,origin=0,after=null,endedAt=null;
 function load(text){
  actions=bridge.parse(text);assertPortableSource(actions);safe=new Set(freshStartIndices(actions));
  const queue=[];
  actions.forEach((a,index)=>{
   if(safe.has(index))queue.push({eventName:'STUDIO_EDIT_BOUNDARY',details:'',delta:a.delta,isGenBased:false,editorIndex:index});
   queue.push({...a,editorIndex:index});
   if(a.eventName==='PAUSE')queue.push({eventName:'STUDIO_EDIT_AFTER',details:'',delta:a.delta,isGenBased:false,editorIndex:index});
  });
  bridge.load(text,queue);bridge.previewInit?.(actions.find(a=>a.eventName==='INIT_STATE'));
  running=false;lastIndex=-1;holdAt=null;boundary=null;rejected=null;after=null;endedAt=null;origin=bridge.now();
  return structuredClone(actions);
 }
 return {
  load,
  handleAction(action){
   if(action.eventName==='STUDIO_EDIT_AFTER'){
    if(after===action.editorIndex){bridge.pause();running=false;endedAt=action.editorIndex;after=null;}
    return true;
   }
   if(action.eventName==='STUDIO_EDIT_BOUNDARY'){
    if(holdAt===action.editorIndex){
     const state=bridge.info();
     if(!state.simulation&&!state.wind&&!state.brush){
      try{boundary={index:action.editorIndex,...bridge.snapshot()};}
      catch(error){if(error.message!=='UNSUPPORTED_WORKING_VALUES')throw error;rejected={index:action.editorIndex,reason:'working-values'};}
     }else rejected={index:action.editorIndex,reason:'active-session'};
     bridge.pause();running=false;holdAt=null;
    }
    return true;
   }
   if(Number.isInteger(action.editorIndex)){lastIndex=action.editorIndex;boundary=null;}
   return false;
  },
  play(){running=true;if(!bridge.info().macroPlaying)bridge.play();},
  pause(){running=false;},
  hold(index){if(!safe.has(index)||index<=lastIndex)throw Error('Restart playback to reach this start.');holdAt=index;rejected=null;},
  holdEnd(index){after=index;endedAt=null;},
  async advance(ms){if(!running)return;await bridge.tick(Math.max(0,Math.min(ms,40)));if(bridge.error?.())throw Error(bridge.error());if(!bridge.info().macroPlaying)running=false;},
  state(){return {running,lastIndex,holdAt,rejected,endedAt,boundary:boundary?boundary.index:null,finished:lastIndex===actions.length-1&&!bridge.info().macroPlaying,
   delta:Math.max(actions[lastIndex]?.delta??0,bridge.now()-origin),...bridge.info()};},
  startPoint(){if(running||!boundary)throw Error('Pause before a fresh simulation start first.');return structuredClone(boundary);},
  endPoint(){if(running||lastIndex<0)throw Error('Pause playback before marking the end.');const info=bridge.info();return {index:lastIndex,
   delta:Math.max(actions[lastIndex].delta,bridge.now()-origin),generation:info.generation,simulation:info.simulation,windElapsed:info.windElapsed};},
  export(range){return exportRange(actions,range);},
  draw(){bridge.draw();return bridge.output();},
  stop(){running=false;bridge.stop();},
  get actions(){return structuredClone(actions);}
 };
}
export {makeCheckpoint};
