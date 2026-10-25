// Lock the gesture at its first intentional movement. A gesture that starts
// vertically stays a scroll; a horizontal gesture cannot also pan the dialog.
export function bindColorPageSwipe(element, { onPage }) {
    let active = null, suppressClickUntil = 0;
    const touchFor = (touches, id) => [...touches].find(touch => touch.identifier === id);
    function track(touch) {
        active.dx = touch.clientX - active.x;
        active.dy = touch.clientY - active.y;
        if (!active.axis && Math.max(Math.abs(active.dx), Math.abs(active.dy)) >= 8) {
            active.axis = Math.abs(active.dx) > Math.abs(active.dy) ? 'horizontal' : 'vertical';
        }
    }
    element.addEventListener('touchstart', event => {
        suppressClickUntil = 0;
        if (event.touches.length !== 1) { active = null; return; }
        const touch = event.touches[0];
        active = { id: touch.identifier, x: touch.clientX, y: touch.clientY, dx: 0, dy: 0, axis: null };
    }, { passive: true });
    element.addEventListener('touchmove', event => {
        if (!active || event.touches.length !== 1) { active = null; return; }
        const touch = touchFor(event.touches, active.id);
        if (!touch) { active = null; return; }
        track(touch);
        if (active.axis === 'horizontal' && event.cancelable) event.preventDefault();
    }, { passive: false });
    element.addEventListener('touchend', event => {
        if (!active) return;
        const touch = touchFor(event.changedTouches, active.id);
        if (!touch) return;
        track(touch);
        const gesture = active;
        active = null;
        if (gesture.axis) {
            suppressClickUntil = Date.now() + 500;
            if (event.cancelable) event.preventDefault();
        }
        if (gesture.axis === 'horizontal' && Math.abs(gesture.dx) > 50) onPage(gesture.dx < 0);
    }, { passive: false });
    element.addEventListener('touchcancel', () => { active = null; suppressClickUntil = Date.now() + 500; }, { passive: true });
    element.addEventListener('click', event => {
        // Leave native keyboard/programmatic activation and ordinary taps alone.
        if (event.detail === 0 && event.pointerType !== 'touch') return;
        if (Date.now() < suppressClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);
}
