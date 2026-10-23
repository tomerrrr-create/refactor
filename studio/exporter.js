import { t, translateDocument } from './i18n.js';
import { receiveRecipe } from './handoff.js';
'use strict';
import { DEFAULT_VIDEO_EFFECTS } from './video-effects.js';
const $ = id => document.getElementById(id);
translateDocument();
let receivedFile = null;
function currentFile(){return receivedFile || $('file').files[0];}
const preview = $('preview'), context = preview.getContext('2d', {alpha:false});
let engine, hasInitialized = false, running = false, activeMode = null, cancelRequested = false, downloadURL, checking = 0;
const optionIDs = ['mode','size','fps','quality','effects'];
let effectHints = {}, effectInspection = 0, effectLoading = false;
const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
const yieldBrowser = () => new Promise(resolve => setTimeout(resolve,0));
const clock = seconds => Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0');
function showError(error) { $('error').textContent = error.message || String(error); }
function selected(id) { return $(id).querySelector('input:checked').value; }
function options() {
  return {mode:selected('mode'),size:Number(selected('size')),fps:Number(selected('fps')),quality:Number(selected('quality')),
    effects:{smooth:typeof effectHints.smooth === 'boolean' ? DEFAULT_VIDEO_EFFECTS.smooth : $('smooth').checked,
      glow:typeof effectHints.glow === 'boolean' ? DEFAULT_VIDEO_EFFECTS.glow : $('glow').checked,
      intensity:DEFAULT_VIDEO_EFFECTS.intensity}};
}
async function inspectFileEffects() {
  const version = ++effectInspection;
  effectLoading = true;
  $('start').disabled = true;
  effectHints = {};
  for(const id of ['glow','smooth']) {$(id).checked=true;$(id).disabled=false;$(id+'Source').textContent='';}
  const file=currentFile();
  if(!engine || !file || file.size>32*1024*1024) {effectLoading=false;return;}
  try {
    const text=await file.text();
    if(version!==effectInspection) return;
    effectHints=engine.inspectEffects(text);
    for(const id of ['glow','smooth']) {
      if(typeof effectHints[id] !== 'boolean') continue;
      $(id).checked=effectHints[id];$(id).disabled=true;$(id+'Source').textContent=t(' · מהקובץ');
    }
  } catch { /* Invalid input is reported by the existing start/validation path. */ }
  finally {if(version===effectInspection) effectLoading=false;}
}
function videoConfig(o,codec) {
  const blocks = Math.ceil(o.size/16)**2*o.fps;
  const level = blocks <= 245760 ? '28' : blocks <= 522240 ? '2a' : blocks <= 983040 ? '33' : '34';
  return {codec:codec === 'mp4' ? 'avc1.4200'+level : 'vp09.00.51.08',width:o.size,height:o.size,
    bitrate:Math.min(80000000,Math.round(o.quality*1000000*(o.size/1080)**2*(o.fps/30))),framerate:o.fps,
    ...(codec === 'mp4' ? {avc:{format:'avc'}} : {})};
}
async function selectFormat(o) {
  if (window.VideoEncoder && window.VideoFrame) {
    for (const type of ['mp4','webm']) {
      const config = videoConfig(o,type);
      try {if((await VideoEncoder.isConfigSupported(config)).supported) return {type,config,encoded:true};} catch (_) {}
    }
  }
  if (o.mode === 'realtime' && window.MediaRecorder && preview.captureStream) {
    for(const mime of ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']) {
      if(MediaRecorder.isTypeSupported(mime)) return {type:'webm',mime,encoded:false};
    }
  }
  throw Error(o.mode === 'computed' ? t('הדפדפן אינו תומך בקידוד פריימים מחושב בהגדרות האלה. נסה גודל קטן יותר או ניגון והקלטה.') : t('אין תמיכה בייצוא בהגדרות האלה. נסה גודל קטן יותר.'));
}
async function checkOptions(clearError = true) {
  const version = ++checking;
  if(running) return;
  $('start').disabled = true;
  const o = options();
  $('glowLevel').textContent = (effectHints.intensity ?? DEFAULT_VIDEO_EFFECTS.intensity) + '%';
  preview.hidden = o.mode === 'computed';
  $('modeNote').textContent = o.mode === 'computed' ? t('מחושב: הפריימים נוצרים ישירות לסרטון, ללא תצוגה מקדימה. המחשב אינו מחכה לזמן אמת; ההפקה עשויה להיות מהירה או איטית יותר.') : t('זמן אמת: מנגן את היצירה ומקליט תוך כדי. קצב הפריימים בפועל תלוי בעומס המחשב.');
  $('runtimeHint').textContent = o.mode === 'computed' ? t('אפשר לעבור לחלון אחר. השאר את הכלי פתוח ואת המחשב ער; העבודה ברקע עשויה להאט.') : t('בהקלטה בזמן אמת השאר את החלון בחזית עד לסיום.');
  try {
    const f = await selectFormat(o);
    if(version !== checking) return;
    $('format').textContent = t('ייצוא ')+f.type.toUpperCase()+' · '+o.size+' × '+o.size+' · '+o.fps+t(' פריימים לשנייה')+(o.mode === 'realtime' ? t(' (יעד)') : '');
    if(clearError) $('error').textContent = '';
    $('start').disabled = !hasInitialized || !currentFile() || effectLoading;
  } catch(e) {if(version === checking) {$('format').textContent=t('השילוב הזה אינו זמין בדפדפן');showError(e);}}
}
async function loadEngine(computed) {
  engine = null;
  const run = String(Date.now());
  const frame = $('engine');
  await new Promise((resolve,reject) => {
    const timer = setTimeout(() => reject(Error(t('מנוע הניגון לא נטען.'))),60000);
    frame.onload = () => {
      if(new URL(frame.contentWindow.location.href).searchParams.get('run') !== run) return;
      clearTimeout(timer); frame.onload = null; resolve();
    };
    frame.src = 'engine/index.html?computed='+(computed ? '1' : '0')+'&run='+run;
  });
  const until = performance.now()+60000;
  while(performance.now()<until) {
    if(cancelRequested && running) throw Error(t('ההמרה בוטלה.'));
    const win = $('engine').contentWindow;
    if(win.macroVideoError) throw Error(win.macroVideoError);
    if(win.macroVideoEngine?.ready && Boolean(win.exportClock) === computed) {engine=win.macroVideoEngine;hasInitialized=true;return;}
    if(computed && win.exportClock) await win.exportClock.tickAsync(100);
    await new Promise(resolve => setTimeout(resolve,20));
  }
  throw Error(t('מנוע הניגון לא נטען. סגור ופתח שוב באמצעות Start.command.'));
}
for(const id of optionIDs) $(id).addEventListener('change',checkOptions);
$('file').addEventListener('change',async()=>{receivedFile=null;$('importedRecipe').textContent='';await inspectFileEffects();await checkOptions();});
receiveRecipe(async file=>{receivedFile=file;$('importedRecipe').textContent=t('נטען מהאפליקציה: ')+file.name;await inspectFileEffects();await checkOptions();});
$('cancel').addEventListener('click',()=>{cancelRequested=true;});
// Only real-time capture depends on foreground scheduling. Computed export
// advances its own clock and must not discard a job just because it is hidden.
let hiddenDuringExport=false;
document.addEventListener('visibilitychange',()=>{if(running && activeMode==='realtime' && document.hidden) {hiddenDuringExport=true;cancelRequested=true;}});
window.addEventListener('beforeunload',event=>{if(running){event.preventDefault();event.returnValue='';}});
$('start').addEventListener('click',async()=>{
  if(running || effectLoading || !currentFile()) return;
  const o=options();
  running=true;activeMode=o.mode;cancelRequested=false;hiddenDuringExport=false;++checking;
  $('start').disabled=true;$('file').disabled=true;$('cancel').hidden=false;
  optionIDs.forEach(id=>{$(id).disabled=true;});
  $('download').hidden=true;$('error').textContent='';$('progress').value=0;
  $('status').textContent=t('מכין את מנוע הניגון…');
  if(downloadURL){URL.revokeObjectURL(downloadURL);downloadURL=null;}
  let encoder,recorder,stream,muxer,failure,recordingDone,encodedFrames=0;
  const chunks=[];
  try {
    const file=currentFile();
    if(file.size>32*1024*1024) throw Error(t('לגרסת הניסוי יש מגבלה של 32 מגה לקובץ מקרו.'));
    const text=await file.text(),format=await selectFormat(o);
    await loadEngine(o.mode==='computed');
    // Computed export encodes the engine canvas directly; no second full-size buffer is needed.
    preview.width=preview.height=o.mode==='computed'?1:o.size;
    if(format.encoded){
      muxer=format.type==='mp4' ? new Mp4Muxer.Muxer({target:new Mp4Muxer.ArrayBufferTarget(),video:{codec:'avc',width:o.size,height:o.size},fastStart:'in-memory',firstTimestampBehavior:'offset'}) : new WebMMuxer.Muxer({target:new WebMMuxer.ArrayBufferTarget(),video:{codec:'V_VP9',width:o.size,height:o.size,frameRate:o.fps},firstTimestampBehavior:'offset'});
      encoder=new VideoEncoder({output:(chunk,meta)=>{try{muxer.addVideoChunk(chunk,meta);}catch(e){failure=e;}},error:e=>{failure=e;}});
      encoder.configure(format.config);
    } else {
      stream=preview.captureStream(o.fps);
      recorder=new MediaRecorder(stream,{mimeType:format.mime,videoBitsPerSecond:videoConfig(o,'webm').bitrate});
      recordingDone=new Promise(resolve=>{recorder.onstop=resolve;});
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onerror=e=>{failure=e.error||Error(t('הקלטת הווידאו נכשלה.'));};
    }
    const info=engine.start(text,o.size,o.effects),started=performance.now(),virtualClock=$('engine').contentWindow.exportClock;
    let lastCaptured=-Infinity,endAt=null,frameIndex=0,lastProgress=0,maxQueue=0;
    if(recorder)recorder.start(1000);
    while(true){
      let elapsed;
      if(o.mode==='computed'){
        const now=Math.round(frameIndex*1000/o.fps),previous=Math.round(Math.max(0,frameIndex-1)*1000/o.fps);
        await virtualClock.tickAsync(frameIndex ? now-previous : 0);
        elapsed=frameIndex*1000/o.fps;
      } else {await nextFrame();elapsed=performance.now()-started;}
      if(cancelRequested) throw Error(hiddenDuringExport?t('ההמרה בוטלה כי החלון עבר לרקע. הפעל שוב והשאר אותו בחזית.'):t('ההמרה בוטלה. אפשר להתחיל מחדש.'));
      if(failure)throw failure;
      if($('engine').contentWindow.macroVideoError)throw Error($('engine').contentWindow.macroVideoError);
      if(elapsed>30*60*1000)throw Error(t('הניגון הגיע למגבלת 30 הדקות של גרסת הניסוי.'));
      const state=engine.draw();
      if(o.mode==='realtime') context.drawImage(engine.output,0,0);
      const capture=encoder && (o.mode==='computed' || elapsed-lastCaptured>=1000/o.fps-1);
      if(capture){
        if(o.mode==='computed'){
          // Backpressure waits on real encoder work without advancing the virtual simulation.
          const deadline=performance.now()+30000;
          while(encoder.encodeQueueSize>8){
            if(cancelRequested)throw Error(t('ההמרה בוטלה.'));
            if(failure)throw failure;
            if(performance.now()>deadline)throw Error(t('מקודד הווידאו הפסיק להגיב. נסה גודל או קצב נמוכים יותר.'));
            await new Promise(resolve=>setTimeout(resolve,2));
          }
        }else if(encoder.encodeQueueSize>120)throw Error(t('המחשב אינו עומד בקצב ההקלטה. נסה מצב מחושב, גודל קטן יותר או פחות פריימים.'));
        // Encode directly from the engine canvas; UI preview is independent of every output frame.
        const timestamp=o.mode==='computed'?Math.round(frameIndex*1000000/o.fps):Math.round(elapsed*1000);
        const frame=new VideoFrame(engine.output,{timestamp,duration:Math.round(1000000/o.fps)});
        try{encoder.encode(frame,{keyFrame:encodedFrames%(o.fps*2)===0});}finally{frame.close();}
        encodedFrames++;lastCaptured=elapsed;maxQueue=Math.max(maxQueue,encoder.encodeQueueSize);
      }
      if(!state.playing && endAt===null)endAt=o.mode==='computed'?frameIndex+o.fps-1:elapsed+1000;
      if(performance.now()-lastProgress>100){
        $('progress').value=state.playing?Math.min(99,state.command/info.total*100):99;
        $('status').textContent=t('יוצר סרטון · ')+clock(elapsed/1000)+t(' בסרטון · ')+clock((performance.now()-started)/1000)+t(' עיבוד · ')+Math.round($('progress').value)+'%';
        lastProgress=performance.now();
      }
      if(endAt!==null && (o.mode==='computed'?frameIndex>=endAt:elapsed>=endAt))break;
      frameIndex++;
      if(o.mode==='computed' && frameIndex%10===0)await yieldBrowser();
    }
    $('status').textContent=t('מסיים את קובץ הווידאו…');
    let blob;
    if(encoder){await encoder.flush();if(failure)throw failure;muxer.finalize();blob=new Blob([muxer.target.buffer],{type:'video/'+format.type});}
    else{recorder.stop();await recordingDone;if(failure)throw failure;blob=new Blob(chunks,{type:format.mime});}
    if(o.mode==='realtime') context.drawImage(engine.output,0,0);
    downloadURL=URL.createObjectURL(blob);
    $('download').href=downloadURL;
    $('download').download=file.name.replace(/\.[^.]+$/,'')+'_'+o.mode+'_'+o.size+'_'+o.fps+'fps.'+format.type;
    $('download').hidden=false;$('progress').value=100;
    const report={...o,format:format.type,encodedFrames,maxQueue,wallSeconds:(performance.now()-started)/1000,bytes:blob.size};
    window.lastExportReport=report;
    $('status').textContent=t('הסרטון מוכן · ')+(blob.size/1048576).toFixed(1)+t(' מגה · ')+clock(report.wallSeconds)+t(' עיבוד. לחץ על שמירת הסרטון.');
  }catch(error){showError(error);$('status').textContent=t('לא נשמר סרטון. קובץ המקרו המקורי לא השתנה.');}
  finally{
    engine?.stop();
    if(encoder && encoder.state!=='closed')encoder.close();
    if(recorder && recorder.state!=='inactive')recorder.stop();
    if(stream)stream.getTracks().forEach(track=>track.stop());
    running=false;activeMode=null;$('cancel').hidden=true;$('file').disabled=false;
    optionIDs.forEach(id=>{$(id).disabled=false;});
    await checkOptions(false);
  }
});
loadEngine(false).then(async()=>{$('status').textContent=t('מוכן. בחר קובץ מקרו.');await inspectFileEffects();return checkOptions();}).catch(showError);
