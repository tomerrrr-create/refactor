// js/app.js

import { getText, setCurrentLang, initializeLanguage, getCurrentLang, getAvailableLangs, translations, onLanguageChange } from './i18n.js';
import * as C from './constants.js';
import * as Simulations from './simulations.js';
import { dom } from './dom-elements.js';
import { initializeModals } from './ui-modals.js';

(function() {
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
      let isBreathing = false;
      let isSimModeActive = false;
      let selectedColor = null;
      let isRainbowModeActive = false;
      let selectedColorIndex = -1;
      let colorPickerPage = 0;
      let generatedImageFile = null;
      let longPressTimer = null;
      let wasLongPress = false;
      let isLifePlaying = false;
      let lifeIntervalId = null;
      let armedSimulation = null;
      let symmetryMode = 'off';
      
      const tiles = () => Array.from(dom.board.querySelectorAll('.tile'));
      const isGold = (el) => !!el.dataset.goldOverlay;
      const paletteLen = () => palette().length;
      const norm = (k, m = paletteLen()) => ((k % m) + m) % m;

      let history = [];
      let future = [];

      const originalColorPickerIconHTML = dom.btnColorPicker.innerHTML;
      const tileClasses = 'tile aspect-square w-full outline-none focus-visible:ring-inset focus-visible:ring-4 focus-visible:ring-white/90';

      let modals;

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
        dom.board.classList.toggle('no-gap-fix', separatorPx === 0);
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
        const BLACK_INDEX = 0; 
        const centerIndex = Math.floor((n * n) / 2);

        currentTiles.forEach((tile, index) => {
          clearGoldOverlay(tile); 
          if (index === centerIndex) {
            applyGoldOverlay(tile);
          } else {
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
        const darkestIndex = 0;
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
      



function nudgeColors(direction) {
  performAction(() => {
    const maxIndex = paletteLen() - 1;

    tiles().forEach(tile => {
      const currentIndex = getIndex(tile);
      let newIndex = currentIndex + direction;

      // הגבלת הערך בין 0 למקסימום
      newIndex = Math.max(0, Math.min(newIndex, maxIndex));

      setIndex(tile, newIndex);
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
                if (!isGold(el)) {
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
        const allTiles = tiles();
        const initialCrystal = new Set();

        allTiles.forEach((tile, index) => {
            if (getIndex(tile) > 0) {
                initialCrystal.add(index);
            }
        });

        if (initialCrystal.size === 0) {
            const centerIndex = Math.floor((n * n) / 2);
            initialCrystal.add(centerIndex);
            
            const seedColorIndex = Math.floor(palette().length / 2);
            setIndex(allTiles[centerIndex], seedColorIndex);
        }

        const walkerCount = n * 4;
        const initialWalkers = [];
        for (let i = 0; i < walkerCount; i++) {
            let position;
            if (dlaRules.injectFromEdges) {
                position = getRandomEdgePosition(n);
            } else {
                position = { 
                    y: Math.floor(Math.random() * n), 
                    x: Math.floor(Math.random() * n) 
                };
            }
            initialWalkers.push({ y: position.y, x: position.x });
        }
        dlaState = {
            crystal: initialCrystal,
            walkers: initialWalkers,
            isInitialized: true,
            isFinished: false,
            lastWalkerIndex: 0
        };
      }

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
            n, allCurrentTiles: tiles(), currentPalette: palette(), gameOfLifeRules,
            gravitationalSortRules, erosionRules, dlaState, dlaRules, getIndex, isGold, setIndex
        };

        if (armedSimulation === 'dla') {
             const newDlaState = simulationFn(context);
             if (newDlaState) { dlaState = newDlaState; }
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

          if (armedSimulation === 'dla' && dlaState) {
              const allCurrentTiles = tiles();
              dlaState.crystal.clear(); 
              allCurrentTiles.forEach((tile, index) => {
                  if (getIndex(tile) > 0) {
                      dlaState.crystal.add(index);
                  }
              });
          }

          let simulationFn;
          let interval = 200;

          switch (armedSimulation) {
              case 'gameOfLife': simulationFn = Simulations.runGameOfLifeGeneration; break;
              case 'brightnessEvo': simulationFn = Simulations.runBrightnessEvolution; break;
              case 'gravitationalSort': simulationFn = Simulations.runGravitationalSortGeneration; interval = 150; break;
              case 'erosion': simulationFn = Simulations.runErosionGeneration; interval = 100; break;
              case 'dla': simulationFn = Simulations.runDlaGeneration; interval = 16; break;
              case 'breathe': modals.openBreatheModal(); return; 
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
                    n, allCurrentTiles: tiles(), currentPalette: palette(), gameOfLifeRules,
                    gravitationalSortRules, erosionRules, dlaState, dlaRules, getIndex, isGold, setIndex
                };
                if (armedSimulation === 'dla') {
                    const newDlaState = simulationFn(context);
                    if (newDlaState) { dlaState = newDlaState; }
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
              const uniqueColors = [...new Set(allTiles.map(tile => isGold(tile) ? C.GOLD : tile.style.backgroundColor))];
              uniqueColors.forEach(color => colorDelayMap.set(color, Math.random() * 3));
              allTiles.forEach(tile => {
                  const colorKey = isGold(tile) ? C.GOLD : tile.style.backgroundColor;
                  tile.style.animationDelay = `${colorDelayMap.get(colorKey)}s`;
                  tile.classList.add('breathing-tile');
              });
          } else {
              allTiles.forEach(tile => {
                  tile.style.animationDelay = `${Math.random() * 3}s`;
                  tile.classList.add('breathing-tile');
              });
          }
      }

      function prepareBoardForSimMode() {
        animateBoardTransition(() => {
            performAction(() => {
                if (n !== 75) _performResize(75);
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
                ctx.fillStyle = isGold(tileElement) ? C.GOLD : currentPalette[norm(getIndex(tileElement), currentPalette.length)];
                const x = (j * (TILE_SIZE + GAP_SIZE)) + (PADDING / 2);
                const y = (i * (TILE_SIZE + GAP_SIZE)) + (PADDING / 2);
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            }
        }
        
        canvas.toBlob((blob) => {
            if (!blob) { dom.btnSave.disabled = false; return; }
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

      const pointerState = { id: null, downEl: null, downX: 0, downY: 0, longPressTimer: null, suppressClick: false, isDragging: false, dragSource: null, currentTarget: null, beforeState: null, longPressTarget: null };
      
      function applyActionToTiles(indices, actionFn) {
          const allTiles = tiles();
          indices.forEach(idx => { if (allTiles[idx]) actionFn(allTiles[idx]); });
      }

      function handleDragPaint(targetEl) {
        if (!targetEl) return;
        const allTiles = tiles();
        if (isRainbowModeActive) {
            const targetIndices = getSymmetricIndices(allTiles.indexOf(targetEl));
            applyActionToTiles(targetIndices, tile => {
                clearGoldOverlay(tile);
                setIndex(tile, Math.floor(Math.random() * paletteLen()));
            });
        } else if (selectedColorIndex !== -1) {
            const targetIndices = getSymmetricIndices(allTiles.indexOf(targetEl));
            applyActionToTiles(targetIndices, tile => {
                clearGoldOverlay(tile);
                setIndex(tile, selectedColorIndex);
            });
        } else if (pointerState.dragSource) {
            const sourceIndex = getIndex(pointerState.dragSource);
            const targetIndices = getSymmetricIndices(allTiles.indexOf(targetEl));
            applyActionToTiles(targetIndices, tile => {
                clearGoldOverlay(tile);
                setIndex(tile, sourceIndex);
            });
        }
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
                modals.openColorPickerModal(el);
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

                if (isBrushModeOn) {
                    handleDragPaint(pointerState.downEl);
                }

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
            handleDragPaint(targetEl); 
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
                    setIndex(el, Math.floor(Math.random() * paletteLen()));
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
      
      async function handleSaveImage() {
        if (!generatedImageFile) return;
        const isMobile = navigator.share && navigator.canShare;
        const fileToSave = new File([generatedImageFile], getSanitizedFileName('png'), { type: generatedImageFile.type });
        if (isMobile) { try { await navigator.share({ files: [fileToSave], title: 'Followed my intuition' }); } catch (err) { if (err.name !== 'AbortError') console.error('Share API error:', err); } } 
        else { const link = document.createElement('a'); link.href = URL.createObjectURL(fileToSave); link.download = fileToSave.name; link.click(); URL.revokeObjectURL(link.href); }
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
      function handlePointerDownCtrl(e) {
          if (isBreathing) return;
          const btn = e.currentTarget;
          longPressTimer = setTimeout(() => {
              wasLongPress = true;
              if (btn.id === 'btnRandom') { performAction(shuffleExistingColors); return; }
              if (btn.id === 'btnToggleSimMode') { if (!isSimModeActive) toggleSimMode(); prepareBoardForSimMode(); return; }
              if (btn.id === 'btnGameOfLife') { modals.openGolSettingsModal(); return; }
              if (btn.id === 'btnGravitationalSort') { modals.openGravitationalSortSettingsModal(); return; }
              if (btn.id === 'btnDla') { modals.openDlaSettingsModal(); return; }
              if (btn.id === 'btnPalette') { modals.openPaletteModal(); return; }
              if (btn.id === 'btnResizeUp' || btn.id === 'btnResizeDown') { modals.openResizeModal(); return; }
              if (btn.id === 'btnBrushMode') {
                  const customHTML = `<div class="flex flex-col items-center justify-center gap-4 text-lg text-gray-300"><div class="flex items-center gap-4"><svg viewBox="0 0 24 24" style="width: var(--icon-size); height: var(--icon-size);"><path d="M12 2 L2 22 L22 22 Z" stroke="#fff" stroke-width="2" fill="#fff" /></svg><span>${getText('brushMode_paint')}</span></div><div class="flex items-center gap-4"><svg viewBox="0 0 24 24" style="width: var(--icon-size); height: var(--icon-size);"><path d="M12 2 L2 22 L22 22 Z" stroke="#fff" stroke-width="2" fill="#000" /></svg><span>${getText('brushMode_copy')}</span></div></div>`;
                  dom.longPressDisplay.innerHTML = customHTML;
              } else {
                  let iconElement = btn.classList.contains('palette') ? btn.cloneNode(true) : btn.querySelector('.glyph, svg, .glyph-save, .glyph-reset, .glyph-special-reset, .glyph-dark');
                  if (!iconElement) return;
                  if (btn.classList.contains('palette')) { iconElement.style.background = 'transparent'; iconElement.style.border = 'none'; }
                  const clonedIcon = iconElement.cloneNode(true);
                  const baseIconSize = parseInt(getComputedStyle(dom.root).getPropertyValue('--icon-size')), targetIconSize = baseIconSize * 2;
                  if (btn.classList.contains('palette')) clonedIcon.style.fontSize = `${targetIconSize}px`;
                  else { clonedIcon.style.width = `${targetIconSize}px`; clonedIcon.style.height = `${targetIconSize}px`; }
                  const textElement = document.createElement('p');
                  if (btn.id === 'btnPalette') textElement.innerHTML = C.PALETTES[activePaletteIndex].name;
                  else if (btn.id === 'btnSymmetry') { 
                    let key;
                    if (symmetryMode === 'vertical') key = 'symmetry_vertical'; else if (symmetryMode === 'horizontal') key = 'symmetry_horizontal';
                    else if (symmetryMode === 'mandala') key = 'symmetry_mandala'; else if (symmetryMode === 'kaleidoscope') key = 'symmetry_kaleidoscope';
                    else key = 'symmetry_off';
                    textElement.innerHTML = getText(key); 
                  }
                  else textElement.innerHTML = btn.title || "";
                  textElement.className = 'text-lg text-gray-300 text-center px-4';
                  dom.longPressDisplay.innerHTML = '';
                  dom.longPressDisplay.appendChild(clonedIcon);
                  dom.longPressDisplay.appendChild(textElement);
              }
              dom.longPressOverlay.classList.add('visible');
              dom.longPressDisplay.classList.add('visible');
          }, C.LONG_PRESS_SHOW_MS);
      }
      
      function handleCtrlClick(e, actionFn) {
        if (isBreathing && e.currentTarget.id !== 'btnPlayPauseLife') return;
        if (wasLongPress) { wasLongPress = false; return; }
        actionFn();
      }

      function handleColorPickerClick() {
        if (selectedColor || isRainbowModeActive) performAction(resetSelectedColor);
        else modals.openColorPickerModal();
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
        if (getCurrentLang() === 'he') {
            helpModalInnerContainer.classList.add('rtl-mode');
        } else {
            helpModalInnerContainer.classList.remove('rtl-mode');
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

      async function initializeApp() {
        const splashScreen = document.getElementById('splashScreen'), splashText = document.getElementById('splashText');
        
        initializeLanguage();
        
        onLanguageChange(() => {
            updateAllUIText();
        });

        updateAllUIText();

        const contextForModals = {
            dom, C, getText, performAction, pointerState,
            setWasLongPress: (value) => { wasLongPress = value; },
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
            tiles, getSymmetricIndices, applyActionToTiles, clearGoldOverlay, setIndex, paletteLen, getSelectedColorIndex: () => selectedColorIndex,
            switchToPalette,
            getGameOfLifeRules: () => gameOfLifeRules, setGameOfLifeRules: (r) => { gameOfLifeRules = r; },
            getGravitationalSortRules: () => gravitationalSortRules, setGravitationalSortRules: (r) => { gravitationalSortRules = r; },
            getDlaRules: () => dlaRules, setDlaRules: (r) => { dlaRules = r; },
            setGeneratedImageFile: (f) => { generatedImageFile = f; },
            handleSaveImage, handleSaveProject, handleLoadProject, onProjectFileSelected, startBreathingEffect,
        };
        modals = initializeModals(contextForModals);
        
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
        btnResetOnboarding.addEventListener('click', () => { try { localStorage.removeItem(C.ONBOARDING_STORAGE_KEY); location.reload(); } catch (e) { console.error('Failed to reset onboarding', e); } });

        dom.board.addEventListener('pointerdown', onPointerDown); dom.board.addEventListener('pointermove', onPointerMove);
        dom.board.addEventListener('pointerup', onPointerUp); dom.board.addEventListener('pointercancel', onPointerUp);
        dom.btnRandom.addEventListener('click', (e) => handleCtrlClick(e, randomizeAll));
        dom.btnInvert.addEventListener('click', (e) => handleCtrlClick(e, invertGrid));
        dom.btnPalette.addEventListener('click', (e) => handleCtrlClick(e, () => switchPalette()));
        dom.btnResetBoard.addEventListener('click', (e) => handleCtrlClick(e, () => animateBoardTransition(resetToGoldAndDefaultPalette)));
        dom.btnSpecialReset.addEventListener('click', (e) => handleCtrlClick(e, () => animateBoardTransition(() => performAction(specialReset))));
        dom.btnResizeUp.addEventListener('click', (e) => handleCtrlClick(e, () => resizeGrid(true)));
        dom.btnResizeDown.addEventListener('click', (e) => handleCtrlClick(e, () => resizeGrid(false)));
        dom.btnSave.addEventListener('click', (e) => handleCtrlClick(e, savePNG_Optimized));
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
dom.btnNudgeBrighter.innerHTML = '☀️';
dom.btnNudgeDarker.innerHTML = '🌑';
dom.btnNudgeBrighter.addEventListener('click', (e) => handleCtrlClick(e, () => nudgeColors(1)));
        dom.btnNudgeDarker.addEventListener('click', (e) => handleCtrlClick(e, () => nudgeColors(-1)));

        document.querySelectorAll('.ctrl').forEach(btn => { btn.addEventListener('pointerdown', handlePointerDownCtrl); btn.addEventListener('pointerup', hideLongPressDisplay); btn.addEventListener('pointerleave', hideLongPressDisplay); });
        dom.btnLangToggle.addEventListener('click', toggleLanguage);
        window.addEventListener('resize', updateLayout);
        window.addEventListener('contextmenu', e => e.preventDefault());
        window.addEventListener('keydown', (e) => {
            if (document.querySelector('.modal-visible') || e.target.tagName === 'INPUT') return;
            const isCtrlOrCmd = e.ctrlKey || e.metaKey;
            if (isCtrlOrCmd && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); } 
            else if (isCtrlOrCmd && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); } 
            else if (isCtrlOrCmd && e.key.toLowerCase() === 's') { e.preventDefault(); savePNG_Optimized(); } 
            else {
                switch (e.key.toLowerCase()) {
                    case 'i': invertGrid(); break; case 'r': randomizeAll(); break; case 'd': goDarkAction(); break;
                    case 'b': toggleBrushMode(); break; case 'm': cycleSymmetryMode(); break; case 'g': cycleSeparator(); break;
                    case 'arrowright': case 'pagedown': switchPalette(false); break;
                    case 'arrowleft': case 'pageup': switchPalette(true); break;
                    case '+': case '=': resizeGrid(true); break; case '-': resizeGrid(false); break;
                }
            }
        });

        // --- Splash Screen ---
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