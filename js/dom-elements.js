// js/dom-elements.js
export const dom = {
  // Main Layout & Board
  appContainer: document.getElementById('appContainer'),
  appShell: document.querySelector('.app-shell'),
  controlsContainer: document.getElementById('controlsContainer'),
  board: document.getElementById('board'), // This now correctly refers to the container div
  boardCanvas: document.getElementById('boardCanvas'), // Added a specific reference to the canvas
  boardOverlay: document.getElementById('boardOverlay'),
  root: document.documentElement,
  splashText: document.getElementById('splashText'),

  // Control Buttons
  btnRandom: document.getElementById('btnRandom'),
  btnPalette: document.getElementById('btnPalette'),
  btnGap: document.getElementById('btnGap'),
  btnUndo: document.getElementById('btnUndo'),
  btnRedo: document.getElementById('btnRedo'),
  btnInvert: document.getElementById('btnInvert'),
  btnBrushMode: document.getElementById('btnBrushMode'),
  btnSpecialReset: document.getElementById('btnSpecialReset'),
  btnTutorial: document.getElementById('btnTutorial'),
  btnDark: document.getElementById('btnDark'),
  btnSymmetry: document.getElementById('btnSymmetry'),
  btnColorPicker: document.getElementById('btnColorPicker'),
  btnResetBoard: document.getElementById('btnResetBoard'),
  btnResizeUp: document.getElementById('btnResizeUp'),
  btnResizeDown: document.getElementById('btnResizeDown'),
  btnSave: document.getElementById('btnSave'),
  btnLangToggle: document.getElementById('btnLangToggle'),

  // Simulation & Breathing Buttons
  btnToggleSimMode: document.getElementById('btnToggleSimMode'),
  btnShowBreatheMenu: document.getElementById('btnShowBreatheMenu'),
  btnGameOfLife: document.getElementById('btnGameOfLife'),
  btnBrightnessEvo: document.getElementById('btnBrightnessEvo'),
  btnGravitationalSort: document.getElementById('btnGravitationalSort'),
  btnErosion: document.getElementById('btnErosion'),
  btnDla: document.getElementById('btnDla'),
  btnContour: document.getElementById('btnContour'),
  btnPlayPauseLife: document.getElementById('btnPlayPauseLife'),
  iconPlay: document.getElementById('iconPlay'),
  iconPause: document.getElementById('iconPause'),
  iconBreatheSolo: document.getElementById('iconBreatheSolo'),
  iconBreatheGroup: document.getElementById('iconBreatheGroup'),
  btnStepForward: document.getElementById('btnStepForward'),
  btnNudgeBrighter: document.getElementById('btnNudgeBrighter'),
  btnNudgeDarker: document.getElementById('btnNudgeDarker'),

  
  // Modals & Overlays
  saveModal: document.getElementById('saveModal'),
  colorPickerModal: document.getElementById('colorPickerModal'),
  helpModal: document.getElementById('helpModal'),
  resizeModal: document.getElementById('resizeModal'),
  paletteModal: document.getElementById('paletteModal'),
  gameOfLifeSettingsModal: document.getElementById('gameOfLifeSettingsModal'),
  gravitationalSortSettingsModal: document.getElementById('gravitationalSortSettingsModal'),



  longPressOverlay: document.getElementById('longPressOverlay'),
  longPressDisplay: document.getElementById('longPressDisplay'),

  // Save Modal Elements
  imagePreview: document.getElementById('imagePreview'),
  btnModalClose: document.getElementById('btnModalClose'),
  fileNameInput: document.getElementById('fileNameInput'),
  fileNameLabel: document.getElementById('fileNameLabel'),
  btnSaveImage: document.getElementById('btnSaveImage'),
  btnSaveProjectIdea: document.getElementById('btnSaveProjectIdea'),
  btnLoadProjectIdea: document.getElementById('btnLoadProjectIdea'),
  projectFileInput: document.getElementById('projectFileInput'),

  // Color Picker Modal Elements
  colorPickerHeader: document.getElementById('colorPickerHeader'),
  colorPickerPaletteName: document.getElementById('colorPickerPaletteName'),
  colorPickerSwatches: document.getElementById('colorPickerSwatches'),
  btnPrevPalette: document.getElementById('btnPrevPalette'),
  btnNextPalette: document.getElementById('btnNextPalette'),
  colorPickerPagination: document.getElementById('colorPickerPagination'),

  // Help Modal Elements
  btnHelpModalClose: document.getElementById('btnHelpModalClose'),
  helpModalTitle: document.getElementById('helpModalTitle'),
  helpIntroText: document.getElementById('helpIntroText'),

  // Resize Modal Elements
  btnResizeModalClose: document.getElementById('btnResizeModalClose'),
  resizeInput: document.getElementById('resizeInput'),
  btnConfirmResize: document.getElementById('btnConfirmResize'),
  resizeModalTitle: document.getElementById('resizeModalTitle'),
  resizeModalPrompt: document.getElementById('resizeModalPrompt'),
  
  // Palette Modal Elements
  btnPaletteModalClose: document.getElementById('btnPaletteModalClose'),
  paletteModalGrid: document.getElementById('paletteModalGrid'),
  paletteModalTitle: document.getElementById('paletteModalTitle'),
  
  // Game of Life Settings Modal Elements
  // === START MODIFICATION ===
  golSurvivalChipsContainer: document.getElementById('golSurvivalChipsContainer'),
  golBirthChipsContainer: document.getElementById('golBirthChipsContainer'),
  // === END MODIFICATION ===
  btnGolSettingsSave: document.getElementById('btnGolSettingsSave'),
  btnGolSettingsCancel: document.getElementById('btnGolSettingsCancel'),
  btnGolSettingsReset: document.getElementById('btnGolSettingsReset'),

  // Gravitational Sort Settings Modal Elements
  gsSettingsTitle: document.getElementById('gsSettingsTitle'),
  gsDirectionButtons: document.querySelectorAll('.gs-direction-btn'),
  gsStrengthSlider: document.getElementById('gsStrength'),
  gsStrengthValue: document.getElementById('gsStrengthValue'),
  btnGsSettingsSave: document.getElementById('btnGsSettingsSave'),
  btnGsSettingsCancel: document.getElementById('btnGsSettingsCancel'),

  // Phase 1 Additions: Advanced Color Mapping Modal
  advancedColorMappingModal: document.getElementById('advancedColorMappingModal'),
  btnAdaptModalClose: document.getElementById('btnAdaptModalClose'),
  adaptModalTitle: document.getElementById('adaptModalTitle'),
  adaptModalDesc: document.getElementById('adaptModalDesc'),
  btnAdaptColors: document.getElementById('btnAdaptColors'),
};