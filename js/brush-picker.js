import { BRUSH_SIZES, BRUSH_SHAPES, brushSizeLabel } from './brush-footprint.js';
import { onLanguageChange } from './i18n.js';

const icons = {
    circle: '<circle cx="12" cy="12" r="8"/>',
    square: '<rect x="4" y="4" width="16" height="16" rx="1"/>',
    diamond: '<path d="m12 3 9 9-9 9-9-9z"/>',
    ring: '<path fill-rule="evenodd" d="M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18Zm0 4a5 5 0 1 0 0 10 5 5 0 1 0 0-10Z"/>',
    line: '<rect x="3" y="10" width="18" height="4" rx="1"/>'
};

export function initializeBrushPicker(app) {
    const shapes = document.getElementById('brushShapeOptions');
    const sizes = document.getElementById('brushSizeOptions');
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

    }
    onLanguageChange(refresh);
    return { refresh };
}
