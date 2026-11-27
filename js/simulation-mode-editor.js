import { createModeLayout, MODE_FAMILIES, MODE_FAMILY_IDS, LAYOUT_MODES, modeLayoutIcon, validateModeLayout } from './simulation-mode-layout.js';

const FAMILY_ICONS = { gravitationalSort: 'up', spiral: 'radial', ink: 'turbine2' };

export function createSimulationModeEditor({ getLayout, apply, canUse, getText, getLang, activeMode, selectMode, openTuning }) {
    const trigger = document.getElementById('btnSimulationModeEditor');
    const dialog = document.createElement('dialog');
    dialog.id = 'simulationModeEditor';
    dialog.className = 'mode-layout-dialog';
    dialog.setAttribute('aria-labelledby', 'simulationModeEditorTitle');
    dialog.innerHTML = `
        <h2 id="simulationModeEditorTitle" data-copy="title"></h2>
        <div class="mode-layout-family">
            <div id="modeLayoutFamily" role="group"></div>
            <p id="modeLayoutFamilyName"></p>
        </div>
        <div class="mode-layout-rows"></div>
        <div class="mode-layout-actions">
            <button type="button" data-copy="reset"></button>
            <button type="button" data-copy="import"></button>
            <button type="button" data-copy="export"></button>
            <input type="file" accept=".json,application/json" hidden>
        </div>
        <p role="status" class="mode-layout-status"></p>
        <div class="mode-layout-actions">
            <button type="button" data-copy="cancel"></button>
            <button type="button" class="mode-layout-primary" data-copy="apply"></button>
        </div>`;
    const picker = document.createElement('dialog');
    picker.id = 'assignedSimulationModes';
    picker.className = 'mode-layout-dialog mode-layout-picker';
    picker.setAttribute('aria-labelledby', 'assignedSimulationModesTitle');
    document.body.append(dialog, picker);
    const familyPicker = dialog.querySelector('#modeLayoutFamily');
    const familyCaption = dialog.querySelector('#modeLayoutFamilyName');
    const rows = dialog.querySelector('.mode-layout-rows');
    const file = dialog.querySelector('input[type=file]');
    const status = dialog.querySelector('[role=status]');
    const t = key => getText('mode_layout_' + key);
    const familyName = id => getText(MODE_FAMILIES[id].label);
    const modeName = id => getText(LAYOUT_MODES.get(id).label).split('\n')[0];
    const control = name => dialog.querySelector('[data-copy="' + name + '"]');
    let draft, selectedFamily, openTransfer;
    let session = 0;

    function button(label, action) {
        const element = document.createElement('button');
        element.type = 'button';
        element.textContent = label;
        element.addEventListener('click', action);
        return element;
    }

    function addModeMark(element, id) {
        const icon = modeLayoutIcon(id);
        if (icon) element.append(icon);
        const name = document.createElement('span');
        name.textContent = modeName(id);
        element.append(name);
    }

    function familyButton(family, action) {
        const choice = button('', action);
        choice.className = 'mode-layout-icon-button';
        choice.title = familyName(family);
        choice.setAttribute('aria-label', choice.title);
        choice.append(modeLayoutIcon(FAMILY_ICONS[family]));
        return choice;
    }

    function selectFamily(family) {
        selectedFamily = family;
        familyCaption.textContent = familyName(family);
        for (const choice of familyPicker.children) {
            choice.setAttribute('aria-pressed', String(choice.dataset.family === family));
        }
        rows.scrollTop = 0;
        renderRows();
    }

    function closeTransfer() {
        if (!openTransfer) return;
        openTransfer.destinations.hidden = true;
        openTransfer.move.setAttribute('aria-expanded', 'false');
        openTransfer = undefined;
    }

    function transferButtons(entries, index) {
        const entry = entries[index];
        const transfer = document.createElement('div');
        transfer.className = 'mode-layout-transfer';
        const destinations = document.createElement('span');
        destinations.setAttribute('role', 'group');
        destinations.id = 'modeLayoutDestinations-' + entry.id;
        destinations.setAttribute('aria-label', t('move') + ' · ' + modeName(entry.id));
        destinations.hidden = true;
        const move = button('', () => {
            const closing = openTransfer?.move === move;
            closeTransfer();
            if (closing) return;
            destinations.hidden = false;
            move.setAttribute('aria-expanded', 'true');
            openTransfer = { move, destinations };
        });
        move.className = 'mode-layout-icon-button';
        move.dataset.move = '';
        move.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15m-5-5 5 5-5 5"/></svg>';
        move.title = t('move');
        move.setAttribute('aria-label', t('move') + ' · ' + modeName(entry.id));
        move.setAttribute('aria-controls', destinations.id);
        move.setAttribute('aria-expanded', 'false');

        for (const family of MODE_FAMILY_IDS) {
            if (family === selectedFamily) continue;
            const choice = familyButton(family, () => {
                const scrollTop = rows.scrollTop;
                entries.splice(index, 1);
                draft.families[family].push(entry);
                renderRows();
                rows.scrollTop = scrollTop;
                const nextRow = rows.children[Math.min(index, entries.length - 1)];
                const focus = nextRow?.querySelector('[data-move]') ?? familyPicker.querySelector('[aria-pressed=true]');
                focus.focus({ preventScroll: true });
            });
            choice.dataset.destination = family;
            destinations.append(choice);
        }
        transfer.append(move, destinations);
        return transfer;
    }

    function orderButton(row, entries, index, offset) {
        const next = index + offset;
        const direction = offset < 0 ? 'up' : 'down';
        const control = button(offset < 0 ? '↑' : '↓', () => {
            [entries[index], entries[next]] = [entries[next], entries[index]];
            renderRows();
            const moved = rows.children[next];
            const same = moved.querySelector('[data-order="' + direction + '"]');
            (same.disabled ? moved.querySelector('[data-move]') : same).focus();
        });
        control.dataset.order = direction;
        control.setAttribute('aria-label', t(direction) + ' · ' + modeName(entries[index].id));
        control.disabled = next < 0 || next >= entries.length;
        row.append(control);
    }

    function renderRows() {
        const entries = draft.families[selectedFamily];
        closeTransfer();
        rows.replaceChildren();
        if (!entries.length) rows.textContent = t('empty');
        entries.forEach((entry, index) => {
            const row = document.createElement('div');
            row.className = 'mode-layout-row';
            row.dataset.mode = entry.id;
            const mark = document.createElement('div');
            mark.className = 'mode-layout-mark';
            addModeMark(mark, entry.id);
            const membership = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = entry.inCycle;
            checkbox.setAttribute('aria-label', t('cycle') + ' · ' + modeName(entry.id));
            checkbox.addEventListener('change', () => { entry.inCycle = checkbox.checked; });
            membership.append(checkbox, t('cycle'));
            row.append(mark, transferButtons(entries, index), membership);
            orderButton(row, entries, index, -1);
            orderButton(row, entries, index, 1);
            rows.append(row);
        });
    }

    trigger.addEventListener('click', () => {
        if (!canUse() || dialog.open) return;
        draft = structuredClone(getLayout());
        dialog.dir = getLang() === 'he' ? 'rtl' : 'ltr';
        dialog.querySelectorAll('[data-copy]').forEach(el => { el.textContent = t(el.dataset.copy); });
        familyPicker.setAttribute('aria-label', t('family'));
        familyPicker.replaceChildren(...MODE_FAMILY_IDS.map(family => {
            const choice = familyButton(family, () => selectFamily(family));
            choice.dataset.family = family;
            return choice;
        }));
        status.textContent = '';
        selectFamily(MODE_FAMILY_IDS[0]);
        dialog.showModal();
        familyPicker.firstElementChild.focus();
    });
    dialog.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || !openTransfer) return;
        event.preventDefault();
        const { move } = openTransfer;
        closeTransfer();
        move.focus();
    });
    dialog.addEventListener('close', () => { session++; });
    control('cancel').addEventListener('click', () => dialog.close());
    control('reset').addEventListener('click', () => {
        session++;
        draft = createModeLayout();
        status.textContent = t('reset_ready');
        renderRows();
    });
    control('export').addEventListener('click', () => {
        const link = document.createElement('a');
        const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' }));
        link.href = url;
        link.download = 'evolution-mode-layout.json';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    control('import').addEventListener('click', () => file.click());
    file.addEventListener('change', async () => {
        const [selected] = file.files;
        file.value = '';
        if (!selected) return;
        const request = ++session;
        let imported;
        try {
            if (selected.size <= 65536) imported = validateModeLayout(JSON.parse(await selected.text()));
        } catch {
            // Keep the current draft.
        }
        if (!dialog.open || request !== session) return;
        status.textContent = t(imported ? 'imported' : 'invalid');
        if (!imported) return;
        draft = imported;
        renderRows();
    });
    control('apply').addEventListener('click', () => {
        if (!apply(draft)) {
            status.textContent = t('apply_failed');
            return;
        }
        dialog.close();
        document.getElementById('technicianDialog').close();
    });

    return {
        openFamily(family) {
            if (picker.open) return;
            const heading = document.createElement('h2');
            heading.id = 'assignedSimulationModesTitle';
            heading.textContent = familyName(family);
            const list = document.createElement('div');
            list.className = 'mode-layout-rows';
            const selected = activeMode(family);
            const entries = getLayout().families[family];
            if (!entries.length) list.textContent = t('empty');
            for (const { id, inCycle } of entries) {
                const option = button('', () => {
                    picker.close();
                    selectMode(id);
                });
                option.className = 'mode-layout-option';
                option.dataset.mode = id;
                option.setAttribute('aria-pressed', String(id === selected));
                addModeMark(option, id);
                const membership = document.createElement('small');
                membership.textContent = t(inCycle ? 'cycle' : 'parked');
                option.append(membership);
                list.append(option);
            }
            const actions = document.createElement('div');
            actions.className = 'mode-layout-actions';
            actions.append(button(t('cancel'), () => picker.close()));
            if (openTuning(selected, false)) actions.append(button(t('tuning'), () => {
                picker.close();
                openTuning(selected, true);
            }));
            picker.dir = getLang() === 'he' ? 'rtl' : 'ltr';
            picker.replaceChildren(heading, list, actions);
            picker.showModal();
        }
    };
}
