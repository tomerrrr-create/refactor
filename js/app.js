// js/app.js

import { getText, setCurrentLang, initializeLanguage, getCurrentLang, getAvailableLangs, translations, onLanguageChange } from './i18n.js';
import * as C from './constants.js';
import * as Simulations from './simulations.js';
import { dom } from './dom-elements.js';
import { initializeModals } from './ui-modals.js';

(function() {
      let canvas, ctx;
      let boardState = []; 
      let simulationStartState = null; // For saving simulation history
      
      const ANIMATION_DURATION = 200; // ms
      let animationLoopId = null;
let lastNudgeTime = 0; // מווסת את מהירות תנועת ה-Nudge האוטומטית

      // --- Breathe Animation State ---
      let isBreathing = false; // This variable is now effectively replaced by (isLifePlaying && armedSimulation === 'breathe')
      let breatheStartTime = 0;
      let breatheEvoMode = 'off'; // 'off', 'solo' or 'group'


// --- הגדרות מיון פלטות ואייקוני SVG (עיצוב מינימליסטי ורוחני) ---
      const SORT_MODES = [
// 1. מצב רגיל (בהירות) - זריחה (חושך לאור)
          { method: 'luminance', icon: '<path d="M4 16h16M7 16 A5 5 0 0 1 17 16" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="7" r="1.5" fill="currentColor"/>' },

          
// 2. ריברס - שקיעה / שורשים (אור לחושך)
          { method: 'reversed', icon: '<path d="M4 8h16M7 8 A5 5 0 0 0 17 8" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="17" r="1.5" fill="currentColor"/>' },

          
// 3. מבפנים החוצה - אדוות מים (טיפה שמתרחבת)
{ method: 'center-out', icon: '<circle cx="12" cy="12" r="1.5" fill="currentColor"/><path d="M 9 9 Q 5 12 9 15 M 15 9 Q 19 12 15 15 M 9 9 Q 12 5 15 9 M 9 15 Q 12 19 15 15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },          

{ method: 'temperature', icon: '<circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4 18 Q8 14 12 18 T20 18" fill="none" stroke="currentColor" stroke-width="1.5"/>' },

          // 4. מצב קשת - מינימליסטי (כמו האות 'ח')
          { method: 'hue', icon: '<path d="M 6 19 V 10 A 6 6 0 0 1 18 10 V 19"/>' }, 
          
          // 5. קשת כהה - 'ח' מרכזית עם 2 קשתות פנימיות בגווני אפור
          { method: 'dark-rainbow', icon: '<path d="M 4 19 V 11 A 8 8 0 0 1 20 11 V 19"/><path d="M 7 19 V 11 A 5 5 0 0 1 17 11 V 19" stroke="#aaa"/><path d="M 10 19 V 11 A 2 2 0 0 1 14 11 V 19" stroke="#666"/>' }



 
      ];







      let currentSortIndex = 0;



      // --- Color Helper for Breathing ---
      function adjustBrightness(hex, factor) {
        const rgb = hexToRgb(hex);
        if (!rgb) return 'rgb(0,0,0)';
        const r = Math.round(Math.max(0, Math.min(255, rgb[0] * factor)));
        const g = Math.round(Math.max(0, Math.min(255, rgb[1] * factor)));
        const b = Math.round(Math.max(0, Math.min(255, rgb[2] * factor)));
        return `rgb(${r},${g},${b})`;
      }

      function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
      }

      function lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
      }

function getLuminance(hex) {
        const rgb = parseInt(hex.substring(1), 16);
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = (rgb >> 0) & 0xff;
        // HSP equation - Better for human eye perception
        return Math.sqrt(
          0.299 * (r * r) +
          0.587 * (g * g) +
          0.114 * (b * b)
        );
      }

// פונקציית עזר לחישוב גוון (Hue) של צבע (עבור מיון קשת בענן)
      function getHue(hex) {
          const rgb = hexToRgb(hex);
          if (!rgb) return 0;
          const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          let h = 0;
          if (max !== min) {
              const d = max - min;
              switch (max) {
                  case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                  case g: h = (b - r) / d + 2; break;
                  case b: h = (r - g) / d + 4; break;
              }
              h /= 6;
          }
          return h * 360;
      }

// פונקציית עזר לחישוב נתוני צבע מתקדמים (Hue, Saturation, Value)
      function getHSV(hex) {
          const rgb = hexToRgb(hex);
          if (!rgb) return { h: 0, s: 0, v: 0 };
          const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const v = max;
          const d = max - min;
          const s = max === 0 ? 0 : d / max;
          let h = 0;
          if (max !== min) {
              switch (max) {
                  case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                  case g: h = (b - r) / d + 2; break;
                  case b: h = (r - g) / d + 4; break;
              }
              h /= 6;
          }
          return { h: h * 360, s: s, v: v };
      }



// --- מערכת מיון פלטות צבעים (Sorting Infrastructure) ---
      let currentSortMethod = 'luminance'; // שיטת המיון הפעילה כברירת מחדל



function sortColorsArray(colorsArray, method) {
          // קודם כל, ממיינים לפי בהירות כבסיס
          const sortedByLuminance = [...colorsArray].sort((a, b) => getLuminance(a) - getLuminance(b));

          switch (method) {
              case 'center-out':
                  const centerOut = new Array(sortedByLuminance.length);
                  let center = Math.floor(sortedByLuminance.length / 2);
                  let left = center - 1; let right = center + 1;
                  centerOut[center] = sortedByLuminance[0];
                  for(let i = 1; i < sortedByLuminance.length; i++) {
                      if (i % 2 !== 0) {
                          if (right < sortedByLuminance.length) centerOut[right++] = sortedByLuminance[i];
                          else centerOut[left--] = sortedByLuminance[i];
                      } else {
                          if (left >= 0) centerOut[left--] = sortedByLuminance[i];
                          else centerOut[right++] = sortedByLuminance[i];
                      }
                  }
                  return centerOut;
                  
              case 'reversed':
                  // היפוך: מהבהיר ביותר לכהה ביותר
                  return [...sortedByLuminance].reverse();
                  

case 'hue':
                  // קשת בענן: מיון ראשוני לפי מיקום על גלגל הצבעים, שניוני לפי בהירות
                  return [...colorsArray].sort((a, b) => {
                      const hueDiff = getHue(a) - getHue(b);
                      // אם הגוון זהה או כמעט זהה (הפרש קטן מ-1 מעלה), נמיין מהכהה לבהיר
                      if (Math.abs(hueDiff) < 1) {
                          return getLuminance(a) - getLuminance(b);
                      }
                      return hueDiff;
                  });
         



case 'dark-rainbow': {
                  const darks = [];
                  const lights = [];
                  const colors = [];
                  
                  colorsArray.forEach(hex => {
                      const hsv = getHSV(hex);
                      const lum = getLuminance(hex);
                      
                      // סינון חכם לניטרליים
                      if (hsv.s < 0.12 || hsv.v < 0.08) {
                          if (lum < 128) {
                              darks.push(hex);
                          } else {
                              lights.push(hex);
                          }
                      } else {
                          colors.push(hex);
                      }
                  });

                  darks.sort((a, b) => getLuminance(a) - getLuminance(b));
                  lights.sort((a, b) => getLuminance(a) - getLuminance(b));

                  colors.sort((a, b) => {
                      const hsvA = getHSV(a);
                      const hsvB = getHSV(b);
                      
                      const hueA = (hsvA.h + 30) % 360;
                      const hueB = (hsvB.h + 30) % 360;
                      
                      // נגדיל קצת את ה"דליים" ל-20 מעלות כדי לתפוס משפחות רחבות יותר
                      const bucketSize = 20; 
                      const bucketA = Math.floor(hueA / bucketSize);
                      const bucketB = Math.floor(hueB / bucketSize);
                      
                      if (bucketA === bucketB) {
                          const lumA = getLuminance(a);
                          const lumB = getLuminance(b);
                          
                          // הפתרון לקפיצות: מיון גלי (Serpentine)!
                          // דלי זוגי ימוין מכהה לבהיר, דלי אי-זוגי ימוין מבהיר לכהה.
                          // זה יוצר זרימה חלקה: בהיר פוגש בהיר, וכהה פוגש כהה.
                          return bucketA % 2 === 0 ? lumA - lumB : lumB - lumA;
                      }
                      
                      return bucketA - bucketB;
                  });

                  return [...darks, ...colors, ...lights];
              }

         
              case 'temperature':
                  // טמפרטורה: אדום (חם) עד כחול (קר), שניוני לפי בהירות
                  return [...colorsArray].sort((a, b) => {
                      const rgbA = hexToRgb(a) || [0,0,0];
                      const rgbB = hexToRgb(b) || [0,0,0];
                      const tempA = rgbA[0] - rgbA[2];
                      const tempB = rgbB[0] - rgbB[2];
                      const tempDiff = tempB - tempA; // החמים ביותר יהיו בהתחלה
                      
                      // אם הטמפרטורה זהה בדיוק, נמיין מהכהה לבהיר
                      if (tempDiff === 0) {
                          return getLuminance(a) - getLuminance(b);
                      }
                      return tempDiff;
                  });


              
              case 'luminance':
              default:
                  return sortedByLuminance;
          }
      }

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
          if (currentSortMethod === newMethod) return; // לא עושים כלום אם זו כבר השיטה הפעילה

          // 1. שומרים את צבע ה-Hex המדויק של כל תא לפני השינוי
          const currentPalette = C.PALETTES[activePaletteIndex].colors;
          const currentColors = boardState.map(tile => currentPalette[tile.k]);
          
          // שומרים גם את הצבע הקודם (prevK) כדי לא לשבור אנימציות של מעברי צבע אם הן קורות עכשיו
          const currentPrevColors = boardState.map(tile => tile.prevK !== null ? currentPalette[tile.prevK] : null);

          // 2. מעדכנים את השיטה הפעילה וממיינים את כל הפלטות מחדש
          currentSortMethod = newMethod;
          C.PALETTES.forEach(palette => {
              palette.colors = sortColorsArray(palette.originalColors, currentSortMethod);
          });

          // 3. ממפים מחדש את הלוח שלנו לאינדקסים החדשים
          const newPalette = C.PALETTES[activePaletteIndex].colors;
          
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

          // 4. מרנדרים מחדש את תפריט הצבעים כדי שהמשתמש יראה את הסדר החדש
          if (typeof renderColorPickerContent === 'function') {
              renderColorPickerContent();
          }
      }
      // ------------------------------------------


      
      let gameOfLifeRules = { ...C.defaultGameOfLifeRules };
      let gravitationalSortRules = { ...C.defaultGravitationalSortRules };
      let erosionRules = { ...C.defaultErosionRules };
      let dlaRules = { ...C.defaultDlaRules };
      let contourRules = { ...C.defaultContourRules }; // <-- ADDED HERE
let spiralRules = { ...C.defaultSpiralRules };
let magnetRules = { ...C.defaultMagnetRules };
let chiFlowRules = { ...C.defaultChiFlowRules };
      let turingRules = { ...C.defaultTuringRules };
      let dlaState = null;
      let turingState = null;

      let activePaletteIndex = 0;
      let n = 7;
      let separatorPx = 2;
      let isBrushModeOn = true; 
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
      let wasLongPress = false;
      let brushSize = 1; 
      let isLifePlaying = false;
      let animationFrameId = null;
      let armedSimulation = null;
      let symmetryMode = 'off';
let brightnessEvoMode = 'off'; // ישמור את המצב הנבחר: 'off', 'brightness', או 'contrast'
let dlaMode = 'off'; // 'off', 'genetics', or 'no-genetics'
let spiralMode = 'off';
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

      function getCurrentState() {
          return { 
            n, 
            activePaletteIndex, 
            paletteName: C.PALETTES[activePaletteIndex].originalName, 
            separatorPx,
currentSortMethod, 
            tiles: boardState.map(tile => ({ 
                k: tile.k, 
                isGold: tile.isGold,
                v: tile.v
            }))
          };
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
            currentSortMethod = state.currentSortMethod;
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

        updateGlowEffect();


        updateColorPickerButtonUI();
        updatePaletteHeader();
        applySeparator();
        updateSymmetryUI();

        if (n !== state.n) {
            n = state.n;
            initializeBoardAndCanvas(false); 
        }

        boardState = state.tiles.map(tileState => ({
            ...tileState,
            prevK: null,
            animStart: 0,
            v: tileState.v !== undefined ? tileState.v : tileState.k
        }));
        
        renderToScreen(null); 
      }

      function pushHistory(state) {
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
        updateUndoRedoButtons();
      }

      function redo() {
        if (future.length === 0) return;
        const nextAction = future.pop();
        history.push(nextAction);
        applyState(nextAction.after);
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
            boardState = new Array(n * n).fill(null).map(() => ({ k: 0, prevK: null, animStart: 0, isGold: false, v: 0 }));
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
      



function renderBoard(targetCtx, width, height, timestamp = performance.now()) {
    if (!targetCtx) return;

    if (separatorPx > 0) {
        targetCtx.fillStyle = '#000000';
        targetCtx.fillRect(0, 0, width, height);
    } else {
        targetCtx.clearRect(0, 0, width, height);
    }

    if (boardState.length === 0) return;
    
    const totalGapSize = (n - 1) * separatorPx;
    const tileSize = (width - totalGapSize) / n;
    
    const currentPalette = palette();
    const paletteAsRgb = currentPalette.map(hexToRgb);

    for (let i = 0; i < n * n; i++) {
        const tileData = boardState[i];
        if (!tileData) continue;

        let finalColor;

        if (isLifePlaying && armedSimulation === 'breathe' && !tileData.isGold) {
            const BREATHE_SPEED = 0.0015;
            const elapsed = timestamp - breatheStartTime;
            let wave;

            if (breatheEvoMode === 'solo') {
const cycleDuration = (2 * Math.PI) / BREATHE_SPEED;
            const effectiveElapsed = (elapsed - tileData.startDelay + cycleDuration) % cycleDuration;
            wave = Math.sin(effectiveElapsed * BREATHE_SPEED); // השתמש בזמן האפקטיבי, ללא צורך בהיסט פאזה

            } else { // 'group' mode
                wave = Math.sin(elapsed * BREATHE_SPEED + tileData.k * 0.8);
            }
            
            const FADE_IN_DURATION = 2000;
            const fadeInProgress = Math.min(elapsed / FADE_IN_DURATION, 1.0);
            const animatedFactor = 0.7 + wave * 0.3; 
            const brightnessFactor = (1.0 * (1 - fadeInProgress)) + (animatedFactor * fadeInProgress);

            const originalColor = getPaletteColor(tileData.k);
            finalColor = adjustBrightness(originalColor, brightnessFactor);

        } else if (tileData.isGold) {
            finalColor = C.GOLD;
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
        
        if (separatorPx === 0) {
            targetCtx.fillRect(x - 0.5, y - 0.5, tileSize + 1, tileSize + 1);
        } else {
            targetCtx.fillRect(x, y, tileSize, tileSize);
        }
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
          nonGoldIndices.forEach((boardIndex, arrayIndex) => {
              const oldK = boardState[boardIndex].k;
              const newK = existingColors[arrayIndex];
              if (oldK !== newK) {
                  boardState[boardIndex].prevK = oldK;
                  boardState[boardIndex].animStart = now;
                  boardState[boardIndex].k = newK;
                  boardState[boardIndex].v = newK;
              }
          });
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
        animateBoardTransition(() => performAction(goDark));
      }
      
      function invertGrid() {
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
          nudgeColors(1);
          armSimulation('nudgeBrighter');
      }

      function handleNudgeDarkerClick() {
          nudgeColors(-1);
          armSimulation('nudgeDarker');
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
      }
      
      function handlePaletteSwitch(backwards = false) {
        const len = C.PALETTES.length;
        switchToPalette((activePaletteIndex + (backwards ? -1 : 1) + len) % len);
      }
      
      function switchToPalette(index) {
        if (index === activePaletteIndex) return;
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
        animateBoardTransition(() => performAction(() => _performResize(newSize)));
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
    if (performance.now() - lastNudgeTime >= ANIMATION_DURATION) {
        applyNudgeLogic(1);
        lastNudgeTime = performance.now();
    }
    break;

case 'nudgeDarker':
    if (performance.now() - lastNudgeTime >= ANIMATION_DURATION) {
        applyNudgeLogic(-1);
        lastNudgeTime = performance.now();
    }
    break;



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

        animationFrameId = requestAnimationFrame(gameLoop);
      }

      function stepForward() {
        if (isLifePlaying || armedSimulation === 'breathe') return;
        
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
    boardState = Simulations.runMagnetGeneration({ ...context, magnetRules }); 
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
          if (isLifePlaying) {
              pauseLife();
              return;
          }
          if (!armedSimulation) return;

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

          gameLoop();
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
    updateBreatheEvoButtonUI();
    if (typeof updateGravitationalSortButtonUI === 'function') updateGravitationalSortButtonUI();
    if (typeof updateSpiralButtonUI === 'function') updateSpiralButtonUI();
    
    dom.btnPlayPauseLife.disabled = true;
    dom.btnStepForward.disabled = true;
    // --- END RESET ---

    // אם אנחנו מדליקים סימולציה (ולא רק מכבים אותה)
    if (!isTogglingOff) {
        armedSimulation = simulationName;
        
        // הגדרת דיפולט (ברירת מחדל) לכפתורים מחזוריים כשהם נדלקים
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
    magnetMode = 'magnet';
    if (typeof magnetRules !== 'undefined') magnetRules.method = 'magnet';
}


        // צביעת הכפתור הנבחר במסגרת פעילה (זהב)
        const buttonToActivate = simButtons.find(btn => btn.id.toLowerCase().includes(simulationName.toLowerCase()));
        if (buttonToActivate) {
            buttonToActivate.classList.add('simulation-active');
        }
        
        // הדלקה ויזואלית של האייקונים בכפתורים המחזוריים
        updateBrightnessEvoButtonUI();
        updateDlaButtonUI();
        updateBreatheEvoButtonUI();
        if (typeof updateGravitationalSortButtonUI === 'function') updateGravitationalSortButtonUI();
        if (typeof updateSpiralButtonUI === 'function') updateSpiralButtonUI();

        dom.btnPlayPauseLife.disabled = false;
        dom.btnStepForward.disabled = false;

        // מניעת כפתור 'צעד קדימה' בנשימה (שעובדת על אנימציה רציפה)
        if (simulationName === 'breathe') {
            dom.btnStepForward.disabled = true;
        }
    }
}

      
      function setBrushMode(isBrushOn) {
          isBrushModeOn = isBrushOn;
          dom.btnBrushMode.classList.toggle('brush-on', isBrushOn);
          const newTitle = isBrushOn ? getText('brushMode_paint') : getText('brushMode_copy');
          dom.btnBrushMode.title = newTitle;
          dom.btnBrushMode.setAttribute('aria-label', newTitle);
          if (pointerState.dragSourceIndex !== null) pointerState.dragSourceIndex = null;
      }
      
      function toggleBrushMode() {
          setBrushMode(!isBrushModeOn);
      }

      function openSaveModalWithPreview() {
        dom.btnSave.disabled = true;
        canvas.toBlob((blob) => {
            if (!blob) { 
                dom.btnSave.disabled = false; 
                return; 
            }
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

      function handleLoadProject() { dom.projectFileInput.click(); modals.closeModal(); }
      
      function onProjectFileSelected(event) {
        const file = event.target.files[0]; if (!file) return;
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
          dom.longPressOverlay.classList.remove('visible');
          dom.longPressDisplay.classList.remove('visible');
          setTimeout(() => { dom.longPressDisplay.innerHTML = ''; }, 250);
      }
      
      function prepareBoardForSimMode() {
        animateBoardTransition(() => {
            performAction(() => {
                if (n !== 249) _performResize(249);
                separatorPx = 0; 
                applySeparator();
                goDark();
                const currentPalette = palette();
                const lightestIndex = currentPalette.length - 1;
                selectedColor = currentPalette[lightestIndex];
                selectedColorIndex = lightestIndex;

brushSize = 1;
const brushSizeSlider = document.getElementById('brushSizeSlider');
                const brushSizeValue = document.getElementById('brushSizeValue');
                if (brushSizeSlider) brushSizeSlider.value = brushSize;
                if (brushSizeValue) brushSizeValue.textContent = brushSize;



                isRainbowModeActive = false;
                symmetryMode = 'kaleidoscope';
                updateSymmetryUI();
                updateColorPickerButtonUI();
                updateGlowEffect();
            });
        });
      }

      function handlePointerDownCtrl(e) {
        if (isBreathing) return;
        const btn = e.currentTarget;
        longPressTimer = setTimeout(() => {
            wasLongPress = true;
            // Phase 1 Addition: Long press on Invert button
            if (btn.id === 'btnInvert') {
                modals.openAdvancedColorMappingModal();
                return;
            }
if (btn.id === 'btnColorPicker') {
                modals.openColorPickerModal();
                return;
            }
            if (btn.id === 'btnRandom') { performAction(shuffleExistingColors); return; }
            if (btn.id === 'btnToggleSimMode') { if (!isSimModeActive) toggleSimMode(); prepareBoardForSimMode(); return; }
            if (btn.id === 'btnGameOfLife') { modals.openGolSettingsModal(); return; }
            if (btn.id === 'btnGravitationalSort') { modals.openGravitationalSortSettingsModal(); return; }
            if (btn.id === 'btnContour') { modals.openContourSettingsModal(); return; } // <-- ADDED HERE

if (btn.id === 'btnSpiral') { modals.openSpiralSettingsModal(); return; }
if (btn.id === 'btnSandpile') { modals.openChiFlowSettingsModal(); return; }
if (btn.id === 'btnTuring') { modals.openTuringSettingsModal(); return; }
if (btn.id === 'btnBrightnessEvo') { modals.openBrightnessEvoSettingsModal(); return; }
            if (btn.id === 'btnPalette') { modals.openPaletteModal(); return; }
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
        dom.resizeModalTitle.textContent = getText('resizeModal_title');
        dom.resizeModalPrompt.textContent = getText('resizeModal_prompt');
        dom.btnConfirmResize.textContent = getText('resizeModal_confirm');
        dom.helpModalTitle.textContent = getText('help_title');
        dom.paletteModalTitle.textContent = getText('paletteModal_title');
        dom.helpIntroText.textContent = getText('help_intro');
        dom.gsSettingsTitle.textContent = getText('gs_modal_title');
        dom.btnGsSettingsCancel.textContent = getText('gs_modal_cancel');
        dom.btnGsSettingsSave.textContent = getText('gs_modal_save_close');
        dom.btnInvert.title = getText('tooltip_invert'); 
        dom.btnRandom.title = getText('tooltip_random');
        dom.btnColorPicker.title = getText('tooltip_colorPicker'); 
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
        dom.btnGameOfLife.title = getText('tooltip_gameOfLife'); 
        dom.btnBrightnessEvo.title = getText('tooltip_brightnessEvo');
        dom.btnGravitationalSort.title = getText('tooltip_gravitationalSort'); 
        dom.btnErosion.title = getText('tooltip_erosion');
        dom.btnDla.title = getText('tooltip_dla'); 
        dom.btnContour.title = getText('tooltip_contour');
dom.btnSpiral.title = getText('tooltip_spiral');
dom.btnTuring.title = getText('tooltip_turing');
dom.btnLangToggle.textContent = getCurrentLang().toUpperCase();
        dom.btnBrushMode.title = isBrushModeOn ? getText('brushMode_paint') : getText('brushMode_copy');

        document.querySelectorAll('.ctrl').forEach(btn => { 
            if (btn.title) btn.setAttribute('aria-label', btn.title);
        });
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

const simButtons = [dom.btnGameOfLife, dom.btnBrightnessEvo, dom.btnShowBreatheMenu, dom.btnGravitationalSort, dom.btnErosion, dom.btnDla, dom.btnContour, dom.btnSandpile, dom.btnTuring, dom.btnSpiral, dom.btnMagnetModes, dom.btnNudgeBrighter, dom.btnNudgeDarker].filter(Boolean);


        simButtons.forEach(btn => btn.classList.remove('simulation-active'));
        dom.btnPlayPauseLife.disabled = true;
        dom.btnStepForward.disabled = true;
    brightnessEvoMode = 'off';
    updateBrightnessEvoButtonUI();
 updateDlaButtonUI();
   dlaMode = 'off';
    updateDlaButtonUI();
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

const pointerState = { id: null, downIndex: -1, downX: 0, downY: 0, longPressTimer: null, suppressClick: false, isDragging: false, dragSourceIndex: null, lastPaintedIndex: -1, beforeState: null };

function onPointerDown(e) {
    if (isLifePlaying || isBreathing) return;
    const index = getTileIndexFromCoords(e.clientX, e.clientY);
    if (index === -1) return;
    e.target.setPointerCapture(e.pointerId);
    Object.assign(pointerState, { id: e.pointerId, downIndex: index, downX: e.clientX, downY: e.clientY, suppressClick: false, isDragging: false, dragSourceIndex: null, lastPaintedIndex: -1, beforeState: getCurrentState() });
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
            if (isBrushModeOn) {
                if (selectedColorIndex === -1) { pointerState.dragSourceIndex = pointerState.downIndex; }
                handleDragPaint(pointerState.downIndex);
            }
        }
    }
    if (pointerState.isDragging && isBrushModeOn) {
        handleDragPaint(currentIndex); 
    }
}

function onPointerUp(e) {
    if (pointerState.id !== e.pointerId) return;
    clearTimeout(pointerState.longPressTimer);
    const upIndex = getTileIndexFromCoords(e.clientX, e.clientY);

    if (pointerState.isDragging) {
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
    if (pointerState.beforeState && !areStatesEqual(pointerState.beforeState, afterState)) {
         pushHistory({ before: pointerState.beforeState, after: afterState }); 
         hasPerformedInitialAutofill = true;
    }
    Object.assign(pointerState, { id: null, downIndex: -1, isDragging: false, dragSourceIndex: null, lastPaintedIndex: -1, beforeState: null });
}

      
      function updateLayout() {
        const shell = dom.appShell;
        if (window.innerWidth < 768) { 
            shell.style.width = ''; 
        } else {
          const controlsHeight = dom.controlsContainer.offsetHeight;
          const viewportHeight = window.innerHeight;
          const topMargin = parseInt(window.getComputedStyle(shell.parentElement).paddingTop, 10);
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
      
       function createRainbowIconSVG(currentPalette) {
        const p = currentPalette || palette();
        const c1 = p[0] || '#FFD700'; const c2 = p[Math.floor(p.length / 4)] || '#42A5F5';
        const c3 = p[Math.floor(p.length / 2)] || '#F44336'; const c4 = p[Math.floor(p.length * 3 / 4)] || '#66BB6A';
        return `<svg viewBox="0 0 24 24" fill="none" stroke="none" style="width: var(--icon-size); height: var(--icon-size);">
            <rect x="4" y="4" width="8" height="8" fill="${c1}" rx="1"/><rect x="12" y="4" width="8" height="8" fill="${c2}" rx="1"/>
            <rect x="4" y="12" width="8" height="8" fill="${c3}" rx="1"/><rect x="12" y="12" width="8" height="8" fill="${c4}" rx="1"/>
        </svg>`;
    }
    
    function updateGlowEffect() {
        if (!dom.board) return;
        if (isRainbowModeActive) { dom.board.classList.add('glowing-border-rainbow'); dom.board.classList.remove('glowing-border'); } 
        else if (selectedColor) { dom.root.style.setProperty('--glow-color', selectedColor); dom.board.classList.add('glowing-border'); dom.board.classList.remove('glowing-border-rainbow'); } 
        else { dom.board.classList.remove('glowing-border', 'glowing-border-rainbow'); }
    }

    function updateColorPickerButtonUI() {
        if (!dom.btnColorPicker.querySelector('circle') && !isRainbowModeActive) dom.btnColorPicker.innerHTML = originalColorPickerIconHTML;
        const circle = dom.btnColorPicker.querySelector('svg circle');
        if (isRainbowModeActive) dom.btnColorPicker.innerHTML = createRainbowIconSVG();
        else if (selectedColor) { if(circle) { circle.style.fill = selectedColor; circle.style.stroke = selectedColor === '#000000' ? '#424242' : selectedColor; }} 
        else { if(circle) { circle.style.fill = '#000'; circle.style.stroke = '#fff'; } }
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


function cycleBrightnessEvoMode() {
    // שומרים את המצב הקודם כדי שנוכל להשוות
    const oldMode = brightnessEvoMode;

    const sequence = ['off', 'brightness', 'contrast'];
    const currentIndex = sequence.indexOf(brightnessEvoMode);
    const nextIndex = (currentIndex + 1) % sequence.length;
    brightnessEvoMode = sequence[nextIndex];

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
    const currentIndex = sequence.indexOf(dlaMode);
    const nextIndex = (currentIndex + 1) % sequence.length;
    dlaMode = sequence[nextIndex];

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
    const sequence = ['off', 'up', 'right', 'center_x', 'radial', 'down', 'left',  'vortex'];



 //   const sequence = ['off', 'up', 'right', 'down', 'left', 'center_x', 'radial', 'vortex'];





    const currentIndex = sequence.indexOf(gsMode);
    const nextIndex = (currentIndex + 1) % sequence.length;
    gsMode = sequence[nextIndex];

    if (gsMode !== 'off') {
        gravitationalSortRules.direction = gsMode; // מעדכן את חוקי הסימולציה בפועל
    }

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

dom.btnSpiral.classList.remove('mode-classic', 'mode-vortex', 'mode-expand', 'mode-a', 'mode-b', 'mode-magnet', 'mode-cosmic_magnet', 'mode-time_magnet', 'simulation-active');




    if (spiralMode !== 'off') {
        dom.btnSpiral.classList.add('mode-' + spiralMode);
        if (armedSimulation === 'spiral') {
             dom.btnSpiral.classList.add('simulation-active');
        }
    }
}

function cycleSpiralMode() {
    const oldMode = spiralMode;
const sequence = ['off', 'b', 'expand', 'time_magnet', 'vortex', 'a'];




// original with all button
// const sequence = ['off', 'b', 'vortex', 'classic', 'expand', 'a', 'time_magnet', 'magnet', 'cosmic_magnet'];


    const currentIndex = sequence.indexOf(spiralMode);
    const nextIndex = (currentIndex + 1) % sequence.length;
    spiralMode = sequence[nextIndex];

    if (spiralMode !== 'off') {
        spiralRules.method = spiralMode;
    }

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
    dom.btnMagnetModes.classList.remove('mode-magnet', 'mode-cosmic_magnet', 'simulation-active');
    if (magnetMode !== 'off') {
        dom.btnMagnetModes.classList.add('mode-' + magnetMode);
        if (armedSimulation === 'magnet') {
             dom.btnMagnetModes.classList.add('simulation-active');
        }
    }
}

function cycleMagnetMode() {
    const oldMode = magnetMode;
    const sequence = ['off', 'magnet', 'cosmic_magnet'];
    const currentIndex = sequence.indexOf(magnetMode);
    const nextIndex = (currentIndex + 1) % sequence.length;
    magnetMode = sequence[nextIndex];

    if (magnetMode !== 'off') {
        magnetRules.method = magnetMode;
    }

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
          performAction(() => {
              const currentIndex = C.SYMMETRY_MODES.indexOf(symmetryMode);
              symmetryMode = C.SYMMETRY_MODES[(currentIndex + 1) % C.SYMMETRY_MODES.length];
              updateSymmetryUI();
          });
      }



function cycleSortMethod() {
          performAction(() => { // עטפנו כדי שהשינוי יירשם בהיסטוריה
              currentSortIndex = (currentSortIndex + 1) % SORT_MODES.length;
              const nextMode = SORT_MODES[currentSortIndex];
              
              // עדכון ה-SVG בתוך הכפתור
              if (dom.sortIconGroup) {
                  dom.sortIconGroup.innerHTML = nextMode.icon;
              }
              
              applySortMethod(nextMode.method);
          });
      }



      async function initializeApp() {
        const splashScreen = document.getElementById('splashScreen'), splashText = document.getElementById('splashText');
        initializeLanguage();
        onLanguageChange(updateAllUIText);
        
        // Phase 1 Addition: Add adaptColors to the context for modals
        const contextForModals = {
            dom, C, getText, performAction, getSymmetricIndices, applyActionToTiles,
            getN: () => n, isBreathing: () => isBreathing, isLifePlaying: () => isLifePlaying,
            _performResize, animateBoardTransition,
            setColorPickerPage: (p) => { colorPickerPage = p; }, getColorPickerPage: () => colorPickerPage,
            getActivePaletteIndex: () => activePaletteIndex, createRainbowIconSVG, navigateColorPages,
            setSelectedColor: (c) => { 
                selectedColor = c; 
                selectedColorIndex = c ? palette().indexOf(c) : -1;
            },
            setIsRainbowModeActive: (b) => { isRainbowModeActive = b; },
            updateGlowEffect, updateColorPickerButtonUI,
            paletteLen, getSelectedColorIndex: () => selectedColorIndex,
            switchToPalette,
            getGameOfLifeRules: () => gameOfLifeRules, setGameOfLifeRules: (r) => { gameOfLifeRules = r; },
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

getChiFlowRules: () => chiFlowRules, setChiFlowRules: (r) => { chiFlowRules = r; },
getTuringRules: () => turingRules, setTuringRules: (r) => { turingRules = r; },



            handleSaveProject, handleLoadProject, onProjectFileSelected,
            pointerState,
            resetWasLongPress,
downloadImage: shareOrDownloadImage,
            // startBreatheAnimation is removed
            adaptColors, 
applySortMethod,
        };
        modals = initializeModals(contextForModals);
        
        initializeBoardAndCanvas(true);
        fillRandom();
        hasPerformedInitialAutofill = true;
        applySeparator();
        updateUndoRedoButtons();
        setBrushMode(true);
        updateSymmetryUI();
updateBrightnessEvoButtonUI();
        updateBreatheEvoButtonUI(); // Add this
        updateColorPickerButtonUI();
        updateGlowEffect();
        updateLayout();
        updateAllUIText();
        
        const boardCanvas = dom.boardCanvas;
        boardCanvas.addEventListener('pointerdown', onPointerDown);
        boardCanvas.addEventListener('pointermove', onPointerMove);
        boardCanvas.addEventListener('pointerup', onPointerUp);
        boardCanvas.addEventListener('pointercancel', onPointerUp);
        
        dom.btnRandom.addEventListener('click', (e) => handleCtrlClick(e, randomizeAll));
        dom.btnInvert.addEventListener('click', (e) => handleCtrlClick(e, invertGrid));
        dom.btnPalette.addEventListener('click', (e) => handleCtrlClick(e, () => switchPalette()));
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
dom.btnCycleSort.addEventListener('click', (e) => handleCtrlClick(e, cycleSortMethod));
        dom.btnColorPicker.addEventListener('click', (e) => handleCtrlClick(e, handleColorPickerClick));
        dom.btnDark.addEventListener('click', (e) => handleCtrlClick(e, goDarkAction));
        dom.btnToggleSimMode.addEventListener('click', (e) => handleCtrlClick(e, toggleSimMode));
        dom.btnGameOfLife.addEventListener('click', (e) => handleCtrlClick(e, () => armSimulation('gameOfLife')));

dom.btnBrightnessEvo.addEventListener('click', (e) => handleCtrlClick(e, cycleBrightnessEvoMode));


dom.btnShowBreatheMenu.addEventListener('click', (e) => handleCtrlClick(e, cycleBreatheEvoMode));


dom.btnGravitationalSort.addEventListener('click', (e) => handleCtrlClick(e, cycleGravitationalSortMode));

        dom.btnErosion.addEventListener('click', (e) => handleCtrlClick(e, () => armSimulation('erosion')));

dom.btnDla.addEventListener('click', (e) => handleCtrlClick(e, cycleDlaMode));


dom.btnContour.addEventListener('click', (e) => handleCtrlClick(e, () => armSimulation('contour')));

dom.btnSpiral.addEventListener('click', (e) => handleCtrlClick(e, cycleSpiralMode));
if (dom.btnMagnetModes) {
    dom.btnMagnetModes.addEventListener('click', (e) => handleCtrlClick(e, cycleMagnetMode));
}



dom.btnSandpile.addEventListener('click', (e) => handleCtrlClick(e, () => armSimulation('sandpile')));

dom.btnTuring.addEventListener('click', (e) => handleCtrlClick(e, () => armSimulation('turing')));

        dom.btnPlayPauseLife.addEventListener('click', (e) => handleCtrlClick(e, togglePlayPauseLife));
        dom.btnStepForward.addEventListener('click', (e) => handleCtrlClick(e, stepForward));
dom.btnNudgeBrighter.addEventListener('click', (e) => handleCtrlClick(e, handleNudgeBrighterClick));
        dom.btnNudgeDarker.addEventListener('click', (e) => handleCtrlClick(e, handleNudgeDarkerClick));

        dom.btnLangToggle.addEventListener('click', toggleLanguage);
        // dom.btnExitBreathe.addEventListener('click', stopBreatheAnimation); // Removed
        
        document.querySelectorAll('.ctrl').forEach(btn => { 
            btn.addEventListener('pointerdown', handlePointerDownCtrl); 
            btn.addEventListener('pointerup', hideLongPressDisplay); 
            btn.addEventListener('pointerleave', hideLongPressDisplay); 
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