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
    const focusNavigation = () => to.querySelector('#btnColorPickerPalette, #palette-current-preview')?.focus({ preventScroll: true });
    if (!animate || !to.classList.contains('modal-visible')) {
        if (to.classList.contains('modal-visible')) focusNavigation();
        return;
    }

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
    const outgoingBodyHeight = outgoingBody.getBoundingClientRect().height;
    const incomingBodyHeight = incomingBody.getBoundingClientRect().height;
    const timing = { duration: 420, easing: 'cubic-bezier(.45,0,.55,1)' };
    const heightFrames = [
        { height: `${previousHeight}px`, offset: 0 },
        { height: `${previousHeight}px`, offset: 1 / 3 },
        { height: `${nextHeight}px`, offset: 1 }
    ];
    const animations = [
        // Clear the old view before revealing the next; never blend two grids.
        // Freeze body dimensions so resizing the frame cannot squeeze its content.
        outgoingBody.animate([
            { opacity: 1, minHeight: `${outgoingBodyHeight}px` },
            { opacity: 0, minHeight: `${outgoingBodyHeight}px` }
        ], { duration: 140, easing: 'ease-in-out', fill: 'forwards' }),
        incomingBody.animate([
            { opacity: 0, minHeight: `${incomingBodyHeight}px` },
            { opacity: 1, minHeight: `${incomingBodyHeight}px` }
        ], { duration: 260, delay: 160, easing: 'ease-in-out', fill: 'both' }),
        incoming.animate(heightFrames, timing),
        outgoing.animate([{ height: `${previousHeight}px` }, { height: `${previousHeight}px` }], { ...timing, fill: 'forwards' })
    ];
    // Focus after the incoming class makes the destination visible and the
    // outgoing panel is inert, so hiding the old view cannot discard focus.
    focusNavigation();
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
