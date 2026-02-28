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

function closeModal() {
    app.dom.saveModal.classList.remove('modal-visible');
    if (app.dom.imagePreview.src) { URL.revokeObjectURL(app.dom.imagePreview.src); }
    app.dom.imagePreview.src = '';
}

function closeResizeModal() {
    app.dom.resizeModal.classList.remove('modal-visible');
}

function closeColorPickerModal() {
    app.dom.colorPickerModal.classList.remove('modal-visible');
    app.pointerState.longPressTarget = null;
}

function closeHelpModal() {
    app.dom.helpModal.classList.remove('modal-visible');
}

function closePaletteModal() {
    app.dom.paletteModal.classList.remove('modal-visible');
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
        'Wildfire': { awakening: [1,2,3,4,5,6,7,8], flow: [2,3,4], reach: 0 },
        'Crystals': { awakening: [3,4,5,6,7,8], flow: [3,4,5,6,7,8], reach: 0 },
        'Ripples': { awakening: [3,4,5,6,7,8], flow: [2,4,5,6], reach: 0 },
        'Electric': { awakening: [3,4,5,6,7,8], flow: [1], reach: 0 },
        'Fluent': { awakening: [3,4,5,6], flow: [1,2,3,4,5], reach: 0 },
        'Harmony': { awakening: [3,4,5,6,7,8], flow: [3,5,7], reach: 0 }
    };


    function closeChiFlowSettingsModal() {
        app.dom.chiFlowSettingsModal.classList.add('hidden');
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
            app.dom.btnChiPresetHarmony
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

updateActiveChiPresetButton();        app.dom.chiFlowSettingsModal.classList.remove('hidden');
    }

    // --- END: Chi Flow Modal Logic ---

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
         app.animateBoardTransition(() => app.performAction(() => app._performResize(newSize)));
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
    populateHelpModal();
    app.dom.helpModal.classList.add('modal-visible');
}

function openPaletteModal() {
    if (app.isBreathing()) return;
    populatePaletteModal();
    app.dom.paletteModal.classList.add('modal-visible');
}

function populatePaletteModal() {
    app.dom.paletteModalGrid.innerHTML = '';
    const frag = document.createDocumentFragment();
    app.C.PALETTES.forEach((palette, index) => {
        const preview = document.createElement('div');
        preview.className = 'palette-preview';
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
        name.textContent = palette.name;

        preview.appendChild(iconContainer);
        preview.appendChild(name);
        frag.appendChild(preview);
    });
    app.dom.paletteModalGrid.appendChild(frag);
}

function populateHelpModal() {
    const contentDiv = document.getElementById('helpModalContent');
    contentDiv.innerHTML = '';

    const categories = {
        inspiration: { titleKey: 'help_category_inspiration', buttons: ['btnPalette', 'btnRandom', 'btnInvert', 'btnSpecialReset'] },
        order: { titleKey: 'help_category_order', buttons: ['btnResizeUp', 'btnResizeDown', 'btnGap', 'btnDark'] },
        touch: { titleKey: 'help_category_touch', buttons: ['btnBrushMode', 'btnSymmetry', 'btnColorPicker'] },
        evolution: { titleKey: 'help_category_evolution', buttons: ['btnToggleSimMode', 'btnShowBreatheMenu', 'btnGameOfLife', 'btnBrightnessEvo', 'btnGravitationalSort', 'btnErosion', 'btnDla', 'btnPlayPauseLife'] },
        tools: { titleKey: 'help_category_tools', buttons: ['btnUndo', 'btnRedo', 'btnSave', 'btnResetBoard'] }
    };

    const helpData = {
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
        const titleEl = document.createElement('h3');
        titleEl.className = 'help-category-title';
        titleEl.textContent = app.getText(category.titleKey);
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
    tipsTitle.textContent = app.getText('help_category_tips');
    contentDiv.appendChild(tipsTitle);

    const tipsContainer = document.createElement('div');
    tipsContainer.className = 'space-y-3 text-sm text-gray-300 pl-2';
    const tips = ['help_tip1', 'help_tip2', 'help_tip3', 'help_tip4', 'help_tip5', 'help_tip6'];
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

    const shortcutsTitle = document.createElement('h3');
    shortcutsTitle.className = 'help-category-title';
    shortcutsTitle.textContent = app.getText('help_category_shortcuts');
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
  'btnGolPresetYuval': { survival: [0, 1, 2, 3, 4, 5, 6, 7, 8], birth: [4, 6, 7, 8] }
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

    // Save Modal
    app.dom.btnModalClose.addEventListener('click', closeModal);
    app.dom.saveModal.addEventListener('click', (e) => { if (e.target === app.dom.saveModal) { closeModal(); } });
    app.dom.btnSaveImage.addEventListener('click', () => app.downloadImage());
    app.dom.btnSaveProjectIdea.addEventListener('click', app.handleSaveProject);
    app.dom.btnLoadProjectIdea.addEventListener('click', app.handleLoadProject);
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


    app.dom.btnChiSettingsReset.addEventListener('click', () => applyChiPreset('Topography', app.dom.btnChiPresetTopography));
    app.dom.btnChiPresetTopography.addEventListener('click', (e) => applyChiPreset('Topography', e.target));
    app.dom.btnChiPresetWildfire.addEventListener('click', (e) => applyChiPreset('Wildfire', e.target));
    app.dom.btnChiPresetCrystals.addEventListener('click', (e) => applyChiPreset('Crystals', e.target));
    app.dom.btnChiPresetRipples.addEventListener('click', (e) => applyChiPreset('Ripples', e.target));
app.dom.btnChiPresetElectric.addEventListener('click', (e) => applyChiPreset('Electric', e.target));
    app.dom.btnChiPresetFluent.addEventListener('click', (e) => applyChiPreset('Fluent', e.target));
    app.dom.btnChiPresetHarmony.addEventListener('click', (e) => applyChiPreset('Harmony', e.target));


// --- END: Added for Chi Flow Settings ---

    return {
        openResizeModal,
        openColorPickerModal,
        openHelpModal,
        openPaletteModal,
        openGolSettingsModal,
        openGravitationalSortSettingsModal,
        openAdvancedColorMappingModal, // Phase 1 Addition
        openContourSettingsModal, // <-- ADDED HERE
openChiFlowSettingsModal,
        closeModal,
        renderColorPickerContent,
        populateHelpModal,
        populatePaletteModal
    };
}