// Presentation only: page changes never arm, pause, log or mutate a simulation.
export function createSimulationPages({ container, button, pages, getSelected, isRunning, getText, reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches }) {
    let page = 0, changing = false;
    let entries = pages.flatMap((items, index) => items.map(([simulation, element], slot) => {
        element.dataset.simPage = String(index);
        element.dataset.simSlot = String(slot);
        return { simulation, element, page: index };
    }));
    function refresh() {
        const selected = entries.find(item => item.simulation === getSelected());
        const elsewhere = isRunning() && !!selected && selected.page !== page;
        button.toggleAttribute('data-active-elsewhere', elsewhere);
        const label = `${getText(page === 0 ? 'sim_page_next' : 'sim_page_previous')} · ${page + 1}/${pages.length}` +
            (elsewhere ? ` · ${getText('sim_page_active_elsewhere')}` : '');
        button.title = label;
        button.setAttribute('aria-label', label);
    }
    function render() {
        container.dataset.simulationPage = String(page);
        entries.forEach(item => { item.element.hidden = item.page !== page; });
        button.querySelector('[data-page-arrow]').setAttribute('d', page === 0 ? 'M9 7l5 5-5 5' : 'M14 7l-5 5 5 5');
        button.querySelectorAll('[data-page-dot]').forEach((dot, index) => {
            dot.setAttribute('opacity', index === page ? '1' : '.3');
        });
        refresh();
    }
    async function toggle() {
        if (changing) return;
        changing = true;
        button.setAttribute('aria-busy', 'true');
        const outgoing = entries.filter(item => item.page === page).map(item => item.element);
        const move = page === 0 ? -8 : 8;
        try {
            if (!reducedMotion()) {
                await Promise.all(outgoing.map(element => element.animate([
                    { opacity: 1, translate: '0px' }, { opacity: 0, translate: `${move}px` }
                ], { duration: 75, easing: 'ease-out' }).finished.catch(() => {})));
            }
            // If the outgoing button held keyboard focus, keep focus on navigation.
            if (outgoing.includes(container.ownerDocument.activeElement)) button.focus({ preventScroll: true });
            page = (page + 1) % pages.length;
            render();
            if (!reducedMotion()) {
                await Promise.all(entries.filter(item => item.page === page).map(({element}) => element.animate([
                    { opacity: 0, translate: `${-move}px` }, { opacity: 1, translate: '0px' }
                ], { duration: 125, easing: 'ease-out' }).finished.catch(() => {})));
            }
        } finally {
            changing = false;
            button.removeAttribute('aria-busy');
        }
    }
    button.addEventListener('click', toggle);
    render();
    return {
        refresh, reset() { if (!changing) { page = 0; render(); } },
        getEntries: () => entries.map(({simulation, element}) => ({simulation, element})),
        getLayout: () => entries.map(item => item.simulation),
        setLayout(order) {
            if (changing || !Array.isArray(order) || order.length !== entries.length ||
                new Set(order).size !== entries.length || order.some(id => !entries.some(item => item.simulation === id))) return false;
            const byId = new Map(entries.map(item => [item.simulation, item]));
            entries = order.map(id => byId.get(id));
            let index = 0;
            pages.forEach((items, pageIndex) => items.forEach((_, slot) => {
                const item = entries[index++];
                item.page = pageIndex;
                item.element.dataset.simPage = String(pageIndex);
                item.element.dataset.simSlot = String(slot);
            }));
            render();
            return true;
        },
        get isChanging() { return changing; }, get page() { return page; }
    };
}
