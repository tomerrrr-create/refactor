// js/app.js

import { loadEvolutionCycle, persistEvolutionCycle, normalizeEvolutionCycle, normalizeCycleSources, loadCycleIdentity } from './evolution-cycle-settings.js';
import { bindPickerGestures } from './picker-gestures.js';
import { showPaletteGroupTransition } from './palette-group-transition.js';
import { SORT_MODES, normalizeSortMethod, adjustBrightness, hexToRgb, lerp, sortColorsArray } from './colors.js';
import { getText, setCurrentLang, initializeLanguage, getCurrentLang, getAvailableLangs, translations, onLanguageChange } from './i18n.js';
import * as C from './constants.js';
import * as Simulations from './simulations.js';
import { dom } from './dom-elements.js';
import { initializeModals } from './ui-modals.js';
import { loadSimInit, persistSimInit } from './sim-init-settings.js';
import { loadSortCycle, persistSortCycle, normalizeSortCycle, nextSortMethod } from './sort-cycle-settings.js';
import { loadStartup, persistStartup, normalizeStartup, fitStartupSeparator } from './startup-settings.js';


(function() {
      let canvas, ctx;
      let boardState = []; 
      let simulationStartState = null; // For saving simulation history
      
      const ANIMATION_DURATION = 200; // ms
      let animationLoopId = null;
// Preferences are independent of macro playback; replay never overwrites them.
let nudgeIntervalMs = 100;
let replayNudgeTiming = null;
let lastNudgeTime = -Infinity;
try {
    const saved = JSON.parse(localStorage.getItem('colorGridNudge'));
    if (Number.isInteger(saved?.intervalMs) && saved.intervalMs >= 0 && saved.intervalMs <= 200) nudgeIntervalMs = saved.intervalMs;
} catch { /* Use defaults when storage is unavailable. */ }

const liveNudgeTiming = { nudgeTimingVersion: 1, intervalMs: nudgeIntervalMs };

function persistNudgeSettings() {
    try {
        localStorage.setItem('colorGridNudge', JSON.stringify({ intervalMs: nudgeIntervalMs }));
    } catch { /* Settings still apply for this session. */ }
}

function setNudgeInterval(intervalMs, persist = true) {
    if (!Number.isInteger(intervalMs) || intervalMs < 0 || intervalMs > 200) throw new Error('Invalid Nudge interval');
    if (nudgeIntervalMs === intervalMs) return;
    nudgeIntervalMs = intervalMs;
    liveNudgeTiming.intervalMs = intervalMs;
    if (persist) persistNudgeSettings();
    window.logArtEvent('NUDGE_SPEED', JSON.stringify({ nudgeTimingVersion: 1, intervalMs }));
}

function getNudgeTiming() {
    return replayNudgeTiming || liveNudgeTiming;
}

function applyNudgeTiming(rulesStr) {
    if (rulesStr === 'No specific rules mapping') {
        // All unmarked recordings predate the fast experiment and use original frame counting.
        replayNudgeTiming = { intervalMs: 200, legacyFrames: true };
        return;
    }
    const timing = JSON.parse(rulesStr);
    if (!timing || timing.nudgeTimingVersion !== 1 || !Number.isInteger(timing.intervalMs) || timing.intervalMs < 0 || timing.intervalMs > 200) {
        throw new Error('Invalid Nudge timing');
    }
    replayNudgeTiming = { nudgeTimingVersion: 1, intervalMs: timing.intervalMs };
}
// --- Macro Replay System Variables ---
let macroQueue = [];
let currentGenerationCount = 0; // מונה דורות לסימולציה
let isMacroLoaded = false;
let isMacroPlaying = false;
let macroTimerId = null;
let currentMacroStep = 0;
let macroStartTime = 0;
let isExecutingMacroCommand = false; // דגל שמונע מה-Kill Switch להרוג את עצמו
let pendingMacroPalette = null; // שומר את הפלטה הזמנית למאקרו
let isSelectingMacroPalette = false; // דגל האם אנחנו בוחרים כעת פלטה למאקרו
let isMacroFullscreen = false; // דגל למצב מסך מלא של המאקרו




// --- Art Logger System (Session Recipe) ---
// --- TIMESTAMP ---

let artRecipeLog = [];
let nextHistoryActionId = 1;
let historyRecipeCursor = 0;

window.logArtEvent = function(eventName, details, forceLog = false) {
        // חוסמים כפילויות של פונקציות פנימיות בזמן שניגון המאקרו עובד, אלא אם זה דיווח יזום מהמאקרו עצמו
        if (isExecutingMacroCommand && !forceLog) return;
    
        const now = new Date();
        const timestamp = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    
        // מערכת היברידית: אם אנחנו בסימולציה רצה (ולא Breathe), נוסיף חותמת דור
        let genTag = "";
        if (isLifePlaying && armedSimulation && armedSimulation !== 'breathe') {
            genTag = ` [GEN:${currentGenerationCount}]`;
        }
    
        artRecipeLog.push(`[${timestamp}]${genTag} ${eventName} -> ${details}`);
    };


// ------------------------------------------
// --- NO TIMESTAMP ---
// --- Art Logger System (Session Recipe) NO---
// let artRecipeLog = [];
// let artStepCounter = 1; // מונה צעדים סידורי

// window.logArtEvent = function(eventName, details) {
//     artRecipeLog.push(`${artStepCounter}. ${eventName} -> ${details}`);
//     artStepCounter++; // קידום המונה לקראת הצעד הבא
// };
// ------------------------------------------


      // --- Breathe Animation State ---
      let isBreathing = false; // This variable is now effectively replaced by (isLifePlaying && armedSimulation === 'breathe')
      let breatheStartTime = 0;
      let breatheEvoMode = 'off'; // 'off', 'solo' or 'group'









      let currentSortIndex = 0;
      let sortCycleMethods = loadSortCycle();




// --- לוגיקת ניווט חכמה לפלטות (לפי קבוצות) ---

function getNextPaletteIndex(currentIndex) {
    // מציאת הקבוצה שאליה שייכת הפלטה הנוכחית
    const group = C.PALETTE_GROUPS.find(g => g.indexes.includes(currentIndex));
    
    // פולבאק למקרה שמשהו השתבש (התנהגות רגילה)
    if (!group || group.indexes.length === 0) {
        return (currentIndex + 1) % PALETTES.length; 
    }

    // מציאת המיקום שלנו בתוך הקבוצה ומעבר להבא (במעגל סגור)
    const posInGroup = group.indexes.indexOf(currentIndex);
    const nextPos = (posInGroup + 1) % group.indexes.length;
    return group.indexes[nextPos];
}

function getPrevPaletteIndex(currentIndex) {
    const group = C.PALETTE_GROUPS.find(g => g.indexes.includes(currentIndex));
    
    if (!group || group.indexes.length === 0) {
        return (currentIndex - 1 + PALETTES.length) % PALETTES.length;
    }

    const posInGroup = group.indexes.indexOf(currentIndex);
    const prevPos = (posInGroup - 1 + group.indexes.length) % group.indexes.length;
    return group.indexes[prevPos];
}

function getNextPaletteGroupIndex(currentIndex) {
    const groups = C.PALETTE_GROUPS.filter(group => group.id !== 'archive' && group.indexes.length);
    if (!groups.length) return currentIndex;
    const currentGroup = groups.findIndex(group => group.indexes.includes(currentIndex));
    return groups[(currentGroup + 1) % groups.length].indexes[0];
}


// --- מערכת מיון פלטות צבעים (Sorting Infrastructure) ---
      let currentSortMethod = 'luminance'; // שיטת המיון הפעילה כברירת מחדל



      // אתחול ראשוני: שומרים את סדר הצבעים המקורי וממיינים לפי ברירת המחדל
      C.PALETTES.forEach(palette => {
          if (!palette.originalColors) {
              palette.originalColors = [...palette.colors]; 
          }
          palette.colors = sortColorsArray(palette.originalColors, currentSortMethod);
      });
      // --------------------------------------------------------

// --- שלב 2: לוגיקת המיפוי (Remapping) ---
function applySortMethod(newMethod) {
    newMethod = normalizeSortMethod(newMethod);
    if (currentSortMethod === newMethod) return; // לא עושים כלום אם זו כבר השיטה הפעילה
    window.logArtEvent('Sort by', newMethod); // תיעוד שינוי מיון

          // 1. שומרים את צבע ה-Hex המדויק של כל תא לפני השינוי
          const currentPalette = C.PALETTES[activePaletteIndex].colors;
          const currentColors = boardState.map(tile => currentPalette[tile.k]);
          
          // שומרים גם את הצבע הקודם (prevK) כדי לא לשבור אנימציות של מעברי צבע אם הן קורות עכשיו
          const currentPrevColors = boardState.map(tile => tile.prevK !== null ? currentPalette[tile.prevK] : null);
        // === תוספת שלנו: שומרים את הצבע הספציפי. אם המצב הוא DARKEST (-1), אנחנו מתעלמים ולא עוקבים. ===
        const oldAnchorColor = (magnetRules && magnetRules.anchorColorIndex !== -1 && currentPalette[magnetRules.anchorColorIndex]) ? currentPalette[magnetRules.anchorColorIndex] : null;


          // 2. מעדכנים את השיטה הפעילה וממיינים את כל הפלטות מחדש
          currentSortMethod = newMethod;
          C.PALETTES.forEach(palette => {
              palette.colors = sortColorsArray(palette.originalColors, currentSortMethod);
          });

          // 3. ממפים מחדש את הלוח שלנו לאינדקסים החדשים
          const newPalette = C.PALETTES[activePaletteIndex].colors;
          // === תוספת שלנו: מחפשים איפה הצבע מתחבא עכשיו, ומעדכנים את המגנט! ===
          if (oldAnchorColor && magnetRules) {
            const newAnchorIndex = newPalette.indexOf(oldAnchorColor);
            if (newAnchorIndex !== -1) {
                magnetRules.anchorColorIndex = newAnchorIndex;
            }
        }
          
          boardState.forEach((tile, index) => {
              // מעדכנים את הצבע הראשי של התא
              const oldHex = currentColors[index];
              const newK = newPalette.indexOf(oldHex);
              tile.k = newK !== -1 ? newK : 0; // אם בטעות לא מצא (לא אמור לקרות), נשים 0
tile.v = tile.k;

              // מעדכנים את צבע האנימציה, אם קיים
              if (currentPrevColors[index] !== null) {
                  const oldPrevHex = currentPrevColors[index];
                  const newPrevK = newPalette.indexOf(oldPrevHex);
                  tile.prevK = newPrevK !== -1 ? newPrevK : null;
              }
          });

          syncSelectedColorWithPalette();

          // 4. מרנדרים מחדש את תפריט הצבעים כדי שהמשתמש יראה את הסדר החדש
          if (typeof renderColorPickerContent === 'function') {
              renderColorPickerContent();
          }
      }
      // ------------------------------------------


      
      let gameOfLifeRules = cloneGameOfLifeRules(C.defaultGameOfLifeRules);
      let personalGameOfLifeRules = cloneGameOfLifeRules(gameOfLifeRules);
      let gameOfLifeMode = 'personal';
      const defaultGolCycle = [C.defaultGameOfLifeRules, C.GAME_OF_LIFE_PRESETS.btnGolPresetShuffle, C.GAME_OF_LIFE_PRESETS.btnGolPresetCoral];
      let gameOfLifeCycle = loadEvolutionCycle('colorGridGolCycleMembership', defaultGolCycle);
      let gameOfLifeSources;
const gameOfLifeIdentity = loadCycleIdentity('colorGridGolCycleMembershipIdentity', gameOfLifeCycle, C.GAME_OF_LIFE_PRESETS);
gameOfLifeSources = gameOfLifeIdentity.sources;
personalGameOfLifeRules = cloneGameOfLifeRules(gameOfLifeIdentity.yoursRules);
      gameOfLifeRules = cloneGameOfLifeRules(gameOfLifeCycle[0]);
      let gravitationalSortRules = { ...C.defaultGravitationalSortRules };
      let erosionRules = { ...C.defaultErosionRules };
      let dlaRules = { ...C.defaultDlaRules };
      let contourRules = { ...C.defaultContourRules }; // <-- ADDED HERE
let spiralRules = { ...C.defaultSpiralRules };
let magnetRules = { ...C.defaultMagnetRules };
let chiFlowRules = cloneChiFlowRules(C.defaultChiFlowRules);
let personalChiFlowRules = cloneChiFlowRules(chiFlowRules);
let chiFlowMode = 'personal';
const defaultChiCycle = [C.defaultChiFlowRules, C.CHI_FLOW_PRESETS.Ripples, C.CHI_FLOW_PRESETS.Nova];
let chiFlowCycle = loadEvolutionCycle('colorGridChiCycleMembership', defaultChiCycle);
let chiFlowSources;
const chiFlowIdentity = loadCycleIdentity('colorGridChiCycleMembershipIdentity', chiFlowCycle, C.CHI_FLOW_PRESETS);
chiFlowSources = chiFlowIdentity.sources;
personalChiFlowRules = cloneChiFlowRules(chiFlowIdentity.yoursRules);
chiFlowRules = cloneChiFlowRules(chiFlowCycle[0]);
      let turingRules = { ...C.defaultTuringRules };
      let dlaState = null;
      let turingState = null;

      let activePaletteIndex = 0;
      let n = 7;
      let separatorPx = 2;
      let isBrushModeOn = true; 
      let isContinuousBrushOn = false;
      let hasPerformedInitialAutofill = false; 
      let hasTriggeredFirstNudge = false;
      let hasUsedRandomize = false;
      let isAnimating = false;
      // isBreathing is now defined globally at the top
      let isSimModeActive = false;
      let selectedColor = null;
      let isRainbowModeActive = false;
      let selectedColorIndex = -1;
      let colorPickerPage = 0;
      let longPressTimer = null;
      let technicianHoldTimer = null;
      let simulationHoldBounds = null;
      let wasLongPress = false;
      let startupSettings = loadStartup();
      let simulationInitSettings = loadSimInit();
      let brushSize = 1; 
      let isLifePlaying = false;
      let animationFrameId = null;
      let armedSimulation = null;
      let symmetryMode = 'off';
let brightnessEvoMode = 'off'; // ישמור את המצב הנבחר: 'off', 'brightness', או 'contrast'
let dlaMode = 'off'; // 'off', 'genetics', or 'no-genetics'
let spiralMode = 'off';
const SPIRAL_MODE_SEQUENCE = ['off', 'b', 'left', 'black_hole'];
let magnetMode = 'off';
 let gsMode = 'off'; // 'off', 'up', 'right', 'down', 'left', 'center_x', 'radial', 'vortex'

      // breatheEvoMode is defined at the top
      
      const isGold = (index) => boardState[index]?.isGold;
      const paletteLen = () => palette().length;
      const norm = (k, m = paletteLen()) => ((k % m) + m) % m;

      let history = [];
      let future = [];

      const originalColorPickerIconHTML = dom.btnColorPicker.innerHTML;
      
      let modals;

      function palette() { return C.PALETTES[activePaletteIndex].colors; }

// === פונקציה לדחיסת מצב הלוח עבור המאקרו ===
function compressBoardState() {
    if (boardState.length === 0) return "";
    let compressed = [];
    let currentK = boardState[0].k;
    let count = 1;

    for (let i = 1; i < boardState.length; i++) {
        if (boardState[i].k === currentK) {
            count++;
        } else {
            compressed.push(`${count}x${currentK}`);
            currentK = boardState[i].k;
            count = 1;
        }
    }
    compressed.push(`${count}x${currentK}`);
    return compressed.join(',');
}

      function getCurrentState() {
          return { 
            n, 
            activePaletteIndex, 
            paletteName: C.PALETTES[activePaletteIndex].originalName, 
            separatorPx,
currentSortMethod, 
            spiralMethod: spiralMode !== 'off' ? spiralRules.method : undefined,
            erosionMode: armedSimulation === 'erosion' ? erosionRules.mode : undefined,
            tiles: boardState.map(tile => ({ 
                k: tile.k, 
                isGold: tile.isGold,
                v: tile.v
            }))
          };
      }

      function logCurrentStateAsInit() {
        const stateSnapshot = {
            recipeVersion: 2,
            n: n,
            pal: activePaletteIndex,
            sort: currentSortMethod,
            sep: separatorPx,
            board: compressBoardState()
        };
        window.logArtEvent('INIT_STATE', JSON.stringify(stateSnapshot));
    }


      function areStatesEqual(stateA, stateB) {
        if (!stateA || !stateB) return false;
        if (stateA.n !== stateB.n || stateA.activePaletteIndex !== stateB.activePaletteIndex || stateA.separatorPx !== stateB.separatorPx || stateA.symmetryMode !== stateB.symmetryMode || stateA.selectedColor !== stateB.selectedColor || stateA.isRainbowModeActive !== stateB.isRainbowModeActive || stateA.tiles.length !== stateB.tiles.length) return false;
        for (let i = 0; i < stateA.tiles.length; i++) {
          if (stateA.tiles[i].k !== stateB.k || stateA.tiles[i].isGold !== stateB.isGold) return false;
        }
        return true;
      }

      function applyState(state) {
        let paletteIdx = C.PALETTES.findIndex(p => p.originalName === state.paletteName);
        if (paletteIdx === -1) {
            paletteIdx = state.activePaletteIndex;
        }

activePaletteIndex = paletteIdx >= 0 && paletteIdx < C.PALETTES.length ? paletteIdx : 0;
        separatorPx = state.separatorPx;

        if (state.currentSortMethod && state.currentSortMethod !== currentSortMethod) {
            currentSortMethod = normalizeSortMethod(state.currentSortMethod);
            C.PALETTES.forEach(palette => {
                palette.colors = sortColorsArray(palette.originalColors, currentSortMethod);
            });
            // עדכון האייקון של הכפתור
            const modeIndex = SORT_MODES.findIndex(m => m.method === currentSortMethod);
            if (modeIndex !== -1) {
                currentSortIndex = modeIndex;
                if (dom.sortIconGroup) dom.sortIconGroup.innerHTML = SORT_MODES[currentSortIndex].icon;
            }
            // רענון חלונית בחירת הצבעים
            if (modals && typeof modals.renderColorPickerContent === 'function') {
                modals.renderColorPickerContent();
            }
        }

        syncSelectedColorWithPalette();
        updatePaletteHeader();
        applySeparator();
        updateSymmetryUI();

        if (n !== state.n) {
            n = state.n;
            initializeBoardAndCanvas(false); 
        }

        boardState = state.tiles.map(tileState => ({
k: tileState.k,
            v: tileState.v !== undefined ? tileState.v : tileState.k,
            prevK: null,
            animStart: 0,
            isGold: tileState.isGold,
            startDelay: 0
        }));

        // Older project files have no spiralMethod and keep their old behavior.
        if (state.spiralMethod && [...SPIRAL_MODE_SEQUENCE, 'a', 'vortex', 'radial', 'down'].includes(state.spiralMethod) && state.spiralMethod !== 'off') {
            if (armedSimulation !== 'spiral') armSimulation('spiral');
            spiralMode = state.spiralMethod;
            spiralRules.method = state.spiralMethod;
            updateSpiralButtonUI();
        }
        
        if (['legacy', 'channels', 'channels-solid'].includes(state.erosionMode)) {
            if (armedSimulation !== 'erosion') armSimulation('erosion');
            erosionRules.mode = state.erosionMode;
        }
        updateErosionButtonUI();
        renderToScreen(null); 
      }

      function pushHistory(state) {
        state.id = nextHistoryActionId++;
        window.logArtEvent('HISTORY_ACTION', JSON.stringify({
            recipeVersion: 2,
            id: state.id,
            from: historyRecipeCursor,
            to: artRecipeLog.length
        }), isExecutingMacroCommand);
        historyRecipeCursor = artRecipeLog.length;
        history.push(state);
        if (history.length > C.HISTORY_LIMIT) { history.shift(); }
        future = [];
        updateUndoRedoButtons();
      }

      function performAction(actionFn) {
        const beforeState = getCurrentState();
        actionFn();
        const afterState = getCurrentState();
        if (!areStatesEqual(beforeState, afterState)) {
            pushHistory({ before: beforeState, after: afterState });
            hasPerformedInitialAutofill = true;
        }
      }

      function undo() {
        if (history.length === 0) return;
        const lastAction = history.pop();
        future.push(lastAction);
        applyState(lastAction.before);
        window.logArtEvent('UNDO', JSON.stringify({ recipeVersion: 2, id: lastAction.id, settings: getHistorySettings(lastAction.before) }), isExecutingMacroCommand);
        historyRecipeCursor = artRecipeLog.length;
        updateUndoRedoButtons();
      }

      function redo() {
        if (future.length === 0) return;
        const nextAction = future.pop();
        history.push(nextAction);
        applyState(nextAction.after);
        window.logArtEvent('REDO', JSON.stringify({ recipeVersion: 2, id: nextAction.id, settings: getHistorySettings(nextAction.after) }), isExecutingMacroCommand);
        historyRecipeCursor = artRecipeLog.length;
        updateUndoRedoButtons();
      }

      function updateUndoRedoButtons() {
        dom.btnUndo.disabled = history.length === 0;
        dom.btnRedo.disabled = future.length === 0;
      }

      function getPaletteColor(k) { return palette()[norm(k)]; }

      function initializeBoardAndCanvas(createEmptyState = true) {
          canvas = dom.boardCanvas;
          if (!canvas) { return; }
          ctx = canvas.getContext('2d');
          const dpr = window.devicePixelRatio || 1;
          const rect = canvas.getBoundingClientRect();
          canvas.width = rect.width * dpr;
          canvas.height = rect.height * dpr;
          ctx.scale(dpr, dpr);
          
          if (createEmptyState) {
boardState = new Array(n * n).fill(null).map(() => ({
                k: 0,
                v: 0,
                prevK: null,
                animStart: 0,
                isGold: false,
                startDelay: 0}));
            hasPerformedInitialAutofill = false;
          }
          renderToScreen(null);
      }

      function animationLoop(timestamp) {
          let isStillAnimating = false;
          const now = performance.now();
          
          boardState.forEach(tile => {
              if (tile.prevK !== null) {
                  const elapsed = now - tile.animStart;
                  if (elapsed < ANIMATION_DURATION) {
                      isStillAnimating = true;
                  } else {
                      tile.prevK = null; 
                  }
              }
          });

          renderToScreen(now);

          if (isStillAnimating || (isLifePlaying && armedSimulation === 'breathe')) {
              animationLoopId = requestAnimationFrame(animationLoop);
          } else {
              animationLoopId = null; 
          }
      }

      function startAnimationLoop() {
          if (!animationLoopId) {
              animationLoopId = requestAnimationFrame(animationLoop);
          }
      }
      

// משתנים גלובליים לציור מהיר (מחוץ לפונקציה כדי למחזר אותם)
let offscreenRenderCanvas = null;
let offscreenRenderCtx = null;
let cachedImgData = null; // משתנה למניעת דליפת זיכרון!

function renderBoard(targetCtx, width, height, timestamp = performance.now()) {
    if (!targetCtx) return;
    if (boardState.length === 0) return;

    const currentPalette = palette();
    const paletteAsRgb = currentPalette.map(hexToRgb);

    // ---------------------------------------------------------
    // נתיב אולטרה-מהיר: מצב סימולציה (בלי מרווחים - separatorPx === 0)
    // ---------------------------------------------------------
    if (separatorPx === 0) {
        if (!offscreenRenderCanvas) {
            offscreenRenderCanvas = document.createElement('canvas');
            offscreenRenderCtx = offscreenRenderCanvas.getContext('2d', { willReadFrequently: true });
        }
        
        // יצירת חלל הזיכרון *רק פעם אחת* (או כשהלוח משנה גודל) - סוגר את דליפת הזיכרון
        if (offscreenRenderCanvas.width !== n) {
            offscreenRenderCanvas.width = n;
            offscreenRenderCanvas.height = n;
            cachedImgData = offscreenRenderCtx.createImageData(n, n);
        } else if (!cachedImgData) {
            cachedImgData = offscreenRenderCtx.createImageData(n, n);
        }

        const imgData = cachedImgData;
        const data = imgData.data;
        const goldRgb = [255, 215, 0]; // C.GOLD in RGB

        for (let i = 0; i < n * n; i++) {
            const tileData = boardState[i];
            if (!tileData) continue;

            let rgb;
            if (isLifePlaying && armedSimulation === 'breathe' && !tileData.isGold) {
                const brightnessFactor = Simulations.getBreatheBrightnessFactor(tileData, timestamp, breatheStartTime, breatheEvoMode);
                const baseRgb = paletteAsRgb[norm(tileData.k)];
                rgb = [
                    Math.round(baseRgb[0] * brightnessFactor),
                    Math.round(baseRgb[1] * brightnessFactor),
                    Math.round(baseRgb[2] * brightnessFactor)
                ];
            }
            
         else if (tileData.isGold) {
                rgb = goldRgb;
            } else if (tileData.prevK !== null && timestamp) {
                const elapsed = timestamp - tileData.animStart;
                const progress = Math.min(elapsed / ANIMATION_DURATION, 1.0);
                const fromRgb = paletteAsRgb[norm(tileData.prevK)];
                const toRgb = paletteAsRgb[norm(tileData.k)];
                rgb = [
                    Math.round(lerp(fromRgb[0], toRgb[0], progress)),
                    Math.round(lerp(fromRgb[1], toRgb[1], progress)),
                    Math.round(lerp(fromRgb[2], toRgb[2], progress))
                ];
            } else {
                rgb = paletteAsRgb[norm(tileData.k)];
            }

            // כתיבה ישירה לזיכרון התמונה (4 תאים לכל פיקסל: R, G, B, Alpha)
            const dataIndex = i * 4;
            data[dataIndex] = rgb[0];     // Red
            data[dataIndex + 1] = rgb[1]; // Green
            data[dataIndex + 2] = rgb[2]; // Blue
            data[dataIndex + 3] = 255;    // Alpha (אטימות מלאה)
        }

        // צייר את המערך לקנבס הווירטואלי הקטן
        offscreenRenderCtx.putImageData(imgData, 0, 0);

        // מתיחת הקנבס הווירטואלי על פני הקנבס האמיתי
        targetCtx.imageSmoothingEnabled = false; 
        targetCtx.drawImage(offscreenRenderCanvas, 0, 0, width, height);
        
        return; // סיימנו את הרינדור המהיר!
    }

    // ---------------------------------------------------------
    // נתיב רגיל וקלאסי (כשיש מרווחים, separatorPx > 0)
    // ---------------------------------------------------------
    targetCtx.fillStyle = '#000000';
    targetCtx.fillRect(0, 0, width, height);

    const totalGapSize = (n - 1) * separatorPx;
    const tileSize = (width - totalGapSize) / n;

    for (let i = 0; i < n * n; i++) {
        const tileData = boardState[i];
        if (!tileData) continue;

        let finalColor;

        if (isLifePlaying && armedSimulation === 'breathe' && !tileData.isGold) {
            const brightnessFactor = Simulations.getBreatheBrightnessFactor(tileData, timestamp, breatheStartTime, breatheEvoMode);
            const originalColor = getPaletteColor(tileData.k);
            finalColor = adjustBrightness(originalColor, brightnessFactor);
        }
        else if (tileData.isGold) {
            finalColor = C.GOLD || '#FFD700'; 
        } else if (tileData.prevK !== null && timestamp) {
            const elapsed = timestamp - tileData.animStart;
            const progress = Math.min(elapsed / ANIMATION_DURATION, 1.0);
            
            const fromRgb = paletteAsRgb[norm(tileData.prevK)];
            const toRgb = paletteAsRgb[norm(tileData.k)];

            const r = Math.round(lerp(fromRgb[0], toRgb[0], progress));
            const g = Math.round(lerp(fromRgb[1], toRgb[1], progress));
            const b = Math.round(lerp(fromRgb[2], toRgb[2], progress));
            
            finalColor = `rgb(${r},${g},${b})`;
        } else {
            finalColor = getPaletteColor(tileData.k);
        }

        targetCtx.fillStyle = finalColor;
        const row = Math.floor(i / n);
        const col = i % n;
        const x = col * (tileSize + separatorPx);
        const y = row * (tileSize + separatorPx);
        
        targetCtx.fillRect(x, y, tileSize, tileSize);
    }
}



      function renderToScreen(timestamp) {
        if (!ctx || !canvas) return;
        renderBoard(ctx, canvas.clientWidth, canvas.clientHeight, timestamp);
      }

      // --- startBreatheAnimation and stopBreatheAnimation are now removed. ---
      // Logic is merged into togglePlayPauseLife.
      
      function updatePaletteHeader() {
        const pal = C.PALETTES[activePaletteIndex];
        if (pal.iconHTML) { dom.btnPalette.innerHTML = pal.iconHTML; } 
        else { dom.btnPalette.innerHTML = ''; dom.btnPalette.textContent = pal.emoji; }
        const label = `${getText('tooltip_palette')}: ${pal.name} (${activePaletteIndex + 1}/${C.PALETTES.length})`;
        dom.btnPalette.title = getText('tooltip_palette');
        dom.btnPalette.setAttribute('aria-label', label);
      }
      
      function applySeparator() {
          dom.btnGap.title = getText('tooltip_gap');
          dom.btnGap.setAttribute('aria-label', getText('tooltip_gap'));
          renderToScreen(null); 
      }

      async function animateBoardTransition(actionFn) {
        if (isAnimating) return;
        isAnimating = true;
        dom.boardOverlay.style.opacity = '1';
        await new Promise(resolve => setTimeout(resolve, 350));
        actionFn();
        await new Promise(resolve => setTimeout(resolve, 50));
        dom.boardOverlay.style.opacity = '0';
        await new Promise(resolve => setTimeout(resolve, 350));
        isAnimating = false;
      }
      
      function applyInitialPattern() {
        const BLACK_INDEX = 0; 
        const centerIndex = Math.floor((n * n) / 2);
        boardState.forEach((tile, index) => {
          tile.isGold = (index === centerIndex);
          tile.k = tile.isGold ? 0 : BLACK_INDEX;
          tile.v = tile.k;
          tile.prevK = null;
        });
        renderToScreen(null);
      }

      function cycleSeparator() {
          performAction(() => {
            const seq = C.SEPARATORS;
            let idx = seq.indexOf(separatorPx);
            if (idx === -1) { idx = seq.indexOf(seq.reduce((p, c) => (Math.abs(c - separatorPx) < Math.abs(p - separatorPx) ? c : p))); }
            separatorPx = seq[(idx + 1) % seq.length];
            window.logArtEvent('SEPARATOR_CHANGE', separatorPx);
            applySeparator();
          });
      }

      function fillRandom() {
        const now = performance.now();
        boardState.forEach(tile => {
            tile.prevK = tile.k;
            tile.animStart = now;
            tile.isGold = false;
            tile.k = Math.floor(Math.random() * paletteLen());
            tile.v = tile.k;
        });
        startAnimationLoop();
      }

      function randomizeAll() {
        window.logArtEvent('--', 'Palette Randomized'); // תיעוד רנדומיזציה
        performAction(fillRandom);
        hasUsedRandomize = true;
      }

      function shuffleExistingColors() {
          const nonGoldIndices = [];
          const existingColors = [];
          boardState.forEach((tile, index) => {
              if (!tile.isGold) {
                  nonGoldIndices.push(index);
                  existingColors.push(tile.k);
              }
          });
          if (nonGoldIndices.length < 2) return;
          for (let i = existingColors.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [existingColors[i], existingColors[j]] = [existingColors[j], existingColors[i]];
          }
          const now = performance.now();
          const diff = [];
          nonGoldIndices.forEach((boardIndex, arrayIndex) => {
              const oldK = boardState[boardIndex].k;
              const newK = existingColors[arrayIndex];
              if (oldK !== newK) {
                  boardState[boardIndex].prevK = oldK;
                  boardState[boardIndex].animStart = now;
                  boardState[boardIndex].k = newK;
                  boardState[boardIndex].v = newK;
                  diff.push({ i: boardIndex, k: newK });
              }
          });
          window.logArtEvent('SHUFFLE_COLORS', JSON.stringify(diff));
          startAnimationLoop();
      }

      function goDark() {
        const darkestIndex = 0;
        const now = performance.now();
        boardState.forEach(tile => {
          if (tile.k !== darkestIndex || tile.isGold) {
              tile.prevK = tile.k;
              tile.animStart = now;
              tile.isGold = false;
              tile.k = darkestIndex;
              tile.v = darkestIndex;
          }
        });

dlaState = null; // איפוס לפרקטלים
        turingState = null; // <--- הוסף את השורה הזו כאן! (איפוס לטיורינג)
spiralMode = 'off';
    updateSpiralButtonUI();
        startAnimationLoop();

      }

      function goDarkAction() {
        animateBoardTransition(() => {
            window.logArtEvent('GO_DARK', '---');
            performAction(goDark);
        });
      }
      
function invertGrid() {
        window.logArtEvent('Invert Colors', `Sort: ${currentSortMethod}`); // תיעוד היפוך צבעים כולל שיטת המיון

        performAction(() => {
            
            const len = paletteLen();
            const now = performance.now();
            boardState.forEach(tile => {
                if(!tile.isGold) {
                    const invertedIndex = (len - 1) - tile.k;
                    if (tile.k !== invertedIndex) {
                        tile.prevK = tile.k;
                        tile.animStart = now;
                        tile.k = invertedIndex;
                        tile.v = invertedIndex;
                    }
                }
            });
            startAnimationLoop();
        });
      }

      // Phase 1 Addition: New function to adapt colors
      function adaptColors() {
        performAction(() => {
          if (boardState.some(tile => !tile.isGold && tile.k !== norm(tile.k))) {
            window.logArtEvent('ADAPT_COLORS', '---');
          }
          const len = paletteLen();
          const now = performance.now();
          boardState.forEach(tile => {
            if (!tile.isGold) {
              const newK = norm(tile.k); // Use norm to get the visually correct index
              if (tile.k !== newK) {
                // We don't animate this change, we snap it to fix the state
                tile.k = newK;
                tile.v = newK;
              }
            }
          });
          renderToScreen(null); // Re-render immediately with the corrected state
        });
      }
      


function applyNudgeLogic(direction) {
          const now = performance.now();
          let changed = false;
          boardState.forEach(tile => {
            if (!tile.isGold) {
                let newIndex = norm(tile.k + direction);
                
                if (tile.k !== newIndex) {
                    tile.prevK = tile.k;
                    tile.animStart = now;
                    tile.k = newIndex;
                    tile.v = newIndex;
                    changed = true;
                }
            }
          });
          if (changed) startAnimationLoop();
      }

      function nudgeColors(direction) {
          performAction(() => applyNudgeLogic(direction));
      }

      function handleNudgeBrighterClick() {
        window.logArtEvent('NUDGE', `Brighter | Sort: ${currentSortMethod}`); 
          nudgeColors(1);
          armSimulation('nudgeBrighter');
      }

      function handleNudgeDarkerClick() {
        window.logArtEvent('NUDGE', `Darker | Sort: ${currentSortMethod}`); 
          nudgeColors(-1);
          armSimulation('nudgeDarker');
      }





      // Keep the chosen color stable when its palette index changes.
      function syncSelectedColorWithPalette() {
          selectedColorIndex = selectedColor ? palette().indexOf(selectedColor) : -1;
          if (selectedColorIndex === -1) selectedColor = null;
          updateGlowEffect();
          updateColorPickerButtonUI();
      }

      function resetSelectedColor() {
          selectedColor = null;
          selectedColorIndex = -1;
          isRainbowModeActive = false;
          updateGlowEffect();
          updateColorPickerButtonUI();
      }

      function resetToGoldAndDefaultPalette() {
        performAction(() => {
            activePaletteIndex = 0;
            separatorPx = 2;
            n = 5;
            symmetryMode = 'off';
            resetSelectedColor();
            updatePaletteHeader();
            initializeBoardAndCanvas(true); 
            applyInitialPattern();
            applySeparator(); 
            updateSymmetryUI();
            hasPerformedInitialAutofill = true;
        });
        setBrushMode(true);
      }

      function specialReset() {
        activePaletteIndex = Math.floor(Math.random() * C.PALETTES.length);
        separatorPx = C.SEPARATORS[Math.floor(Math.random() * C.SEPARATORS.length)];
        n = C.SIZES[Math.floor(Math.random() * C.SIZES.length)];
        resetSelectedColor();
        updatePaletteHeader();
        initializeBoardAndCanvas(true);
        fillRandom(); 
        applySeparator();
        hasPerformedInitialAutofill = true;
        logCurrentStateAsInit();
      }
      
function handlePaletteSwitch(backwards = false) {
        let nextIndex;
        if (backwards) {
            nextIndex = getPrevPaletteIndex(activePaletteIndex);
        } else {
            nextIndex = getNextPaletteIndex(activePaletteIndex);
        }
        switchToPalette(nextIndex);
      }

      

      function switchToPalette(index) {
        // --- תוספת: תפיסת הבחירה אם אנחנו במצב החלפת פלטה למאקרו ---
        // נוודא שזה קורה רק כאשר המאקרו *לא* מנגן
        if (isSelectingMacroPalette && !isMacroPlaying) {
            pendingMacroPalette = index;
            isSelectingMacroPalette = false;

        // --- תוספת: עדכון כפתור המאקרו שיציג את הפלטה החדשה שנבחרה ---
        if (typeof updateMacroPaletteButtonUI === 'function') {
            updateMacroPaletteButtonUI(index);
        }
        // -------------------------------------------------------------

        if (modals && typeof modals.closeModal === 'function') modals.closeModal();
            return;
        }
        // -------------------------------------------------------------
        if (index === activePaletteIndex) return;
        window.logArtEvent('Palette Change', `${C.PALETTES[index].name} | Sort: ${currentSortMethod}`); // תיעוד החלפת פלטה כולל שיטת מיון

        performAction(() => {
            
            activePaletteIndex = index;
            resetSelectedColor();
            updatePaletteHeader();
            renderToScreen(null);
        });
      }

      function switchPalette(backwards = false) {
        const shouldTriggerNudge = !hasUsedRandomize && !hasTriggeredFirstNudge;
        handlePaletteSwitch(backwards);
        if (shouldTriggerNudge) {
            hasTriggeredFirstNudge = true;
            dom.btnRandom.classList.add('glow-animation');
            setTimeout(() => { dom.btnRandom.classList.remove('glow-animation'); }, 4000);
        }
      }

      function switchPaletteGroup() {
        if (isAnimating) return;
        const nextIndex = getNextPaletteGroupIndex(activePaletteIndex);
        if (nextIndex === activePaletteIndex) return;
        const fromCount = paletteLen();
        // Keep palette change and index adaptation as separate undoable actions.
        switchToPalette(nextIndex);
        adaptColors();
        if (activePaletteIndex === nextIndex) {
            showPaletteGroupTransition(dom.board, fromCount, paletteLen());
        }
      }
      
      function _performResize(newSize) {
        const oldTiles = [...boardState];
        const oldSize = n;
        n = newSize;
        initializeBoardAndCanvas(true);
        const diff = oldSize - newSize;
        const offset = Math.floor(Math.abs(diff) / 2);

        if (newSize < oldSize) {
            for (let r = 0; r < newSize; r++) {
                for (let c = 0; c < newSize; c++) {
                    const newIndex = r * newSize + c;
                    const oldRow = r + offset;
                    const oldCol = c + offset;
                    const oldIndex = oldRow * oldSize + oldCol;
                    if (oldTiles[oldIndex]) { boardState[newIndex] = oldTiles[oldIndex]; }
                }
            }
        } else {
            for (let r = 0; r < newSize; r++) {
                for (let c = 0; c < newSize; c++) {
                    const newIndex = r * newSize + c;
                    const oldRow = r - offset;
                    const oldCol = c - offset;
                    if (oldRow >= 0 && oldRow < oldSize && oldCol >= 0 && oldCol < oldSize) {
                         const oldIndex = oldRow * oldSize + oldCol;
                         if (oldTiles[oldIndex]) { boardState[newIndex] = oldTiles[oldIndex]; }
                    }
                }
            }
        }
        renderToScreen(null);
      }

      function resizeGrid(increase = false) {
        const seq = C.SIZES;
        let newSize;
        if (increase) {
            newSize = [...seq].reverse().find(size => size > n);
            if (newSize === undefined) newSize = seq[0];
        } else {
            newSize = seq.find(size => size < n);
            if (newSize === undefined) newSize = seq[seq.length - 1];
        }
        if (newSize === n) return;
        animateBoardTransition(() => performAction(() => {
            window.logArtEvent('GRID_RESIZE', newSize); // השורה שהוספנו
            _performResize(newSize);
        }));
    
    }
      




function syncDlaCrystalState() {
    if (!dlaState) {
        initializeDla();
        return;
    }
    dlaState.crystal.clear();
    dlaState.emptyIndices = [];

    boardState.forEach((tile, index) => {
        if (tile.k > 0 && !tile.isGold) {
            dlaState.crystal.add(index);
        } else {
dlaState.emptyIndices.push(index);
        }
    });
}


      function gameLoop() {
        if (!isLifePlaying) return;
        const context = { n, currentBoardState: boardState, currentPalette: palette(), gameOfLifeRules, gravitationalSortRules, erosionRules, dlaState, dlaRules, contourRules };
        let nextState;
        let didAdvance = true;
        switch(armedSimulation) {
            case 'gameOfLife': nextState = Simulations.runGameOfLifeGeneration(context); boardState = nextState; break;
case 'brightnessEvo':
    if (brightnessEvoMode === 'contrast') {
        nextState = Simulations.runContrastGeneration(context);
    } else {
        nextState = Simulations.runBrightnessEvolution(context);
    }
    boardState = nextState;
    break;

            case 'gravitationalSort': nextState = Simulations.runGravitationalSortGeneration(context); boardState = nextState; break;
            case 'erosion': nextState = Simulations.runErosionGeneration(context); boardState = nextState; break;
       case 'contour': 
                nextState = Simulations.runContourGeneration(context); 
                boardState = nextState; 
                break;

case 'spiral': 
                nextState = Simulations.runSpiralGeneration({ ...context, spiralRules }); 
                boardState = nextState; 
                break;
case 'magnet': 
    nextState = Simulations.runMagnetGeneration({ ...context, magnetRules }); 
    boardState = nextState; 
    break;

case 'sandpile': 
    nextState = Simulations.generateSandpile(boardState, palette(), chiFlowRules).nextBoardState; 
    boardState = nextState; 
    break;

case 'turing': 
                const turingContext = { n, currentBoardState: boardState, currentPalette: palette(), turingState, turingRules };
                const turingRes = Simulations.runTuringGeneration(turingContext);
                boardState = turingRes.nextBoardState;
                turingState = turingRes.nextTuringState;
                break;

case 'nudgeBrighter':
case 'nudgeDarker': {
    const timing = getNudgeTiming();
    const now = performance.now();
    const due = timing.intervalMs === 0 || now - lastNudgeTime >= timing.intervalMs;
    if (due) {
        applyNudgeLogic(armedSimulation === 'nudgeBrighter' ? 1 : -1);
        lastNudgeTime = now;
    }
    // New logs count shifts. Original unmarked logs counted every animation frame.
    didAdvance = due || timing.legacyFrames === true;
    break;
}



            case 'dla':
const currentDlaRules = { ...dlaRules, colorGenetics: dlaMode === 'genetics' };
const dlaContext = { ...context, dlaRules: currentDlaRules };
const { nextBoardState, nextDlaState } = Simulations.runDlaGeneration(dlaContext);
boardState = nextBoardState;
dlaState = nextDlaState;
break;
            case 'breathe': break; // This loop only handles discrete simulations. Breathe uses animationLoop.

        }
        if (armedSimulation !== 'nudgeBrighter' && armedSimulation !== 'nudgeDarker') {
                        renderToScreen(null);
                    }
            
                    if (didAdvance) currentGenerationCount++; // Count actual Nudge shifts; other simulations are unchanged.
            
                    // --- MACRO INTERCEPTOR: בדיקה אם המאקרו ממתין לדור הזה ---
                    if (isMacroPlaying && currentMacroStep < macroQueue.length) {
                        let nextAction = macroQueue[currentMacroStep];
                        while (nextAction && nextAction.isGenBased && currentGenerationCount >= nextAction.targetGen) {
                            executeMacroAction(nextAction);
                            currentMacroStep++;
                            if (currentMacroStep >= macroQueue.length) {
                                stopMacro();
                                if (isLifePlaying) pauseLife();
                                break;
                            }
                            nextAction = macroQueue[currentMacroStep];
// אם הפעולה הבאה מבוססת זמן (כמו שרטוט מברשת לאחר עצירה), נחזיר את השליטה לטיימר!
                if (nextAction && !nextAction.isGenBased) {
                        // תיקון: מחשבים את חזרת הטיימר ביחס לפעולה שהרגע הסתיימה
                        const completedAction = macroQueue[currentMacroStep - 1];
                        macroStartTime = performance.now() - completedAction.delta;
                        scheduleNextMacroStep();
                    }   


            }
                    }
                    // -----------------------------------------------------------
            
                    if (isLifePlaying) {
                        animationFrameId = requestAnimationFrame(gameLoop);
                    }
                  }


      function stepForward() {
        if (isLifePlaying || armedSimulation === 'breathe') return;
        
        // --- תוספת: תיעוד מורחב ב-Art Logger כולל מצב וחוקים ---
        let simDetails = "No specific rules mapping";
        if (armedSimulation === 'gameOfLife') simDetails = JSON.stringify(getGameOfLifeRecordingRules());
        else if (armedSimulation === 'gravitationalSort') simDetails = JSON.stringify(gravitationalSortRules);
        else if (armedSimulation === 'erosion') simDetails = JSON.stringify(erosionRules);
        else if (armedSimulation === 'dla') simDetails = JSON.stringify({ ...dlaRules, mode: dlaMode });
        else if (armedSimulation === 'contour') simDetails = JSON.stringify(contourRules);
        else if (armedSimulation === 'spiral') simDetails = JSON.stringify(spiralRules);
        else if (armedSimulation === 'magnet') simDetails = JSON.stringify(magnetRules);
        else if (armedSimulation === 'sandpile') simDetails = JSON.stringify(getChiFlowRecordingRules());
        else if (armedSimulation === 'turing') simDetails = JSON.stringify(turingRules);
        else if (armedSimulation === 'nudgeBrighter' || armedSimulation === 'nudgeDarker') simDetails = JSON.stringify(getNudgeTiming());
        else if (armedSimulation === 'brightnessEvo') simDetails = `Mode: ${brightnessEvoMode}`;
        
        window.logArtEvent('STEP FORWARD', `Armed: ${armedSimulation} | Sort: ${currentSortMethod} | Rules: ${simDetails}`);
                // --------------------------------------------------------

        performAction(() => {
      if (armedSimulation === 'dla') {
                syncDlaCrystalState();
            }
      
            const context = { n, currentBoardState: boardState, currentPalette: palette(), gameOfLifeRules, gravitationalSortRules, erosionRules, dlaState, dlaRules, contourRules };
            
            switch(armedSimulation) {
                case 'gameOfLife': 
                    boardState = Simulations.runGameOfLifeGeneration(context); 
                    break;
case 'brightnessEvo': 
    if (brightnessEvoMode === 'contrast') {
        boardState = Simulations.runContrastGeneration(context);
    } else {
        boardState = Simulations.runBrightnessEvolution(context);
    }
    break;

                case 'gravitationalSort': 
                    boardState = Simulations.runGravitationalSortGeneration(context); 
                    break;
                case 'erosion': 
                    boardState = Simulations.runErosionGeneration(context); 
                    break;
            
case 'contour': 
                boardState = Simulations.runContourGeneration(context); 
                break;

case 'spiral': 
                boardState = Simulations.runSpiralGeneration({ ...context, spiralRules }); 
                break;


case 'magnet': 
    boardState = Simulations.runMagnetGeneration({ n, currentBoardState: boardState, currentPalette: palette(), magnetRules }); 
    break;



                case 'sandpile': 
    boardState = Simulations.generateSandpile(boardState, palette(), chiFlowRules).nextBoardState; 
    break;

case 'turing': 
                    const turingStepCtx = { n, currentBoardState: boardState, currentPalette: palette(), turingState, turingRules };
                    const turingStepRes = Simulations.runTuringGeneration(turingStepCtx);
                    boardState = turingStepRes.nextBoardState;
                    turingState = turingStepRes.nextTuringState;
                    break;

case 'nudgeBrighter':
                    applyNudgeLogic(1);
                    break;
case 'nudgeDarker':
                    applyNudgeLogic(-1);
                    break;



            case 'dla':
const currentDlaRules = { ...dlaRules, colorGenetics: dlaMode === 'genetics' };
const dlaContext = { ...context, dlaRules: currentDlaRules };
const { nextBoardState, nextDlaState } = Simulations.runDlaGeneration(dlaContext);
boardState = nextBoardState;
dlaState = nextDlaState;
break;
                // No case for 'breathe' as it has no steps
            }
            renderToScreen(null);
        });
      }
      
function pauseLife() {
          if (!isLifePlaying) return;
          window.logArtEvent('PAUSE', '---');
          isLifePlaying = false;
          cancelAnimationFrame(animationFrameId); // Stops gameLoop
          animationFrameId = null;
          // animationLoop will stop itself on its next frame because isLifePlaying is false

          if (simulationStartState) {
              const simulationEndState = getCurrentState();
              if (!areStatesEqual(simulationStartState, simulationEndState)) {
                  pushHistory({ before: simulationStartState, after: simulationEndState });
              }
              simulationStartState = null; // Reset for the next session
          }

          dom.iconPlay.style.display = 'block';
          dom.iconPause.style.display = 'none';
          if (armedSimulation && armedSimulation !== 'breathe') dom.btnStepForward.disabled = false;
          
          // מחזירים לפעולה את כל כפתורי הסימולציה
          const simButtons = [
              dom.btnGameOfLife, dom.btnBrightnessEvo, dom.btnShowBreatheMenu, 
              dom.btnGravitationalSort, dom.btnErosion, dom.btnDla, 
              dom.btnContour, dom.btnSandpile, dom.btnTuring, 
              dom.btnSpiral, dom.btnMagnetModes, dom.btnNudgeBrighter, dom.btnNudgeDarker
          ].filter(Boolean);
          
          simButtons.forEach(btn => btn.disabled = false);
      }



      
      function togglePlayPauseLife() {
//        if (isMacroPlaying) return; // לא מאפשרים לגעת בסימולציות כשהמאקרו רץ

        if (isLifePlaying) {
            pauseLife();
            return;
        }
        if (!armedSimulation) return;

        // --- Art Logger: Snapshoting Simulation State ---
        let simDetails = "No specific rules mapping";
        if (armedSimulation === 'gameOfLife') simDetails = JSON.stringify(getGameOfLifeRecordingRules());
        else if (armedSimulation === 'gravitationalSort') simDetails = JSON.stringify(gravitationalSortRules);
        else if (armedSimulation === 'erosion') simDetails = JSON.stringify(erosionRules);
        else if (armedSimulation === 'dla') simDetails = JSON.stringify({ ...dlaRules, mode: dlaMode });
        else if (armedSimulation === 'contour') simDetails = JSON.stringify(contourRules);
        else if (armedSimulation === 'spiral') simDetails = JSON.stringify(spiralRules);
        else if (armedSimulation === 'magnet') simDetails = JSON.stringify(magnetRules);
        else if (armedSimulation === 'sandpile') simDetails = JSON.stringify(getChiFlowRecordingRules());
        else if (armedSimulation === 'turing') simDetails = JSON.stringify(turingRules);
        else if (armedSimulation === 'nudgeBrighter' || armedSimulation === 'nudgeDarker') simDetails = JSON.stringify(getNudgeTiming());
        else if (armedSimulation === 'brightnessEvo') simDetails = `Mode: ${brightnessEvoMode}`;
        else if (armedSimulation === 'breathe') simDetails = `Mode: ${breatheEvoMode}`;
        
        window.logArtEvent('PLAY', `Armed: ${armedSimulation} | Sort: ${currentSortMethod} | Rules: ${simDetails}`);        // ------------------------------------------------

        // רשימת כל כפתורי הסימולציה

       
          const simButtons = [
              dom.btnGameOfLife, dom.btnBrightnessEvo, dom.btnShowBreatheMenu, 
              dom.btnGravitationalSort, dom.btnErosion, dom.btnDla, 
              dom.btnContour, dom.btnSandpile, dom.btnTuring, 
              dom.btnSpiral, dom.btnMagnetModes, dom.btnNudgeBrighter, dom.btnNudgeDarker
          ].filter(Boolean);

          // --- Handle Breathe Simulation (uses animationLoop) ---
          if (armedSimulation === 'breathe') {
              const BREATHE_SPEED = 0.0015;
              const cycleDuration = (2 * Math.PI) / BREATHE_SPEED;            
              boardState.forEach(tile => {
                  tile.startDelay = Math.random() * cycleDuration; 
              });

              breatheStartTime = performance.now();
              isLifePlaying = true;
              
              dom.iconPlay.style.display = 'none';
              dom.iconPause.style.display = 'block';
              dom.btnStepForward.disabled = true;
              
              // מכבים את כל הכפתורים למעט הכפתור של הנשימה
              simButtons.forEach(btn => {
                  if (btn.id !== 'btnShowBreatheMenu') {
                      btn.disabled = true;
                  }
              });

              startAnimationLoop(); // Start the smooth animation loop
              return; // Exit here, don't start gameLoop
          }

          // --- Handle Discrete Simulations (uses gameLoop) ---
          currentGenerationCount = 0; // איפוס מונה הדורות בכל פעם שלוחצים Play
          if ((armedSimulation === 'nudgeBrighter' || armedSimulation === 'nudgeDarker') && !getNudgeTiming().legacyFrames) {
              lastNudgeTime = -Infinity; // The first shift is immediate on each new run.
          }
          if (armedSimulation === 'dla') {
              syncDlaCrystalState();
          }

          simulationStartState = getCurrentState();

          isLifePlaying = true;
          dom.iconPlay.style.display = 'none';
          dom.iconPause.style.display = 'block';
          dom.btnStepForward.disabled = true;
          
          // מכבים את כל הכפתורים למעט הכפתור של הסימולציה הפעילה!
          simButtons.forEach(btn => {
              if (!btn.id.toLowerCase().includes(armedSimulation.toLowerCase())) {
                  btn.disabled = true;
              }
          });

          // Install queued generation-one commands before the macro's first frame.
          if (isExecutingMacroCommand && (armedSimulation === 'gameOfLife' || armedSimulation === 'sandpile')) {
              animationFrameId = requestAnimationFrame(gameLoop);
          } else {
              gameLoop();
          }
      }

      
      function getRandomGridPosition(n) {
        return { y: Math.floor(Math.random() * n), x: Math.floor(Math.random() * n) };
      }
      
      function getRandomEdgePosition(n) {
          const side = Math.floor(Math.random() * 4);
          let x, y;
          switch (side) {
              case 0: x = Math.floor(Math.random() * n); y = 0; break;
              case 1: x = n - 1; y = Math.floor(Math.random() * n); break;
              case 2: x = Math.floor(Math.random() * n); y = n - 1; break;
              case 3: x = 0; y = Math.floor(Math.random() * n); break;
          }
          return { x, y };
      }
      

function initializeDla() {
        const initialCrystal = new Set();
        boardState.forEach((tile, index) => {
            if (tile.k > 0 && !tile.isGold) {
                initialCrystal.add(index);
            }
        });

        if (initialCrystal.size === 0) {
            const centerIndex = Math.floor((n * n) / 2);
            initialCrystal.add(centerIndex);
            const seedColorIndex = Math.floor(palette().length / 2);
            boardState[centerIndex].k = seedColorIndex;
            boardState[centerIndex].v = seedColorIndex;
            boardState[centerIndex].isGold = false;
        }

        // --- START: NEW EFFICIENT LOGIC ---
        // 1. Create a list of all empty indices by checking which ones are NOT in the crystal
        const emptyIndices = [];
        for (let i = 0; i < n * n; i++) {
            if (!initialCrystal.has(i)) {
                emptyIndices.push(i);
            }
        }

// Calculate walker count using a direct, pre-calibrated formula.
        let calculatedWalkers = Math.round(1.2 * n * Math.sqrt(n));

        // IMPORTANT: Ensure we don't create more walkers than there are empty spaces.
        const walkerCount = Math.min(calculatedWalkers, emptyIndices.length);


        const initialWalkers = [];
        for (let i = 0; i < walkerCount; i++) {
            if (emptyIndices.length === 0) break; // Stop if no empty space is left

            // 2. Pick a random starting position ONLY from the list of empty spots
            const randomIndexInEmptyList = Math.floor(Math.random() * emptyIndices.length);
            const boardIndex = emptyIndices[randomIndexInEmptyList];
            
            // Convert board index to {x, y} coordinates
            const y = Math.floor(boardIndex / n);
            const x = boardIndex % n;
            initialWalkers.push({ y, x });
        }
        
        // 3. Store the list of empty indices in the simulation state
        dlaState = { crystal: initialCrystal, walkers: initialWalkers, emptyIndices: emptyIndices, isInitialized: true, isFinished: false, lastWalkerIndex: 0 };
        // --- END: NEW EFFICIENT LOGIC ---
        
        renderToScreen(null);
      }




function armSimulation(simulationName) {
    if (isLifePlaying) return;

    // --- MACRO KILL SWITCH ---
    // אם לחצו על כפתור סימולציה באופן ידני (ולא מתוך פקודת מאקרו), אנחנו משמידים את המאקרו הטעון
    if (isMacroLoaded && !isExecutingMacroCommand) {
        stopMacro();
    }
    // -------------------------

    const currentlyArmed = armedSimulation;
    const isTogglingOff = currentlyArmed === simulationName;

    // --- RESET ALL STATES ---
    // כאן אנחנו מאפסים את הזיכרון של כל הכפתורים המחזוריים לפני שנדליק משהו חדש
    armedSimulation = null;
    brightnessEvoMode = 'off';
    dlaMode = 'off';
    breatheEvoMode = 'off';
    turingState = null;
    gsMode = 'off'; // איפוס הגרביטציה
    spiralMode = 'off'; // איפוס הספירלה (התיקון לבאג)
magnetMode = 'off';
if (typeof updateMagnetButtonUI === 'function') updateMagnetButtonUI();

const simButtons = [dom.btnGameOfLife, dom.btnBrightnessEvo, dom.btnShowBreatheMenu, dom.btnGravitationalSort, dom.btnErosion, dom.btnDla, dom.btnContour, dom.btnSandpile, dom.btnTuring, dom.btnSpiral, dom.btnMagnetModes, dom.btnNudgeBrighter, dom.btnNudgeDarker].filter(Boolean);

    simButtons.forEach(btn => btn.classList.remove('simulation-active'));
    
    // כיבוי ויזואלי של כל הכפתורים
    updateBrightnessEvoButtonUI();
    updateDlaButtonUI();
    updateErosionButtonUI();
    updateBreatheEvoButtonUI();
    if (typeof updateGravitationalSortButtonUI === 'function') updateGravitationalSortButtonUI();
    if (typeof updateSpiralButtonUI === 'function') updateSpiralButtonUI();
    
    dom.btnPlayPauseLife.disabled = true;
    dom.btnStepForward.disabled = true;
    // --- END RESET ---


if (dom.btnSimSettings) dom.btnSimSettings.classList.add('hide-settings');

// אם אנחנו מדליקים סימולציה (ולא רק מכבים אותה)
if (!isTogglingOff && simulationName !== null) {
    armedSimulation = simulationName;

        // === MINIMAL FIX: איפוס caches של מגנט אחרי כל החלפה של סימולציה ===
        if (typeof Simulations.resetMagnetCaches === 'function') {
            Simulations.resetMagnetCaches();
        }

    // === MINIMAL FIX: איפוס cache של Gravitational Sort בלבד ===
    if (typeof Simulations !== 'undefined' && typeof Simulations.resetGravitationalSortCaches === 'function') {
        Simulations.resetGravitationalSortCaches();
    }



        // הגדרת דיפולט (ברירת מחדל) לכפתורים מחזוריים כשהם נדלקים
        if (simulationName === 'sandpile') {
            chiFlowMode = 'personal';
            chiFlowRules = cloneChiFlowRules(chiFlowCycle[0]);
        }
        if (simulationName === 'gameOfLife') {
            gameOfLifeMode = 'personal';
            gameOfLifeRules = cloneGameOfLifeRules(gameOfLifeCycle[0]);
        }
        if (simulationName === 'brightnessEvo') {
            brightnessEvoMode = 'brightness';
        }
        if (simulationName === 'dla') {
            dlaMode = 'genetics';
            initializeDla();
        }
        if (simulationName === 'breathe') {
            breatheEvoMode = 'solo';
        }
        if (simulationName === 'gravitationalSort') {
            gsMode = 'up';
            if (typeof gravitationalSortRules !== 'undefined') gravitationalSortRules.direction = 'up';
        }

if (simulationName === 'spiral') {
    spiralMode = 'b';
    if (typeof spiralRules !== 'undefined') spiralRules.method = 'b';
}


if (simulationName === 'magnet') {
    magnetMode = 'cosmic_magnet';
    if (typeof magnetRules !== 'undefined') magnetRules.method = 'cosmic_magnet';
}


        // צביעת הכפתור הנבחר במסגרת פעילה (זהב)
        const buttonToActivate = simButtons.find(btn => btn.id.toLowerCase().includes(simulationName.toLowerCase()));
        if (buttonToActivate) {
            buttonToActivate.classList.add('simulation-active');
        }
        
        // הדלקה ויזואלית של האייקונים בכפתורים המחזוריים
        updateBrightnessEvoButtonUI();
        updateDlaButtonUI();
        updateErosionButtonUI();
        updateBreatheEvoButtonUI();
        if (typeof updateGravitationalSortButtonUI === 'function') updateGravitationalSortButtonUI();
        if (typeof updateSpiralButtonUI === 'function') updateSpiralButtonUI();

        dom.btnPlayPauseLife.disabled = false;
        dom.btnStepForward.disabled = false;


// מניעת כפתור 'צעד קדימה' בנשימה (שעובדת על אנימציה רציפה)
        if (simulationName === 'breathe') {
            dom.btnStepForward.disabled = true;
        }

        // בדיקה: האם לסימולציה שנבחרה יש חלון הגדרות?
        const simsWithSettings = ['gameOfLife', 'gravitationalSort', 'contour', 'spiral', 'sandpile', 'turing', 'magnet', 'nudgeBrighter', 'nudgeDarker'];
        if (dom.btnSimSettings && simsWithSettings.includes(simulationName)) {
            dom.btnSimSettings.classList.remove('hide-settings');
        }
    
    }
    updateGameOfLifeButtonUI();
    updateChiFlowButtonUI();
}

      
      function setBrushMode(isBrushOn, continuous = false) {
          isBrushModeOn = isBrushOn;
          isContinuousBrushOn = isBrushOn && continuous;
          dom.btnBrushMode.classList.toggle('brush-on', isBrushOn && !isContinuousBrushOn);
          dom.btnBrushMode.classList.toggle('brush-continuous', isContinuousBrushOn);
          const newTitle = getBrushModeTitle();
          dom.btnBrushMode.title = newTitle;
          dom.btnBrushMode.setAttribute('aria-label', newTitle);
          if (pointerState.dragSourceIndex !== null) pointerState.dragSourceIndex = null;
          pointerState.lineAnchorIndex = -1;
          pointerState.lineRestartPending = pointerState.id !== null;
      }

      function getBrushModeTitle() {
          return getText(isContinuousBrushOn ? 'brushMode_continuous' : isBrushModeOn ? 'brushMode_paint' : 'brushMode_copy');
      }
      
      function toggleBrushMode() {
          if (!isBrushModeOn) setBrushMode(true);
          else if (!isContinuousBrushOn) setBrushMode(true, true);
          else setBrushMode(false);
      }

      function openSaveModalWithPreview() {
        dom.btnSave.disabled = true;
        canvas.toBlob((blob) => {
            if (!blob) { 
                dom.btnSave.disabled = false; 
                return; 
            }
            modals.clearSaveStatus();
            dom.imagePreview.src = URL.createObjectURL(blob);
            dom.fileNameInput.value = C.PALETTES[activePaletteIndex]?.name || getText('saveModal_defaultFilename');
            dom.saveModal.classList.add('modal-visible');
            dom.btnSave.disabled = false;
        }, 'image/png');
      }

      function getSanitizedFileName(extension) {
        let defaultName = C.PALETTES[activePaletteIndex]?.originalName === 'Default' ? getText('saveModal_defaultFilename') : C.PALETTES[activePaletteIndex]?.name;
        let fileName = dom.fileNameInput.value.trim() || defaultName || 'Creation';
        return fileName.replace(/[<>:"/\\|?*]/g, '_') + `.${extension}`;
      }




// "כלי עזר" קטן שמבצע את ההורדה הישירה למחשב
      function triggerDownload(file) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(file);
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      }

      // הפונקציה הראשית החדשה שמחליפה את הקודמת
      async function shareOrDownloadImage() {
        const originalButtonText = dom.btnSaveImage.innerHTML;
        dom.btnSaveImage.innerHTML = `
            <svg class="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        `;
        dom.btnSaveImage.disabled = true;
        
        // שלב א': יצירת התמונה באיכות גבוהה (נשאר ללא שינוי)
        const exportSize = 4096;
        const borderSize = Math.round(exportSize * 0.01); 
        const drawingAreaSize = exportSize - (borderSize * 2);

        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = exportSize;
        offscreenCanvas.height = exportSize;
        const offscreenCtx = offscreenCanvas.getContext('2d');
        
        await new Promise(resolve => setTimeout(() => {
            offscreenCtx.fillStyle = '#000000';
            offscreenCtx.fillRect(0, 0, exportSize, exportSize);
            offscreenCtx.save();
            offscreenCtx.translate(borderSize, borderSize);
            renderBoard(offscreenCtx, drawingAreaSize, drawingAreaSize, null);
            offscreenCtx.restore();
            resolve();
        }, 50));
        
        const blob = await new Promise(resolve => offscreenCanvas.toBlob(resolve, 'image/png'));
        
        if (!blob) {
            alert("Error creating high-quality image.");
            dom.btnSaveImage.innerHTML = originalButtonText;
            dom.btnSaveImage.disabled = false;
            return;
        }

        const fileName = getSanitizedFileName('png');
        const imageFile = new File([blob], fileName, { type: 'image/png' });
        const shareData = {
            files: [imageFile],
            title: fileName.replace('.png', ''),
            text: 'נוצר באמצעות האפליקציה',
        };

        // שלב ב': בדיקה אם המכשיר תומך בשיתוף
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            // אם כן (מובייל) - פותחים את תפריט השיתוף
            try {
                await navigator.share(shareData);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Share API error:', err);
                    triggerDownload(imageFile); // אם השיתוף נכשל, נבצע הורדה רגילה
                }
            }
        } else {
            // אם לא (דסקטופ) - מבצעים הורדה ישירה
            triggerDownload(imageFile);
        }
        
        dom.btnSaveImage.innerHTML = originalButtonText;
        dom.btnSaveImage.disabled = false;
        modals.closeModal();
      }


      
      async function handleSaveProject() {
          const stateString = JSON.stringify(getCurrentState(), null, 2);
          const blob = new Blob([stateString], { type: 'application/json' });
          const fileName = getSanitizedFileName('json');
          const projectFile = new File([blob], fileName, { type: 'application/json' });
          const isMobile = navigator.share && navigator.canShare;
          if (isMobile) { try { await navigator.share({ files: [projectFile], title: 'My Idea' }); } catch (err) { if (err.name !== 'AbortError') console.error('Share API error:', err); } } 
          else { const link = document.createElement('a'); link.href = URL.createObjectURL(projectFile); link.download = fileName; link.click(); URL.revokeObjectURL(link.href); }
          modals.closeModal();
      }

      function handleLoadProject() { 
        modals.closeModal(); 
        setTimeout(() => { dom.projectFileInput.click(); }, 50); 
    }  
    
    // --- פונקציה לעדכון התצוגה של כפתור הפלטה למאקרו ---
function updateMacroPaletteButtonUI(paletteIndex) {
    if (!dom.btnChangeInitPalette) return;
    
    const pal = C.PALETTES[paletteIndex];
    if (!pal) return;

    let iconHtml = pal.iconHTML ? pal.iconHTML : pal.emoji;
    
    // מוודאים שהאייקון (במידה וזה SVG) יותאם לגודל קטן של כפתור
    const styleFix = `<style>.macro-palette-btn svg { width: 14px !important; height: 14px !important; }</style>`;
    
    dom.btnChangeInitPalette.innerHTML = `
        ${styleFix}
        <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span style="display: flex; align-items: center; justify-content: center; font-size: 14px;">
                ${iconHtml}
            </span>
            <span>${pal.name}</span>
        </div>
    `;
}


      function onProjectFileSelected(event) {
        const file = event.target.files[0]; if (!file) return;


        // -- ניתוב חכם: טיפול בקבצי מאקרו (.txt) --
    if (file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            try {
                macroQueue = parseMacroText(text);
            } catch (error) {
                console.error('Failed to parse macro history:', error);
                alert('Invalid macro file format.');
                return;
            }
            
     

            if (macroQueue.length > 0) {
                isMacroLoaded = true;
                currentMacroStep = 0;
                pendingMacroPalette = null; // איפוס בחירה קודמת בטעינת קובץ חדש
                isSelectingMacroPalette = false;
                

                // --- תוספת: איתור הפלטה הראשונית של המאקרו ועדכון הכפתור ---
                const initAction = macroQueue.find(a => a.eventName === 'INIT_STATE');
                if (initAction) {
                    try {
                        const initState = JSON.parse(initAction.details);
                        updateMacroPaletteButtonUI(initState.pal);
                    } catch(e) { console.error("Could not parse INIT_STATE for palette button", e); }
                }
                // -------------------------------------------------------------

                // עצירת סימולציה קיימת והדלקת המאקרו מיד
                if (isLifePlaying) pauseLife();
                dom.macroOverlay.classList.add('active'); // מציג את הרקע הכהה ואת הכפתור
                dom.macroOverlay.classList.remove('running'); // מוודא שהכפתור שלנו גלוי
                dom.boardOverlay.style.opacity = '0.9'; // מחשיך את הגריד ל-90%

            } else {
                
                alert("Invalid macro file format.");
            }
        };
        reader.readAsText(file);
        event.target.value = null;
        return;
    }


    // -- טיפול בקבצי מצב רגילים (.json) --
        const reader = new FileReader();
        reader.onload = function(e) {
          try {
            const state = JSON.parse(e.target.result);
            if (state.n && state.tiles && typeof state.activePaletteIndex !== 'undefined') { animateBoardTransition(() => { applyState(state); history = []; future = []; updateUndoRedoButtons(); }); } 
            else { alert(getText('error_invalidFile')); }
          } catch (error) { console.error("Failed to load or parse project file:", error); alert(getText('error_readFile')); }
        };
        reader.readAsText(file);
        event.target.value = null;
      }
      
      function hideLongPressDisplay() {
          clearTimeout(longPressTimer);
          clearTimeout(technicianHoldTimer);
          simulationHoldBounds = null;
          dom.btnToggleSimMode.classList.remove('technician-hold');
          dom.longPressOverlay.classList.remove('visible');
          dom.longPressDisplay.classList.remove('visible');
          setTimeout(() => { dom.longPressDisplay.innerHTML = ''; }, 250);
      }
      
      function prepareBoardForSimMode() {
        animateBoardTransition(() => {
            performAction(() => {
                if (n !== simulationInitSettings.boardSize) _performResize(simulationInitSettings.boardSize);
                separatorPx = 0; 
                applySeparator();
                goDark();
                const currentPalette = palette();
                const lightestIndex = currentPalette.length - 1;
                selectedColor = currentPalette[lightestIndex];
                selectedColorIndex = lightestIndex;

                brushSize = simulationInitSettings.brushSize;
                const brushSizeSlider = document.getElementById('brushSizeSlider');
                const brushSizeValue = document.getElementById('brushSizeValue');
                if (brushSizeSlider) brushSizeSlider.value = brushSize;
                if (brushSizeValue) brushSizeValue.textContent = brushSize;



                isRainbowModeActive = false;
                symmetryMode = 'kaleidoscope';
                updateSymmetryUI();
                updateColorPickerButtonUI();
                updateGlowEffect();

                // === תוספת שלנו: יצירת תמונת מצב מעודכנת למאקרו לאחר הכניסה לסימולציה ===
                artRecipeLog = [];
                historyRecipeCursor = 0;
                const simState = {
                    recipeVersion: 2,
                    n: n,
                    pal: activePaletteIndex,
                    sort: currentSortMethod,
                    sep: separatorPx,
                    board: compressBoardState()
                };
                window.logArtEvent('INIT_STATE', JSON.stringify(simState));
                // =========================================================================
            });
        });
      }


function handlePointerDownCtrl(e) {
        if (isBreathing) return;
        clearTimeout(longPressTimer);
        clearTimeout(technicianHoldTimer);
        dom.btnToggleSimMode.classList.remove('technician-hold');
        const btn = e.currentTarget;
        if (btn === dom.btnSave || btn === dom.btnPlayPauseLife) return;
        if (btn.id === 'btnToggleSimMode') {
            // The button moves when simulation controls appear. Keep the hold
            // tied to its original hit area until release or a deliberate drag.
            simulationHoldBounds = btn.getBoundingClientRect();
            btn.setPointerCapture(e.pointerId);
        }
        longPressTimer = setTimeout(() => {
            wasLongPress = true;

            if (btn.id === 'btnInvert') { modals.openAdvancedColorMappingModal(); return; }
            if (btn.id === 'btnRandom') { performAction(shuffleExistingColors); return; }
            if (btn.id === 'btnToggleSimMode') {
                if (!isSimModeActive) toggleSimMode();
                prepareBoardForSimMode();
                btn.classList.add('technician-hold');
                technicianHoldTimer = setTimeout(() => {
                    btn.classList.remove('technician-hold');
                    modals.openTechnicianMenu(btn);
                }, C.LONG_PRESS_SHOW_MS * 2);
                return;
            }


            if (btn.id === 'btnResizeUp' || btn.id === 'btnResizeDown') { modals.openResizeModal(); return; }
        }, C.LONG_PRESS_SHOW_MS);
      }


      
      function handleCtrlClick(e, actionFn) {
        if (isBreathing && e.currentTarget.id !== 'btnPlayPauseLife') return;
        if (wasLongPress) { wasLongPress = false; return; }
        actionFn();
      }

function handleColorPickerClick() {
        // אם היינו במצב קשת, נבטל אותו ונתחיל מהצבע הראשון
        if (isRainbowModeActive) {
            isRainbowModeActive = false;
            selectedColorIndex = -1;
        }

        const p = palette();
        // חישוב האינדקס הבא (כולל חזרה להתחלה כשהרשימה נגמרת)
const nextIndex = (selectedColorIndex - 1 + p.length) % p.length;
        
        selectedColorIndex = nextIndex;
        selectedColor = p[nextIndex];
        
        updateGlowEffect();
        updateColorPickerButtonUI();
      }      
      function setTextContent() {
        dom.splashText.textContent = getText('splashTitle');
        dom.fileNameLabel.textContent = getText('saveModal_feelsLike');
        dom.fileNameInput.placeholder = getText('saveModal_defaultFilename');
        dom.btnModalClose.title = getText('saveModal_close');
        dom.btnSaveImage.title = getText('saveModal_saveImage');
        dom.btnSaveProjectIdea.title = getText('saveModal_saveIdea');
        dom.btnLoadProjectIdea.title = getText('saveModal_loadIdea');
        for (const [button, key] of [[dom.btnResetLogger, 'saveModal_resetLogger'], [dom.btnSaveLogger, 'saveModal_saveLogger']]) {
            button.title = getText(key);
            button.setAttribute('aria-label', getText(key));
        }
        dom.resizeModalTitle.textContent = getText('resizeModal_title');
        dom.resizeModalPrompt.textContent = getText('resizeModal_prompt');
        dom.btnConfirmResize.textContent = getText('resizeModal_confirm');
        dom.helpModalTitle.textContent = getText('help_title');
        document.querySelectorAll('[data-debug-text]').forEach(element => {
            element.textContent = getText(element.dataset.debugText);
        });
        document.querySelectorAll('#sortCycleOptions option[data-position]').forEach(option => {
            option.textContent = `${getText('sort_position')} ${option.dataset.position}`;
        });
        dom.technicianDialog.dir = getCurrentLang() === 'he' ? 'rtl' : 'ltr';
        document.getElementById('sortCycleDialog').dir = getCurrentLang() === 'he' ? 'rtl' : 'ltr';
        dom.paletteModalTitle.textContent = getText('paletteModal_title');
        dom.helpIntroText.textContent = getText('help_intro');
        document.getElementById('helpTabs').setAttribute('aria-label', getText('help_topics'));
        dom.gsSettingsTitle.textContent = getText('gs_modal_title');
        dom.btnGsSettingsCancel.textContent = getText('gs_modal_cancel');
        dom.btnGsSettingsSave.textContent = getText('gs_modal_save_close');
        dom.btnInvert.title = getText('tooltip_invert'); 
        dom.btnRandom.title = getText('tooltip_random');
        dom.btnColorPicker.title = getText('tooltip_colorPicker'); 
        dom.btnCycleSort.title = getText('tooltip_sort_cycle');
        dom.btnSymmetry.title = getText('tooltip_symmetry');
        dom.btnRedo.title = getText('tooltip_redo'); 
        dom.btnUndo.title = getText('tooltip_undo');
        dom.btnDark.title = getText('tooltip_dark'); 
        dom.btnSpecialReset.title = getText('tooltip_specialReset');
        dom.btnResetBoard.title = getText('tooltip_resetBoard'); 
        dom.btnResizeUp.title = getText('tooltip_resizeUp');
        dom.btnResizeDown.title = getText('tooltip_resizeDown'); 
        dom.btnSave.title = getText('tooltip_save');
        dom.btnShowBreatheMenu.title = getText('tooltip_breathe'); 
        dom.btnTutorial.title = getText('tooltip_tutorial');
        updateGameOfLifeButtonUI();
        updateChiFlowButtonUI();
        dom.btnBrightnessEvo.title = getText('tooltip_brightnessEvo');
        dom.btnGravitationalSort.title = getText('tooltip_gravitationalSort'); 
        updateErosionButtonUI();
        dom.btnDla.title = getText('tooltip_dla'); 
        dom.btnContour.title = getText('tooltip_contour');
dom.btnSpiral.title = getText('tooltip_spiral');
dom.btnTuring.title = getText('tooltip_turing');
dom.btnLangToggle.textContent = getCurrentLang().toUpperCase();
        dom.btnBrushMode.title = getBrushModeTitle();

        document.querySelectorAll('.ctrl').forEach(btn => { 
            if (btn.title) btn.setAttribute('aria-label', btn.title);
        });

        document.querySelector('[data-method="black_hole"] span').textContent = getText('spiral_black_hole');
        updateSpiralButtonUI();
      }

      function updateAllUIText() {
        C.PALETTES.forEach(p => {
            if (!p.originalName) p.originalName = p.name; 
            const key = Object.keys(translations).find(k => translations[k].en === p.originalName);
            p.name = key ? getText(key) : p.originalName;
        });
        const helpModalInnerContainer = document.getElementById('helpModalInnerContainer');
        if (helpModalInnerContainer) {
            if (getCurrentLang() === 'he') {
                helpModalInnerContainer.classList.add('rtl-mode');
            } else {
                helpModalInnerContainer.classList.remove('rtl-mode');
            }
        }
        setTextContent();
        updatePaletteHeader();
        if (dom.helpModal.classList.contains('modal-visible')) {
            modals.populateHelpModal();
        }
        if (dom.paletteModal.classList.contains('modal-visible')) {
            modals.populatePaletteModal();
        }
      }

      function toggleLanguage() {
        const availableLangs = getAvailableLangs();
        const currentLang = getCurrentLang();
        const currentIndex = availableLangs.indexOf(currentLang);
        const nextIndex = (currentIndex + 1) % availableLangs.length;
        setCurrentLang(availableLangs[nextIndex]);
      }
      
      function toggleSimMode() {
        const duration = 500;
        dom.controlsContainer.style.opacity = '0';
        setTimeout(() => {
            isSimModeActive = !isSimModeActive;
            dom.controlsContainer.classList.toggle('sim-mode-active', isSimModeActive);
            if (isSimModeActive) {
                pauseLife();
                resetArmedState();
            } else {
                pauseLife();
                resetArmedState();
            }
            

const controlsToHide = [ dom.btnBrushMode, dom.btnGap, dom.btnResetBoard, dom.btnTutorial, dom.btnSpecialReset ];
            controlsToHide.forEach(btn => btn.classList.toggle('control-hidden', isSimModeActive));

            dom.btnPlayPauseLife.classList.toggle('control-hidden', !isSimModeActive);
            dom.btnToggleSimMode.classList.toggle('active', isSimModeActive);
            dom.controlsContainer.style.opacity = '1';
        }, duration);
      }
      
      function resetArmedState() {
        armedSimulation = null;
        dlaState = null;
turingState = null;
if (dom.btnSimSettings) dom.btnSimSettings.classList.add('hide-settings');

const simButtons = [dom.btnGameOfLife, dom.btnBrightnessEvo, dom.btnShowBreatheMenu, dom.btnGravitationalSort, dom.btnErosion, dom.btnDla, dom.btnContour, dom.btnSandpile, dom.btnTuring, dom.btnSpiral, dom.btnMagnetModes, dom.btnNudgeBrighter, dom.btnNudgeDarker].filter(Boolean);


        simButtons.forEach(btn => btn.classList.remove('simulation-active'));
        dom.btnPlayPauseLife.disabled = true;
        dom.btnStepForward.disabled = true;
    brightnessEvoMode = 'off';
    updateBrightnessEvoButtonUI();
 updateDlaButtonUI();
   dlaMode = 'off';
    updateDlaButtonUI();
    updateErosionButtonUI();
    breatheEvoMode = 'off';
    updateBreatheEvoButtonUI();
spiralMode = 'off';
    updateSpiralButtonUI();
magnetMode = 'off';
    if (typeof updateMagnetButtonUI === 'function') updateMagnetButtonUI();

gsMode = 'off';
    updateGravitationalSortButtonUI();

      }

      function resetWasLongPress() {
        wasLongPress = false;
      }

      function getTileIndexFromCoords(x, y) {
        if (!canvas) return -1;
        const rect = canvas.getBoundingClientRect();
        const canvasX = x - rect.left;
        const canvasY = y - rect.top;
        const totalGapSize = (n - 1) * separatorPx;
        const tileSize = (canvas.clientWidth - totalGapSize) / n;
        const effectiveTileSize = tileSize + separatorPx;
        const col = Math.floor(canvasX / effectiveTileSize);
        const row = Math.floor(canvasY / effectiveTileSize);
        const xInTile = canvasX % effectiveTileSize;
        const yInTile = canvasY % effectiveTileSize;
        if (xInTile > tileSize || yInTile > tileSize) return -1; 
        if (row >= 0 && row < n && col >= 0 && col < n) return row * n + col;
        return -1;
      }
      

function applyActionToTiles(indices, actionFn) {
        let changed = false;
        const now = performance.now();
        indices.forEach(idx => {
            if (boardState[idx]) {
                const oldK = boardState[idx].k;
                const oldGold = boardState[idx].isGold;
                
                actionFn(boardState[idx]); // The modification happens here

                // --- START: BUG FIX ---
                // If the action function changed the color index (k),
                // we must also update the float value (v) to match it.
                if (boardState[idx].k !== oldK) {
                    boardState[idx].v = boardState[idx].k;
                }
                // --- END: BUG FIX ---

                if (boardState[idx].k !== oldK || boardState[idx].isGold !== oldGold) {
                    boardState[idx].prevK = oldK;
                    boardState[idx].animStart = now;
                    changed = true; 
                }
            }
        });
        if (changed) startAnimationLoop();
      }

function handleDragPaint(targetIndex) {
    if (targetIndex === -1 || targetIndex === pointerState.lastPaintedIndex) return;
    pointerState.lastPaintedIndex = targetIndex;

    const baseTiles = getTilesInRadius(targetIndex, brushSize);
    const finalTiles = new Set();
    baseTiles.forEach(baseIndex => {
        getSymmetricIndices(baseIndex).forEach(symIndex => finalTiles.add(symIndex));
    });

    const targetIndices = Array.from(finalTiles);

    if (isRainbowModeActive) {
        applyActionToTiles(targetIndices, tile => {
            tile.isGold = false;
            tile.k = Math.floor(Math.random() * paletteLen());
        });
    } else if (selectedColorIndex !== -1) {
        applyActionToTiles(targetIndices, tile => {
            tile.isGold = false;
            tile.k = selectedColorIndex;
        });
    } else if (pointerState.dragSourceIndex !== null) {
        const sourceK = boardState[pointerState.dragSourceIndex].k;
        applyActionToTiles(targetIndices, tile => {
            tile.isGold = false;
            tile.k = sourceK;
        });
    }
}

// Stream a Bresenham segment to the existing brush; the shared endpoint is skipped.
function paintBrushLine(fromIndex, toIndex) {
    let x = fromIndex % n;
    let y = Math.floor(fromIndex / n);
    const targetX = toIndex % n;
    const targetY = Math.floor(toIndex / n);
    const dx = Math.abs(targetX - x);
    const dy = -Math.abs(targetY - y);
    const stepX = x < targetX ? 1 : -1;
    const stepY = y < targetY ? 1 : -1;
    let error = dx + dy;
    while (x !== targetX || y !== targetY) {
        const twiceError = 2 * error;
        if (twiceError >= dy) { error += dy; x += stepX; }
        if (twiceError <= dx) { error += dx; y += stepY; }
        handleDragPaint(y * n + x);
    }
}

function handleContinuousDrag(targetIndex, e) {
    if (targetIndex === -1) {
        const rect = canvas.getBoundingClientRect();
        // Separators inside the canvas do not break a line; leaving the canvas does.
        if (e.clientX < rect.left || e.clientX >= rect.right || e.clientY < rect.top || e.clientY >= rect.bottom) {
            pointerState.lineAnchorIndex = -1;
        }
        return;
    }
    if (pointerState.lineAnchorIndex === -1) {
        if (selectedColorIndex === -1 && pointerState.dragSourceIndex === null) pointerState.dragSourceIndex = targetIndex;
        handleDragPaint(targetIndex);
    } else {
        paintBrushLine(pointerState.lineAnchorIndex, targetIndex);
    }
    pointerState.lineAnchorIndex = targetIndex;
    pointerState.lineRestartPending = false;
}

const pointerState = { id: null, downIndex: -1, downX: 0, downY: 0, longPressTimer: null, suppressClick: false, isDragging: false, dragSourceIndex: null, lastPaintedIndex: -1, lineAnchorIndex: -1, lineRestartPending: false, beforeState: null };

function onPointerDown(e) {

    if (isMacroPlaying) {
        animateBoardTransition(() => {
            toggleMacroFullScreen();
        });
        return;
    }
    // -----------------------------------------------------------
    
    if (isLifePlaying || isBreathing) return;

    
    const index = getTileIndexFromCoords(e.clientX, e.clientY);
    if (index === -1) return;
    e.target.setPointerCapture(e.pointerId);
    Object.assign(pointerState, { id: e.pointerId, downIndex: index, downX: e.clientX, downY: e.clientY, suppressClick: false, isDragging: false, dragSourceIndex: null, lastPaintedIndex: -1, lineAnchorIndex: -1, lineRestartPending: false, beforeState: getCurrentState() });
    pointerState.longPressTimer = setTimeout(() => {
        if (pointerState.isDragging) return;
        pointerState.suppressClick = true;
        if (selectedColor || isRainbowModeActive) {
            performAction(resetSelectedColor);
        } else {
            modals.openColorPickerModal(index);
        }
    }, C.LONG_PRESS_SHOW_MS);
    if (!isBrushModeOn) { pointerState.dragSourceIndex = index; }
}

function onPointerMove(e) {
    if (pointerState.id !== e.pointerId) return;
    const currentIndex = getTileIndexFromCoords(e.clientX, e.clientY);
    if (!pointerState.isDragging) {
        const dist = Math.hypot(e.clientX - pointerState.downX, e.clientY - pointerState.downY);
        if (dist >= 8) {
            clearTimeout(pointerState.longPressTimer);
            pointerState.longPressTimer = null;
            pointerState.isDragging = true;
            pointerState.suppressClick = true;
            if (isBrushModeOn && !(isContinuousBrushOn && pointerState.lineRestartPending)) {
                if (selectedColorIndex === -1) { pointerState.dragSourceIndex = pointerState.downIndex; }
                handleDragPaint(pointerState.downIndex);
                if (isContinuousBrushOn) pointerState.lineAnchorIndex = pointerState.downIndex;
            }
        }
    }
    if (pointerState.isDragging && isBrushModeOn) {
        if (isContinuousBrushOn) handleContinuousDrag(currentIndex, e);
        else handleDragPaint(currentIndex);
    }
}

function onPointerUp(e) {
    if (pointerState.id !== e.pointerId) return;
    clearTimeout(pointerState.longPressTimer);
    const upIndex = getTileIndexFromCoords(e.clientX, e.clientY);
    const isCancelled = e.type === 'pointercancel' || e.type === 'lostpointercapture';
    if (isContinuousBrushOn && isCancelled) pointerState.suppressClick = true;
    if (isContinuousBrushOn && !isCancelled && !pointerState.isDragging && !pointerState.suppressClick) {
        // A fast gesture may deliver its first displaced position only at pointerup.
        onPointerMove(e);
    }

    if (pointerState.isDragging) {
        if (isContinuousBrushOn && !isCancelled) handleContinuousDrag(upIndex, e);
        if (!isBrushModeOn && pointerState.dragSourceIndex !== null && upIndex !== -1) {
            const sourceData = { ...boardState[pointerState.dragSourceIndex] };
            const baseTiles = getTilesInRadius(upIndex, brushSize);
            const finalTiles = new Set();
            baseTiles.forEach(baseIndex => {
                getSymmetricIndices(baseIndex).forEach(symIndex => finalTiles.add(symIndex));
            });
            const targetIndices = Array.from(finalTiles);
            applyActionToTiles(targetIndices, tile => {
                tile.k = sourceData.k;
                tile.isGold = sourceData.isGold;
            });
        }
    } else if (!pointerState.suppressClick && upIndex !== -1) {
         const baseTiles = getTilesInRadius(upIndex, brushSize);
         const finalTiles = new Set();
         baseTiles.forEach(baseIndex => {
             getSymmetricIndices(baseIndex).forEach(symIndex => finalTiles.add(symIndex));
         });
         const targetIndices = Array.from(finalTiles);

        if (isRainbowModeActive) {
            applyActionToTiles(targetIndices, tile => {
                tile.isGold = false;
                tile.k = Math.floor(Math.random() * paletteLen());
            });
        } else if (selectedColorIndex !== -1) {
            applyActionToTiles(targetIndices, tile => {
                tile.isGold = false;
                tile.k = selectedColorIndex;
            });
        } else {
            applyActionToTiles(targetIndices, tile => {
                if (!tile.isGold) {
                    tile.k = (tile.k + 1) % paletteLen();
                } else {
                    tile.isGold = false;
                }
            });
        }
    }
    const afterState = getCurrentState();
    // יצירת Diff של השינויים שקרו במשיחת המברשת הזו
    const diff = [];
    for (let i = 0; i < afterState.tiles.length; i++) {
        const beforeTile = pointerState.beforeState.tiles[i];
        const afterTile = afterState.tiles[i];
        
        // בודקים אך ורק אם הצבע (k) השתנה
        if (beforeTile.k !== afterTile.k) {
            diff.push({
                i: i, // אינדקס התא
                k: afterTile.k // האינדקס של הצבע החדש
            });
        }
    }
    
    // אם היו שינויים, שולחים ללוגר
    if (diff.length > 0) {
        window.logArtEvent('DRAW_STROKE', JSON.stringify(diff));
    }
    // Commit after logging the stroke so its history ID covers the complete action.
    if (pointerState.beforeState && !areStatesEqual(pointerState.beforeState, afterState)) {
         pushHistory({ before: pointerState.beforeState, after: afterState });
         hasPerformedInitialAutofill = true;
    }

    Object.assign(pointerState, { id: null, downIndex: -1, isDragging: false, dragSourceIndex: null, lastPaintedIndex: -1, lineAnchorIndex: -1, lineRestartPending: false, beforeState: null });
}

function updateLayout() {
    const shell = dom.appShell;
    
    // --- תוספת: חישוב מיוחד למסך מלא ---
    if (typeof isMacroFullscreen !== 'undefined' && isMacroFullscreen) {
        const maxSize = Math.min(window.innerWidth, window.innerHeight);
        const isMobile = window.innerWidth < 768; // זיהוי מובייל לפי רוחב מסך
        const scaleFactor = isMobile ? 0.95 : 0.65; // 95% למובייל, 65% לדסקטופ
        const newWidth = maxSize * scaleFactor;
        shell.style.width = `${newWidth}px`;
    }


    // --- מצב רגיל ---
    else if (window.innerWidth < 768) { 
        shell.style.width = ''; 
    } else {
      const controlsHeight = dom.controlsContainer.offsetHeight;
      const viewportHeight = window.innerHeight;
      // מונעים קריסה אם ה-parentElement לא החזיר ערך
      const topMargin = parseInt(window.getComputedStyle(shell.parentElement).paddingTop, 10) || 0; 
      const availableHeight = viewportHeight - controlsHeight - (topMargin * 2);
      const newWidth = Math.min(720, window.innerWidth * 0.85, availableHeight);
      shell.style.width = `${newWidth}px`;
    }

    if (!canvas) return;
    setTimeout(() => {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        renderToScreen(null);
    }, 50);
  }      



  function createRainbowIconSVG(currentPalette, isForButton = false) {
    const p = currentPalette || palette();
    let rectsHTML = '';
    
    const gridSize = 3;
    // הקטנו מעט את הריבועים והוספנו רווח כדי ליצור פסיפס עדין ולא גוש צבע
    const rectSize = 6; 
    const gap = 2;  
    const offset = 2; // שוליים פנימיים שנותנים לאייקון "לנשום"
    
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const colorIndex = Math.floor((row * gridSize + col) * (p.length / (gridSize * gridSize)));
            const color = p[colorIndex] || '#FFD700';
            
            // חישוב מיקום עם התחשבות ברווח בין הריבועים
            const x = offset + (col * (rectSize + gap));
            const y = offset + (row * (rectSize + gap));
            
            rectsHTML += `<rect x="${x}" y="${y}" width="${rectSize}" height="${rectSize}" fill="${color}" rx="1.5"/>`;
        }
    }
    
    const styling = isForButton 
        ? 'width: var(--icon-size); height: var(--icon-size);' 
        : 'width: 100%; height: 100%;';

    // התיקון: אם זה נועד לכפתור בלוח הבקרה, נחתוך את הפסיפס לצורה של עיגול!
    const innerContent = isForButton
        ? `<defs><clipPath id="circle-clip"><circle cx="12" cy="12" r="11"/></clipPath></defs>
           <g clip-path="url(#circle-clip)">${rectsHTML}</g>`
        : rectsHTML;

    return `<svg viewBox="0 0 24 24" fill="none" stroke="none" style="${styling}">
        ${innerContent}
    </svg>`;
}


    function updateGlowEffect() {
        if (!dom.board) return;
        if (isRainbowModeActive) { dom.board.classList.add('glowing-border-rainbow'); dom.board.classList.remove('glowing-border'); } 
        else if (selectedColor) { dom.root.style.setProperty('--glow-color', selectedColor); dom.board.classList.add('glowing-border'); dom.board.classList.remove('glowing-border-rainbow'); } 
        else { dom.board.classList.remove('glowing-border', 'glowing-border-rainbow'); }
    }

    function updateColorPickerButtonUI() {
        // 1. האם אנחנו במצב קשת?
        if (isRainbowModeActive) {
            // מציירים את אייקון הפסיפס החתוך שלנו
            dom.btnColorPicker.innerHTML = createRainbowIconSVG(null, true);
        } 
        // 2. אם אנחנו לא במצב קשת (צבע רגיל או מברשת ריקה)
        else {
            // קודם כל, דורסים הכל ומחזירים את ה-HTML של האייקון המקורי והנקי
            dom.btnColorPicker.innerHTML = originalColorPickerIconHTML;
            
            // עכשיו אפשר למצוא את העיגול בבטחה ולצבוע אותו
            const circle = dom.btnColorPicker.querySelector('svg circle');
            
            if (circle) {
                if (selectedColor) {
                    // יש צבע ספציפי שנבחר - צובעים את העיגול
                    circle.style.fill = selectedColor;
                    circle.style.stroke = selectedColor === '#000000' ? '#424242' : selectedColor;
                } else {
                    // שום צבע לא נבחר (מצב דגימה/גרירה מהלוח) - צובעים בשחור עם מסגרת לבנה
                    circle.style.fill = '#000';
                    circle.style.stroke = '#fff';
                }
            }
        }
    }
    

    function navigateColorPages(isNext) {
        const totalPages = Math.ceil(C.PALETTES[activePaletteIndex].colors.length / C.COLORS_PER_PAGE);
        if (totalPages <= 1) return;
        if (isNext) {
            colorPickerPage = (colorPickerPage + 1) % totalPages;
        } else {
            colorPickerPage = (colorPickerPage - 1 + totalPages) % totalPages;
        }
    }

function getTilesInRadius(centerIndex, radius) {
    if (radius <= 1) return [centerIndex];

    const tilesInRadius = new Set();
    const centerCol = centerIndex % n;
    const centerRow = Math.floor(centerIndex / n);
    const r = Math.floor(radius / 2);

    for (let rowOffset = -r; rowOffset <= r; rowOffset++) {
        for (let colOffset = -r; colOffset <= r; colOffset++) {
            const dist = Math.sqrt(rowOffset * rowOffset + colOffset * colOffset);
            if (dist <= r) {
                const targetRow = centerRow + rowOffset;
                const targetCol = centerCol + colOffset;
                if (targetRow >= 0 && targetRow < n && targetCol >= 0 && targetCol < n) {
                    tilesInRadius.add(targetRow * n + targetCol);
                }
            }
        }
    }
    return Array.from(tilesInRadius);
}

      
    function getSymmetricIndices(index) {
          if (index === -1) return [];
          if (symmetryMode === 'off') return [index];
          const row = Math.floor(index / n);
          const col = index % n;
          const N = n - 1;
          const indices = new Set([index]);
          if (symmetryMode === 'horizontal' || symmetryMode === 'mandala' || symmetryMode === 'kaleidoscope') indices.add(row * n + (N - col));
          if (symmetryMode === 'vertical' || symmetryMode === 'mandala' || symmetryMode === 'kaleidoscope') indices.add((N - row) * n + col);
          if (symmetryMode === 'mandala' || symmetryMode === 'kaleidoscope') indices.add((N - row) * n + (N - col));
          if (symmetryMode === 'kaleidoscope') Array.from(indices).map(idx => ({ r: Math.floor(idx / n), c: idx % n })).forEach(pt => indices.add(pt.c * n + pt.r));
          return Array.from(indices);
      }
      
      function updateSymmetryButtonUI() {
          const parts = {
              top: dom.btnSymmetry.querySelector('.part.top'), bottom: dom.btnSymmetry.querySelector('.part.bottom'),
              left: dom.btnSymmetry.querySelector('.part.left'), right: dom.btnSymmetry.querySelector('.part.right'),
              centerDot: dom.btnSymmetry.querySelector('.part.center-dot'),
          };
          const activeColor = C.GOLD, inactiveColor = 'transparent';
          parts.top.style.stroke = inactiveColor; parts.bottom.style.stroke = inactiveColor;
          parts.left.style.stroke = inactiveColor; parts.right.style.stroke = inactiveColor;
          parts.centerDot.style.fill = inactiveColor;
          if (symmetryMode === 'vertical') { parts.top.style.stroke = activeColor; parts.bottom.style.stroke = activeColor; } 
          else if (symmetryMode === 'horizontal') { parts.left.style.stroke = activeColor; parts.right.style.stroke = activeColor; } 
          else if (symmetryMode === 'mandala') { parts.top.style.stroke = activeColor; parts.bottom.style.stroke = activeColor; parts.left.style.stroke = activeColor; parts.right.style.stroke = activeColor; } 
          else if (symmetryMode === 'kaleidoscope') { parts.top.style.stroke = activeColor; parts.bottom.style.stroke = activeColor; parts.left.style.stroke = activeColor; parts.right.style.stroke = activeColor; parts.centerDot.style.fill = activeColor; }
          let titleKey;
          switch (symmetryMode) {
              case 'vertical': titleKey = 'symmetry_vertical'; break;
              case 'horizontal': titleKey = 'symmetry_horizontal'; break;
              case 'mandala': titleKey = 'symmetry_mandala'; break;
              case 'kaleidoscope': titleKey = 'symmetry_kaleidoscope'; break;
              default: titleKey = 'symmetry_off';
          }
          dom.btnSymmetry.setAttribute('aria-label', getText(titleKey));
          dom.btnSymmetry.title = getText('tooltip_symmetry');
      }
    

  
      function updateSymmetryUI() { updateSymmetryButtonUI(); }
      
function updateBrightnessEvoButtonUI() {
    dom.btnBrightnessEvo.classList.remove('mode-brightness', 'mode-contrast', 'simulation-active');

    if (brightnessEvoMode === 'brightness') {
        dom.btnBrightnessEvo.classList.add('mode-brightness');
        // נוסיף גם את הקלאס שמדגיש שהסימולציה "חמושה"
        if (armedSimulation === 'brightnessEvo') {
             dom.btnBrightnessEvo.classList.add('simulation-active');
        }
    } else if (brightnessEvoMode === 'contrast') {
        dom.btnBrightnessEvo.classList.add('mode-contrast');
        if (armedSimulation === 'brightnessEvo') {
             dom.btnBrightnessEvo.classList.add('simulation-active');
        }
    }
}


// Game of Life keeps the personal rules separate from its two preset shortcuts.
function cloneGameOfLifeRules(rules) {
    return { survival: [...rules.survival], birth: [...rules.birth] };
}

function getGameOfLifeRecordingRules() {
    return { ...cloneGameOfLifeRules(gameOfLifeRules), cycleMode: gameOfLifeMode,
        personalRules: cloneGameOfLifeRules(personalGameOfLifeRules), cycleSlots: gameOfLifeCycle.map(cloneGameOfLifeRules), cycleSources: [...gameOfLifeSources] };
}

function updateGameOfLifeButtonUI() {
    const active = armedSimulation === 'gameOfLife';
    dom.btnGameOfLife.classList.toggle('simulation-active', active);
    const stars = active && gameOfLifeMode !== 'personal' ? (gameOfLifeMode === 'shuffle' ? 1 : 2) : 0;
    dom.btnGameOfLife.querySelectorAll('[data-gol-star]').forEach((star, index) => {
        star.style.display = index < stars ? '' : 'none';
    });
    const preset = Object.entries(C.GAME_OF_LIFE_PRESETS).find(([, rules]) => JSON.stringify(rules) === JSON.stringify(gameOfLifeRules))?.[0];
    const name = preset ? document.getElementById(preset)?.textContent.trim() : getText('cycle_custom');
    dom.btnGameOfLife.title = getText('tooltip_gameOfLife') + (active ? ': ' + name : '');
    dom.btnGameOfLife.setAttribute('aria-label', dom.btnGameOfLife.title);
}

function setPersonalGameOfLifeRules(rules) {
    const slots = gameOfLifeCycle.map(cloneGameOfLifeRules);
    slots[0] = cloneGameOfLifeRules(rules);
    const sources = [...gameOfLifeSources];
    sources[0] = 'yours';
    setGameOfLifeCycle(slots, 0, sources, rules);
}

function setGameOfLifeCycle(slots, index, sources = gameOfLifeSources, yoursRules = personalGameOfLifeRules) {
    gameOfLifeCycle = normalizeEvolutionCycle(slots, defaultGolCycle);
    gameOfLifeSources = normalizeCycleSources(sources, gameOfLifeCycle, C.GAME_OF_LIFE_PRESETS);
    personalGameOfLifeRules = cloneGameOfLifeRules(yoursRules);
    gameOfLifeMode = ['personal', 'shuffle', 'coral'][index];
    gameOfLifeRules = cloneGameOfLifeRules(gameOfLifeCycle[index]);
    persistEvolutionCycle('colorGridGolCycleMembership', gameOfLifeCycle);
    persistEvolutionCycle('colorGridGolCycleMembershipIdentity', { sources: gameOfLifeSources, yoursRules: personalGameOfLifeRules });
    updateGameOfLifeButtonUI();
    window.logArtEvent('Game of Life Mode Changed', JSON.stringify({
        ...getGameOfLifeRecordingRules(), mode: armedSimulation === 'gameOfLife' ? gameOfLifeMode : 'off'
    }));
}

function restoreGameOfLifeRules(snapshot) {
    gameOfLifeRules = cloneGameOfLifeRules(snapshot);
    gameOfLifeMode = ['shuffle', 'coral'].includes(snapshot.cycleMode) ? snapshot.cycleMode : 'personal';
    // Older recordings have one personal snapshot and two fixed preset shortcuts.
    const legacySlots = [snapshot.personalRules || snapshot, ...defaultGolCycle.slice(1)];
    gameOfLifeCycle = normalizeEvolutionCycle(snapshot.cycleSlots || legacySlots, defaultGolCycle);
    gameOfLifeCycle[['personal', 'shuffle', 'coral'].indexOf(gameOfLifeMode)] = cloneGameOfLifeRules(snapshot);
    gameOfLifeSources = normalizeCycleSources(snapshot.cycleSources, gameOfLifeCycle, C.GAME_OF_LIFE_PRESETS);
    personalGameOfLifeRules = cloneGameOfLifeRules(snapshot.personalRules || snapshot);
    updateGameOfLifeButtonUI();
}

function cycleGameOfLifeMode() {
    if (isLifePlaying && armedSimulation !== 'gameOfLife') return;
    const current = armedSimulation === 'gameOfLife' ? gameOfLifeMode : 'off';
    const next = nextEvolutionMode(current, ['off', 'personal', 'shuffle', 'coral']);
    if (next === 'off') {
        armSimulation(null);
    } else {
        if (current === 'off') armSimulation('gameOfLife');
        gameOfLifeMode = next;
        gameOfLifeRules = cloneGameOfLifeRules(gameOfLifeCycle[['personal', 'shuffle', 'coral'].indexOf(next)]);
    }
    updateGameOfLifeButtonUI();
    window.logArtEvent('Game of Life Mode Changed', JSON.stringify({ ...getGameOfLifeRecordingRules(), mode: next }));
}

function cloneChiFlowRules(rules) {
    return { awakening: [...rules.awakening], flow: [...rules.flow], reach: rules.reach };
}

function getChiFlowRecordingRules() {
    return { ...cloneChiFlowRules(chiFlowRules), cycleMode: chiFlowMode,
        personalRules: cloneChiFlowRules(personalChiFlowRules), cycleSlots: chiFlowCycle.map(cloneChiFlowRules), cycleSources: [...chiFlowSources] };
}

function updateChiFlowButtonUI() {
    const active = armedSimulation === 'sandpile';
    dom.btnSandpile.classList.toggle('simulation-active', active);
    const stars = active && chiFlowMode !== 'personal' ? (chiFlowMode === 'ripples' ? 1 : 2) : 0;
    dom.btnSandpile.querySelectorAll('[data-chi-star]').forEach((star, index) => {
        star.style.display = index < stars ? '' : 'none';
    });
    const preset = Object.entries(C.CHI_FLOW_PRESETS).find(([, rules]) => JSON.stringify(rules) === JSON.stringify(chiFlowRules))?.[0];
    const name = preset ? getText('chi_preset_' + preset.toLowerCase()) : getText('cycle_custom');
    dom.btnSandpile.title = getText('chi_modal_title') + (active ? ': ' + name : '');
    dom.btnSandpile.setAttribute('aria-label', dom.btnSandpile.title);
}

function setPersonalChiFlowRules(rules) {
    const slots = chiFlowCycle.map(cloneChiFlowRules);
    slots[0] = cloneChiFlowRules(rules);
    const sources = [...chiFlowSources];
    sources[0] = 'yours';
    setChiFlowCycle(slots, 0, sources, rules);
}

function setChiFlowCycle(slots, index, sources = chiFlowSources, yoursRules = personalChiFlowRules) {
    chiFlowCycle = normalizeEvolutionCycle(slots, defaultChiCycle);
    chiFlowSources = normalizeCycleSources(sources, chiFlowCycle, C.CHI_FLOW_PRESETS);
    personalChiFlowRules = cloneChiFlowRules(yoursRules);
    chiFlowMode = ['personal', 'ripples', 'nova'][index];
    chiFlowRules = cloneChiFlowRules(chiFlowCycle[index]);
    persistEvolutionCycle('colorGridChiCycleMembership', chiFlowCycle);
    persistEvolutionCycle('colorGridChiCycleMembershipIdentity', { sources: chiFlowSources, yoursRules: personalChiFlowRules });
    updateChiFlowButtonUI();
    window.logArtEvent('Chi Flow Mode Changed', JSON.stringify({
        ...getChiFlowRecordingRules(), mode: armedSimulation === 'sandpile' ? chiFlowMode : 'off'
    }));
}

function restoreChiFlowRules(snapshot) {
    chiFlowRules = cloneChiFlowRules(snapshot);
    chiFlowMode = ['ripples', 'nova'].includes(snapshot.cycleMode) ? snapshot.cycleMode : 'personal';
    // Older recordings have one personal snapshot and two fixed preset shortcuts.
    const legacySlots = [snapshot.personalRules || snapshot, ...defaultChiCycle.slice(1)];
    chiFlowCycle = normalizeEvolutionCycle(snapshot.cycleSlots || legacySlots, defaultChiCycle);
    chiFlowCycle[['personal', 'ripples', 'nova'].indexOf(chiFlowMode)] = cloneChiFlowRules(snapshot);
    chiFlowSources = normalizeCycleSources(snapshot.cycleSources, chiFlowCycle, C.CHI_FLOW_PRESETS);
    personalChiFlowRules = cloneChiFlowRules(snapshot.personalRules || snapshot);
    updateChiFlowButtonUI();
}

function cycleChiFlowMode() {
    if (isLifePlaying && armedSimulation !== 'sandpile') return;
    const current = armedSimulation === 'sandpile' ? chiFlowMode : 'off';
    const next = nextEvolutionMode(current, ['off', 'personal', 'ripples', 'nova']);
    if (next === 'off') {
        armSimulation(null);
    } else {
        if (current === 'off') armSimulation('sandpile');
        chiFlowMode = next;
        chiFlowRules = cloneChiFlowRules(chiFlowCycle[['personal', 'ripples', 'nova'].indexOf(next)]);
    }
    updateChiFlowButtonUI();
    window.logArtEvent('Chi Flow Mode Changed', JSON.stringify({ ...getChiFlowRecordingRules(), mode: next }));
}

// Running evolutions cycle through active modes; paused cycles retain Off.
function nextEvolutionMode(current, sequence) {
    let index = (sequence.indexOf(current) + 1) % sequence.length;
    if (isLifePlaying && sequence[index] === 'off') index = (index + 1) % sequence.length;
    return sequence[index];
}

function cycleBrightnessEvoMode() {
    // שומרים את המצב הקודם כדי שנוכל להשוות
    const oldMode = brightnessEvoMode;

    const sequence = ['off', 'brightness', 'contrast'];
    brightnessEvoMode = nextEvolutionMode(brightnessEvoMode, sequence);
    
    window.logArtEvent('Brightness Evo Mode Changed', brightnessEvoMode);

    // תנאי 1: אם עברנו ממצב "כבוי" למצב "דלוק" (בהירות)
    // זו הפעם היחידה שאנחנו צריכים לחמש את הסימולציה
    if (oldMode === 'off' && brightnessEvoMode !== 'off') {
        armSimulation('brightnessEvo');
    } 
    // תנאי 2: אם עברנו ממצב "דלוק" כלשהו למצב "כבוי"
    else if (oldMode !== 'off' && brightnessEvoMode === 'off') {
        armSimulation(null); // מבטלים את החימוש
    }
    // במקרה האחר (מעבר בין 'בהירות' ל'קונטרסט'), אנחנו לא עושים כלום.
    // הסימולציה כבר חמושה ואין צורך לגעת בה.

    // בכל מקרה, נעדכן את המראה של הכפתור
    updateBrightnessEvoButtonUI();
}


function updateErosionButtonUI() {
    const channels = armedSimulation === 'erosion' && erosionRules.mode === 'channels';
    const solid = armedSimulation === 'erosion' && erosionRules.mode === 'channels-solid';
    document.getElementById('iconErosionLegacy').style.display = channels || solid ? 'none' : 'block';
    document.getElementById('iconErosionChannels').style.display = channels ? 'block' : 'none';
    document.getElementById('iconErosionSolid').style.display = solid ? 'block' : 'none';
    dom.btnErosion.title = `${getText('tooltip_erosion')}: ${getText(armedSimulation === 'erosion'
        ? (solid ? 'erosion_solid' : channels ? 'erosion_channels' : 'erosion_legacy') : 'erosion_off')}`;
    dom.btnErosion.setAttribute('aria-label', dom.btnErosion.title);
}

function cycleErosionMode() {
    if (isLifePlaying && armedSimulation !== 'erosion') return;
    const modes = ['off', 'legacy', 'channels-solid', 'channels'];
    const current = armedSimulation === 'erosion' ? erosionRules.mode : 'off';
    const next = nextEvolutionMode(current, modes);
    if (next === 'off') {
        pauseLife();
        armSimulation(null);
    } else {
        if (armedSimulation !== 'erosion') armSimulation('erosion');
        erosionRules.mode = next;
    }
    updateErosionButtonUI();
    window.logArtEvent('Erosion Mode Changed', next);
}

function updateDlaButtonUI() {
    dom.btnDla.classList.remove('mode-genetics', 'mode-no-genetics');
    if (dlaMode === 'genetics') {
        dom.btnDla.classList.add('mode-genetics');
    } else if (dlaMode === 'no-genetics') {
        dom.btnDla.classList.add('mode-no-genetics');
    }
}


function cycleDlaMode() {
    const oldMode = dlaMode;

    const sequence = ['off', 'genetics', 'no-genetics'];
    dlaMode = nextEvolutionMode(dlaMode, sequence);
    
    window.logArtEvent('DLA Mode Changed', dlaMode);

    if (oldMode === 'off' && dlaMode !== 'off') {
        armSimulation('dla');
    } else if (oldMode !== 'off' && dlaMode === 'off') {
        if (armedSimulation === 'dla') {
            armSimulation(null);
        }
    }
    
    updateDlaButtonUI();
}


// --- NEW: Gravitational Sort UI and Cycling ---
function updateGravitationalSortButtonUI() {
    dom.btnGravitationalSort.classList.remove('mode-up', 'mode-right', 'mode-down', 'mode-left', 'mode-center_x', 'mode-radial', 'mode-vortex', 'simulation-active');

    if (gsMode !== 'off') {
        dom.btnGravitationalSort.classList.add('mode-' + gsMode);
        if (armedSimulation === 'gravitationalSort') {
             dom.btnGravitationalSort.classList.add('simulation-active');
        }
    }
}

function cycleGravitationalSortMode() {
    const oldMode = gsMode;
    const sequence = ['off', 'up', 'right', 'center_x' ];



 //   const sequence = ['off', 'up', 'right', 'down', 'left', 'center_x', 'radial', 'vortex'];





    gsMode = nextEvolutionMode(gsMode, sequence);

    if (gsMode !== 'off') {
        gravitationalSortRules.direction = gsMode; // מעדכן את חוקי הסימולציה בפועל
    }
    
    window.logArtEvent('Gravitational Sort Mode', gsMode);
    
    // הדלקה או כיבוי של הסימולציה בהתאם למצב
    if (oldMode === 'off' && gsMode !== 'off') {
        armSimulation('gravitationalSort');
    } else if (oldMode !== 'off' && gsMode === 'off') {
        if (armedSimulation === 'gravitationalSort') {
            armSimulation(null);
        }
    }
    
    updateGravitationalSortButtonUI();
}
// --- END: Gravitational Sort Functions ---



// --- NEW: Breathe Simulation UI and Cycling ---
function updateBreatheEvoButtonUI() {
    dom.btnShowBreatheMenu.classList.remove('mode-solo', 'mode-group', 'simulation-active');

    if (breatheEvoMode === 'solo') {
        dom.btnShowBreatheMenu.classList.add('mode-solo');
        dom.iconBreatheSolo.style.display = 'block';
        dom.iconBreatheGroup.style.display = 'none';
        if (armedSimulation === 'breathe') {
            dom.btnShowBreatheMenu.classList.add('simulation-active');
        }
    } else if (breatheEvoMode === 'group') {
        dom.btnShowBreatheMenu.classList.add('mode-group');
        dom.iconBreatheSolo.style.display = 'none';
        dom.iconBreatheGroup.style.display = 'block';
        if (armedSimulation === 'breathe') {
            dom.btnShowBreatheMenu.classList.add('simulation-active');
        }
    } else { // 'off'
        dom.iconBreatheSolo.style.display = 'block';
        dom.iconBreatheGroup.style.display = 'none';
    }
}

function cycleBreatheEvoMode() {
    if (isLifePlaying) {
        pauseLife();
    }

    const oldMode = breatheEvoMode;
    const sequence = ['off', 'solo', 'group'];
    const currentIndex = sequence.indexOf(breatheEvoMode);
    const nextIndex = (currentIndex + 1) % sequence.length;
    breatheEvoMode = sequence[nextIndex];

    if (oldMode === 'off' && breatheEvoMode !== 'off') {
        armSimulation('breathe');
    } else if (oldMode !== 'off' && breatheEvoMode === 'off') {
        if (armedSimulation === 'breathe') {
            armSimulation(null);
        }
    }
    
    updateBreatheEvoButtonUI();
}
// --- END: New Breathe Functions ---

// --- NEW: Spiral UI and Cycling ---
function updateSpiralButtonUI() {
    // הוספנו לניקוי את radial, down, left - אחרת הם נתקעים על הכפתור!
    dom.btnSpiral.classList.remove('mode-classic', 'mode-vortex', 'mode-expand', 'mode-a', 'mode-b', 'mode-magnet', 'mode-cosmic_magnet', 'mode-time_magnet', 'mode-radial', 'mode-down', 'mode-left', 'mode-black_hole', 'simulation-active');
    dom.btnSpiral.title = spiralMode === 'black_hole'
        ? `${getText('tooltip_spiral')}: ${getText(`spiral_${spiralMode}`)}`
        : getText('tooltip_spiral');
    dom.btnSpiral.setAttribute('aria-label', dom.btnSpiral.title);

    if (spiralMode !== 'off') {
        dom.btnSpiral.classList.add('mode-' + spiralMode);
        if (armedSimulation === 'spiral') {
             dom.btnSpiral.classList.add('simulation-active');
        }
    }
}


function cycleSpiralMode() {
    const oldMode = spiralMode;
const sequence = SPIRAL_MODE_SEQUENCE;


// original with all button
//const sequence = ['off', 'b', 'vortex',  'left', 'a', 'radial', 'down', ];

// const sequence = ['off', 'b', 'vortex', 'classic', 'expand', 'a', 'time_magnet', 'magnet', 'cosmic_magnet'];


    spiralMode = nextEvolutionMode(spiralMode, sequence);

    if (spiralMode !== 'off') {
        spiralRules.method = spiralMode;
    }
    
    window.logArtEvent('Spiral Mode Changed', spiralMode);

    if (oldMode === 'off' && spiralMode !== 'off') {
        armSimulation('spiral');
    } else if (oldMode !== 'off' && spiralMode === 'off') {
        if (armedSimulation === 'spiral') {
            armSimulation(null);
        }
    }
    
    updateSpiralButtonUI();
}
// --- END: Spiral Functions ---

// --- NEW: Magnet Button Functions ---

function updateMagnetButtonUI() {
    if (!dom.btnMagnetModes) return;
    // הוספנו לניקוי את time_magnet ואת expand!
    dom.btnMagnetModes.classList.remove('mode-magnet', 'mode-cosmic_magnet', 'mode-time_magnet', 'mode-expand', 'simulation-active');
    
    if (magnetMode !== 'off') {
        dom.btnMagnetModes.classList.add('mode-' + magnetMode);
        if (armedSimulation === 'magnet') {
             dom.btnMagnetModes.classList.add('simulation-active');
        }
    }
}


function cycleMagnetMode() {
    const oldMode = magnetMode;
    const sequence = ['off', 'cosmic_magnet', 'magnet', 'time_magnet'];
    magnetMode = nextEvolutionMode(magnetMode, sequence);

    if (magnetMode !== 'off') {
        magnetRules.method = magnetMode;
    }
    
    window.logArtEvent('Magnet Mode Changed', magnetMode);



    if (oldMode === 'off' && magnetMode !== 'off') {
        armSimulation('magnet');
    } else if (oldMode !== 'off' && magnetMode === 'off') {
        if (armedSimulation === 'magnet') {
            armSimulation(null);
        }
    }
    
    updateMagnetButtonUI();
}
// --- END: Magnet Button Functions ---



      function cycleSymmetryMode() {
          const currentIndex = C.SYMMETRY_MODES.indexOf(symmetryMode);
          symmetryMode = C.SYMMETRY_MODES[(currentIndex + 1) % C.SYMMETRY_MODES.length];
          updateSymmetryUI();
      }


// --- NEW: Sort UI Updater ---
function updateSortButtonUI() {
    if (!dom.sortIconGroup) return;
    const modeIndex = SORT_MODES.findIndex(m => m.method === currentSortMethod);
    if (modeIndex !== -1) {
        currentSortIndex = modeIndex;
        dom.sortIconGroup.innerHTML = SORT_MODES[currentSortIndex].icon;
    }
}
// -----------------------------

function cycleSortMethod() {
    selectSortMethod(nextSortMethod(currentSortMethod, sortCycleMethods));
}

function selectSortMethod(nextMethod) {
    if (nextMethod === currentSortMethod) return;
    // 1. עוצרים לולאות ציור כפולות כדי לשחרר את המעבד
    if (animationLoopId) {
        cancelAnimationFrame(animationLoopId);
        animationLoopId = null;
    }

    // 2. הסרנו את העטיפה של performAction כדי למנוע דליפת זיכרון מפלצתית!
    currentSortIndex = SORT_MODES.findIndex(mode => mode.method === nextMethod);
    const nextMode = SORT_MODES[currentSortIndex];
    
    if (dom.sortIconGroup) {
        dom.sortIconGroup.innerHTML = nextMode.icon;
    }
    
    applySortMethod(nextMode.method);
    
    // 3. כופה על הלוח להתרנדר מיד מחדש עם הצבעים החדשים
    renderToScreen(null);
}
// פונקציה חדשה: מנתבת את הלחיצה על גלגל השיניים למודל הנכון
      function openCurrentSimSettings() {
          switch(armedSimulation) {
              case 'gameOfLife': modals.openGolSettingsModal(); break;
              case 'gravitationalSort': modals.openGravitationalSortSettingsModal(); break;
              case 'contour': modals.openContourSettingsModal(); break;
              case 'spiral': modals.openSpiralSettingsModal(); break;
              case 'sandpile': modals.openChiFlowSettingsModal(); break;
              case 'turing': modals.openTuringSettingsModal(); break;
              case 'magnet': modals.openMagnetSettingsModal(); break;
              case 'nudgeBrighter':
              case 'nudgeDarker': modals.openNudgeSettingsModal(); break;
          }
      }


// --- Art Logger: Export Functionality ---


function resetArtRecipeLog() {
    artRecipeLog = [];
    historyRecipeCursor = 0;
    logCurrentStateAsInit();
    modals.closeModal();
}

async function exportArtRecipeLog() {
    if (artRecipeLog.length === 0) {
        modals.showSaveStatus('saveModal_logEmpty', true);
        return;
    }

    // 1. חיפוש הפלטה ההתחלתית
    let paletteName = "Unknown";
    try {
        // לוקחים את השורה הראשונה (שמכילה את ה-INIT_STATE)
        const firstLog = artRecipeLog[0];
        const match = firstLog.match(/INIT_STATE -> (.*)/);
        if (match) {
            const initState = JSON.parse(match[1]);
            const palIndex = initState.pal;
            // שולפים את השם של הפלטה מהמאגר
            if (C.PALETTES[palIndex]) {
                paletteName = C.PALETTES[palIndex].name;
            }
        }
    } catch (e) {
        console.error("Could not extract palette name for file:", e);
    }

    // 2. ניקוי השם מרווחים ותווים לא חוקיים כדי שמערכת ההפעלה לא תעשה בעיות
    const cleanPaletteName = paletteName.replace(/\s+/g, '_').replace(/[<>:"/\\|?*]/g, '');

    // 3. ספירת מספר השורות/פקודות
    const linesCount = artRecipeLog.length;

    // 4. הרכבת השם החדש בדיוק בתבנית שביקשת!
    const fileName = `Intuition_Path_${cleanPaletteName}_${linesCount}.txt`;

    const file = new File([artRecipeLog.join('\n')], fileName, { type: 'text/plain' });
    const shareData = { files: [file], title: fileName.replace(/\.txt$/, '') };
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Macro share API error:', err);
                triggerDownload(file);
            }
        }
    } else {
        triggerDownload(file);
    }
    modals.closeModal();
}

      
      // ==========================================
// ====== MACRO REPLAY ENGINE (POC) =========
// ==========================================

// History logging reads only fixed-size settings; it never serializes board tiles.
function getHistorySettings(state) {
    return { n: state.n, activePaletteIndex: state.activePaletteIndex,
        separatorPx: state.separatorPx, currentSortMethod: state.currentSortMethod };
}

function validateHistorySettings(settings) {
    if (!settings || !Number.isInteger(settings.n) || settings.n < 1 || settings.n > 300 ||
        !Number.isInteger(settings.activePaletteIndex) || settings.activePaletteIndex < 0 ||
        !Number.isFinite(settings.separatorPx) || settings.separatorPx < 0 ||
        typeof settings.currentSortMethod !== 'string') {
        throw new Error('Invalid history settings');
    }
}

function applyHistorySettings(settings) {
    validateHistorySettings(settings);
    let changed = false;
    if (currentSortMethod !== settings.currentSortMethod) {
        applySortMethod(settings.currentSortMethod);
        updateSortButtonUI();
        changed = true;
    }
    if (activePaletteIndex !== settings.activePaletteIndex && C.PALETTES[settings.activePaletteIndex]) {
        activePaletteIndex = settings.activePaletteIndex;
        updatePaletteHeader();
        changed = true;
    }
    if (n !== settings.n) {
        _performResize(settings.n);
        changed = true;
    }
    if (separatorPx !== settings.separatorPx) {
        separatorPx = settings.separatorPx;
        dom.btnGap.title = getText('tooltip_gap');
        dom.btnGap.setAttribute('aria-label', getText('tooltip_gap'));
        changed = true;
    }
    if (changed) {
        syncSelectedColorWithPalette();
        renderToScreen(null);
    }
}

function parseHistoryMacro(lines) {
    const pattern = /\[(\d{2}:\d{2}:\d{2}\.\d{3})\](?: \[GEN:(\d+)\])? (.*?) -> (.*)/;
    const events = lines.map(line => {
        const match = line.match(pattern);
        if (!match) return null;
        return { time: Date.parse(`1970-01-01T${match[1]}Z`), eventName: match[3], details: match[4],
            isGenBased: match[2] !== undefined, targetGen: match[2] === undefined ? null : Number(match[2]) };
    });
    // Metadata refers to raw log positions, not positions in the filtered playback.
    events.forEach((event, position) => {
        if (!event || event.eventName !== 'HISTORY_ACTION') return;
        const metadata = JSON.parse(event.details);
        if (metadata.recipeVersion !== 2 || !Number.isInteger(metadata.id) ||
            !Number.isInteger(metadata.from) || metadata.from < 0 || metadata.to !== position || metadata.from > position) {
            throw new Error('Invalid history action metadata');
        }
        event.historyId = metadata.id;
        for (let i = metadata.from; i < position; i++) {
            if (events[i] && !(i === 0 && events[i].eventName === 'INIT_STATE')) events[i].historyId = metadata.id;
        }
    });

    const visible = [];
    const cancelledActions = new Map();
    for (const event of events) {
        if (!event) continue;
        if (event.eventName === 'UNDO' || event.eventName === 'REDO') {
            const target = JSON.parse(event.details);
            if (target.recipeVersion !== 2 || !Number.isInteger(target.id)) throw new Error('Invalid history target');
            validateHistorySettings(target.settings);
            if (event.eventName === 'UNDO') {
                const start = visible.findIndex(item => item.historyId === target.id);
                if (start !== -1) {
                    const removed = visible.splice(start);
                    cancelledActions.set(target.id, removed.filter(item => item.historyId === target.id));
                }
            } else {
                // Redo reuses the recorded commands, not a fresh random result or a board snapshot.
                const restored = cancelledActions.get(target.id) || [];
                visible.push(...restored.map(item => ({ ...item, time: event.time })));
            }
            visible.push({ ...event, eventName: 'HISTORY_SETTINGS', details: JSON.stringify(target.settings),
                historyId: event.eventName === 'REDO' ? target.id : null,
                isGenBased: false, targetGen: null });
        } else {
            visible.push(event);
        }
    }

    let delta = 0;
    let previousTime = null;
    let simulationRunning = false;
    return visible.filter(event => event.eventName !== 'HISTORY_ACTION').map(event => {
        if (previousTime !== null) {
            let gap = event.time - previousTime;
            if (gap < 0) gap += 86400000;
            const cap = simulationRunning && event.eventName !== 'STEP FORWARD' ? 600000 : 1000;
            delta += Math.min(gap, cap);
        }
        previousTime = event.time;
        if (event.eventName === 'PLAY') simulationRunning = true;
        if (event.eventName === 'PAUSE' || event.eventName === 'HISTORY_SETTINGS') simulationRunning = false;
        return { ...event, delta };
    });
}

function parseMacroText(text) {
    const recipeLines = text.split('\n').filter(line => line.trim() !== '');
    const isHistoryRecipe = recipeLines.some(line => {
        const match = line.match(/ (INIT_STATE|HISTORY_ACTION|UNDO|REDO) -> (.*)/);
        if (!match) return false;
        try { return JSON.parse(match[2]).recipeVersion === 2; } catch { return false; }
    });
    if (isHistoryRecipe) return parseHistoryMacro(recipeLines);
    return parseLegacyMacroText(text);
}

function parseLegacyMacroText(text) {
    const lines = text.split('\n').filter(l => l.trim() !== '');
    const parsed = [];
    // --- מעבר ראשון (Pass 1): השמדה הדדית של UNDO ו-REDO ---
    const cleanLines = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('] REDO ->')) {
            // מצאנו REDO. נחפש אחורה את ה-UNDO האחרון ברשימה הנקייה ונמחק אותו
            for (let j = cleanLines.length - 1; j >= 0; j--) {
                if (cleanLines[j].includes('] UNDO ->')) {
                    cleanLines.splice(j, 1);
                    break; // מצאנו ומחקנו, אפשר לעצור את החיפוש הפנימי
                }
            }
            // לא מוסיפים את שורת ה-REDO למערך הנקי
        } else {
            cleanLines.push(line);
        }
    }
    // --------------------------------------------------------

    
    // --- משתני עזר למנגנון דחיסת הזמן ---
    let lastTimestampMs = null; 
    let cumulativeDelta = 0; 
    let isSimulationRunning = false; 
    
    // --- משתני המנגנון החכם (Squashing & Undo) ---
    let pendingUIState = []; // ישמור פעולות הגדרה זמניות
    // רשימת הפעולות שמוגדרות כ"כפתורים בדרך" (הגדרות ממשק)
    const uiEvents = [
        'Sort by', 'Gravitational Sort Mode', 
        'Spiral Mode Changed', 'Magnet Mode Changed', 
        'Brightness Evo Mode Changed', 'DLA Mode Changed', 'Erosion Mode Changed', 'Game of Life Mode Changed', 'Chi Flow Mode Changed'
    ];

    // --- הוספה שלנו: קבוצת כפתורי הסימולציה הבלעדיים ---
    const simulationEvents = [
        'Gravitational Sort Mode', 'Spiral Mode Changed', 'Magnet Mode Changed', 
        'Brightness Evo Mode Changed', 'DLA Mode Changed', 'Erosion Mode Changed', 'Game of Life Mode Changed', 'Chi Flow Mode Changed'
    ];


    // פעולות המשנות את הלוח וניתנות לביטול (Undo)
    const boardChangingEvents = ['DRAW_STROKE', 'GO_DARK', 'SHUFFLE_COLORS', 'STEP FORWARD', 'Invert Colors', 'NUDGE', 'Palette Change', 'ADAPT_COLORS', 'SEPARATOR_CHANGE', 'GRID_RESIZE'];
    

    // --- גבולות זמן (במילי-שניות) ---
    const MAX_STATIC_WAIT = 1000;
    const MAX_ACTIVE_WAIT = 600000;
    const MAX_STEP_WAIT = 1000;

// פונקציית עזר לשחרור פעולות ממתינות (מכניסה לתור את ההחלטות הסופיות)
const flushPendingUI = () => {
    if (pendingUIState.length === 0) return;

    // מרווח זמן בטוח לעיבוד (50 מילישניות)
    const UI_DELAY = 50;

    pendingUIState.forEach((action, index) => {
                parsed.push({ 
                    delta: cumulativeDelta + (index * UI_DELAY), 
                    eventName: action.eventName, 
                    details: action.details, 
                    isUndoable: false,
                    isGenBased: false,
                    targetGen: null
                });
            });

    // מקדמים את הזמן הכללי כדי שהציור או ה-Play ימתינו לסיום ההכנות
    cumulativeDelta += pendingUIState.length * UI_DELAY;
    pendingUIState = []; // איפוס הרשימה לאחר השחרור
};


cleanLines.forEach(line => {
              // תמיכה גם בחותמת הזמן הרגילה וגם בחותמת הדור החדשה [GEN:XX]
              const match = line.match(/\[(\d{2}:\d{2}:\d{2}\.\d{3})\](?: \[GEN:(\d+)\])? (.*?) -> (.*)/);
              
              if (match) {
                const [_, timeStr, genStr, eventName, details] = match;
                const targetGen = genStr ? parseInt(genStr, 10) : null;
                const isGenBased = targetGen !== null;
                const dateObj = new Date(`1970-01-01T${timeStr}Z`);
            const timeMs = dateObj.getTime();

            if (lastTimestampMs === null) {
                                lastTimestampMs = timeMs;
                                parsed.push({ delta: 0, eventName, details, isUndoable: false, isGenBased, targetGen });
                
                if (eventName === 'PLAY') isSimulationRunning = true;
                if (eventName === 'PAUSE') isSimulationRunning = false;
                return;
            }

            const originalGap = timeMs - lastTimestampMs;
            let currentCap = isSimulationRunning ? MAX_ACTIVE_WAIT : MAX_STATIC_WAIT;
            if (eventName === 'STEP FORWARD') currentCap = MAX_STEP_WAIT;

            const compressedGap = Math.min(originalGap, currentCap);
            
            // שומרים את הזמן הנוכחי לפני שנוסיף לו את הפער החדש
            const timeBeforeThisAction = cumulativeDelta;
            cumulativeDelta += compressedGap;
            lastTimestampMs = timeMs;

// --- 1. מנגנון ה-Undo החכם (מחיקת ההיסטוריה וקיזוז הזמן) ---
if (eventName === 'UNDO') {
    for (let i = parsed.length - 1; i >= 0; i--) {
        
        // מקרה א': ביטול של ריצת סימולציה (מוחקים את כל הבלוק מ-PLAY ועד PAUSE)
        if (parsed[i].eventName === 'PAUSE') {
            // מחפשים את ה-PLAY התואם שהתחיל את הריצה הזו
            for (let j = i - 1; j >= 0; j--) {
                if (parsed[j].eventName === 'PLAY') {
                    const timeBeforePlay = parsed[j].delta;
                    
                    // חישוב הזמן "המת" שצריך לקזז מציר הזמן
                    const shift = cumulativeDelta - timeBeforePlay;
                    
                    // חיתוך כירורגי: מוחקים את ה-PLAY, ה-PAUSE, *וכל* הפעולות שקרו ביניהם
                    const deleteCount = i - j + 1;
                    parsed.splice(j, deleteCount); 
                    
                    // עדכון חותמות הזמן של פעולות הממשק ששרדו לאחר נקודת החיתוך
                    for (let k = j; k < parsed.length; k++) {
                        parsed[k].delta = Math.max(0, parsed[k].delta - shift);
                    }
                    
                    cumulativeDelta -= shift; // עדכון השעון הכללי
                    break;
                }
            }
            break; // סיימנו לטפל בלחיצת ה-Undo הזו
        } 
        
        // מקרה ב': ביטול של פעולת לוח רגילה (ציור, רנדומיזציה וכו')
        else if (parsed[i].isUndoable) {
            const timeOfMistake = parsed[i].delta;
            
            // חישוב הזמן "המת" שצריך לקזז מציר הזמן
            const shift = cumulativeDelta - timeOfMistake;
            
            parsed.splice(i, 1); // מחיקת פעולת הלוח מהתור
            
            // עדכון חותמות הזמן של פעולות הממשק ששרדו לאחר מחיקת הטעות
            for (let k = i; k < parsed.length; k++) {
                parsed[k].delta = Math.max(0, parsed[k].delta - shift);
            }
            
            cumulativeDelta -= shift; // עדכון השעון הכללי
            break;
        }
    }
    return; // מדלגים ולא דוחפים את ה-UNDO עצמו לתור
}

// --- 2. מנגנון סינון ה"כפתורים בדרך" (Squashing) ---
            if (!isSimulationRunning && uiEvents.includes(eventName)) {
                
                // התיקון שלנו: אם המשתמש לחץ על סימולציה, מוחקים מהתור סימולציות אחרות שהוא התלבט לגביהן
                if (simulationEvents.includes(eventName)) {
                    pendingUIState = pendingUIState.filter(a => !simulationEvents.includes(a.eventName));
                }

                const existingIndex = pendingUIState.findIndex(a => a.eventName === eventName);
                if (existingIndex !== -1) {
                    pendingUIState[existingIndex].details = details; // דורסים את הקליק הישן (למשל החלפת פלטה)
                } else {
                    pendingUIState.push({ eventName, details }); // מוסיפים קליק חדש
                }
                
                // מקזזים את הזמן של הלחיצה הזו מציר הזמן, כדי שלא תייצר עיכוב שווא
                cumulativeDelta = timeBeforeThisAction;
                return; 
            }
            
            // הגענו לכאן? מדובר בפעולה רגילה או פעולת ביצוע מהותית.
            // קודם נשחרר את כל שינויי הממשק שהמתינו (אם היו כאלו) אל התור.
            flushPendingUI();

            if (eventName === 'PLAY') isSimulationRunning = true;
            if (eventName === 'PAUSE') isSimulationRunning = false;

            // בודקים אם זו פעולה שניתן לעשות לה Undo בעתיד
            const isUndoable = boardChangingEvents.includes(eventName) || 
                               (eventName === '--' && details === 'Palette Randomized');

            // דחיפת הפעולה לתור המאקרו להפעלה
            parsed.push({ delta: cumulativeDelta, eventName, details, isUndoable, isGenBased, targetGen });
        }
    });

    // דחיפה אחרונה למקרה שהקובץ הסתיים עם שינויי ממשק שטרם שוחררו
    flushPendingUI();
    
    return parsed;
}

function toggleMacroFullScreen() {
    isMacroFullscreen = !isMacroFullscreen;
    const isDesktop = window.innerWidth > 768; // זיהוי פשוט של דסקטופ לפי רוחב המסך

    if (isMacroFullscreen) {
        dom.appContainer.classList.add('macro-fullscreen'); // הסתרת הממשק שלנו
        
    // בקשת מסך מלא אמיתי מהדפדפן - פועל כעת גם בדסקטופ וגם במובייל!
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => console.log("Fullscreen API blocked", err));
    }
    } else {
        dom.appContainer.classList.remove('macro-fullscreen'); // החזרת הממשק
        
        // יציאה ממסך מלא של הדפדפן
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
    }
    updateLayout(); // קורא למנוע למתוח את הקנבס
}

// מאזין ליציאה ממסך מלא (למשל לחיצה על Esc) כדי להחזיר את לוח הבקרה למקום
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && isMacroFullscreen) {
        isMacroFullscreen = false;
        dom.appContainer.classList.remove('macro-fullscreen');
        updateLayout();
    }
});


function stopMacro() {
    clearTimeout(macroTimerId);
    macroQueue = [];
    isMacroLoaded = false;
    isMacroPlaying = false;
    replayNudgeTiming = null;
    currentMacroStep = 0;
    pendingMacroPalette = null; 
    isSelectingMacroPalette = false; 
    
    // --- תוספת: יציאה ממסך מלא אוטומטית עם אנימציה חלקה ---
    if (typeof isMacroFullscreen !== 'undefined' && isMacroFullscreen) {
        animateBoardTransition(() => {
            toggleMacroFullScreen();
            dom.macroOverlay.classList.remove('active', 'running');
        });
    } else {
        // מעלים את הכל בלחיצה (במידה ולא היינו במסך מלא)
        dom.macroOverlay.classList.remove('active', 'running');
        dom.boardOverlay.style.opacity = '0';
    }
}


function playMacro() {
    if (!isMacroLoaded || currentMacroStep >= macroQueue.length) return;
    
    isMacroPlaying = true;
    isSelectingMacroPalette = false; // איפוס בטיחות למקרה שהמודל נסגר ידנית
    
    // מפעיל את ה"ריצה" שמסתירה את הכפתור אבל משאירה את הרקע הכהה
    dom.macroOverlay.classList.add('running');
    dom.boardOverlay.style.opacity = '0'; // מעלים את ההחשכה מהגריד בפייד-אאוט

    macroStartTime = performance.now() - (currentMacroStep > 0 ? macroQueue[currentMacroStep - 1].delta : 0);
    scheduleNextMacroStep();
}


function pauseMacro() {
    isMacroPlaying = false;
    clearTimeout(macroTimerId);
    dom.macroOverlay.classList.remove('active');
    dom.iconPlay.style.display = 'block';
    dom.iconPause.style.display = 'none';
}

function scheduleNextMacroStep() {
        if (!isMacroPlaying || currentMacroStep >= macroQueue.length) return;
    
        const nextAction = macroQueue[currentMacroStep];
    
        // אם הפעולה הבאה מבוססת על מספר דורות בסימולציה שרצה כרגע,
        // אנחנו לא מתזמנים טיימר! gameLoop יקרא לפעולה הזו באופן טבעי.
        if (nextAction.isGenBased) return;
    
        const targetTime = macroStartTime + nextAction.delta;
        const delay = Math.max(0, targetTime - performance.now());
    
        macroTimerId = setTimeout(() => {
        
        if (!isMacroPlaying) return;
        
        executeMacroAction(nextAction);
        currentMacroStep++;

        if (currentMacroStep >= macroQueue.length) {
            stopMacro(); // סיום מבוקר של המאקרו
            if (isLifePlaying) pauseLife(); // אם נשארה סימולציה רצה, נעצור אותה
        } else {
            scheduleNextMacroStep(); // מכין את הפקודה הבאה בתור
        }
    }, delay);
}

function applyMacroRules(details) {
    // מחלצים מתוך הטקסט את שם הסימולציה, שיטת המיון ואת אובייקט ה-JSON של החוקים
    let match = details.match(/Armed: (\w+)\s+\|\s+Sort:\s+([\w-]+)\s+\|\s+Rules:\s+(.*)/);
    let sim, sortMethod, rulesStr;

    if (match) {
        sim = match[1];
        sortMethod = match[2];
        rulesStr = match[3];
    } else {
        // תאימות לאחור: לקבצי מאקרו ישנים שאין בהם את שיטת המיון
        match = details.match(/Armed: (\w+)\s+\|\s+Rules:\s+(.*)/);
        if (!match) return null;
        sim = match[1];
        rulesStr = match[2];
    }

// כופה את שיטת המיון אם היא קיימת ואינה תואמת למה שמוגדר כרגע בקנבס
if (sortMethod && currentSortMethod !== sortMethod) {
    applySortMethod(sortMethod);
    if (typeof updateSortButtonUI === 'function') updateSortButtonUI();
}


    // מוודאים שהסימולציה הנכונה חמושה בממשק
    if (armedSimulation !== sim) armSimulation(sim);

    if (sim === 'nudgeBrighter' || sim === 'nudgeDarker') {
        applyNudgeTiming(rulesStr);
        return sim;
    }
    replayNudgeTiming = null;

    // הטמעת החוקים (Rules Injection)
    if (rulesStr !== "No specific rules mapping") {
        try {
            if (sim === 'brightnessEvo') {
                brightnessEvoMode = rulesStr.replace('Mode: ', '');
                if (typeof updateBrightnessEvoButtonUI === 'function') updateBrightnessEvoButtonUI();
            } else if (sim === 'breathe') {
                breatheEvoMode = rulesStr.replace('Mode: ', '');
                if (typeof updateBreatheEvoButtonUI === 'function') updateBreatheEvoButtonUI();
            } else {
                const parsedRules = JSON.parse(rulesStr);
                if (sim === 'gameOfLife') restoreGameOfLifeRules(parsedRules);
                else if (sim === 'gravitationalSort') {
                    Object.assign(gravitationalSortRules, parsedRules);
                    gsMode = parsedRules.direction || gsMode;
                    if (typeof updateGravitationalSortButtonUI === 'function') updateGravitationalSortButtonUI();
                }
                else if (sim === 'erosion') {
                    Object.assign(erosionRules, parsedRules);
                    erosionRules.mode = ['channels', 'channels-solid'].includes(parsedRules.mode) ? parsedRules.mode : 'legacy';
                    updateErosionButtonUI();
                }
                else if (sim === 'dla') {
                    if (parsedRules.mode) dlaMode = parsedRules.mode;
                    Object.assign(dlaRules, parsedRules);
                    if (typeof updateDlaButtonUI === 'function') updateDlaButtonUI();
                }
                else if (sim === 'contour') Object.assign(contourRules, parsedRules);
                else if (sim === 'spiral') {
                    Object.assign(spiralRules, parsedRules);
                    spiralMode = parsedRules.method || spiralMode;
                    if (typeof updateSpiralButtonUI === 'function') updateSpiralButtonUI();
                }
                else if (sim === 'magnet') {
                    Object.assign(magnetRules, parsedRules);
                    magnetMode = parsedRules.method || magnetMode;
                    if (typeof updateMagnetButtonUI === 'function') updateMagnetButtonUI();
                }
                else if (sim === 'sandpile') restoreChiFlowRules(parsedRules);
                else if (sim === 'turing') Object.assign(turingRules, parsedRules);
            }
        } catch (e) {
            console.error("Failed to parse macro rules:", e);
        }
    }
    return sim;
}



function executeMacroAction(action) {
    //console.log("Macro Execution:", action.eventName, "->", action.details);
    isExecutingMacroCommand = true; // מדליקים דגל כדי לא להפעיל את ה-Kill Switch

    // הזרקה אקטיבית: המאקרו מדווח באופן יזום ומוחלט על כל פעולה שהוא מנגן, ומונע כפילויות!
        // Undo/redo log their resolved target below, including when replaying an old recipe.
        if (action.eventName !== 'UNDO' && action.eventName !== 'REDO') {
            window.logArtEvent(action.eventName, action.details, true);
        }

    // === פיענוח ופריסת המצב ההתחלתי ===
    if (action.eventName === 'INIT_STATE') {
        try {
            const initState = JSON.parse(action.details);
            

            // 1. הגדרת משתני הסביבה ההתחלתיים
            n = initState.n;
            // אם המשתמש בחר פלטה חלופית (pendingMacroPalette), נדרוס את המקורית
            activePaletteIndex = pendingMacroPalette !== null ? pendingMacroPalette : initState.pal;
            separatorPx = initState.sep;
            

            if (currentSortMethod !== initState.sort) {
                applySortMethod(initState.sort);
            }

            syncSelectedColorWithPalette();

            // 2. יצירת לוח ריק בגודל הנכון ושחזור הצבעים מהמחרוזת הדחוסה
            initializeBoardAndCanvas(true); 
            const boardParts = initState.board.split(',');
            let tileIndex = 0;
            
            boardParts.forEach(part => {
                const [countStr, kStr] = part.split('x');
                const count = parseInt(countStr, 10);
                const kVal = parseInt(kStr, 10);
                
                for (let i = 0; i < count; i++) {
                    if (boardState[tileIndex]) {
                        boardState[tileIndex].k = kVal;
                        boardState[tileIndex].v = kVal;
                        boardState[tileIndex].isGold = false; // ויתרנו על הזהב במאקרו
                    }
                    tileIndex++;
                }
            });

            // 3. עדכון הממשק (UI)
            updatePaletteHeader();
            applySeparator();
            if (typeof updateSortButtonUI === 'function') updateSortButtonUI();
            renderToScreen(null);
            historyRecipeCursor = artRecipeLog.length;

        } catch(e) {
            console.error("Failed to parse INIT_STATE:", e);
        }
    }
    // ==================================
    

    else if (action.eventName === 'HISTORY_SETTINGS') {
        if (isLifePlaying) pauseLife();
        applyHistorySettings(JSON.parse(action.details));
        historyRecipeCursor = artRecipeLog.length;
    }
    else if (action.eventName === 'Palette Change') {
        // מפרידים בין שם הפלטה לשיטת המיון (אם קיימת)
        const parts = action.details.split(' | Sort: ');
        const paletteName = parts[0];
        const sortMethod = parts[1];

        // מעדכנים את שיטת המיון קודם, אם היא סופקה ולא תואמת לנוכחית
        if (sortMethod && currentSortMethod !== sortMethod) {
            applySortMethod(sortMethod);
            if (typeof updateSortButtonUI === 'function') updateSortButtonUI();
        }

        const pIndex = C.PALETTES.findIndex(p => p.name === paletteName || p.originalName === paletteName);
        if(pIndex !== -1) switchToPalette(pIndex);
    }


    else if (action.eventName === '--' && action.details === 'Palette Randomized') {
        randomizeAll();
    } 
    else if (action.eventName === 'GO_DARK') {
        performAction(goDark);
    }
    else if (action.eventName === 'ADAPT_COLORS') {
        adaptColors();
    }
    else if (action.eventName === 'Sort by') {
        applySortMethod(action.details);
        if (typeof updateSortButtonUI === 'function') updateSortButtonUI();
    }

    else if (action.eventName === 'NUDGE_SPEED') {
        applyNudgeTiming(action.details);
    }
    else if (action.eventName === 'PAUSE') {
        pauseLife();
    } 
    else if (action.eventName === 'PLAY') {
        const sim = applyMacroRules(action.details);
        if (sim && !isLifePlaying) togglePlayPauseLife();
    } 
    else if (action.eventName === 'STEP FORWARD') {
        applyMacroRules(action.details);
        stepForward();
    }
    else if (action.eventName === 'UNDO') {
        undo();
    }
    else if (action.eventName === 'REDO') {
        redo();
    }
    else if (action.eventName === 'SEPARATOR_CHANGE') {
        separatorPx = parseInt(action.details, 10);
        applySeparator();
    }
    else if (action.eventName === 'GRID_RESIZE') {
        _performResize(parseInt(action.details, 10));
    }
    else if (action.eventName === 'Game of Life Mode Changed') {
        const snapshot = JSON.parse(action.details);
        if (snapshot.mode === 'off') {
            if (armedSimulation === 'gameOfLife') armSimulation(null);
        } else if (armedSimulation !== 'gameOfLife') {
            armSimulation('gameOfLife');
        }
        restoreGameOfLifeRules(snapshot);
    }
    else if (action.eventName === 'Chi Flow Mode Changed') {
        const snapshot = JSON.parse(action.details);
        if (snapshot.mode === 'off') {
            if (armedSimulation === 'sandpile') armSimulation(null);
        } else if (armedSimulation !== 'sandpile') {
            armSimulation('sandpile');
        }
        restoreChiFlowRules(snapshot);
    }
    else if (action.eventName === 'Erosion Mode Changed') {
        if (action.details === 'off') {
            if (armedSimulation === 'erosion') {
                pauseLife();
                armSimulation(null);
            }
        } else if (['legacy', 'channels', 'channels-solid'].includes(action.details)) {
            if (armedSimulation !== 'erosion') armSimulation('erosion');
            erosionRules.mode = action.details;
        }
        updateErosionButtonUI();
    }
    else if (action.eventName === 'Gravitational Sort Mode') {
                if (action.details === 'off') {
                    if (armedSimulation === 'gravitationalSort') armSimulation(null);
                } else {
                    if (armedSimulation !== 'gravitationalSort') armSimulation('gravitationalSort');
                    gravitationalSortRules.direction = action.details;
                }
                gsMode = action.details;
                if (typeof updateGravitationalSortButtonUI === 'function') updateGravitationalSortButtonUI();
            }
            else if (action.eventName === 'Spiral Mode Changed') {
                if (action.details === 'off') {
                    if (armedSimulation === 'spiral') armSimulation(null);
                } else {
                    if (armedSimulation !== 'spiral') armSimulation('spiral');
                    spiralRules.method = action.details;
                }
                spiralMode = action.details;
                if (typeof updateSpiralButtonUI === 'function') updateSpiralButtonUI();
            }
            else if (action.eventName === 'Magnet Mode Changed') {
                if (action.details === 'off') {
                    if (armedSimulation === 'magnet') armSimulation(null);
                } else {
                    if (armedSimulation !== 'magnet') armSimulation('magnet');
                    magnetRules.method = action.details;
                }
                magnetMode = action.details;
                if (typeof updateMagnetButtonUI === 'function') updateMagnetButtonUI();
            }
            else if (action.eventName === 'Brightness Evo Mode Changed') {
                if (action.details === 'off') {
                    if (armedSimulation === 'brightnessEvo') armSimulation(null);
                } else {
                    if (armedSimulation !== 'brightnessEvo') armSimulation('brightnessEvo');
                }
                brightnessEvoMode = action.details;
                if (typeof updateBrightnessEvoButtonUI === 'function') updateBrightnessEvoButtonUI();
            }
            else if (action.eventName === 'DLA Mode Changed') {
                if (action.details === 'off') {
                    if (armedSimulation === 'dla') armSimulation(null);
                } else {
                    if (armedSimulation !== 'dla') armSimulation('dla');
                }
                dlaMode = action.details;
                if (typeof updateDlaButtonUI === 'function') updateDlaButtonUI();
            }
            

        else if (action.eventName === 'NUDGE') {
            // מפרידים בין כיוון ההזזה לשיטת המיון (אם קיימת, לטובת תאימות לאחור)
            const parts = action.details.split(' | Sort: ');
            const direction = parts[0];
            const sortMethod = parts[1];

            // מעדכנים את שיטת המיון קודם, אם היא סופקה ולא תואמת לנוכחית
            if (sortMethod && currentSortMethod !== sortMethod) {
                applySortMethod(sortMethod);
                if (typeof updateSortButtonUI === 'function') updateSortButtonUI();
            }

            if (direction === 'Brighter') {
                nudgeColors(1);
                armSimulation('nudgeBrighter');
            } else if (direction === 'Darker') {
                nudgeColors(-1);
                armSimulation('nudgeDarker');
            }
        }
        


        else if (action.eventName === 'DLA Mode Changed') {
            if (action.details === 'off') {
                if (armedSimulation === 'dla') armSimulation(null);
            } else {
                if (armedSimulation !== 'dla') armSimulation('dla');
            }
            dlaMode = action.details;
            if (typeof updateDlaButtonUI === 'function') updateDlaButtonUI();
        }

else if (action.eventName === 'Invert Colors') {
            // מפרידים את שיטת המיון מתוך פרטי הפעולה
            const parts = action.details.split('Sort: ');
            const sortMethod = parts[1];

            // מעדכנים את שיטת המיון קודם, אם היא סופקה ולא תואמת לנוכחית
            if (sortMethod && currentSortMethod !== sortMethod) {
                applySortMethod(sortMethod);
                if (typeof updateSortButtonUI === 'function') updateSortButtonUI();
            }

            invertGrid();
        }


        else if (action.eventName === 'DRAW_STROKE' || action.eventName === 'SHUFFLE_COLORS') {
            try {
                const diff = JSON.parse(action.details);
                const now = performance.now();
                let changed = action.eventName === 'SHUFFLE_COLORS';
                
                // === תיקון באג ה-Undo: שמירת מצב *לפני* שהמאקרו מצייר ===
                const beforeState = getCurrentState();

                diff.forEach(change => {
                    const tile = boardState[change.i];
                    if (tile) {
                        tile.prevK = tile.k;
                        tile.animStart = now;
                        tile.k = change.k;
                        tile.v = change.k; 
                        tile.isGold = false; 
                        changed = true;
                    }
                });
                
                if (changed) {
                    renderToScreen(now);
                    startAnimationLoop(); 
                    
                    // === תיקון באג ה-Undo: דחיפת המצבים להיסטוריה *אחרי* שהמאקרו צייר ===
                    const afterState = getCurrentState();
                    pushHistory({ before: beforeState, after: afterState });
                    hasPerformedInitialAutofill = true;
                }
            } catch(e) { 
                console.error("Macro Draw Playback Error:", e); 
            }
        }
        


        isExecutingMacroCommand = false; // מכבים את הדגל
    }


        async function initializeApp() {
        // --- Safari Aggressive Zoom Protections ---        
        // מניעת זום של ספארי בלחיצה כפולה ברמת המסמך כולו
        document.addEventListener('dblclick', function(event) {
            event.preventDefault();
        }, { passive: false });

        // מניעת זום של ספארי בצביטה (Pinch to zoom)
        document.addEventListener('gesturestart', function(event) {
            event.preventDefault();
        });
        
        // ------------------------------------------

        const splashScreen = document.getElementById('splashScreen'), splashText = document.getElementById('splashText');
        initializeLanguage();
        onLanguageChange(updateAllUIText);
        
        // Phase 1 Addition: Add adaptColors to the context for modals
        const contextForModals = {
            isSimulationMode: () => isSimModeActive,
            SORT_MODES,
            getSortCycleMethods: () => [...sortCycleMethods],
            saveSortCycleMethods: methods => {
                sortCycleMethods = normalizeSortCycle(methods);
                return persistSortCycle(sortCycleMethods);
            },
            dom, C, getText, getCurrentLang, performAction, getSymmetricIndices, applyActionToTiles,
            getNudgeSettings: () => ({ intervalMs: nudgeIntervalMs }),
            isNudgeReplayActive: () => isMacroLoaded,
            setNudgeInterval, persistNudgeSettings,
            getStartupSettings: () => ({ ...startupSettings }),
            saveStartupSettings: (settings) => {
                const normalized = normalizeStartup(settings);
                const persisted = persistStartup(normalized);
                startupSettings = normalized;
                return persisted;
            },
            getCurrentStartupSettings: () => ({
                paletteName: C.PALETTES[activePaletteIndex].originalName,
                boardSize: n, separatorPx, sortMethod: currentSortMethod,
                fill: startupSettings.fill, brushSize,
                brushMode: isContinuousBrushOn ? 'continuous' : isBrushModeOn ? 'paint' : 'copy',
                brushColor: isRainbowModeActive ? 'rainbow' : selectedColor === sortColorsArray(palette(), 'luminance')[0] ? 'darkest' :
                    selectedColor === sortColorsArray(palette(), 'luminance').at(-1) ? 'lightest' : 'none',
                symmetry: symmetryMode, interfaceMode: isSimModeActive ? 'simulation' : 'creative'
            }),
            getSimulationInit: () => ({ ...simulationInitSettings }),
            saveSimulationInit: (settings) => {
                const persisted = persistSimInit(settings);
                simulationInitSettings = { ...settings };
                return persisted;
            },
            getN: () => n, isBreathing: () => isBreathing, isLifePlaying: () => isLifePlaying,
            _performResize, animateBoardTransition,
            setColorPickerPage: (p) => { colorPickerPage = p; }, getColorPickerPage: () => colorPickerPage,
            getActivePaletteIndex: () => activePaletteIndex, createRainbowIconSVG, navigateColorPages,
            setSelectedColor: (c) => { 
                selectedColor = c; 
                selectedColorIndex = c ? palette().indexOf(c) : -1;
            },
            setIsRainbowModeActive: (b) => { isRainbowModeActive = b; },
            isRainbowModeActive: () => isRainbowModeActive,
            updateGlowEffect, updateColorPickerButtonUI,
            paletteLen, getSelectedColorIndex: () => selectedColorIndex,
            switchToPalette,
            getGameOfLifeRules: () => gameOfLifeRules, setGameOfLifeRules: setPersonalGameOfLifeRules,
            getGameOfLifeCycle: () => ({ slots: gameOfLifeCycle.map(cloneGameOfLifeRules), sources: [...gameOfLifeSources], yoursRules: cloneGameOfLifeRules(personalGameOfLifeRules), index: ['personal', 'shuffle', 'coral'].indexOf(gameOfLifeMode) }),
            setGameOfLifeCycle,
            getGravitationalSortRules: () => gravitationalSortRules, setGravitationalSortRules: (r) => { gravitationalSortRules = r; },
syncGsModeFromModal: (direction) => {
                if (armedSimulation !== 'gravitationalSort') {
                    armSimulation('gravitationalSort'); // קודם מחמשים כדי לאפס מצבים אחרים בלוח
                }
                // מעדכנים למצב שנבחר במודל ומרעננים את האייקון
                gsMode = direction;
                gravitationalSortRules.direction = direction;
                updateGravitationalSortButtonUI();
            },

            getDlaRules: () => dlaRules, setDlaRules: (r) => { dlaRules = r; },
            getContourRules: () => contourRules, setContourRules: (r) => { contourRules = r; }, // <-- ADDED HERE

spiralRules,
syncSpiralModeFromModal: (method) => {
    if (armedSimulation !== 'spiral') {
        armSimulation('spiral');
    }
    spiralMode = method;
    spiralRules.method = method;
    updateSpiralButtonUI();
},

syncMagnetFromModal: (method, anchorIndex) => {
    if (armedSimulation !== 'magnet') armSimulation('magnet');
    magnetMode = method;
    magnetRules.method = method;
    magnetRules.anchorColorIndex = anchorIndex;
    updateMagnetButtonUI();
},

getChiFlowRules: () => chiFlowRules, setChiFlowRules: setPersonalChiFlowRules,
getChiFlowCycle: () => ({ slots: chiFlowCycle.map(cloneChiFlowRules), sources: [...chiFlowSources], yoursRules: cloneChiFlowRules(personalChiFlowRules), index: ['personal', 'ripples', 'nova'].indexOf(chiFlowMode) }),
setChiFlowCycle,
getTuringRules: () => turingRules, setTuringRules: (r) => { turingRules = r; },
getMagnetRules: () => magnetRules, 
setMagnetRules: (r) => { magnetRules = r; },



            handleSaveProject, handleLoadProject, onProjectFileSelected, resetArtRecipeLog, exportArtRecipeLog,
            pointerState,
            resetWasLongPress,
downloadImage: shareOrDownloadImage,
            // startBreatheAnimation is removed
            adaptColors, 
applySortMethod,
        };
        modals = initializeModals(contextForModals);
        
        activePaletteIndex = C.PALETTES.findIndex(p => p.originalName === startupSettings.paletteName);
        n = startupSettings.boardSize;
        updateLayout();
        separatorPx = fitStartupSeparator(n, startupSettings.separatorPx, dom.boardCanvas.clientWidth);
        currentSortMethod = startupSettings.sortMethod;
        C.PALETTES.forEach(p => { p.colors = sortColorsArray(p.originalColors, currentSortMethod); });
        updateSortButtonUI();
        brushSize = startupSettings.brushSize;
        document.getElementById('brushSizeSlider').value = brushSize;
        document.getElementById('brushSizeValue').textContent = brushSize;
        symmetryMode = startupSettings.symmetry;
        isRainbowModeActive = startupSettings.brushColor === 'rainbow';
        const brightnessOrder = sortColorsArray(palette(), 'luminance');
        const darkestIndex = palette().indexOf(brightnessOrder[0]);
        const lightestIndex = palette().indexOf(brightnessOrder.at(-1));
        selectedColorIndex = startupSettings.brushColor === 'darkest' ? darkestIndex :
            startupSettings.brushColor === 'lightest' ? lightestIndex : -1;
        selectedColor = selectedColorIndex >= 0 ? palette()[selectedColorIndex] : null;
        initializeBoardAndCanvas(true);
        if (startupSettings.fill === 'random') fillRandom();
        else {
            if (startupSettings.fill === 'seed') applyInitialPattern();
            const initialIndex = startupSettings.fill === 'light' ? lightestIndex : darkestIndex;
            boardState.forEach(tile => {
                if (!tile.isGold) { tile.k = initialIndex; tile.v = initialIndex; }
            });
        }
        hasPerformedInitialAutofill = true;
        applySeparator();
        updateUndoRedoButtons();
        setBrushMode(startupSettings.brushMode !== 'copy', startupSettings.brushMode === 'continuous');
        if (startupSettings.interfaceMode === 'simulation') toggleSimMode();
        updateSymmetryUI();
updateBrightnessEvoButtonUI();
        updateBreatheEvoButtonUI(); // Add this
        updateColorPickerButtonUI();
        updateGlowEffect();
        updateLayout();
        updateAllUIText();
        logCurrentStateAsInit();

        
        const boardCanvas = dom.boardCanvas;
        boardCanvas.addEventListener('pointerdown', onPointerDown);
        boardCanvas.addEventListener('pointermove', onPointerMove);
        boardCanvas.addEventListener('pointerup', onPointerUp);
        boardCanvas.addEventListener('pointercancel', onPointerUp);
        boardCanvas.addEventListener('lostpointercapture', e => {
            if (isContinuousBrushOn) onPointerUp(e);
        });
        
        dom.btnRandom.addEventListener('click', (e) => handleCtrlClick(e, randomizeAll));
        dom.macroOverlay.addEventListener('click', (e) => handleCtrlClick(e, stopMacro));

        if (dom.btnMacroPlay) {
            dom.btnMacroPlay.addEventListener('click', (e) => {
                e.stopPropagation(); // קריטי! מונע מהלחיצה לעבור לאוברליי ולכבות את המאקרו בטעות
                handleCtrlClick(e, playMacro);
            });
        }
        
        // --- האזנה לכפתור החלפת פלטה למאקרו ---
        if (dom.btnChangeInitPalette) {
            dom.btnChangeInitPalette.addEventListener('click', (e) => {
                e.stopPropagation(); // מונע כיבוי של המאקרו בגלל לחיצה על האוברליי
                isSelectingMacroPalette = true;
                if (modals && typeof modals.openPaletteModal === 'function') {
                    modals.openPaletteModal();
                }
            });
        }

        dom.btnInvert.addEventListener('click', (e) => handleCtrlClick(e, invertGrid));

bindPickerGestures(dom.btnPalette, {
    onTap: switchPalette, onOpen: modals.openPaletteModal,
    onHold: switchPaletteGroup,
    canInteract: () => !isBreathing && !(isLifePlaying && armedSimulation === 'breathe'), beforeStart: hideLongPressDisplay,
    holdMs: C.LONG_PRESS_SHOW_MS
});

        dom.btnResetBoard.addEventListener('click', (e) => handleCtrlClick(e, () => animateBoardTransition(resetToGoldAndDefaultPalette)));
        dom.btnSpecialReset.addEventListener('click', (e) => handleCtrlClick(e, () => animateBoardTransition(() => performAction(specialReset))));
        dom.btnResizeUp.addEventListener('click', (e) => handleCtrlClick(e, () => resizeGrid(true)));
        dom.btnResizeDown.addEventListener('click', (e) => handleCtrlClick(e, () => resizeGrid(false)));
        dom.btnSave.addEventListener('click', (e) => handleCtrlClick(e, openSaveModalWithPreview));
        dom.btnGap.addEventListener('click', (e) => handleCtrlClick(e, cycleSeparator));
        dom.btnBrushMode.addEventListener('click', (e) => handleCtrlClick(e, toggleBrushMode));
        dom.btnUndo.addEventListener('click', (e) => handleCtrlClick(e, undo));
        dom.btnRedo.addEventListener('click', (e) => handleCtrlClick(e, redo));
        dom.btnTutorial.addEventListener('click', (e) => handleCtrlClick(e, modals.openHelpModal));
        dom.btnSymmetry.addEventListener('click', (e) => handleCtrlClick(e, cycleSymmetryMode));
bindPickerGestures(dom.btnCycleSort, {
    onTap: cycleSortMethod, onOpen: modals.openSortCycleModal,
    onHold: () => selectSortMethod(sortCycleMethods[0]),
    canInteract: () => !isBreathing && !(isLifePlaying && armedSimulation === 'breathe'), beforeStart: hideLongPressDisplay,
    holdMs: C.LONG_PRESS_SHOW_MS
});
dom.btnCycleSort.addEventListener('keydown', e => {
    if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault(); modals.openSortCycleModal();
    }
});
bindPickerGestures(dom.btnColorPicker, {
    onTap: handleColorPickerClick, onOpen: modals.openColorPickerModal,
    onHold: () => {
        selectedColorIndex = 0;
        selectedColor = palette()[0];
        isRainbowModeActive = false;
        updateGlowEffect(); updateColorPickerButtonUI();
    },
    onExtendedHold: () => {
        selectedColor = null;
        selectedColorIndex = -1;
        isRainbowModeActive = true;
        updateGlowEffect(); updateColorPickerButtonUI();
    },
    canInteract: () => !isBreathing && !(isLifePlaying && armedSimulation === 'breathe'), beforeStart: hideLongPressDisplay,
    holdMs: C.LONG_PRESS_SHOW_MS
});
        dom.btnDark.addEventListener('click', (e) => handleCtrlClick(e, goDarkAction));
        dom.btnToggleSimMode.addEventListener('click', (e) => handleCtrlClick(e, toggleSimMode));
        // A swipe opens settings only for the selected, paused evolution.
        // Tap actions stay independent of that restriction.
        const evolutionPickers = [
            [dom.btnGameOfLife, 'gameOfLife', cycleGameOfLifeMode, modals.openGolSettingsModal],
            [dom.btnGravitationalSort, 'gravitationalSort', cycleGravitationalSortMode, modals.openGravitationalSortSettingsModal],
            [dom.btnContour, 'contour', () => armSimulation('contour'), modals.openContourSettingsModal],
            [dom.btnSpiral, 'spiral', cycleSpiralMode, modals.openSpiralSettingsModal],
            [dom.btnMagnetModes, 'magnet', cycleMagnetMode, modals.openMagnetSettingsModal],
            [dom.btnSandpile, 'sandpile', cycleChiFlowMode, modals.openChiFlowSettingsModal],
            [dom.btnTuring, 'turing', () => armSimulation('turing'), modals.openTuringSettingsModal],
            [dom.btnNudgeBrighter, 'nudgeBrighter', handleNudgeBrighterClick, modals.openNudgeSettingsModal],
            [dom.btnNudgeDarker, 'nudgeDarker', handleNudgeDarkerClick, modals.openNudgeSettingsModal]
        ].filter(([button]) => button);
        const evolutionPickerButtons = new Set(evolutionPickers.map(([button]) => button));
        evolutionPickers.forEach(([button, simulation, onTap, onOpen]) => {
            bindPickerGestures(button, {
                onTap, onOpen,
                canInteract: () => !isBreathing,
                canOpen: () => !isLifePlaying && armedSimulation === simulation,
                beforeStart: hideLongPressDisplay, holdMs: C.LONG_PRESS_SHOW_MS
            });
        });

dom.btnBrightnessEvo.addEventListener('click', (e) => handleCtrlClick(e, cycleBrightnessEvoMode));

dom.btnShowBreatheMenu.addEventListener('click', (e) => handleCtrlClick(e, cycleBreatheEvoMode));

        dom.btnErosion.addEventListener('click', (e) => handleCtrlClick(e, cycleErosionMode));

dom.btnDla.addEventListener('click', (e) => handleCtrlClick(e, cycleDlaMode));

if (dom.btnSimSettings) {
            dom.btnSimSettings.addEventListener('click', (e) => handleCtrlClick(e, openCurrentSimSettings));
        }

        dom.btnPlayPauseLife.addEventListener('click', (e) => handleCtrlClick(e, togglePlayPauseLife));
        dom.btnStepForward.addEventListener('click', (e) => handleCtrlClick(e, stepForward));

        dom.btnLangToggle.addEventListener('click', toggleLanguage);
        // dom.btnExitBreathe.addEventListener('click', stopBreatheAnimation); // Removed
        
        document.querySelectorAll('.ctrl').forEach(btn => { 
            if (btn === dom.btnPalette || btn === dom.btnColorPicker || btn === dom.btnCycleSort || evolutionPickerButtons.has(btn)) return;
            btn.addEventListener('pointerdown', handlePointerDownCtrl); 
            btn.addEventListener('pointerup', hideLongPressDisplay); 
            btn.addEventListener('pointerleave', hideLongPressDisplay); 
            btn.addEventListener('pointercancel', hideLongPressDisplay);
        });
        dom.btnToggleSimMode.addEventListener('pointermove', e => {
            const box = simulationHoldBounds;
            if (box && (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom)) {
                hideLongPressDisplay();
            }
        });
// Brush Size Slider Logic
const brushSizeSlider = document.getElementById('brushSizeSlider');
const brushSizeValue = document.getElementById('brushSizeValue');
if (brushSizeSlider) {
    brushSizeSlider.addEventListener('input', (e) => {
        brushSize = parseInt(e.target.value, 10);
        if(brushSizeValue) brushSizeValue.textContent = brushSize;
    });
}


        window.addEventListener('resize', updateLayout);
        window.addEventListener('contextmenu', e => e.preventDefault());
        
        splashText.style.animation = 'fadeInText 2.5s linear forwards';
        await new Promise(r => setTimeout(r, 5000));
        splashText.style.animation = 'fadeOutText 1.5s linear forwards';
        await new Promise(r => setTimeout(r, 1500));
        splashScreen.style.opacity = '0';
        await new Promise(r => setTimeout(r, 2000));
        splashScreen.remove();
      }

      initializeApp();

})();
