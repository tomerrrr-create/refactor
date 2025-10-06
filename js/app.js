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

      // --- Breathe Animation State ---
      let isBreathing = false;
      let breatheStartTime = 0;
      let breatheMode = 'solo'; // 'solo' or 'group'

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
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }

      C.PALETTES.forEach(palette => {
        palette.colors.sort((a, b) => getLuminance(a) - getLuminance(b));
      });
      
      let gameOfLifeRules = { ...C.defaultGameOfLifeRules };
      let gravitationalSortRules = { ...C.defaultGravitationalSortRules };
      let erosionRules = { ...C.defaultErosionRules };
      let dlaRules = { ...C.defaultDlaRules };
      let dlaState = null;

      let activePaletteIndex = 0;
      let n = 11;
      let separatorPx = 0;
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
      
      let isLifePlaying = false;
      let animationFrameId = null;
      let armedSimulation = null;
      let symmetryMode = 'off';
      
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
          if (stateA.tiles[i].k !== stateB.tiles[i].k || stateA.tiles[i].isGold !== stateB.tiles[i].isGold) return false;
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

          if (isStillAnimating || isBreathing) {
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

              if (isBreathing && !tileData.isGold) {
                  const BREATHE_SPEED = 0.0015;
                  const elapsed = timestamp - breatheStartTime;
                  let wave;

                  if (breatheMode === 'solo') {
                      // --- MODIFIED: Use the pre-calculated random offset ---
                      wave = Math.sin(elapsed * BREATHE_SPEED + tileData.breatheOffset);
                  } else { // 'group' mode
                      wave = Math.sin(elapsed * BREATHE_SPEED + tileData.k * 0.8);
                  }
                  
// ... (חישוב ה-wave נשאר זהה) ...

const FADE_IN_DURATION = 2000; // 2 שניות לכניסה עדינה
const fadeInProgress = Math.min(elapsed / FADE_IN_DURATION, 1.0);

// הנוסחה הקודמת, מנוסחת מחדש לנוחות:
const animatedFactor = 0.7 + wave * 0.3; 

// נוסחת האינטרפולציה: מערבבים בין בהירות מלאה (1.0) לבין הבהירות המונפשת
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

      function startBreatheAnimation(mode) {
          if (isLifePlaying) return;
          
          // --- MODIFIED: Assign a random offset to each tile on start ---
          boardState.forEach(tile => {
              // Multiply by 2 * PI to get a random starting point anywhere in the sine wave cycle
              tile.breatheOffset = Math.random() * 2 * Math.PI;
          });

          isBreathing = true;
          breatheMode = mode;
          breatheStartTime = performance.now();
          dom.btnExitBreathe.classList.add('visible');
          startAnimationLoop();
      }

      function stopBreatheAnimation() {
          isBreathing = false;
          dom.btnExitBreathe.classList.remove('visible');
          renderToScreen(null);
      }
      
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
      
      function nudgeColors(direction) {
        performAction(() => {
          const maxIndex = paletteLen() - 1;
          const now = performance.now();
          boardState.forEach(tile => {
            if (!tile.isGold) {
                let newIndex = tile.k + direction;
                newIndex = Math.max(0, Math.min(newIndex, maxIndex));
                if (tile.k !== newIndex) {
                    tile.prevK = tile.k;
                    tile.animStart = now;
                    tile.k = newIndex;
                    tile.v = newIndex;
                }
            }
          });
          startAnimationLoop();
        });
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
            separatorPx = 0;
            n = 11;
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
          boardState.forEach((tile, index) => {
              if (tile.k > 0 && !tile.isGold) {
                  dlaState.crystal.add(index);
              }
          });
      }

      function gameLoop() {
        if (!isLifePlaying) return;
        const context = { n, currentBoardState: boardState, currentPalette: palette(), gameOfLifeRules, gravitationalSortRules, erosionRules, dlaState, dlaRules };
        let nextState;
        switch(armedSimulation) {
            case 'gameOfLife': nextState = Simulations.runGameOfLifeGeneration(context); boardState = nextState; break;
            case 'brightnessEvo': nextState = Simulations.runBrightnessEvolution(context); boardState = nextState; break;
            case 'gravitationalSort': nextState = Simulations.runGravitationalSortGeneration(context); boardState = nextState; break;
            case 'erosion': nextState = Simulations.runErosionGeneration(context); boardState = nextState; break;
            case 'dla':
                const { nextBoardState, nextDlaState } = Simulations.runDlaGeneration(context);
                boardState = nextBoardState;
                dlaState = nextDlaState;
                break;
        }
        renderToScreen(null);
        animationFrameId = requestAnimationFrame(gameLoop);
      }

      function stepForward() {
        if (isLifePlaying) return;
        performAction(() => {
            if (armedSimulation === 'dla') {
                syncDlaCrystalState();
            }
      
            const context = { n, currentBoardState: boardState, currentPalette: palette(), gameOfLifeRules, gravitationalSortRules, erosionRules, dlaState, dlaRules };
            
            switch(armedSimulation) {
                case 'gameOfLife': 
                    boardState = Simulations.runGameOfLifeGeneration(context); 
                    break;
                case 'brightnessEvo': 
                    boardState = Simulations.runBrightnessEvolution(context); 
                    break;
                case 'gravitationalSort': 
                    boardState = Simulations.runGravitationalSortGeneration(context); 
                    break;
                case 'erosion': 
                    boardState = Simulations.runErosionGeneration(context); 
                    break;
                case 'dla': 
                    const { nextBoardState, nextDlaState } = Simulations.runDlaGeneration(context);
                    boardState = nextBoardState;
                    dlaState = nextDlaState;
                    break;
            }
            renderToScreen(null);
        });
      }
      
      function pauseLife() {
          if (!isLifePlaying) return;
          isLifePlaying = false;
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;

          if (simulationStartState) {
              const simulationEndState = getCurrentState();
              if (!areStatesEqual(simulationStartState, simulationEndState)) {
                  pushHistory({ before: simulationStartState, after: simulationEndState });
              }
              simulationStartState = null; // Reset for the next session
          }

          dom.iconPlay.style.display = 'block';
          dom.iconPause.style.display = 'none';
          if (armedSimulation) dom.btnStepForward.disabled = false;
          dom.btnGameOfLife.disabled = false;
          dom.btnBrightnessEvo.disabled = false;
          dom.btnShowBreatheMenu.disabled = false;
          dom.btnGravitationalSort.disabled = false;
          dom.btnErosion.disabled = false;
          dom.btnDla.disabled = false;
      }
      
      function togglePlayPauseLife() {
          if (isLifePlaying) {
              pauseLife();
              return;
          }
          if (!armedSimulation || armedSimulation === 'breathe') return;

          if (armedSimulation === 'dla') {
              syncDlaCrystalState();
          }

          simulationStartState = getCurrentState();

          isLifePlaying = true;
          dom.iconPlay.style.display = 'none';
          dom.iconPause.style.display = 'block';
          dom.btnStepForward.disabled = true;
          dom.btnGameOfLife.disabled = true;
          dom.btnBrightnessEvo.disabled = true;
          dom.btnShowBreatheMenu.disabled = true;
          dom.btnGravitationalSort.disabled = true;
          dom.btnErosion.disabled = true;
          dom.btnDla.disabled = true;
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
        const walkerCount = n * 4;
        const initialWalkers = [];
        for (let i = 0; i < walkerCount; i++) {
            let position = dlaRules.injectFromEdges ? getRandomEdgePosition(n) : getRandomGridPosition(n);
            initialWalkers.push({ y: position.y, x: position.x });
        }
        dlaState = { crystal: initialCrystal, walkers: initialWalkers, isInitialized: true, isFinished: false, lastWalkerIndex: 0 };
        renderToScreen(null);
      }

      function armSimulation(simulationName) {
        if (isLifePlaying) return;
        const simButtons = [dom.btnGameOfLife, dom.btnBrightnessEvo, dom.btnShowBreatheMenu, dom.btnGravitationalSort, dom.btnErosion, dom.btnDla];
        simButtons.forEach(btn => btn.classList.remove('simulation-active'));
        if (armedSimulation === simulationName) {
          armedSimulation = null;
          dom.btnPlayPauseLife.disabled = true;
          dom.btnStepForward.disabled = true;
        } else {
          armedSimulation = simulationName;
          if (simulationName === 'breathe') {
              modals.openBreatheModal();
              armedSimulation = null; // Don't keep it armed, just open modal
              return;
          }
          if (simulationName === 'dla') {
             initializeDla();
          }
          dom.btnPlayPauseLife.disabled = false;
          dom.btnStepForward.disabled = false;
          const buttonToActivate = simButtons.find(btn => btn.id.toLowerCase().includes(simulationName.toLowerCase()));
          if(buttonToActivate) {
            buttonToActivate.classList.add('simulation-active');
          }
        }
      }
      
      function setBrushMode(isBrushOn) {
          isBrushModeOn = isBrushOn;
          dom.btnBrushMode.classList.toggle('brush-on', isBrushOn);
          const newTitle = isBrushModeOn ? getText('brushMode_paint') : getText('brushMode_copy');
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

      function downloadHighQualityImage() {
        const exportSize = 4096;
        const borderSize = Math.round(exportSize * 0.01); 
        const drawingAreaSize = exportSize - (borderSize * 2);

        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = exportSize;
        offscreenCanvas.height = exportSize;
        const offscreenCtx = offscreenCanvas.getContext('2d');

        const originalButtonText = dom.btnSaveImage.innerHTML;
        dom.btnSaveImage.innerHTML = `
            <svg class="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        `;
        dom.btnSaveImage.disabled = true;
        
        setTimeout(() => {
            offscreenCtx.fillStyle = '#000000';
            offscreenCtx.fillRect(0, 0, exportSize, exportSize);

            offscreenCtx.save();
            offscreenCtx.translate(borderSize, borderSize);
            
            renderBoard(offscreenCtx, drawingAreaSize, drawingAreaSize, null);

            offscreenCtx.restore();
    
            offscreenCanvas.toBlob((blob) => {
                if (blob) {
                    const highQualityFile = new File([blob], getSanitizedFileName('png'), { type: 'image/png' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(highQualityFile);
                    link.download = highQualityFile.name;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(link.href);
                } else {
                    alert("Error creating high-quality image.");
                }
                
                dom.btnSaveImage.innerHTML = originalButtonText;
                dom.btnSaveImage.disabled = false;
                modals.closeModal();
            }, 'image/png');
        }, 50);
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
                if (n !== 149) _performResize(149);
                separatorPx = 0; 
                applySeparator();
                goDark();
                const currentPalette = palette();
                const lightestIndex = currentPalette.length - 1;
                selectedColor = currentPalette[lightestIndex];
                selectedColorIndex = lightestIndex;
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
              const darkestColor = palette()[0];
              selectedColor = darkestColor;
              selectedColorIndex = 0;
              isRainbowModeActive = false;
              updateGlowEffect();
              updateColorPickerButtonUI();
              return;
            }
            if (btn.id === 'btnRandom') { performAction(shuffleExistingColors); return; }
            if (btn.id === 'btnToggleSimMode') { if (!isSimModeActive) toggleSimMode(); prepareBoardForSimMode(); return; }
            if (btn.id === 'btnGameOfLife') { modals.openGolSettingsModal(); return; }
            if (btn.id === 'btnGravitationalSort') { modals.openGravitationalSortSettingsModal(); return; }
            if (btn.id === 'btnDla') { modals.openDlaSettingsModal(); return; }
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
        if (selectedColor || isRainbowModeActive) {
            performAction(resetSelectedColor);
        } else {
            modals.openColorPickerModal();
        }
      }
      
      function setTextContent() {
        dom.splashText.textContent = getText('splashTitle');
        dom.fileNameLabel.textContent = getText('saveModal_feelsLike');
        dom.fileNameInput.placeholder = getText('saveModal_defaultFilename');
        dom.btnModalClose.title = getText('saveModal_close');
        dom.btnSaveImage.title = getText('saveModal_saveImage');
        dom.btnSaveProjectIdea.title = getText('saveModal_saveIdea');
        dom.btnLoadProjectIdea.title = getText('saveModal_loadIdea');
        dom.breatheSoloLabel.textContent = getText('breatheModal_solo');
        dom.breatheGroupLabel.textContent = getText('breatheModal_group');
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
            const controlsToHide = [ dom.btnBrushMode, dom.btnGap, dom.btnResetBoard, dom.btnTutorial, dom.btnSave, dom.btnSpecialReset, dom.btnPalette, dom.btnInvert ];
            controlsToHide.forEach(btn => btn.classList.toggle('control-hidden', isSimModeActive));
            dom.btnPlayPauseLife.classList.toggle('control-hidden', !isSimModeActive);
            dom.btnToggleSimMode.classList.toggle('active', isSimModeActive);
            dom.controlsContainer.style.opacity = '1';
        }, duration);
      }
      
      function resetArmedState() {
        armedSimulation = null;
        dlaState = null;
        const simButtons = [dom.btnGameOfLife, dom.btnBrightnessEvo, dom.btnShowBreatheMenu, dom.btnGravitationalSort, dom.btnErosion, dom.btnDla];
        simButtons.forEach(btn => btn.classList.remove('simulation-active'));
        dom.btnPlayPauseLife.disabled = true;
        dom.btnStepForward.disabled = true;
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
        const targetIndices = getSymmetricIndices(targetIndex);
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
                const targetIndices = getSymmetricIndices(upIndex);
                applyActionToTiles(targetIndices, tile => {
                    tile.k = sourceData.k;
                    tile.isGold = sourceData.isGold;
                });
            }
        } else if (!pointerState.suppressClick && upIndex !== -1) {
            const targetIndices = getSymmetricIndices(upIndex);
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
      
      function cycleSymmetryMode() {
          performAction(() => {
              const currentIndex = C.SYMMETRY_MODES.indexOf(symmetryMode);
              symmetryMode = C.SYMMETRY_MODES[(currentIndex + 1) % C.SYMMETRY_MODES.length];
              updateSymmetryUI();
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
            getDlaRules: () => dlaRules, setDlaRules: (r) => { dlaRules = r; },
            handleSaveProject, handleLoadProject, onProjectFileSelected,
            pointerState,
            resetWasLongPress,
            downloadImage: downloadHighQualityImage,
            startBreatheAnimation: startBreatheAnimation,
            adaptColors, // Pass the new function to the modals context
        };
        modals = initializeModals(contextForModals);
        
        initializeBoardAndCanvas(true);
        fillRandom();
        hasPerformedInitialAutofill = true;
        applySeparator();
        updateUndoRedoButtons();
        setBrushMode(true);
        updateSymmetryUI();
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
        dom.btnColorPicker.addEventListener('click', (e) => handleCtrlClick(e, handleColorPickerClick));
        dom.btnDark.addEventListener('click', (e) => handleCtrlClick(e, goDarkAction));
        dom.btnToggleSimMode.addEventListener('click', (e) => handleCtrlClick(e, toggleSimMode));
        dom.btnGameOfLife.addEventListener('click', (e) => handleCtrlClick(e, () => armSimulation('gameOfLife')));
        dom.btnBrightnessEvo.addEventListener('click', (e) => handleCtrlClick(e, () => armSimulation('brightnessEvo')));
        dom.btnShowBreatheMenu.addEventListener('click', (e) => handleCtrlClick(e, () => armSimulation('breathe')));
        dom.btnGravitationalSort.addEventListener('click', (e) => handleCtrlClick(e, () => armSimulation('gravitationalSort')));
        dom.btnErosion.addEventListener('click', (e) => handleCtrlClick(e, () => armSimulation('erosion')));
        dom.btnDla.addEventListener('click', (e) => handleCtrlClick(e, () => armSimulation('dla')));
        dom.btnPlayPauseLife.addEventListener('click', (e) => handleCtrlClick(e, togglePlayPauseLife));
        dom.btnStepForward.addEventListener('click', (e) => handleCtrlClick(e, stepForward));
        dom.btnNudgeBrighter.addEventListener('click', (e) => handleCtrlClick(e, () => nudgeColors(1)));
        dom.btnNudgeDarker.addEventListener('click', (e) => handleCtrlClick(e, () => nudgeColors(-1)));
        dom.btnLangToggle.addEventListener('click', toggleLanguage);
        dom.btnExitBreathe.addEventListener('click', stopBreatheAnimation);
        
        document.querySelectorAll('.ctrl').forEach(btn => { 
            btn.addEventListener('pointerdown', handlePointerDownCtrl); 
            btn.addEventListener('pointerup', hideLongPressDisplay); 
            btn.addEventListener('pointerleave', hideLongPressDisplay); 
        });

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