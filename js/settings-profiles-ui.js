import { readSettingsProfiles, saveProfileSettings, renameSettingsProfile, PROFILE_COUNT, PROFILE_NAME_LIMIT } from './settings-profiles.js';

export function initializeSettingsProfiles({ getText, getCurrentLang, captureSettingsText, applySettingsText }) {
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
    let toastTimer;
    const label = index => profiles[index]?.name || getText('profile_default_name').replace('{n}', index + 1);
    function showStatus(key, toast = false) {
        clearTimeout(toastTimer);
        statusKey = key; status.textContent = key ? getText(key) : '';
        status.classList.toggle('profile-toast', toast);
        if (toast) toastTimer = setTimeout(() => showStatus(''), 3000);
    }
    function refresh() {
        try { profiles = readSettingsProfiles(); }
        catch { profiles = []; showStatus('profiles_storage_error'); }
        dialog.dir = getCurrentLang() === 'he' ? 'rtl' : 'ltr';
        rows.replaceChildren();
        for (let index = 0; index < PROFILE_COUNT; index++) {
            const row = document.createElement('div'); row.className = 'settings-profile-row';
            const name = document.createElement('span'); name.className = 'settings-profile-name'; name.textContent = label(index); name.dir = 'auto';
            const state = document.createElement('span'); state.className = 'settings-profile-state';
            state.textContent = getText(profiles[index]?.settingsText ? 'profile_ready' : 'profile_empty');
            const info = document.createElement('div'); info.className = 'settings-profile-info'; info.append(name, state);
            const apply = document.createElement('button'); apply.type = 'button'; apply.className = 'profile-apply'; apply.dataset.profileApply = index;
            apply.textContent = getText('profile_apply'); apply.disabled = busy || !profiles[index]?.settingsText;
            apply.setAttribute('aria-label', `${getText('profile_apply')}: ${label(index)}`);
            apply.onclick = () => {
                try {
                    const current = readSettingsProfiles()[index];
                    if (!current.settingsText) return;
                    const stored = applySettingsText(current.settingsText);
                    showStatus(stored ? 'settings_aligned' : 'settings_loaded_session', true);
                } catch { showStatus('settings_load_error'); }
            };
            const options = document.createElement('button'); options.type = 'button'; options.className = 'profile-options'; options.dataset.profileOptions = index;
            options.textContent = '⋯'; options.disabled = busy; options.setAttribute('aria-haspopup', 'dialog');
            options.setAttribute('aria-controls', dialog.id); options.setAttribute('aria-label', `${getText('profile_options')}: ${label(index)}`);
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
    refresh();
    return { refresh };
}
