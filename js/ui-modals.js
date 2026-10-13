import { DEFAULT_STARTUP } from './startup-settings.js';
import { DEFAULT_SIM_INIT } from './sim-init-settings.js';
import { DEFAULT_SORT_CYCLE, moveSortMethod } from './sort-cycle-settings.js';
// js/ui-modals.js

let lastWheelTime = 0;
let touchStartX = 0;

function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
}

function handleTouchEnd(e) {
    const touchEndX = e.changedTouches[0].screenX;
    
    if (touchEndX < touchStartX - 50) { // Swipe Left
        app.navigateColorPages(true);
        renderColorPickerContent();
    }
    if (touchEndX > touchStartX + 50) { // Swipe Right
        app.navigateColorPages(false);
        renderColorPickerContent();
    }
}

function handlePaletteWheel(e) {
    if (Date.now() - lastWheelTime < 200) return;
    e.preventDefault();
    app.navigateColorPages(e.deltaY > 0);
    renderColorPickerContent(); 
    lastWheelTime = Date.now();
}

let app;

// --- Internal Helper Functions ---

let saveStatusTimer;
function clearSaveStatus() {
    clearTimeout(saveStatusTimer);
    app.dom.saveStatus.textContent = '';
    app.dom.saveStatus.classList.remove('visible');
    delete app.dom.saveStatus.dataset.debugText;
    delete app.dom.saveStatus.dataset.status;
}
function showSaveStatus(key, error = false) {
    clearTimeout(saveStatusTimer);
    app.dom.saveStatus.dataset.debugText = key;
    app.dom.saveStatus.dataset.status = error ? 'error' : 'success';
    app.dom.saveStatus.textContent = app.getText(key);
    app.dom.saveStatus.classList.add('visible');
    saveStatusTimer = setTimeout(() => app.dom.saveStatus.classList.remove('visible'), 4000);
}

function closeModal() {
    clearSaveStatus();
    app.dom.saveModal.classList.remove('modal-visible');
    if (app.dom.imagePreview.src) { URL.revokeObjectURL(app.dom.imagePreview.src); }
    app.dom.imagePreview.src = '';
    app.resetWasLongPress(); // <-- תוספת תיקון הבאג
}

function closeResizeModal() {
    app.dom.resizeModal.classList.remove('modal-visible');
    app.resetWasLongPress(); // <-- תוספת תיקון הבאג
}

// --- START: Spiral Settings Helper Functions ---
function closeSpiralSettingsModal() {
    app.dom.spiralSettingsModal.style.display = 'none';
    app.dom.spiralSettingsModal.classList.remove('modal-visible');
    app.resetWasLongPress(); 
}

function openSpiralSettingsModal() {
    app.dom.spiralSettingsModal.style.display = 'flex';
    // השהייה קטנטנה כדי לאפשר לאנימציה לעבוד כמו שצריך
    setTimeout(() => {
        app.dom.spiralSettingsModal.classList.add('modal-visible');
    }, 10);
    
    // סימון הכפתור הנכון לפי מה ששמור בהגדרות

const currentMethod = app.spiralRules ? app.spiralRules.method : 'magnet';    app.dom.spiralMethodButtons.forEach(btn => {


        if (btn.dataset.method === currentMethod) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}
// --- END: Spiral Settings Helper Functions ---



function closeColorPickerModal() {
    app.dom.colorPickerModal.classList.remove('modal-visible');
    app.pointerState.longPressTarget = null;
    app.resetWasLongPress(); // <-- תוספת תיקון הבאג
}

function closeHelpModal() {
    app.dom.helpModal.classList.remove('modal-visible');
    app.resetWasLongPress(); // <-- תוספת תיקון הבאג
}

function closePaletteModal() {
    app.dom.paletteModal.classList.remove('modal-visible');
    app.resetWasLongPress(); // <-- תוספת תיקון הבאג
}



function closeGolSettingsModal() {
    app.dom.gameOfLifeSettingsModal.classList.remove('modal-visible');
    // --- START MODIFICATION ---
    // (הסרת הקוד הישן שטיפל בגבולות האדומים של שדות הטקסט)
    // --- END MODIFICATION ---
    setTimeout(() => app.dom.gameOfLifeSettingsModal.style.display = 'none', 300);
    app.resetWasLongPress();
}

function closeGravitationalSortSettingsModal() {
    app.dom.gravitationalSortSettingsModal.classList.remove('modal-visible');
    setTimeout(() => app.dom.gravitationalSortSettingsModal.style.display = 'none', 300);
    app.resetWasLongPress();
}


// Phase 1 Addition
function closeAdvancedColorMappingModal() {
    app.dom.advancedColorMappingModal.classList.remove('modal-visible');
    setTimeout(() => app.dom.advancedColorMappingModal.style.display = 'none', 300);
    app.resetWasLongPress();
}


// --- START: Added for Contour Settings ---
function closeContourSettingsModal() {
    app.dom.contourSettingsModal.classList.remove('modal-visible');
    setTimeout(() => app.dom.contourSettingsModal.style.display = 'none', 300);
    app.resetWasLongPress();
}
// --- END: Added for Contour Settings ---


// --- START: Chi Flow Modal Logic ---
    let tempChiAwakening = [];
    let tempChiFlow = [];
    let tempChiReach = 2;

const CHI_PRESETS = {
        'Topography': { awakening: [3,4,5,6,7,8], flow: [2,3], reach: 0 },
        'Fluent': { awakening: [1,2,3,4,5,6,7,8], flow: [1,2,3,4,5,6,7,8], reach: 0 },
        'Crystals': { awakening: [3,4,5,6,7,8], flow: [3,4,5,6,7,8], reach: 0 },
        'Ripples': { awakening: [3,4,5,6,7,8], flow: [2,4,5,6], reach: 0 },
        'Electric': { awakening: [3,4,5,6,7,8], flow: [1], reach: 0 },
        'Wildfire': { awakening: [1,3,5,7], flow: [2,4,6,8], reach: 0 },
        'Harmony': { awakening: [3,4,5,6,7,8], flow: [3,5,7], reach: 0 },
        'Nova': { awakening: [3,4,5,6,7,8], flow: [1,2], reach: 0 },
        'Alexis': { awakening: [4,5,6,7,8], flow: [4,5,6,7,8], reach: 0 },
        'Zen': { awakening: [3,4,5,6,7,8], flow: [2,3,4], reach: 0 }
    };


function closeChiFlowSettingsModal() {
        app.dom.chiFlowSettingsModal.classList.add('hidden');
        app.resetWasLongPress(); // <-- תוספת תיקון הבאג
    }


function renderChiFlowChips(container, activeValues, maxVal) {
        container.innerHTML = '';
        for (let i = 1; i <= maxVal; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            
            // שימוש בקלאסים של ה-Game of Life
            btn.className = 'gol-chip-btn' + (activeValues.includes(i) ? ' active' : '');
            
            btn.onclick = () => {
                if (activeValues.includes(i)) {
                    activeValues.splice(activeValues.indexOf(i), 1);
                    btn.classList.remove('active');
                } else {
                    activeValues.push(i);
                    activeValues.sort((a, b) => a - b);
                    btn.classList.add('active');
                }
                updateActiveChiPresetButton(); // <-- זו השורה שהוספנו!
            };
            container.appendChild(btn);
        }
    }


function updateChiPresetButtons(activeId) {
const btns = [
            app.dom.btnChiPresetTopography, app.dom.btnChiPresetWildfire, 
            app.dom.btnChiPresetCrystals, app.dom.btnChiPresetRipples,
            app.dom.btnChiPresetElectric, app.dom.btnChiPresetFluent, 
            app.dom.btnChiPresetHarmony, app.dom.btnChiPresetNova,
            app.dom.btnChiPresetAlexis, app.dom.btnChiPresetZen
        ];
        btns.forEach(b => {
            if (b.id === activeId) b.classList.add('active');
            else b.classList.remove('active');
        });
    }

function updateActiveChiPresetButton() {
        const arraysAreEqual = (a, b) => a.length === b.length && a.every((val, index) => val === b[index]);

        let activeId = '';
        for (const [presetName, rules] of Object.entries(CHI_PRESETS)) {
            // בודק אם החוקים הזמניים זהים לחוקים של אחד הפריסטים
            if (arraysAreEqual(tempChiAwakening, rules.awakening) &&
                arraysAreEqual(tempChiFlow, rules.flow) &&
                tempChiReach === rules.reach) {
                activeId = 'btnChiPreset' + presetName;
                break;
            }
        }
        updateChiPresetButtons(activeId);
    }


    function applyChiPreset(presetName, btnElement) {
        const p = CHI_PRESETS[presetName];
        if (!p) return;
        tempChiAwakening = [...p.awakening];
        tempChiFlow = [...p.flow];
        tempChiReach = p.reach;

        renderChiFlowChips(app.dom.chiAwakeningChipsContainer, tempChiAwakening, 8);
        renderChiFlowChips(app.dom.chiFlowChipsContainer, tempChiFlow, 8);
        app.dom.chiReachSlider.value = tempChiReach;
app.dom.chiReachValue.textContent = tempChiReach === 0 ? 'Auto' : tempChiReach;

        updateChiPresetButtons(btnElement ? btnElement.id : '');
    }

    function saveChiFlowSettings() {
        app.setChiFlowRules({
            awakening: [...tempChiAwakening],
            flow: [...tempChiFlow],
            reach: parseInt(app.dom.chiReachSlider.value, 10)
        });
        closeChiFlowSettingsModal();
    }

    function openChiFlowSettingsModal() {
        const currentRules = app.getChiFlowRules();
        tempChiAwakening = [...currentRules.awakening];
        tempChiFlow = [...currentRules.flow];
        tempChiReach = currentRules.reach;

        renderChiFlowChips(app.dom.chiAwakeningChipsContainer, tempChiAwakening, 8);
        renderChiFlowChips(app.dom.chiFlowChipsContainer, tempChiFlow, 8);
        
        app.dom.chiReachSlider.value = tempChiReach;
app.dom.chiReachValue.textContent = tempChiReach === 0 ? 'Auto' : tempChiReach;

        // טעינת הטקסטים לפי השפה הנוכחית
        app.dom.chiFlowModalTitle.textContent = app.getText('chi_modal_title');
        app.dom.chiAwakeningLabel.textContent = app.getText('chi_awakening_label');
        app.dom.chiAwakeningDesc.textContent = app.getText('chi_awakening_desc');
        app.dom.chiFlowLabel.textContent = app.getText('chi_flow_label');
        app.dom.chiFlowDesc.textContent = app.getText('chi_flow_desc');
        app.dom.chiReachLabel.textContent = app.getText('chi_reach_label');
        app.dom.chiReachDesc.textContent = app.getText('chi_reach_desc');
        app.dom.btnChiPresetTopography.textContent = app.getText('chi_preset_topography');
        app.dom.btnChiPresetWildfire.textContent = app.getText('chi_preset_wildfire');
        app.dom.btnChiPresetCrystals.textContent = app.getText('chi_preset_crystals');
        app.dom.btnChiPresetRipples.textContent = app.getText('chi_preset_ripples');
app.dom.btnChiPresetElectric.textContent = app.getText('chi_preset_electric');
        app.dom.btnChiPresetFluent.textContent = app.getText('chi_preset_fluent');
        app.dom.btnChiPresetHarmony.textContent = app.getText('chi_preset_harmony');
        app.dom.btnChiPresetNova.textContent = app.getText('chi_preset_nova');
        app.dom.btnChiPresetAlexis.textContent = app.getText('chi_preset_alexis');
        app.dom.btnChiPresetZen.textContent = app.getText('chi_preset_zen');

updateActiveChiPresetButton();        app.dom.chiFlowSettingsModal.classList.remove('hidden');
    }

    // --- END: Chi Flow Modal Logic ---



// --- START: Turing Patterns Modal Logic ---
let tempTuringRules = { feed: 0.034, kill: 0.056, dA: 1.0, dB: 0.5, timeStep: 1.0 };

const TURING_PRESETS = {
    'Coral': { feed: 0.054, kill: 0.062, dA: 1.0, dB: 0.5, timeStep: 1.0 },
    'Maze':  { feed: 0.029, kill: 0.057, dA: 1.0, dB: 0.5, timeStep: 1.0 },

//original
    //  'Spots': { feed: 0.0383, kill: 0.061, dA: 1.0, dB: 0.5, timeStep: 1.0 },


  'Spots': { feed: 0.055, kill: 0.064, dA: 1.0, dB: 0.5, timeStep: 1.0 },
    'Cells': { feed: 0.034, kill: 0.058, dA: 1.0, dB: 0.5, timeStep: 1.0 },
    'Boiling': { feed: 0.075, kill: 0.064, dA: 1.0, dB: 0.5, timeStep: 1.0 },
    'USkate': { feed: 0.015, kill: 0.048, dA: 1.0, dB: 0.5, timeStep: 1.0 },
    'Chaos': { feed: 0.034, kill: 0.056, dA: 1.0, dB: 0.5, timeStep: 1.0 },

    'Waves': { feed: 0.030, kill: 0.054, dA: 1.0, dB: 0.5, timeStep: 1.0 }
};

function closeTuringSettingsModal() {
    app.dom.turingSettingsModal.classList.add('hidden');
    app.resetWasLongPress();
}

// 1. פונקציה חדשה: סנכרון תצוגת הסליידרים
function updateTuringSlidersUI() {
    if(app.dom.turingFeedSlider && app.dom.turingKillSlider) {
        app.dom.turingFeedSlider.value = tempTuringRules.feed;
        app.dom.turingFeedValue.textContent = tempTuringRules.feed.toFixed(3);
        app.dom.turingKillSlider.value = tempTuringRules.kill;
        app.dom.turingKillValue.textContent = tempTuringRules.kill.toFixed(3);
    }
}

function updateTuringPresetButtons(activeId) {
    const btns = [
        app.dom.btnTuringPresetCoral, app.dom.btnTuringPresetMaze, 
        app.dom.btnTuringPresetSpots, app.dom.btnTuringPresetCells,
        app.dom.btnTuringPresetBoiling, app.dom.btnTuringPresetUSkate,
        app.dom.btnTuringPresetChaos, app.dom.btnTuringPresetWaves
    ];
    btns.forEach(b => {
        if (b && b.id === activeId) b.classList.add('active');
        else if (b) b.classList.remove('active');
    });
}

function applyTuringPreset(presetName, btnElement) {
    const p = TURING_PRESETS[presetName];
    if (!p) return;
    tempTuringRules = { ...p };
    
    // עדכון הסליידרים בעקבות בחירת פריסט
    updateTuringSlidersUI();
    updateTuringPresetButtons(btnElement ? btnElement.id : '');
    
    // החלה חיה של השינוי על הלוח!
    app.setTuringRules({ ...tempTuringRules });
}

function saveTuringSettings() {
    app.setTuringRules({ ...tempTuringRules });
    closeTuringSettingsModal();
}

function openTuringSettingsModal() {
    tempTuringRules = { ...app.getTuringRules() };
    
    // משיכת טקסטים מקובץ השפות (אם קיימים)
    if (app.dom.turingModalTitle) app.dom.turingModalTitle.textContent = app.getText('turing_modal_title') || 'Turing Patterns';
    if (app.dom.btnTuringPresetCoral) app.dom.btnTuringPresetCoral.textContent = app.getText('turing_preset_coral') || 'Coral';
    if (app.dom.btnTuringPresetMaze) app.dom.btnTuringPresetMaze.textContent = app.getText('turing_preset_maze') || 'Maze';
    if (app.dom.btnTuringPresetSpots) app.dom.btnTuringPresetSpots.textContent = app.getText('turing_preset_spots') || 'Spots';
    if (app.dom.btnTuringPresetCells) app.dom.btnTuringPresetCells.textContent = app.getText('turing_preset_cells') || 'Cells';
    if (app.dom.btnTuringPresetBoiling) app.dom.btnTuringPresetBoiling.textContent = app.getText('turing_preset_boiling') || 'Boiling';
    if (app.dom.btnTuringPresetUSkate) app.dom.btnTuringPresetUSkate.textContent = app.getText('turing_preset_uskate') || 'U-Skate';
    if (app.dom.btnTuringPresetChaos) app.dom.btnTuringPresetChaos.textContent = app.getText('turing_preset_chaos') || 'Chaos';
    if (app.dom.btnTuringPresetWaves) app.dom.btnTuringPresetWaves.textContent = app.getText('turing_preset_waves') || 'Waves';

    // עדכון הסליידרים למצב הנוכחי עם הפתיחה
    updateTuringSlidersUI();

    let activeId = '';
    for (const [name, rules] of Object.entries(TURING_PRESETS)) {
        if (rules.feed === tempTuringRules.feed && rules.kill === tempTuringRules.kill) {
            activeId = 'btnTuringPreset' + name;
            break;
        }
    }
    updateTuringPresetButtons(activeId);
    app.dom.turingSettingsModal.classList.remove('hidden');
}
// --- END: Turing Patterns Modal Logic ---




// --- Modal Management Functions ---

function openResizeModal() {
    if (app.isBreathing()) return;
    app.dom.resizeInput.value = app.getN();
    app.dom.resizeModal.classList.add('modal-visible');
    app.dom.resizeInput.focus();
    app.dom.resizeInput.select();
}

// Phase 1 Addition
function openAdvancedColorMappingModal() {
    if (app.isBreathing() || app.isLifePlaying()) return;
    app.dom.adaptModalTitle.textContent = app.getText('adaptModal_title');
    app.dom.adaptModalDesc.textContent = app.getText('adaptModal_desc');
    app.dom.btnAdaptColors.textContent = app.getText('adaptModal_confirmBtn');
    app.dom.advancedColorMappingModal.style.display = 'flex';
    setTimeout(() => app.dom.advancedColorMappingModal.classList.add('modal-visible'), 10);
}

function handleConfirmResize() {
    let newSize = parseInt(app.dom.resizeInput.value, 10);
    if (isNaN(newSize) || newSize < 1 || newSize > 300) {
        app.dom.resizeInput.style.borderColor = 'red';
        setTimeout(() => { app.dom.resizeInput.style.borderColor = ''; }, 1000);
        return;
    }
    closeResizeModal();
    if (newSize !== app.getN()) {
         app.animateBoardTransition(() => app.performAction(() => {
             window.logArtEvent('GRID_RESIZE', newSize);
             app._performResize(newSize);
         }));
    }
}

function selectColorAndClose(color) {
    const targetIndex = app.pointerState.longPressTarget;
    app.setIsRainbowModeActive(false);
    app.setSelectedColor(color);
    app.updateGlowEffect();
    app.updateColorPickerButtonUI();
    if (targetIndex !== null && targetIndex > -1) {
        app.performAction(() => {
            const targetIndices = app.getSymmetricIndices(targetIndex);
            app.applyActionToTiles(targetIndices, tile => {
                tile.isGold = false;
                tile.k = app.getSelectedColorIndex();
            });
        });
    }
    closeColorPickerModal();
}

function selectRainbowAndClose() {
    const targetIndex = app.pointerState.longPressTarget;
    app.setIsRainbowModeActive(true);
    app.setSelectedColor(null);
    app.updateGlowEffect();
    app.updateColorPickerButtonUI();
    if (targetIndex !== null && targetIndex > -1) {
        app.performAction(() => {
            const targetIndices = app.getSymmetricIndices(targetIndex);
            app.applyActionToTiles(targetIndices, tile => {
                tile.isGold = false;
                const randomIndex = Math.floor(Math.random() * app.paletteLen());
                tile.k = randomIndex;
            });
        });
    }
    closeColorPickerModal();
}

function renderColorPickerContent() {
    const currentPalette = app.C.PALETTES[app.getActivePaletteIndex()];
    const colors = currentPalette.colors;
    const totalPages = Math.ceil(colors.length / app.C.COLORS_PER_PAGE);

    let currentPage = app.getColorPickerPage();
    if (currentPage >= totalPages) {
        app.setColorPickerPage(0);
        currentPage = 0;
    }

    if (totalPages > 1) {
      app.dom.colorPickerHeader.style.display = 'flex';
    } else {
      app.dom.colorPickerHeader.style.display = 'none';
    }

    const displayIcon = currentPalette.iconHTML || currentPalette.emoji || '';
    app.dom.colorPickerPaletteName.innerHTML = displayIcon;

    app.dom.colorPickerSwatches.innerHTML = '';
    const frag = document.createDocumentFragment();

    const rainbowSwatch = document.createElement('div');
    rainbowSwatch.className = 'color-swatch';
    const rainbowSwatchInner = document.createElement('div');
    rainbowSwatchInner.className = 'color-swatch-inner';
    rainbowSwatchInner.innerHTML = app.createRainbowIconSVG();
    rainbowSwatch.appendChild(rainbowSwatchInner);
    rainbowSwatch.setAttribute('aria-label', app.getText('colorPicker_rainbow'));
    rainbowSwatch.addEventListener('click', () => selectRainbowAndClose());
    frag.appendChild(rainbowSwatch);

    const startIndex = currentPage * app.C.COLORS_PER_PAGE;
    const endIndex = startIndex + app.C.COLORS_PER_PAGE;
    const pageColors = colors.slice(startIndex, endIndex);

    pageColors.forEach((color) => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        const swatchInner = document.createElement('div');
        swatchInner.className = 'color-swatch-inner';
        swatchInner.style.backgroundColor = color;
        
        // --- START: תיקון מסגרת לצבעים כהים ---
        // נמיר את צבע ה-HEX לערכי RGB כדי לבדוק כמה הוא כהה
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        // חישוב בהירות (Luminance) - הערך נע בין 0 (שחור מוחלט) ל-255 (לבן)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
        
        // אם הצבע כהה (מתחת לערך 40), נוסיף לו קו מתאר לבן עדין ושקוף
        if (luminance < 10) {
            swatchInner.style.border = '1px solid rgba(255, 255, 255, 0.25)';
            // שינוי קטן כדי להבטיח שהמסגרת לא תשנה את גודל הקובייה הפנימית
            swatchInner.style.boxSizing = 'border-box'; 
        }
        // --- END: תיקון מסגרת לצבעים כהים ---

        swatch.appendChild(swatchInner);
        swatch.dataset.color = color;
        swatch.setAttribute('aria-label', `${app.getText('colorPicker_select')} ${color}`);
        swatch.addEventListener('click', () => selectColorAndClose(color));
        frag.appendChild(swatch);
    });

    const placeholdersNeeded = (app.C.COLORS_PER_PAGE + 1) - (pageColors.length + 1);
    for (let i = 0; i < placeholdersNeeded; i++) {
        const placeholder = document.createElement('div');
        placeholder.className = 'color-swatch';
        placeholder.style.pointerEvents = 'none';
        placeholder.style.opacity = '0';
        frag.appendChild(placeholder);
    }

    app.dom.colorPickerSwatches.appendChild(frag);

    app.dom.colorPickerPagination.innerHTML = '';
    if (totalPages > 1) {
        for (let i = 0; i < totalPages; i++) {
            const dot = document.createElement('div');
            dot.className = 'pagination-dot' + (i === currentPage ? ' active' : '');
            dot.dataset.page = i;
            dot.addEventListener('click', (e) => {
                app.setColorPickerPage(parseInt(e.target.dataset.page, 10));
                renderColorPickerContent();
            });
            app.dom.colorPickerPagination.appendChild(dot);
        }
    }
}

function openColorPickerModal(targetTileIndex = null) {
    if (app.isBreathing()) return;
    app.pointerState.longPressTarget = targetTileIndex;
    app.setColorPickerPage(0);
    renderColorPickerContent();
    app.dom.colorPickerModal.classList.add('modal-visible');
}

function openHelpModal() {
    activeHelpTab = app.isSimulationMode() ? 'evolution' : 'creation';
    populateHelpModal();
    app.dom.helpModal.classList.add('modal-visible');
}

function openPaletteModal() {
    if (app.isBreathing()) return;
    populatePaletteModal();
    app.dom.paletteModal.classList.add('modal-visible');

    // --- START: גלילה אוטומטית לפלטה הפעילה ---
    setTimeout(() => {
        const activePreview = document.getElementById('active-palette-preview');
        if (activePreview) {
            activePreview.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 50);
    // --- END: גלילה אוטומטית ---
}





function populatePaletteModal() {
    app.dom.paletteModalGrid.innerHTML = '';
    const frag = document.createDocumentFragment();

    // אנחנו משתמשים במערך הקבוצות הגלובלי שכבר מוין ב-constants.js
    app.C.PALETTE_GROUPS.forEach(group => {
        
        // אם אין פלטות בקבוצה הזו (למשל אם הארכיון ריק), נדלג עליה
        if (group.indexes.length === 0) return;

        // יצירת כותרת הקבוצה
        const header = document.createElement('div');
        header.style.gridColumn = '1 / -1'; 
        header.style.color = 'var(--gold)';
        header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
        header.style.paddingBottom = '5px';

        // הפתרון המבני: הריווח העליון עובר להיות חלק מהכותרת עצמה במקום מהקונטיינר
        header.style.marginTop = '0px'; 
        header.style.paddingTop = '15px'; 
        header.style.marginBottom = '-8px';
                
        header.style.paddingBottom = '12px';
        header.style.fontSize = '1.1rem';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'flex-end';
        
        // --- START: תוספת לכותרות דביקות ---
        header.style.position = 'sticky';
        header.style.top = '0px'; 
        header.style.backgroundColor = '#1c1c1c'; 
        header.style.zIndex = '20';
        header.style.width = '100%';
        header.style.boxSizing = 'border-box';
        // --- END: תוספת לכותרות דביקות ---

        header.innerHTML = `<span>${group.title}</span> <span style="font-size: 0.8rem; opacity: 0.7;">${group.indexes.length} items</span>`;
        frag.appendChild(header);
        
        
        // יצירת הכפתורים מתוך האינדקסים שהוכנו מראש לקבוצה
        group.indexes.forEach(index => {
            const palette = app.C.PALETTES[index];
            const preview = document.createElement('div');
            preview.className = 'palette-preview';
            
            if (index === app.getActivePaletteIndex()) {
                preview.style.boxShadow = '0 0 0 2px var(--gold)';
                preview.style.transform = 'scale(1.05)';
                preview.style.transition = 'all 0.2s';
                preview.id = 'active-palette-preview'; // <-- תוספת מזהה לגלילה האוטומטית
            }

            preview.addEventListener('click', () => {
                app.switchToPalette(index);
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
            name.textContent = `${palette.name} (${palette.colors.length})`;

            preview.appendChild(iconContainer);
            preview.appendChild(name);
            frag.appendChild(preview);
        });
    });

    app.dom.paletteModalGrid.appendChild(frag);
}



let activeHelpTab = 'creation';
function selectHelpTab(tab) {
    activeHelpTab = tab;
    document.querySelectorAll('[data-help-tab]').forEach(button => {
        const selected = button.dataset.helpTab === tab;
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;
        document.getElementById(button.getAttribute('aria-controls')).hidden = !selected;
    });
    document.getElementById('helpModalContent').scrollTop = 0;
}

function populateHelpModal() {
    const bodies = Object.fromEntries([...document.querySelectorAll('[data-help-body]')].map(body => [body.dataset.helpBody, body]));
    Object.values(bodies).forEach(body => body.replaceChildren());

    const categories = {
        inspiration: { tab: 'creation', titleKey: 'help_category_inspiration', buttons: ['btnPalette', 'btnRandom', 'btnInvert', 'btnSpecialReset'] },
        order: { tab: 'creation', titleKey: 'help_category_order', buttons: ['btnCycleSort', 'btnResizeUp', 'btnResizeDown', 'btnGap', 'btnDark'] },
        touch: { tab: 'creation', titleKey: 'help_category_touch', buttons: ['btnBrushMode', 'btnSymmetry', 'btnColorPicker'] },
        controls: { tab: 'evolution', titleKey: 'help_category_controls', buttons: ['btnToggleSimMode', 'btnPlayPauseLife', 'btnStepForward', 'btnSimSettings'] },
        evolution: { tab: 'evolution', titleKey: 'help_category_evolution_modes', buttons: ['btnShowBreatheMenu', 'btnGameOfLife', 'btnBrightnessEvo', 'btnGravitationalSort', 'btnSpiral', 'btnMagnetModes', 'btnContour', 'btnSandpile', 'btnTuring', 'btnErosion', 'btnDla', 'btnNudgeBrighter', 'btnNudgeDarker'] },
        advanced: { tab: 'tools', titleKey: 'help_category_advanced', buttons: ['btnOpenDebug'] },
        tools: { tab: 'tools', titleKey: 'help_category_tools', buttons: ['btnUndo', 'btnRedo', 'btnSave', 'btnMacroPlay', 'btnResetBoard'] }
    };

    const helpData = {
        btnCycleSort: app.getText('help_sort'), btnSpiral: app.getText('help_spiral'), btnMagnetModes: app.getText('help_magnet'),
        btnContour: app.getText('help_contour'), btnSandpile: app.getText('help_sandpile'), btnTuring: app.getText('help_turing'),
        btnNudgeBrighter: app.getText('help_nudge_forward'), btnNudgeDarker: app.getText('help_nudge_backward'),
        btnStepForward: app.getText('help_step'), btnSimSettings: app.getText('help_sim_settings'),
        btnMacroPlay: app.getText('help_macro'), btnOpenDebug: app.getText('help_technicians'),
        'btnPalette': app.getText('help_palette'), 'btnRandom': app.getText('help_random'), 'btnInvert': app.getText('help_invert'),
        'btnSpecialReset': app.getText('help_specialReset'), 'btnResizeUp': app.getText('help_resizeUp'), 'btnResizeDown': app.getText('help_resizeDown'),
        'btnGap': app.getText('help_gap'), 'btnDark': app.getText('help_dark'), 'btnBrushMode': app.getText('help_brushMode'), 'btnSymmetry': app.getText('help_symmetry'),
        'btnColorPicker': app.getText('help_colorPicker'), 'btnToggleSimMode': app.getText('help_toggleSimMode'), 'btnShowBreatheMenu': app.getText('help_breathe'),
        'btnGameOfLife': app.getText('help_gameOfLife'), 'btnBrightnessEvo': app.getText('help_brightnessEvo'), 'btnGravitationalSort': app.getText('help_gravitationalSort'),
        'btnErosion': app.getText('help_erosion'), 'btnDla': app.getText('help_dla'), 'btnPlayPauseLife': app.getText('help_playPauseLife'), 'btnUndo': app.getText('help_undo'),
        'btnRedo': app.getText('help_redo'), 'btnSave': app.getText('help_save'), 'btnResetBoard': app.getText('help_resetBoard')
    };

    for (const categoryKey in categories) {
        const category = categories[categoryKey];
        const contentDiv = bodies[category.tab];
        const titleEl = document.createElement('h3');
        titleEl.className = 'help-category-title';
        titleEl.textContent = app.getText(category.titleKey);
        contentDiv.appendChild(titleEl);

        category.buttons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (!btn || !helpData[btnId]) return;
            const helpItem = document.createElement('div');
            helpItem.className = 'flex items-center gap-4';
            helpItem.dataset.helpFor = btnId;
            const iconWrapper = document.createElement('div');
            iconWrapper.className = 'help-item-icon-wrapper';
            // Copy one visible state, not all variants; scope SVG definition
            // IDs so help icons do not duplicate the live controls' identifiers.
            const rootIcons = [...btn.querySelectorAll(':scope > svg')];
            const sourceIcon = btnId === 'btnPlayPauseLife' ? rootIcons[0] :
                rootIcons.find(icon => getComputedStyle(icon).display !== 'none') || rootIcons[0];
            if (sourceIcon) {
                const copy = sourceIcon.cloneNode(true);
                if (btnId === 'btnPlayPauseLife') {
                    const play = copy.querySelector('#iconPlay');
                    const pause = copy.querySelector('#iconPause');
                    if (play) { play.style.display = 'block'; play.setAttribute('fill', 'currentColor'); }
                    if (pause) pause.style.display = 'none';
                }
                copy.style.display = 'block'; iconWrapper.appendChild(copy);
            } else iconWrapper.innerHTML = btn.innerHTML;
            const ids = new Map([...iconWrapper.querySelectorAll('[id]')].map(element => [element.id, `help-${btnId}-${element.id}`]));
            iconWrapper.querySelectorAll('*').forEach(element => {
                if (element.id) element.id = ids.get(element.id);
                [...element.attributes].forEach(attribute => {
                    let value = attribute.value;
                    ids.forEach((replacement, original) => {
                        value = value.replaceAll(`url(#${original})`, `url(#${replacement})`);
                        if (value === `#${original}`) value = `#${replacement}`;
                    });
                    if (value !== attribute.value) element.setAttribute(attribute.name, value);
                });
            });
            const textWrapper = document.createElement('div');
            textWrapper.className = 'text-gray-300 text-sm help-item-text';
            helpData[btnId].split('\n').forEach((text, index) => {
                const paragraph = document.createElement('p');
                paragraph.className = index === 0 ? 'help-main-action' : 'help-extra-actions';
                paragraph.textContent = text;
                textWrapper.appendChild(paragraph);
            });
            helpItem.appendChild(iconWrapper);
            helpItem.appendChild(textWrapper);
            contentDiv.appendChild(helpItem);
        });
    }

    for (const [tab, tips] of [['creation', ['help_tip2', 'help_tip3', 'help_tip4', 'help_tip5', 'help_tip6']], ['evolution', ['help_tip1']]]) {
        const contentDiv = bodies[tab];
        const tipsTitle = document.createElement('h3');
        tipsTitle.className = 'help-category-title';
        tipsTitle.textContent = app.getText('help_category_tips');
        contentDiv.appendChild(tipsTitle);

        const tipsContainer = document.createElement('div');
        tipsContainer.className = 'space-y-3 text-sm text-gray-300 pl-2';

        tips.forEach(tipKey => {
            const tipItem = document.createElement('p');
            const accent = document.createElement('span');
            accent.textContent = '*';
            accent.style.color = app.C.GOLD;
            accent.style.marginRight = '8px';
            tipItem.appendChild(accent);
            tipItem.appendChild(document.createTextNode(app.getText(tipKey)));
            tipsContainer.appendChild(tipItem);
        });
        contentDiv.appendChild(tipsContainer);

    }
    const contentDiv = bodies.tools;
    const shortcutsTitle = document.createElement('h3');
    shortcutsTitle.className = 'help-category-title';
    shortcutsTitle.textContent = app.getText('help_category_shortcuts');
    contentDiv.appendChild(shortcutsTitle);

    const shortcutsContainer = document.createElement('div');
    shortcutsContainer.className = 'space-y-2';
    const shortcuts = [
        { keys: ['Alt', '+', '↓'], descriptionKey: 'help_keyboard_sort' },
        { keys: ['Tab', '/', 'Shift', '+', 'Tab'], descriptionKey: 'help_keyboard_focus' },
        { keys: ['Enter', '/', 'Space'], descriptionKey: 'help_keyboard_activate' },
        { keys: ['Esc'], descriptionKey: 'help_keyboard_escape' }
    ];
    shortcuts.forEach(shortcut => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between gap-4';
        const description = document.createElement('span');
        description.className = 'text-gray-300 text-sm';
        description.textContent = app.getText(shortcut.descriptionKey);
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
    selectHelpTab(activeHelpTab);
}

// --- START: New Preset Button Logic ---

// 1. אובייקט עזר שמכיל את החוקים של כל פריסט

const PRESET_RULES = {
  'btnGolPresetHarmonic': { survival: [3, 4, 5], birth: [3] },
  'btnGolPresetHive': { survival: [2, 3, 4, 5], birth: [4] },
  'btnGolPresetLivingTexture': { survival: [3, 4, 6, 7, 8], birth: [3, 6, 7, 8] },
  'btnGolPresetAmoeba': { survival: [1, 3, 5, 8], birth: [3, 5, 7] },
  'btnGolPresetPaint': { survival: [0, 1, 2, 3, 4, 5, 6, 7, 8], birth: [4, 5, 6, 7, 8] },
  'btnGolPresetPaint2': { survival: [0, 1, 2, 3, 4, 5, 6, 7, 8], birth: [1, 2, 3, 4, 5, 6, 7, 8] },

  'btnGolPresetCoral': { survival: [4, 5, 6, 7, 8], birth: [3] },
    'btnGolPresetMeditation': { survival: [1, 2, 3, 4, 5], birth: [3] },
  'btnGolPresetJoelson': { survival: [2, 3, 4, 5], birth: [4, 5, 6, 7, 8] },
  'btnGolPresetVibration': { survival: [5, 6, 7, 8], birth: [4, 5, 6, 7, 8] },
'btnGolPresetCharlie': { survival: [2, 5, 8], birth: [3, 5, 7, 8] },
  'btnGolPresetNaive': { survival: [0, 1, 2, 3, 4, 5, 6, 7, 8], birth: [3] },
  'btnGolPresetSpace': { survival: [2, 3, 5, 6, 7, 8], birth: [3, 6, 7, 8] },
    'btnGolPresetYuval': { survival: [0, 1, 2, 3, 4, 5, 6, 7, 8], birth: [4, 6, 7, 8] },
  'btnGolPresetShuffle': { survival: [0, 1, 2, 4, 6, 7, 8], birth: [3, 5] }

};

// 2. הפונקציה החדשה שבודקת ומעדכנת את כפתורי הפריסט
function updateActivePresetButton() {
  // קח את כל הצ'יפים הפעילים כרגע
  const currentSurvival = [];
  app.dom.golSurvivalChipsContainer.querySelectorAll('.gol-chip-btn.active').forEach(chip => {
    currentSurvival.push(parseInt(chip.dataset.number, 10));
  });
  
  const currentBirth = [];
  app.dom.golBirthChipsContainer.querySelectorAll('.gol-chip-btn.active').forEach(chip => {
    currentBirth.push(parseInt(chip.dataset.number, 10));
  });

  // פונקציית עזר להשוואת שני מערכים
  const arraysAreEqual = (a, b) => 
    a.length === b.length && a.every((val, index) => val === b[index]);

  // סדר את המערכים הנוכחיים לצורך השוואה
  currentSurvival.sort((a,b) => a - b);
  currentBirth.sort((a,b) => a - b);

  // עבור על כל הפריסטים המוכרים
  for (const [buttonId, rules] of Object.entries(PRESET_RULES)) {
    const presetButton = document.getElementById(buttonId);
    if (!presetButton) continue;

    // השווה את החוקים הנוכחיים לחוקי הפריסט (הם כבר ממוינים)
    const survivalMatch = arraysAreEqual(currentSurvival, rules.survival);
    const birthMatch = arraysAreEqual(currentBirth, rules.birth);

    // הדלק או כבה את הכפתור בהתאם
    if (survivalMatch && birthMatch) {
      presetButton.classList.add('active');
    } else {
      presetButton.classList.remove('active');
    }
  }
}

// 3. עדכון פונקציית applyGolPreset הקיימת
function applyGolPreset(survivalArray, birthArray) {
    // עדכון צ'יפים של הישרדות
    app.dom.golSurvivalChipsContainer.querySelectorAll('.gol-chip-btn').forEach(chip => {
        const num = parseInt(chip.dataset.number, 10);
        chip.classList.toggle('active', survivalArray.includes(num));
    });

    // עדכון צ'יפים של לידה
    app.dom.golBirthChipsContainer.querySelectorAll('.gol-chip-btn').forEach(chip => {
        const num = parseInt(chip.dataset.number, 10);
        chip.classList.toggle('active', birthArray.includes(num));
    });
    
    // קריאה לפונקציית הבדיקה החדשה
    updateActivePresetButton();
}
// --- END: New Preset Button Logic ---




function openGolSettingsModal() {
    if (app.isBreathing() || app.isLifePlaying()) return;
    
    // --- START: MODIFICATION ---
    // במקום להגדיר טקסט, נפעיל את הפונקציה שמעדכנת את הכפתורים
    const rules = app.getGameOfLifeRules();
    applyGolPreset(rules.survival, rules.birth);
updateActivePresetButton();
    // --- END: MODIFICATION ---
    
    app.dom.gameOfLifeSettingsModal.style.display = 'flex';
    setTimeout(() => app.dom.gameOfLifeSettingsModal.classList.add('modal-visible'), 10);
}


// --- START: MODIFICATION ---
// הסרת פונקציית הוולידציה הישנה, אין בה צורך יותר
// function validateRuleString(ruleString) { ... }
// --- END: MODIFICATION ---


function saveGolSettings() {
    // --- START MODIFICATION ---
    // אין יותר ולידציה, רק איסוף נתונים מהכפתורים
    const newSurvivalRules = [];
    app.dom.golSurvivalChipsContainer.querySelectorAll('.gol-chip-btn.active').forEach(chip => {
        newSurvivalRules.push(parseInt(chip.dataset.number, 10));
    });

    const newBirthRules = [];
    app.dom.golBirthChipsContainer.querySelectorAll('.gol-chip-btn.active').forEach(chip => {
        newBirthRules.push(parseInt(chip.dataset.number, 10));
    });

    const newRules = {
        survival: newSurvivalRules,
        birth: newBirthRules,
    };
    // --- END MODIFICATION ---

    app.setGameOfLifeRules(newRules);
    closeGolSettingsModal();
}

function resetGolSettings() {
    app.setGameOfLifeRules({ ...app.C.defaultGameOfLifeRules });
    const rules = app.getGameOfLifeRules();
    
    // --- START MODIFICATION ---
    // עדכון הממשק הוויזואלי (הצ'יפים) במקום שדות הטקסט
    applyGolPreset(rules.survival, rules.birth);
    // --- END MODIFICATION ---
}

function openGravitationalSortSettingsModal() {
    if (app.isBreathing() || app.isLifePlaying()) return;
    const rules = app.getGravitationalSortRules();
    app.dom.gsDirectionButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.direction === rules.direction);
    });
    app.dom.gsStrengthSlider.value = rules.strength * 100;
    app.dom.gsStrengthValue.textContent = `${Math.round(rules.strength * 100)}%`;
    app.dom.gravitationalSortSettingsModal.style.display = 'flex';
    setTimeout(() => app.dom.gravitationalSortSettingsModal.classList.add('modal-visible'), 10);
}

function saveGravitationalSortSettings() {
    const activeBtn = app.dom.gravitationalSortSettingsModal.querySelector('.gs-direction-btn.active');
    const newRules = { ...app.getGravitationalSortRules() };
    if (activeBtn) {
        newRules.direction = activeBtn.dataset.direction;
    }
    newRules.strength = parseInt(app.dom.gsStrengthSlider.value, 10) / 100;
    app.setGravitationalSortRules(newRules);
    
    // עדכון: סנכרון האייקון בלוח הבקרה למצב החדש שנבחר
    if (typeof app.syncGsModeFromModal === 'function') {
        app.syncGsModeFromModal(newRules.direction);
    }
    
    closeGravitationalSortSettingsModal();
}
// --- START: Added for Contour Settings ---
function openContourSettingsModal() {
    if (app.isBreathing() || app.isLifePlaying()) return;

    // 1. Set all texts from i18n
    app.dom.contourSettingsTitle.textContent = app.getText('contour_modal_title');
    app.dom.contourSensitivityLabel.textContent = app.getText('contour_sensitivity_label');
    app.dom.contourSensitivityDesc.textContent = app.getText('contour_sensitivity_desc');
    app.dom.contourSensitivityLabelLow.textContent = app.getText('contour_sensitivity_low');
    app.dom.contourSensitivityLabelHigh.textContent = app.getText('contour_sensitivity_high');
    app.dom.contourColorLabel.textContent = app.getText('contour_color_label');
    app.dom.btnContourColorDark.title = app.getText('contour_color_darkest');
    app.dom.btnContourColorLight.title = app.getText('contour_color_lightest');
    app.dom.btnContourSettingsCancel.textContent = app.getText('gs_modal_cancel'); // Re-use "Cancel"
    app.dom.btnContourSettingsSave.textContent = app.getText('gs_modal_save_close'); // Re-use "Save & Close"

    // 2. Get current rules and set UI elements
    const rules = app.getContourRules();
    app.dom.contourSensitivitySlider.value = rules.sensitivity;
    app.dom.contourSensitivityValue.textContent = `${rules.sensitivity}%`; // Set initial text value
    
    app.dom.btnContourColorDark.classList.toggle('active', rules.lineColor === 'darkest');
    app.dom.btnContourColorLight.classList.toggle('active', rules.lineColor === 'lightest');

    // 3. Show the modal
    app.dom.contourSettingsModal.style.display = 'flex';
    setTimeout(() => app.dom.contourSettingsModal.classList.add('modal-visible'), 10);
}

function saveContourSettings() {
    // 1. Read values from UI
    const newSensitivity = parseInt(app.dom.contourSensitivitySlider.value, 10);
    const activeColorBtn = app.dom.contourSettingsModal.querySelector('.contour-color-btn.active');
    const newLineColor = activeColorBtn ? activeColorBtn.dataset.color : 'darkest'; // Default to darkest if none selected

    // 2. Set new rules
    app.setContourRules({
        sensitivity: newSensitivity,
        lineColor: newLineColor,
    });

    // 3. Close modal
    closeContourSettingsModal();
}
// --- END: Added for Contour Settings ---


let selectedEvoMode = 'brightness'; // ישמור את הבחירה הזמנית של המשתמש




export function initializeModals(appContext) {
    app = appContext;
    const helpTabs = [...document.querySelectorAll('[data-help-tab]')];
    helpTabs.forEach((button, index) => {
        button.addEventListener('click', () => selectHelpTab(button.dataset.helpTab));
        button.addEventListener('keydown', event => {
            const rtl = app.getCurrentLang() === 'he';
            let next;
            if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = helpTabs.length - 1;
            else if (event.key === 'ArrowRight') next = (index + (rtl ? -1 : 1) + helpTabs.length) % helpTabs.length;
            else if (event.key === 'ArrowLeft') next = (index + (rtl ? 1 : -1) + helpTabs.length) % helpTabs.length;
            else return;
            event.preventDefault();
            selectHelpTab(helpTabs[next].dataset.helpTab);
            helpTabs[next].focus();
        });
    });


    const sortDialog = document.getElementById('sortCycleDialog');
    const sortOptions = document.getElementById('sortCycleOptions');
    const sortStatus = document.getElementById('sortCycleStatus');
    const sortOrderToggle = document.getElementById('btnSortOrder');
    let draftSortMethods = [], isOrderingSort = false;
    function updateSortSelection() {
        const inputs = [...sortOptions.querySelectorAll('input')];
        const count = inputs.filter(input => input.checked).length;
        inputs.forEach(input => { input.disabled = input.checked && count === 1; });
    }
    function renderSortOptions() {
        sortOptions.replaceChildren();
        sortOrderToggle.dataset.debugText = isOrderingSort ? 'sort_choose_methods' : 'sort_order';
        sortOrderToggle.textContent = app.getText(sortOrderToggle.dataset.debugText);
        sortOrderToggle.setAttribute('aria-pressed', String(isOrderingSort));
        const modes = isOrderingSort ? draftSortMethods.map(method => app.SORT_MODES.find(mode => mode.method === method)) : app.SORT_MODES;
        modes.forEach((mode, index) => {
            const row = document.createElement(isOrderingSort ? 'div' : 'label');
            row.className = 'sort-cycle-option' + (isOrderingSort ? ' is-reordering' : '');
            row.dataset.method = mode.method;
            if (!isOrderingSort) {
                const input = document.createElement('input');
                input.type = 'checkbox'; input.value = mode.method;
                input.checked = draftSortMethods.includes(mode.method);
                row.appendChild(input);
            }
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
            svg.setAttribute('aria-hidden', 'true'); svg.innerHTML = mode.icon;
            const name = document.createElement('span');
            name.id = 'sort-name-' + mode.method;
            name.dataset.debugText = 'startup_sort_' + mode.method;
            name.textContent = app.getText(name.dataset.debugText);
            row.append(svg, name);
            if (isOrderingSort) {
                const position = document.createElement('select');
                position.className = 'sort-order-position';
                position.id = 'sort-position-' + mode.method;
                position.setAttribute('aria-labelledby', `${position.id} ${name.id}`);
                modes.forEach((_, target) => {
                    const option = document.createElement('option');
                    option.value = String(target);
                    option.dataset.position = String(target + 1);
                    option.textContent = `${app.getText('sort_position')} ${target + 1}`;
                    position.appendChild(option);
                });
                position.value = String(index);
                position.addEventListener('change', () => {
                    draftSortMethods = moveSortMethod(draftSortMethods, mode.method, Number(position.value));
                    renderSortOptions();
                    document.getElementById(position.id).focus();
                    sortStatus.textContent = `${name.textContent}: ${draftSortMethods.indexOf(mode.method) + 1} / ${draftSortMethods.length}`;
                });
                row.appendChild(position);
            }
            sortOptions.appendChild(row);
        });
        updateSortSelection();
    }
    function openSortCycleModal() {
        if (app.isBreathing()) return;
        sortStatus.textContent = '';
        draftSortMethods = app.getSortCycleMethods();
        isOrderingSort = false;
        renderSortOptions();
        sortDialog.dir = app.getCurrentLang() === 'he' ? 'rtl' : 'ltr';
        sortDialog.showModal();
    }
    sortOptions.addEventListener('change', event => {
        const input = event.target;
        if (!input.matches('input[type=checkbox]')) return;
        draftSortMethods = input.checked ? [...new Set([...draftSortMethods, input.value])] : draftSortMethods.filter(method => method !== input.value);
        sortStatus.textContent = '';
        updateSortSelection();
    });
    sortOrderToggle.addEventListener('click', () => {
        isOrderingSort = !isOrderingSort;
        sortStatus.textContent = '';
        renderSortOptions();
    });
    document.getElementById('btnResetSortCycle').addEventListener('click', () => {
        draftSortMethods = [...DEFAULT_SORT_CYCLE];
        renderSortOptions();
        sortStatus.textContent = app.getText('sort_cycle_reset_note');
    });
    document.getElementById('sortCycleForm').addEventListener('submit', event => {
        event.preventDefault();
        if (!draftSortMethods.length) { sortStatus.textContent = app.getText('sort_cycle_at_least_one'); return; }
        if (app.saveSortCycleMethods(draftSortMethods)) sortDialog.close();
        else sortStatus.textContent = app.getText('sort_cycle_session');
    });
    document.getElementById('btnCancelSortCycle').addEventListener('click', () => sortDialog.close());
    sortDialog.addEventListener('close', () => app.resetWasLongPress());
    sortDialog.addEventListener('click', event => {
        if (event.target !== sortDialog) return;
        const box = sortDialog.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) sortDialog.close();
    });

    // Save Modal
    app.dom.btnModalClose.addEventListener('click', closeModal);
    app.dom.saveModal.addEventListener('click', (e) => { if (e.target === app.dom.saveModal) { closeModal(); } });
    app.dom.btnSaveImage.addEventListener('click', () => app.downloadImage());
    app.dom.btnSaveProjectIdea.addEventListener('click', app.handleSaveProject);
    app.dom.btnLoadProjectIdea.addEventListener('click', app.handleLoadProject);
    app.dom.btnResetLogger.addEventListener('click', app.resetArtRecipeLog);
    app.dom.btnSaveLogger.addEventListener('click', app.exportArtRecipeLog);
    app.dom.projectFileInput.addEventListener('change', app.onProjectFileSelected);

    // Resize Modal
    app.dom.btnConfirmResize.addEventListener('click', handleConfirmResize);
    app.dom.resizeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { handleConfirmResize(); } });
    app.dom.btnResizeModalClose.addEventListener('click', closeResizeModal);
    app.dom.resizeModal.addEventListener('click', (e) => { if (e.target === app.dom.resizeModal) { closeResizeModal(); } });

    // Color Picker Modal
    app.dom.colorPickerModal.addEventListener('click', (e) => { if (e.target === app.dom.colorPickerModal) { closeColorPickerModal(); } });
    
    app.dom.btnNextPalette.addEventListener('click', () => {
        app.navigateColorPages(true);
        renderColorPickerContent();
    });
    app.dom.btnPrevPalette.addEventListener('click', () => {
        app.navigateColorPages(false);
        renderColorPickerContent();
    });
    
    app.dom.colorPickerModal.addEventListener('wheel', handlePaletteWheel);
    app.dom.colorPickerModal.addEventListener('touchstart', handleTouchStart, { passive: true });
    app.dom.colorPickerModal.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Simulation initialization preferences are separate from the current board.
    const initForm = document.getElementById('initSettingsForm');
    const initToggle = document.getElementById('btnConfigureInit');
    const initBoard = document.getElementById('initBoardSize');
    const initBrush = document.getElementById('initBrushSize');
    const initBrushValue = document.getElementById('initBrushValue');
    const initStatus = document.getElementById('initSettingsStatus');
    app.C.SIZES.slice().sort((a, b) => a - b).forEach(size => {
        const option = document.createElement('option');
        option.value = size;
        option.textContent = `${size} × ${size}`;
        initBoard.appendChild(option);
    });
    function fillInitForm(settings) {
        initBoard.value = settings.boardSize;
        initBrush.value = settings.brushSize;
        initBrushValue.value = settings.brushSize;
        initStatus.textContent = '';
    }
    const nudgeSpeed = document.getElementById('nudgeSpeed');
    const nudgeSpeedValue = document.getElementById('nudgeSpeedValue');
    function updateNudgeSpeedValue() {
        const interval = 200 - Number(nudgeSpeed.value);
        const text = interval === 0 ? app.getText('nudge_fast') : app.getText('nudge_interval').replace('{ms}', interval);
        nudgeSpeedValue.value = text;
        nudgeSpeed.setAttribute('aria-valuetext', text);
    }
    nudgeSpeed.addEventListener('input', () => {
        app.setNudgeInterval(200 - Number(nudgeSpeed.value), false);
        updateNudgeSpeedValue();
    });
    // Store once on release, rather than synchronously writing storage for every drag event.
    nudgeSpeed.addEventListener('change', () => app.persistNudgeSettings());
    const nudgeDialog = document.getElementById('nudgeSettingsDialog');
    function openNudgeSettingsModal() {
        nudgeSpeed.value = String(200 - app.getNudgeSettings().intervalMs);
        updateNudgeSpeedValue();
        nudgeSpeed.disabled = app.isNudgeReplayActive();
        nudgeDialog.showModal();
        if (!nudgeSpeed.disabled) nudgeSpeed.focus();
    }
    document.getElementById('btnCloseNudgeSettings').addEventListener('click', () => nudgeDialog.close());
    nudgeDialog.addEventListener('close', () => {
        app.persistNudgeSettings();
        app.resetWasLongPress();
    });
    nudgeDialog.addEventListener('click', event => {
        if (event.target !== nudgeDialog) return;
        const bounds = nudgeDialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
            nudgeDialog.close();
        }
    });
    let technicianReturnFocus = app.dom.btnOpenDebug;
    function openTechnicianMenu(trigger = app.dom.btnOpenDebug) {
        technicianReturnFocus = trigger;
        fillInitForm(app.getSimulationInit());
        fillStartupForm(app.getStartupSettings());
        startupForm.hidden = true;
        startupToggle.setAttribute('aria-expanded', 'false');
        initForm.hidden = true;
        initToggle.setAttribute('aria-expanded', 'false');
        app.dom.technicianDialog.showModal();
    }
    app.dom.btnOpenDebug.addEventListener('click', () => openTechnicianMenu());
    initToggle.addEventListener('click', () => {
        startupForm.hidden = true;
        startupToggle.setAttribute('aria-expanded', 'false');
        initForm.hidden = !initForm.hidden;
        initToggle.setAttribute('aria-expanded', String(!initForm.hidden));
        if (!initForm.hidden) initBoard.focus();
    });
    initBrush.addEventListener('input', () => {
        initBrushValue.value = initBrush.value;
        initStatus.textContent = '';
    });
    initBoard.addEventListener('change', () => { initStatus.textContent = ''; });
    document.getElementById('btnResetInit').addEventListener('click', () => {
        fillInitForm(DEFAULT_SIM_INIT);
        initStatus.textContent = app.getText('init_defaults_pending');
    });
    initForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const persisted = app.saveSimulationInit({
            boardSize: Number(initBoard.value), brushSize: Number(initBrush.value)
        });
        initStatus.textContent = app.getText(persisted ? 'init_saved' : 'init_saved_session');
    });
    const startupForm = document.getElementById('startupSettingsForm');
    const startupToggle = document.getElementById('btnConfigureStartup');
    const startupStatus = document.getElementById('startupSettingsStatus');
    const startupFields = {
        paletteName: 'startupPalette', boardSize: 'startupBoardSize', separatorPx: 'startupSeparator',
        sortMethod: 'startupSort', fill: 'startupFill', brushMode: 'startupBrushMode',
        brushColor: 'startupBrushColor', symmetry: 'startupSymmetry', interfaceMode: 'startupInterface',
        brushSize: 'startupBrushSize'
    };
    function addStartupOptions(id, entries) {
        const select = document.getElementById(id);
        entries.forEach(([value, label, key]) => {
            const option = document.createElement('option');
            option.value = value;
            if (key) option.dataset.debugText = key;
            option.textContent = key ? app.getText(key) : label;
            select.appendChild(option);
        });
    }
    addStartupOptions('startupPalette', app.C.PALETTES.filter(p => !p.isArchived)
        .map(p => [p.originalName, p.originalName]));
    addStartupOptions('startupBoardSize', app.C.SIZES.slice().sort((a, b) => a - b).map(n => [n, `${n} × ${n}`]));
    addStartupOptions('startupSeparator', app.C.SEPARATORS.slice().reverse().map(gap => [gap, `${gap} px`]));
    addStartupOptions('startupSort', app.SORT_MODES.map(mode => [mode.method, '', 'startup_sort_' + mode.method]));
    addStartupOptions('startupFill', ['random', 'dark', 'light', 'seed'].map(value => [value, '', 'startup_fill_' + value]));
    addStartupOptions('startupBrushMode', ['paint', 'continuous', 'copy'].map(value => [value, '', 'brushMode_' + value]));
    addStartupOptions('startupBrushColor', ['none', 'darkest', 'lightest', 'rainbow'].map(value => [value, '', 'startup_color_' + value]));
    addStartupOptions('startupSymmetry', app.C.SYMMETRY_MODES.map(value => [value, '', 'symmetry_' + value]));
    addStartupOptions('startupInterface', ['creative', 'simulation'].map(value => [value, '', 'startup_mode_' + value]));
    function fillStartupForm(settings) {
        Object.entries(startupFields).forEach(([key, id]) => { document.getElementById(id).value = settings[key]; });
        document.getElementById('startupBrushValue').value = settings.brushSize;
        startupStatus.textContent = '';
    }
    startupToggle.addEventListener('click', () => {
        initForm.hidden = true;
        initToggle.setAttribute('aria-expanded', 'false');
        startupForm.hidden = !startupForm.hidden;
        startupToggle.setAttribute('aria-expanded', String(!startupForm.hidden));
        if (!startupForm.hidden) document.getElementById('startupPalette').focus();
    });
    startupForm.addEventListener('input', () => {
        document.getElementById('startupBrushValue').value = document.getElementById('startupBrushSize').value;
        startupStatus.textContent = '';
    });
    document.getElementById('btnResetStartup').addEventListener('click', () => {
        fillStartupForm(DEFAULT_STARTUP);
        startupStatus.textContent = app.getText('init_defaults_pending');
    });
    document.getElementById('btnUseCurrentStartup').addEventListener('click', () => {
        fillStartupForm({ ...app.getCurrentStartupSettings(), fill: document.getElementById('startupFill').value });
        startupStatus.textContent = app.getText('startup_current_pending');
    });
    startupForm.addEventListener('submit', event => {
        event.preventDefault();
        const settings = Object.fromEntries(Object.entries(startupFields).map(([key, id]) => {
            const value = document.getElementById(id).value;
            return [key, ['boardSize', 'separatorPx', 'brushSize'].includes(key) ? Number(value) : value];
        }));
        const persisted = app.saveStartupSettings(settings);
        startupStatus.textContent = app.getText(persisted ? 'startup_saved' : 'startup_saved_session');
    });
    app.dom.btnCloseDebug.addEventListener('click', () => app.dom.technicianDialog.close());
    app.dom.technicianDialog.addEventListener('keydown', (event) => {
        if (event.key !== 'Tab') return;
        const controls = [...app.dom.technicianDialog.querySelectorAll('button:not([disabled]), select, input')]
            .filter(element => element.getClientRects().length);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault(); first.focus();
        }
    });
    app.dom.technicianDialog.addEventListener('click', (event) => {
        if (event.target !== app.dom.technicianDialog) return;
        const bounds = app.dom.technicianDialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom) {
            app.dom.technicianDialog.close();
        }
    });
    app.dom.technicianDialog.addEventListener('close', () => {
        app.resetWasLongPress();
        technicianReturnFocus.focus();
    });

    // Help Modal
    app.dom.btnHelpModalClose.addEventListener('click', closeHelpModal);
    app.dom.helpModal.addEventListener('click', (e) => { if (e.target === app.dom.helpModal) { closeHelpModal(); } });

    // Palette Modal
    app.dom.btnPaletteModalClose.addEventListener('click', closePaletteModal);
    app.dom.paletteModal.addEventListener('click', (e) => { if (e.target === app.dom.paletteModal) { closePaletteModal(); } });





    // Game of Life Settings Modal
    app.dom.btnGolSettingsSave.addEventListener('click', saveGolSettings);
    app.dom.btnGolSettingsCancel.addEventListener('click', closeGolSettingsModal);
    app.dom.btnGolSettingsReset.addEventListener('click', resetGolSettings);



// --- START: MODIFICATION ---
// הוספת האזנה לכפתורי הצ'יפים החדשים
app.dom.gameOfLifeSettingsModal.querySelectorAll('.gol-chip-btn').forEach(chip => {
    chip.addEventListener('click', () => {
        chip.classList.toggle('active');
        updateActivePresetButton(); // בדוק מחדש אחרי לחיצה ידנית
    });
});

// עדכון כפתורי ההגדרות המוכנות (Presets) לשימוש בפונקציה החדשה
// הפכנו את האובייקט PRESET_RULES למקור האמת היחיד
for (const [buttonId, rules] of Object.entries(PRESET_RULES)) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.addEventListener('click', () => applyGolPreset(rules.survival, rules.birth));
    }
}
// --- END: MODIFICATION ---



    // Gravitational Sort Settings Modal
    app.dom.gsDirectionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            app.dom.gsDirectionButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    app.dom.gsStrengthSlider.addEventListener('input', () => {
        app.dom.gsStrengthValue.textContent = `${app.dom.gsStrengthSlider.value}%`;
    });
    app.dom.btnGsSettingsSave.addEventListener('click', saveGravitationalSortSettings);
    app.dom.btnGsSettingsCancel.addEventListener('click', closeGravitationalSortSettingsModal);



    // Phase 1 Addition: Advanced Color Mapping Modal
    app.dom.btnAdaptModalClose.addEventListener('click', closeAdvancedColorMappingModal);
    app.dom.advancedColorMappingModal.addEventListener('click', (e) => { if (e.target === app.dom.advancedColorMappingModal) { closeAdvancedColorMappingModal(); } });
    app.dom.btnAdaptColors.addEventListener('click', () => {
        app.adaptColors();
        closeAdvancedColorMappingModal();
    });

    // --- START: Added for Contour Settings ---
    app.dom.btnContourModalClose.addEventListener('click', closeContourSettingsModal);
    app.dom.contourSettingsModal.addEventListener('click', (e) => { if (e.target === app.dom.contourSettingsModal) { closeContourSettingsModal(); } });
    app.dom.btnContourSettingsSave.addEventListener('click', saveContourSettings);
    app.dom.btnContourSettingsCancel.addEventListener('click', closeContourSettingsModal);

    // Listen for slider changes to update the text value
    app.dom.contourSensitivitySlider.addEventListener('input', () => {
        app.dom.contourSensitivityValue.textContent = `${app.dom.contourSensitivitySlider.value}%`;
    });

    app.dom.contourColorButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            app.dom.contourColorButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    // --- END: Added for Contour Settings ---


// --- START: Added for Chi Flow Settings ---

    app.dom.chiFlowModalClose.addEventListener('click', closeChiFlowSettingsModal);
    app.dom.btnChiSettingsCancel.addEventListener('click', closeChiFlowSettingsModal);
    app.dom.btnChiSettingsSave.addEventListener('click', saveChiFlowSettings);
    app.dom.chiFlowSettingsModal.addEventListener('click', (e) => { if (e.target === app.dom.chiFlowSettingsModal) closeChiFlowSettingsModal(); });


app.dom.chiReachSlider.addEventListener('input', (e) => {
    tempChiReach = parseInt(e.target.value, 10);
    app.dom.chiReachValue.textContent = tempChiReach === 0 ? 'Auto' : tempChiReach;
    updateActiveChiPresetButton(); // <-- שינינו את שם הפונקציה כאן
});


app.dom.btnChiSettingsReset.addEventListener('click', () => applyChiPreset('Nova', app.dom.btnChiPresetNova));
    app.dom.btnChiPresetTopography.addEventListener('click', (e) => applyChiPreset('Topography', e.target));
    app.dom.btnChiPresetWildfire.addEventListener('click', (e) => applyChiPreset('Wildfire', e.target));
    app.dom.btnChiPresetCrystals.addEventListener('click', (e) => applyChiPreset('Crystals', e.target));
    app.dom.btnChiPresetRipples.addEventListener('click', (e) => applyChiPreset('Ripples', e.target));
app.dom.btnChiPresetElectric.addEventListener('click', (e) => applyChiPreset('Electric', e.target));
    app.dom.btnChiPresetFluent.addEventListener('click', (e) => applyChiPreset('Fluent', e.target));
    app.dom.btnChiPresetHarmony.addEventListener('click', (e) => applyChiPreset('Harmony', e.target));
    app.dom.btnChiPresetNova.addEventListener('click', (e) => applyChiPreset('Nova', e.target));
    app.dom.btnChiPresetAlexis.addEventListener('click', (e) => applyChiPreset('Alexis', e.currentTarget));
    app.dom.btnChiPresetZen.addEventListener('click', (e) => applyChiPreset('Zen', e.currentTarget));


// --- END: Added for Chi Flow Settings ---

// --- START: Added for Turing Settings ---
    app.dom.turingModalClose.addEventListener('click', closeTuringSettingsModal);
    app.dom.btnTuringSettingsCancel.addEventListener('click', closeTuringSettingsModal);
    app.dom.btnTuringSettingsSave.addEventListener('click', saveTuringSettings);
    app.dom.turingSettingsModal.addEventListener('click', (e) => { if (e.target === app.dom.turingSettingsModal) closeTuringSettingsModal(); });

    app.dom.btnTuringPresetCoral.addEventListener('click', (e) => applyTuringPreset('Coral', e.target));
    app.dom.btnTuringPresetMaze.addEventListener('click', (e) => applyTuringPreset('Maze', e.target));
    app.dom.btnTuringPresetSpots.addEventListener('click', (e) => applyTuringPreset('Spots', e.target));
    app.dom.btnTuringPresetCells.addEventListener('click', (e) => applyTuringPreset('Cells', e.target));
    app.dom.btnTuringPresetBoiling.addEventListener('click', (e) => applyTuringPreset('Boiling', e.target));
    app.dom.btnTuringPresetUSkate.addEventListener('click', (e) => applyTuringPreset('USkate', e.target));
    app.dom.btnTuringPresetChaos.addEventListener('click', (e) => applyTuringPreset('Chaos', e.target));
    app.dom.btnTuringPresetWaves.addEventListener('click', (e) => applyTuringPreset('Waves', e.target));

    // --- תוספת הסליידרים החדשים (Live Update) ---
    if (app.dom.turingFeedSlider && app.dom.turingKillSlider) {
        app.dom.turingFeedSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            tempTuringRules.feed = val;
            app.dom.turingFeedValue.textContent = val.toFixed(3);
            app.setTuringRules({ ...tempTuringRules }); // עדכון חי בזמן גרירה
            updateTuringPresetButtons(''); // כיבוי כפתורי פריסט (כי כיוונו אישית)
        });

        app.dom.turingKillSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            tempTuringRules.kill = val;
            app.dom.turingKillValue.textContent = val.toFixed(3);
            app.setTuringRules({ ...tempTuringRules }); // עדכון חי בזמן גרירה
            updateTuringPresetButtons(''); // כיבוי כפתורי פריסט
        });
    }
    // --- END: Added for Turing Settings ---




// --- START: Added for Spiral Settings ---
    app.dom.btnSpiralSettingsCancel.addEventListener('click', closeSpiralSettingsModal);
    



// שמירת ההגדרות כשהמשתמש לוחץ 'שמור וסגור'
    app.dom.btnSpiralSettingsSave.addEventListener('click', () => {
        const activeBtn = Array.from(app.dom.spiralMethodButtons).find(b => b.classList.contains('active'));
        if (activeBtn && app.spiralRules) {
            app.spiralRules.method = activeBtn.dataset.method;
            
            // עדכון: סנכרון האייקון בלוח הבקרה למצב החדש שנבחר בספירלה
            if (typeof app.syncSpiralModeFromModal === 'function') {
                app.syncSpiralModeFromModal(activeBtn.dataset.method);
            }
        }
        closeSpiralSettingsModal();
    });


// שינוי עיצוב הכפתורים כשלוחצים עליהם (איזה מהם פעיל)
    app.dom.spiralMethodButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            app.dom.spiralMethodButtons.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
        });
    });


    // סגירת החלון בלחיצה על הרקע השחור מסביב
    app.dom.spiralSettingsModal.addEventListener('click', (e) => { 
        if (e.target === app.dom.spiralSettingsModal) closeSpiralSettingsModal(); 
    });
    // --- END: Added for Spiral Settings ---

    // --- MAGNET SETTINGS ---
    app.dom.btnMagnetModalClose.addEventListener('click', closeMagnetSettingsModal);
    app.dom.magnetSettingsModal.addEventListener('click', e => { 
        if (e.target === app.dom.magnetSettingsModal) closeMagnetSettingsModal(); 
    });
    app.dom.btnMagnetSettingsCancel.addEventListener('click', closeMagnetSettingsModal);
    app.dom.btnMagnetSettingsSave.addEventListener('click', saveMagnetSettings);

// ====================== MAGNET SETTINGS MODAL ======================
let tempMagnetRules = { method: 'magnet', anchorColorIndex: -1 };

function closeMagnetSettingsModal() {
    app.dom.magnetSettingsModal.style.display = 'none';
    app.resetWasLongPress();
}

function renderMagnetMethodButtons() {
    const container = app.dom.magnetMethodContainer;
    container.innerHTML = '';

    const modes = [
        { method: 'magnet',        iconId: 'iconModeMagnet' },
        { method: 'cosmic_magnet', iconId: 'iconModeCosmicMagnet' },
        { method: 'time_magnet',   iconId: 'iconModeTimeMagnet' },
        { method: 'expand',        iconId: 'iconModeExpand' }
    ];

    modes.forEach(m => {
        const btn = document.createElement('button');
        btn.className = `gs-direction-btn flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
            tempMagnetRules.method === m.method 
            ? 'active border-gold-400 bg-gray-900 scale-105' 
            : 'border-gray-600 hover:border-gray-400'
        }`;
        btn.dataset.method = m.method;
        btn.style.minWidth = '76px';
        btn.style.minHeight = '76px';

        const originalIcon = document.getElementById(m.iconId);
        if (originalIcon) {
            const iconClone = originalIcon.cloneNode(true);
            iconClone.style.display = 'block';
            iconClone.style.width = '42px';
            iconClone.style.height = '42px';
            btn.appendChild(iconClone);
        } else {
            btn.innerHTML = `<span class="text-4xl">⬡</span>`;
        }

        btn.addEventListener('click', () => {
            tempMagnetRules.method = m.method;
            renderMagnetMethodButtons();
        });

        container.appendChild(btn);
    });
}



function renderMagnetAnchorSwatches() {
    const container = app.dom.magnetAnchorSwatches;
    container.innerHTML = '';
    const currentPalette = app.C.PALETTES[app.getActivePaletteIndex()].colors;

    // 1. יצירת עטיפה (Wrapper) לכפתור ה-ROOT ולאינדיקטור הצבע
    let rootWrapper = document.getElementById('magnetRootWrapper');
    if (!rootWrapper) {
        rootWrapper = document.createElement('div');
        rootWrapper.id = 'magnetRootWrapper';
        // Flex מחזיק את הכפתור והאינדיקטור זה לצד זה
        rootWrapper.className = 'flex items-center gap-3 w-full mb-4';
        container.parentNode.insertBefore(rootWrapper, container);
    }

    // מרוקנים את העטיפה כדי לעדכן אותה בכל לחיצה
    rootWrapper.innerHTML = '';

    // איור ליקוי חמה (SVG) לכפתור הגדול (עם שוליים מימין)
    const eclipseIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-right: 12px;">
        <circle cx="12" cy="12" r="9" stroke="gold" stroke-dasharray="2 4" stroke-linecap="round"/>
        <circle cx="12" cy="12" r="6" fill="#111" stroke="gold" stroke-width="0.5"/>
    </svg>`;

    // איור ליקוי חמה (SVG) מרוכז לאינדיקטור הקטן (בלי שוליים, כדי שיישב בדיוק באמצע)
    const indicatorEclipseIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="9" stroke="gold" stroke-dasharray="2 4" stroke-linecap="round"/>
        <circle cx="12" cy="12" r="6" fill="#111" stroke="gold" stroke-width="0.5"/>
    </svg>`;

    // הגדרת משתנים לאינדיקטור - איזה צבע ותוכן נציג?
    let displayColor = '';
    let displayContent = '';
    
    if (tempMagnetRules.anchorColorIndex === -1) {
        // מצב Root: מציגים את הצבע הכהה (אינדקס 0) ואת אייקון ליקוי החמה המרוכז
        displayColor = currentPalette[0];
        displayContent = indicatorEclipseIcon; 
    } else {
        // נבחר עוגן: מציגים את הצבע והאינדקס שלו
        displayColor = currentPalette[tempMagnetRules.anchorColorIndex];
        displayContent = tempMagnetRules.anchorColorIndex;
    }

    // יצירת כפתור ה-Root 
    const rootBtn = document.createElement('button');
    rootBtn.className = `flex-1 flex items-center justify-center p-3 rounded-2xl border-2 transition-all font-bold text-lg tracking-widest ${
        tempMagnetRules.anchorColorIndex === -1 
        ? 'border-gold-400 text-gold-400 bg-gray-900 shadow-[0_0_0_3px_rgba(255,215,0,0.3)]' 
        : 'border-gray-600 hover:border-gray-400 text-gray-400'
    }`;
    rootBtn.innerHTML = `${eclipseIcon} ROOT`;
    rootBtn.onclick = () => {
        tempMagnetRules.anchorColorIndex = -1;
        renderMagnetAnchorSwatches();
    };

// יצירת קוביית האינדיקטור שתשב מימין
const indicator = document.createElement('div');
indicator.className = `w-14 h-14 flex-shrink-0 rounded-2xl border-2 flex items-center justify-center font-bold text-lg text-white shadow-lg transition-all ${
    tempMagnetRules.anchorColorIndex === -1 
    ? 'border-gold-400 scale-105' 
    : 'border-gold-400 shadow-[0_0_0_3px_rgba(255,215,0,0.3)]'
}`;

    indicator.style.backgroundColor = displayColor;
    indicator.style.textShadow = '0px 1px 3px rgba(0,0,0,0.8)';
    
    if (tempMagnetRules.anchorColorIndex === -1) {
        indicator.style.borderColor = 'var(--gold, #FFD700)';
    }
    


    // שינינו כאן מ-textContent ל-innerHTML כדי שידע לרנדר את ה-SVG (האייקון)
    indicator.innerHTML = displayContent;

    // הוספת שניהם לתוך העטיפה
    rootWrapper.appendChild(rootBtn);
    rootWrapper.appendChild(indicator);
    

    // 2. רינדור שאר הצבעים בתוך הקונטיינר הנגלל
currentPalette.forEach((color, index) => {

        const swatch = document.createElement('div');
        swatch.className = `w-9 h-9 rounded-2xl cursor-pointer border-2 transition-all flex-shrink-0 ${
            tempMagnetRules.anchorColorIndex === index 
            ? 'border-gold-400 scale-110 shadow-[0_0_0_3px_rgba(255,215,0,0.3)]' 
            : 'border-transparent hover:border-gray-400'
        }`;
        swatch.style.backgroundColor = color;
        
        swatch.addEventListener('click', () => {
            tempMagnetRules.anchorColorIndex = index;
            renderMagnetAnchorSwatches();
        });
        
        container.appendChild(swatch);
    });
}

function openMagnetSettingsModal() {
    // התיקון שלנו: שימוש ב"טלפון" כדי למשוך את הנתונים העדכניים והאמיתיים מהמוח 
    const currentRules = app.getMagnetRules();
    tempMagnetRules = { ...currentRules };

    app.dom.magnetSettingsTitle.textContent = app.getText('magnet_modal_title');
    app.dom.magnetModeLabel.textContent = app.getText('magnet_mode_label');
    app.dom.magnetAnchorLabel.textContent = app.getText('magnet_anchor_label');

    renderMagnetMethodButtons();
    renderMagnetAnchorSwatches();

    app.dom.magnetSettingsModal.style.display = 'flex';
    setTimeout(() => app.dom.magnetSettingsModal.classList.add('modal-visible'), 10);
}

function saveMagnetSettings() {
    // התיקון שלנו: שימוש ב"טלפון" כדי לשמור את הנתונים חזרה בצורה מסודרת
    app.setMagnetRules({ ...tempMagnetRules });

    if (typeof app.syncMagnetFromModal === 'function') {
        app.syncMagnetFromModal(tempMagnetRules.method, tempMagnetRules.anchorColorIndex);
    }

    closeMagnetSettingsModal();
}


return {
        showSaveStatus, clearSaveStatus,
        openTechnicianMenu,
        openSortCycleModal,
        openResizeModal,
        openNudgeSettingsModal,
        openColorPickerModal,
        openHelpModal,
        openPaletteModal,
        openGolSettingsModal,
        openGravitationalSortSettingsModal,
        openAdvancedColorMappingModal, // Phase 1 Addition
        openContourSettingsModal, // <-- ADDED HERE
openChiFlowSettingsModal,
openTuringSettingsModal,
        closeModal,
        renderColorPickerContent,
        populateHelpModal,
openSpiralSettingsModal,
openMagnetSettingsModal,
        populatePaletteModal
    };
}
