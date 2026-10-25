import { initializeBrushPicker } from './brush-picker.js';
import { bindColorPageSwipe } from './color-page-swipe.js';
import { brushSizeLabel } from './brush-footprint.js';
import { initializeEvolutionTuningModals } from './evolution-tuning-modals.js';
import { initializeSeparatorCycleModal } from './separator-cycle-modal.js';
import { initializeErosionModal } from './erosion-modal.js';
import { renderPalettePicker } from './palette-picker.js';
import { getPaletteDisplayName } from './palette-display-names.js';
import { bindPresetCycleEditor } from './preset-cycle-editor.js';
import { getAutoChiReach, resolveChiReach, CHI_REACH_PERCENTAGES, CHI_REACH_SLIDER_PERCENTAGES } from './chi-reach.js';
import { GAME_OF_LIFE_PRESETS, CHI_FLOW_PRESETS, defaultContourRules } from './constants.js';
import { RANDOM_STARTUP_PALETTE } from './startup-settings.js';
import { RELATIVE_SEPARATOR_LEVELS, relativeSeparatorLevel } from './relative-separators.js';
import { DEFAULT_SIM_INIT } from './sim-init-settings.js';
import { DEFAULT_SORT_CYCLE, moveSortMethod } from './sort-cycle-settings.js';
// js/ui-modals.js

let lastWheelTime = 0;
function handlePaletteWheel(e) {
    const colors = app.C.PALETTES[app.getActivePaletteIndex()].colors;
    if (e.ctrlKey || colors.length <= app.C.COLORS_PER_PAGE) return;
    const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (!delta) return;
    // Consume the whole wheel gesture over a paged palette, including events
    // during the debounce, so it cannot also scroll the surrounding dialog.
    e.preventDefault();
    if (Date.now() - lastWheelTime < 200) return;
    app.navigateColorPages(delta > 0);
    renderColorPickerContent(); 
    lastWheelTime = Date.now();
}

let app;
let brushPicker;
let colorPickerReturnFocus;

// --- Internal Helper Functions ---

let saveStatusTimer;
let saveModalCloseTimer;
function closeRecipeResetPrompt() {
    if (app.dom.saveResetConfirmation.open) app.dom.saveResetConfirmation.close();
    app.dom.btnResetLogger.hidden = false;
    app.dom.btnResetLogger.setAttribute('aria-expanded', 'false');
}
function clearSaveStatus() {
    clearTimeout(saveModalCloseTimer);
    app.dom.saveModal.classList.remove('save-modal-closing');
    closeRecipeResetPrompt();
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

function closeModalSlowly(onClosed = () => {}) {
    clearSaveStatus();
    if (!app.dom.saveModal.classList.contains('modal-visible') || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        closeModal();
        onClosed();
        return;
    }
    app.dom.saveModal.classList.add('save-modal-closing');
    app.dom.saveModal.classList.remove('modal-visible');
    saveModalCloseTimer = setTimeout(() => {
        closeModal();
        onClosed();
    }, 900);
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
    colorPickerReturnFocus?.focus({ preventScroll: true });
}

function closeHelpModal() {
    app.dom.helpModal.classList.remove('modal-visible');
    app.resetWasLongPress(); // <-- תוספת תיקון הבאג
}

let paletteHoldOpeningClick = false;

function closePaletteModal() {
    paletteHoldOpeningClick = false;
    app.dom.paletteModal.classList.remove('modal-visible');
    app.dom.btnPalette.focus({ preventScroll: true });
    app.resetWasLongPress(); // <-- תוספת תיקון הבאג
}



function closeGolSettingsModal() {
    golCycleMembership = null;
    app.dom.btnGolSettingsSave.disabled = false;
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
    let tempChiReachOffset = 0;
    let tempChiReachPercent = 100;
let chiCycleMembership = null;
let golCycleMembership = null;

const CHI_PRESETS = CHI_FLOW_PRESETS;

function setChiReachDraft(rules) {
    tempChiReach = rules.reach;
    tempChiReachOffset = Number.isInteger(rules.reachOffset) ? rules.reachOffset : rules.reach === 0 ? 0 : null;
    tempChiReachPercent = CHI_REACH_PERCENTAGES.includes(rules.reachPercent) ? rules.reachPercent :
        Number.isInteger(rules.reachOffset) || rules.reach !== 0 ? null : 100;
    updateChiReachDisplay();
}

function updateChiReachDisplay() {
    const paletteSize = app.C.PALETTES[app.getActivePaletteIndex()].colors.length;
    const percent = tempChiReachPercent;
    const auto = app.getText('chi_reach_auto');
    const label = percent !== null ? (percent === 100 ? auto : `×${percent / 100}`) :
        tempChiReachOffset === null ? `${app.getText('chi_reach_fixed')}: ${tempChiReach}` :
        tempChiReachOffset === 0 ? auto : `${auto} ${tempChiReachOffset > 0 ? '+' : '−'}${Math.abs(tempChiReachOffset)}`;
    // Old fixed/offset settings remain untouched until the user moves the slider.
    const displayedPercent = percent ?? resolveChiReach(readChiCycleRules(), paletteSize) / getAutoChiReach(paletteSize) * 100;
    const nearest = CHI_REACH_SLIDER_PERCENTAGES.reduce((best, value, index) =>
        Math.abs(value - displayedPercent) < Math.abs(CHI_REACH_SLIDER_PERCENTAGES[best] - displayedPercent) ? index : best, 0);
    app.dom.chiReachSlider.value = nearest;
    document.getElementById('chiReachAutoTick').textContent = auto;
    app.dom.chiReachValue.textContent = label;
    app.dom.chiReachSlider.setAttribute('aria-valuetext', label);
    app.dom.chiReachDesc.textContent = app.getText(percent === null ? 'chi_reach_legacy_note' : 'chi_reach_desc');
}


function refreshLocalizedModalText() {
    document.querySelectorAll('.modal-dismiss').forEach(button => button.setAttribute('aria-label', app.getText('saveModal_close')));
    if (!app.dom.chiFlowSettingsModal.classList.contains('hidden')) updateChiReachDisplay();
    app.dom.chiFlowModalClose.setAttribute('aria-label', app.getText('saveModal_close'));
    updateStartupPalettePreview();
    app.dom.btnPaletteModalClose.setAttribute('aria-label', app.getText('saveModal_close'));
    if (app.dom.paletteModal.classList.contains('modal-visible')) populatePaletteModal();
    document.getElementById('btnStartupPaletteClose').setAttribute('aria-label', app.getText('saveModal_close'));
    const picker = document.getElementById('startupPaletteDialog');
    if (picker.open) {
        picker.dir = app.getCurrentLang() === 'he' ? 'rtl' : 'ltr';
        populateStartupPalettePicker();
    }
    chiCycleMembership?.refresh();
    golCycleMembership?.refresh();
    app.refreshProfiles();
}

function closeChiFlowSettingsModal() {
        chiCycleMembership = null;
        app.dom.btnChiSettingsSave.disabled = false;
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
                chiCycleMembership?.manualChange();
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
                tempChiReach === rules.reach &&
                (tempChiReachPercent === (rules.reachPercent ?? 100) && rules.reach === 0 && !Number.isInteger(rules.reachOffset) ||
                 tempChiReachPercent === null && !Number.isInteger(rules.reachPercent) && (tempChiReachOffset ?? null) === (rules.reachOffset ?? (rules.reach === 0 ? 0 : null)))) {
                activeId = 'btnChiPreset' + presetName;
                break;
            }
        }
        updateChiPresetButtons(activeId);
        chiCycleMembership?.refresh();
    }


    function applyChiPreset(presetName, btnElement) {
        const p = CHI_PRESETS[presetName];
        if (!p) return;
        tempChiAwakening = [...p.awakening];
        tempChiFlow = [...p.flow];
        setChiReachDraft(p);

        renderChiFlowChips(app.dom.chiAwakeningChipsContainer, tempChiAwakening, 8);
        renderChiFlowChips(app.dom.chiFlowChipsContainer, tempChiFlow, 8);

        updateChiPresetButtons(btnElement ? btnElement.id : '');
        chiCycleMembership?.selectPreset(presetName, p);
    }

    function readChiCycleRules() {
        return { awakening: [...tempChiAwakening], flow: [...tempChiFlow], reach: tempChiReachPercent !== null ? 0 : tempChiReach,
            ...(tempChiReachPercent !== null ? { reachPercent: tempChiReachPercent } :
                tempChiReachOffset === null ? {} : { reachOffset: tempChiReachOffset }) };
    }

    function writeChiCycleRules(rules) {
        tempChiAwakening = [...rules.awakening];
        tempChiFlow = [...rules.flow];
        setChiReachDraft(rules);
        renderChiFlowChips(app.dom.chiAwakeningChipsContainer, tempChiAwakening, 8);
        renderChiFlowChips(app.dom.chiFlowChipsContainer, tempChiFlow, 8);
        updateActiveChiPresetButton();
    }

    function saveChiFlowSettings() {
        if (chiCycleMembership.commit()) closeChiFlowSettingsModal();
    }

    function openChiFlowSettingsModal() {
        const currentRules = app.getChiFlowRules();
        tempChiAwakening = [...currentRules.awakening];
        tempChiFlow = [...currentRules.flow];
        setChiReachDraft(currentRules);

        renderChiFlowChips(app.dom.chiAwakeningChipsContainer, tempChiAwakening, 8);
        renderChiFlowChips(app.dom.chiFlowChipsContainer, tempChiFlow, 8);
        

        // טעינת הטקסטים לפי השפה הנוכחית
        app.dom.chiFlowModalTitle.textContent = app.getText('chi_modal_title');
        app.dom.chiAwakeningLabel.textContent = app.getText('chi_awakening_label');
        app.dom.chiAwakeningDesc.textContent = app.getText('chi_awakening_desc');
        app.dom.chiFlowLabel.textContent = app.getText('chi_flow_label');
        app.dom.chiFlowDesc.textContent = app.getText('chi_flow_desc');
        app.dom.chiReachLabel.textContent = app.getText('chi_reach_label');
        updateChiReachDisplay();
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

updateActiveChiPresetButton();
        const defaultChiCycle = app.getDefaultChiFlowCycle();
        chiCycleMembership = bindPresetCycleEditor({
            toolbar: document.getElementById('chiCycleToolbar'),
            defaults: defaultChiCycle.slots, defaultSources: defaultChiCycle.sources,
            iconButton: app.dom.btnSandpile,
            presets: Object.entries(CHI_PRESETS).map(([name, rules]) => ({ button: document.getElementById('btnChiPreset' + name), rules, source: name })),
            state: app.getChiFlowCycle(), readRules: readChiCycleRules, writeRules: writeChiCycleRules,
            save: app.setChiFlowCycle, saveButton: app.dom.btnChiSettingsSave, getText: app.getText
        });
        app.dom.chiFlowSettingsModal.classList.remove('hidden');
        refreshLocalizedModalText();
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

function refreshResizeSteps() {
    const value = Number(app.dom.resizeInput.value);
    document.getElementById('btnResizeValueDown').disabled = app.dom.resizeInput.value !== '' && value <= 1;
    document.getElementById('btnResizeValueUp').disabled = app.dom.resizeInput.value !== '' && value >= 327;
}

function openResizeModal() {
    if (app.isBreathing()) return;
    app.dom.resizeInput.value = app.getN();
    refreshResizeSteps();
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
    if (isNaN(newSize) || newSize < 1 || newSize > 327) {
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

function selectColor(color) {
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
    renderColorPickerContent();
    app.dom.colorPickerSwatches.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
}

function selectRainbow() {
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
    renderColorPickerContent();
    app.dom.colorPickerSwatches.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
}

function renderColorPickerContent() {
    const currentPalette = app.C.PALETTES[app.getActivePaletteIndex()];
    const colors = currentPalette.colors;
    const totalPages = Math.ceil(colors.length / app.C.COLORS_PER_PAGE);
    const selectedColorIndex = app.getSelectedColorIndex();
    const rainbowSelected = app.isRainbowModeActive();

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

    const rainbowSwatch = document.createElement('button');
    rainbowSwatch.type = 'button';
    rainbowSwatch.setAttribute('aria-pressed', String(rainbowSelected));
    rainbowSwatch.className = 'color-swatch' + (rainbowSelected ? ' is-selected' : '');
    if (rainbowSelected) rainbowSwatch.setAttribute('aria-current', 'true');
    const rainbowSwatchInner = document.createElement('div');
    rainbowSwatchInner.className = 'color-swatch-inner';
    rainbowSwatchInner.innerHTML = app.createRainbowIconSVG();
    rainbowSwatch.appendChild(rainbowSwatchInner);
    rainbowSwatch.setAttribute('aria-label', app.getText('colorPicker_rainbow'));
    rainbowSwatch.addEventListener('click', () => selectRainbow());
    frag.appendChild(rainbowSwatch);

    const startIndex = currentPage * app.C.COLORS_PER_PAGE;
    const endIndex = startIndex + app.C.COLORS_PER_PAGE;
    const pageColors = colors.slice(startIndex, endIndex);

    pageColors.forEach((color, index) => {
        const selected = !rainbowSelected && startIndex + index === selectedColorIndex;
        const swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.setAttribute('aria-pressed', String(selected));
        swatch.className = 'color-swatch' + (selected ? ' is-selected' : '');
        if (selected) swatch.setAttribute('aria-current', 'true');
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
        swatch.addEventListener('click', () => selectColor(color));
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
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.setAttribute('aria-label', app.getText('brush_color_page').replace('{n}', i + 1));
            dot.setAttribute('aria-pressed', String(i === currentPage));
            dot.className = 'pagination-dot' + (i === currentPage ? ' active' : '');
            dot.dataset.page = i;
            dot.addEventListener('click', (e) => {
                app.setColorPickerPage(parseInt(e.target.dataset.page, 10));
                renderColorPickerContent();
            });
            app.dom.colorPickerPagination.appendChild(dot);
        }
    }
    brushPicker?.refresh();
}

function openColorPickerModal(targetTileIndex = null) {
    if (app.isBreathing()) return;
    if (!app.dom.colorPickerModal.classList.contains('modal-visible')) colorPickerReturnFocus = document.activeElement;
    app.pointerState.longPressTarget = targetTileIndex;
    const selectedColorIndex = app.getSelectedColorIndex();
    app.setColorPickerPage(!app.isRainbowModeActive() && selectedColorIndex >= 0
        ? Math.floor(selectedColorIndex / app.C.COLORS_PER_PAGE) : 0);
    renderColorPickerContent();
    app.dom.colorPickerModal.classList.add('modal-visible');
    document.getElementById('btnColorPickerCloseTop').focus({ preventScroll: true });
}

function openHelpModal() {
    activeHelpTab = app.isSimulationMode() ? 'evolution' : 'creation';
    populateHelpModal();
    app.dom.helpModal.classList.add('modal-visible');
}

function openPaletteModal({ guardOpeningClick = false } = {}) {
    if (app.isBreathing()) return;
    paletteHoldOpeningClick = guardOpeningClick;
    populatePaletteModal();
    app.dom.paletteModal.classList.add('modal-visible');
    app.dom.paletteModalGrid.querySelector('[aria-selected="true"]')?.focus({ preventScroll: true });
}





function populatePaletteModal() {
    renderPalettePicker(app.dom.paletteModalGrid, {
        palettes: app.C.PALETTES,
        groups: app.C.PALETTE_GROUPS,
        selectedIndex: app.getActivePaletteIndex(),
        getText: app.getText,
        rtl: app.getCurrentLang() === 'he',
        onSelect(index) {
            app.switchToPalette(index);
            closePaletteModal();
        }
    });
}

function updateStartupPalettePreview() {
    const value = document.getElementById('startupPalette').value;
    const icon = document.getElementById('startupPaletteIcon');
    const name = document.getElementById('startupPaletteName');
    if (value === RANDOM_STARTUP_PALETTE) {
        icon.textContent = '✧';
        name.textContent = app.getText('startup_palette_random');
        return;
    }
    const palette = app.C.PALETTES.find(p => p.originalName === value);
    if (!palette) return;
    if (palette.iconHTML) icon.innerHTML = palette.iconHTML;
    else icon.textContent = palette.emoji;
    name.textContent = getPaletteDisplayName(palette);
}

function selectStartupPalette(value) {
    const field = document.getElementById('startupPalette');
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    updateStartupPalettePreview();
    document.getElementById('startupPaletteDialog').close();
}

function populateStartupPalettePicker() {
    const value = document.getElementById('startupPalette').value;
    const selectedIndex = app.C.PALETTES.findIndex(p => p.originalName === value);
    document.getElementById('btnStartupPaletteRandom').setAttribute('aria-pressed', String(value === RANDOM_STARTUP_PALETTE));
    renderPalettePicker(document.getElementById('startupPaletteGrid'), {
        palettes: app.C.PALETTES,
        groups: app.C.PALETTE_GROUPS.filter(group => group.id !== 'archive').map(group => ({
            ...group, indexes: group.indexes.filter(index => !app.C.PALETTES[index].isArchived)
        })),
        selectedIndex,
        getText: key => app.getText(key === 'palette_current' ? 'startup_palette_picker_title' : key),
        rtl: app.getCurrentLang() === 'he',
        idPrefix: 'startup',
        onSelect: index => selectStartupPalette(app.C.PALETTES[index].originalName)
    });
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

    const evolutionIntro = document.createElement('section');
    evolutionIntro.setAttribute('aria-labelledby', 'help-evolution-how-title');
    const introTitle = document.createElement('h3');
    introTitle.id = 'help-evolution-how-title';
    introTitle.className = 'help-category-title';
    introTitle.textContent = app.getText('help_how_it_works');
    const introSteps = document.createElement('ol');
    introSteps.className = 'space-y-2 text-sm text-gray-300';
    introSteps.style.listStyleType = 'decimal';
    introSteps.style.paddingInlineStart = '20px';
    ['help_evolution_choose', 'help_evolution_advance', 'help_evolution_explore'].forEach(key => {
        const step = document.createElement('li');
        step.textContent = app.getText(key);
        introSteps.appendChild(step);
    });
    const settingsHint = document.createElement('p');
    settingsHint.className = 'text-xs text-gray-400 mt-3';
    settingsHint.textContent = app.getText('help_evolution_settings_hint');
    evolutionIntro.append(introTitle, introSteps, settingsHint);
    bodies.evolution.appendChild(evolutionIntro);

    const categories = {
        inspiration: { tab: 'creation', titleKey: 'help_category_inspiration', buttons: ['btnPalette', 'btnRandom', 'btnInvert', 'btnSpecialReset'] },
        order: { tab: 'creation', titleKey: 'help_category_order', buttons: ['btnCycleSort', 'btnResizeUp', 'btnResizeDown', 'btnGap', 'btnDark'] },
        touch: { tab: 'creation', titleKey: 'help_category_touch', buttons: ['btnBrushMode', 'btnSymmetry', 'btnColorPicker'] },
        controls: { tab: 'evolution', titleKey: 'help_category_controls', buttons: ['btnToggleSimMode', 'btnPlayPauseLife', 'btnStepForward'] },
        evolution: { tab: 'evolution', titleKey: 'help_category_evolution_modes', buttons: ['btnIslands', 'btnShowBreatheMenu', 'btnGameOfLife', 'btnBrightnessEvo', 'btnGravitationalSort', 'btnSpiral', 'btnMagnetModes', 'btnContour', 'btnSandpile', 'btnTuring', 'btnErosion', 'btnDla', 'btnNudgeBrighter', 'btnNudgeDarker'] },
        advanced: { tab: 'tools', titleKey: 'help_category_advanced', buttons: ['btnOpenDebug'] },
        tools: { tab: 'tools', titleKey: 'help_category_tools', buttons: ['btnUndo', 'btnRedo', 'btnSave', 'btnMacroPlay', 'btnResetBoard'] }
    };

    const helpData = {
        btnCycleSort: app.getText('help_sort'), btnSpiral: app.getText('help_spiral'), btnMagnetModes: app.getText('help_magnet'),
        btnContour: app.getText('help_contour'), btnSandpile: app.getText('help_sandpile'), btnTuring: app.getText('help_turing'),
        btnNudgeBrighter: app.getText('help_nudge_forward'), btnNudgeDarker: app.getText('help_nudge_backward'),
        btnStepForward: app.getText('help_step'), btnIslands: app.getText('help_islands'),
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

    for (const [tab, tips] of [['creation', ['help_tip3', 'help_tip4', 'help_tip5', 'help_tip6']], ['evolution', ['help_tip1']]]) {
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

const PRESET_RULES = GAME_OF_LIFE_PRESETS;

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
  golCycleMembership?.refresh();
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
    if (app.isBreathing()) return;
    
    // --- START: MODIFICATION ---
    // במקום להגדיר טקסט, נפעיל את הפונקציה שמעדכנת את הכפתורים
    const rules = app.getGameOfLifeRules();
    applyGolPreset(rules.survival, rules.birth);
updateActivePresetButton();
    // --- END: MODIFICATION ---
    
    golCycleMembership = bindPresetCycleEditor({
        toolbar: document.getElementById('golCycleToolbar'),
        defaults: [app.C.defaultGameOfLifeRules, PRESET_RULES.btnGolPresetShuffle, PRESET_RULES.btnGolPresetCoral], defaultSources: ['btnGolPresetPaint', 'btnGolPresetShuffle', 'btnGolPresetCoral'],
        iconButton: app.dom.btnGameOfLife,
        presets: Object.entries(PRESET_RULES).map(([id, rules]) => ({ button: document.getElementById(id), rules })),
        state: app.getGameOfLifeCycle(), readRules: readGolCycleRules,
        writeRules: rules => applyGolPreset(rules.survival, rules.birth),
        save: app.setGameOfLifeCycle, saveButton: app.dom.btnGolSettingsSave, getText: app.getText
    });
    app.dom.gameOfLifeSettingsModal.style.display = 'flex';
    setTimeout(() => app.dom.gameOfLifeSettingsModal.classList.add('modal-visible'), 10);
}


// --- START: MODIFICATION ---
// הסרת פונקציית הוולידציה הישנה, אין בה צורך יותר
// function validateRuleString(ruleString) { ... }
// --- END: MODIFICATION ---


function readGolCycleRules() {
    const values = container => [...container.querySelectorAll('.gol-chip-btn.active')].map(chip => parseInt(chip.dataset.number, 10));
    return { survival: values(app.dom.golSurvivalChipsContainer), birth: values(app.dom.golBirthChipsContainer) };
}

function saveGolSettings() {
    if (golCycleMembership.commit()) closeGolSettingsModal();
}

function resetGolSettings() {
    applyGolPreset(app.C.defaultGameOfLifeRules.survival, app.C.defaultGameOfLifeRules.birth);
    golCycleMembership?.manualChange();
}

function openGravitationalSortSettingsModal() {
    if (app.isBreathing()) return;
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
    if (app.isBreathing()) return;

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
    app.dom.btnContourSettingsReset.textContent = app.getText('evolution_reset_default');
    app.dom.btnContourSettingsSave.textContent = app.getText('gs_modal_save_close'); // Re-use "Save & Close"

    // 2. Get current rules and set UI elements
    populateContourSettings(app.getContourRules());

    // 3. Show the modal
    app.dom.contourSettingsModal.style.display = 'flex';
    setTimeout(() => app.dom.contourSettingsModal.classList.add('modal-visible'), 10);
}

function populateContourSettings(rules) {
    app.dom.contourSensitivitySlider.value = rules.sensitivity;
    app.dom.contourSensitivityValue.textContent = `${rules.sensitivity}%`; // Set initial text value
    
    app.dom.btnContourColorDark.classList.toggle('active', rules.lineColor === 'darkest');
    app.dom.btnContourColorLight.classList.toggle('active', rules.lineColor === 'lightest');

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
    brushPicker = initializeBrushPicker(app);
    const openSeparatorCycleModal = initializeSeparatorCycleModal(app);
    const openErosionSettingsModal = initializeErosionModal(app);
    const evolutionTuningModals = initializeEvolutionTuningModals(app);
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
    const modalDismissActions = {
        btnTechnicianCloseTop: () => app.dom.technicianDialog.close(),
        btnSortCycleCloseTop: () => document.getElementById('sortCycleDialog').close(),
        btnNudgeCloseTop: () => document.getElementById('nudgeSettingsDialog').close(),
        btnRecipeResetCloseTop: () => app.dom.btnCancelResetLogger.click(),
        btnColorPickerCloseTop: closeColorPickerModal,
        btnGolCloseTop: closeGolSettingsModal,
        btnSpiralCloseTop: closeSpiralSettingsModal,
        btnGravityCloseTop: closeGravitationalSortSettingsModal
    };
    Object.entries(modalDismissActions).forEach(([id, close]) => {
        document.getElementById(id).addEventListener('click', close);
    });

    app.dom.btnModalClose.addEventListener('click', closeModal);
    app.dom.saveModal.addEventListener('click', (e) => { if (e.target === app.dom.saveModal) { closeModal(); } });
    const imageOptions = document.getElementById('saveImageOptions');
    app.dom.saveModal.addEventListener('click', e => {
        if (!imageOptions.contains(e.target)) imageOptions.open = false;
    });
    app.dom.saveModal.addEventListener('keydown', e => {
        if (e.key === 'Escape' && imageOptions.open) {
            e.preventDefault(); e.stopPropagation();
            imageOptions.open = false;
            imageOptions.querySelector('summary').focus();
        }
    });
    app.dom.btnSaveImage.addEventListener('click', () => app.downloadImage());
    document.getElementById('btnSaveSettings').addEventListener('click', app.handleSaveSettings);
    app.dom.btnSaveProjectIdea.addEventListener('click', app.handleSaveProject);
    app.dom.btnLoadProjectIdea.addEventListener('click', app.handleLoadProject);
    app.dom.btnResetLogger.addEventListener('click', () => {
        clearSaveStatus();
        app.dom.btnResetLogger.setAttribute('aria-expanded', 'true');
        app.dom.saveResetConfirmation.showModal();
        app.dom.btnCancelResetLogger.focus();
    });
    app.dom.btnCancelResetLogger.addEventListener('click', () => {
        closeRecipeResetPrompt();
        app.dom.btnResetLogger.focus();
    });
    app.dom.btnConfirmResetLogger.addEventListener('click', async () => {
        app.dom.btnConfirmResetLogger.disabled = true;
        try {
            await app.resetArtRecipeLog();
            app.dom.btnSave.focus();
        } finally {
            app.dom.btnConfirmResetLogger.disabled = false;
        }
    });
    app.dom.saveResetConfirmation.addEventListener('cancel', e => {
        e.preventDefault();
        closeRecipeResetPrompt();
        app.dom.btnResetLogger.focus();
    });
    app.dom.saveResetConfirmation.addEventListener('click', e => {
        if (e.target !== app.dom.saveResetConfirmation) return;
        const rect = app.dom.saveResetConfirmation.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
            closeRecipeResetPrompt();
            app.dom.btnResetLogger.focus();
        }
    });
    app.dom.btnSaveLogger.addEventListener('click', app.exportArtRecipeLog);
    app.dom.projectFileInput.addEventListener('change', app.onProjectFileSelected);

    // Resize Modal: these controls edit only the pending value, never the board.
    for (const [id, delta] of [['btnResizeValueDown', -1], ['btnResizeValueUp', 1]]) {
        document.getElementById(id).addEventListener('click', () => {
            const value = parseInt(app.dom.resizeInput.value, 10);
            app.dom.resizeInput.value = Math.max(1, Math.min(327, (Number.isFinite(value) ? value : app.getN()) + delta));
            app.dom.resizeInput.style.borderColor = '';
            refreshResizeSteps();
        });
    }
    app.dom.resizeInput.addEventListener('input', refreshResizeSteps);
    app.dom.btnConfirmResize.addEventListener('click', handleConfirmResize);
    app.dom.resizeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { handleConfirmResize(); } });
    app.dom.btnResizeModalClose.addEventListener('click', closeResizeModal);
    app.dom.resizeModal.addEventListener('click', (e) => { if (e.target === app.dom.resizeModal) { closeResizeModal(); } });

    // Color Picker Modal
    app.dom.colorPickerModal.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); closeColorPickerModal(); }
        if (event.key === 'Tab') {
            const buttons = [...app.dom.colorPickerModal.querySelectorAll('button')].filter(button => !button.disabled && button.getClientRects().length > 0);
            const first = buttons[0], last = buttons.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
    });
    app.dom.colorPickerModal.addEventListener('click', (e) => { if (e.target === app.dom.colorPickerModal) { closeColorPickerModal(); } });
    
    app.dom.btnNextPalette.addEventListener('click', () => {
        app.navigateColorPages(true);
        renderColorPickerContent();
    });
    app.dom.btnPrevPalette.addEventListener('click', () => {
        app.navigateColorPages(false);
        renderColorPickerContent();
    });
    
    app.dom.colorPickerSwatches.addEventListener('wheel', handlePaletteWheel, { passive: false });
    bindColorPageSwipe(app.dom.colorPickerSwatches, { onPage: forward => {
        if (app.C.PALETTES[app.getActivePaletteIndex()].colors.length <= app.C.COLORS_PER_PAGE) return;
        app.navigateColorPages(forward);
        renderColorPickerContent();
    } });

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
        initBrushValue.value = brushSizeLabel(settings.brushSize);
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
    const interfaceZoom = document.getElementById('interfaceZoom');
    const interfaceZoomValue = document.getElementById('interfaceZoomValue');
    interfaceZoom.value = app.getInterfaceZoom();
    interfaceZoomValue.value = interfaceZoom.value + '%';
    interfaceZoom.addEventListener('input', () => {
        interfaceZoomValue.value = interfaceZoom.value + '%';
        app.setInterfaceZoom(Number(interfaceZoom.value));
    });
    let technicianReturnFocus = app.dom.btnOpenDebug;
    const softBloomToggle = document.getElementById('softBloomToggle');
    const bloomIntensity = document.getElementById('softBloomIntensity');
    const bloomIntensityValue = document.getElementById('softBloomIntensityValue');
    function refreshBloomControls() {
        softBloomToggle.checked = app.getSoftBloom();
        bloomIntensity.disabled = !app.getSoftBloom();
        bloomIntensity.value = app.getSoftBloomIntensity();
        bloomIntensityValue.value = bloomIntensity.value + '%';
    }
    softBloomToggle.addEventListener('change', () => {
        app.setSoftBloom(softBloomToggle.checked);
        refreshBloomControls();
    });
    bloomIntensity.addEventListener('input', () => {
        bloomIntensityValue.value = bloomIntensity.value + '%';
        app.previewSoftBloomIntensity(Number(bloomIntensity.value));
    });
    bloomIntensity.addEventListener('change', () => app.setSoftBloomIntensity(Number(bloomIntensity.value)));
    const brushMotionToggle = document.getElementById('brushMotionRecordingToggle');
    brushMotionToggle.checked = app.getBrushMotionRecording();
    brushMotionToggle.addEventListener('change', () => app.setBrushMotionRecording(brushMotionToggle.checked));
    const smoothRenderingToggle = document.getElementById('smoothRenderingToggle');
    const smoothOption = smoothRenderingToggle.closest('label');
    const smoothNotice = document.getElementById('smoothUnavailableDialog');
    function refreshSmoothControl() {
        smoothRenderingToggle.checked = app.getSmoothRendering();
        const unavailable = !app.isSmoothDisplayAvailable();
        smoothRenderingToggle.setAttribute('aria-disabled', String(unavailable));
        smoothOption.classList.toggle('smooth-unavailable', unavailable);
    }
    smoothOption.addEventListener('click', event => {
        if (app.isSmoothDisplayAvailable()) return;
        event.preventDefault();
        document.getElementById('smoothUnavailablePrompt').textContent = app.getText('smooth_unavailable');
        if (!smoothNotice.open) smoothNotice.showModal();
    });
    smoothRenderingToggle.addEventListener('change', () => {
        if (app.isSmoothDisplayAvailable()) app.setSmoothRendering(smoothRenderingToggle.checked);
        refreshSmoothControl();
    });
    document.getElementById('btnSmoothUnavailableClose').addEventListener('click', () => smoothNotice.close());
    smoothNotice.addEventListener('click', event => {
        if (event.target !== smoothNotice) return;
        const box = smoothNotice.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) smoothNotice.close();
    });
    smoothNotice.addEventListener('close', () => {
        if (app.dom.technicianDialog.open) smoothRenderingToggle.focus({ preventScroll: true });
    });
    function openTechnicianMenu(trigger = app.dom.btnOpenDebug) {
        technicianReturnFocus = trigger;
        app.refreshProfiles();
        hideWorkspaceResetConfirmation();
        workspaceResetStatus.textContent = '';
        delete workspaceResetStatus.dataset.debugText;
        brushMotionToggle.checked = app.getBrushMotionRecording();
        refreshSmoothControl();
        refreshBloomControls();
        fillInitForm(app.getSimulationInit());
        fillStartupForm(app.getStartupSettings());
        startupForm.hidden = true;
        startupToggle.setAttribute('aria-expanded', 'false');
        initForm.hidden = true;
        initToggle.setAttribute('aria-expanded', 'false');
        app.dom.technicianDialog.showModal();
        document.getElementById('technicianSettingsScroll').scrollTop = 0;
        document.getElementById('btnTechnicianCloseTop').focus({ preventScroll: true });
    }
    app.dom.btnOpenDebug.addEventListener('click', () => openTechnicianMenu());
    initToggle.addEventListener('click', () => {
        startupForm.hidden = true;
        startupToggle.setAttribute('aria-expanded', 'false');
        initForm.hidden = !initForm.hidden;
        initToggle.setAttribute('aria-expanded', String(!initForm.hidden));
    });
    initBrush.addEventListener('input', () => {
        initBrushValue.value = brushSizeLabel(Number(initBrush.value));
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
            ...app.getSimulationInit(), boardSize: Number(initBoard.value), brushSize: Number(initBrush.value)
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
    const startupPaletteDialog = document.getElementById('startupPaletteDialog');
    const startupPaletteTrigger = document.getElementById('btnStartupPalette');
    startupPaletteTrigger.addEventListener('click', () => {
        populateStartupPalettePicker();
        startupPaletteDialog.dir = app.getCurrentLang() === 'he' ? 'rtl' : 'ltr';
        startupPaletteDialog.showModal();
        const selected = document.getElementById('startupPalette').value === RANDOM_STARTUP_PALETTE
            ? document.getElementById('btnStartupPaletteRandom')
            : startupPaletteDialog.querySelector('[aria-selected="true"]');
        selected?.focus({ preventScroll: true });
    });
    document.getElementById('btnStartupPaletteRandom').addEventListener('click', () => selectStartupPalette(RANDOM_STARTUP_PALETTE));
    document.getElementById('btnStartupPaletteClose').addEventListener('click', () => startupPaletteDialog.close());
    startupPaletteDialog.addEventListener('close', () => startupPaletteTrigger.focus());
    startupPaletteDialog.addEventListener('click', event => {
        if (event.target !== startupPaletteDialog) return;
        const bounds = startupPaletteDialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) startupPaletteDialog.close();
    });
    addStartupOptions('startupBoardSize', app.C.SIZES.slice().sort((a, b) => a - b).map(n => [n, `${n} × ${n}`]));
    addStartupOptions('startupSeparator', RELATIVE_SEPARATOR_LEVELS.map(level =>
        [level, '', { 5: 'startup_separator_large', 3: 'separator_medium', 1: 'startup_separator_small', 0: 'startup_separator_off' }[level]]));
    addStartupOptions('startupSort', app.SORT_MODES.map(mode => [mode.method, '', 'startup_sort_' + mode.method]));
    addStartupOptions('startupFill', ['random', 'dark', 'light', 'seed'].map(value => [value, '', 'startup_fill_' + value]));
    addStartupOptions('startupBrushMode', ['paint', 'continuous', 'copy'].map(value => [value, '', 'brushMode_' + value]));
    addStartupOptions('startupBrushColor', ['none', 'first', 'darkest', 'lightest', 'rainbow'].map(value => [value, '', 'startup_color_' + value]));
    addStartupOptions('startupSymmetry', app.C.SYMMETRY_MODES.map(value => [value, '', 'symmetry_' + value]));
    addStartupOptions('startupInterface', ['creative', 'simulation'].map(value => [value, '', 'startup_mode_' + value]));
    function fillStartupForm(settings) {
        document.getElementById('startupProfile').value = app.getStartupProfile();
        Object.entries(startupFields).forEach(([key, id]) => { document.getElementById(id).value = key === 'separatorPx' ? relativeSeparatorLevel(settings[key]) : settings[key]; });
        document.getElementById('startupBrushValue').value = brushSizeLabel(settings.brushSize);
        updateStartupPalettePreview();
        startupStatus.textContent = '';
    }
    startupToggle.addEventListener('click', () => {
        initForm.hidden = true;
        initToggle.setAttribute('aria-expanded', 'false');
        startupForm.hidden = !startupForm.hidden;
        startupToggle.setAttribute('aria-expanded', String(!startupForm.hidden));
        if (!startupForm.hidden) document.getElementById('btnStartupPalette').focus();
    });
    startupForm.addEventListener('input', () => {
        document.getElementById('startupBrushValue').value = brushSizeLabel(Number(document.getElementById('startupBrushSize').value));
        startupStatus.textContent = '';
    });
    document.getElementById('btnResetStartup').addEventListener('click', () => {
        fillStartupForm(app.getDefaultStartupSettings());
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
        const profilePersisted = app.saveStartupProfile(Number(document.getElementById('startupProfile').value));
        startupStatus.textContent = app.getText(persisted && profilePersisted ? 'startup_saved' : 'startup_saved_session');
    });
    const resetWorkspaceButton = document.getElementById('btnResetWorkspace');
    const resetWorkspaceConfirmation = document.getElementById('workspaceResetConfirmation');
    const workspaceResetStatus = document.getElementById('workspaceResetStatus');
    const confirmWorkspaceReset = document.getElementById('btnConfirmWorkspaceReset');
    function hideWorkspaceResetConfirmation() {
        if (resetWorkspaceConfirmation.open) resetWorkspaceConfirmation.close();
        resetWorkspaceButton.setAttribute('aria-expanded', 'false');
    }
    resetWorkspaceButton.addEventListener('click', () => {
        resetWorkspaceConfirmation.showModal();
        resetWorkspaceButton.setAttribute('aria-expanded', 'true');
        document.getElementById('btnCancelWorkspaceReset').focus();
        workspaceResetStatus.textContent = '';
        delete workspaceResetStatus.dataset.debugText;
    });
    document.getElementById('btnCancelWorkspaceReset').addEventListener('click', () => {
        hideWorkspaceResetConfirmation();
        resetWorkspaceButton.focus();
    });
    document.getElementById('btnWorkspaceResetCloseTop').addEventListener('click', hideWorkspaceResetConfirmation);
    resetWorkspaceConfirmation.addEventListener('cancel', event => {
        event.preventDefault();
        hideWorkspaceResetConfirmation();
    });
    resetWorkspaceConfirmation.addEventListener('click', event => {
        if (event.target !== resetWorkspaceConfirmation) return;
        const box = resetWorkspaceConfirmation.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) hideWorkspaceResetConfirmation();
    });
    resetWorkspaceConfirmation.addEventListener('close', () => {
        resetWorkspaceButton.setAttribute('aria-expanded', 'false');
        if (app.dom.technicianDialog.open) resetWorkspaceButton.focus();
    });
    confirmWorkspaceReset.addEventListener('click', () => {
        confirmWorkspaceReset.disabled = true;
        try {
            const persisted = app.resetWorkspaceSettings();
            fillInitForm(app.getSimulationInit());
            fillStartupForm(app.getStartupSettings());
            refreshSmoothControl();
            refreshBloomControls();
            hideWorkspaceResetConfirmation();
            const key = persisted ? 'workspace_reset_done' : 'workspace_reset_session';
            workspaceResetStatus.dataset.debugText = key;
            workspaceResetStatus.textContent = app.getText(key);
            resetWorkspaceButton.classList.remove('reset-complete');
            requestAnimationFrame(() => resetWorkspaceButton.classList.add('reset-complete'));
            resetWorkspaceButton.focus();
        } catch (error) {
            hideWorkspaceResetConfirmation();
            workspaceResetStatus.dataset.debugText = 'workspace_reset_error';
            workspaceResetStatus.textContent = app.getText('workspace_reset_error');
        } finally { confirmWorkspaceReset.disabled = false; }
    });
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
        hideWorkspaceResetConfirmation();
        app.resetWasLongPress();
        technicianReturnFocus.focus();
    });

    // Help Modal
    app.dom.btnHelpModalClose.addEventListener('click', closeHelpModal);
    app.dom.helpModal.addEventListener('click', (e) => { if (e.target === app.dom.helpModal) { closeHelpModal(); } });

    // A held touch can synthesize a click on the newly opened picker. A new
    // pointerdown is a deliberate interaction; the opening release is not.
    app.dom.paletteModal.addEventListener('pointerdown', () => { paletteHoldOpeningClick = false; });
    app.dom.paletteModal.addEventListener('click', event => {
        const openingRelease = paletteHoldOpeningClick && event.detail !== 0;
        paletteHoldOpeningClick = false;
        if (openingRelease) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);
    // Palette Modal
    app.dom.btnPaletteModalClose.addEventListener('click', closePaletteModal);
    app.dom.paletteModal.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); closePaletteModal(); }
        if (event.key === 'Tab') {
            const targets = [...app.dom.paletteModal.querySelectorAll('button, [tabindex="0"]')]
                .filter(node => node.tabIndex >= 0 && node.getClientRects().length);
            const first = targets[0], last = targets[targets.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault(); last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault(); first?.focus();
            }
        }
    });
    app.dom.paletteModal.addEventListener('click', (e) => { if (e.target === app.dom.paletteModal) { closePaletteModal(); } });





    // Game of Life Settings Modal
    app.dom.btnGolSettingsSave.addEventListener('click', saveGolSettings);
    app.dom.btnGolSettingsCancel.addEventListener('click', closeGolSettingsModal);
    app.dom.gameOfLifeSettingsModal.addEventListener('click', (e) => { if (e.target === app.dom.gameOfLifeSettingsModal) closeGolSettingsModal(); });
    app.dom.btnGolSettingsReset.addEventListener('click', resetGolSettings);



// --- START: MODIFICATION ---
// הוספת האזנה לכפתורי הצ'יפים החדשים
app.dom.gameOfLifeSettingsModal.querySelectorAll('.gol-chip-btn').forEach(chip => {
    chip.addEventListener('click', () => {
        chip.classList.toggle('active');
        updateActivePresetButton(); // בדוק מחדש אחרי לחיצה ידנית
        golCycleMembership?.manualChange();
    });
});

// עדכון כפתורי ההגדרות המוכנות (Presets) לשימוש בפונקציה החדשה
// הפכנו את האובייקט PRESET_RULES למקור האמת היחיד
for (const [buttonId, rules] of Object.entries(PRESET_RULES)) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.addEventListener('click', () => {
            applyGolPreset(rules.survival, rules.birth);
            golCycleMembership?.selectPreset(buttonId, rules);
        });
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
    app.dom.gravitationalSortSettingsModal.addEventListener('click', (e) => { if (e.target === app.dom.gravitationalSortSettingsModal) closeGravitationalSortSettingsModal(); });



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
    app.dom.btnContourSettingsReset.addEventListener('click', () => populateContourSettings(defaultContourRules));
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
    tempChiReach = 0;
    tempChiReachOffset = null;
    tempChiReachPercent = CHI_REACH_SLIDER_PERCENTAGES[Number(e.target.value)];
    updateChiReachDisplay();
    updateActiveChiPresetButton(); // <-- שינינו את שם הפונקציה כאן
    chiCycleMembership?.manualChange();
});


app.dom.btnChiSettingsReset.addEventListener('click', () => applyChiPreset('Nova', app.dom.btnChiPresetNova));
    app.dom.btnChiPresetTopography.addEventListener('click', (e) => applyChiPreset('Topography', e.currentTarget));
    app.dom.btnChiPresetWildfire.addEventListener('click', (e) => applyChiPreset('Wildfire', e.currentTarget));
    app.dom.btnChiPresetCrystals.addEventListener('click', (e) => applyChiPreset('Crystals', e.currentTarget));
    app.dom.btnChiPresetRipples.addEventListener('click', (e) => applyChiPreset('Ripples', e.currentTarget));
app.dom.btnChiPresetElectric.addEventListener('click', (e) => applyChiPreset('Electric', e.currentTarget));
    app.dom.btnChiPresetFluent.addEventListener('click', (e) => applyChiPreset('Fluent', e.currentTarget));
    app.dom.btnChiPresetHarmony.addEventListener('click', (e) => applyChiPreset('Harmony', e.currentTarget));
    app.dom.btnChiPresetNova.addEventListener('click', (e) => applyChiPreset('Nova', e.currentTarget));
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
    rootBtn.innerHTML = `${eclipseIcon} <span data-debug-text="magnet_root">${app.getText('magnet_root')}</span>`;
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
        refreshLocalizedModalText,
        refreshTechnicianSettings: () => {
            refreshSmoothControl();
            fillInitForm(app.getSimulationInit());
            fillStartupForm(app.getStartupSettings());
        },
        closeModalSlowly,
        showSaveStatus, clearSaveStatus,
        openTechnicianMenu,
        openSortCycleModal,
        openSeparatorCycleModal,
        openResizeModal,
        openNudgeSettingsModal,
        openErosionSettingsModal,
        ...evolutionTuningModals,
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
