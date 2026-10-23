'use strict';
// Engine preferences are disposable. Never let replay initialization capture,
// migrate or overwrite the user's application settings on this shared origin.
function memoryStorage() {
  const values = new Map();
  return {getItem:key=>values.get(String(key))??null,setItem:(key,value)=>values.set(String(key),String(value)),
    removeItem:key=>values.delete(String(key)),clear:()=>values.clear(),key:index=>Array.from(values.keys())[index]??null,
    get length(){return values.size;}};
}
Object.defineProperty(window,'localStorage',{value:memoryStorage()});
Object.defineProperty(window,'sessionStorage',{value:memoryStorage()});
window.addEventListener('error', event => { window.macroVideoError = event.message; });
window.addEventListener('unhandledrejection', event => { window.macroVideoError = String(event.reason?.message || event.reason); });
if (new URLSearchParams(location.search).get('computed') === '1') {
  // Install before app initialization: every simulation, brush and wind timer uses this clock.
  window.exportClock = VideoClock.install({now:Date.now(),shouldAdvanceTime:false,
    toFake:['Date','performance','setTimeout','clearTimeout','setInterval','clearInterval','requestAnimationFrame','cancelAnimationFrame']});
  let seed = 42;
  Math.random = () => ((seed = (Math.imul(seed,1664525) + 1013904223) >>> 0) / 4294967296);
}
