import { getCurrentLang, onLanguageChange } from './i18n.js';

// Display copy only. Simulation names, rules and recorded events stay untouched.
export const evolutionExplanations = {
    islands: [
        ['Islands', 'Pixels copy a random neighbor’s color, gradually forming islands of color.'],
        ['איים', 'פיקסלים מעתיקים צבע משכן אקראי ויוצרים בהדרגה איים של צבע.'],
        ['Острова', 'Пиксели копируют цвет случайного соседа, постепенно образуя цветные острова.'],
        ['Eilanden', 'Pixels nemen de kleur van een willekeurige buur over en vormen geleidelijk kleureilanden.']
    ],
    gameOfLife: [
        ['Game of Life', 'Pixels appear and disappear according to their living neighbors.'],
        ['משחק החיים', 'פיקסלים מופיעים ונעלמים לפי השכנים החיים שלהם.'],
        ['Игра «Жизнь»', 'Пиксели появляются и исчезают в зависимости от живых соседей.'],
        ['Game of Life', 'Pixels verschijnen en verdwijnen op basis van hun levende buren.']
    ],
    sandpile: [
        ['Chi Flow', 'Nearby colors influence each pixel, creating flowing, changing patterns.'],
        ['צ׳י פלו', 'צבעים סמוכים משפיעים על כל פיקסל ויוצרים דפוסים זורמים ומשתנים.'],
        ['Поток Ци', 'Соседние цвета влияют на каждый пиксель, создавая текучие узоры.'],
        ['Chi Flow', 'Nabije kleuren beïnvloeden elke pixel en vormen vloeiende patronen.']
    ],
    gravitationalSort: [
        ['Gravity', 'Arrange colors in a chosen direction, following the palette’s order.'],
        ['גרביטציה', 'הצבעים מסתדרים בכיוון הנבחר, לפי סדר הפלטה.'],
        ['Гравитация', 'Цвета выстраиваются в выбранном направлении по порядку палитры.'],
        ['Zwaartekracht', 'Orden kleuren in een gekozen richting, volgens de volgorde van het palet.']
    ],
    spiral: [
        ['Spiral', 'Arrange colors around the center in spirals and geometric patterns.'],
        ['ספירלה', 'הצבעים מסתדרים סביב המרכז בספירלות ובצורות גאומטריות.'],
        ['Спираль', 'Цвета выстраиваются вокруг центра в спирали и геометрические узоры.'],
        ['Spiraal', 'Orden kleuren rond het midden in spiralen en geometrische patronen.']
    ],
    magnet: [
        ['Magnet', 'Draw colors toward an anchor color, forming shifting patterns.'],
        ['מגנט', 'הצבעים נמשכים לצבע עוגן ויוצרים דפוסים משתנים.'],
        ['Магнит', 'Цвета притягиваются к опорному цвету, создавая меняющиеся узоры.'],
        ['Magneet', 'Trek kleuren naar een ankerkleur en vorm veranderende patronen.']
    ],
    contour: [
        ['Contours', 'Reveal color boundaries, or grow branching fractures in experimental Cracks mode.'],
        ['קווי מתאר', 'גלו גבולות בין צבעים, או הצמיחו סדקים מסתעפים במצב הסדקים הניסיוני.'],
        ['Контуры', 'Проявляйте границы цветов или выращивайте ветвящиеся трещины в экспериментальном режиме.'],
        ['Contouren', 'Toon kleurgrenzen of laat vertakkende breuken groeien in de experimentele scheurenmodus.']
    ],
    turing: [
        ['Turing', 'Two interacting forces create spots, stripes and organic patterns.'],
        ['טיורינג', 'שני כוחות שמשפיעים זה על זה יוצרים כתמים, פסים ודפוסים אורגניים.'],
        ['Тьюринг', 'Две взаимодействующие силы создают пятна, полосы и природные узоры.'],
        ['Turing', 'Twee wisselwerkende krachten maken vlekken, strepen en organische patronen.']
    ],
    brightnessEvo: [
        ['Brightness', 'Bring neighboring colors closer together, or deepen their contrasts.'],
        ['בהירות', 'צבעים שכנים מתקרבים זה לזה, או מגדילים את הניגוד ביניהם.'],
        ['Яркость', 'Сближайте соседние цвета или усиливайте контраст между ними.'],
        ['Helderheid', 'Breng naburige kleuren dichter bij elkaar of vergroot hun contrast.']
    ],
    breathe: [
        ['Breathe', 'Let colors gently brighten and dim, like a slow breath.'],
        ['נשימה', 'הצבעים מתבהרים ומתכהים בעדינות, כמו נשימה איטית.'],
        ['Дыхание', 'Цвета плавно светлеют и темнеют, словно медленное дыхание.'],
        ['Ademen', 'Laat kleuren zacht oplichten en dimmen, als een rustige ademhaling.']
    ],
    erosion: [
        ['Erosion', 'Water flows through air and gradually wears away earth, using groups of palette colors.'],
        ['שחיקה', 'מים זורמים דרך אוויר ושוחקים אדמה בהדרגה, לפי קבוצות הצבעים בפלטה.'],
        ['Эрозия', 'Вода течёт сквозь воздух и постепенно размывает землю — группы цветов палитры.'],
        ['Erosie', 'Water stroomt door lucht en slijt aarde geleidelijk weg, volgens kleurgroepen in het palet.']
    ],
    dla: [
        ['DLA', 'Wandering particles join a growing cluster, forming branching shapes.'],
        ['DLA', 'חלקיקים נודדים מצטרפים למבנה צומח ויוצרים צורות מסתעפות.'],
        ['DLA', 'Блуждающие частицы присоединяются к растущему скоплению, образуя ветви.'],
        ['DLA', 'Dwalende deeltjes sluiten aan bij een groeiende groep en vormen vertakkingen.']
    ],
    nudgeBrighter: [
        ['Nudge forward', 'Shift colors one step forward through the palette.'],
        ['דחיפה קדימה', 'הצבעים זזים צעד אחד קדימה בסדר הפלטה.'],
        ['Сдвиг вперёд', 'Сдвигайте цвета на один шаг вперёд по палитре.'],
        ['Stap vooruit', 'Schuif kleuren één stap vooruit door het palet.']
    ],
    nudgeDarker: [
        ['Nudge backward', 'Shift colors one step backward through the palette.'],
        ['דחיפה אחורה', 'הצבעים זזים צעד אחד אחורה בסדר הפלטה.'],
        ['Сдвиг назад', 'Сдвигайте цвета на один шаг назад по палитре.'],
        ['Stap terug', 'Schuif kleuren één stap terug door het palet.']
    ]
};

export function getEvolutionExplanation(simulation, lang) {
    return evolutionExplanations[simulation]?.[['en', 'he', 'ru', 'nl'].indexOf(lang)] ||
        evolutionExplanations[simulation]?.[0];
}

export function createEvolutionExplanation(host, { onHelp } = {}) {
    const panel = document.createElement('div');
    panel.className = 'evolution-explanation';
    panel.hidden = true;
    panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'evolutionExplanationTitle');
    panel.setAttribute('aria-describedby', 'evolutionExplanationText');
    panel.innerHTML = '<div class="evolution-explanation-icon" aria-hidden="true"></div><h2 id="evolutionExplanationTitle"></h2><p id="evolutionExplanationText"></p><button type="button" class="evolution-explanation-help">WTF</button>';
    host.append(panel);
    const icon = panel.firstElementChild;
    const title = panel.querySelector('h2'), text = panel.querySelector('p');
    const help = panel.querySelector('button');
    help.hidden = !onHelp;
    let active = false, closing = false, faded = false, simulation, opener, timer, serial = 0;
    let helpPointer = null, openHelpAfterFade = false;
    const pointers = new Set(), blockedPointers = new Set(), keys = new Set();
    function consume(event) { event.preventDefault(); event.stopImmediatePropagation(); }
    function refresh() {
        if (!active) return;
        const lang = getCurrentLang();
        [title.textContent, text.textContent] = getEvolutionExplanation(simulation, lang);
        panel.dir = lang === 'he' ? 'rtl' : 'ltr';
        panel.lang = lang;
    }
    onLanguageChange(refresh);
    function finish() {
        if (!closing || !faded || pointers.size || keys.size) return;
        active = closing = false;
        panel.hidden = true;
        blockedPointers.clear();
        opener?.focus({ preventScroll: true });
        if (openHelpAfterFade) {
            openHelpAfterFade = false;
            onHelp();
        }
    }
    function close() {
        if (!active || closing) return;
        closing = true;
        panel.classList.remove('is-visible');
        timer = setTimeout(() => { faded = true; finish(); },
            window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650);
    }
    document.addEventListener('pointerdown', event => {
        pointers.add(event.pointerId);
        if (!active) return;
        blockedPointers.add(event.pointerId);
        consume(event);
        if (!closing && onHelp && event.target === help) {
            helpPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
            return;
        }
        close();
    }, true);
    function release(event) {
        pointers.delete(event.pointerId);
        // The opening hold must reach the gesture handler when released.
        if (blockedPointers.delete(event.pointerId)) consume(event);
        if (helpPointer?.id === event.pointerId) {
            openHelpAfterFade = event.type === 'pointerup' && event.target === help &&
                Math.hypot(event.clientX - helpPointer.x, event.clientY - helpPointer.y) < 8;
            helpPointer = null;
            close();
        }
        setTimeout(finish, 0);
    }
    document.addEventListener('pointerup', release, true);
    document.addEventListener('pointercancel', release, true);
    document.addEventListener('click', event => {
        if (!active) return;
        consume(event);
        if (event.detail === 0) {
            if (!closing && onHelp && event.target === help) openHelpAfterFade = true;
            close();
        }
    }, true);
    document.addEventListener('keydown', event => {
        if (!active) return;
        keys.add(event.code || event.key);
        consume(event);
        if (!closing && onHelp && event.target === help && ['Enter', 'Space'].includes(event.code)) openHelpAfterFade = true;
        close();
    }, true);
    document.addEventListener('keyup', event => {
        if (!keys.delete(event.code || event.key)) return;
        consume(event);
        setTimeout(finish, 0);
    }, true);
    for (const type of ['wheel', 'touchmove']) {
        document.addEventListener(type, event => { if (active) consume(event); }, { capture: true, passive: false });
    }
    function abandon() {
        helpPointer = null; openHelpAfterFade = false;
        pointers.clear(); blockedPointers.clear(); keys.clear();
        close(); finish();
    }
    window.addEventListener('blur', abandon);
    document.addEventListener('visibilitychange', () => { if (document.hidden) abandon(); });
    return {
        isOpen: () => active,
        show(button, id) {
            if (active || !evolutionExplanations[id]) return;
            simulation = id; opener = button;
            active = true; closing = faded = false;
            helpPointer = null; openHelpAfterFade = false;
            clearTimeout(timer);
            icon.replaceChildren();
            const svgs = [...button.querySelectorAll(':scope > svg')];
            const source = svgs.find(svg => getComputedStyle(svg).display !== 'none') || svgs[0];
            if (source) {
                const clone = source.cloneNode(true), ids = new Map();
                const originals = [source, ...source.querySelectorAll('*')];
                [clone, ...clone.querySelectorAll('*')].forEach((node, index) => {
                    // Some variants use CSS on the control rather than SVG attributes.
                    const style = getComputedStyle(originals[index]);
                    for (const property of ['display', 'visibility', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity']) {
                        let value = style.getPropertyValue(property);
                        // Preserve geometry and mode visibility, not the control's on/off color.
                        if ((property === 'fill' || property === 'stroke') && value !== 'none') value = 'var(--gold)';
                        node.style.setProperty(property, value);
                    }
                });
                // SVG gradients and masks must not reuse the original control IDs.
                clone.querySelectorAll('[id]').forEach(node => {
                    const old = node.id, next = `explanation-${++serial}-${old}`;
                    ids.set(old, next); node.id = next;
                });
                for (const node of [clone, ...clone.querySelectorAll('*')]) {
                    for (const attr of [...node.attributes]) {
                        let value = attr.value;
                        ids.forEach((next, old) => { value = value.replaceAll(`url(#${old})`, `url(#${next})`); if (value === `#${old}`) value = `#${next}`; });
                        if (value !== attr.value) node.setAttribute(attr.name, value);
                    }
                }
                clone.removeAttribute('id');
                clone.style.display = 'block';
                icon.append(clone);
            }
            refresh(); panel.hidden = false;
            panel.focus({ preventScroll: true });
            requestAnimationFrame(() => { if (active && !closing) panel.classList.add('is-visible'); });
        }
    };
}
