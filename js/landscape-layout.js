// Preserve the existing two interfaces; only their landscape placement changes.
export const LANDSCAPE_CREATION_CONTROLS = [
    'btnPalette', 'btnColorPicker', 'btnInvert', 'btnRandom',
    'btnSymmetry', 'btnBrushMode', 'btnShowBreatheMenu', 'btnToggleSimMode',
    'btnResizeUp', 'btnResizeDown', 'btnGap', 'btnDark',
    'btnSave', 'btnTutorial', 'btnUndo', 'btnRedo', 'btnResetBoard', 'btnSpecialReset'
];
export const LANDSCAPE_SIMULATION_CONTROLS = [
    'btnPalette', 'btnColorPicker', 'btnPlayPauseLife', 'btnStepForward',
    'btnShowBreatheMenu', 'btnToggleSimMode',
    'btnDla', 'btnContour', 'btnGameOfLife', 'btnBrightnessEvo',
    'btnIslands', 'btnTuring', 'btnSpiral', 'btnMagnetModes',
    'btnGravitationalSort', 'btnSandpile', 'btnErosion',
    'btnNudgeBrighter', 'btnNudgeDarker', 'btnCycleSort',
    'btnResizeUp', 'btnResizeDown', 'btnSymmetry', 'btnInvert',
    'btnRandom', 'btnSave', 'btnUndo', 'btnRedo'
];

// Use the fewest 44px columns that fit every control, leaving the rest for the board.
// Dimensions describe the content box, after safe-area padding has been removed.
export function calculateLandscapeLayout(width, height, count) {
    const button = 44, gap = 4, boardGap = 8;
    const maxRows = Math.max(1, Math.floor((height + gap) / (button + gap)));
    const columns = Math.max(1, Math.ceil(count / maxRows));
    const rows = Math.ceil(count / columns);
    const railWidth = columns * button + (columns - 1) * gap;
    return { columns, rows, railWidth, button, gap,
        boardSize: Math.max(1, Math.min(height, width - railWidth - boardGap)) };
}

export function updateLandscapeLayout({ container, shell, controls, width, height, simulation, fullscreen }) {
    const active = width > height && !fullscreen;
    container.classList.toggle('landscape-layout', active);
    if (!active) return false;
    shell.style.width = '';
    const ids = simulation ? LANDSCAPE_SIMULATION_CONTROLS : LANDSCAPE_CREATION_CONTROLS;
    const buttons = [...controls.querySelectorAll(':scope > .ctrl')];
    for (const button of buttons) {
        const order = ids.indexOf(button.id);
        button.toggleAttribute('data-landscape-control', order !== -1);
        button.style.setProperty('--landscape-order', order);
    }
    const style = getComputedStyle(container);
    const horizontalPadding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const verticalPadding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const layout = calculateLandscapeLayout(container.clientWidth - horizontalPadding,
        container.clientHeight - verticalPadding, ids.length);
    for (const [name, value] of Object.entries({
        '--landscape-columns': layout.columns,
        '--landscape-rows': layout.rows,
        '--landscape-rail-width': layout.railWidth + 'px',
        '--landscape-board-size': layout.boardSize + 'px'
    })) container.style.setProperty(name, value);
    // The first six controls are transport/display; the next fourteen are evolutions.
    const firstEvolutionRow = Math.floor(6 / layout.columns);
    const lastEvolutionRow = Math.ceil(20 / layout.columns);
    controls.style.setProperty('--landscape-sim-top', firstEvolutionRow * (layout.button + layout.gap) - 2 + 'px');
    controls.style.setProperty('--landscape-sim-height', (lastEvolutionRow - firstEvolutionRow) * (layout.button + layout.gap) + 'px');
    return true;
}
