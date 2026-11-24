import { BRUSH_SIZES, brushSizeLabel } from './brush-footprint.js';
import { createReliefRenderer, createReliefStudy, paintRelief, stepReliefStudy } from './living-relief.js';

const GENERATION_INTERVAL = 60;

export function initializeLivingRelief({ readBoard, getText, getLang, onLanguageChange }) {
    const dialog = document.getElementById('livingRelief');
    const trigger = document.getElementById('livingReliefOpen');
    const canvas = dialog.querySelector('canvas');
    const heading = dialog.querySelector('h2');
    const close = dialog.querySelector('[data-relief-close]');
    const play = dialog.querySelector('[data-relief-play]');
    const step = dialog.querySelector('[data-relief-step]');
    const topView = dialog.querySelector('[data-relief-top]');
    const tools = [...dialog.querySelectorAll('[data-relief-tool]')];
    const size = dialog.querySelector('[data-relief-size]');
    const pigment = dialog.querySelector('[data-relief-pigment]');
    const swatch = dialog.querySelector('[data-relief-swatch]');
    const renderer = createReliefRenderer(canvas);
    let original, study, stroke;
    let tool = 'raise', tilted = true, timer = null;

    function translate() {
        dialog.dir = getLang() === 'he' ? 'rtl' : 'ltr';
        for (const element of [...trigger.querySelectorAll('[data-relief-text]'), ...dialog.querySelectorAll('[data-relief-text]')]) {
            element.textContent = getText(element.dataset.reliefText);
        }
        close.setAttribute('aria-label', getText('saveModal_close'));
        play.textContent = getText(timer === null ? 'relief_play' : 'relief_pause');
    }

    function render() {
        renderer.render(study, tilted);
    }

    function setPlaying(playing) {
        if (timer !== null) clearInterval(timer);
        timer = playing ? setInterval(() => {
            stepReliefStudy(study);
            render();
        }, GENERATION_INTERVAL) : null;
        play.textContent = getText(playing ? 'relief_pause' : 'relief_play');
        step.disabled = playing;
    }

    function setTool(nextTool) {
        endStroke();
        tool = nextTool;
        canvas.dataset.tool = tool;
        for (const button of tools) button.setAttribute('aria-pressed', String(button.dataset.reliefTool === tool));
    }

    function endStroke() {
        if (!stroke) return;
        const { pointer } = stroke;
        stroke = null;
        if (canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
    }

    function showPigment() {
        pigment.value = String(study.color);
        swatch.style.background = original.palette[study.color];
    }

    function reset() {
        endStroke();
        setPlaying(false);
        study = createReliefStudy(original);
        size.value = String(study.brushSize);
        showPigment();
        setTool('raise');
        tilted = true;
        topView.setAttribute('aria-pressed', 'false');
        render();
    }

    trigger.addEventListener('click', () => {
        if (dialog.open) return;
        original = readBoard();
        if (!original) return;
        pigment.replaceChildren(...original.palette.map((color, index) =>
            new Option(color.toUpperCase(), String(index))));
        reset();
        dialog.showModal();
        heading.focus();
    });
    trigger.hidden = false;

    for (const brushSize of BRUSH_SIZES) size.add(new Option(brushSizeLabel(brushSize), String(brushSize)));
    for (const button of tools) button.addEventListener('click', () => setTool(button.dataset.reliefTool));
    size.addEventListener('change', () => { study.brushSize = Number(size.value); });
    pigment.addEventListener('change', () => {
        study.color = Number(pigment.value);
        showPigment();
        setTool('color');
    });
    topView.addEventListener('click', () => {
        endStroke();
        tilted = !tilted;
        topView.setAttribute('aria-pressed', String(!tilted));
        render();
    });
    play.addEventListener('click', () => setPlaying(timer === null));
    step.addEventListener('click', () => { stepReliefStudy(study); render(); });
    dialog.querySelector('[data-relief-reset]').addEventListener('click', reset);
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
        endStroke();
        setPlaying(false);
        original = study = null;
        trigger.focus({ preventScroll: true });
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && dialog.open) setPlaying(false); });

    canvas.addEventListener('pointerdown', event => {
        if (stroke || event.button !== 0 || event.isPrimary === false) return;
        const index = renderer.tileAt(event.clientX, event.clientY);
        if (index < 0) return;
        // Keep the projection used for picking stable as a ridge grows under the pointer.
        stroke = { pointer: event.pointerId, last: index, projection: renderer.snapshot(), visited: new Set() };
        canvas.setPointerCapture(event.pointerId);
        paintRelief(study, index, index, tool, stroke.visited);
        render();
    });
    function moveStroke(event) {
        if (stroke?.pointer !== event.pointerId) return;
        const index = renderer.tileAt(event.clientX, event.clientY, stroke.projection);
        if (index < 0) {
            stroke.last = -1;
            return;
        }
        if (index === stroke.last) return;
        paintRelief(study, stroke.last < 0 ? index : stroke.last, index, tool, stroke.visited);
        stroke.last = index;
        render();
    }
    canvas.addEventListener('pointermove', moveStroke);
    canvas.addEventListener('pointerup', event => {
        if (stroke?.pointer !== event.pointerId) return;
        moveStroke(event);
        endStroke();
    });
    for (const type of ['pointercancel', 'lostpointercapture']) {
        canvas.addEventListener(type, event => { if (stroke?.pointer === event.pointerId) endStroke(); });
    }

    onLanguageChange(translate);
    translate();
}
