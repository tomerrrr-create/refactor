import { focusSettingsHeading } from './dialog-focus.js';

export const BABY_BOARD_SIZE = 249;
export const BABY_CONTROLS = ['btnColorPicker', 'btnPlayPauseLife', 'btnWind',
    'btnBrightnessEvo', 'btnIslands', 'btnGravitationalSort', 'btnNudgeBrighter'];

export function initializeBabyMode({ enter, leave, finishInput, getText, onLanguageChange }) {
    const start = document.getElementById('btnBabyMode');
    const lock = document.getElementById('btnBabyExit');
    const dialog = document.getElementById('babyExitDialog');
    const controls = document.getElementById('controlsContainer');
    let enabled = false, timer = null, holdPointer = null;
    const inertBefore = new Map();
    BABY_CONTROLS.forEach(id => document.getElementById(id).setAttribute('data-baby-control', ''));
    function cancelHold() {
        clearTimeout(timer); timer = null; holdPointer = null;
        lock.classList.remove('holding');
    }
    function labels() {
        start.textContent = getText('baby_enter');
        lock.setAttribute('aria-label', getText('baby_exit_hold'));
        lock.title = getText('baby_exit_hold');
        dialog.dir = document.documentElement.lang === 'he' ? 'rtl' : 'ltr';
        dialog.querySelector('h2').textContent = getText('baby_exit_title');
        dialog.querySelector('[data-cancel]').textContent = getText('evolution_cancel');
        dialog.querySelector('[data-confirm]').textContent = getText('baby_exit_confirm');
    }
    start.addEventListener('click', () => {
        if (enabled || enter() === false) return;
        enabled = true;
        document.getElementById('technicianDialog').close();
        document.body.classList.add('baby-mode');
        for (const element of controls.children) {
            if (element.hasAttribute('data-baby-control')) continue;
            inertBefore.set(element, element.inert); element.inert = true;
        }
        lock.hidden = false;
        window.dispatchEvent(new Event('resize'));
        document.getElementById('btnPlayPauseLife').focus({ preventScroll: true });
    });
    function beginHold(pointer) {
        if (!enabled || timer) return;
        holdPointer = pointer; lock.classList.add('holding');
        timer = setTimeout(() => {
            cancelHold(); finishInput(); dialog.showModal(); focusSettingsHeading(dialog);
        }, 3000);
    }
    lock.addEventListener('pointerdown', event => {
        if (event.button !== 0 || holdPointer !== null) return;
        event.preventDefault(); beginHold(event.pointerId); lock.setPointerCapture(event.pointerId);
    });
    lock.addEventListener('pointermove', event => {
        if (event.pointerId !== holdPointer) return;
        const r = lock.getBoundingClientRect();
        if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) cancelHold();
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) lock.addEventListener(type, event => {
        if (event.pointerId === holdPointer) cancelHold();
    });
    lock.addEventListener('keydown', event => {
        if (![' ', 'Enter'].includes(event.key)) return;
        event.preventDefault(); if (!event.repeat) beginHold('keyboard');
    });
    lock.addEventListener('keyup', event => { if ([' ', 'Enter'].includes(event.key)) cancelHold(); });
    lock.addEventListener('blur', cancelHold);
    window.addEventListener('blur', cancelHold);
    document.addEventListener('visibilitychange', () => { if (document.hidden) cancelHold(); });
    dialog.querySelector('[data-cancel]').addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-confirm]').addEventListener('click', () => {
        cancelHold(); dialog.close(); leave(); enabled = false;
        document.body.classList.remove('baby-mode'); lock.hidden = true;
        for (const [element, inert] of inertBefore) element.inert = inert;
        inertBefore.clear(); window.dispatchEvent(new Event('resize'));
        document.getElementById('btnToggleSimMode').focus({ preventScroll: true });
    });
    dialog.addEventListener('close', () => { if (enabled) lock.focus({ preventScroll: true }); });
    onLanguageChange(labels); labels();
}
