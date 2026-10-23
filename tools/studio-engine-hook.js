// Injected inside the app closure only in the generated Studio engine.
window.addEventListener('error', e => { window.macroVideoError = e.message; });
window.addEventListener('unhandledrejection', e => { window.macroVideoError = String(e.reason?.message || e.reason); });
window.macroVideoEngine = {
 ready: false, total: 0, output: null, fallbackEffects: {...DEFAULT_VIDEO_EFFECTS}, recorded: {}, glowCopy: null,
 inspectEffects(text) { return inspectEffects(parseMacroText(text)); },
 applyRecordedEffects(action) { Object.assign(this.recorded, recordedEffects(action)); },
 start(text, size, effects = DEFAULT_VIDEO_EFFECTS) {
  if (isLifePlaying) pauseLife();
  if (isMacroLoaded) stopMacro();
  const parsed = parseMacroText(text);
  if (!parsed.some(action => action.eventName === 'INIT_STATE')) throw Error('The file has no valid initial board.');
  macroQueue = parsed; this.total = parsed.length; this.recorded = {}; this.fallbackEffects = {...DEFAULT_VIDEO_EFFECTS,...effects};
  this.glowCopy = document.createElement('canvas');
  settingsProfiles.beginReplay(); isMacroLoaded = true; currentMacroStep = 0; pendingMacroPalette = null;
  this.output = document.createElement('canvas'); this.output.width = this.output.height = size;
  playMacro();
  return { total: this.total, nominalSeconds: parsed.at(-1).delta / 1000 };
 },
 draw() {
  if (!this.output) return;
  const effects = {...this.fallbackEffects,...this.recorded};
  renderBoard(this.output.getContext('2d', {alpha:false}), this.output.width, this.output.height, performance.now(), effects.smooth && isSmoothDisplayAvailable(n, separatorPx),
   separatorPx === 0 ? 0 : separatorPx * this.output.width / Math.max(1, canvas.clientWidth));
  if(effects.glow) compositeGlow(this.output,this.glowCopy,effects.intensity,canvas.clientWidth);
  return {playing:isMacroPlaying, command:currentMacroStep, total:this.total, effects};
 },
 stop() { stopMacro(); }
};
initializeApp().then(() => { window.macroVideoEngine.ready = true; }).catch(error => {window.macroVideoError=error.message;});

