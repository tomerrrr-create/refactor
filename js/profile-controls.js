import { loadStartupProfile } from './startup-profile.js';
import { createProfileState, readProfileFile, factoryProfileSnapshot } from './profile-state.js';

export function initializeProfileControls({ capture, apply, exportSettings, canUse, getText }) {
    const state = createProfileState(capture());
    state.select(loadStartupProfile());
    const host = document.getElementById('profileControls');
    const choices = [...host.querySelectorAll('[data-profile-choice]')];
    const dots = [...host.querySelectorAll('[data-profile-dot]')];
    const actions = document.getElementById('profileActions');
    const status = document.getElementById('profileStatus');
    const fileInput = document.getElementById('profileSettingsFile');
    const transfer = document.getElementById('profileTransferDialog');
    const transferTitle = document.getElementById('profileTransferTitle');
    const transferPrompt = document.getElementById('profileTransferPrompt');
    const targets = document.getElementById('profileCopyTargets');
    const confirm = document.getElementById('btnProfileTransferConfirm');
    const cancel = document.getElementById('btnProfileTransferCancel');
    let busy = false, queued = false, pending = null, messageTimer;

    function message(key, transient = false) {
        clearTimeout(messageTimer);
        status.dataset.debugText = key;
        status.textContent = getText(key);
        if (transient) messageTimer = setTimeout(() => {
            status.textContent = ''; delete status.dataset.debugText;
        }, 2500);
    }
    function closeActions() {
        actions.hidden = true;
        dots.forEach(dot => dot.setAttribute('aria-expanded', 'false'));
    }
    function refresh() {
        host.setAttribute('aria-label', getText('profiles_title'));
        actions.querySelectorAll('[data-profile-label]').forEach(button => {
            const label = getText(button.dataset.profileLabel);
            button.setAttribute('aria-label', label);
            button.title = label;
        });
        document.getElementById('btnProfileSave').disabled = busy;
        document.getElementById('btnProfileExport').disabled = busy;
        document.getElementById('btnProfileCopy').disabled = busy;
        document.getElementById('btnProfileLoad').disabled = busy;
        choices.forEach((button, index) => {
            const modified = state.modified(index);
            button.setAttribute('aria-pressed', String(index === state.selected));
            button.querySelector('.profile-dirty').hidden = !modified;
            button.setAttribute('aria-label', getText('profile_number').replace('{n}', index + 1) +
                (modified ? ' — ' + getText('profile_modified') : ''));
            button.title = button.getAttribute('aria-label');
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
    document.getElementById('btnProfileSave').addEventListener('click', () => {
        if (busy || !canUse()) { message('profile_replay_busy'); return; }
        try {
            // Capture synchronously: the document's deferred capture may still
            // be queued from the previous modal Save or input event.
            state.capture(capture());
            const stored = state.save();
            message(stored ? 'profile_saved' : 'profile_session_only', stored);
        } catch { message('settings_save_error'); }
        finally { closeActions(); refresh(); dots[state.selected].focus(); }
    });
    document.getElementById('btnProfileExport').addEventListener('click', async () => {
        if (busy || !canUse()) { message('profile_replay_busy'); return; }
        captureNow();
        const snapshot = state.draft(), index = state.selected;
        busy = true; refresh();
        try {
            if (await exportSettings(snapshot.settings, index)) message('profile_exported', true);
        } catch { message('settings_save_error'); }
        finally { busy = false; closeActions(); refresh(); dots[state.selected].focus(); }
    });

    function finishTransfer() {
        pending = null; busy = false;
        if (transfer.open) transfer.close();
        closeActions(); refresh(); dots[state.selected].focus();
    }
    function showConfirmation() {
        targets.hidden = true; confirm.hidden = false;
        const { kind, source, target } = pending;
        transferTitle.textContent = getText(kind === 'copy' ? 'profile_copy' : 'profile_load');
        transferPrompt.textContent = getText(kind === 'copy' ? 'profile_copy_prompt' : 'profile_load_prompt')
            .replace('{from}', source + 1).replace('{to}', target + 1);
        if (!transfer.open) transfer.showModal();
        cancel.focus();
    }
    document.getElementById('btnProfileCopy').addEventListener('click', () => {
        if (busy || !canUse()) { message('profile_replay_busy'); return; }
        captureNow();
        pending = { kind: 'copy', source: state.selected, snapshot: state.draft() };
        busy = true; refresh();
        transferTitle.textContent = getText('profile_copy');
        transferPrompt.textContent = getText('profile_copy_choose');
        targets.replaceChildren(); targets.hidden = false; confirm.hidden = true;
        choices.forEach((_, index) => {
            if (index === pending.source) return;
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'profile-choice';
            button.textContent = String(index + 1); button.dataset.copyTarget = index;
            button.setAttribute('aria-label', getText('profile_number').replace('{n}', index + 1));
            button.addEventListener('click', () => { pending.target = index; showConfirmation(); });
            targets.append(button);
        });
        transfer.showModal(); targets.querySelector('button').focus();
    });
    document.getElementById('btnProfileLoad').addEventListener('click', () => {
        if (busy || !canUse()) { message('profile_replay_busy'); return; }
        fileInput.value = ''; fileInput.click();
    });
    fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        if (!file) return;
        if (busy || !canUse()) { message('profile_replay_busy'); return; }
        captureNow(); busy = true; refresh();
        const target = state.selected;
        try {
            if (file.size > 1024 * 1024) throw Error('Settings file is too large');
            const snapshot = readProfileFile(await file.text());
            if (!canUse()) throw Error('Replay is active');
            pending = { kind: 'load', source: target, target, snapshot };
            showConfirmation();
        } catch { message('settings_load_error'); finishTransfer(); }
        finally { fileInput.value = ''; }
    });
    confirm.addEventListener('click', () => {
        if (!pending || pending.target === undefined) return;
        if (!canUse() || state.selected !== pending.source) {
            message('profile_replay_busy'); finishTransfer(); return;
        }
        confirm.disabled = true;
        try {
            let stored;
            if (pending.kind === 'copy') {
                stored = state.copyTo(pending.target, pending.snapshot);
            } else {
                const applied = apply(pending.snapshot);
                const saved = state.replace(capture());
                stored = applied && saved;
            }
            message(stored ? (pending.kind === 'copy' ? 'profile_copied' : 'settings_loaded') : 'profile_session_only', stored);
        } catch { message('settings_load_error'); }
        finally { confirm.disabled = false; finishTransfer(); }
    });
    cancel.addEventListener('click', finishTransfer);
    document.getElementById('btnProfileTransferClose').addEventListener('click', finishTransfer);
    transfer.addEventListener('cancel', event => { event.preventDefault(); finishTransfer(); });
    transfer.addEventListener('close', () => { if (!transfer.open && pending) finishTransfer(); });
    let startedOutside = false;
    const outside = event => {
        const r = transfer.getBoundingClientRect();
        return event.target === transfer && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom);
    };
    transfer.addEventListener('pointerdown', event => { startedOutside = outside(event); });
    transfer.addEventListener('click', event => { if (startedOutside && outside(event)) finishTransfer(); startedOutside = false; });
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
    busy = true;
    try { apply(state.draft(), { startup: true }); state.observe(capture()); }
    catch { message('settings_load_error'); }
    finally { busy = false; }
    if (!state.storageError) state.persist();
    refresh();
    return {
        refresh() { captureNow(); closeActions(); refresh(); },
        scheduleCapture,
        defaults() { return factoryProfileSnapshot(state.selected); },
        resetToDefaults() {
            if (busy || !canUse()) throw Error('Profiles are busy');
            busy = true;
            closeActions();
            try {
                const stored = apply(factoryProfileSnapshot(state.selected));
                const profileStored = state.replace(capture());
                return stored && profileStored;
            } finally { busy = false; refresh(); }
        },
        beginReplay() { state.beginReplay(capture()); refresh(); },
        endReplay() {
            // Capture lazily so failures also release the profile replay lock.
            try { state.endReplay(capture); }
            finally { refresh(); }
        }
    };
}
