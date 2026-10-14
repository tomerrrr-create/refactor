// Shared interaction for cycling controls with a picker. Mouse drags and touch
// swipes open the same picker; ordinary desktop clicks retain their action.
export function bindPickerGestures(button, {
    onTap, onOpen, onHold, onExtendedHold, canInteract, canOpen = () => true,
    beforeStart = () => {}, onEnd = () => {}, holdMs = 600, extendedHoldMs = holdMs * 2
}) {
    const TAP_SLOP = 8, SWIPE_DISTANCE = 24, VERTICAL_RATIO = 1.25;
    let active = null, holdTimer = null, extendedHoldTimer = null, suppressClick = false;

    function clearHoldTimers() {
        clearTimeout(holdTimer);
        clearTimeout(extendedHoldTimer);
    }

    function clearGlow() { button.classList.remove('picker-swipe-glow'); }
    function swipeReady(state) {
        return !state.held && state.y - state.currentY >= SWIPE_DISTANCE &&
            state.y - state.currentY >= Math.abs(state.currentX - state.x) * VERTICAL_RATIO;
    }
    function releaseCapture(id) {
        if (button.hasPointerCapture(id)) button.releasePointerCapture(id);
    }
    function cancel() {
        if (!active) return;
        const id = active.id;
        active = null; suppressClick = true;
        clearHoldTimers(); clearGlow(); releaseCapture(id);
        onEnd();
    }
    function updatePosition(event) {
        const state = active;
        state.currentX = event.clientX; state.currentY = event.clientY;
        if (Math.hypot(state.currentX - state.x, state.currentY - state.y) >= TAP_SLOP) {
            state.moved = true; clearHoldTimers();
        }
        button.classList.toggle('picker-swipe-glow', swipeReady(state) && !button.disabled && canInteract() && canOpen());
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
        button.setPointerCapture(event.pointerId);
        holdTimer = setTimeout(() => {
            if (!active || active.moved) return;
            if (button.disabled || !canInteract()) { cancel(); return; }
            active.held = true; clearGlow();
            onHold?.();
        }, holdMs);
        if (onExtendedHold) {
            extendedHoldTimer = setTimeout(() => {
                if (!active || active.moved || !active.held) return;
                if (button.disabled || !canInteract()) { cancel(); return; }
                onExtendedHold();
            }, extendedHoldMs);
        }
    });
    button.addEventListener('pointermove', event => {
        if (!active || active.id !== event.pointerId) return;
        updatePosition(event);
    });
    button.addEventListener('pointerup', event => {
        if (!active || active.id !== event.pointerId) return;
        updatePosition(event);
        const state = active, open = swipeReady(state) && canOpen();
        const inside = state.currentX >= state.bounds.left && state.currentX <= state.bounds.right &&
            state.currentY >= state.bounds.top && state.currentY <= state.bounds.bottom;
        const tap = !state.moved && !state.held && inside;
        active = null; clearHoldTimers(); clearGlow(); releaseCapture(state.id);
        onEnd();
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
    document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
    window.addEventListener('blur', cancel);
}
