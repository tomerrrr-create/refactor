// js/i18n.js

const availableLangs = ['en', 'he', 'ru', 'nl'];
let currentLang = 'en';

const listeners = [];
export function onLanguageChange(callback) {
  listeners.push(callback);
}

export const translations = {
  help_topics: {"en": "Help topics", "he": "נושאי עזרה", "ru": "Темы справки", "nl": "Helponderwerpen"},
  help_tab_tools: {"en": "Tools", "he": "כלים", "ru": "Инструменты", "nl": "Tools"},
  help_tab_evolution: {"en": "Evolution", "he": "אבולוציה", "ru": "Эволюция", "nl": "Evolutie"},
  help_tab_creation: {"en": "Creation", "he": "יצירה", "ru": "Творчество", "nl": "Creatie"},
  help_keyboard_escape: {"en": "Close the sorting, Nudge speed and technician dialogs. Unsaved sorting edits are discarded.", "he": "סגירת חלונות המיון, מהירות Nudge והטכנאים. שינויי מיון שלא נשמרו מתבטלים.", "ru": "Закрыть диалоги сортировки, скорости Nudge и техников. Несохранённые изменения сортировки отменяются.", "nl": "Sluit de dialoog voor sorteren, Nudge-snelheid of technici. Niet-opgeslagen sorteerwijzigingen vervallen."},
  help_keyboard_activate: {"en": "Activate a focused button; Space toggles a focused checkbox. Use arrows in position selectors.", "he": "הפעלת כפתור ממוקד; רווח משנה סימון בתיבת בחירה ממוקדת. בבוררי המיקום אפשר להשתמש בחצים.", "ru": "Активировать кнопку в фокусе; пробел переключает флажок. В выборе позиции используйте стрелки.", "nl": "Activeer een knop met focus; Spatie wisselt een selectievakje. Gebruik pijlen in positiekiezers."},
  help_keyboard_focus: {"en": "Move between focusable controls; Shift + Tab moves backward.", "he": "מעבר בין פקדים שניתן למקד; Shift + Tab חוזר לאחור.", "ru": "Перемещение между элементами; Shift + Tab — назад.", "nl": "Wissel tussen focusbare bedieningselementen; Shift + Tab gaat terug."},
  help_keyboard_sort: {"en": "With sorting focused: open sorting preferences.", "he": "כאשר כפתור המיון ממוקד: פתיחת הגדרות המיון.", "ru": "При фокусе на сортировке: открыть её настройки.", "nl": "Met focus op sorteren: open sorteervoorkeuren."},
  help_category_advanced: {"en": "Advanced tools", "he": "למתקדמים", "ru": "Для опытных пользователей", "nl": "Geavanceerde tools"},
  help_technicians: {"en": "Technician menu: the gold debug button opens startup and simulation-initialization preferences.\nStartup choices apply on the next launch; initialization choices apply on the next initialization hold. You can also continue holding simulation entry for about 1.8 seconds total: initialization happens first, then this menu opens.", "he": "תפריט טכנאים: כפתור הדיבאג הזהוב פותח העדפות לפתיחת האפליקציה ולאתחול סימולציה.\nהגדרות הפתיחה חלות בכניסה הבאה; הגדרות האתחול בהחזקת האתחול הבאה. אפשר גם להמשיך להחזיק את הכניסה לסימולציה במשך כ־1.8 שניות בסך הכול: הלוח מאותחל תחילה, ואז התפריט נפתח.", "ru": "Меню техников: золотая кнопка отладки открывает настройки запуска и инициализации симуляции.\nНастройки запуска применятся при следующем открытии, инициализации — при следующем удержании. Можно удерживать вход в симуляцию около 1,8 секунды: сначала доска инициализируется, затем открывается меню.", "nl": "Technici-menu: de gouden debugknop opent opstart- en simulatie-initialisatievoorkeuren.\nOpstartkeuzes gelden bij de volgende start; initialisatiekeuzes bij de volgende initialisatie-hold. Houd de simulatie-ingang ongeveer 1,8 seconde vast: eerst initialiseert het bord, daarna opent het menu."},
  help_macro: {"en": "Macro: load a TXT action log through the save/load menu, then press the macro Play button.\nYou can choose a different starting palette before playback. Tap the macro overlay to stop; tap the board during playback to toggle its full-screen view.", "he": "מאקרו: טענו יומן פעולות TXT דרך תפריט השמירה והטעינה, ואז לחצו על כפתור הפעלת המאקרו.\nאפשר לבחור פלטת התחלה אחרת לפני הניגון. לחיצה על שכבת המאקרו עוצרת אותו; לחיצה על הלוח בזמן הניגון מחליפה תצוגת מסך מלא.", "ru": "Макрос: загрузите журнал TXT через меню сохранения и загрузки и нажмите кнопку запуска макроса.\nПеред запуском можно выбрать другую начальную палитру. Нажатие на слой макроса останавливает его; на доску во время воспроизведения переключает полноэкранный вид.", "nl": "Macro: laad een TXT-actielogboek via Opslaan/laden en druk op de macro-afspeelknop.\nKies eventueel een ander startpalet vóór het afspelen. Tik op de macro-overlay om te stoppen; tik op het bord tijdens afspelen om volledig scherm te wisselen."},
  help_nudge_backward: {"en": "Nudge backward: tap to shift colors one step backward in the palette and select automatic Nudge.\nPlay repeats the shift. Speed is adjustable in Simulation settings; backward does not always mean darker.", "he": "Nudge אחורה: לחיצה מחזירה צבעים צעד אחד בפלטה ובוחרת Nudge אוטומטי.\nהפעלה חוזרת על ההזזה. המהירות ניתנת לשינוי בהגדרות הסימולציה; אחורה אינו תמיד כהה יותר.", "ru": "Nudge назад: нажатие сдвигает цвета на одну позицию назад и выбирает автоматический Nudge.\nЗапуск повторяет сдвиг. Скорость задаётся в настройках; назад не всегда означает темнее.", "nl": "Nudge achteruit: tik om kleuren één positie terug te schuiven en automatische Nudge te kiezen.\nAfspelen herhaalt de verschuiving. Snelheid is instelbaar; achteruit betekent niet altijd donkerder."},
  help_nudge_forward: {"en": "Nudge forward: tap to shift colors one step forward in the palette and select automatic Nudge.\nPlay repeats the shift. Speed is adjustable in Simulation settings; the default interval is 100 ms. Depending on sorting, forward does not always mean brighter.", "he": "Nudge קדימה: לחיצה מקדמת צבעים צעד אחד בפלטה ובוחרת Nudge אוטומטי.\nהפעלה חוזרת על ההזזה. המהירות ניתנת לשינוי בהגדרות הסימולציה; ברירת המחדל היא מרווח של 100 מילישניות. בהתאם למיון, קדימה אינו תמיד בהיר יותר.", "ru": "Nudge вперёд: нажатие сдвигает цвета на одну позицию вперёд и выбирает автоматический Nudge.\nЗапуск повторяет сдвиг. Скорость меняется в настройках; интервал по умолчанию 100 мс. В зависимости от сортировки вперёд не всегда означает светлее.", "nl": "Nudge vooruit: tik om kleuren één positie vooruit te schuiven en automatische Nudge te kiezen.\nAfspelen herhaalt de verschuiving. Snelheid is instelbaar; standaardinterval 100 ms. Afhankelijk van de sortering betekent vooruit niet altijd lichter."},
  help_turing: {"en": "Turing: select it to grow patterns through reaction and diffusion.\nSimulation settings offer pattern presets, feed and kill controls. Use Play or Single step.", "he": "טיורינג: בחרו בו כדי ליצור דפוסים דרך תגובה ודיפוזיה.\nבהגדרות הסימולציה יש פריסטים לדפוסים ופרמטרי Feed ו־Kill. השתמשו בהפעלה או בצעד בודד.", "ru": "Тьюринг: создаёт узоры реакцией и диффузией.\nВ настройках есть шаблоны и параметры Feed и Kill. Используйте запуск или один шаг.", "nl": "Turing: maakt patronen via reactie en diffusie.\nInstellingen bieden patroonpresets en Feed- en Kill-regelaars. Gebruik Afspelen of Eén stap."},
  help_sandpile: {"en": "Sandpile: select it to redistribute values through neighboring cells.\nUse Play or Single step. The Chi Flow parameters are available in Simulation settings.", "he": "ערימת חול: בחרו בה כדי לפזר ערכים דרך התאים השכנים.\nהשתמשו בהפעלה או בצעד בודד. פרמטרי Chi Flow זמינים בהגדרות הסימולציה.", "ru": "Песчаная куча: распределяет значения через соседние клетки.\nИспользуйте запуск или один шаг. Параметры Chi Flow доступны в настройках.", "nl": "Zandhoop: verdeelt waarden over aangrenzende cellen.\nGebruik Afspelen of Eén stap. Chi Flow-parameters staan in de instellingen."},
  help_contour: {"en": "Contours: select this simulation to evolve color boundaries.\nUse Play or Single step; sensitivity and line color are available in Simulation settings.", "he": "קווי מתאר: בחרו בסימולציה כדי לפתח את הגבולות בין הצבעים.\nהשתמשו בהפעלה או בצעד בודד; רגישות וצבע הקו זמינים בהגדרות הסימולציה.", "ru": "Контуры: выберите эту симуляцию для развития границ между цветами.\nИспользуйте запуск или один шаг; чувствительность и цвет линии задаются в настройках.", "nl": "Contouren: kies deze simulatie om kleurgrenzen te ontwikkelen.\nGebruik Afspelen of Eén stap; gevoeligheid en lijnkleur staan in de instellingen."},
  help_magnet: {"en": "Magnet: cycle between off, geometric (cosmic), regular and time magnet.\nExpand remains available in Simulation settings, where you can also choose the anchor color.", "he": "מגנט: מעבר בין כבוי, גאומטרי (cosmic), רגיל ומגנט זמן.\nמצב Expand זמין בהגדרות הסימולציה, שם אפשר לבחור גם את צבע העוגן.", "ru": "Магнит: выключено, геометрический (cosmic), обычный и временной магнит.\nExpand доступен в настройках, где можно выбрать опорный цвет.", "nl": "Magneet: wissel tussen uit, geometrisch (cosmic), gewoon en tijdmagneet.\nExpand blijft beschikbaar in de instellingen, waar je ook de ankerkleur kunt kiezen."},
  help_spiral: {"en": "Spiral: cycle between off, Experiment B, Left and Black Hole.\nSimulation settings also offer Experiment A, Vortex, Radial and Down. Choose a mode, then Play or Single step.", "he": "ספירלה: מעבר בין כבוי, ניסוי B, שמאלה וחור שחור.\nבהגדרות הסימולציה זמינים גם ניסוי A, מערבולת, רדיאלי ומטה. בחרו מצב והשתמשו בהפעלה או בצעד בודד.", "ru": "Спираль: выключено, эксперимент B, влево, чёрная дыра.\nВ настройках также есть эксперимент A, вихрь, радиальный режим и вниз. Выберите режим и используйте запуск или один шаг.", "nl": "Spiraal: wissel tussen uit, Experiment B, Links en Zwart gat.\nInstellingen bieden ook Experiment A, Vortex, Radiaal en Omlaag. Kies een modus en gebruik Afspelen of Eén stap."},
  help_sim_settings: {"en": "Simulation settings: select a tool, then use this button to open its available settings.\nSettings are available for Life, gravity, contours, spiral, sandpile, Turing, magnet and automatic Nudge.", "he": "הגדרות סימולציה: בחרו כלי, ואז פתחו כאן את ההגדרות הזמינות שלו.\nיש הגדרות למשחק החיים, גרביטציה, קווי מתאר, ספירלה, ערימת חול, טיורינג, מגנט ו־Nudge אוטומטי.", "ru": "Настройки симуляции: выберите инструмент и откройте здесь его доступные настройки.\nНастройки есть у Жизни, гравитации, контуров, спирали, песчаной кучи, Тьюринга, магнита и автоматического Nudge.", "nl": "Simulatie-instellingen: kies een tool en open hier de beschikbare instellingen.\nBeschikbaar voor Leven, zwaartekracht, contouren, spiraal, zandhoop, Turing, magneet en automatische Nudge."},
  help_step: {"en": "Single step: advance the selected simulation once while paused.\nBreathing is a continuous animation and has no single-step mode.", "he": "צעד בודד: מקדם פעם אחת את הסימולציה שנבחרה כשהיא מושהית.\nנשימה היא אנימציה רציפה ואין לה צעד בודד.", "ru": "Один шаг: однократно продвигает выбранную симуляцию на паузе.\nДыхание — непрерывная анимация без отдельных шагов.", "nl": "Eén stap: voer één stap van de gekozen simulatie uit terwijl deze gepauzeerd is.\nAdemen is een doorlopende animatie zonder losse stappen."},
  help_sort: {"en": "Sorting: tap to advance through your selected sorting cycle.\nHold to choose methods. In Arrange cycle, choose a position for each tile. Save applies selection and order; reset restores the original six-method cycle. Changing sorting preserves the board’s current colors.", "he": "מיון: לחיצה עוברת לשיטה הבאה בסבב שבחרתם.\nהחזקה פותחת בחירת שיטות. במצב סידור הסבב בחרו מיקום לכל אריח. שמירה מחילה בחירה וסדר; איפוס משחזר את שש השיטות המקוריות. החלפת מיון שומרת על הצבעים הנוכחיים בלוח.", "ru": "Сортировка: нажатие выбирает следующий метод вашего цикла.\nУдержание открывает выбор методов. В режиме порядка задайте позицию каждого тайла. Сохранение применяет выбор и порядок; сброс возвращает шесть исходных методов. Цвета доски при смене сортировки сохраняются.", "nl": "Sorteren: tik voor de volgende methode in je gekozen cyclus.\nHoud vast om methoden te kiezen. Geef elke tegel een positie bij Cyclus ordenen. Opslaan past keuze en volgorde toe; reset herstelt de zes oorspronkelijke methoden. De huidige bordkleuren blijven behouden."},
  "nudge_speed": { en: "Automatic Nudge speed", he: "מהירות Nudge אוטומטי", ru: "Скорость автоматического Nudge", nl: "Automatische Nudge-snelheid" },
  "nudge_fast": { en: "Fastest", he: "הכי מהיר", ru: "Быстрее всего", nl: "Snelst" },
  "nudge_interval": { en: "{ms} ms between shifts", he: "{ms} מילישניות בין הזזות", ru: "{ms} мс между сдвигами", nl: "{ms} ms tussen stappen" },
  "nudge_note": { en: "Adjust speed while running. Your choice is saved on this device, and recordings preserve their speed. Locked while a macro is loaded.", he: "אפשר לשנות מהירות בזמן הריצה. הבחירה נשמרת במכשיר זה, והקלטות שומרות את המהירות שלהן. נעול כשמאקרו טעון.", ru: "Скорость можно менять во время работы. Выбор сохраняется на устройстве, а записи сохраняют свою скорость. Заблокировано при загруженном макросе.", nl: "Pas de snelheid tijdens het draaien aan. Je keuze wordt op dit apparaat opgeslagen en opnames bewaren hun snelheid. Vergrendeld als een macro is geladen." },
  "startup_title": { en: "App opening", he: "פתיחת האפליקציה", ru: "Открытие приложения", nl: "App openen" },
  "startup_description": { en: "Choose your starting point.", he: "בחירת נקודת ההתחלה שלך.", ru: "Выберите начальную точку.", nl: "Kies je beginpunt." },
  "startup_note": { en: "Applies on your next visit. A fresh board is generated; gaps shrink if needed to fit the screen.", he: "יחול בפתיחה הבאה. ייווצר לוח חדש; המפרידים יוקטנו במידת הצורך כדי להתאים למסך.", ru: "Применится при следующем открытии. Создаётся новое поле; промежутки уменьшаются по размеру экрана.", nl: "Geldt bij je volgende bezoek. Een nieuw bord wordt gemaakt; tussenruimtes passen zich aan het scherm aan." },
  "startup_palette": { en: "Palette", he: "פלטה", ru: "Палитра", nl: "Palet" },
  "startup_separator": { en: "Separators", he: "מפרידים", ru: "Промежутки", nl: "Tussenruimtes" },
  "startup_sort": { en: "Palette sorting", he: "מיון הפלטה", ru: "Сортировка палитры", nl: "Paletsortering" },
  "startup_fill": { en: "Initial board fill", he: "מילוי ראשוני של הלוח", ru: "Начальное заполнение", nl: "Beginvulling" },
  "startup_brush_mode": { en: "Brush mode", he: "סוג מברשת", ru: "Режим кисти", nl: "Penseelmodus" },
  "startup_brush_color": { en: "Brush color", he: "צבע המברשת", ru: "Цвет кисти", nl: "Penseelkleur" },
  "startup_symmetry": { en: "Symmetry", he: "סימטריה", ru: "Симметрия", nl: "Symmetrie" },
  "startup_interface": { en: "Interface mode", he: "מצב הממשק", ru: "Режим интерфейса", nl: "Interfacemodus" },
  "startup_use_current": { en: "Use current settings", he: "שימוש בהגדרות הנוכחיות", ru: "Текущие настройки", nl: "Huidige instellingen" },
  "startup_current_pending": { en: "Current settings copied. Initial fill stays as chosen; save to apply.", he: "ההגדרות הנוכחיות הועתקו. המילוי הראשוני נשאר לפי הבחירה; יש לשמור כדי להחיל.", ru: "Текущие настройки скопированы. Начальное заполнение остаётся выбранным; сохраните для применения.", nl: "Huidige instellingen gekopieerd. De beginvulling blijft zoals gekozen; sla op om toe te passen." },
  "startup_saved": { en: "Saved. Applies the next time you open the app.", he: "נשמר. יחול בפתיחה הבאה של האפליקציה.", ru: "Сохранено. Применится при следующем открытии.", nl: "Opgeslagen. Geldt wanneer je de app opnieuw opent." },
  "startup_saved_session": { en: "Could not save for your next visit. Browser storage is unavailable.", he: "לא ניתן לשמור לפתיחה הבאה. אחסון הדפדפן אינו זמין.", ru: "Не удалось сохранить для следующего посещения. Хранилище браузера недоступно.", nl: "Opslaan voor het volgende bezoek mislukt. Browseropslag is niet beschikbaar." },
  "sort_cycle_reset_note": {"en": "Default selection restored. Save to apply.", "he": "בחירת ברירת המחדל שוחזרה. לחצו שמירה להחלה.", "ru": "Выбор по умолчанию восстановлен. Сохраните для применения.", "nl": "Standaardselectie hersteld. Sla op om toe te passen."},
  "sort_description_luminance": {"en": "Colors from darkest to lightest.", "he": "צבעים מהכהה ביותר לבהיר ביותר.", "ru": "Цвета от самых тёмных к самым светлым.", "nl": "Kleuren van donker naar licht."},
  "sort_description_dark-rainbow": {"en": "Dark neutrals, a hue spectrum, then light neutrals.", "he": "ניטרליים כהים, רצף גוונים, ואז ניטרליים בהירים.", "ru": "Тёмные нейтральные цвета, спектр оттенков, затем светлые нейтральные.", "nl": "Donkere neutrale kleuren, een kleurenspectrum, dan lichte neutrale kleuren."},
  "sort_description_reversed": {"en": "Colors from lightest to darkest.", "he": "צבעים מהבהיר ביותר לכהה ביותר.", "ru": "Цвета от самых светлых к самым тёмным.", "nl": "Kleuren van licht naar donker."},
  "sort_description_center-out": {"en": "Dark colors at the center of the palette; lighter toward its ends.", "he": "כהים במרכז רצף הפלטה; בהירים לכיוון הקצוות.", "ru": "Тёмные цвета в центре палитры; светлее к краям.", "nl": "Donkere kleuren in het midden van de paletvolgorde; lichter naar de uiteinden."},
  "sort_description_temperature": {"en": "Reddish colors first, bluish colors last.", "he": "גוונים אדמדמים תחילה, כחלחלים בסוף.", "ru": "Красноватые оттенки в начале, синеватые в конце.", "nl": "Roodachtige kleuren eerst, blauwachtige kleuren laatst."},
  "sort_description_outside-in": {"en": "Dark colors at the ends of the palette; lighter toward its center.", "he": "כהים בקצוות רצף הפלטה; בהירים לכיוון המרכז.", "ru": "Тёмные цвета по краям палитры; светлее к центру.", "nl": "Donkere kleuren aan de uiteinden van de paletvolgorde; lichter naar het midden."},
  "sort_description_hue": {"en": "Colors follow the hue wheel; similar hues by brightness.", "he": "לפי גלגל הגוונים; גוונים דומים לפי בהירות.", "ru": "По цветовому кругу; близкие оттенки по яркости.", "nl": "Volgens de kleurencirkel; vergelijkbare tinten op helderheid."},
  "sort_description_zig-zag": {"en": "Dark half from light to dark, then light half from light to dark.", "he": "החצי הכהה מהבהיר לכהה, ואז החצי הבהיר מהבהיר לכהה.", "ru": "Тёмная половина от светлого к тёмному, затем светлая половина в том же порядке.", "nl": "De donkere helft van licht naar donker, dan de lichte helft van licht naar donker."},
  "sort_description_zen-void": {"en": "Colors closest to the average palette color come first.", "he": "תחילה הצבעים הקרובים לצבע הממוצע של הפלטה.", "ru": "Сначала цвета, ближайшие к среднему цвету палитры.", "nl": "Kleuren die het dichtst bij de gemiddelde paletkleur liggen komen eerst."},
  sort_cycle_title: { en: "Sorting cycle", he: "סבב שיטות המיון", ru: "Цикл сортировки", nl: "Sorteercyclus" },
  sort_position: { en: "Position", he: "מיקום", ru: "Позиция", nl: "Positie" },
  sort_order: { en: "Arrange cycle", he: "סידור הסבב", ru: "Порядок цикла", nl: "Cyclus ordenen" },
  sort_choose_methods: { en: "Choose methods", he: "בחירת שיטות", ru: "Выбор методов", nl: "Methoden kiezen" },
  tooltip_sort_cycle: { en: "Tap to change sorting; hold to choose methods (Alt + ↓).", he: "לחיצה להחלפת מיון; לחיצה ארוכה לבחירת שיטות (Alt + ↓).", ru: "Нажмите для смены сортировки; удерживайте для выбора методов (Alt + ↓).", nl: "Tik om de sortering te wijzigen; houd vast om methoden te kiezen (Alt + ↓)." },
  sort_cycle_note: { en: "Choose the methods to cycle through with a tap. Keep at least one selected. Changes apply on the next tap.", he: "בחרו אילו שיטות יופיעו בסבב הלחיצות. יש להשאיר לפחות שיטה אחת מסומנת. השינוי יחול בלחיצה הבאה.", ru: "Выберите методы для переключения нажатием. Оставьте хотя бы один. Изменения применятся при следующем нажатии.", nl: "Kies de methoden die je met een tik doorloopt. Selecteer er minstens één. Wijzigingen gelden bij de volgende tik." },
  sort_cycle_at_least_one: { en: "Select at least one method.", he: "יש לבחור לפחות שיטה אחת.", ru: "Выберите хотя бы один метод.", nl: "Selecteer minstens één methode." },
  sort_cycle_session: { en: "Applied for this session; your browser could not save the selection.", he: "הבחירה הוחלה לכניסה הנוכחית; הדפדפן לא הצליח לשמור אותה.", ru: "Применено для этого сеанса; браузер не смог сохранить выбор.", nl: "Toegepast voor deze sessie; je browser kon de selectie niet opslaan." },
  "startup_sort_hue": { en: "Hue", he: "גוון", ru: "Цветовой тон", nl: "Kleurtoon" },
  "startup_sort_zig-zag": { en: "Zigzag", he: "זיגזג", ru: "Зигзаг", nl: "Zigzag" },
  "startup_sort_zen-void": { en: "Zen Void", he: "חלל זן", ru: "Пустота дзен", nl: "Zenleegte" },
  "startup_sort_luminance": { en: "Dark to light", he: "מכהה לבהיר", ru: "От тёмного к светлому", nl: "Donker naar licht" },
  "startup_sort_dark-rainbow": { en: "Dark rainbow", he: "קשת כהה", ru: "Тёмная радуга", nl: "Donkere regenboog" },
  "startup_sort_reversed": { en: "Light to dark", he: "מבהיר לכהה", ru: "От светлого к тёмному", nl: "Licht naar donker" },
  "startup_sort_center-out": { en: "Center out", he: "מהמרכז החוצה", ru: "От центра наружу", nl: "Van binnen naar buiten" },
  "startup_sort_temperature": { en: "Temperature", he: "טמפרטורה", ru: "Температура", nl: "Temperatuur" },
  "startup_sort_outside-in": { en: "Outside in", he: "מהחוץ פנימה", ru: "Снаружи внутрь", nl: "Van buiten naar binnen" },
  "startup_sort_rainbow-fold": { en: "Rainbow Fold", he: "קיפול קשת", ru: "Сложенная радуга", nl: "Gevouwen regenboog" },
  "startup_fill_random": { en: "Random colors", he: "צבעים אקראיים", ru: "Случайные цвета", nl: "Willekeurige kleuren" },
  "startup_fill_dark": { en: "Darkest color", he: "הצבע הכהה ביותר", ru: "Самый тёмный цвет", nl: "Donkerste kleur" },
  "startup_fill_light": { en: "Lightest color", he: "הצבע הבהיר ביותר", ru: "Самый светлый цвет", nl: "Lichtste kleur" },
  "startup_fill_seed": { en: "Gold seed on dark", he: "זרע זהב על רקע כהה", ru: "Золотое семя на тёмном", nl: "Gouden zaad op donker" },
  "startup_color_none": { en: "No fixed color", he: "ללא צבע קבוע", ru: "Без фиксированного цвета", nl: "Geen vaste kleur" },
  "startup_color_darkest": { en: "Darkest color", he: "הצבע הכהה ביותר", ru: "Самый тёмный цвет", nl: "Donkerste kleur" },
  "startup_color_lightest": { en: "Lightest color", he: "הצבע הבהיר ביותר", ru: "Самый светлый цвет", nl: "Lichtste kleur" },
  "startup_color_rainbow": { en: "Rainbow brush", he: "מברשת קשת", ru: "Радужная кисть", nl: "Regenboogpenseel" },
  "startup_mode_creative": { en: "Creative", he: "יצירה", ru: "Творчество", nl: "Creatief" },
  "startup_mode_simulation": { en: "Simulation controls", he: "ממשק סימולציות", ru: "Управление симуляциями", nl: "Simulatiebediening" },

  init_note: { en: "Applies on the next long-press of the simulation entry button.", he: "יחול בלחיצה הארוכה הבאה על כפתור הכניסה לסימולציה.", ru: "Применяется при следующем долгом нажатии кнопки входа в симуляцию.", nl: "Wordt toegepast bij de volgende lange druk op de simulatieknop." },
  init_board_size: { en: "Board size", he: "גודל הלוח", ru: "Размер поля", nl: "Bordgrootte" },
  init_brush_size: { en: "Brush size", he: "גודל המברשת", ru: "Размер кисти", nl: "Penseelgrootte" },
  init_save: { en: "Save", he: "שמירה", ru: "Сохранить", nl: "Opslaan" },
  init_reset: { en: "Reset to defaults", he: "איפוס לברירות המחדל", ru: "По умолчанию", nl: "Standaardwaarden" },
  init_defaults_pending: { en: "Defaults restored. Save to apply.", he: "ברירות המחדל שוחזרו. יש לשמור כדי להחיל.", ru: "Значения по умолчанию восстановлены. Сохраните для применения.", nl: "Standaardwaarden hersteld. Sla op om toe te passen." },
  init_saved: { en: "Saved. Applies on your next initialization.", he: "נשמר. יחול באתחול הבא.", ru: "Сохранено. Применится при следующей инициализации.", nl: "Opgeslagen. Geldt bij de volgende initialisatie." },
  init_saved_session: { en: "Saved for this visit. Browser storage is unavailable.", he: "נשמר לביקור הנוכחי. אחסון הדפדפן אינו זמין.", ru: "Сохранено для этого сеанса. Хранилище браузера недоступно.", nl: "Opgeslagen voor dit bezoek. Browseropslag is niet beschikbaar." },
  // Technician menu
  debug_button: { en: "Debug · Technician Menu", he: "דיבאג · תפריט טכנאים", ru: "Отладка · Меню техников", nl: "Debug · Technicusmenu" },
  debug_title: { en: "Behind the veil", he: "מאחורי הקלעים", ru: "За завесой", nl: "Achter de sluier" },
  debug_subtitle: { en: "Technician Menu", he: "תפריט טכנאים", ru: "Меню техников", nl: "Technicusmenu" },
  debug_soon: { en: "Coming soon", he: "בקרוב", ru: "Скоро", nl: "Binnenkort" },
  debug_init: { en: "Configure initialization", he: "הגדרת האתחול", ru: "Настройка инициализации", nl: "Initialisatie instellen" },
  debug_init_description: { en: "What happens when you long-press the simulation entry button.", he: "מה קורה בלחיצה ארוכה על כפתור הכניסה לסימולציה.", ru: "Что происходит при долгом нажатии кнопки входа в симуляцию.", nl: "Wat er gebeurt wanneer je de knop voor de simulatiemodus lang indrukt." },
  debug_back: { en: "Back to help", he: "חזרה לעזרה", ru: "Назад к справке", nl: "Terug naar hulp" },

  spiral_black_hole: { en: "Black Hole", he: "חור שחור", ru: "Чёрная дыра", nl: "Zwart gat" },
  help_category_evolution: { en: "Evolution", he: "אבולוציה", ru: "Эволюция", nl: "Evolutie" },
  help_category_controls: { en: "Controls", he: "כלי שליטה", ru: "Управление", nl: "Bediening" },
  help_category_evolution_modes: { en: "Evolution modes", he: "מצבי אבולוציה", ru: "Режимы эволюции", nl: "Evolutiemodi" },
  help_category_tips: { en: "Tips & Tricks", he: "טיפים וטריקים", ru: "Советы и хитрости", nl: "Tips & Trucs" },
  help_tip1: {"en": "Pause simulations before drawing. Choose a tool, then Play; Single step advances it once.", "he": "השהו סימולציות לפני ציור. בחרו כלי ואז הפעלה; צעד בודד מקדם אותו פעם אחת.", "ru": "Приостановите симуляцию перед рисованием. Выберите инструмент и запуск; один шаг продвигает его один раз.", "nl": "Pauzeer simulaties voordat je tekent. Kies een tool en Afspelen; Eén stap voert één stap uit."},
  help_tip2: {"en": "A quick double-tap on Palette or Color opens its picker; a single tap cycles choices.", "he": "לחיצה כפולה מהירה על פלטה או צבע פותחת את הבורר; לחיצה בודדת מדפדפת בין האפשרויות.", "ru": "Быстрое двойное нажатие на палитру или цвет открывает выбор; одиночное переключает варианты.", "nl": "Snel dubbeltikken op Palet of Kleur opent de kiezer; één tik bladert door keuzes."},
  help_tip3: {"en": "Without a fixed color, tap a board tile to advance its palette color; drag to use the starting tile color.", "he": "ללא צבע קבוע, הקשה על אריח מקדמת את צבעו בפלטה; גרירה משתמשת בצבע האריח שממנו התחלתם.", "ru": "Без фиксированного цвета нажатие на тайл продвигает его цвет; перетаскивание использует цвет начального тайла.", "nl": "Zonder vaste kleur schuift tikken de tegelkleur vooruit; slepen gebruikt de kleur van de starttegel."},
  help_tip4: {"en": "Hold a board tile: clear a selected color or rainbow brush; otherwise open the picker to color that tile.", "he": "החזיקו אריח בלוח: בחירת צבע או קשת מתבטלת; אם אין בחירה, נפתח בורר לצביעת האריח.", "ru": "Удерживайте тайл: выбранный цвет или радуга отменяются; без выбора открывается палитра для этого тайла.", "nl": "Houd een tegel vast: wis de gekozen kleur of regenboog; zonder keuze opent de kiezer om die tegel te kleuren."},
  help_tip5: {"en": "Hold + or − to enter a custom board size. Brush size has a separate slider.", "he": "החזיקו + או − לקביעת גודל לוח מותאם. גודל המברשת נקבע בסליידר נפרד.", "ru": "Удерживайте + или − для своего размера доски. Размер кисти задаётся отдельным ползунком.", "nl": "Houd + of − vast voor een aangepaste bordgrootte. Penseelgrootte heeft een aparte schuifregelaar."},
  help_tip6: {"en": "Sorting changes palette order while preserving current board colors; automatic tools follow the new order.", "he": "המיון משנה את סדר הפלטה ושומר על צבעי הלוח הנוכחיים; כלים אוטומטיים פועלים לפי הסדר החדש.", "ru": "Сортировка меняет порядок палитры, сохраняя цвета доски; автоматические инструменты следуют новому порядку.", "nl": "Sorteren verandert de paletvolgorde met behoud van de huidige bordkleuren; automatische tools volgen de nieuwe volgorde."},
  splashTitle: { en: "Follow Your Intuition", he: "היום יצרתי", ru: "Следуй своей интуиции", nl: "Volg je intuïtie" },
  startCreating: { en: "Start Creating", he: "יצירה", ru: "Начать творить", nl: "Begin met creëren" },
  skip: { en: "Skip", he: "דלגו", ru: "Пропустить", nl: "Overslaan" },
  saveModal_feelsLike: { en: "feels like", he: "שם היצירה", ru: "ощущается как", nl: "voelt als" },
  saveModal_defaultFilename: { en: "Journey", he: "מסע", ru: "Путешествие", nl: "Reis" },
  saveModal_close: { en: "Close", he: "סגור", ru: "Закрыть", nl: "Sluiten" },
  saveModal_saveImage: { en: "Save Image", he: "שמירה כתמונה", ru: "Сохранить изображение", nl: "Afbeelding opslaan" },
  saveModal_saveIdea: { en: "Save Idea", he: "שמירה כרעיון", ru: "Сохранить идею", nl: "Idee opslaan" },
  saveModal_loadIdea: {"en": "Load project or macro", "he": "טעינת רעיון או מאקרו", "ru": "Загрузить проект или макрос", "nl": "Project of macro laden"},
  saveModal_resetLogger: {"en": "Reset macro and save starting state", "he": "איפוס מאקרו ושמירת תחילית", "ru": "Сбросить макрос и сохранить начальное состояние", "nl": "Macro wissen en beginstatus bewaren"},
  saveModal_saveLogger: {"en": "Save macro", "he": "שמירת מאקרו", "ru": "Сохранить макрос", "nl": "Macro opslaan"},
  saveModal_logResetDone: {"en": "New starting state captured. Your macro begins here.", "he": "תחילית חדשה נשמרה. המאקרו מתחיל מכאן.", "ru": "Начальное состояние сохранено. Макрос начинается здесь.", "nl": "Nieuwe beginstatus bewaard. Je macro begint hier."},
  saveModal_resetRecipe: { en: "Reset recipe", he: "איפוס מתכון", ru: "Сбросить рецепт", nl: "Recept wissen" },
  saveModal_resetRecipePrompt: { en: "Clear the recorded actions and use this board as a new starting state? This cannot be undone.", he: "למחוק את הפעולות שנרשמו ולשמור את הלוח הנוכחי כתחילית חדשה? לא ניתן לבטל את האיפוס.", ru: "Удалить записанные действия и сохранить эту доску как начальное состояние? Сброс нельзя отменить.", nl: "De opgenomen acties wissen en dit bord als nieuwe beginstatus bewaren? Dit kan niet ongedaan worden gemaakt." },
  saveModal_logDownloadStarted: { en: "Macro download started.", he: "הורדת המאקרו החלה.", ru: "Загрузка макроса началась.", nl: "De macrodownload is gestart." },
  saveModal_logEmpty: { en: "No actions to save yet.", he: "עדיין אין פעולות לשמירה.", ru: "Пока нет действий для сохранения.", nl: "Er zijn nog geen acties om op te slaan." },
  breatheModal_solo: { en: "Solo", he: "תא תא", ru: "Соло", nl: "Solo" },
  breatheModal_group: { en: "Group", he: "צבע צבע", ru: "Группа", nl: "Groep" },
  resizeModal_title: { en: "Set Grid Size", he: "גודל הלוח החדש:", ru: "Установить размер сетки", nl: "Rasterformaat instellen" },
  resizeModal_prompt: { en: "Enter a number between 1 and 150.", he: "בין 1 ל-150", ru: "Введите число от 1 до 150.", nl: "Voer een getal in tussen 1 en 150." },  resizeModal_confirm: { en: "Set Size", he: "קבע גודל", ru: "Установить", nl: "Instellen" },
  paletteModal_title: { en: "Choose a Path", he: "בחירת נתיב", ru: "Выберите путь", nl: "Kies een pad" },
  colorPicker_rainbow: { en: "Select rainbow brush", he: "מברשת קשת", ru: "Выбрать радужную кисть", nl: "Selecteer regenboogpenseel" },
  colorPicker_select: { en: "Select color:", he: "בחר צבע:", ru: "Выбрать цвет:", nl: "Selecteer kleur:" },
  tooltip_invert: { en: "Invert Colors", he: "היפוך צבעים", ru: "Инвертировать цвета", nl: "Kleuren omkeren" },
  tooltip_palette: { en: "Switch palette", he: "עבור לפלטת הצבעים הבאה", ru: "Сменить палитру", nl: "Wissel palet" },
  tooltip_random: { en: "Explore Mood", he: "ערבוב כל פלטת הצבעים", ru: "Исследовать настроение", nl: "Ontdek sfeer" },
  tooltip_colorPicker: { en: "Choose Color", he: "בחירת צבע", ru: "Выбрать цвет", nl: "Kies kleur" },
  tooltip_symmetry: { en: "Symmetry Mode", he: "סימטריה", ru: "Режим симметрии", nl: "Symmetriemodus" },
  tooltip_brushMode: { en: "Mode: Drag to Copy", he: "גרירה והעתקה", ru: "Режим: Перетащить для копирования", nl: "Modus: Sleep om te kopiëren" },
  tooltip_redo: { en: "Redo", he: "בצע שוב", ru: "Повторить", nl: "Opnieuw" },
  tooltip_undo: { en: "Undo", he: "בטל", ru: "Отменить", nl: "Ongedaan maken" },
  tooltip_dark: { en: "Go dark", he: "לוח כהה", ru: "Затемнить", nl: "Verduisteren" },
  tooltip_specialReset: { en: "Visit somewhere", he: "אל הלא נודע", ru: "Отправиться в неизведанное", nl: "Bezoek ergens" },
  tooltip_resetBoard: { en: "Restart", he: "נקודת התחלה", ru: "Начать заново", nl: "Herstarten" },
  tooltip_resizeUp: { en: "Rise up!", he: "הגדלת הלוח", ru: "Увеличить!", nl: "Groter worden!" },
  tooltip_resizeDown: { en: "Go minimal", he: "הקטנת הלוח", ru: "Уменьшить", nl: "Minimaliseer" },
  tooltip_gap: { en: "Grid Separator", he: "מרווח בין אריחים", ru: "Разделитель сетки", nl: "Raster-scheiding" },
  tooltip_save: { en: "Capture", he: "שמירה", ru: "Захватить", nl: "Vastleggen" },
  tooltip_breathe: { en: "Breathe", he: "נשימה", ru: "Дыхание", nl: "Ademen" },
  tooltip_tutorial: { en: "Help Guide", he: "מדריך עזרה", ru: "Справка", nl: "Hulp" },
  tooltip_gameOfLife: { en: "Run 'Life' Generation. Long-press to configure rules.", he: "הפעל דור 'חיים'. לחיצה ארוכה להגדרת החוקים.", ru: "Запустить поколение 'Жизни'. Долгое нажатие для настройки правил.", nl: "Start 'Leven' Generatie. Lang indrukken om regels in te stellen." },
  tooltip_brightnessEvo: { en: "Run Brightness Evolution", he: "הפעל אבולוציית בהירות", ru: "Запустить эволюцию яркости", nl: "Start Helderheidsevolutie" },
  tooltip_gravitationalSort: { en: "Gravitational Sort", he: "מיון כבידתי", ru: "Гравитационная сортировка", nl: "Zwaartekrachtsortering" },
  tooltip_erosion: { en: "Erosion Simulation", he: "סימולציית ארוזיה", ru: "Симуляция эрозии", nl: "Erosiesimulatie" },
  erosion_off: { en: "Off", he: "כבוי", ru: "Выключено", nl: "Uit" },
  erosion_legacy: { en: "Original", he: "מקורי", ru: "Исходный", nl: "Origineel" },
  erosion_channels: { en: "Channel carving", he: "חציבת תעלות", ru: "Прорезание русел", nl: "Geulen uitslijten" },
  erosion_solid: { en: "Forward carving", he: "חציבה קדימה", ru: "Прорезание вперёд", nl: "Voorwaarts uitslijten" },
  tooltip_dla: { en: "Fractal Growth Simulation (DLA)", he: "סימולציית צמיחה פרקטלית (DLA)", ru: "Симуляция фрактального роста (DLA)", nl: "Fractale Groei Simulatie (DLA)" },
  tooltip_contour: { en: "Contour", he: "קווי מתאר", ru: "Контуры", nl: "Contour" }, // <-- ADDED HERE
  gs_modal_title: { en: "Gravitational Sort Settings", he: "הגדרות מיון כבידתי", ru: "Настройки гравитационной сортировки", nl: "Instellingen Zwaartekrachtsortering" },
  gs_modal_direction: { en: "Sort Direction", he: "כיוון המיון", ru: "Направление сортировки", nl: "Sorteerrichting" },
  gs_modal_strength: { en: "Sort Strength", he: "עוצמת המיון", ru: "Сила сортировки", nl: "Sorteerkracht" },
  gs_modal_strength_desc: { en: "Chance for a tile to 'fall' each step", he: "סיכוי של כל תא \"ליפול\" בכל צעד", ru: "Шанс 'падения' плитки на каждом шаге", nl: "Kans dat een tegel 'valt' per stap" },
  gs_modal_save_close: { en: "Save & Close", he: "שמור וסגור", ru: "Сохранить и закрыть", nl: "Opslaan & Sluiten" },
  gs_modal_cancel: { en: "Cancel", he: "ביטול", ru: "Отмена", nl: "Annuleren" },
  help_title: { en: "Controls Guide", he: "מה כל כפתור עושה?", ru: "Руководство по управлению", nl: "Gids voor besturing" },
  help_intro: {"en": "Choose a topic to explore the tools, actions and gestures.", "he": "בחרו נושא כדי לגלות את הכלים, הפעולות והמחוות.", "ru": "Выберите тему, чтобы узнать об инструментах, действиях и жестах.", "nl": "Kies een onderwerp om tools, acties en gebaren te ontdekken."},
  help_category_inspiration: { en: "Inspiration & Discovery", he: "השראה וגילוי", ru: "Вдохновение и открытия", nl: "Inspiratie & Ontdekking" },
  help_category_order: { en: "Order & Organization", he: "סדר וארגון", ru: "Порядок и организация", nl: "Orde & Organisatie" },
  help_category_touch: { en: "Personal Touch", he: "מגע אישי", ru: "Личный штрих", nl: "Persoonlijke Toets" },
  help_category_expression: { en: "Expression & Creation", he: "הבעה ויצירה", ru: "Выражение и творчество", nl: "Expressie & Creatie" },
  help_category_tools: { en: "Useful Tools", he: "כלים שימושיים", ru: "Полезные инструменты", nl: "Handige Tools" },
  help_category_shortcuts: {"en": "Keyboard navigation", "he": "ניווט במקלדת", "ru": "Навигация с клавиатуры", "nl": "Toetsenbordnavigatie"},
  brushMode_paint: { en: "Paint", he: "ציור", ru: "Рисовать", nl: "Verf" },
  brushMode_copy: { en: "Copy", he: "העתקה", ru: "Копировать", nl: "Kopieer" },
  brushMode_continuous: { en: "Paint with line completion", he: "ציור עם השלמת קווים", ru: "Рисование с соединением точек", nl: "Tekenen met lijnaanvulling" },
  symmetry_off: { en: "Symmetry Off", he: "סימטריה: כבוי", ru: "Симметрия выключена", nl: "Symmetrie uit" },
  symmetry_vertical: { en: "Vertical Symmetry", he: "סימטריה אנכית", ru: "Вертикальная симметрия", nl: "Verticale symmetrie" },
  symmetry_horizontal: { en: "Horizontal Symmetry", he: "סימטריה אופקית", ru: "Горизонтальная симметрия", nl: "Horizontale symmetrie" },
  symmetry_mandala: { en: "Mandala Mode", he: "מנדלה", ru: "Режим мандалы", nl: "Mandala-modus" },
  symmetry_kaleidoscope: { en: "Kaleidoscope", he: "קליידוסקופ", ru: "Калейдоскоп", nl: "Caleidoscoop" },
  paletteName_journey: { en: "Journey", he: "מסע", ru: "Путешествие", nl: "Reis" },
  paletteName_autumn: { en: "New-York Autumn", he: "סתיו בניו יורק", ru: "Нью-йоркская осень", nl: "New Yorkse Herfst" },
  paletteName_summer: { en: "Brazilian Summer", he: "קיץ ברזילאי", ru: "Бразильское лето", nl: "Braziliaanse Zomer" },
  paletteName_winter: { en: "Icelandic Winter", he: "חורף איסלנדי", ru: "Исландская зима", nl: "IJslandse Winter" },
  paletteName_spring: { en: "Japanese Spring", he: "אביב יפני", ru: "Японская весна", nl: "Japanse Lente" },
  paletteName_rainforest: { en: "Amazon Rainforest", he: "אמזונס", ru: "Тропический лес Амазонки", nl: "Amazone Regenwoud" },
  paletteName_sunrise: { en: "Desert Sunrise", he: "זריחה במדבר", ru: "Рассвет в пустыне", nl: "Woestijn zonsopgang" },
  paletteName_cherry: { en: "Cherry Blossom", he: "פריחת הדובדבן", ru: "Вишнёвый цвет", nl: "Kersenbloesem" },
  paletteName_sea: { en: "Deep Sea", he: "במעמקי הים", ru: "Глубокое море", nl: "Diepzee" },
  paletteName_noise: { en: "Brown Noise", he: "מטילי זהב", ru: "Золотой запас", nl: "Goudkoorts" },
  paletteName_cosmos: { en: "Cosmos", he: "הקיום", ru: "Космос", nl: "Kosmos" },
  paletteName_jasmine: { en: "Jasmine Dream", he: "יסמין", ru: "Жасминовая мечта", nl: "Jasmijndroom" },
  paletteName_sky: { en: "Sky", he: "רקיע", ru: "Небо", nl: "Lucht" },
  paletteName_healing: { en: "Healing", he: "ריפוי", ru: "Исцеление", nl: "Genezing" },
  paletteName_focus: { en: "Focus", he: "ריכוז", ru: "Фокус", nl: "Focus" },
  paletteName_telAvivSunset: { en: "Tel Aviv Sunset", he: "שקיעה תל אביבית", ru: "Тель-Авивский закат", nl: "Zonsondergang in Tel Aviv" },
  paletteName_amethystDream: { en: "Amethyst Dream", he: "חלום סגול", ru: "Аметистовая мечта", nl: "Amethist Droom" },
  help_category_simulations: { en: "Simulations & Automations", he: "סימולציות ואוטומציה", ru: "Симуляции и автоматизация", nl: "Simulaties & Automatisering" },
  help_toggleSimMode: {"en": "Simulation mode: tap to switch between creative and simulation controls.\nHold to initialize the board with your configured board and brush sizes, no gaps, a dark background, a light palette color and kaleidoscope symmetry. This changes the current board.", "he": "מצב סימולציה: לחיצה מחליפה בין לוח הבקרה ליצירה ולסימולציה.\nהחזקה מאתחלת לפי גודל הלוח והמברשת שהגדרתם, ללא מפרידים, עם רקע כהה, צבע בהיר בפלטה וסימטריית קליידוסקופ. הפעולה משנה את הלוח הנוכחי.", "ru": "Режим симуляции: нажатие переключает творческие и симуляционные инструменты.\nУдержание инициализирует доску с выбранными размерами доски и кисти, без разделителей, с тёмным фоном, светлым цветом палитры и симметрией калейдоскопа. Текущая доска изменяется.", "nl": "Simulatiemodus: tik om tussen creatieve en simulatieknoppen te wisselen.\nHoud vast om het bord te initialiseren met je ingestelde bord- en penseelgrootte, zonder tussenruimten, met een donkere achtergrond, lichte paletkleur en caleidoscoopsymmetrie. Dit wijzigt het huidige bord."},
  help_playPauseLife: {"en": "Play/Pause: run or pause the selected simulation or breathing mode.\nChoose a tool first; pause before drawing or switching simulations. Save the action log as a macro file from the Save dialog.", "he": "הפעלה/השהיה: מריצה או משהה את הסימולציה או מצב הנשימה שנבחרו.\nבחרו כלי תחילה; השהו לפני ציור או החלפת סימולציה. שמירת יומן הפעולות כקובץ מאקרו זמינה במודל השמירה.", "ru": "Запуск/пауза: запускает или приостанавливает выбранную симуляцию или дыхание.\nСначала выберите инструмент; приостановите перед рисованием или сменой симуляции. Сохраните журнал действий как макрос через окно сохранения.", "nl": "Afspelen/pauzeren: start of pauzeer de gekozen simulatie of ademmodus.\nKies eerst een tool; pauzeer voordat je tekent of van simulatie wisselt. Sla het actielogboek als macro op via het opslagvenster."},
  help_invert: {"en": "Invert: reverse each tile’s position in the current palette order.\nThe result depends on the sorting method. Hold to open advanced color mapping.", "he": "היפוך: כל תא עובר למיקום המקביל מהקצה השני של סדר הפלטה.\nהתוצאה תלויה בשיטת המיון. החזקה פותחת מיפוי צבעים מתקדם.", "ru": "Инверсия: каждый тайл получает цвет с противоположного конца порядка палитры.\nРезультат зависит от сортировки. Удержание открывает расширенное преобразование цветов.", "nl": "Omkeren: elke tegel krijgt de kleur op de tegenoverliggende positie in de paletvolgorde.\nHet resultaat hangt af van de sortering. Houd vast voor geavanceerde kleurtoewijzing."},
  help_palette: {"en": "Palette: tap to advance within the current palette group.\nQuickly double-tap to open the gallery and choose any palette.", "he": "פלטה: לחיצה עוברת לפלטה הבאה בקבוצה הנוכחית.\nלחיצה כפולה מהירה פותחת גלריה לבחירת פלטה מכל הקבוצות.", "ru": "Палитра: нажатие переключает на следующую палитру в текущей группе.\nБыстрое двойное нажатие открывает галерею всех палитр.", "nl": "Palet: tik voor het volgende palet in de huidige groep.\nDubbeltik snel om de galerij met alle paletten te openen."},
  help_random: {"en": "Random colors: tap to fill the board with random palette colors.\nHold to shuffle the existing colors instead.", "he": "צבעים אקראיים: לחיצה ממלאת את הלוח בצבעים אקראיים מהפלטה.\nהחזקה מערבבת את הצבעים שכבר נמצאים בלוח.", "ru": "Случайные цвета: нажатие заполняет доску случайными цветами палитры.\nУдержание перемешивает уже имеющиеся цвета.", "nl": "Willekeurige kleuren: tik om het bord met willekeurige paletkleuren te vullen.\nHoud vast om de bestaande kleuren te mengen."},
  help_colorPicker: {"en": "Color: tap to cycle through the current palette.\nQuickly double-tap to choose a color or rainbow brush. Hold the button to select the first palette color. In large palettes, swipe or use the page controls in the picker.", "he": "צבע: לחיצה עוברת בין צבעי הפלטה הנוכחית.\nלחיצה כפולה מהירה פותחת בחירת צבע או מברשת קשת. החזקה בוחרת את הצבע הראשון בפלטה. בפלטות גדולות אפשר לדפדף בבורר בהחלקה או בכפתורי העמודים.", "ru": "Цвет: нажатие переключает цвета текущей палитры.\nБыстрое двойное нажатие открывает выбор цвета или радужной кисти. Удержание выбирает первый цвет палитры. В больших палитрах листайте страницы свайпом или кнопками.", "nl": "Kleur: tik om door het huidige palet te bladeren.\nDubbeltik snel voor een kleur of regenboogpenseel. Houd vast voor de eerste paletkleur. Blader in grote paletten met veegbewegingen of paginaknoppen."},
  help_symmetry: { en: 'Cycle through symmetry modes: Off, Vertical, Horizontal, Mandala, and Kaleidoscope.', he: 'מעבר בין מצבי סימטריה: כבוי, אנכי, אופקי, מנדלה וקליידוסקופ.', ru: 'Переключает режимы симметрии: выкл., вертикальная, горизонтальная, мандала и калейдоскоп.', nl: 'Schakelt tussen symmetriemodi: Uit, Verticaal, Horizontaal, Mandala en Caleidoscoop.' },
  help_brushMode: {"en": "Brush: cycle between Paint, line completion (gold), and Copy. Line completion is the default.\nPaint by dragging; gold mode fills gaps along the drag. Without a fixed color, dragging paints with the starting tile color. Copy by dragging a source tile onto a destination. The brush-size slider changes the affected area.", "he": "מברשת: מעבר בין ציור, השלמת קווים בזהב והעתקה. השלמת קווים היא ברירת המחדל.\nציירו בגרירה; מצב הזהב משלים את הקו לאורך הגרירה. ללא צבע קבוע, הגרירה מציירת בצבע האריח שממנו התחילה. להעתקה גררו אריח מקור ליעד. סליידר גודל המברשת משנה את שטח הפעולה.", "ru": "Кисть: переключение между рисованием, соединением линий (золото) и копированием. Соединение линий включено по умолчанию.\nРисуйте перетаскиванием; золотой режим заполняет пропуски вдоль движения. Без выбранного цвета используется цвет начального тайла. Для копирования перетащите тайл на другой. Ползунок размера меняет область действия.", "nl": "Penseel: wissel tussen tekenen, lijnaanvulling (goud) en kopiëren. Lijnaanvulling is standaard.\nTeken door te slepen; goud vult gaten langs de sleepbeweging. Zonder vaste kleur gebruik je de kleur van de starttegel. Kopieer door een tegel naar een doel te slepen. De penseelgrootte bepaalt het bereik."},
  help_redo: { en: 'Redo the last action that was undone.', he: 'ביצוע מחדש של הפעולה האחרונה שבוטלה.', ru: 'Повторяет последнее отменённое действие.', nl: 'Voert de laatste ongedaan gemaakte actie opnieuw uit.' },
  help_undo: { en: 'Undo the last action.', he: 'ביטול הפעולה האחרונה.', ru: 'Отменяет последнее действие.', nl: 'Maakt de laatste actie ongedaan.' },
  help_dark: { en: 'Fill the entire grid with the darkest color from the current palette.', he: 'מילוי הלוח בצבע הכהה ביותר מהפלטה הנוכחית.', ru: 'Заполняет всю сетку самым тёмным цветом из текущей палитры.', nl: 'Vult het hele raster met de donkerste kleur uit het huidige palet.' },
  help_specialReset: { en: 'Generate a completely new grid with a random size, gap, and color palette.', he: 'יצירת לוח חדש לגמרי עם גודל, רווח ופלטת צבעים אקראיים.', ru: 'Создаёт совершенно новую сетку со случайным размером, зазором и цветовой палитрой.', nl: 'Genereert een compleet nieuw raster met een willekeurige grootte, tussenruimte en kleurenpalet.' },
  help_gameOfLife: {"en": "Game of Life: select it, then use Play or Single step.\nThe first palette color represents a dead cell; other colors are alive, except protected gold cells. Birth and survival follow the configured neighbor counts. New colors come from the average of living neighbors, matched to the palette.", "he": "משחק החיים: בחרו בו, ואז השתמשו בהפעלה או בצעד בודד.\nהצבע הראשון בפלטה מייצג תא מת; שאר הצבעים חיים, למעט תאי זהב מוגנים. לידה והישרדות נקבעות לפי מספר השכנים שהוגדר בחוקים. צבעים חדשים נוצרים מממוצע השכנים החיים ומותאמים לפלטה.", "ru": "Игра в жизнь: выберите её, затем используйте запуск или один шаг.\nПервый цвет палитры означает мёртвую клетку; остальные живые, кроме защищённых золотых клеток. Рождение и выживание зависят от настроенных чисел соседей. Новые цвета берутся из среднего цвета живых соседей и сопоставляются с палитрой.", "nl": "Game of Life: kies deze en gebruik Afspelen of Eén stap.\nDe eerste paletkleur staat voor dood; overige kleuren zijn levend, behalve beschermde gouden cellen. Geboorte en overleving volgen ingestelde aantallen buren. Nieuwe kleuren komen van het gemiddelde van levende buren, passend gemaakt aan het palet."},
  help_brightnessEvo: {"en": "Brightness evolution: cycle between off, brightness and contrast.\nUse Play or Single step to evolve colors according to neighboring tiles.", "he": "אבולוציית בהירות: מעבר בין כבוי, בהירות וקונטרסט.\nהפעלה או צעד בודד משנים את הצבעים לפי האריחים השכנים.", "ru": "Эволюция яркости: выключено, яркость, контраст.\nЗапуск или один шаг изменяет цвета по соседним тайлам.", "nl": "Helderheidsevolutie: wissel tussen uit, helderheid en contrast.\nAfspelen of Eén stap verandert kleuren op basis van aangrenzende tegels."},
  help_gravitationalSort: {"en": "Gravity: cycle between off, upward, rightward and center sorting.\nColors move according to their palette order. Select gravity and open Simulation settings for additional directions and parameters.", "he": "גרביטציה: מעבר בין כבוי, מיון למעלה, ימינה ולמרכז.\nהצבעים נעים לפי סדרם בפלטה. בחרו גרביטציה ופתחו הגדרות סימולציה לכיוונים ופרמטרים נוספים.", "ru": "Гравитация: выключено, сортировка вверх, вправо и к центру.\nЦвета перемещаются по порядку палитры. Дополнительные направления и параметры доступны в настройках выбранной гравитации.", "nl": "Zwaartekracht: wissel tussen uit en sortering omhoog, naar rechts of naar het midden.\nKleuren bewegen volgens de paletvolgorde. Kies zwaartekracht en open Simulatie-instellingen voor extra richtingen en parameters."},
  help_erosion: {"en": "Erosion: cycle between off, original erosion, forward carving and channel carving.\nOriginal uses the first 20% of the palette as earth, middle 60% as air and last 20% as water. Channel carving swaps air and earth, erodes earth backward through the palette, and lets water spread sideways when downward paths are blocked. Water stays at the bottom. Groups follow palette order, so sorting changes their colors. Forward carving uses the same movement but swaps the groups back: first 20% earth, middle 60% air, last 20% water. Earth erodes forward through the palette until it becomes air.", "he": "שחיקה: מעבר בין כבוי, שחיקה מקורית, חציבה קדימה וחציבת תעלות.\nבמקורית: 20% הראשונים בפלטה אדמה, 60% באמצע אוויר ו־20% האחרונים מים. בחציבת תעלות האוויר והאדמה מתחלפים, האדמה נשחקת לאחור בפלטה והמים זורמים גם לצדדים כשאין דרך לרדת. המים נשארים בתחתית. הקבוצות נקבעות לפי סדר הפלטה, ולכן מיון משנה את הצבעים שלהן. במצב חציבה קדימה התנועה זהה, אך החלוקה היא 20% ראשונים אדמה, 60% באמצע אוויר ו־20% אחרונים מים. האדמה נשחקת קדימה בפלטה עד שהיא הופכת לאוויר.", "ru": "Эрозия: выключено, исходная эрозия, прорезание вперёд и прорезание русел.\nВ исходном режиме первые 20% палитры — земля, средние 60% — воздух, последние 20% — вода. В режиме русел воздух и земля меняются местами, земля разрушается к началу палитры, вода течёт вбок, если путь вниз закрыт. Вода остаётся внизу. Группы зависят от порядка палитры. Прорезание вперёд: то же движение, но первые 20% — земля, средние 60% — воздух, последние 20% — вода. Земля разрушается вперёд по палитре, пока не станет воздухом.", "nl": "Erosie: wissel tussen uit, originele erosie, voorwaarts uitslijten en geulen uitslijten.\nOrigineel: eerste 20% aarde, middelste 60% lucht, laatste 20% water. Geulen: lucht en aarde wisselen, aarde slijt terug door de paletvolgorde en water stroomt zijwaarts als dalen niet kan. Water blijft onderaan. Groepen volgen de paletvolgorde. Voorwaarts uitslijten gebruikt dezelfde beweging: eerste 20% aarde, middelste 60% lucht, laatste 20% water. Aarde slijt vooruit door het palet totdat zij lucht wordt."},
  help_dla: {"en": "DLA: cycle between off, growth with color genetics and growth without color genetics.\nUse Play or Single step to grow clusters as moving particles attach to the existing structure.", "he": "DLA: מעבר בין כבוי, צמיחה עם גנטיקת צבע וצמיחה ללא גנטיקת צבע.\nהפעלה או צעד בודד מגדלים מבנים כאשר חלקיקים נעים נצמדים למבנה הקיים.", "ru": "DLA: выключено, рост с генетикой цвета и без неё.\nЗапуск или один шаг растит скопления, когда частицы прикрепляются к существующей структуре.", "nl": "DLA: wissel tussen uit, groei met kleurgenetica en zonder kleurgenetica.\nAfspelen of Eén stap laat clusters groeien doordat bewegende deeltjes zich aan de bestaande structuur hechten."},
  help_resetBoard: {"en": "Reset creation: return to a 5 × 5 Journey board with a central gold seed, dark background, gaps of 2 and symmetry off.\nThis is different from your saved startup settings and from simulation initialization.", "he": "איפוס יצירה: חזרה ללוח מסע בגודל 5 × 5 עם זרע זהב במרכז, רקע כהה, מפרידים בגודל 2 וסימטריה כבויה.\nזהו איפוס שונה מהגדרות הפתיחה השמורות ומאתחול לסימולציה.", "ru": "Сброс рисунка: доска Journey 5 × 5 с золотым семенем в центре, тёмным фоном, зазором 2 и без симметрии.\nЭто отличается от сохранённых настроек запуска и инициализации симуляции.", "nl": "Creatie resetten: terug naar Journey 5 × 5 met een gouden zaad in het midden, donkere achtergrond, tussenruimte 2 en symmetrie uit.\nDit verschilt van opgeslagen opstartinstellingen en simulatie-initialisatie."},
  help_resizeUp: { en: 'Increase the number of tiles on the grid. Long-press to set a custom size.', he: 'הגדלת מספר האריחים בלוח. לחיצה ארוכה לקביעת גודל מותאם.', ru: 'Увеличивает количество плиток на сетке. Долгое нажатие для установки пользовательского размера.', nl: 'Verhoogt het aantal tegels op het raster. Druk lang om een aangaste grootte in te stellen.' },
  help_resizeDown: { en: 'Decrease the number of tiles on the grid. Long-press to set a custom size.', he: 'הקטנת מספר האריחים בלוח. לחיצה ארוכה לקביעת גודל מותאם.', ru: 'Уменьшает количество плиток на сетке. Долгое нажатие для установки пользовательского размера.', nl: 'Verlaagt het aantal tegels op het raster. Druk lang om een aangaste grootte in te stellen.' },
  help_gap: { en: 'Adjust the spacing between the tiles.', he: 'שינוי המרווחים בין האריחים.', ru: 'Регулирует расстояние между плитками.', nl: 'Past de ruimte tussen de tegels aan.' },
  help_save: {"en": "Save and load: open a preview to share or save an image, save a JSON project, or load a project or TXT macro.\nThe Save dialog also lets you save the action log or reset it and save the current board as a new starting state.", "he": "שמירה וטעינה: פתיחת תצוגה מקדימה לשיתוף או שמירת תמונה, שמירת פרויקט JSON או טעינת פרויקט או מאקרו TXT.\nבמודל השמירה אפשר גם לשמור את הלוגר, או לאפס אותו ולשמור את הלוח הנוכחי כתחילית חדשה.", "ru": "Сохранение и загрузка: откройте просмотр для обмена или сохранения изображения, проекта JSON либо загрузки проекта или макроса TXT.\nВ окне сохранения можно сохранить журнал действий или сбросить его и сохранить текущую доску как новое начальное состояние.", "nl": "Opslaan en laden: open een voorbeeld om een afbeelding te delen of bewaren, een JSON-project op te slaan, of een project of TXT-macro te laden.\nIn het opslagvenster kun je ook het actielogboek opslaan of wissen en het huidige bord als nieuwe beginstatus bewaren."},
  help_breathe: {"en": "Breathing: cycle between off, individual and group breathing.\nPress Play to begin the visual pulse, and Pause to stop. Breathing does not change the stored tile colors.", "he": "נשימה: מעבר בין כבוי, נשימה אישית ונשימה קבוצתית.\nלחצו הפעלה לתחילת הפעימה והשהיה לעצירה. הנשימה אינה משנה את צבעי האריחים השמורים.", "ru": "Дыхание: выключено, индивидуальное и групповое.\nНажмите запуск для пульсации и паузу для остановки. Сохранённые цвета тайлов не меняются.", "nl": "Ademen: wissel tussen uit, individueel en groepsademen.\nDruk op Afspelen voor de visuele puls en Pauze om te stoppen. Opgeslagen tegelkleuren veranderen niet."},
  help_tutorial: { en: 'Opens this guide.', he: 'פתיחת מדריך זה.', ru: 'Открывает это руководство.', nl: 'Opent deze gids.' },
  error_invalidFile: { en: 'Error: The selected file is not a valid project file.', he: 'שגיאה: הקובץ שנבחר אינו קובץ פרויקט תקין.', ru: 'Ошибка: Выбранный файл не является допустимым файлом проекта.', nl: 'Fout: Het geselecteerde bestand is geen geldig projectbestand.' },
  error_readFile: { en: 'Error: Could not read the project file. It might be corrupted.', he: 'שגיאה: לא ניתן לקרוא את קובץ הפרויקט. ייתכן שהוא פגום.', ru: 'Ошибка: Не удалось прочитать файл проекта. Возможно, он повреждён.', nl: 'Fout: Kon het projectbestand niet lezen. Het is mogelijk beschadigd.' },
  
  dla_modal_title: { en: "Fractal Growth Settings (DLA)", he: "הגדרות צמיחה פרקטלית (DLA)", ru: "Настройки фрактального роста (DLA)", nl: "Instellingen Fractale Groei (DLA)" },
  dla_genetics_label: { en: "Color Genetics", he: "גנטיקת צבעים", ru: "Цветовая генетика", nl: "Kleurengenetica" },
  dla_genetics_desc: { en: "New particles inherit color from their neighbors.", he: "חלקיקים חדשים יורשים צבע משכניהם.", ru: "Новые частицы наследуют цвет от соседей.", nl: "Nieuwe deeltjes erven kleur van hun buren." },
  dla_edges_label: { en: "Spawn from Edges", he: "לידה מהקצוות", ru: "Появление с краёв", nl: "Verschijnen vanaf de randen" },
  dla_edges_desc: { en: "Particles start from the grid borders.", he: "חלקיקים מתחילים את דרכם מגבולות הלוח.", ru: "Частицы начинают с границ сетки.", nl: "Deeltjes starten vanaf de rasterranden." },
  dla_modal_save_close: { en: "Save & Close", he: "שמור וסגור", ru: "Сохранить и закрыть", nl: "Opslaan & Sluiten" },
  dla_modal_cancel: { en: "Cancel", he: "ביטול", ru: "Отмена", nl: "Annuleren" },
  dla_fastmode_label: { en: "Fast Fill Mode", he: "מצב מילוי מהיר", ru: "Быстрое заполнение", nl: "Snelle Vulmodus" },
  dla_fastmode_desc: { en: "Uses a faster algorithm for filling gaps.", he: "משתמש באלגוריתם מהיר למילוי חללים.", ru: "Использует быстрый алгоритם для заполнения.", nl: "Gebruikt een sneller algoritme om gaten te vullen." },

// --- START: Contour Settings Modal ---
  contour_modal_title: { en: "Contour Settings", he: "הגדרות קווי מתאר", ru: "Настройки контуров", nl: "Contour-instellingen" },
  contour_sensitivity_label: { en: "Sensitivity", he: "רגישות", ru: "Чувствительность", nl: "Gevoeligheid" },
  contour_sensitivity_desc: { en: "Determines the color difference needed to draw a line.", he: "קובע כמה הבדל נדרש בין צבעים כדי ליצור קו.", ru: "Определяет разницу в цвете, необходимую для рисования линии.", nl: "Bepaalt het kleurverschil dat nodig is om een lijn te tekenen." },
  contour_sensitivity_low: { en: "Low", he: "נמוכה", ru: "Низкая", nl: "Laag" },
  contour_sensitivity_high: { en: "High", he: "גבוהה", ru: "Высокая", nl: "Hoog" },
  contour_color_label: { en: "Line Color", he: "צבע קו", ru: "Цвет линии", nl: "Lijnkleur" },
  contour_color_darkest: { en: "Darkest", he: "הכהה ביותר", ru: "Самый темный", nl: "Donkerste" },
  contour_color_lightest: { en: "Lightest", he: "הבהיר ביותר", ru: "Самый светлый", nl: "Lichtste" },
  // --- END: Contour Settings Modal ---


// Phase 1 Additions
  adaptModal_title: { en: "Adapt Colors to Palette", he: "התאם צבעים לפלטה", ru: "Адаптировать цвета к палитре", nl: "Kleuren aan palet aanpassen" },
  adaptModal_desc: { en: "This will remap the board's colors to the current palette for consistent tool behavior. This action can be undone.", he: "פעולה זו תתאם את צבעי היצירה לפלטה הנוכחית. ניתן לבטל באמצעות כפתור ה-Undo.", ru: "Это действие переназначит цвета на доске к текущей палитре для последовательной работы инструментов. Это действие можно отменить.", nl: "Dit zal de kleuren van het bord opnieuw toewijzen aan het huidige palet voor consistent gedrag van de tools. Deze actie kan ongedaan worden gemaakt." },
  adaptModal_confirmBtn: { en: "Confirm & Adapt", he: "אשר והתאם", ru: "Подтвердить и адаптировать", nl: "Bevestig & Pas aan" }, 

// --- START: Chi Flow Settings Modal ---
  chi_modal_title: { en: "Chi Flow Settings", he: "הגדרות זרימת צ'י", ru: "Настройки потока Ци", nl: "Chi Flow Instellingen" },
  chi_awakening_label: { en: "Awakening Rules", he: "חוקי התעוררות", ru: "Правила пробуждения", nl: "Ontwakingsregels" },
  chi_awakening_desc: { en: "A dark cell ignites if it has this many active neighbors:", he: "תא חשוך נדלק אם יש סביבו כך וכך שכנים פעילים:", ru: "Темная клетка загорается, если вокруг столько активных соседей:", nl: "Een donkere cel ontbrandt als het zoveel actieve buren heeft:" },
  chi_flow_label: { en: "Flow Rules", he: "חוקי זרימה", ru: "Правила потока", nl: "Stroomregels" },
  chi_flow_desc: { en: "An active cell flows to the next color if pulled by:", he: "תא פעיל מתקדם לצבע הבא אם הוא נמשך על ידי:", ru: "Активная клетка перетекает в следующий цвет, если ее тянут:", nl: "Een active cel stroomt naar de volgende kleur als deze wordt getrokken door:" },
  chi_reach_label: { en: "Magnetic Reach", he: "טווח משיכה (מגנטיות)", ru: "Магнитный охват", nl: "Magnetisch bereik" },
  chi_reach_desc: { en: "How far ahead a neighbor's color can be to pull a cell.", he: "כמה צבעים קדימה שכן יכול להיות כדי למשוך את התא.", ru: "Насколько цвет соседа может опережать, чтобы притянуть клетку.", nl: "Hoe ver vooruit de kleur van een buurman kan zijn om een cel te trekken." },
  chi_preset_topography: { en: "Topography", he: "טופוגרפיה", ru: "Топография", nl: "Topografie" },
  chi_preset_wildfire: { en: "Wildfire", he: "אש פראית", ru: "Лесной пожар", nl: "Natuurbrand" },
  chi_preset_crystals: { en: "Crystals", he: "גבישים", ru: "Кристаллы", nl: "Kristallen" },
chi_preset_electric: { en: "Electric", he: "חשמל", ru: "Электричество", nl: "Elektrisch" },
  chi_preset_fluent: { en: "Fluent", he: "שוטף", ru: "Плавный", nl: "Vloeiend" },
  chi_preset_harmony: { en: "Harmony", he: "הרמוני", ru: "Гармония", nl: "Harmonie" },
 chi_preset_ripples: { en: "Ripples", he: "אדוות", ru: "Ряבь", nl: "Rimpelingen" },
 chi_preset_nova: { en: "Nova", he: "נובה", ru: "Нова", nl: "Nova" },
  gol_preset_continuum: { en: "Continuum", he: "רצף", ru: "Континуум", nl: "Continuüm" },
  chi_preset_alexis: { en: "Alexis", he: "אלקסיס", ru: "Алексис", nl: "Alexis" },
  chi_preset_zen: { en: "Zen", he: "זן", ru: "Дзен", nl: "Zen" },
  tooltip_turing: { en: "Turing Patterns", he: "תבניות טיורינג (ביולוגיה)", ru: "Паттерны Тьюринга", nl: "Turing Patronen" },
  turing_modal_title: { en: "Turing Patterns", he: "תבניות טיורינג", ru: "Паттерны Тьюринга", nl: "Turing Patronen" },
  turing_preset_coral: { en: "Coral", he: "אלמוג", ru: "Коралл", nl: "Koraal" },
  turing_preset_maze: { en: "Maze", he: "מבוך", ru: "Лабиринт", nl: "Doolhof" },
  turing_preset_spots: { en: "Spots", he: "כתמים", ru: "Пятна", nl: "Vlekken" },
turing_preset_cells: { en: "Cells", he: "תאים", ru: "Клетки", nl: "Cellen" },
  turing_preset_boiling: { en: "Boiling", he: "רתיחה", ru: "Кипение", nl: "Koken" },
  turing_preset_uskate: { en: "U-Skate", he: "גלישה", ru: "Скейт", nl: "U-Skate" },
  turing_preset_chaos: { en: "Chaos", he: "כאוס", ru: "Хаос", nl: "Chaos" },
turing_preset_waves: { en: "Waves", he: "גלים", ru: "Волны", nl: "Golven" },
  
  tooltip_spiral: { en: "Spiral Pattern", he: "ספירלה", ru: "Спираль", nl: "Spiraal" },
  magnet_modal_title: { en: "Magnet Settings", he: "הגדרות מגנט", ru: "Настройки магнита", nl: "Magneetinstellingen" },
  magnet_mode_label: { en: "Magnet Type", he: "סוג המגנט", ru: "Тип магнита", nl: "Type magneet" },
  magnet_anchor_label: { en: "Anchor Color", he: "צבע Anchor", ru: "Цвет якоря", nl: "Anker kleur" },
}; 




export function getCurrentLang() {
  return currentLang;
}

export function getAvailableLangs() {
    return availableLangs;
}

export function setCurrentLang(lang) {
  if (availableLangs.includes(lang)) {
    currentLang = lang;
    try {
      localStorage.setItem('userLanguage', lang);
    } catch (e) {
      console.warn('Could not save language to localStorage.');
    }
    listeners.forEach(callback => callback(currentLang));
  }
}

export function getText(key) {
  if (!translations[key] || !translations[key][currentLang]) {
    console.warn(`Translation key not found for lang '${currentLang}': ${key}`);
    return translations[key] ? translations[key]['en'] : key;
  }
  return translations[key][currentLang];
}

export function initializeLanguage() {
    try {
        const savedLang = localStorage.getItem('userLanguage');
        if (savedLang && availableLangs.includes(savedLang)) {
            currentLang = savedLang;
        }
    } catch(e) {
        console.warn('Could not read language from localStorage.');
    }
}
