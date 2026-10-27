import { bindPickerGestures } from './picker-gestures.js';

// Mirror the actual controls, including localized labels and active SVG parts.
// Keep independent hit targets so modal gestures never dispatch synthetic clicks.
export function initializeBrushPickerNavigation({
    sortButton, utilityButton, sortControl, symmetryControl, separatorControl,
    controlsContainer, usesSeparators, sortGestures, symmetryGestures, separatorGestures
}) {
    function mirror(source, target) {
        target.innerHTML = source.innerHTML;
        target.querySelectorAll('[id]').forEach(node => {
            if (node.id === 'gapValue') node.classList.add('picker-gap-value');
            node.removeAttribute('id');
        });
        for (const name of ['title', 'aria-label']) {
            const value = source.getAttribute(name);
            if (value === null) target.removeAttribute(name);
            else target.setAttribute(name, value);
        }
        target.disabled = source.disabled;
        if (source.dataset.relativeGap) target.dataset.relativeGap = source.dataset.relativeGap;
        else delete target.dataset.relativeGap;
    }
    function refresh() {
        mirror(sortControl, sortButton);
        mirror(usesSeparators() ? separatorControl : symmetryControl, utilityButton);
    }
    bindPickerGestures(sortButton, sortGestures);
    const utility = () => usesSeparators() ? separatorGestures : symmetryGestures;
    bindPickerGestures(utilityButton, {
        onTap: () => utility().onTap(),
        onOpen: () => utility().onOpen(),
        onSwipeDown: () => utility().onSwipeDown(),
        canSwipeDown: () => utility().canSwipeDown(),
        canInteract: () => utility().canInteract(),
        beforeStart: () => utility().beforeStart()
    });
    utilityButton.addEventListener('keydown', event => {
        if (usesSeparators() && event.altKey && event.key === 'ArrowDown' && utility().canInteract()) {
            event.preventDefault(); separatorGestures.onOpen();
        }
    });
    sortButton.addEventListener('keydown', event => {
        if (event.altKey && event.key === 'ArrowDown' && sortGestures.canInteract()) {
            event.preventDefault(); sortGestures.onOpen();
        }
    });
    const observer = new MutationObserver(refresh);
    for (const control of [sortControl, symmetryControl, separatorControl]) {
        observer.observe(control, { attributes: true, childList: true, subtree: true, characterData: true });
    }
    observer.observe(controlsContainer, { attributes: true, attributeFilter: ['class'] });
    refresh();
    return { refresh, disconnect: () => observer.disconnect() };
}
