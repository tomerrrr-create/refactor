// js/app.js

import { getText, setCurrentLang, initializeLanguage, getCurrentLang, getAvailableLangs, translations } from './i18n.js';
import * as C from './constants.js';
import * as Simulations from './simulations.js';
import { dom } from './dom-elements.js';

(function() {
      // ---- Helper function for color sorting ----
      function getLuminance(hex) {
        const rgb = parseInt(hex.substring(1), 16);
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = (rgb >> 0) & 0xff;
        // Formula for perceived brightness
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }

      // ---- Sort all palettes by luminance on startup ----
      C.PALETTES.forEach(palette => {
        palette.colors.sort((a, b) => getLuminance(a) - getLuminance(b));
      });

      // ---- Onboarding State ----
      let isOnboarding = false;
      let onboardingStep = 0; // 0 = inactive, 1 = start, 2 = undo/redo, 3 = more tools, 4 = full UI
      
      // ---- START: Game of Life Rules Object ----
      let gameOfLifeRules = { ...C.defaultGameOfLifeRules };
      // ---- END: Game of Life Rules Object ----

      // ---- START: Gravitational Sort Rules Object ----
      let gravitationalSortRules = { ...C.defaultGravitationalSortRules };
      // ---- END: Gravitational Sort Rules Object ----

      // ---- START: Erosion Rules Object ----
      let erosionRules = { ...C.defaultErosionRules };
      // ---- END: Erosion Rules Object ----

      // ---- START: DLA Rules and State Objects ----
      let dlaRules = { ...C.defaultDlaRules };
      let dlaState = null;
      // ---- END: DLA Rules and State Objects ----

      let activePaletteIndex = 0;
      let n = 11;
      let separatorPx = 0;
      let isBrushModeOn = true; 
      let hasPerformedInitialAutofill = false; 
      let hasTriggeredFirstNudge = false;
      let hasUsedRandomize = false;
      let isAnimating = false;
      let isBreathing = false;
      let isSimModeActive = false;
      let selectedColor = null;
      let isRainbowModeActive = false;
      let selectedColorIndex = -1;
      let colorPickerPage = 0;
      let generatedImageFile = null;
      let longPressTimer = null;
      let wasLongPress = false;


      // ---- START: State variables for new "Arm & Play" logic ----
      let isLifePlaying = false;
      let lifeIntervalId = null;
      let armedSimulation = null; // Can be 'gameOfLife', 'brightnessEvo', 'breathe', 'gravitationalSort', 'erosion', 'dla'
      // ---- END: New state variables ----

      let symmetryMode = 'off';
      
      const tiles = () => Array.from(dom.board.querySelectorAll('.tile'));
      const isGold = (el) => !!el.dataset.goldOverlay;
      const paletteLen = () => palette().length;
      const norm = (k, m = paletteLen()) => ((k % m) + m) % m;

      let history = [];
      let future = [];

      // ---- Element Cache Removed ----
      // All DOM elements are now accessed via the 'dom' object from dom-elements.js

      const originalColorPickerIconHTML = dom.btnColorPicker.innerHTML;
      const tileClasses = 'tile aspect-square w-full outline-none focus-visible:ring-inset focus-visible:ring-4 focus-visible:ring-white/90';


      function palette() { return C.PALETTES[activePaletteIndex].colors; }

      function getCurrentState() {
          return { 
            n, 
            activePaletteIndex, 
            paletteName: C.PALETTES[activePaletteIndex].originalName, 
            separatorPx, 
            symmetryMode,
            selectedColor,
            isRainbowModeActive,
            tiles: tiles().map(el => ({ 
                k: getIndex(el), 
                isGold: isGold(el),
                v: el.dataset.v !== undefined ? parseFloat(el.dataset.v) : getIndex(el) 
            }))
          };
      }

      function areStatesEqual(stateA, stateB) {
        if (!stateA || !stateB) return false;
        if (stateA.n !== stateB.n || stateA.activePaletteIndex !== stateB.activePaletteIndex || stateA.separatorPx !== stateB.separatorPx || stateA.symmetryMode !== stateB.symmetryMode || stateA.selectedColor !== stateB.selectedColor || stateA.isRainbowModeActive !== stateB.isRainbowModeActive || stateA.tiles.length !== stateB.tiles.length) return false;
        for (let i = 0; i < stateA.tiles.length; i++) {
          if (stateA.tiles[i].k !== stateB.tiles[i].k || stateA.tiles[i].isGold !== stateB.isGold) return false;
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
        symmetryMode = state.symmetryMode || 'off';

        selectedColor = state.selectedColor || null;
        isRainbowModeActive = state.isRainbowModeActive || false;
        if (selectedColor) {
            selectedColorIndex = palette().indexOf(selectedColor);
            if (selectedColorIndex === -1) {
                selectedColor = null;
            }
        } else {
            selectedColorIndex = -1;
        }
        updateGlowEffect();
        updateColorPickerButtonUI();

        updatePaletteHeader();
        applySeparator();
        updateSymmetryUI();
        if (n !== state.n) {
            n = state.n;
            buildBoard(n, false);
        }
        const tileElements = tiles();
        state.tiles.forEach((tileState, i) => {
            if (tileElements[i]) {
                const el = tileElements[i];
                const k = (typeof tileState === 'object' && tileState !== null) ? tileState.k : tileState;
                const isG = (typeof tileState === 'object' && tileState !== null) ? tileState.isGold : false;

                if (isG) {
                    applyGoldOverlay(el);
                } else {
                    clearGoldOverlay(el);
                    setIndex(el, k);
                }
                
                if (tileState && typeof tileState.v !== 'undefined') {
                    el.dataset.v = tileState.v;
                } else {
                    delete el.dataset.v;
                }
            }
        });
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
        clearAllHighlights();
        updateUndoRedoButtons();
      }
      function redo() {
        if (future.length === 0) return;
        const nextAction = future.pop();
        history.push(nextAction);
        applyState(nextAction.after);
        clearAllHighlights();
        updateUndoRedoButtons();
      }
      function updateUndoRedoButtons() {
        dom.btnUndo.disabled = history.length === 0;
        dom.btnRedo.disabled = future.length === 0;
      }

      function getPaletteColor(k) { return palette()[norm(k)]; }
      function createTile(idx = 0) {
        const d = document.createElement('div');
        d.className = tileClasses;
        d.setAttribute('role', 'gridcell');
        d.setAttribute('tabindex', '0');
        setIndex(d, idx);
        return d;
      }
      function setIndex(el, k, v) {
        const finalK = Math.round(k);
        el.dataset.k = String(finalK);
        if (!isGold(el)) {
          el.style.background = getPaletteColor(finalK);
        }
        if (v !== undefined) {
            el.dataset.v = v;
        } else {
            delete el.dataset.v;
        }
      }
      function getIndex(el) { return parseInt(el.dataset.k || '0', 10); }
      function applyGoldOverlay(el) { el.style.background = C.GOLD; el.dataset.goldOverlay = '1'; }
      function clearGoldOverlay(el) {
        if (isGold(el)) {
          delete el.dataset.goldOverlay;
          el.style.background = getPaletteColor(getIndex(el));
        }
      }
      function clearAllHighlights() {
        tiles().forEach(el => {
            el.classList.remove('source-highlight', 'target-highlight');
        });
      }
      function buildBoard(size, applyGold = true) {
        dom.root.style.setProperty('--grid-size', size);
        dom.board.innerHTML = '';
        const frag = document.createDocumentFragment();
        for (let i = 0; i < size * size; i++) {
            const tile = createTile(0);
            if(applyGold) applyGoldOverlay(tile);
            frag.appendChild(tile);
        }
        dom.board.appendChild(frag);
        if (applyGold) { hasPerformedInitialAutofill = false; }
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
        dom.root.style.setProperty('--gap-px', separatorPx + 'px');
        dom.root.style.setProperty('--tile-radius', (separatorPx === 0 ? '0px' : '2px'));
        dom.btnGap.title = getText('tooltip_gap');
        dom.btnGap.setAttribute('aria-label', getText('tooltip_gap'));
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
        const currentTiles = tiles();
        const BLACK_INDEX = 0; // Black is the first color in the default palette

        // Calculate the center tile index
        const centerIndex = Math.floor((n * n) / 2);

        currentTiles.forEach((tile, index) => {
          clearGoldOverlay(tile); // Clear any existing gold overlays first
          if (index === centerIndex) {
            // This is the center tile, make it gold
            applyGoldOverlay(tile);
          } else {
            // All other tiles are black
            setIndex(tile, BLACK_INDEX);
          }
        });
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
        tiles().forEach(el => {
          clearGoldOverlay(el);
          setIndex(el, Math.floor(Math.random() * paletteLen()));
        });
      }
      function randomizeAll() {
        performAction(fillRandom);
        hasUsedRandomize = true;
      }

      function shuffleExistingColors() {
          const nonGoldTiles = tiles().filter(tile => !isGold(tile));
          if (nonGoldTiles.length < 2) return;

          const existingColors = nonGoldTiles.map(tile => getIndex(tile));

          for (let i = existingColors.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [existingColors[i], existingColors[j]] = [existingColors[j], existingColors[i]];
          }

          nonGoldTiles.forEach((tile, index) => {
              setIndex(tile, existingColors[index]);
          });
      }

      function goDark() {
        const darkestIndex = 0; // With sorted palettes, the first is always the darkest
        tiles().forEach(el => {
          clearGoldOverlay(el);
          setIndex(el, darkestIndex);
        });
      }

      function goDarkAction() {
        animateBoardTransition(() => performAction(goDark));
      }
      
      function invertGrid() {
        performAction(() => {
            const len = paletteLen();
            tiles().forEach(el => {
                const currentIndex = getIndex(el);
                const invertedIndex = (len - 1) - currentIndex;
                setIndex(el, invertedIndex);
            });
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
            applySeparator();
            updateSymmetryUI();
            buildBoard(n, false); 
            applyInitialPattern();
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
        applySeparator();
        buildBoard(n, false);
        fillRandom();
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
            tiles().forEach(el => {
                if (!isGold(el)) { // Don't change gold tiles
                    el.style.background = palette()[norm(getIndex(el))];
                }
            });
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
        const oldStates1D = tiles().map(el => ({ k: getIndex(el), isGold: isGold(el) }));
        const oldSize = n;
        const oldStates2D = [];
        for (let i = 0; i < oldSize; i++) {
            oldStates2D.push(oldStates1D.slice(i * oldSize, (i + 1) * oldSize));
        }
        n = newSize;
        buildBoard(n, false);
        const newTiles = tiles();
        const diff = oldSize - newSize;
        const offset = Math.floor(Math.abs(diff) / 2);
        if (newSize < oldSize) {
            for (let row = 0; row < newSize; row++) {
                for (let col = 0; col < newSize; col++) {
                    const newIndex = row * newSize + col;
                    const oldRowInOldGrid = row + offset;
                    const oldColInOldGrid = col + offset;
                    if (oldRowInOldGrid < oldSize && oldColInOldGrid < oldSize) {
                        const oldState = oldStates2D[oldRowInOldGrid][oldColInOldGrid];
                        if (newTiles[newIndex] && oldState) {
                            if (oldState.isGold) { applyGoldOverlay(newTiles[newIndex]); } 
                            else { clearGoldOverlay(newTiles[newIndex]); setIndex(newTiles[newIndex], oldState.k); }
                        }
                    }
                }
            }
        } else {
            for (let row = 0; row < newSize; row++) {
                for (let col = 0; col < newSize; col++) {
                    const newIndex = row * newSize + col;
                    const newTile = newTiles[newIndex];
                    const oldRowInOldGrid = row - offset;
                    const oldColInOldGrid = col - offset;
                    const isWithinOldBounds = oldRowInOldGrid >= 0 && oldRowInOldGrid < oldSize && oldColInOldGrid >= 0 && oldColInOldGrid < oldSize;
                    if (isWithinOldBounds) {
                        const oldState = oldStates2D[oldRowInOldGrid][oldColInOldGrid];
                        if (oldState) {
                            if (oldState.isGold) { applyGoldOverlay(newTile); } 
                            else { clearGoldOverlay(newTile); setIndex(newTile, oldState.k); }
                        }
                    } else {
                        clearGoldOverlay(newTile);
                        setIndex(newTile, 0);
                    }
                }
            }
        }
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
      
      // ---- START: DLA Simulation Initialization ----
      function initializeDla() {
        const allTiles = tiles();
        const initialCrystal = new Set();

        // Scan the board for existing art (any tile that isn't the darkest color)
        allTiles.forEach((tile, index) => {
            if (getIndex(tile) > 0) {
                initialCrystal.add(index);
            }
        });

        // If the board was empty, create a single seed in the center as a fallback
        if (initialCrystal.size === 0) {
            const centerIndex = Math.floor((n * n) / 2);
            initialCrystal.add(centerIndex);
            
            const seedColorIndex = Math.floor(palette().length / 2);
            setIndex(allTiles[centerIndex], seedColorIndex);
        }

        const walkerCount = n * 4;
        const initialWalkers = [];
        for (let i = 0; i < walkerCount; i++) {
            initialWalkers.push({ 
                y: Math.floor(Math.random() * n), 
                x: Math.floor(Math.random() * n) 
            });
        }

        dlaState = {
            crystal: initialCrystal,
            walkers: initialWalkers,
            isInitialized: true,
            isFinished: false,
            lastWalkerIndex: 0
        };
      }
      // ---- END: DLA Simulation Initialization ----

      // ---- START: "Arm & Play" and Breathing Logic ----

      function _stopBreatheAnimation() {
        tiles().forEach(tile => {
            tile.classList.remove('breathing-tile');
            tile.style.animationDelay = '';
        });
        isBreathing = false;
      }

      function pauseLife() {
        if (!isLifePlaying) return;
        
        _stopBreatheAnimation();

        isLifePlaying = false;
        clearInterval(lifeIntervalId);
        lifeIntervalId = null;
        
        dom.iconPlay.style.display = 'block';
        dom.iconPause.style.display = 'none';

        if (armedSimulation === 'gameOfLife' || armedSimulation === 'brightnessEvo' || armedSimulation === 'gravitationalSort' || armedSimulation === 'erosion' || armedSimulation === 'dla') {
          dom.btnStepForward.disabled = false;
        }

        dom.btnGameOfLife.disabled = false;
        dom.btnBrightnessEvo.disabled = false;
        dom.btnShowBreatheMenu.disabled = false;
        dom.btnGravitationalSort.disabled = false;
        dom.btnErosion.disabled = false;
        dom.btnDla.disabled = false;
      }

      function stepForward() {
        let simulationFn;
        switch(armedSimulation) {
            case 'gameOfLife': simulationFn = Simulations.runGameOfLifeGeneration; break;
            case 'brightnessEvo': simulationFn = Simulations.runBrightnessEvolution; break;
            case 'gravitationalSort': simulationFn = Simulations.runGravitationalSortGeneration; break;
            case 'erosion': simulationFn = Simulations.runErosionGeneration; break;
            case 'dla': simulationFn = Simulations.runDlaGeneration; break;
            default: return;
        }
        
        const context = {
            n,
            allCurrentTiles: tiles(),
            currentPalette: palette(),
            gameOfLifeRules,
            gravitationalSortRules,
            erosionRules,
            dlaState,
            dlaRules, // Pass new DLA rules
            getIndex,
            isGold,
            setIndex
        };

        if (armedSimulation === 'dla') {
             const newDlaState = simulationFn(context);
             if (newDlaState) { 
                dlaState = newDlaState;
             }
        } else {
             performAction(() => simulationFn(context));
        }
      }

      function togglePlayPauseLife() {
          if (isLifePlaying) {
              pauseLife();
              return;
          }

          if (!armedSimulation) return;

          let simulationFn;
          let interval = 200;

          switch (armedSimulation) {
              case 'gameOfLife':
                  simulationFn = Simulations.runGameOfLifeGeneration;
                  break;
              case 'brightnessEvo':
                  simulationFn = Simulations.runBrightnessEvolution;
                  break;
              case 'gravitationalSort':
                  simulationFn = Simulations.runGravitationalSortGeneration;
                  interval = 150; 
                  break;
              case 'erosion':
                  simulationFn = Simulations.runErosionGeneration;
                  interval = 100;
                  break;
              case 'dla':
                  simulationFn = Simulations.runDlaGeneration;
                  interval = 16; // Faster interval for smoother DLA
                  break;
              case 'breathe':
                  openBreatheModal();
                  return; 
          }
          
          if (simulationFn) {
              isLifePlaying = true;
              dom.iconPlay.style.display = 'none';
              dom.iconPause.style.display = 'block';
              dom.btnGameOfLife.disabled = true;
              dom.btnBrightnessEvo.disabled = true;
              dom.btnShowBreatheMenu.disabled = true;
              dom.btnGravitationalSort.disabled = true;
              dom.btnErosion.disabled = true;
              dom.btnDla.disabled = true;
              dom.btnStepForward.disabled = true;
              lifeIntervalId = setInterval(() => {
                const context = {
                    n,
                    allCurrentTiles: tiles(),
                    currentPalette: palette(),
                    gameOfLifeRules,
                    gravitationalSortRules,
                    erosionRules,
                    dlaState,
                    dlaRules, // Pass new DLA rules
                    getIndex,
                    isGold,
                    setIndex
                };
                if (armedSimulation === 'dla') {
                    const newDlaState = simulationFn(context);
                    if (newDlaState) { 
                        dlaState = newDlaState;
                    }
                } else {
                    performAction(() => simulationFn(context));
                }
              }, interval);
          }
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
          dom.btnPlayPauseLife.disabled = false;

          if (simulationName === 'dla') {
             // DLA initialization is visual and part of the creative process, so it is undoable.
             performAction(initializeDla);
          }
          
          if (simulationName !== 'breathe') {
            dom.btnStepForward.disabled = false;
          } else {
            dom.btnStepForward.disabled = true;
          }
          
          const buttonToActivate = simButtons.find(btn => btn.id.toLowerCase().includes(simulationName.toLowerCase()));
          if(buttonToActivate) {
            buttonToActivate.classList.add('simulation-active');
          }
        }
      }

      function resetArmedState() {
        armedSimulation = null;
        dlaState = null;
        const simButtons = [dom.btnGameOfLife, dom.btnBrightnessEvo, dom.btnShowBreatheMenu, dom.btnGravitationalSort, dom.btnErosion, dom.btnDla];
        simButtons.forEach(btn => btn.classList.remove('simulation-active'));
        dom.btnPlayPauseLife.disabled = true;
        dom.btnStepForward.disabled = true;
      }
      
      function startBreathingEffect(isGrouped = false) {
          if (isLifePlaying) return;
          isBreathing = true;
          isLifePlaying = true;

          dom.iconPlay.style.display = 'none';
          dom.iconPause.style.display = 'block';
          dom.btnGameOfLife.disabled = true;
          dom.btnBrightnessEvo.disabled = true;
          dom.btnShowBreatheMenu.disabled = true;
          
          const allTiles = tiles();
          if (isGrouped) {
              const colorDelayMap = new Map();
              const uniqueColors = [...new Set(allTiles.map(tile => {
                  return isGold(tile) ? C.GOLD : tile.style.backgroundColor;
              }))];
              uniqueColors.forEach(color => {
                  colorDelayMap.set(color, Math.random() * 3);
              });
              allTiles.forEach(tile => {
                  const colorKey = isGold(tile) ? C.GOLD : tile.style.backgroundColor;
                  const delay = colorDelayMap.get(colorKey);
                  tile.style.animationDelay = `${delay}s`;
                  tile.classList.add('breathing-tile');
              });
          } else {
              allTiles.forEach(tile => {
                  tile.style.animationDelay = `${Math.random() * 3}s`;
                  tile.classList.add('breathing-tile');
              });
          }
      }

      // --- END: "Arm & Play" and Breathing Logic ---

      function prepareBoardForSimMode() {
        animateBoardTransition(() => {
            performAction(() => {
                if (n !== 75) {
                    _performResize(75);
                }
                separatorPx = 0; 
                applySeparator();
                symmetryMode = 'kaleidoscope'; 
                updateSymmetryUI();

                goDark();

                const currentPalette = palette();
                const lightestIndex = currentPalette.length - 1;
                selectedColor = currentPalette[lightestIndex];
                selectedColorIndex = lightestIndex;
                isRainbowModeActive = false;
                updateColorPickerButtonUI();
                updateGlowEffect();
            });
        });
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

            const controlsToHide = [
                dom.btnBrushMode, dom.btnGap, dom.btnResetBoard,
                dom.btnTutorial, dom.btnSave, dom.btnSpecialReset,
                dom.btnPalette, dom.btnInvert
            ];

            controlsToHide.forEach(btn => btn.classList.toggle('control-hidden', isSimModeActive));
            dom.btnPlayPauseLife.classList.toggle('control-hidden', !isSimModeActive);
            dom.btnToggleSimMode.classList.toggle('active', isSimModeActive);

            dom.controlsContainer.style.opacity = '1';
        }, duration);
      }

      function setBrushMode(isBrushOn) {
          isBrushModeOn = isBrushOn;
          dom.btnBrushMode.classList.toggle('brush-on', isBrushOn);
          const newTitle = isBrushOn ? getText('brushMode_paint') : getText('brushMode_copy');
          dom.btnBrushMode.title = newTitle;
          dom.btnBrushMode.setAttribute('aria-label', newTitle);
          clearAllHighlights();
          if (pointerState.dragSource) pointerState.dragSource = null;
      }
      function toggleBrushMode() {
          setBrushMode(!isBrushModeOn);
      }
      function closeModal() {
        dom.saveModal.classList.remove('modal-visible');
        if (dom.imagePreview.src) { URL.revokeObjectURL(dom.imagePreview.src); }
        dom.imagePreview.src = '';
        generatedImageFile = null;
      }

      async function savePNG_Optimized() {
        dom.btnSave.disabled = true;
        const TILE_SIZE = 20;
        const GAP_SIZE = separatorPx > 0 ? 2 : 0;
        const PADDING = 50;
        const canvasSize = (n * TILE_SIZE) + ((n - 1) * GAP_SIZE) + PADDING;

        const canvas = document.createElement('canvas');
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        const currentTiles = tiles();
        const currentPalette = palette();

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const tileIndex = i * n + j;
                const tileElement = currentTiles[tileIndex];
                
                if (isGold(tileElement)) {
                    ctx.fillStyle = C.GOLD;
                } else {
                    const colorIndex = getIndex(tileElement);
                    ctx.fillStyle = currentPalette[norm(colorIndex, currentPalette.length)];
                }

                const x = (j * (TILE_SIZE + GAP_SIZE)) + (PADDING / 2);
                const y = (i * (TILE_SIZE + GAP_SIZE)) + (PADDING / 2);

                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            }
        }
        
        canvas.toBlob((blob) => {
            if (!blob) {
                console.error('Blob creation failed');
                dom.btnSave.disabled = false;
                return;
            }
            generatedImageFile = new File([blob], 'board.png', { type: 'image/png' });
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

      function getSymmetricIndices(index) {
          if (symmetryMode === 'off') return [index];
          const row = Math.floor(index / n);
          const col = index % n;
          const N = n - 1;
          const indices = new Set([index]);

          if (symmetryMode === 'horizontal' || symmetryMode === 'mandala' || symmetryMode === 'kaleidoscope') {
              indices.add(row * n + (N - col));
          }
          if (symmetryMode === 'vertical' || symmetryMode === 'mandala' || symmetryMode === 'kaleidoscope') {
              indices.add((N - row) * n + col);
          }
          if (symmetryMode === 'mandala' || symmetryMode === 'kaleidoscope') {
              indices.add((N - row) * n + (N - col));
          }
          if (symmetryMode === 'kaleidoscope') {
              const currentPoints = Array.from(indices).map(idx => ({ r: Math.floor(idx / n), c: idx % n }));
              currentPoints.forEach(pt => {
                  indices.add(pt.c * n + pt.r);
              });
          }
          return Array.from(indices);
      }
      
      function updateSymmetryButtonUI() {
          const parts = {
              top: dom.btnSymmetry.querySelector('.part.top'),
              bottom: dom.btnSymmetry.querySelector('.part.bottom'),
              left: dom.btnSymmetry.querySelector('.part.left'),
              right: dom.btnSymmetry.querySelector('.part.right'),
              centerDot: dom.btnSymmetry.querySelector('.part.center-dot'),
          };
          const activeColor = C.GOLD;
          const inactiveColor = 'transparent';

          // Reset all parts
          parts.top.style.stroke = inactiveColor;
          parts.bottom.style.stroke = inactiveColor;
          parts.left.style.stroke = inactiveColor;
          parts.right.style.stroke = inactiveColor;
          parts.centerDot.style.fill = inactiveColor;
          
          if (symmetryMode === 'vertical') {
              parts.top.style.stroke = activeColor;
              parts.bottom.style.stroke = activeColor;
          } else if (symmetryMode === 'horizontal') {
              parts.left.style.stroke = activeColor;
              parts.right.style.stroke = activeColor;
          } else if (symmetryMode === 'mandala') {
              parts.top.style.stroke = activeColor;
              parts.bottom.style.stroke = activeColor;
              parts.left.style.stroke = activeColor;
              parts.right.style.stroke = activeColor;
          } else if (symmetryMode === 'kaleidoscope') {
              parts.top.style.stroke = activeColor;
              parts.bottom.style.stroke = activeColor;
              parts.left.style.stroke = activeColor;
              parts.right.style.stroke = activeColor;
              parts.centerDot.style.fill = activeColor;
          }

          let titleKey;
          switch (symmetryMode) {
              case 'vertical': titleKey = 'symmetry_vertical'; break;
              case 'horizontal': titleKey = 'symmetry_horizontal'; break;
              case 'mandala': titleKey = 'symmetry_mandala'; break;
              case 'kaleidoscope': titleKey = 'symmetry_kaleidoscope'; break;
              default: titleKey = 'symmetry_off';
          }
          const title = getText(titleKey);
          dom.btnSymmetry.setAttribute('aria-label', title);
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

      const pointerState = { id: null, downEl: null, downX: 0, downY: 0, longPressTimer: null, suppressClick: false, isDragging: false, dragSource: null, currentTarget: null, beforeState: null, longPressTarget: null };
      
      function applyActionToTiles(indices, actionFn) {
          const allTiles = tiles();
          indices.forEach(idx => {
              if (allTiles[idx]) {
                  actionFn(allTiles[idx]);
              }
          });
      }

      function onPointerDown(e) {
        if (isLifePlaying) return;
        const el = e.target.closest('.tile'); if (!el) return;
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        Object.assign(pointerState, { id: e.pointerId, downEl: el, downX: e.clientX, downY: e.clientY, suppressClick: false, isDragging: false, dragSource: null, currentTarget: null, beforeState: getCurrentState() });
        
        pointerState.longPressTimer = setTimeout(() => {
            if (pointerState.isDragging) return;
            pointerState.suppressClick = true;
            if (selectedColor || isRainbowModeActive) {
                performAction(resetSelectedColor);
            } else {
                openColorPickerModal(el);
            }
        }, C.LONG_PRESS_SHOW_MS);

        if (!isBrushModeOn) { 
            clearAllHighlights(); 
            el.classList.add('source-highlight'); 
            pointerState.dragSource = el; 
        }
      }

      function onPointerMove(e) {
        if (pointerState.id !== e.pointerId) return;
        if (!pointerState.isDragging) {
            const dist = Math.hypot(e.clientX - pointerState.downX, e.clientY - pointerState.downY);
            if (dist >= 8) {
                clearTimeout(pointerState.longPressTimer);
                pointerState.longPressTimer = null;
                pointerState.isDragging = true;
                pointerState.suppressClick = true;
                if (isBrushModeOn && selectedColorIndex === -1) {
                    pointerState.dragSource = pointerState.downEl;
                    clearGoldOverlay(pointerState.dragSource);
                }
            }
        }
        if (!pointerState.isDragging) return;
        const targetEl = document.elementFromPoint(e.clientX, e.clientY)?.closest('.tile');
        if (!targetEl || targetEl === pointerState.currentTarget) return;
        pointerState.currentTarget?.classList.remove('ring-4', 'ring-white', 'target-highlight');
        pointerState.currentTarget = targetEl;
        if (isBrushModeOn) {
            if (isRainbowModeActive) {
                const targetIndices = getSymmetricIndices(tiles().indexOf(targetEl));
                applyActionToTiles(targetIndices, tile => {
                    clearGoldOverlay(tile);
                    const randomIndex = Math.floor(Math.random() * paletteLen());
                    setIndex(tile, randomIndex);
                });
            } else if (selectedColorIndex !== -1) {
                const targetIndices = getSymmetricIndices(tiles().indexOf(targetEl));
                applyActionToTiles(targetIndices, tile => {
                    clearGoldOverlay(tile);
                    setIndex(tile, selectedColorIndex);
                });
            } else {
                const sourceIndex = getIndex(pointerState.dragSource);
                const targetIndices = getSymmetricIndices(tiles().indexOf(targetEl));
                applyActionToTiles(targetIndices, tile => {
                    clearGoldOverlay(tile);
                    setIndex(tile, sourceIndex);
                });
                targetEl.classList.add('ring-4', 'ring-white');
            }
        } else {
            if (targetEl !== pointerState.dragSource) {
                targetEl.classList.add('target-highlight');
            } else {
                pointerState.currentTarget = null;
            }
        }
      }

      function onPointerUp(e) {
        if (isBreathing) return;
        clearTimeout(pointerState.longPressTimer);
        const beforeState = pointerState.beforeState;
        if (pointerState.isDragging) {
            if (!isBrushModeOn && pointerState.currentTarget) {
                const sourceEl = pointerState.dragSource; 
                const targetEl = pointerState.currentTarget;
                const targetIndices = getSymmetricIndices(tiles().indexOf(targetEl));
                applyActionToTiles(targetIndices, tile => {
                    if (isGold(sourceEl)) { applyGoldOverlay(tile); } 
                    else { clearGoldOverlay(tile); setIndex(tile, getIndex(sourceEl)); }
                });
            }
        } else if (!pointerState.suppressClick && e.target.closest('.tile')) {
            const tile = e.target.closest('.tile');
            if (isRainbowModeActive) {
                const indices = getSymmetricIndices(tiles().indexOf(tile));
                applyActionToTiles(indices, el => {
                    clearGoldOverlay(el);
                    const randomIndex = Math.floor(Math.random() * paletteLen());
                    setIndex(el, randomIndex);
                });
            } else if (selectedColorIndex !== -1) {
                const indices = getSymmetricIndices(tiles().indexOf(tile));
                applyActionToTiles(indices, el => {
                    clearGoldOverlay(el);
                    setIndex(el, selectedColorIndex);
                });
            } else {
                const indices = getSymmetricIndices(tiles().indexOf(tile));
                applyActionToTiles(indices, el => {
                    clearGoldOverlay(el); 
                    setIndex(el, getIndex(el) + 1);
                });
            }
        }
        const afterState = getCurrentState();
        if (beforeState && !areStatesEqual(beforeState, afterState)) {
             pushHistory({ before: beforeState, after: afterState }); 
             hasPerformedInitialAutofill = true;
             if (isOnboarding) {
                if (onboardingStep === 1) advanceOnboarding(2);
                else if (onboardingStep === 2) advanceOnboarding(3);
                else if (onboardingStep === 3) advanceOnboarding(4);
             }
        }
        clearAllHighlights();
        pointerState.currentTarget?.classList.remove('ring-4', 'ring-white', 'target-highlight');
        Object.assign(pointerState, { id: null, downEl: null, isDragging: false, dragSource: null, currentTarget: null, beforeState: null, longPressTarget: null });
      }

      function updateLayout() {
        if (window.innerWidth < 768) { dom.appShell.style.width = ''; return; }
        const controlsHeight = dom.controlsContainer.offsetHeight;
        const viewportHeight = window.innerHeight;
        const topMargin = parseInt(window.getComputedStyle(dom.appShell.parentElement).paddingTop, 10);
        const availableHeight = viewportHeight - controlsHeight - (topMargin * 2);
        const newWidth = Math.min(720, window.innerWidth * 0.85, availableHeight);
        dom.appShell.style.width = `${newWidth}px`;
      }
      dom.board.addEventListener('pointerdown', onPointerDown);
      dom.board.addEventListener('pointermove', onPointerMove);
      dom.board.addEventListener('pointerup', onPointerUp);
      dom.board.addEventListener('pointercancel', onPointerUp);

      function openBreatheModal() {
        if (isLifePlaying) return;
        dom.breatheModal.classList.add('modal-visible');
      }

      function closeBreatheModal() {
        dom.breatheModal.classList.remove('modal-visible');
      }

      function openResizeModal() {
        if (isBreathing) return;
        dom.resizeInput.value = n; 
        dom.resizeModal.classList.add('modal-visible');
        dom.resizeInput.focus();
        dom.resizeInput.select();
    }

    function closeResizeModal() {
        dom.resizeModal.classList.remove('modal-visible');
    }

    function handleConfirmResize() {
        let newSize = parseInt(dom.resizeInput.value, 10);
        if (isNaN(newSize) || newSize < 1 || newSize > 75) {
            dom.resizeInput.style.borderColor = 'red';
            setTimeout(() => { dom.resizeInput.style.borderColor = ''; }, 1000);
            return;
        }
        closeResizeModal();
        if (newSize !== n) {
             animateBoardTransition(() => performAction(() => _performResize(newSize)));
        }
    }

    function createRainbowIconSVG(currentPalette) {
        const p = currentPalette || palette();
        const c1 = p[0] || '#FFD700';
        const c2 = p[Math.floor(p.length / 4)] || '#42A5F5';
        const c3 = p[Math.floor(p.length / 2)] || '#F44336';
        const c4 = p[Math.floor(p.length * 3 / 4)] || '#66BB6A';
        return `<svg viewBox="0 0 24 24" fill="none" stroke="none" style="width: var(--icon-size); height: var(--icon-size);">
            <rect x="4" y="4" width="8" height="8" fill="${c1}" rx="1"/>
            <rect x="12" y="4" width="8" height="8" fill="${c2}" rx="1"/>
            <rect x="4" y="12" width="8" height="8" fill="${c3}" rx="1"/>
            <rect x="12" y="12" width="8" height="8" fill="${c4}" rx="1"/>
        </svg>`;
    }
    
    function updateGlowEffect() {
        if (isRainbowModeActive) {
            dom.board.classList.add('glowing-border-rainbow');
            dom.board.classList.remove('glowing-border');
        } else if (selectedColor) {
            dom.root.style.setProperty('--glow-color', selectedColor);
            dom.board.classList.add('glowing-border');
            dom.board.classList.remove('glowing-border-rainbow');
        } else {
            dom.board.classList.remove('glowing-border', 'glowing-border-rainbow');
        }
    }

    function updateColorPickerButtonUI() {
        if (!dom.btnColorPicker.querySelector('circle') && !isRainbowModeActive) {
            dom.btnColorPicker.innerHTML = originalColorPickerIconHTML;
        }
        const colorPickerIconCircle = dom.btnColorPicker.querySelector('svg circle');
        if (isRainbowModeActive) {
            dom.btnColorPicker.innerHTML = createRainbowIconSVG();
        } else if (selectedColor) {
            if(colorPickerIconCircle) {
                colorPickerIconCircle.style.fill = selectedColor;
                colorPickerIconCircle.style.stroke = selectedColor === '#000000' ? '#424242' : selectedColor;
            }
        } else {
             if(colorPickerIconCircle) {
                colorPickerIconCircle.style.fill = '#000';
                colorPickerIconCircle.style.stroke = '#fff';
             }
        }
    }

      function selectColorAndClose(color) {
        const targetTile = pointerState.longPressTarget;
        isRainbowModeActive = false;
        selectedColor = color;
        selectedColorIndex = palette().indexOf(color);
        updateGlowEffect();
        updateColorPickerButtonUI();
        if (targetTile) {
            performAction(() => {
                const targetIndices = getSymmetricIndices(tiles().indexOf(targetTile));
                applyActionToTiles(targetIndices, tile => {
                    clearGoldOverlay(tile);
                    setIndex(tile, selectedColorIndex);
                });
            });
        }
        closeColorPickerModal();
      }

      function selectRainbowAndClose() {
        const targetTile = pointerState.longPressTarget;
        isRainbowModeActive = true;
        selectedColor = null;
        selectedColorIndex = -1;
        updateGlowEffect();
        updateColorPickerButtonUI();
        if (targetTile) {
            performAction(() => {
                const targetIndices = getSymmetricIndices(tiles().indexOf(targetTile));
                applyActionToTiles(targetIndices, tile => {
                    clearGoldOverlay(tile);
                    const randomIndex = Math.floor(Math.random() * paletteLen());
                    setIndex(tile, randomIndex);
                });
            });
        }
        closeColorPickerModal();
    }

      function renderColorPickerContent() {
          const currentPalette = C.PALETTES[activePaletteIndex];
          const colors = currentPalette.colors;
          const totalPages = Math.ceil(colors.length / C.COLORS_PER_PAGE);
          
          if (colorPickerPage >= totalPages) {
              colorPickerPage = 0;
          }

          if (totalPages > 1) {
            dom.colorPickerHeader.style.display = 'flex';
          } else {
            dom.colorPickerHeader.style.display = 'none';
          }

          const displayIcon = currentPalette.iconHTML || currentPalette.emoji || '';
          dom.colorPickerPaletteName.innerHTML = displayIcon;
          
          dom.colorPickerSwatches.innerHTML = '';
          const frag = document.createDocumentFragment();

          const rainbowSwatch = document.createElement('div');
          rainbowSwatch.className = 'color-swatch';
          const rainbowSwatchInner = document.createElement('div');
          rainbowSwatchInner.className = 'color-swatch-inner';
          rainbowSwatchInner.innerHTML = createRainbowIconSVG();
          rainbowSwatch.appendChild(rainbowSwatchInner);
          rainbowSwatch.setAttribute('aria-label', getText('colorPicker_rainbow'));
          rainbowSwatch.addEventListener('click', () => selectRainbowAndClose());
          frag.appendChild(rainbowSwatch);

          const startIndex = colorPickerPage * C.COLORS_PER_PAGE;
          const endIndex = startIndex + C.COLORS_PER_PAGE;
          const pageColors = colors.slice(startIndex, endIndex);

          pageColors.forEach((color) => {
              const swatch = document.createElement('div');
              swatch.className = 'color-swatch';
              const swatchInner = document.createElement('div');
              swatchInner.className = 'color-swatch-inner';
              swatchInner.style.backgroundColor = color;
              swatch.appendChild(swatchInner);
              swatch.dataset.color = color;
              swatch.setAttribute('aria-label', `${getText('colorPicker_select')} ${color}`);
              swatch.addEventListener('click', () => selectColorAndClose(color));
              frag.appendChild(swatch);
          });
          
          const placeholdersNeeded = (C.COLORS_PER_PAGE + 1) - (pageColors.length + 1);
          for (let i = 0; i < placeholdersNeeded; i++) {
              const placeholder = document.createElement('div');
              placeholder.className = 'color-swatch';
              placeholder.style.pointerEvents = 'none';
              placeholder.style.opacity = '0';
              frag.appendChild(placeholder);
          }

          dom.colorPickerSwatches.appendChild(frag);

          dom.colorPickerPagination.innerHTML = '';
          if (totalPages > 1) {
              for (let i = 0; i < totalPages; i++) {
                  const dot = document.createElement('div');
                  dot.className = 'pagination-dot' + (i === colorPickerPage ? ' active' : '');
                  dot.dataset.page = i;
                  dot.addEventListener('click', (e) => {
                      colorPickerPage = parseInt(e.target.dataset.page, 10);
                      renderColorPickerContent();
                  });
                  dom.colorPickerPagination.appendChild(dot);
              }
          }
      }

      function openColorPickerModal(targetTile = null) {
          if (isBreathing) return;
          pointerState.longPressTarget = targetTile;
          colorPickerPage = 0;
          renderColorPickerContent();
          dom.colorPickerModal.classList.add('modal-visible');
      }

      function closeColorPickerModal() {
          dom.colorPickerModal.classList.remove('modal-visible');
          pointerState.longPressTarget = null;
      }
      
      function openHelpModal() { 
        populateHelpModal();
        dom.helpModal.classList.add('modal-visible'); 
      }
      function closeHelpModal() { dom.helpModal.classList.remove('modal-visible'); }

      function openPaletteModal() {
        if (isBreathing) return;
        populatePaletteModal();
        dom.paletteModal.classList.add('modal-visible');
      }

      function closePaletteModal() {
          dom.paletteModal.classList.remove('modal-visible');
      }

      function populatePaletteModal() {
          dom.paletteModalGrid.innerHTML = '';
          const frag = document.createDocumentFragment();
          C.PALETTES.forEach((palette, index) => {
              const preview = document.createElement('div');
              preview.className = 'palette-preview';
              preview.addEventListener('click', () => {
                  switchToPalette(index);
                  closePaletteModal();
              });

              const iconContainer = document.createElement('div');
              iconContainer.className = 'palette-preview-icon';

              if (palette.iconHTML) {
                  iconContainer.innerHTML = palette.iconHTML;
                  const childElement = iconContainer.firstElementChild;
                  if (childElement) {
                      childElement.style.width = '40px';
                      childElement.style.height = '40px';
                      if (childElement.tagName.toLowerCase() === 'span') {
                          childElement.style.fontSize = '36px';
                      }
                  }
              } else {
                  iconContainer.textContent = palette.emoji;
              }

              const name = document.createElement('span');
              name.className = 'palette-preview-name';
              name.textContent = palette.name;

              preview.appendChild(iconContainer);
              preview.appendChild(name);
              frag.appendChild(preview);
          });
          dom.paletteModalGrid.appendChild(frag);
      }
      
      // ---- START: Game of Life Settings Modal Functions ----
      function openGolSettingsModal() {
        if (isBreathing || isLifePlaying) return;
        
        dom.golSurvivalMin.value = gameOfLifeRules.survivalMin;
        dom.golSurvivalMax.value = gameOfLifeRules.survivalMax;
        dom.golBirth.value = gameOfLifeRules.birth;
        dom.golLiveCellDef.value = gameOfLifeRules.liveCellDef;
        dom.golColorGenetics.value = gameOfLifeRules.colorGenetics;
        
        dom.gameOfLifeSettingsModal.style.display = 'flex';
        setTimeout(() => dom.gameOfLifeSettingsModal.classList.add('modal-visible'), 10);
      }

      function closeGolSettingsModal() {
        dom.gameOfLifeSettingsModal.classList.remove('modal-visible');
        setTimeout(() => dom.gameOfLifeSettingsModal.style.display = 'none', 300);
      }

      function saveGolSettings() {
        gameOfLifeRules.survivalMin = parseInt(dom.golSurvivalMin.value, 10) || 0;
        gameOfLifeRules.survivalMax = parseInt(dom.golSurvivalMax.value, 10) || 0;
        gameOfLifeRules.birth = parseInt(dom.golBirth.value, 10) || 0;
        gameOfLifeRules.liveCellDef = dom.golLiveCellDef.value;
        gameOfLifeRules.colorGenetics = dom.golColorGenetics.value;
        closeGolSettingsModal();
      }

      function resetGolSettings() {
        gameOfLifeRules = { ...C.defaultGameOfLifeRules };
        dom.golSurvivalMin.value = gameOfLifeRules.survivalMin;
        dom.golSurvivalMax.value = gameOfLifeRules.survivalMax;
        dom.golBirth.value = gameOfLifeRules.birth;
        dom.golLiveCellDef.value = gameOfLifeRules.liveCellDef;
        dom.golColorGenetics.value = gameOfLifeRules.colorGenetics;
      }
      // ---- END: Game of Life Settings Modal Functions ----

      // ---- START: Gravitational Sort Settings Modal Functions ----
      function openGravitationalSortSettingsModal() {
          if (isBreathing || isLifePlaying) return;
          
          dom.gsDirectionButtons.forEach(btn => {
              btn.classList.toggle('active', btn.dataset.direction === gravitationalSortRules.direction);
          });
          
          dom.gsStrengthSlider.value = gravitationalSortRules.strength * 100;
          dom.gsStrengthValue.textContent = `${Math.round(gravitationalSortRules.strength * 100)}%`;

          dom.gravitationalSortSettingsModal.style.display = 'flex';
          setTimeout(() => dom.gravitationalSortSettingsModal.classList.add('modal-visible'), 10);
      }

      function closeGravitationalSortSettingsModal() {
          dom.gravitationalSortSettingsModal.classList.remove('modal-visible');
          setTimeout(() => dom.gravitationalSortSettingsModal.style.display = 'none', 300);
      }

      function saveGravitationalSortSettings() {
          const activeBtn = dom.gravitationalSortSettingsModal.querySelector('.gs-direction-btn.active');
          if (activeBtn) {
              gravitationalSortRules.direction = activeBtn.dataset.direction;
          }
          gravitationalSortRules.strength = parseInt(dom.gsStrengthSlider.value, 10) / 100;
          closeGravitationalSortSettingsModal();
      }
      // ---- END: Gravitational Sort Settings Modal Functions ----

      // ---- START: DLA Settings Modal Functions ----
      function openDlaSettingsModal() {
        if (isBreathing || isLifePlaying) return;

        // Populate the modal with current settings
        dom.dlaColorGeneticsToggle.checked = dlaRules.colorGenetics;
        dom.dlaInjectFromEdgesToggle.checked = dlaRules.injectFromEdges;

        // Populate text content from i18n
        dom.dlaSettingsModal.querySelector('#dlaSettingsTitle').textContent = getText('dla_modal_title');
        dom.dlaSettingsModal.querySelector('#dlaColorGeneticsLabel').textContent = getText('dla_genetics_label');
        dom.dlaSettingsModal.querySelector('#dlaColorGeneticsDesc').textContent = getText('dla_genetics_desc');
        dom.dlaSettingsModal.querySelector('#dlaInjectFromEdgesLabel').textContent = getText('dla_edges_label');
        dom.dlaSettingsModal.querySelector('#dlaInjectFromEdgesDesc').textContent = getText('dla_edges_desc');
        dom.btnDlaSettingsSave.textContent = getText('dla_modal_save_close');
        dom.btnDlaSettingsCancel.textContent = getText('dla_modal_cancel');
        
        dom.dlaSettingsModal.style.display = 'flex';
        setTimeout(() => dom.dlaSettingsModal.classList.add('modal-visible'), 10);
      }

      function closeDlaSettingsModal() {
        dom.dlaSettingsModal.classList.remove('modal-visible');
        setTimeout(() => dom.dlaSettingsModal.style.display = 'none', 300);
      }

      function saveDlaSettings() {
        dlaRules.colorGenetics = dom.dlaColorGeneticsToggle.checked;
        dlaRules.injectFromEdges = dom.dlaInjectFromEdgesToggle.checked;
        closeDlaSettingsModal();
      }
      // ---- END: DLA Settings Modal Functions ----

      function prepareForLifeLongPress() {
          performAction(() => {
              const darkestIndex = 0;
              tiles().forEach(el => {
                  clearGoldOverlay(el);
                  setIndex(el, darkestIndex);
              });
              
              const currentPalette = palette();
              const lightestIndex = currentPalette.length - 1;
              if (lightestIndex >= 0) {
                  selectedColor = currentPalette[lightestIndex];
                  selectedColorIndex = lightestIndex;
                  isRainbowModeActive = false;
                  updateColorPickerButtonUI();
                  updateGlowEffect();
              }
          });
      }

      function handleCtrlClick(e, actionFn) {
        // Allow the play/pause button to function even when breathing
        if (isBreathing && e.currentTarget.id !== 'btnPlayPauseLife') return;

        if (wasLongPress) {
          wasLongPress = false;
          return;
        }
        actionFn();
        if (isOnboarding && onboardingStep === 3) {
            advanceOnboarding(4);
        }
      }

      function handleColorPickerClick() {
        if (selectedColor || isRainbowModeActive) {
            performAction(resetSelectedColor);
        } else {
            openColorPickerModal();
        }
      }

      function navigateColorPages(isNext) {
        const totalPages = Math.ceil(C.PALETTES[activePaletteIndex].colors.length / C.COLORS_PER_PAGE);
        if(totalPages <= 1) return;
        if(isNext) {
          colorPickerPage = (colorPickerPage + 1) % totalPages;
        } else {
          colorPickerPage = (colorPickerPage - 1 + totalPages) % totalPages;
        }
        renderColorPickerContent();
      }
      
      let lastWheelTime = 0; let touchStartX = 0; let touchEndX = 0;
      function handlePaletteWheel(e) { if (Date.now() - lastWheelTime < 200) return; e.preventDefault(); navigateColorPages(e.deltaY > 0); lastWheelTime = Date.now(); }
      function handleTouchStart(e) { touchStartX = e.changedTouches[0].screenX; }
      function handleTouchEnd(e) { touchEndX = e.changedTouches[0].screenX; handleSwipeGesture(); }
      function handleSwipeGesture() { if (touchEndX < touchStartX - 50) { navigateColorPages(true); } if (touchEndX > touchStartX + 50) { navigateColorPages(false); } }
      
      async function handleSaveImage() {
        if (!generatedImageFile) return;
        const isMobile = navigator.share && navigator.canShare;
        const fileToSave = new File([generatedImageFile], getSanitizedFileName('png'), { type: generatedImageFile.type });
        if (isMobile) { try { await navigator.share({ files: [fileToSave], title: 'Followed my intuition' }); } catch (err) { if (err.name !== 'AbortError') { console.error('Share API error:', err); } } } else { const link = document.createElement('a'); link.href = URL.createObjectURL(fileToSave); link.download = fileToSave.name; link.click(); URL.revokeObjectURL(link.href); }
        closeModal();
      }
      async function handleSaveProject() {
          const state = getCurrentState();
          const stateString = JSON.stringify(state, null, 2);
          const blob = new Blob([stateString], { type: 'application/json' });
          const fileName = getSanitizedFileName('json');
          const projectFile = new File([blob], fileName, { type: 'application/json' });
          const isMobile = navigator.share && navigator.canShare;
          if (isMobile) { try { await navigator.share({ files: [projectFile], title: 'My Idea' }); } catch (err) { if (err.name !== 'AbortError') { console.error('Share API error:', err); } } } else { const link = document.createElement('a'); link.href = URL.createObjectURL(projectFile); link.download = fileName; link.click(); URL.revokeObjectURL(link.href); }
          closeModal();
      }
      function handleLoadProject() { dom.projectFileInput.click(); closeModal(); }
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
      function handlePointerDownCtrl(e) {
          if (isBreathing) return;
          const btn = e.currentTarget;
          longPressTimer = setTimeout(() => {
              wasLongPress = true;

              if (btn.id === 'btnRandom') {
                  performAction(shuffleExistingColors);
                  return;
              }
              
              if (btn.id === 'btnToggleSimMode') {
                  if (!isSimModeActive) {
                      toggleSimMode();
                  }
                  prepareBoardForSimMode();
                  return;
              }

              if (btn.id === 'btnGameOfLife') {
                  openGolSettingsModal();
                  return;
              }

              if (btn.id === 'btnGravitationalSort') {
                  openGravitationalSortSettingsModal();
                  return;
              }
              
              if (btn.id === 'btnDla') {
                  openDlaSettingsModal();
                  return;
              }

              if (btn.id === 'btnPalette') {
                  openPaletteModal();
                  return;
              }
              if (btn.id === 'btnResizeUp' || btn.id === 'btnResizeDown') {
                  openResizeModal(); 
                  return; 
              }
              if (btn.id === 'btnBrushMode') {
                  const customHTML = `<div class="flex flex-col items-center justify-center gap-4 text-lg text-gray-300"><div class="flex items-center gap-4"><svg viewBox="0 0 24 24" style="width: var(--icon-size); height: var(--icon-size);"><path d="M12 2 L2 22 L22 22 Z" stroke="#fff" stroke-width="2" fill="#fff" /></svg><span>${getText('brushMode_paint')}</span></div><div class="flex items-center gap-4"><svg viewBox="0 0 24 24" style="width: var(--icon-size); height: var(--icon-size);"><path d="M12 2 L2 22 L22 22 Z" stroke="#fff" stroke-width="2" fill="#000" /></svg><span>${getText('brushMode_copy')}</span></div></div>`;
                  dom.longPressDisplay.innerHTML = customHTML;
              } else {
                  let iconElement;
                  if (btn.classList.contains('palette')) { iconElement = btn.cloneNode(true); iconElement.style.background = 'transparent'; iconElement.style.border = 'none'; } 
                  else { iconElement = btn.querySelector('.glyph, svg, .glyph-save, .glyph-reset, .glyph-special-reset, .glyph-dark'); }
                  if (!iconElement) return;
                  const clonedIcon = iconElement.cloneNode(true);
                  const baseIconSize = parseInt(getComputedStyle(dom.root).getPropertyValue('--icon-size'));
                  const targetIconSize = baseIconSize * 2;
                  if (btn.classList.contains('palette')) { clonedIcon.style.fontSize = `${targetIconSize}px`; } 
                  else { clonedIcon.style.width = `${targetIconSize}px`; clonedIcon.style.height = `${targetIconSize}px`; }
                  const textElement = document.createElement('p');
                  if (btn.id === 'btnPalette') { textElement.innerHTML = C.PALETTES[activePaletteIndex].name; } 
                  else if (btn.id === 'btnSymmetry') { 
                    let key;
                    if (symmetryMode === 'vertical') key = 'symmetry_vertical';
                    else if (symmetryMode === 'horizontal') key = 'symmetry_horizontal';
                    else if (symmetryMode === 'mandala') key = 'symmetry_mandala';
                    else if (symmetryMode === 'kaleidoscope') key = 'symmetry_kaleidoscope';
                    else key = 'symmetry_off';
                    textElement.innerHTML = getText(key); 
                  }
                  else { textElement.innerHTML = btn.title || ""; }
                  textElement.className = 'text-lg text-gray-300 text-center px-4';
                  dom.longPressDisplay.innerHTML = '';
                  dom.longPressDisplay.appendChild(clonedIcon);
                  dom.longPressDisplay.appendChild(textElement);
              }
              dom.longPressOverlay.classList.add('visible');
              dom.longPressDisplay.classList.add('visible');
          }, C.LONG_PRESS_SHOW_MS);
      }
      
      function populateHelpModal() {
        const contentDiv = document.getElementById('helpModalContent');
        contentDiv.innerHTML = '';

        const categories = {
            inspiration: {
                titleKey: 'help_category_inspiration',
                buttons: ['btnPalette', 'btnRandom', 'btnInvert', 'btnSpecialReset']
            },
            order: {
                titleKey: 'help_category_order',
                buttons: ['btnResizeUp', 'btnResizeDown', 'btnGap', 'btnDark']
            },
            touch: {
                titleKey: 'help_category_touch',
                buttons: ['btnBrushMode', 'btnSymmetry', 'btnColorPicker']
            },
            evolution: {
                titleKey: 'help_category_evolution',
                buttons: ['btnToggleSimMode', 'btnShowBreatheMenu', 'btnGameOfLife', 'btnBrightnessEvo', 'btnGravitationalSort', 'btnErosion', 'btnDla', 'btnPlayPauseLife']
            },
            tools: {
                titleKey: 'help_category_tools',
                buttons: ['btnUndo', 'btnRedo', 'btnSave', 'btnResetBoard']
            }
        };

        const helpData = {
            'btnPalette': getText('help_palette'), 'btnRandom': getText('help_random'), 'btnInvert': getText('help_invert'),
            'btnSpecialReset': getText('help_specialReset'), 'btnResizeUp': getText('help_resizeUp'),
            'btnResizeDown': getText('help_resizeDown'), 'btnGap': getText('help_gap'), 'btnDark': getText('help_dark'),
            'btnBrushMode': getText('help_brushMode'), 'btnSymmetry': getText('help_symmetry'), 'btnColorPicker': getText('help_colorPicker'),
            'btnToggleSimMode': getText('help_toggleSimMode'), 'btnShowBreatheMenu': getText('help_breathe'),
            'btnGameOfLife': getText('help_gameOfLife'), 'btnBrightnessEvo': getText('help_brightnessEvo'),
            'btnGravitationalSort': getText('help_gravitationalSort'),
            'btnErosion': getText('help_erosion'),
            'btnDla': getText('help_dla'),
            'btnPlayPauseLife': getText('help_playPauseLife'), 'btnUndo': getText('help_undo'), 'btnRedo': getText('help_redo'),
            'btnSave': getText('help_save'), 'btnResetBoard': getText('help_resetBoard')
        };

        for (const categoryKey in categories) {
            const category = categories[categoryKey];
            const titleEl = document.createElement('h3');
            titleEl.className = 'help-category-title';
            titleEl.textContent = getText(category.titleKey);
            contentDiv.appendChild(titleEl);

            category.buttons.forEach(btnId => {
                const btn = document.getElementById(btnId);
                if (!btn || !helpData[btnId]) return;

                const helpItem = document.createElement('div');
                helpItem.className = 'flex items-center gap-4';

                const iconWrapper = document.createElement('div');
                iconWrapper.className = 'help-item-icon-wrapper';
                iconWrapper.innerHTML = btn.innerHTML;
                
                if (btnId === 'btnPlayPauseLife') {
                    const playIcon = iconWrapper.querySelector('#iconPlay');
                    if(playIcon) playIcon.style.display = 'block';
                    const pauseIcon = iconWrapper.querySelector('#iconPause');
                    if(pauseIcon) pauseIcon.style.display = 'none';
                }

                const textWrapper = document.createElement('div');
                textWrapper.textContent = helpData[btnId];
                textWrapper.className = 'text-gray-300 text-sm';
                
                helpItem.appendChild(iconWrapper);
                helpItem.appendChild(textWrapper);
                contentDiv.appendChild(helpItem);
            });
        }
        
        const tipsTitle = document.createElement('h3');
        tipsTitle.className = 'help-category-title';
        tipsTitle.textContent = getText('help_category_tips');
        contentDiv.appendChild(tipsTitle);

        const tipsContainer = document.createElement('div');
        tipsContainer.className = 'space-y-3 text-sm text-gray-300 pl-2';
        const tips = ['help_tip1', 'help_tip2', 'help_tip3', 'help_tip4', 'help_tip5', 'help_tip6'];

        tips.forEach(tipKey => {
            const tipItem = document.createElement('p');
            const accent = document.createElement('span');
            accent.textContent = '*';
            accent.style.color = C.GOLD;
            accent.style.marginRight = '8px';
            tipItem.appendChild(accent);
            tipItem.appendChild(document.createTextNode(getText(tipKey)));
            tipsContainer.appendChild(tipItem);
        });

        contentDiv.appendChild(tipsContainer);

        const shortcutsTitle = document.createElement('h3');
        shortcutsTitle.className = 'help-category-title';
        shortcutsTitle.textContent = getText('help_category_shortcuts');
        contentDiv.appendChild(shortcutsTitle);

        const shortcutsContainer = document.createElement('div');
        shortcutsContainer.className = 'space-y-2';

        const shortcuts = [
            { keys: ['Ctrl', '+', 'Z'], descriptionKey: 'help_shortcut_undo' }, { keys: ['Ctrl', '+', 'Y'], descriptionKey: 'help_shortcut_redo' },
            { keys: ['Ctrl', '+', 'S'], descriptionKey: 'help_shortcut_save' }, { keys: ['I'], descriptionKey: 'help_shortcut_invert' },
            { keys: ['R'], descriptionKey: 'help_shortcut_random' }, { keys: ['D'], descriptionKey: 'help_shortcut_dark' },
            { keys: ['B'], descriptionKey: 'help_shortcut_brush' }, { keys: ['M'], descriptionKey: 'help_shortcut_symmetry' },
            { keys: ['G'], descriptionKey: 'help_shortcut_gap' }, { keys: ['←', '/', '→'], descriptionKey: 'help_shortcut_palette' },
            { keys: ['+', '/', '-'], descriptionKey: 'help_shortcut_resize' }
        ];

        shortcuts.forEach(shortcut => {
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between gap-4';
            const description = document.createElement('span');
            description.className = 'text-gray-300 text-sm';
            description.textContent = getText(shortcut.descriptionKey);
            const keysWrapper = document.createElement('div');
            shortcut.keys.forEach(key => {
                if (key === '+' || key === '/') {
                    keysWrapper.appendChild(document.createTextNode(` ${key} `));
                } else {
                    const keyEl = document.createElement('span');
                    keyEl.className = 'kbd-key';
                    keyEl.textContent = key;
                    keysWrapper.appendChild(keyEl);
                }
            });
            item.appendChild(description);
            item.appendChild(keysWrapper);
            shortcutsContainer.appendChild(item);
        });
        contentDiv.appendChild(shortcutsContainer);
      }

      function setTextContent() {
        document.getElementById('splashText').textContent = getText('splashTitle');
        document.getElementById('fileNameLabel').textContent = getText('saveModal_feelsLike');
        dom.fileNameInput.placeholder = getText('saveModal_defaultFilename');
        dom.btnModalClose.title = getText('saveModal_close');
        dom.btnSaveImage.title = getText('saveModal_saveImage');
        dom.btnSaveProjectIdea.title = getText('saveModal_saveIdea');
        dom.btnLoadProjectIdea.title = getText('saveModal_loadIdea');
        document.getElementById('breatheSoloLabel').textContent = getText('breatheModal_solo');
        document.getElementById('breatheGroupLabel').textContent = getText('breatheModal_group');
        document.getElementById('resizeModalTitle').textContent = getText('resizeModal_title');
        document.getElementById('resizeModalPrompt').textContent = getText('resizeModal_prompt');
        dom.btnConfirmResize.textContent = getText('resizeModal_confirm');
        document.getElementById('helpModalTitle').textContent = getText('help_title');
        document.getElementById('paletteModalTitle').textContent = getText('paletteModal_title');
        document.getElementById('helpIntroText').textContent = getText('help_intro');
        
        // Modal Titles
        document.getElementById('gsSettingsTitle').textContent = getText('gs_modal_title');
        dom.btnGsSettingsCancel.textContent = getText('gs_modal_cancel');
        dom.btnGsSettingsSave.textContent = getText('gs_modal_save_close');
        
        // Tooltips
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
        
        document.querySelectorAll('.ctrl').forEach(btn => {
            if (btn.title) {
              btn.setAttribute('aria-label', btn.title)
            }
        });
      }
      
      // ---- Language Switching Logic ----
      function updateAllUIText() {
          const currentLang = getCurrentLang();
          setCurrentLang(currentLang); // Ensure the lang state is consistent

          const helpModalInnerContainer = document.getElementById('helpModalInnerContainer');
          if (currentLang === 'he') {
              helpModalInnerContainer.classList.add('rtl-mode');
          } else {
              helpModalInnerContainer.classList.remove('rtl-mode');
          }

          setTextContent();
          updatePaletteHeader();

          if (dom.helpModal.classList.contains('modal-visible')) {
              populateHelpModal();
          }
      }
      function toggleLanguage() {
        const availableLangs = getAvailableLangs();
        const currentLang = getCurrentLang();
        const currentIndex = availableLangs.indexOf(currentLang);
        const nextIndex = (currentIndex + 1) % availableLangs.length;
        const newLang = availableLangs[nextIndex];
        setCurrentLang(newLang);

        // We reload the page to apply all constant translations correctly
        window.location.reload();
      }
      
      // ---- Onboarding Logic ----
      function updateOnboardingUI() {
        const allControls = document.querySelectorAll('.ctrl');

        // Define controls for each stage
        const stage1Controls = [dom.btnPalette, dom.btnSpecialReset];
        const stage2Controls = [...stage1Controls, dom.btnUndo, dom.btnRedo];
        const stage3Controls = [...stage2Controls, dom.btnSymmetry, dom.btnResizeUp, dom.btnResizeDown, dom.btnShowBreatheMenu, dom.btnDark];

        // Hide all controls initially if onboarding is active
        if (onboardingStep > 0) {
            allControls.forEach(btn => {
                btn.classList.remove('onboarding-visible');
                btn.classList.add('onboarding-hidden');
            });
        }

        // Function to make a set of controls visible
        const showControls = (controls) => {
            setTimeout(() => {
                controls.forEach(btn => {
                    btn.classList.remove('onboarding-hidden');
                    btn.classList.add('onboarding-visible');
                });
            }, 50);
        };

        if (onboardingStep === 1) {
            showControls(stage1Controls);
        } else if (onboardingStep === 2) {
            showControls(stage2Controls);
        } else if (onboardingStep === 3) {
            showControls(stage3Controls);
        } else if (onboardingStep >= 4) {
            // Show all controls
            allControls.forEach(btn => {
                btn.classList.remove('onboarding-hidden');
                btn.classList.add('onboarding-visible');
            });
            // Nudge the tutorial button
            dom.btnTutorial.classList.add('glow-animation');
            setTimeout(() => {
                dom.btnTutorial.classList.remove('glow-animation');
            }, 4000); // Let it glow for 4 seconds
        }
      }
      
      function advanceOnboarding(step) {
          if (!isOnboarding || step <= onboardingStep) return;

          onboardingStep = step;
          updateOnboardingUI();

          if (onboardingStep >= 4) {
              isOnboarding = false;
              try {
                  localStorage.setItem(C.ONBOARDING_STORAGE_KEY, 'true');
              } catch (e) {
                  console.warn('Could not save onboarding status to localStorage.');
              }
          }
      }

      function startOnboarding() {
          isOnboarding = true;
          onboardingStep = 1;
          updateOnboardingUI();
      }

      async function initializeApp() {
        const splashScreen = document.getElementById('splashScreen');
        const splashText = document.getElementById('splashText');
        
        initializeLanguage();
        updateAllUIText();

        buildBoard(n, false); 
        fillRandom();
        hasPerformedInitialAutofill = true;
        
        applySeparator();
        updateUndoRedoButtons();
        setBrushMode(true);
        updateSymmetryUI();
        updateColorPickerButtonUI();
        updateGlowEffect();
        updateLayout();
        
        const helpModalContent = document.getElementById('helpModalContent');
        const btnResetOnboarding = document.createElement('button');
        btnResetOnboarding.id = 'btnResetOnboarding';
        helpModalContent.parentNode.appendChild(btnResetOnboarding);
        btnResetOnboarding.addEventListener('click', () => {
            try {
                localStorage.removeItem(C.ONBOARDING_STORAGE_KEY);
                location.reload();
            } catch (e) {
                console.error('Failed to reset onboarding', e);
            }
        });

        // ---- Event Listeners ----
        dom.btnRandom.addEventListener('click', (e) => handleCtrlClick(e, randomizeAll));
        dom.btnInvert.addEventListener('click', (e) => handleCtrlClick(e, invertGrid));
        dom.btnPalette.addEventListener('click', (e) => handleCtrlClick(e, () => {
          switchPalette();
          if (isOnboarding) {
            if (onboardingStep === 1) advanceOnboarding(2);
            else if (onboardingStep === 2) advanceOnboarding(3);
          }
        }));
        dom.btnResetBoard.addEventListener('click', (e) => handleCtrlClick(e, () => animateBoardTransition(resetToGoldAndDefaultPalette)));
        dom.btnSpecialReset.addEventListener('click', (e) => handleCtrlClick(e, () => {
          animateBoardTransition(() => {
            performAction(specialReset);
            if (isOnboarding && onboardingStep === 1) advanceOnboarding(2);
          });
        }));
        dom.btnResizeUp.addEventListener('click', (e) => handleCtrlClick(e, () => resizeGrid(true)));
        dom.btnResizeDown.addEventListener('click', (e) => handleCtrlClick(e, () => resizeGrid(false)));
        dom.btnSave.addEventListener('click', (e) => handleCtrlClick(e, savePNG_Optimized));
        dom.btnGap.addEventListener('click', (e) => handleCtrlClick(e, cycleSeparator));
        dom.btnBrushMode.addEventListener('click', (e) => handleCtrlClick(e, toggleBrushMode));
        dom.btnUndo.addEventListener('click', (e) => handleCtrlClick(e, undo));
        dom.btnRedo.addEventListener('click', (e) => handleCtrlClick(e, redo));
        dom.btnTutorial.addEventListener('click', (e) => handleCtrlClick(e, openHelpModal));
        dom.btnSymmetry.addEventListener('click', (e) => handleCtrlClick(e, cycleSymmetryMode));
        dom.btnColorPicker.addEventListener('click', (e) => handleCtrlClick(e, handleColorPickerClick));
        dom.btnDark.addEventListener('click', (e) => handleCtrlClick(e, goDarkAction));
        dom.btnToggleSimMode.addEventListener('click', (e) => handleCtrlClick(e, toggleSimMode));
        
        // ---- START: UPDATED SIMULATION BUTTON LISTENERS ----
        dom.btnGameOfLife.addEventListener('click', (e) => handleCtrlClick(e, () => armSimulation('gameOfLife')));
        dom.btnBrightnessEvo.addEventListener('click', (e) => handleCtrlClick(e, () => armSimulation('brightnessEvo')));
        dom.btnShowBreatheMenu.addEventListener('click', (e) => handleCtrlClick(e, () => armSimulation('breathe')));
        dom.btnGravitationalSort.addEventListener('click', (e) => handleCtrlClick(e, () => armSimulation('gravitationalSort')));
        dom.btnErosion.addEventListener('click', (e) => handleCtrlClick(e, () => armSimulation('erosion')));
        dom.btnDla.addEventListener('click', (e) => handleCtrlClick(e, () => armSimulation('dla')));
        dom.btnPlayPauseLife.addEventListener('click', (e) => handleCtrlClick(e, togglePlayPauseLife));
        dom.btnStepForward.addEventListener('click', (e) => handleCtrlClick(e, stepForward));
        // ---- END: UPDATED SIMULATION BUTTON LISTENERS ----
        
        dom.btnModalClose.addEventListener('click', closeModal);
        dom.saveModal.addEventListener('click', (e) => { if (e.target === dom.saveModal) { closeModal(); } });
        dom.btnBreatheModalClose.addEventListener('click', closeBreatheModal);
        dom.breatheModal.addEventListener('click', (e) => { if (e.target === dom.breatheModal) { closeBreatheModal(); } });
        dom.btnStartSoloBreathe.addEventListener('click', () => { closeBreatheModal(); startBreathingEffect(false); });
        dom.btnStartGroupBreathe.addEventListener('click', () => { closeBreatheModal(); startBreathingEffect(true); });
        dom.colorPickerModal.addEventListener('click', (e) => { if (e.target === dom.colorPickerModal) { closeColorPickerModal(); } });
        dom.btnHelpModalClose.addEventListener('click', closeHelpModal);
        dom.helpModal.addEventListener('click', (e) => { if (e.target === dom.helpModal) { closeHelpModal(); } });
        dom.btnNextPalette.addEventListener('click', () => navigateColorPages(true));
        dom.btnPrevPalette.addEventListener('click', () => navigateColorPages(false));
        dom.btnConfirmResize.addEventListener('click', handleConfirmResize);
        dom.resizeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { handleConfirmResize(); } });
        dom.btnResizeModalClose.addEventListener('click', closeResizeModal);
        dom.resizeModal.addEventListener('click', (e) => { if (e.target === dom.resizeModal) { closeResizeModal(); } });
        dom.colorPickerModal.addEventListener('wheel', handlePaletteWheel);
        dom.colorPickerModal.addEventListener('touchstart', handleTouchStart, { passive: true });
        dom.colorPickerModal.addEventListener('touchend', handleTouchEnd, { passive: true });
        dom.btnSaveImage.addEventListener('click', handleSaveImage);
        dom.btnSaveProjectIdea.addEventListener('click', handleSaveProject);
        dom.btnLoadProjectIdea.addEventListener('click', handleLoadProject);
        dom.projectFileInput.addEventListener('change', onProjectFileSelected);
        dom.btnPaletteModalClose.addEventListener('click', closePaletteModal);
        dom.paletteModal.addEventListener('click', (e) => { if (e.target === dom.paletteModal) { closePaletteModal(); } });
        
        dom.btnGolSettingsSave.addEventListener('click', saveGolSettings);
        dom.btnGolSettingsCancel.addEventListener('click', closeGolSettingsModal);
        dom.btnGolSettingsReset.addEventListener('click', resetGolSettings);

        // Gravitational Sort Modal Listeners
        dom.gsDirectionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                dom.gsDirectionButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        dom.gsStrengthSlider.addEventListener('input', () => {
            dom.gsStrengthValue.textContent = `${dom.gsStrengthSlider.value}%`;
        });
        dom.btnGsSettingsSave.addEventListener('click', saveGravitationalSortSettings);
        dom.btnGsSettingsCancel.addEventListener('click', closeGravitationalSortSettingsModal);

        // DLA Settings Modal Listeners
        dom.btnDlaSettingsSave.addEventListener('click', saveDlaSettings);
        dom.btnDlaSettingsCancel.addEventListener('click', closeDlaSettingsModal);


        document.querySelectorAll('.ctrl').forEach(btn => {
            btn.addEventListener('pointerdown', handlePointerDownCtrl);
            btn.addEventListener('pointerup', hideLongPressDisplay);
            btn.addEventListener('pointerleave', hideLongPressDisplay);
        });
        dom.btnLangToggle.addEventListener('click', toggleLanguage);
        window.addEventListener('resize', updateLayout);
        window.addEventListener('contextmenu', e => e.preventDefault());

        // --- Keyboard Shortcuts ---
        window.addEventListener('keydown', (e) => {
            if (document.querySelector('.modal-visible') || e.target.tagName === 'INPUT') {
                return;
            }

            const isCtrlOrCmd = e.ctrlKey || e.metaKey;

            if (isCtrlOrCmd && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            } else if (isCtrlOrCmd && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                redo();
            } else if (isCtrlOrCmd && e.key.toLowerCase() === 's') {
                e.preventDefault();
                savePNG_Optimized();
            } else {
                switch (e.key.toLowerCase()) {
                    case 'i': invertGrid(); break;
                    case 'r': randomizeAll(); break;
                    case 'd': goDarkAction(); break;
                    case 'b': toggleBrushMode(); break;
                    case 'm': cycleSymmetryMode(); break;
                    case 'g': cycleSeparator(); break;
                    case 'arrowright':
                    case 'pagedown':
                        switchPalette(false);
                        break;
                    case 'arrowleft':
                    case 'pageup':
                        switchPalette(true);
                        break;
                    case '+':
                    case '=':
                        resizeGrid(true);
                        break;
                    case '-':
                        resizeGrid(false);
                        break;
                }
            }
        });

        // --- Splash Screen & Onboarding ---
        let hasCompletedOnboarding = true;
        try {
            hasCompletedOnboarding = localStorage.getItem(C.ONBOARDING_STORAGE_KEY) === 'true';
        } catch (e) {
            console.warn('Could not read onboarding status from localStorage.');
        }

        if (!hasCompletedOnboarding) {
          document.querySelectorAll('.ctrl').forEach(c => c.classList.add('onboarding-hidden'));
          startOnboarding();
        }

        splashText.style.animation = 'fadeInText 2.5s linear forwards';
        await new Promise(r => setTimeout(r, 5000));
        splashText.style.animation = 'fadeOutText 1.5s linear forwards';
        await new Promise(r => setTimeout(r, 1500));
        const focusButton = document.getElementById('btnSpecialReset');
        focusButton.classList.add('splash-tutorial-focus');
        splashText.style.display = 'none';
        await new Promise(r => setTimeout(r, 1500)); 
        splashScreen.style.opacity = '0';
        await new Promise(r => setTimeout(r, 2000));
        splashScreen.remove();
        focusButton.classList.remove('splash-tutorial-focus');
      }

      initializeApp();

    })();