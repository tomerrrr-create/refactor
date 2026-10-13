// Shared interaction for the palette and color controls. Swipe opening is
// limited to touch/pen; ordinary desktop clicks retain their existing action.
export function bindPickerGestures(button, {
    onTap, onOpen, onHold, canInteract, beforeStart = () => {}, holdMs = 600
}) {
    const TAP_SLOP = 8, SWIPE_DISTANCE = 24, VERTICAL_RATIO = 1.25;
    let active = null, holdTimer = null, suppressClick = false;

    function clearHint() { button.classList.remove('picker-swipe-ready'); }
    function swipeReady(state) {
        return state.touch && !state.held && state.y - state.currentY >= SWIPE_DISTANCE &&
            state.y - state.currentY >= Math.abs(state.currentX - state.x) * VERTICAL_RATIO;
    }
    function releaseCapture(id) {
        if (button.hasPointerCapture(id)) button.releasePointerCapture(id);
    }
    function cancel() {
        if (!active) return;
        const id = active.id;
        active = null; suppressClick = true;
        clearTimeout(holdTimer); clearHint(); releaseCapture(id);
    }
    function updatePosition(event) {
        const state = active;
        state.currentX = event.clientX; state.currentY = event.clientY;
        if (Math.hypot(state.currentX - state.x, state.currentY - state.y) >= TAP_SLOP) {
            state.moved = true; clearTimeout(holdTimer);
        }
        button.classList.toggle('picker-swipe-ready', swipeReady(state));
    }
    button.addEventListener('pointerdown', event => {
        if (event.isPrimary === false || event.button !== 0 || active) return;
        suppressClick = false;
        if (button.disabled || !canInteract()) { suppressClick = true; return; }
        beforeStart();
        active = {
            id: event.pointerId, x: event.clientX, y: event.clientY,
            currentX: event.clientX, currentY: event.clientY,
            touch: event.pointerType === 'touch' || event.pointerType === 'pen',
            moved: false, held: false, bounds: button.getBoundingClientRect()
        };
        if (active.touch) button.setPointerCapture(event.pointerId);
        holdTimer = setTimeout(() => {
            if (!active || active.moved) return;
            if (button.disabled || !canInteract()) { cancel(); return; }
            active.held = true; clearHint();
            onHold?.();
        }, holdMs);
    });
    button.addEventListener('pointermove', event => {
        if (!active || active.id !== event.pointerId) return;
        updatePosition(event);
    });
    button.addEventListener('pointerup', event => {
        if (!active || active.id !== event.pointerId) return;
        updatePosition(event);
        const state = active, open = swipeReady(state);
        const inside = state.currentX >= state.bounds.left && state.currentX <= state.bounds.right &&
            state.currentY >= state.bounds.top && state.currentY <= state.bounds.bottom;
        const tap = !state.moved && !state.held && inside;
        active = null; clearTimeout(holdTimer); clearHint(); releaseCapture(state.id);
        suppressClick = state.touch || !tap;
        if (button.disabled || !canInteract()) return;
        if (open) onOpen();
        else if (state.touch && tap) onTap();
    });
    button.addEventListener('click', event => {
        // Ignore the compatibility click following a handled pointer gesture.
        // Native/programmatic activation without a pointer stays supported.
        if (suppressClick && (event.detail !== 0 || event.pointerType === 'touch' || event.pointerType === 'pen')) {
            suppressClick = false; return;
        }
        if (!button.disabled && canInteract()) onTap();
    });
    button.addEventListener('pointercancel', event => { if (active?.id === event.pointerId) cancel(); });
    button.addEventListener('lostpointercapture', event => { if (active?.id === event.pointerId) cancel(); });
    button.addEventListener('pointerleave', event => {
        if (active?.id === event.pointerId && !active.touch) cancel();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
    window.addEventListener('blur', cancel);
}
