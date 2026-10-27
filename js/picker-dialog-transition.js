let activeTransition = null;

export function finishPickerDialogTransition() {
    activeTransition?.finish();
}

// Keep one backdrop while the existing panels crossfade. No cloned controls,
// layout animation, board snapshots, or changes to the running simulation.
export function transitionPickerDialog({ from, to, close, open }) {
    finishPickerDialogTransition();
    const outgoing = from.firstElementChild;
    const oldBackground = getComputedStyle(from).backgroundColor;
    const animate = from.classList.contains('modal-visible') && outgoing &&
        !matchMedia('(prefers-reduced-motion: reduce)').matches;
    close();
    open();
    if (!animate || !to.classList.contains('modal-visible')) return;

    const incoming = to.firstElementChild;
    const newBackground = getComputedStyle(to).backgroundColor;
    const oldAriaHidden = from.getAttribute('aria-hidden');
    const oldInert = from.inert;
    from.classList.add('picker-handoff-outgoing');
    to.classList.add('picker-handoff-incoming');
    from.inert = true;
    from.setAttribute('aria-hidden', 'true');
    const timing = { duration: 220, easing: 'cubic-bezier(.2,.65,.3,1)' };
    const animations = [
        outgoing.animate([{ opacity: 1 }, { opacity: 0 }], { ...timing, fill: 'forwards' }),
        incoming.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }], timing),
        to.animate([{ backgroundColor: oldBackground }, { backgroundColor: newBackground }], timing)
    ];
    const entry = {
        finish() {
            if (activeTransition !== entry) return;
            activeTransition = null;
            const previousTransition = from.style.getPropertyValue('transition');
            const previousPriority = from.style.getPropertyPriority('transition');
            from.style.setProperty('transition', 'none');
            from.classList.remove('picker-handoff-outgoing');
            to.classList.remove('picker-handoff-incoming');
            from.inert = oldInert;
            if (oldAriaHidden === null) from.removeAttribute('aria-hidden');
            else from.setAttribute('aria-hidden', oldAriaHidden);
            animations.forEach(animation => animation.cancel());
            // Commit the hidden state before restoring the ordinary close fade;
            // otherwise removing the handoff class starts a second exit fade.
            getComputedStyle(from).opacity;
            if (previousTransition) from.style.setProperty('transition', previousTransition, previousPriority);
            else from.style.removeProperty('transition');
        }
    };
    activeTransition = entry;
    Promise.all(animations.map(animation => animation.finished.catch(() => {}))).then(() => entry.finish());
}
