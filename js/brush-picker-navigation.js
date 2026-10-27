import { bindPickerGestures } from './picker-gestures.js';

// Mirror the actual controls, including localized labels and active SVG parts.
// Keep independent hit targets so modal gestures never dispatch synthetic clicks.
export function initializeBrushPickerNavigation({
    sortButton, utilityButton, sortControl, symmetryControl, sortGestures, symmetryGestures
}) {
    function mirror(source, target) {
        target.innerHTML = source.innerHTML;
        target.querySelectorAll('[id]').forEach(node => {
            node.removeAttribute('id');
        });
        for (const name of ['title', 'aria-label', 'aria-pressed', 'aria-keyshortcuts']) {
            const value = source.getAttribute(name);
            if (value === null) target.removeAttribute(name);
            else target.setAttribute(name, value);
        }
        target.disabled = source.disabled;
        target.classList.toggle('wind-active', source.classList.contains('wind-active'));
        if (source.dataset.windMode) target.dataset.windMode = source.dataset.windMode;
        else delete target.dataset.windMode;
    }
    function refresh() {
        mirror(sortControl, sortButton);
        mirror(symmetryControl, utilityButton);
    }
    bindPickerGestures(sortButton, sortGestures);
    bindPickerGestures(utilityButton, {
        onTap: () => symmetryGestures.onTap(),
        onOpen: () => symmetryGestures.onOpen(),
        onSwipeDown: () => symmetryGestures.onSwipeDown(),
        canSwipeDown: () => true,
        canInteract: () => symmetryGestures.canInteract(),
        beforeStart: () => symmetryGestures.beforeStart()
    });
    utilityButton.addEventListener('keydown', event => {
        if (event.altKey && event.key === 'ArrowDown' && symmetryGestures.canInteract()) {
            event.preventDefault(); symmetryGestures.onSwipeDown();
        }
    });
    sortButton.addEventListener('keydown', event => {
        if (event.altKey && event.key === 'ArrowDown' && sortGestures.canInteract()) {
            event.preventDefault(); sortGestures.onOpen();
        }
    });
    const observer = new MutationObserver(refresh);
    for (const control of [sortControl, symmetryControl]) {
        observer.observe(control, { attributes: true, childList: true, subtree: true, characterData: true });
    }
    refresh();
    return { refresh, disconnect: () => observer.disconnect() };
}
