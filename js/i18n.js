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
  help_keyboard_escape: {"en": "Close sorting, Nudge speed or technician dialogs.\nUnsaved sorting changes are discarded.", "he": "סגירת חלונות המיון, מהירות Nudge והטכנאים. שינויי מיון שלא נשמרו מתבטלים.", "ru": "Закрыть окна сортировки, скорости Nudge и техников. Несохранённые изменения сортировки отменяются.", "nl": "Sluit sorteren, Nudge-snelheid of technici. Niet-opgeslagen sorteerwijzigingen vervallen."},
  help_keyboard_activate: {"en": "Activate a button or toggle a selection.", "he": "הפעלת כפתור או שינוי סימון.", "ru": "Активировать кнопку или изменить отметку.", "nl": "Activeer een knop of wijzig een selectie."},
  help_keyboard_focus: {"en": "Move to the next or previous control.", "he": "מעבר לפקד הבא או הקודם.", "ru": "Перейти к следующему или предыдущему элементу.", "nl": "Ga naar het volgende of vorige bedieningselement."},
  help_keyboard_sort: {"en": "Open sorting settings when its button is focused.", "he": "פתיחת הגדרות המיון כשהכפתור ממוקד.", "ru": "Открыть настройки сортировки, когда её кнопка в фокусе.", "nl": "Open sorteerinstellingen wanneer de knop focus heeft."},
  help_category_advanced: {"en": "Advanced tools", "he": "למתקדמים", "ru": "Для опытных пользователей", "nl": "Geavanceerde tools"},
  help_technicians: {"en": "Startup and evolution-initialization settings. Changes apply on the next launch or initialization.\nKeep holding evolution entry to open this menu — the board initializes first.", "he": "הגדרות לפתיחת האפליקציה ולאתחול אבולוציה. השינויים חלים בפתיחה או באתחול הבאים.\nהמשיכו להחזיק את כפתור הכניסה לאבולוציה לפתיחת הטכנאים — הלוח מאותחל קודם.", "ru": "Настройки запуска и инициализации эволюции. Изменения действуют при следующем запуске или инициализации.\nПродолжайте удерживать вход в эволюцию для меню техников — сначала доска инициализируется.", "nl": "Instellingen voor opstarten en evolutie-initialisatie. Wijzigingen gelden bij de volgende start of initialisatie.\nBlijf de evolutie-ingang vasthouden voor het technici-menu — het bord initialiseert eerst."},
  help_macro: {"en": "Load a journey (TXT) and press Play. You can change its starting palette before playback.\nTap the board during playback to toggle full screen. Tap the macro overlay to stop the journey.", "he": "טענו מסע (TXT) ולחצו הפעלה. אפשר להחליף פלטת התחלה לפני הניגון.\nלחיצה על הלוח בזמן הניגון מחליפה מסך מלא. לחיצה על שכבת המאקרו מפסיקה את המסע.", "ru": "Загрузите путь (TXT) и нажмите запуск. Перед запуском можно сменить начальную палитру.\nНажатие на доску при воспроизведении переключает полный экран. Нажатие на слой макроса останавливает путь.", "nl": "Laad een reis (TXT) en druk op Afspelen. Je kunt vooraf het startpalet wijzigen.\nTik tijdens het afspelen op het bord voor volledig scherm. Tik op de macrolaag om de reis te stoppen."},
  help_nudge_backward: {"en": "Nudge backward: shift colors back one palette step and select Nudge.\nSpeed in settings. Backward does not always mean darker.", "he": "Nudge אחורה: הזזת הצבעים צעד לאחור בפלטה ובחירת Nudge.\nמהירות בהגדרות. אחורה אינו תמיד כהה יותר.", "ru": "Nudge назад: сдвиг цветов на шаг назад и выбор Nudge.\nСкорость в настройках. Назад не всегда значит темнее.", "nl": "Nudge achteruit: schuif kleuren één paletstap terug en selecteer Nudge.\nSnelheid staat in de instellingen. Achteruit is niet altijd donkerder."},
  help_nudge_forward: {"en": "Nudge forward: shift colors one palette step and select Nudge.\nSpeed in settings. Forward does not always mean lighter.", "he": "Nudge קדימה: הזזת הצבעים צעד בפלטה ובחירת Nudge.\nמהירות בהגדרות. קדימה אינו תמיד בהיר יותר.", "ru": "Nudge вперёд: сдвиг цветов на шаг палитры и выбор Nudge.\nСкорость в настройках. Вперёд не всегда значит светлее.", "nl": "Nudge vooruit: schuif kleuren één paletstap en selecteer Nudge.\nSnelheid staat in de instellingen. Vooruit is niet altijd lichter."},
  help_turing: {"en": "Create patterns through reaction and diffusion.\nPresets and parameters in settings.", "he": "יצירת דפוסים בתגובה ודיפוזיה.\nפריסטים ופרמטרים בהגדרות.", "ru": "Создание узоров реакцией и диффузией.\nПресеты и параметры в настройках.", "nl": "Maak patronen door reactie en diffusie.\nPresets en parameters staan in de instellingen."},
  help_sandpile: {"en": "Chi Flow: awakening and color flow based on neighbors.\nRules and presets in settings.", "he": "זרימת צ׳י: התעוררות וזרימת צבע לפי השכנים.\nחוקים ופריסטים בהגדרות.", "ru": "Поток Ци: пробуждение и поток цвета по соседям.\nПравила и пресеты в настройках.", "nl": "Chi Flow: ontwaken en kleurstroming op basis van buren.\nRegels en presets staan in de instellingen."},
  help_contour: {"en": "Grow boundaries between colors.\nSensitivity and line color in settings.", "he": "הרחבת גבולות בין צבעים.\nרגישות וצבע הקו בהגדרות.", "ru": "Расширение границ между цветами.\nЧувствительность и цвет линии в настройках.", "nl": "Breid grenzen tussen kleuren uit.\nGevoeligheid en lijnkleur staan in de instellingen."},
  help_magnet: {"en": "Cosmic, regular or time magnet.\nExpand and anchor color in settings.", "he": "Cosmic, רגיל או מגנט זמן.\nExpand וצבע העוגן בהגדרות.", "ru": "Cosmic, обычный или временной магнит.\nExpand и цвет якоря в настройках.", "nl": "Cosmic, gewone of tijdmagneet.\nExpand en ankerkleur staan in de instellingen."},
  help_spiral: {"en": "Experiment B, Left or Black hole.\nMore modes in settings.", "he": "ניסוי B, שמאלה או חור שחור.\nמצבים נוספים בהגדרות.", "ru": "Эксперимент B, влево или чёрная дыра.\nДругие режимы в настройках.", "nl": "Experiment B, Links of Zwart gat.\nMeer modi staan in de instellingen."},
  help_sim_settings: {"en": "Settings for the selected evolution.\nOn buttons with settings, swipe up to open them while paused.", "he": "הגדרות האבולוציה שנבחרה.\nבכפתורים עם הגדרות, החלקה מעלה פותחת אותן בהשהיה.", "ru": "Настройки выбранной эволюции.\nНа кнопках с настройками свайп вверх открывает их на паузе.", "nl": "Instellingen van de gekozen evolutie.\nVeeg op knoppen met instellingen omhoog om ze te openen terwijl de evolutie gepauzeerd is."},
  help_step: {"en": "One step of the selected evolution while paused.\nNot available for breathing.", "he": "צעד אחד באבולוציה שנבחרה, כשהיא מושהית.\nלא זמין בנשימה.", "ru": "Один шаг выбранной эволюции на паузе.\nНедоступно для дыхания.", "nl": "Eén stap van de gekozen evolutie terwijl die gepauzeerd is.\nNiet beschikbaar voor ademen."},
  help_sort: {"en": "Tap for the next sorting method.\nSwipe up to choose methods and cycle order. Select, set positions, then save. Reset restores the default cycle; save to apply.", "he": "לחיצה לשיטת המיון הבאה.\nהחלקה מעלה לבחירת שיטות וסדר הסבב. סמנו שיטות, קבעו מיקומים ושמרו. איפוס מחזיר את סבב ברירת המחדל; שמרו להחלה.", "ru": "Нажатие — следующий способ сортировки.\nСвайп вверх — выбор способов и порядка. Отметьте, задайте позиции и сохраните. Сброс возвращает исходный цикл; сохраните для применения.", "nl": "Tik voor de volgende sorteermethode.\nVeeg omhoog om methoden en volgorde te kiezen. Selecteer, kies posities en sla op. Reset herstelt de standaardcyclus; sla op om toe te passen."},
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
  help_tip1: {"en": "Palette order affects how evolutions behave.", "he": "סדר הפלטה משפיע על התנהגות האבולוציות.", "ru": "Порядок палитры влияет на поведение эволюций.", "nl": "De paletvolgorde beïnvloedt het gedrag van evoluties."},
  help_tip2: {"en": "On a phone, swipe up; on a computer, drag up.", "he": "בטלפון החליקו מעלה; במחשב גררו מעלה.", "ru": "На телефоне — свайп вверх; на компьютере — перетаскивание вверх.", "nl": "Veeg op een telefoon omhoog; sleep op een computer omhoog."},
  help_tip3: {"en": "Without a selected color: tap to advance a tile color; drag to use the starting tile color.", "he": "ללא צבע נבחר: הקשה מקדמת צבע, וגרירה משתמשת בצבע אריח ההתחלה.", "ru": "Без выбранного цвета: нажатие меняет цвет на следующий; перетаскивание использует цвет начальной клетки.", "nl": "Zonder gekozen kleur: tik om de tegelkleur vooruit te schuiven; sleep met de kleur van de starttegel."},
  help_tip4: {"en": "Hold a tile to clear a selected color or rainbow. Without a selection, its color picker opens.", "he": "החזקה על אריח מבטלת בחירת צבע או קשת. ללא בחירה, נפתח בורר צבע.", "ru": "Удержание клетки отменяет цвет или радугу. Без выбора открывается выбор цвета клетки.", "nl": "Houd een tegel vast om een kleur of regenboog te wissen. Zonder selectie opent de kleurkiezer voor die tegel."},
  help_tip5: {"en": "Rainbow gives each tile a random palette color.", "he": "קשת צובעת כל אריח בצבע אקראי מהפלטה.", "ru": "Радуга даёт каждой клетке случайный цвет палитры.", "nl": "Regenboog geeft elke tegel een willekeurige paletkleur."},
  help_tip6: {"en": "Sorting keeps board colors and your chosen paint color. Switching palettes clears the color selection.", "he": "מיון שומר על צבעי הלוח ועל צבע הציור הנבחר. החלפת פלטה מבטלת בחירת צבע.", "ru": "Сортировка сохраняет цвета доски и выбранный цвет рисования. Смена палитры отменяет выбор цвета.", "nl": "Sorteren behoudt bordkleuren en je gekozen schilderkleur. Een ander palet wist de kleurselectie."},
  help_tip7: {"en": "Only one method in the cycle? The sorting button stays on it.", "he": "שיטה אחת בסבב? כפתור המיון נשאר עליה.", "ru": "В цикле один способ? Кнопка сортировки остаётся на нём.", "nl": "Eén methode in de cyclus? De sorteerknop blijft daarop staan."},
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
  saveModal_labelMoment: { en: "Moment", he: "רגע", ru: "Момент", nl: "Moment" },
  saveModal_labelJourney: { en: "Journey", he: "מסע", ru: "Путь", nl: "Reis" },
  saveModal_labelIdea: { en: "Idea", he: "רעיון", ru: "Идея", nl: "Idee" },
  saveModal_labelLoad: { en: "Load", he: "טעינה", ru: "Загрузка", nl: "Laden" },
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
  help_title: {"en": "Quick guide", "he": "מדריך קצר", "ru": "Краткий гид", "nl": "Korte gids"},
  help_intro: {"en": "Choose a topic.", "he": "בחרו נושא.", "ru": "Выберите тему.", "nl": "Kies een onderwerp."},
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
  help_toggleSimMode: {"en": "Tap to switch between creation and evolution.\nHold to initialize the board and start a new journey. Board and brush sizes follow your settings; no spacing, kaleidoscope symmetry, first palette color as background and last color for painting.", "he": "לחיצה למעבר בין יצירה לאבולוציה.\nהחזקה לאתחול הלוח ולהתחלת מסע חדש. גודל הלוח והמברשת לפי ההגדרות; ללא מפרידים, עם קליידוסקופ. רקע בצבע הראשון וציור באחרון בפלטה.", "ru": "Нажатие — переход между творчеством и эволюцией.\nУдержание — инициализация доски и начало нового пути. Размеры доски и кисти из настроек; без зазоров, с калейдоскопом. Фон — первый цвет, рисование — последний.", "nl": "Tik om tussen creatie en evolutie te wisselen.\nHoud vast om het bord te initialiseren en een nieuwe reis te starten. Bord- en penseelgrootte volgen je instellingen; geen tussenruimte, caleidoscoop. Achtergrond: eerste paletkleur; schilderen: laatste kleur."},
  help_playPauseLife: {"en": "Play or pause the selected evolution.\nPause before drawing.", "he": "הפעלה או השהיה של האבולוציה שנבחרה.\nהשהו לפני ציור.", "ru": "Запустить или приостановить выбранную эволюцию.\nПеред рисованием поставьте на паузу.", "nl": "Start of pauzeer de gekozen evolutie.\nPauzeer voordat je tekent."},
  help_invert: {"en": "Reverse palette positions on the board, except gold tiles.\nHold for color mapping.", "he": "היפוך סדר הצבעים בלוח, למעט תאי זהב.\nהחזקה למיפוי צבעים.", "ru": "Обратить порядок цветов на доске, кроме золотых клеток.\nУдержание — сопоставление цветов.", "nl": "Keer kleurposities op het bord om, behalve gouden tegels.\nHoud vast voor kleurtoewijzing."},
  help_palette: {"en": "Tap for the next palette in this group.\nSwipe up to choose a palette.", "he": "לחיצה לפלטה הבאה בקבוצה.\nהחלקה מעלה לבחירת פלטה.", "ru": "Нажатие — следующая палитра в группе.\nСвайп вверх — выбор палитры.", "nl": "Tik voor het volgende palet in deze groep.\nVeeg omhoog om een palet te kiezen."},
  help_random: {"en": "Tap for random colors.\nHold to shuffle existing colors.", "he": "לחיצה לצבעים אקראיים.\nהחזקה לערבוב הצבעים הקיימים.", "ru": "Нажатие — случайные цвета.\nУдержание — перемешать текущие цвета.", "nl": "Tik voor willekeurige kleuren.\nHoud vast om bestaande kleuren te mengen."},
  help_colorPicker: {"en": "Tap to cycle colors.\nSwipe up to choose a color or rainbow. Hold for the first palette color. Swipe sideways or use arrows to change picker pages.", "he": "לחיצה לדפדוף בצבעים.\nהחלקה מעלה לבחירת צבע או קשת. החזקה לצבע הראשון. בבורר, החליקו לצדדים או השתמשו בחצים לדפדוף בעמודים.", "ru": "Нажатие — смена цвета.\nСвайп вверх — выбор цвета или радуги. Удержание — первый цвет. Листайте страницы свайпом вбок или стрелками.", "nl": "Tik om door kleuren te bladeren.\nVeeg omhoog voor een kleur of regenboog. Houd vast voor de eerste kleur. Wissel kiezerpagina’s met zijwaartse veegbewegingen of pijlen."},
  help_symmetry: {"en": "Off, vertical, horizontal, mandala or kaleidoscope.", "he": "כבוי, אנכי, אופקי, מנדלה או קליידוסקופ.", "ru": "Выключено, вертикаль, горизонталь, мандала или калейдоскоп.", "nl": "Uit, verticaal, horizontaal, mandala of caleidoscoop."},
  help_brushMode: {"en": "Paint, line completion or copy. Gold mode connects points while dragging.\nTo copy, drag a source tile to its destination. Adjust brush size with the slider.", "he": "ציור, השלמת קווים או העתקה. מצב הזהב מחבר את הקו בגרירה.\nלהעתקה, גררו אריח מקור ליעד. גודל המברשת נקבע בסליידר.", "ru": "Рисование, соединение точек или копирование. Золотой режим соединяет линию при перетаскивании.\nДля копирования перетащите клетку к цели. Размер кисти задаётся ползунком.", "nl": "Schilderen, lijnen verbinden of kopiëren. De gouden modus verbindt punten tijdens het slepen.\nSleep een brontegel naar het doel om te kopiëren. Pas de penseelgrootte aan met de schuifregelaar."},
  help_redo: {"en": "Restore the undone action.", "he": "החזרת הפעולה שבוטלה.", "ru": "Вернуть отменённое действие.", "nl": "Herstel de ongedaan gemaakte actie."},
  help_undo: {"en": "Undo the last action.", "he": "ביטול הפעולה האחרונה.", "ru": "Отменить последнее действие.", "nl": "Maak de laatste actie ongedaan."},
  help_dark: {"en": "Fill the board with the first palette color.", "he": "מילוי הלוח בצבע הראשון בפלטה.", "ru": "Заполнить доску первым цветом палитры.", "nl": "Vul het bord met de eerste paletkleur."},
  help_specialReset: {"en": "New board with a random palette, size and spacing.", "he": "לוח חדש עם פלטה, גודל ומרווחים אקראיים.", "ru": "Новая доска со случайной палитрой, размером и зазорами.", "nl": "Nieuw bord met een willekeurig palet, formaat en tussenruimte."},
  help_gameOfLife: {"en": "Cells are born and survive according to their neighbors. Rules and presets in settings.\nThe first palette color is dead; gold tiles are protected.", "he": "תאים נולדים ושורדים לפי השכנים. חוקים ופריסטים בהגדרות.\nהצבע הראשון בפלטה הוא תא מת; תאי זהב מוגנים.", "ru": "Клетки рождаются и выживают по числу соседей. Правила и пресеты в настройках.\nПервый цвет палитры — мёртвая клетка; золотые клетки защищены.", "nl": "Cellen ontstaan en overleven op basis van hun buren. Regels en presets staan in de instellingen.\nDe eerste paletkleur is een dode cel; gouden tegels zijn beschermd."},
  help_brightnessEvo: {"en": "Brightness or contrast based on neighboring colors.", "he": "בהירות או קונטרסט לפי צבעי השכנים.", "ru": "Яркость или контраст по цветам соседей.", "nl": "Helderheid of contrast op basis van naburige kleuren."},
  help_gravitationalSort: {"en": "Sort upward, rightward or toward the center.\nMore modes and strength in settings.", "he": "מיון למעלה, ימינה או למרכז.\nמצבים נוספים ועוצמה בהגדרות.", "ru": "Сортировка вверх, вправо или к центру.\nДругие режимы и сила в настройках.", "nl": "Sorteren naar boven, rechts of het midden.\nMeer modi en kracht staan in de instellingen."},
  help_erosion: {"en": "Water erodes earth. Original, forward carving or channel carving. Groups follow palette order.\nChannel carving swaps air and earth groups. In both carving modes, water stays at the bottom.", "he": "מים שוחקים אדמה. מקורית, חציבה קדימה או חציבת תעלות. הקבוצות לפי סדר הפלטה.\nבחציבת תעלות האוויר והאדמה מתחלפים. בשני מצבי החציבה המים נשארים בתחתית.", "ru": "Вода размывает землю. Исходный режим, прямая эрозия или каналы. Группы следуют порядку палитры.\nВ каналах группы воздуха и земли меняются местами. В обоих режимах эрозии вода остаётся внизу.", "nl": "Water erodeert aarde. Origineel, vooruit uithollen of kanalen uithollen. Groepen volgen de paletvolgorde.\nBij kanalen wisselen lucht en aarde van groep. In beide uitholmodi blijft water onderaan."},
  help_dla: {"en": "Particles attach to a structure and grow it.\nWith or without color genetics.", "he": "חלקיקים נצמדים למבנה ומגדלים אותו.\nעם גנטיקת צבע או בלעדיה.", "ru": "Частицы прикрепляются к структуре и растят её.\nС генетикой цвета или без неё.", "nl": "Deeltjes hechten zich aan een structuur en laten die groeien.\nMet of zonder kleurgenetica."},
  help_resetBoard: {"en": "Return to Journey, a 5×5 board and a gold seed in the center.\nSpacing 2, symmetry off.", "he": "חזרה לפלטת מסע, לוח 5×5 וזרע זהב במרכז.\nמפרידים 2, ללא סימטריה.", "ru": "Вернуться к Journey, доске 5×5 и золотому семени в центре.\nЗазор 2, симметрия выключена.", "nl": "Terug naar Journey, een bord van 5×5 en een gouden zaad in het midden.\nTussenruimte 2, symmetrie uit."},
  help_resizeUp: {"en": "Enlarge the board.\nHold to enter an exact size.", "he": "הגדלת הלוח.\nהחזקה לקביעת גודל מדויק.", "ru": "Увеличить доску.\nУдержание — точный размер.", "nl": "Vergroot het bord.\nHoud vast voor een exact formaat."},
  help_resizeDown: {"en": "Shrink the board from its edges.\nHold to enter an exact size.", "he": "הקטנת הלוח מהקצוות.\nהחזקה לקביעת גודל מדויק.", "ru": "Уменьшить доску, обрезая края.\nУдержание — точный размер.", "nl": "Verklein het bord vanaf de randen.\nHoud vast voor een exact formaat."},
  help_gap: { en: 'Adjust the spacing between the tiles.', he: 'שינוי המרווחים בין האריחים.', ru: 'Регулирует расстояние между плитками.', nl: 'Past de ruimte tussen de tegels aan.' },
  help_save: {"en": "Moment — image. Journey — macro. Idea — JSON. Load — open an idea or journey.\nReset recipe clears the journey and starts from the current board. Confirmation required.", "he": "רגע — תמונה. מסע — מאקרו. רעיון — JSON. טעינה — פתיחת רעיון או מסע.\nאיפוס מתכון מוחק את המסע ומתחיל מהלוח הנוכחי. נדרש אישור.", "ru": "Момент — изображение. Путь — макрос. Идея — JSON. Загрузка — открыть идею или путь.\nСброс рецепта очищает путь и начинает с текущей доски. Требуется подтверждение.", "nl": "Moment — afbeelding. Reis — macro. Idee — JSON. Laden — open een idee of reis.\nRecept wissen verwijdert de reis en begint vanaf het huidige bord. Bevestiging vereist."},
  help_breathe: {"en": "Individual or group color pulses.\nAn animation that does not change stored board colors.", "he": "פעימת צבע אישית או קבוצתית.\nאנימציה שאינה משנה את צבעי הלוח.", "ru": "Индивидуальная или групповая пульсация цвета.\nАнимация не меняет сохранённые цвета доски.", "nl": "Individuele of gezamenlijke kleurpulsen.\nEen animatie die opgeslagen bordkleuren niet verandert."},
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
