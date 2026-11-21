import { EVOLUTION_CATALOG } from './evolution-drawer-settings.js';
import { SIMULATION_MODES, validateSimulationFamilies } from './simulation-families.js';
import { focusSettingsHeading } from './dialog-focus.js';

export function createSimulationFamilyEditor({ getLayout, getDefault, apply, canEdit, familyName, modeName, icon, getText, getLang }) {
    const trigger = document.getElementById('btnSimulationFamilyEditor');
    const technician = document.getElementById('technicianDialog');
    const dialog = document.createElement('dialog');
    dialog.id = 'simulationFamilyEditor';
    dialog.className = 'erosion-settings-dialog simulation-family-editor';
    dialog.setAttribute('aria-labelledby', 'simulationFamilyTitle');
    dialog.innerHTML = `<form>
      <header><h2 id="simulationFamilyTitle" data-copy="title"></h2><button type="button" data-close data-copy="cancel"></button></header>
      <div class="family-toolbar"><button type="button" data-undo data-copy="undo"></button><button type="button" data-reset data-copy="reset"></button>
        <button type="button" data-export data-copy="export"></button><button type="button" data-import data-copy="import"></button>
        <input type="file" accept=".json,application/json" hidden></div>
      <div class="family-workspace"><nav aria-label="" class="family-list"></nav><select class="family-picker"></select><section class="family-detail"></section></div>
      <footer><p role="status" data-status></p><button type="submit" class="save-btn" data-copy="apply"></button></footer></form>`;
    document.body.append(dialog);
    const file = dialog.querySelector('input[type=file]'), status = dialog.querySelector('[data-status]');
    const list = dialog.querySelector('.family-list'), detail = dialog.querySelector('.family-detail');
    const picker = dialog.querySelector('.family-picker');
    picker.addEventListener('change', () => { selected = picker.value; render(); });
    const t = key => getText('families_' + key);
    let draft, selected, dragged, undo = [], session = 0;

    function update(change, focus) {
        undo.push(structuredClone(draft));
        draft.enabled = true;
        change();
        status.textContent = '';
        render(focus);
    }

    function move(modeId, to, before) {
        dragged = null;
        const source = draft.families.find(group => group.modes.some(mode => mode.id === modeId));
        const target = draft.families.find(group => group.id === to);
        if (!source || !target || modeId === before || source === target && !before) return;
        update(() => {
            const [mode] = source.modes.splice(source.modes.findIndex(item => item.id === modeId), 1);
            const position = target.modes.findIndex(item => item.id === before);
            target.modes.splice(position < 0 ? target.modes.length : position, 0, mode);
            selected = to;
        }, modeId);
    }

    function render(focus) {
        const listScroll = [list.scrollLeft, list.scrollTop], detailScroll = detail.scrollTop;
        dialog.dir = getLang() === 'he' ? 'rtl' : 'ltr';
        dialog.querySelectorAll('[data-copy]').forEach(el => { el.textContent = t(el.dataset.copy); });
        list.setAttribute('aria-label', t('title'));
        dialog.querySelector('[data-undo]').disabled = undo.length === 0;
        list.replaceChildren();
        picker.replaceChildren();
        picker.setAttribute('aria-label', t('title'));
        for (const group of draft.families) {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.family = group.id;
            button.textContent = group.name ?? familyName(group.id);
            picker.add(new Option(button.textContent, group.id));
            button.setAttribute('aria-pressed', String(selected === group.id));
            button.addEventListener('click', () => { selected = group.id; render(); list.querySelector('[aria-pressed=true]').focus(); });
            button.addEventListener('dragover', event => { if (dragged) event.preventDefault(); });
            button.addEventListener('drop', event => { event.preventDefault(); move(dragged, group.id); });
            list.append(button);
        }

        picker.value = selected;
        const group = draft.families.find(item => item.id === selected);
        const heading = document.createElement('h3');
        heading.textContent = group.name ?? familyName(selected);
        const name = document.createElement('input');
        name.type = 'text'; name.maxLength = 64;
        name.placeholder = familyName(selected); name.value = group.name ?? '';
        name.setAttribute('aria-label', t('name'));
        name.addEventListener('change', () => {
            const value = name.value.trim();
            if (value === (group.name ?? '')) return;
            undo.push(structuredClone(draft));
            draft.enabled = true;
            if (value) group.name = value;
            else delete group.name;
            heading.textContent = group.name ?? familyName(selected);
            list.querySelector('[aria-pressed=true]').textContent = heading.textContent;
            picker.selectedOptions[0].textContent = heading.textContent;
            dialog.querySelector('[data-undo]').disabled = false;
        });
        detail.replaceChildren(heading, name);
        if (group.modes.length === 0) {
            const empty = document.createElement('p');
            empty.textContent = t('empty'); detail.append(empty);
        }
        group.modes.forEach(({ id, inCycle }, index) => {
            const mode = SIMULATION_MODES.get(id), name = modeName(mode);
            const row = document.createElement('div');
            row.className = 'family-mode';
            row.dataset.mode = id;

            const title = document.createElement('span');
            title.className = 'family-mode-name';
            const grip = document.createElement('span');
            grip.className = 'family-grip'; grip.draggable = true;
            grip.textContent = '⠿'; grip.setAttribute('aria-hidden', 'true');
            grip.addEventListener('dragstart', event => {
                dragged = id;
                event.dataTransfer.setData('text/plain', id);
                event.dataTransfer.effectAllowed = 'move';
            });
            grip.addEventListener('dragend', () => { dragged = null; });
            title.append(grip, icon(mode), name);
            const label = document.createElement('label'), check = document.createElement('input');
            check.type = 'checkbox'; check.checked = inCycle;
            check.setAttribute('aria-label', name + ' · ' + t('cycle'));
            check.addEventListener('change', () => update(() => { group.modes[index].inCycle = check.checked; }, id));
            label.append(check, t('cycle'));

            const destination = document.createElement('select');
            destination.setAttribute('aria-label', t('move') + ' · ' + name);
            destination.add(new Option(t('move'), ''));
            for (const { id: family } of EVOLUTION_CATALOG) {
                if (family !== selected) destination.add(new Option(familyName(family), family));
            }
            destination.addEventListener('change', () => move(id, destination.value));

            const order = document.createElement('span');
            order.className = 'family-order';
            for (const [offset, arrow, key] of [[-1, '↑', 'earlier'], [1, '↓', 'later']]) {
                const button = document.createElement('button');
                button.type = 'button'; button.textContent = arrow;
                button.disabled = !group.modes[index + offset];
                button.setAttribute('aria-label', t(key) + ' · ' + name);
                button.addEventListener('click', () => update(() => {
                    [group.modes[index], group.modes[index + offset]] = [group.modes[index + offset], group.modes[index]];
                }, id));
                order.append(button);
            }
            row.addEventListener('dragover', event => { if (dragged) event.preventDefault(); });
            row.addEventListener('drop', event => { event.preventDefault(); move(dragged, selected, id); });
            row.append(title, label, destination, order);
            detail.append(row);
        });
        list.scrollTo(...listScroll);
        detail.scrollTop = detailScroll;
        if (focus) [...detail.querySelectorAll('[data-mode]')].find(row => row.dataset.mode === focus)?.querySelector('input')?.focus({ preventScroll: true });
    }

    function open() {
        if (!canEdit() || dialog.open) return;
        draft = structuredClone(getLayout() ?? getDefault());
        selected = draft.families[0].id;
        list.scrollTo(0, 0); detail.scrollTop = 0;
        undo = []; status.textContent = ''; render();
        dialog.showModal(); focusSettingsHeading(dialog);
    }
    trigger.addEventListener('click', open);
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-undo]').addEventListener('click', () => {
        if (undo.length) { draft = undo.pop(); render(); }
    });
    dialog.querySelector('[data-reset]').addEventListener('click', () => update(() => { draft = getDefault(); }));
    dialog.querySelector('[data-export]').addEventListener('click', () => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(validateSimulationFamilies(draft), null, 2)], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url; link.download = 'FYI-simulation-families.json'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    dialog.querySelector('[data-import]').addEventListener('click', () => file.click());
    file.addEventListener('change', async () => {
        const incoming = file.files[0], currentSession = session;
        file.value = '';
        if (!incoming) return;
        try {
            if (incoming.size > 1024 * 1024) throw new Error('File too large');
            const value = validateSimulationFamilies(JSON.parse(await incoming.text()));
            if (dialog.open && session === currentSession) update(() => { draft = value; });
        } catch {
            if (dialog.open && session === currentSession) status.textContent = t('invalid');
        }
    });
    dialog.querySelector('form').addEventListener('submit', event => {
        event.preventDefault();
        if (!canEdit()) { status.textContent = t('pause'); return; }
        if (!apply(validateSimulationFamilies(draft))) { status.textContent = t('storage'); return; }
        dialog.close('applied');
    });
    dialog.addEventListener('close', () => {
        session++; draft = null; dragged = null;
        if (dialog.returnValue === 'applied') technician.close();
        else trigger.focus();
        dialog.returnValue = '';
    });
    return { open };
}

export function createSimulationFamilyMenu({ familyName, modeName, getText, getLang, select, openSettings }) {
    const dialog = document.createElement('dialog');
    dialog.className = 'erosion-settings-dialog simulation-family-menu';
    dialog.setAttribute('aria-labelledby', 'simulationFamilyMenuTitle');
    dialog.innerHTML = '<h2 id="simulationFamilyMenuTitle"></h2><div></div><button type="button"></button>';
    document.body.append(dialog);
    const actions = dialog.querySelector('div'), cancel = dialog.lastElementChild;
    cancel.addEventListener('click', () => dialog.close());
    function add(text, callback) {
        const button = document.createElement('button');
        button.type = 'button'; button.textContent = text;
        button.addEventListener('click', () => { dialog.close(); callback(); });
        actions.append(button);
    }
    return (group, active) => {
        if (dialog.open) return;
        dialog.dir = getLang() === 'he' ? 'rtl' : 'ltr';
        dialog.querySelector('h2').textContent = group.name ?? familyName(group.id);
        cancel.textContent = getText('gs_modal_cancel');
        actions.replaceChildren();
        if (active) add(getText('families_settings') + ' · ' + modeName(active), () => openSettings(active));
        for (const item of group.modes.filter(mode => !mode.inCycle && mode.id !== active?.key)) {
            const mode = SIMULATION_MODES.get(item.id);
            add(modeName(mode), () => select(mode));
        }
        dialog.showModal(); focusSettingsHeading(dialog);
    };
}
