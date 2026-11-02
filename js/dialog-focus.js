// Announce the window title on entry without marking a setting as selected.
// A negative tab index leaves ordinary Tab navigation on the real controls.
export function focusSettingsHeading(dialog) {
    const heading = dialog.querySelector('h1, h2');
    if (!heading) return;
    heading.tabIndex = -1;
    heading.classList.add('settings-entry-heading');
    heading.focus({ preventScroll: true });
}
