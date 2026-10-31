let activeTransition = null;

export function finishPickerDialogTransition() {
    activeTransition?.finish();
}

// Keep a solid shell and destination header while only the picker bodies fade.
// Existing controls retain their handlers, focus and accessibility state.
export function transitionPickerDialog({ from, to, close, open }) {
    finishPickerDialogTransition();
    const outgoing = from.firstElementChild;
    const animate = from.classList.contains('modal-visible') && outgoing &&
        !matchMedia('(prefers-reduced-motion: reduce)').matches;
    const previousHeight = outgoing?.getBoundingClientRect().height;
    close();
    open();
    if (!animate || !to.classList.contains('modal-visible')) return;

    const incoming = to.firstElementChild;
    const oldAriaHidden = from.getAttribute('aria-hidden');
    const oldInert = from.inert;
    from.classList.add('picker-handoff-outgoing');
    to.classList.add('picker-handoff-incoming');
    from.inert = true;
    from.setAttribute('aria-hidden', 'true');
    const nextHeight = incoming.getBoundingClientRect().height;
    const outgoingBody = outgoing.querySelector('.brush-picker-body, .palette-picker-content');
    const incomingBody = incoming.querySelector('.brush-picker-body, .palette-picker-content');
    const timing = { duration: 180, easing: 'cubic-bezier(.2,.65,.3,1)' };
    const heightFrames = [{ height: `${previousHeight}px` }, { height: `${nextHeight}px` }];
    const animations = [
        outgoingBody.animate([{ opacity: 1 }, { opacity: 0 }], { ...timing, fill: 'forwards' }),
        incomingBody.animate([{ opacity: 0 }, { opacity: 1 }], timing),
        incoming.animate(heightFrames, timing),
        outgoing.animate(heightFrames, { ...timing, fill: 'forwards' })
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
