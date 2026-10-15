import { createProfileState, readProfileFile } from './profile-state.js';

export function initializeProfileControls({ capture, apply, canUse, getText }) {
    const state = createProfileState(capture());
    const host = document.getElementById('profileControls');
    const choices = [...host.querySelectorAll('[data-profile-choice]')];
    const dots = [...host.querySelectorAll('[data-profile-dot]')];
    const actions = document.getElementById('profileActions');
    const status = document.getElementById('profileStatus');
    const fileInput = document.getElementById('profileSettingsFile');
    let busy = false, queued = false;
    function message(key) {
        status.dataset.debugText = key;
        status.textContent = getText(key);
    }
    function closeActions() {
        actions.hidden = true;
        dots.forEach(dot => dot.setAttribute('aria-expanded', 'false'));
    }
    function refresh() {
        host.setAttribute('aria-label', getText('profiles_title'));
        document.getElementById('btnProfileStore').disabled = busy;
        document.getElementById('btnProfileLoad').disabled = busy;
        choices.forEach((button, index) => {
            const dirty = state.dirty(index);
            button.setAttribute('aria-pressed', String(index === state.selected));
            button.querySelector('.profile-dirty').hidden = !dirty;
            button.setAttribute('aria-label', getText('profile_number').replace('{n}', index + 1) +
                (dirty ? ' — ' + getText('profile_modified') : ''));
            button.disabled = busy;
            dots[index].disabled = busy || index !== state.selected;
            dots[index].setAttribute('aria-label', getText('profile_actions').replace('{n}', index + 1));
        });
        if (state.storageError) message('profile_session_only');
    }
    function captureNow() {
        if (busy || !canUse()) return;
        try { if (state.capture(capture())) refresh(); }
        catch { message('settings_save_error'); }
    }
    function scheduleCapture() {
        if (queued || busy) return;
        queued = true;
        setTimeout(() => { queued = false; captureNow(); }, 0);
    }
    choices.forEach((button, index) => button.addEventListener('click', () => {
        if (!canUse()) { message('profile_replay_busy'); return; }
        captureNow();
        busy = true;
        closeActions();
        try {
            const stored = apply(state.draft(index));
            state.observe(capture());
            const selectedStored = state.select(index);
            status.textContent = ''; delete status.dataset.debugText;
            if (!stored || !selectedStored) message('profile_session_only');
        } catch { message('settings_load_error'); }
        finally { busy = false; refresh(); button.focus({ preventScroll: true }); }
    }));
    dots.forEach((dot, index) => dot.addEventListener('click', () => {
        if (index !== state.selected) return;
        const opening = actions.hidden;
        closeActions();
        if (opening) { actions.hidden = false; dot.setAttribute('aria-expanded', 'true'); }
    }));
    document.getElementById('btnProfileStore').addEventListener('click', () => {
        if (!canUse()) { message('profile_replay_busy'); return; }
        captureNow();
        message(state.save() ? 'profile_saved' : 'profile_session_only');
        closeActions(); refresh(); dots[state.selected].focus();
    });
    document.getElementById('btnProfileLoad').addEventListener('click', () => {
        if (!canUse()) { message('profile_replay_busy'); return; }
        fileInput.value = ''; fileInput.click();
    });
    fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        if (!file) return;
        if (!canUse()) { message('profile_replay_busy'); return; }
        // Freeze the target until file validation and application finish.
        captureNow(); busy = true; refresh();
        try {
            if (file.size > 1024 * 1024) throw Error('Settings file is too large');
            const snapshot = readProfileFile(await file.text());
            if (!canUse()) throw Error('Replay is active');
            const stored = apply(snapshot);
            const profileStored = state.replace(capture());
            message(stored && profileStored ? 'settings_loaded' : 'profile_session_only');
        } catch { message('settings_load_error'); }
        finally {
            busy = false; fileInput.value = ''; closeActions(); refresh(); dots[state.selected].focus();
        }
    });
    host.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !actions.hidden) {
            event.preventDefault(); event.stopPropagation(); closeActions(); dots[state.selected].focus();
        }
    });
    // Capture committed settings, not unsubmitted modal fields. One capture per
    // event turn; no polling or work inside rendering/engine loops.
    for (const event of ['click', 'input', 'change', 'submit', 'pointerup', 'keyup']) {
        document.addEventListener(event, scheduleCapture, true);
    }
    window.addEventListener('pagehide', captureNow);
    document.addEventListener('visibilitychange', () => { if (document.hidden) captureNow(); });
    if (state.restored) {
        busy = true;
        try { apply(state.draft()); state.observe(capture()); }
        catch { message('settings_load_error'); }
        finally { busy = false; }
    } else if (!state.storageError) state.persist();
    refresh();
    return {
        refresh() { captureNow(); closeActions(); refresh(); },
        scheduleCapture,
        beginReplay() { state.beginReplay(capture()); refresh(); },
        endReplay() { state.endReplay(capture()); refresh(); }
    };
}
