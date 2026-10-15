import { readSettingsProfiles, saveProfileSettings, renameSettingsProfile, PROFILE_NAME_LIMIT, createSettingsProfile, readSelectedProfile, selectSettingsProfile } from './settings-profiles.js';

export function initializeSettingsProfiles({ getText, getCurrentLang, captureSettingsText, applySettingsText }) {
    let active = readSelectedProfile();
    const host = document.getElementById('settingsProfiles');
    const rows = document.getElementById('settingsProfileRows');
    const status = document.getElementById('settingsProfilesStatus');
    const fileInput = document.getElementById('settingsProfileFile');
    const dialog = document.getElementById('settingsProfileDialog');
    const title = document.getElementById('settingsProfileTitle');
    const nameInput = document.getElementById('settingsProfileName');
    const renameForm = document.getElementById('settingsProfileRename');
    const saveCurrent = document.getElementById('btnProfileSaveCurrent');
    const importFile = document.getElementById('btnProfileImport');
    let profiles = [], selected = null, pendingImport = null, statusKey = '', busy = false;
    let applyFeedback = null, feedbackTimer;
    const label = index => profiles[index]?.name || getText('profile_default_name').replace('{n}', index + 1);
    function showStatus(key) {
        statusKey = key; status.textContent = key ? getText(key) : '';
    }
    function renderApplyFeedback() {
        const applying = applyFeedback?.phase === 'pending';
        document.getElementById('btnAddProfile').disabled = busy || applying;
        rows.querySelectorAll('[data-profile-apply]').forEach(button => {
            const index = Number(button.dataset.profileApply);
            const phase = applyFeedback?.index === index ? applyFeedback.phase : '';
            button.dataset.applyState = phase;
            button.disabled = busy || applying || !profiles[index]?.settingsText;
            button.setAttribute('aria-busy', String(phase === 'pending'));
            const key = phase === 'pending' ? 'profile_applying' : phase === 'success' ? 'settings_aligned' : 'profile_apply';
            button.setAttribute('aria-label', `${getText(key)}: ${label(index)}`);
            button.querySelector('.profile-apply-feedback').textContent = phase === 'success' ? '✓' : '';
        });
        rows.querySelectorAll('[data-profile-select]').forEach(button => {
            const chosen = Number(button.dataset.profileSelect) === active;
            button.setAttribute('aria-checked', String(chosen));
            button.querySelector('.profile-selection-marker').textContent = chosen ? '◉' : '○';
            button.closest('.settings-profile-row').classList.toggle('profile-selected', chosen);
            button.disabled = busy || applying;
        });
        rows.querySelectorAll('[data-profile-options]').forEach(button => { button.disabled = busy || applying; });
    }
    function refresh() {
        try { profiles = readSettingsProfiles(); }
        catch { profiles = []; showStatus('profiles_storage_error'); }
        dialog.dir = getCurrentLang() === 'he' ? 'rtl' : 'ltr';
        rows.replaceChildren();
        for (let index = 0; index < profiles.length; index++) {
            if (!profiles[index]?.settingsText) continue;
            const row = document.createElement('div'); row.className = 'settings-profile-row';
            const filled = Boolean(profiles[index]?.settingsText);
            row.dataset.filled = String(filled);
            const name = document.createElement('span'); name.className = 'settings-profile-name'; name.textContent = label(index); name.dir = 'auto';
            const info = document.createElement('button'); info.type = 'button'; info.className = 'settings-profile-info profile-select';
            info.dataset.profileSelect = index; info.setAttribute('role', 'radio');
            const marker = document.createElement('span'); marker.className = 'profile-selection-marker'; marker.setAttribute('aria-hidden', 'true');
            info.append(marker, name);
            const apply = document.createElement('button'); apply.type = 'button'; apply.className = 'profile-apply'; apply.dataset.profileApply = index;
            const applyLabel = document.createElement('span'); applyLabel.className = 'profile-apply-label'; applyLabel.textContent = getText('profile_apply');
            const feedback = document.createElement('span'); feedback.className = 'profile-apply-feedback'; feedback.setAttribute('aria-hidden', 'true');
            apply.append(applyLabel, feedback);
            apply.onclick = async () => {
                if (applyFeedback?.phase === 'pending') return;
                clearTimeout(feedbackTimer);
                showStatus('');
                applyFeedback = { index, phase: 'pending' }; renderApplyFeedback();
                try {
                    // Let the pending indicator paint before the existing synchronous import runs.
                    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                    const current = readSettingsProfiles()[index];
                    if (!current.settingsText) throw new Error('Profile is empty');
                    const stored = applySettingsText(current.settingsText);
                    active = index;
                    const selectedStored = selectSettingsProfile(index);
                    if (!selectedStored) showStatus('settings_loaded_session');
                    applyFeedback = stored ? { index, phase: 'success' } : null;
                    if (stored) feedbackTimer = setTimeout(() => { applyFeedback = null; renderApplyFeedback(); }, 1500);
                    else showStatus('settings_loaded_session');
                } catch { applyFeedback = null; showStatus('settings_load_error'); }
                finally {
                    renderApplyFeedback();
                    if (host.closest('dialog')?.open) rows.querySelector(`[data-profile-apply="${index}"]`)?.focus({ preventScroll: true });
                }
            };
            info.onclick = () => apply.click();
            const options = document.createElement('button'); options.type = 'button'; options.className = 'profile-options'; options.dataset.profileOptions = index;
            options.textContent = filled ? '⋯' : '+'; options.disabled = busy; options.setAttribute('aria-haspopup', 'dialog');
            const optionsLabel = `${getText(filled ? 'profile_options' : 'profile_setup')}: ${label(index)}`;
            options.setAttribute('aria-controls', dialog.id); options.setAttribute('aria-label', optionsLabel); options.title = optionsLabel;
            options.onclick = () => {
                selected = index; title.textContent = label(index); nameInput.value = profiles[index]?.name || '';
                dialog.dir = getCurrentLang() === 'he' ? 'rtl' : 'ltr'; dialog.showModal();
            };
            row.append(info, apply, options); rows.append(row);
        }
        host.querySelectorAll('[data-profile-text]').forEach(e => { e.textContent = getText(e.dataset.profileText); });
        dialog.querySelectorAll('[data-profile-text]').forEach(e => { e.textContent = getText(e.dataset.profileText); });
        document.getElementById('btnProfileClose').setAttribute('aria-label', getText('saveModal_close'));
        nameInput.placeholder = getText('profile_name'); nameInput.maxLength = PROFILE_NAME_LIMIT;
        if (dialog.open && selected !== null) title.textContent = label(selected);
        if (statusKey) status.textContent = getText(statusKey);
        renderApplyFeedback();
    }
    function store(action, success) {
        try { action(); dialog.close(); showStatus(success); refresh(); }
        catch { dialog.close(); showStatus('profiles_storage_error'); }
    }
    saveCurrent.onclick = () => store(() => saveProfileSettings(selected, captureSettingsText()), 'profile_saved');
    importFile.onclick = () => { pendingImport = selected; fileInput.value = ''; fileInput.click(); };
    fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0], index = pendingImport;
        pendingImport = null;
        if (!file || index === null) return;
        busy = true; saveCurrent.disabled = importFile.disabled = true; refresh();
        nameInput.disabled = renameForm.querySelector('button').disabled = true;
        try {
            if (file.size > 1024 * 1024) throw new Error('Settings file is too large');
            saveProfileSettings(index, await file.text());
            dialog.close(); showStatus('profile_imported');
        } catch { dialog.close(); showStatus('profile_import_error'); }
        finally {
            busy = false; saveCurrent.disabled = importFile.disabled = false;
            nameInput.disabled = renameForm.querySelector('button').disabled = false;
            fileInput.value = ''; refresh();
        }
    });
    renameForm.addEventListener('submit', event => {
        event.preventDefault();
        store(() => renameSettingsProfile(selected, nameInput.value), 'profile_renamed');
    });
    document.getElementById('btnProfileClose').onclick = () => dialog.close();
    dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => rows.querySelector(`[data-profile-options="${selected}"]`)?.focus());
    const add = document.getElementById('btnAddProfile');
    const newForm = document.getElementById('profileNameForm');
    const newName = document.getElementById('profileName');
    newName.maxLength = PROFILE_NAME_LIMIT;
    function closeNewForm() { newForm.hidden = true; add.setAttribute('aria-expanded', 'false'); newName.value = ''; }
    add.onclick = () => {
        newForm.hidden = !newForm.hidden;
        add.setAttribute('aria-expanded', String(!newForm.hidden));
        if (!newForm.hidden) newName.focus();
    };
    document.getElementById('btnCancelProfile').onclick = () => { closeNewForm(); add.focus(); };
    newForm.addEventListener('submit', event => {
        event.preventDefault();
        if (!newName.value.trim()) { newName.focus(); return; }
        try {
            active = createSettingsProfile(newName.value, captureSettingsText());
            const stored = selectSettingsProfile(active);
            closeNewForm(); refresh(); showStatus(stored ? 'profile_saved' : 'settings_loaded_session');
            rows.querySelector(`[data-profile-select="${active}"]`)?.focus();
        } catch { showStatus('profiles_storage_error'); }
    });
    refresh();
    return { refresh, closeNewForm, clearSelection() { active = null; selectSettingsProfile(null); refresh(); } };
}
