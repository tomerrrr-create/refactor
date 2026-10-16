import { getCurrentLang, onLanguageChange } from './i18n.js';
const COPY = {
  "en": {
    "entry": "Quick start · 13 steps",
    "label": "Follow your intuition",
    "back": "Back",
    "next": "Next",
    "done": "Start creating",
    "close": "Close guide",
    "slide": "Step",
    "slides": [
      [
        "Your board. Your intuition.",
        "There is no right result. Choose colors, touch the board and see where it takes you.",
        "Start with a few marks. You can always undo."
      ],
      [
        "Find your colors",
        "Tap the palette button to explore palettes. Swipe or drag it upward to open the palette collection.",
        "Choose a palette that feels right."
      ],
      [
        "Make your first mark",
        "Tap the color circle to change your drawing color. Swipe it upward for the color picker, then tap or drag on the board.",
        "Your finger or mouse is your brush."
      ],
      [
        "Let a small gesture grow",
        "Explore the brush and symmetry buttons. Symmetry repeats your marks across the board. Undo and redo let you experiment freely.",
        "Try one stroke with symmetry on."
      ],
      [
        "Change the scale",
        "Use + and − to change the grid size. Swipe either upward to enter an exact size. Tap the separators button to cycle spacing.",
        "Fewer cells feel bold. More cells reveal detail."
      ],
      [
        "Set your colors in motion",
        "Switch to simulation mode, choose a simulation and press Play. Pause before choosing another one. Swipe a simulation upward for settings where available.",
        "Watch for a moment. Pause when you like what you see."
      ],
      [
        "Patterns that grow",
        "Game of Life creates patterns through living neighbors. Islands grows color patches by copying neighboring colors. Turing creates spots and stripes; DLA grows branching clusters.",
        "Start with Game of Life or Islands and watch a small area."
      ],
      [
        "Colors that influence colors",
        "Chi Flow lets nearby colors influence each pixel. Magnet pulls colors toward an anchor color. Pause, swipe upward for settings, and try one small change.",
        "Hold a simulation button for a short explanation."
      ],
      [
        "Give movement a direction",
        "Gravity arranges colors in a chosen direction; Spiral arranges them around the center. The sorting method determines color order in simulations that use sorting. Some buttons cycle through several modes.",
        "Pause before switching simulations. Try the same board in two modes."
      ],
      [
        "Discover another atmosphere",
        "Contours reveals color boundaries. Brightness changes local contrasts. Erosion builds a world of water, air and earth. Breathe gently brightens and dims the colors.",
        "Explore gradually: change one setting, then watch what happens."
      ],
      [
        "Color order is their DNA",
        "Sorting methods define the inner order of colors. In simulations that follow this order, the same board and the same simulation can become worlds apart simply by changing the sorting method.",
        "Tap the sort button to change methods, or swipe it upward to choose the methods in your cycle. Try the same board in two orders."
      ],
      [
        "Save the image. Keep the idea.",
        "Open Save for a PNG you can share. Check the smoothing option before exporting. Save an Idea file too if you want to reopen the board and continue editing later.",
        "A PNG is an image. An Idea file keeps an editable board."
      ],
      [
        "Keep the journey, too",
        "Save the logger to keep your sequence of actions. Load it as a macro to replay the journey. You can reopen this guide anytime from Help or Technicians.",
        "Your first experiment: choose a palette, draw, run a simulation, pause and save."
      ]
    ]
  },
  "he": {
    "entry": "מתחילים כאן · 13 צעדים",
    "label": "לכו עם האינטואיציה",
    "back": "הקודם",
    "next": "הבא",
    "done": "מתחילים ליצור",
    "close": "סגירת המדריך",
    "slide": "צעד",
    "slides": [
      [
        "הלוח שלכם. האינטואיציה שלכם.",
        "אין תוצאה נכונה. בחרו צבעים, געו בלוח וגלו לאן זה מוביל.",
        "התחילו בכמה נגיעות. תמיד אפשר לבטל."
      ],
      [
        "מוצאים את הצבעים",
        "לחצו על כפתור הפלטה כדי לעבור בין פלטות. החליקו או גררו אותו למעלה כדי לפתוח את אוסף הפלטות.",
        "בחרו פלטה שמרגישה לכם נכונה."
      ],
      [
        "הנגיעה הראשונה",
        "לחצו על עיגול הצבע כדי להחליף צבע ציור. החליקו אותו למעלה לבורר הצבעים, ואז לחצו או גררו על הלוח.",
        "האצבע או העכבר הם המברשת שלכם."
      ],
      [
        "תנועה קטנה, יצירה גדולה",
        "גלו את כפתורי המברשת והסימטריה. סימטריה משכפלת את הנגיעות ברחבי הלוח. ביטול וביצוע מחדש מאפשרים להתנסות בחופשיות.",
        "נסו לצייר קו אחד עם סימטריה."
      ],
      [
        "משנים קנה מידה",
        "פלוס ומינוס משנים את גודל הגריד. החליקו אחד מהם למעלה להזנת גודל מדויק. כפתור המפרידים מדפדף בין עוביי ההפרדה.",
        "מעט תאים יוצרים מראה נועז. הרבה תאים חושפים פרטים."
      ],
      [
        "נותנים לצבעים לנוע",
        "עברו למצב סימולציה, בחרו סימולציה ולחצו על Play. השהו לפני בחירת סימולציה אחרת. החליקו סימולציה למעלה להגדרות, כשהן זמינות.",
        "התבוננו לרגע. השהו כשהתוצאה מוצאת חן בעיניכם."
      ],
      [
        "דפוסים שצומחים",
        "משחק החיים יוצר דפוסים לפי שכנים חיים. איים מצמיח כתמי צבע בהעתקה משכנים. טיורינג יוצר כתמים ופסים; DLA מצמיח מבנים מסתעפים.",
        "התחילו ממשחק החיים או מאיים, והתבוננו באזור קטן."
      ],
      [
        "צבעים שמשפיעים על צבעים",
        "בצ׳י פלו צבעים סמוכים משפיעים על כל פיקסל. במגנט הצבעים נמשכים לצבע עוגן. השהו, החליקו למעלה להגדרות ונסו שינוי קטן אחד.",
        "לחיצה ארוכה על כפתור סימולציה מציגה הסבר קצר."
      ],
      [
        "נותנים לתנועה כיוון",
        "גרביטציה מסדרת צבעים בכיוון נבחר; ספירלה מסדרת אותם סביב המרכז. שיטת המיון קובעת את סדר הצבעים בסימולציות שמשתמשות במיון. בחלק מהכפתורים לחיצה מדפדפת בין מצבים.",
        "השהו לפני החלפת סימולציה. נסו את אותו לוח בשני מצבים."
      ],
      [
        "מגלים אווירה אחרת",
        "קווי מתאר חושפים גבולות בין צבעים. בהירות משנה ניגודים מקומיים. שחיקה יוצרת עולם של מים, אוויר ואדמה. נשימה מבהירה ומכהה את הצבעים בעדינות.",
        "גלו בהדרגה: שנו הגדרה אחת והתבוננו בתוצאה."
      ],
      [
        "סדר הצבעים הוא ה־DNA שלהם",
        "שיטות המיון קובעות את הסדר הפנימי של הצבעים. בסימולציות שנשענות עליו, אותו לוח ואותה סימולציה יכולים להפוך לעולמות רחוקים כשמשנים רק את שיטת המיון.",
        "לחצו על כפתור המיון להחלפת שיטה, או החליקו אותו למעלה לבחירת השיטות בסייקל. נסו את אותו לוח בשני סדרים."
      ],
      [
        "שומרים תמונה. שומרים רעיון.",
        "פתחו שמירה לתמונת PNG שאפשר לשתף. בדקו את אפשרות ההחלקה לפני הייצוא. שמרו גם קובץ רעיון כדי לפתוח את הלוח ולהמשיך לערוך בהמשך.",
        "PNG הוא תמונה. קובץ רעיון שומר לוח שאפשר לערוך."
      ],
      [
        "שומרים גם את המסע",
        "שמרו את הלוגר כדי לשמור את רצף הפעולות. טענו אותו כמאקרו כדי לנגן שוב את המסע. אפשר לחזור למדריך בכל עת מהעזרה או מתפריט הטכנאים.",
        "ניסוי ראשון: בחרו פלטה, ציירו, הפעילו סימולציה, השהו ושמרו."
      ]
    ]
  },
  "ru": {
    "entry": "Быстрый старт · 13 шагов",
    "label": "Следуйте интуиции",
    "back": "Назад",
    "next": "Далее",
    "done": "Начать творить",
    "close": "Закрыть руководство",
    "slide": "Шаг",
    "slides": [
      [
        "Ваше поле. Ваша интуиция.",
        "Здесь нет правильного результата. Выбирайте цвета, касайтесь поля и смотрите, что получится.",
        "Начните с нескольких штрихов. Их всегда можно отменить."
      ],
      [
        "Найдите свои цвета",
        "Нажимайте кнопку палитры для смены цветов. Проведите или перетащите её вверх, чтобы открыть коллекцию палитр.",
        "Выберите палитру по настроению."
      ],
      [
        "Первый штрих",
        "Нажмите цветной круг, чтобы сменить цвет кисти. Проведите его вверх для выбора цвета, затем нажимайте или рисуйте на поле.",
        "Палец или мышь — ваша кисть."
      ],
      [
        "Больше из одного движения",
        "Попробуйте кисть и симметрию. Симметрия повторяет штрихи на поле. Отмена и повтор позволяют свободно экспериментировать.",
        "Нарисуйте линию с включённой симметрией."
      ],
      [
        "Измените масштаб",
        "Кнопки + и − меняют размер сетки. Проведите любую вверх для точного размера. Кнопка разделителей меняет расстояния между ячейками.",
        "Меньше ячеек — крупнее формы. Больше — тоньше детали."
      ],
      [
        "Добавьте движение",
        "Перейдите в режим симуляций, выберите симуляцию и нажмите Play. Поставьте на паузу перед сменой. Проведите симуляцию вверх для настроек, если они доступны.",
        "Наблюдайте. Остановитесь на понравившемся моменте."
      ],
      [
        "Растущие узоры",
        "«Жизнь» создаёт узоры по живым соседям. «Острова» растят цветные области, копируя соседей. Тьюринг создаёт пятна и полосы, DLA — ветвящиеся скопления.",
        "Начните с «Жизни» или «Островов» и наблюдайте за одним участком."
      ],
      [
        "Цвета влияют друг на друга",
        "В «Потоке Ци» соседние цвета влияют на пиксели. В «Магните» цвета притягиваются к опорному цвету. Поставьте на паузу, проведите вверх для настроек и измените один параметр.",
        "Удерживайте кнопку симуляции для краткого объяснения."
      ],
      [
        "Задайте направление",
        "Гравитация выстраивает цвета в выбранном направлении, спираль — вокруг центра. Метод сортировки задаёт порядок цветов в симуляциях, использующих сортировку. Некоторые кнопки переключают режимы.",
        "Пауза перед сменой симуляции. Сравните два режима на одном поле."
      ],
      [
        "Другое настроение",
        "Контуры проявляют границы цветов. Яркость меняет местный контраст. Эрозия создаёт мир воды, воздуха и земли. Дыхание плавно осветляет и затемняет цвета.",
        "Меняйте одну настройку и наблюдайте за результатом."
      ],
      [
        "Порядок — это ДНК цветов",
        "Методы сортировки задают внутренний порядок цветов. В симуляциях, зависящих от него, одно и то же поле с той же симуляцией может стать совершенно другим миром при смене сортировки.",
        "Нажмите кнопку сортировки для смены метода или проведите вверх для выбора методов цикла. Сравните два порядка на одном поле."
      ],
      [
        "Сохраните изображение и идею",
        "Откройте сохранение для PNG, которым можно поделиться. Проверьте сглаживание перед экспортом. Сохраните файл идеи, чтобы позже открыть поле и продолжить редактирование.",
        "PNG — изображение. Идея — редактируемое поле."
      ],
      [
        "Сохраните и сам путь",
        "Сохраните журнал последовательности действий. Загрузите его как макрос для повторного воспроизведения. Руководство всегда доступно в помощи и меню техников.",
        "Первый опыт: палитра, рисунок, симуляция, пауза и сохранение."
      ]
    ]
  },
  "nl": {
    "entry": "Snel beginnen · 13 stappen",
    "label": "Volg je intuïtie",
    "back": "Vorige",
    "next": "Volgende",
    "done": "Begin met maken",
    "close": "Handleiding sluiten",
    "slide": "Stap",
    "slides": [
      [
        "Jouw raster. Jouw intuïtie.",
        "Er is geen juist resultaat. Kies kleuren, raak het raster aan en ontdek waar het je brengt.",
        "Begin met een paar streken. Je kunt altijd ongedaan maken."
      ],
      [
        "Vind jouw kleuren",
        "Tik op de paletknop om paletten te verkennen. Veeg of sleep de knop omhoog om de paletcollectie te openen.",
        "Kies een palet dat goed voelt."
      ],
      [
        "Je eerste streek",
        "Tik op de kleurencirkel om je tekenkleur te veranderen. Veeg omhoog voor de kleurkiezer en tik of sleep daarna over het raster.",
        "Je vinger of muis is je penseel."
      ],
      [
        "Laat een gebaar groeien",
        "Probeer de penseel- en symmetrieknoppen. Symmetrie herhaalt je streken over het raster. Ongedaan maken en opnieuw geven ruimte om te proberen.",
        "Probeer één streek met symmetrie aan."
      ],
      [
        "Verander de schaal",
        "Met + en − verander je het rasterformaat. Veeg een van beide omhoog voor een exact formaat. Tik op de scheidingsknop voor andere tussenruimtes.",
        "Minder cellen geven grote vormen. Meer cellen tonen details."
      ],
      [
        "Breng kleuren in beweging",
        "Ga naar de simulatiemodus, kies een simulatie en druk op Play. Pauzeer voordat je een andere kiest. Veeg een simulatie omhoog voor beschikbare instellingen.",
        "Kijk even. Pauzeer bij een mooi moment."
      ],
      [
        "Patronen die groeien",
        "Game of Life maakt patronen met levende buren. Islands laat kleurvlakken groeien door buren te kopiëren. Turing maakt vlekken en strepen; DLA laat vertakkingen groeien.",
        "Begin met Game of Life of Islands en volg een klein gebied."
      ],
      [
        "Kleuren beïnvloeden kleuren",
        "In Chi Flow beïnvloeden nabije kleuren elke pixel. Magnet trekt kleuren naar een ankerkleur. Pauzeer, veeg omhoog voor instellingen en probeer één kleine wijziging.",
        "Houd een simulatieknop ingedrukt voor een korte uitleg."
      ],
      [
        "Geef beweging een richting",
        "Zwaartekracht ordent kleuren in een gekozen richting; Spiral rond het midden. De sorteermethode bepaalt de kleurvolgorde bij simulaties die sorteren. Sommige knoppen wisselen tussen modi.",
        "Pauzeer voor je wisselt. Vergelijk twee modi op hetzelfde raster."
      ],
      [
        "Ontdek een andere sfeer",
        "Contours toont kleurgrenzen. Brightness verandert lokale contrasten. Erosion maakt een wereld van water, lucht en aarde. Breathe laat kleuren zacht oplichten en dimmen.",
        "Verander één instelling en bekijk het resultaat."
      ],
      [
        "Kleurvolgorde is hun DNA",
        "Sorteermethoden bepalen de innerlijke volgorde van kleuren. Bij simulaties die deze volgorde volgen, kunnen hetzelfde raster en dezelfde simulatie totaal andere werelden worden door alleen de sorteermethode te veranderen.",
        "Tik op de sorteerknop voor een andere methode, of veeg omhoog om de methoden in je cyclus te kiezen. Probeer hetzelfde raster met twee volgordes."
      ],
      [
        "Bewaar beeld én idee",
        "Open Opslaan voor een PNG om te delen. Controleer de optie voor vloeiend maken voor het exporteren. Bewaar ook een idee-bestand om later verder te bewerken.",
        "Een PNG is een afbeelding. Een idee-bestand blijft bewerkbaar."
      ],
      [
        "Bewaar ook je reis",
        "Sla het logboek op om je acties te bewaren. Laad het als macro om de reis opnieuw af te spelen. Je vindt deze gids altijd in Help of het technicusmenu.",
        "Eerste experiment: kies een palet, teken, start een simulatie, pauzeer en sla op."
      ]
    ]
  }
};
export function initializeQuickStart() {
  const dialog = document.getElementById('quickStartDialog');
  const title = dialog.querySelector('h2'), body = dialog.querySelector('[data-guide-body]');
  const tip = dialog.querySelector('[data-guide-tip]'), visual = dialog.querySelector('[data-guide-visual]');
  const count = dialog.querySelector('[data-guide-count]'), dots = dialog.querySelector('[data-guide-dots]');
  const back = dialog.querySelector('[data-guide-back]'), next = dialog.querySelector('[data-guide-next]');
  const close = dialog.querySelector('[data-guide-close]'), panel = dialog.querySelector('[data-guide-slide]');
  const entries = [...document.querySelectorAll('[data-open-guide]')];
  const icons = ['btnPalette','btnPalette','btnColorPicker','btnSymmetry','btnResizeUp','btnToggleSimMode','btnGameOfLife','btnSandpile','btnGravitationalSort','btnContour','btnCycleSort','btnSave','btnMacroPlay'];
  let index = 0, trigger = null, gesture = null;
  const copy = () => COPY[getCurrentLang()] || COPY.en;
  const buttons = Array.from({length:COPY.en.slides.length}, (_, i) => {
    const b = document.createElement('button'); b.type = 'button';
    b.addEventListener('click', () => { index = i; render(); }); dots.append(b); return b;
  });
  function render() {
    const c = copy(); dots.setAttribute('aria-label', c.entry); dialog.dir = getCurrentLang() === 'he' ? 'rtl' : 'ltr';
    dialog.querySelector('[data-guide-label]').textContent = c.label;
    [title.textContent, body.textContent, tip.textContent] = c.slides[index];
    count.textContent = `${c.slide} ${index + 1} / ${c.slides.length}`;
    back.textContent = c.back; back.disabled = index === 0;
    next.textContent = index === copy().slides.length - 1 ? c.done : c.next; close.setAttribute('aria-label', c.close);
    buttons.forEach((b,i) => { b.setAttribute('aria-label', `${c.slide} ${i+1}: ${c.slides[i][0]}`); b.setAttribute('aria-current', i === index ? 'step' : 'false'); });
    visual.replaceChildren();
    const icon = document.getElementById(icons[index])?.querySelector('svg');
    if (icon) { const clone = icon.cloneNode(true); clone.removeAttribute('id'); clone.querySelectorAll('[id]').forEach(e => e.removeAttribute('id')); visual.append(clone); }
    else visual.textContent = '◇';
    panel.getAnimations().forEach(a => a.cancel());
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) panel.animate([{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}], {duration:220,easing:'ease-out'});
  }
  function move(delta) { index = Math.max(0, Math.min(copy().slides.length - 1, index + delta)); render(); }
  entries.forEach(button => button.addEventListener('click', () => { trigger = button; index = 0; render(); dialog.showModal(); next.focus({preventScroll:true}); }));
  function refresh() { entries.forEach(b => b.textContent = copy().entry); if (dialog.open) render(); }
  back.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => index === copy().slides.length - 1 ? dialog.close() : move(1));
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { gesture = null; trigger?.focus({preventScroll:true}); });
  dialog.addEventListener('click', e => { if (e.target !== dialog) return; const r=dialog.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) dialog.close(); });
  dialog.addEventListener('keydown', e => { if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move((e.key==='ArrowRight'?1:-1)*(dialog.dir==='rtl'?-1:1));} });
  panel.addEventListener('pointerdown', e => { if(!e.isPrimary || e.button!==0) return; gesture={id:e.pointerId,x:e.clientX,y:e.clientY}; panel.setPointerCapture(e.pointerId); });
  panel.addEventListener('pointerup', e => { if(!gesture||gesture.id!==e.pointerId)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;gesture=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)move((dx<0?1:-1)*(dialog.dir==='rtl'?-1:1)); });
  panel.addEventListener('pointercancel', () => { gesture=null; });
  onLanguageChange(refresh); refresh();
}
