// A finite transition accent, separate from the swipe-preview glow. Animations
// leave no styles behind and restarting a transition cancels its previous flash.
const flashes = new WeakMap();
export function flashToolMode(button) {
    flashes.get(button)?.cancel();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animation = button.animate([
        { offset: 0, boxShadow: '0 0 0 0 #fff0, 0 0 0 0 #d5aa4800', backgroundColor: 'transparent' },
        { offset: .18, boxShadow: '0 0 7px 3px #fff3c4cc, 0 0 25px 10px #e6b94c99', backgroundColor: '#ffe7a033' },
        { offset: .48, boxShadow: '0 0 9px 6px #fff3c455, 0 0 30px 15px #e6b94c44', backgroundColor: '#ffe7a011' },
        { offset: 1, boxShadow: '0 0 14px 10px #fff0, 0 0 35px 18px #d5aa4800', backgroundColor: 'transparent' }
    ], { duration: reduced ? 180 : 1100, easing: 'ease-out' });
    flashes.set(button, animation);
    const clear = () => { if (flashes.get(button) === animation) flashes.delete(button); };
    animation.finished.then(clear, clear);
}
