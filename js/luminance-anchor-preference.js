// Device-local startup choice; modal edits remain independent until the next visit.
export const LUMINANCE_ANCHOR_KEY='colorGridLuminanceAnchorV1';
export function createLuminanceAnchorPreference({read,apply,input,canChange=()=>true,storage}){
 let enabled=true;
 try{enabled=(storage??globalThis.localStorage).getItem(LUMINANCE_ANCHOR_KEY)!=='false';}catch{/* Session-only when storage is unavailable. */}
 const refresh=()=>{if(input){input.checked=enabled;input.disabled=!canChange();}};
 const persist=()=>{try{(storage??globalThis.localStorage).setItem(LUMINANCE_ANCHOR_KEY,String(enabled));return true;}catch{return false;}};
 const sync=()=>{const flags=read();enabled=flags.magnet===true&&flags.life===true;refresh();return persist();};
 const set=value=>{enabled=value===true;apply(enabled,{startup:false});refresh();return persist();};
 input?.addEventListener('change',()=>{if(canChange())set(input.checked);else refresh();});
 refresh();
 return {set,sync,refresh,enabled:()=>enabled,restore(){apply(enabled,{startup:true});refresh();}};
}
