import { loadSimulationLayout, persistSimulationLayout, swapSimulationSlots } from './simulation-layout.js';
import { getEvolutionExplanation } from './evolution-explanation.js';
import { getCurrentLang } from './i18n.js';

// A local presentation preference: no board, engine, logger or profile mutations.
export function initializeSimulationLayout({ pager, button, getText }) {
    const dialog = document.getElementById('simulationLayoutDialog');
    const form = document.getElementById('simulationLayoutForm');
    const slots = document.getElementById('simulationLayoutSlots');
    const status = document.getElementById('simulationLayoutStatus');
    const defaults = pager.getLayout();
    const items = new Map(pager.getEntries().map(item => [item.simulation, item]));
    const icons = new Map([...items].map(([id, {element}]) => {
        const svg = element.querySelector('svg').cloneNode(true);
        svg.removeAttribute('id'); svg.removeAttribute('style');
        svg.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
        svg.setAttribute('aria-hidden', 'true');
        return [id, svg];
    }));
    let draft = [], selected = -1;
    pager.setLayout(loadSimulationLayout(defaults));
    const name = id => getEvolutionExplanation(id, getCurrentLang())[0];
    const cells = [];
    for (let page = 0; page < 2; page++) {
        const section = document.createElement('section');
        const heading = document.createElement('h3');
        heading.id = `simulationLayoutPage${page}`;
        section.setAttribute('aria-labelledby', heading.id);
        const grid = document.createElement('div'); grid.className = 'simulation-layout-grid';
        for (let slot = 0; slot < 6; slot++) {
            const index = page * 6 + slot;
            const cell = document.createElement('button');
            cell.type = 'button'; cell.className = 'simulation-layout-slot';
            cell.dataset.layoutSlot = String(index);
            cell.addEventListener('click', () => {
                if (selected === index) selected = -1;
                else if (selected < 0) selected = index;
                else { draft = swapSimulationSlots(draft, selected, index); selected = -1; }
                render();
                status.textContent = selected < 0 ? '' : getText('sim_arrange_choose_target');
            });
            cells.push(cell); grid.append(cell);
        }
        section.append(heading, grid); slots.append(section);
    }
    function render() {
        for (let page = 0; page < 2; page++) document.getElementById(`simulationLayoutPage${page}`).textContent = `${getText('sim_arrange_page')} ${page + 1}`;
        cells.forEach((cell, index) => {
            const id = draft[index];
            const label = document.createElement('span'); label.textContent = name(id); label.dir = 'auto';
            const number = document.createElement('small'); number.textContent = String(index % 6 + 1);
            cell.dataset.simulation = id;
            cell.replaceChildren(number, icons.get(id).cloneNode(true), label);
            cell.setAttribute('aria-pressed', String(selected === index));
            cell.setAttribute('aria-label', `${getText('sim_arrange_page')} ${Math.floor(index / 6) + 1}, ${index % 6 + 1}: ${name(id)}`);
        });
    }
    function refresh() {
        dialog.dir = getCurrentLang() === 'he' ? 'rtl' : 'ltr';
        button.title = getText('sim_arrange_title'); button.setAttribute('aria-label', button.title);
        dialog.querySelectorAll('[data-layout-text]').forEach(element => { element.textContent = getText(element.dataset.layoutText); });
        document.getElementById('btnSimulationLayoutClose').setAttribute('aria-label', getText('saveModal_close'));
        if (dialog.open) { render(); status.textContent = selected < 0 ? '' : getText('sim_arrange_choose_target'); }
    }
    button.addEventListener('click', () => {
        draft = pager.getLayout(); selected = -1; refresh(); render();
        status.textContent = '';
        dialog.showModal(); cells[0].focus();
    });
    document.getElementById('btnSimulationLayoutReset').addEventListener('click', () => {
        draft = [...defaults]; selected = -1; render(); status.textContent = '';
    });
    for (const id of ['btnSimulationLayoutClose', 'btnSimulationLayoutCancel']) document.getElementById(id).addEventListener('click', () => dialog.close());
    form.addEventListener('submit', event => {
        event.preventDefault();
        if (pager.isChanging || !persistSimulationLayout(draft)) { status.textContent = getText('sim_arrange_save_error'); return; }
        pager.setLayout(draft); dialog.close();
    });
    dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const box = dialog.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => button.focus({preventScroll: true}));
    refresh();
    return { refresh };
}
