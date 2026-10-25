import { BRUSH_SIZES, BRUSH_SHAPES, brushSizeLabel, getBrushOffsets } from './brush-footprint.js';
import { onLanguageChange } from './i18n.js';

const icons = {
    circle: '<circle cx="12" cy="12" r="8"/>',
    square: '<rect x="4" y="4" width="16" height="16" rx="1"/>',
    diamond: '<path d="m12 3 9 9-9 9-9-9z"/>'
};

export function initializeBrushPicker(app) {
    const shapes = document.getElementById('brushShapeOptions');
    const sizes = document.getElementById('brushSizeOptions');
    const preview = document.getElementById('brushFootprintPreview');
    const caption = document.getElementById('brushFootprintCaption');
    for (const shape of BRUSH_SHAPES) {
        const button = document.createElement('button');
        button.type = 'button'; button.dataset.brushShape = shape;
        button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${icons[shape]}</svg>`;
        button.addEventListener('click', () => { app.setBrush({ ...app.getBrush(), shape }); refresh(); });
        shapes.append(button);
    }
    for (const size of BRUSH_SIZES) {
        const button = document.createElement('button');
        button.type = 'button'; button.dataset.brushSize = String(size); button.textContent = brushSizeLabel(size);
        button.addEventListener('click', () => { app.setBrush({ ...app.getBrush(), size }); refresh(); });
        sizes.append(button);
    }
    // Keep the technician Startup / simulation-entry controls in the same
    // nine-value domain. A continuous slider would also expose unwanted 17/19.
    for (const id of ['initBrushSize', 'startupBrushSize']) {
        const select = document.getElementById(id);
        for (const size of BRUSH_SIZES) select.add(new Option(brushSizeLabel(size), String(size)));
    }

    function refresh() {
        const { size, shape } = app.getBrush();
        shapes.closest('.brush-picker-tools').dir = app.getCurrentLang() === 'he' ? 'rtl' : 'ltr';
        for (const button of shapes.children) {
            button.setAttribute('aria-pressed', String(button.dataset.brushShape === shape));
            const label = app.getText('brush_' + button.dataset.brushShape);
            button.setAttribute('aria-label', label);
            button.title = label;
        }
        for (const button of sizes.children) {
            button.setAttribute('aria-pressed', String(Number(button.dataset.brushSize) === size));
            button.setAttribute('aria-label', app.getText('brush_width').replace('{n}', button.dataset.brushSize));
        }
        const width = Math.max(5, size), r = Math.floor(size / 2), margin = Math.floor((width - size) / 2);
        const cells = new Set(getBrushOffsets(size, shape).map(([x,y]) => `${x+r+margin}:${y+r+margin}`));
        const palette = app.C.PALETTES[app.getActivePaletteIndex()].colors;
        const color = app.isRainbowModeActive() ? null : palette[app.getSelectedColorIndex()] || '#e3c677';
        preview.replaceChildren();
        preview.setAttribute('viewBox', `0 0 ${width * 4} ${width * 4}`);
        for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
            const cell = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            cell.setAttribute('x', x*4); cell.setAttribute('y', y*4);
            cell.setAttribute('width', '3.4'); cell.setAttribute('height', '3.4'); cell.setAttribute('rx', '.35');
            const painted = cells.has(`${x}:${y}`);
            cell.setAttribute('fill', painted ? color || palette[(y*width+x)%palette.length] : '#353832');
            if (painted) { cell.setAttribute('stroke', '#a18e61'); cell.setAttribute('stroke-width', '.18'); }
            preview.append(cell);
        }
        caption.textContent = `${size} × ${size}`;
        preview.setAttribute('aria-label', `${app.getText('brush_' + shape)} · ${app.getText('brush_width').replace('{n}', size)}`);
    }
    onLanguageChange(refresh);
    return { refresh };
}
