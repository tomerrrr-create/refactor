import { getCurrentLang, onLanguageChange } from './i18n.js';

// Display copy only. Simulation names, rules and recorded events stay untouched.
export const evolutionExplanations = {
    fractals: [
        ['Fractals', 'Julia zooms into a shape that changes as you draw. In 2D XOR, draw seeds and watch their fractals meet and cancel.'],
        ['פרקטלים', 'ג׳וליה מתקרבת לצורה שמשתנה כשמציירים. ב־XOR דו־ממדי מציירים נקודות ורואים את הפרקטלים נפגשים ומבטלים זה את זה.'],
        ['Фракталы', 'Рисуйте, чтобы менять приближающийся фрактал Жюлиа. В двумерном XOR рисуйте точки и наблюдайте, как узоры встречаются и гасят друг друга.'],
        ['Fractalen', 'Julia zoomt in op een vorm die verandert als je tekent. Teken punten in 2D-XOR en kijk hoe patronen elkaar ontmoeten en uitdoven.']
    ],
    fibonacci: [
        ['Fibonacci', 'Grow a square spiral across the whole board. Start one new spiral, or let it branch into two.'],
        ['פיבונאצ׳י', 'ספירלת ריבועים צומחת על כל הלוח. אפשר להתחיל ספירלה חדשה או להסתעף לשתיים.'],
        ['Фибоначчи', 'Спираль из квадратов заполняет поле. Можно начать новую спираль или дать ей разделиться на две.'],
        ['Fibonacci', 'Laat een vierkantenspiraal over het hele bord groeien. Start een nieuwe spiraal of laat die zich in twee vertakken.']
    ],
    network: [
        ['Living network','Threads grow from your patches, branch, strengthen and fade. Cycle palette-guided or spatial growth.'],
        ['רשת חיה','חוטים צומחים מהכתמים, מסתעפים, מתחזקים ודועכים. אפשר לעבור בין צמיחה לפי הפלטה לצמיחה מרחבית.'],
        ['Живая сеть','Нити растут из пятен, ветвятся, крепнут и исчезают. Выбирайте рост по палитре или пространственный рост.'],
        ['Levend netwerk','Draden groeien uit vlekken, vertakken, versterken en vervagen. Wissel tussen paletgestuurde en ruimtelijke groei.']
    ],
    ink: [
        ['Color Vortices','Existing colors stretch and curl into vortices. New strokes feed the motion, and changing palette order changes how the colors drift.'],
        ['מערבולות צבע','הצבעים שכבר על הלוח נמתחים ומסתחררים במערבולות. משיכות חדשות מזינות את התנועה, וסדר הפלטה משנה איך הצבעים נסחפים.'],
        ['Цветовые вихри','Цвета на доске растягиваются и закручиваются в вихри. Новые мазки усиливают движение, а порядок палитры меняет перенос цветов.'],
        ['Kleurwervels','De kleuren op het bord rekken uit en draaien in wervels. Nieuwe streken voeden de beweging. De paletvolgorde verandert hoe de kleuren meedrijven.']
    ],
    islands: [
        ['Islands','The leaf copies neighboring colors. The drop gathers pigments into pools. Swipe up on the drop for presets and settings.'],
        ['איים','העלה מעתיק צבעים שכנים. הטיפה מרכזת צבעים בכתמים. החליקו למעלה על הטיפה לבחירת פריסט או לכוונון ההגדרות.'],
        ['Острова','Лист копирует соседние цвета. Капля собирает пигменты в пятна. Смахните вверх на капле для выбора готового варианта или настройки масла.'],
        ['Eilanden','Het blad kopieert buurkleuren. De druppel groepeert pigmenten. Veeg omhoog op de druppel voor presets en instellingen.']
    ],
    cymatics: [
        ['Cymatics', 'Existing colors gather along the quiet lines of standing waves, forming Chladni-inspired patterns.'],
        ['סימטיקה', 'הצבעים נאספים לאורך קווי השקט של גלים עומדים ויוצרים תבניות בהשראת צורות כלדני.'],
        ['Киматика', 'Цвета собираются вдоль узлов стоячих волн, образуя узоры по мотивам фигур Хладни.'],
        ['Cymatica', 'Kleuren verzamelen zich langs knooplijnen van staande golven en vormen Chladni-patronen.']
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
        ['Geometric Flow', 'Guide colors along a diamond or hexagon, or pull the first colors in the palette toward either diagonal.'],
        ['זרימה גאומטרית', 'הצבעים זורמים לאורך צלעות המצולע. באריג משולשים, משולשים שכנים מסתובבים בכיוונים הפוכים.'],
        ['Геометрический поток', 'Цвета движутся вдоль сторон многоугольников. В режиме плетения соседние треугольники вращаются в разные стороны.'],
        ['Geometrische stroming', 'Laat kleuren langs de zijden van veelhoeken stromen. In het Driehoeksweefsel draaien aangrenzende driehoeken in tegengestelde richtingen.']
    ],
    magnet: [
        ['Magnet', 'Draw colors toward an anchor color, forming shifting patterns.'],
        ['מגנט', 'הצבעים נמשכים לצבע עוגן ויוצרים דפוסים משתנים.'],
        ['Магнит', 'Цвета притягиваются к опорному цвету, создавая меняющиеся узоры.'],
        ['Magneet', 'Trek kleuren naar een ankerkleur en vorm veranderende patronen.']
    ],
    contour: [
        ['Cracks', 'Grow branching fractures through colored material.'],
        ['סדקים', 'הצמיחו סדקים מסתעפים בתוך משטחי הצבע.'],
        ['Трещины', 'Выращивайте ветвящиеся трещины в цветном материале.'],
        ['Scheuren', 'Laat vertakkende scheuren door gekleurd materiaal groeien.']
    ],
    contourAction: [
        ['Contours', 'Apply contour lines once. Swipe up for settings.'],
        ['קווי מתאר', 'הוסיפו קווי מתאר פעם אחת. החליקו למעלה להגדרות.'],
        ['Контуры', 'Примените контуры один раз. Смахните вверх для настроек.'],
        ['Contouren', 'Pas contourlijnen eenmaal toe. Veeg omhoog voor instellingen.']
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
