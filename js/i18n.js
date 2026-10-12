// js/i18n.js

const availableLangs = ['en', 'he', 'ru', 'nl'];
let currentLang = 'en';

const listeners = [];
export function onLanguageChange(callback) {
  listeners.push(callback);
}

export const translations = {
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
  "sort_description_waves": {"en": "Brightness rises and falls across four sections.", "he": "הבהירות עולה ויורדת לאורך ארבעה מקטעים.", "ru": "Яркость растёт и падает в четырёх участках.", "nl": "Helderheid stijgt en daalt over vier delen."},
  "sort_description_biomes": {"en": "Four hue groups, each ordered from dark to light.", "he": "ארבע קבוצות גוון, ובכל אחת מכהה לבהיר.", "ru": "Четыре группы оттенков, каждая от тёмного к светлому.", "nl": "Vier kleurtoongroepen, elk van donker naar licht."},
  "sort_description_zen-void": {"en": "Colors closest to the average palette color come first.", "he": "תחילה הצבעים הקרובים לצבע הממוצע של הפלטה.", "ru": "Сначала цвета, ближайшие к среднему цвету палитры.", "nl": "Kleuren die het dichtst bij de gemiddelde paletkleur liggen komen eerst."},
  sort_cycle_title: { en: "Sorting cycle", he: "סבב שיטות המיון", ru: "Цикл сортировки", nl: "Sorteercyclus" },
  tooltip_sort_cycle: { en: "Tap to change sorting; hold to choose methods (Alt + ↓).", he: "לחיצה להחלפת מיון; לחיצה ארוכה לבחירת שיטות (Alt + ↓).", ru: "Нажмите для смены сортировки; удерживайте для выбора методов (Alt + ↓).", nl: "Tik om de sortering te wijzigen; houd vast om methoden te kiezen (Alt + ↓)." },
  sort_cycle_note: { en: "Choose the methods to cycle through with a tap. Keep at least one selected. Changes apply on the next tap.", he: "בחרו אילו שיטות יופיעו בסבב הלחיצות. יש להשאיר לפחות שיטה אחת מסומנת. השינוי יחול בלחיצה הבאה.", ru: "Выберите методы для переключения нажатием. Оставьте хотя бы один. Изменения применятся при следующем нажатии.", nl: "Kies de methoden die je met een tik doorloopt. Selecteer er minstens één. Wijzigingen gelden bij de volgende tik." },
  sort_cycle_at_least_one: { en: "Select at least one method.", he: "יש לבחור לפחות שיטה אחת.", ru: "Выберите хотя бы один метод.", nl: "Selecteer minstens één methode." },
  sort_cycle_session: { en: "Applied for this session; your browser could not save the selection.", he: "הבחירה הוחלה לכניסה הנוכחית; הדפדפן לא הצליח לשמור אותה.", ru: "Применено для этого сеанса; браузер не смог сохранить выбор.", nl: "Toegepast voor deze sessie; je browser kon de selectie niet opslaan." },
  "startup_sort_hue": { en: "Hue", he: "גוון", ru: "Цветовой тон", nl: "Kleurtoon" },
  "startup_sort_zig-zag": { en: "Zigzag", he: "זיגזג", ru: "Зигзаг", nl: "Zigzag" },
  "startup_sort_waves": { en: "Waves", he: "גלים", ru: "Волны", nl: "Golven" },
  "startup_sort_biomes": { en: "Hue groups", he: "קבוצות גוון", ru: "Группы оттенков", nl: "Kleurtoongroepen" },
  "startup_sort_zen-void": { en: "Zen Void", he: "חלל זן", ru: "Пустота дзен", nl: "Zenleegte" },
  "startup_sort_luminance": { en: "Dark to light", he: "מכהה לבהיר", ru: "От тёмного к светлому", nl: "Donker naar licht" },
  "startup_sort_dark-rainbow": { en: "Dark rainbow", he: "קשת כהה", ru: "Тёмная радуга", nl: "Donkere regenboog" },
  "startup_sort_reversed": { en: "Light to dark", he: "מבהיר לכהה", ru: "От светлого к тёмному", nl: "Licht naar donker" },
  "startup_sort_center-out": { en: "Center out", he: "מהמרכז החוצה", ru: "От центра наружу", nl: "Van binnen naar buiten" },
  "startup_sort_temperature": { en: "Temperature", he: "טמפרטורה", ru: "Температура", nl: "Temperatuur" },
  "startup_sort_outside-in": { en: "Outside in", he: "מהחוץ פנימה", ru: "Снаружи внутрь", nl: "Van buiten naar binnen" },
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
  help_category_tips: { en: "Tips & Tricks", he: "טיפים וטריקים", ru: "Советы и хитрости", nl: "Tips & Trucs" },
  help_tip1: { en: "Long-press Sim Mode to prep the board: your chosen board and brush sizes, dark background, and lightest color.", he: "לחיצה ארוכה על מצב סימולציה מכינה את הלוח ליצירה: גודל לוח ומברשת לפי ההגדרות שלך, רקע כהה וצבע בהיר.", ru: "Длительное нажатие на режим симуляции готовит холст: выбранные размеры поля и кисти, тёмный фон и светлый цвет.", nl: "Druk lang op Sim Modus om het bord voor te bereiden: je gekozen bord- en penseelgrootte, donkere achtergrond en lichtste kleur." },
  help_tip2: { en: "Long-press the Palette button to open a gallery for quick selection.", he: "לחיצה ארוכה על כפתור הפלטות פותחת גלריה לבחירה מהירה של פלטה.", ru: "Длительное нажатие на кнопку палитры открывает галерею для быстрого выбора.", nl: "Druk lang op de Paletknop om een galerij te openen voor een snelle keuze." },
  help_tip3: { en: "Long-press a tile to open the color picker.", he: "לחיצה ארוכה על אריח בלוח פותחת את תפריט בחירת הצבע.", ru: "Длительное нажатие на плитку открывает палитру цветов.", nl: "Druk lang op een tegel om de kleurenkiezer te openen." },
  help_tip4: { en: "With a color selected, long-press a tile to deselect it.", he: "כשיש צבע נבחר, לחיצה ארוכה על אריח מבטלת את הבחירה.", ru: "Если цвет выбран, длительное нажатие на плитку отменит выбор.", nl: "Als een kleur is geselecteerd, druk lang op een tegel om de selectie op te heffen." },
  help_tip5: { en: "Long-press the resize buttons (+/-) to set a custom grid size.", he: "לחיצה ארוכה על כפתורי הגדלה/הקטנה מאפשרת לבחור גודל מותאם אישית.", ru: "Длительное нажатие на кнопки размера (+/-) позволяет задать свой размер сетки.", nl: "Druk lang op de formaatknoppen (+/-) om een aangepaste rastergrootte in te stellen." },
  help_tip6: { en: "Long-press the 'Life' button to configure its evolution rules.", he: "לחיצה ארוכה על כפתור \"משחק החיים\" מאפשרת להגדיר את חוקי האבולוציה.", ru: "Длительное нажатие на кнопку 'Жизнь' позволяет настроить правила эволюции.", nl: "Druk lang op de 'Leven'-knop om de evolutieregels te configureren." },
  splashTitle: { en: "Follow Your Intuition", he: "היום יצרתי", ru: "Следуй своей интуиции", nl: "Volg je intuïtie" },
  startCreating: { en: "Start Creating", he: "יצירה", ru: "Начать творить", nl: "Begin met creëren" },
  skip: { en: "Skip", he: "דלגו", ru: "Пропустить", nl: "Overslaan" },
  saveModal_feelsLike: { en: "feels like", he: "שם היצירה", ru: "ощущается как", nl: "voelt als" },
  saveModal_defaultFilename: { en: "Journey", he: "מסע", ru: "Путешествие", nl: "Reis" },
  saveModal_close: { en: "Close", he: "סגור", ru: "Закрыть", nl: "Sluiten" },
  saveModal_saveImage: { en: "Save Image", he: "שמירה כתמונה", ru: "Сохранить изображение", nl: "Afbeelding opslaan" },
  saveModal_saveIdea: { en: "Save Idea", he: "שמירה כרעיון", ru: "Сохранить идею", nl: "Idee opslaan" },
  saveModal_loadIdea: { en: "Load Idea", he: "טעינת רעיון", ru: "Загрузить идею", nl: "Idee laden" },
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
  tooltip_dla: { en: "Fractal Growth Simulation (DLA)", he: "סימולציית צמיחה פרקטלית (DLA)", ru: "Симуляция фрактального роста (DLA)", nl: "Fractale Groei Simulatie (DLA)" },
  tooltip_contour: { en: "Contour", he: "קווי מתאר", ru: "Контуры", nl: "Contour" }, // <-- ADDED HERE
  gs_modal_title: { en: "Gravitational Sort Settings", he: "הגדרות מיון כבידתי", ru: "Настройки гравитационной сортировки", nl: "Instellingen Zwaartekrachtsortering" },
  gs_modal_direction: { en: "Sort Direction", he: "כיוון המיון", ru: "Направление сортировки", nl: "Sorteerrichting" },
  gs_modal_strength: { en: "Sort Strength", he: "עוצמת המיון", ru: "Сила сортировки", nl: "Sorteerkracht" },
  gs_modal_strength_desc: { en: "Chance for a tile to 'fall' each step", he: "סיכוי של כל תא \"ליפול\" בכל צעד", ru: "Шанс 'падения' плитки на каждом шаге", nl: "Kans dat een tegel 'valt' per stap" },
  gs_modal_save_close: { en: "Save & Close", he: "שמור וסגור", ru: "Сохранить и закрыть", nl: "Opslaan & Sluiten" },
  gs_modal_cancel: { en: "Cancel", he: "ביטול", ru: "Отмена", nl: "Annuleren" },
  help_title: { en: "Controls Guide", he: "מה כל כפתור עושה?", ru: "Руководство по управлению", nl: "Gids voor besturing" },
  help_intro: { en: "Everything starts with a touch. The best way to discover is to simply tap or drag on the tiles. These tools are here to help you explore.", he: "הכל מתחיל במגע. הדרך הטובה ביותר לגלות היא פשוט ללחוץ או לגרור את האצבע על האריחים ולראות מה קורה. הכלים כאן כדי לעזור לך לחקור.", ru: "Всё начинается с прикосновения. Лучший способ исследовать — просто нажимать или перетаскивать плитки. Эти инструменты помогут вам в исследовании.", nl: "Alles begint met een aanraking. De beste manier om te ontdekken is door simpelweg op de tegels te tikken of te slepen. Deze tools zijn er om je te helpen verkennen." },
  help_category_inspiration: { en: "Inspiration & Discovery", he: "השראה וגילוי", ru: "Вдохновение и открытия", nl: "Inspiratie & Ontdekking" },
  help_category_order: { en: "Order & Organization", he: "סדר וארגון", ru: "Порядок и организация", nl: "Orde & Organisatie" },
  help_category_touch: { en: "Personal Touch", he: "מגע אישי", ru: "Личный штрих", nl: "Persoonlijke Toets" },
  help_category_expression: { en: "Expression & Creation", he: "הבעה ויצירה", ru: "Выражение и творчество", nl: "Expressie & Creatie" },
  help_category_tools: { en: "Useful Tools", he: "כלים שימושיים", ru: "Полезные инструменты", nl: "Handige Tools" },
  help_category_shortcuts: { en: "Keyboard Shortcuts", he: "קיצורי מקלדת", ru: "Горячие клавиши", nl: "Sneltoetsen" },
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
  help_toggleSimMode: { en: 'Simulation Mode: Toggles a UI layout focused on automation tools. Long-press prepares the board for simulation (max size, dark background, light brush).', he: 'מצב סימולציה: משנה את פריסת הכפתורים לממשק ייעודי לסימולציות. לחיצה ארוכה מכינה את הלוח לסימולציה (גודל מקסימלי, רקע כהה, מכחול בהיר).', ru: 'Режим симуляции: переключает раскладку интерфейса на инструменты автоматизации. Долгое нажатие подготавливает доску для симуляции (макс. размер, тёмный фон, светлая кисть).', nl: 'Simulatiemodus: Schakelt een UI-layout in die gericht is op automatiseringstools. Lang indrukken bereidt het bord voor op simulatie (maximale grootte, donkere achtergrond, lichte kwast).' },
  help_playPauseLife: { en: 'Play/Pause Life: (In Sim Mode) Runs the "Game of Life" as a continuous animation, generation after generation. Press again to pause.', he: 'הפעלה/השהיה: (במצב סימולציה) מריץ את "משחק החיים" כאנימציה רציפה, דור אחר דור. לחיצה נוספת משהה את הסימולציה.', ru: 'Запуск/Пауза Жизни: (в режиме симуляции) запускает "Игру в жизнь" как непрерывную анимацию, поколение за поколением. Нажмите ещё раз для паузы.', nl: 'Leven Starten/Pauzeren: (In Sim Modus) Voert het "Game of Life" uit als een continue animatie, generatie na generatie. Druk nogmaals om te pauzeren.' },
  help_invert: { en: 'Invert all colors to their opposite in the current palette.', he: 'הופך כל צבע על הלוח לצבע המשלים שלו בפלטה הנוכחית.', ru: 'Инвертирует все цвета на их противоположные в текущей палитре.', nl: 'Keert alle kleuren om naar hun tegenovergestelde in het huidige palet.' },
  help_palette: { en: 'Cycle through available color palettes.', he: 'מעבר בין פלטות צבעים.', ru: 'Переключает доступные цветовые палитры.', nl: 'Bladert door beschikbare kleurpaletten.' },
  help_random: { en: 'Fill the entire grid with random colors from the current palette.', he: 'מילוי הלוח בצבעים אקראיים מהפלטה הנוכחית.', ru: 'Заполняет всю сетку случайными цветами из текущей палитры.', nl: 'Vult het hele raster met willekeurige kleuren uit het huidige palet.' },
  help_colorPicker: { en: 'Select a specific color to paint with. Tap again to deselect.', he: 'בחירת צבע ספציפי לציור. לחץ שוב לביטול הבחירה.', ru: 'Выбирает определённый цвет для рисования. Нажмите ещё раз, чтобы отменить выбор.', nl: 'Selecteert een specifieke kleur om mee te schilderen. Tik nogmaals om de selectie op te heffen.' },
  help_symmetry: { en: 'Cycle through symmetry modes: Off, Vertical, Horizontal, Mandala, and Kaleidoscope.', he: 'מעבר בין מצבי סימטריה: כבוי, אנכי, אופקי, מנדלה וקליידוסקופ.', ru: 'Переключает режимы симметрии: выкл., вертикальная, горизонтальная, мандала и калейдоскоп.', nl: 'Schakelt tussen symmetriemodi: Uit, Verticaal, Horizontaal, Mandala en Caleidoscoop.' },
  help_brushMode: { en: 'Toggle between Paint mode (drag to paint) and Copy mode (tap source, then tap destination).', he: 'שינוי מצב בין ציור (גרירה) להעתקה (הקשה על מקור ואז על יעד).', ru: 'Переключает между режимом рисования (перетаскивание) и режимом копирования (нажмите на источник, затем на место назначения).', nl: 'Schakelt tussen Verfmodus (slepen om te schilderen) en Kopieermodus (tik op bron, dan op bestemming).' },
  help_redo: { en: 'Redo the last action that was undone.', he: 'ביצוע מחדש של הפעולה האחרונה שבוטלה.', ru: 'Повторяет последнее отменённое действие.', nl: 'Voert de laatste ongedaan gemaakte actie opnieuw uit.' },
  help_undo: { en: 'Undo the last action.', he: 'ביטול הפעולה האחרונה.', ru: 'Отменяет последнее действие.', nl: 'Maakt de laatste actie ongedaan.' },
  help_dark: { en: 'Fill the entire grid with the darkest color from the current palette.', he: 'מילוי הלוח בצבע הכהה ביותר מהפלטה הנוכחית.', ru: 'Заполняет всю сетку самым тёмным цветом из текущей палитры.', nl: 'Vult het hele raster met de donkerste kleur uit het huidige palet.' },
  help_specialReset: { en: 'Generate a completely new grid with a random size, gap, and color palette.', he: 'יצירת לוח חדש לגמרי עם גודל, רווח ופלטת צבעים אקראיים.', ru: 'Создаёт совершенно новую сетку со случайным размером, зазором и цветовой палитрой.', nl: 'Genereert een compleet nieuw raster met een willekeurige grootte, tussenruimte en kleurenpalet.' },
  help_gameOfLife: { en: 'Run one generation of Life. "Dead" cells are the darkest and lightest colors. New cells are born from a genetic combination of their three parents.', he: 'הרצת דור אחד של "משחק החיים". תא "מת" הוא הצבע הכהה ביותר או הבהיר ביותר. תאים חדשים נולדים משילוב גנטי של שלושת הוריהם.', ru: 'Запускает одно поколение "Игры в жизнь". "Мёртвые" клетки — это самые тёмные и самые светлые цвета. Новые клетки рождаются из генетической комбинации трёх родителей.', nl: 'Voert één generatie van Leven uit. "Dode" cellen zijn de donkerste en lichtste kleuren. Nieuwe cellen worden geboren uit een genetische combinatie van hun drie ouders.' },
  help_brightnessEvo: { en: "Each cell becomes lighter or darker based on its neighbors, creating flowing patterns.", he: "כל תא הופך לבהיר או כהה יותר בהתבסס על שכניו, ויוצר תבניות זורמות.", ru: "Каждая клетка становится светлее или темнее в зависимости от соседей, создавая плавные узоры.", nl: "Elke cel wordt lichter of donkerder op basis van zijn buren, waardoor vloeiende patronen ontstaan." },
  help_gravitationalSort: { en: "Sorts colors by 'weight' (palette order), creating a layered effect. Long-press to configure direction and strength.", he: "ממיין את הצבעים לפי 'משקל' (סדר הפלטה), ויוצר אפקט של שכבות. לחיצה ארוכה מאפשרת לקבוע כיוון ועוצמה.", ru: "Сортирует цвета по 'весу' (порядку в палитре), создавая эффект слоёв. Долгое нажатие для настройки направления и силы.", nl: "Sorteert kleuren op 'gewicht' (paletvolgorde), wat een gelaagd effect creëert. Druk lang om richting en sterkte in te stellen." },
  help_erosion: { en: "Simulates water eroding earth. Lightest color is water, darkest is air, others are earth. Water flows down, slowly turning earth into lighter shades.", he: "מדמה זרימת מים ושחיקת אדמה. הצבע הבהיר ביותר הוא מים, הכהה ביותר הוא אוויר, והשאר אדמה. מים זורמים מטה ושוחקים את האדמה לגוונים בהירים יותר.", ru: "Симулирует эрозию почвы водой. Самый светлый цвет — вода, самый тёмный — воздух, остальные — земля. Вода течёт вниз, медленно превращая землю в более светлые оттенки.", nl: "Simuleert water dat aarde erodeert. Lichtste kleur is water, donkerste is lucht, andere zijn aarde. Water stroomt naar beneden en verandert aarde langzaam in lichtere tinten." },
  help_dla: { en: "Simulates organic growth. Particles move randomly and stick to the central structure, creating snowflake or coral-like patterns.", he: "מדמה צמיחה אורגנית. חלקיקים נעים אקראית ונדבקים למבנה המרכזי, ויוצרים תבניות דמויות פתיתי שלג או אלמוגים.", ru: "Симулирует органический рост. Частицы движутся случайным образом и прилипают к центральной структуре, создавая узоры, похожие на снежинки или кораллы.", nl: "Simuleert organische groei. Deeltjes bewegen willekeurig en hechten zich aan de centrale structuur, waardoor sneeuwvlok- of koraalachtige patronen ontstaan." },
  help_resetBoard: { en: 'Restart the grid to its original "Journey" state.', he: 'איפוס הלוח למצב ההתחלתי של "מסע".', ru: 'Перезапускает сетку в исходное состояние "Путешествие".', nl: 'Herstart het raster naar de oorspronkelijke "Reis"-staat.' },
  help_resizeUp: { en: 'Increase the number of tiles on the grid. Long-press to set a custom size.', he: 'הגדלת מספר האריחים בלוח. לחיצה ארוכה לקביעת גודל מותאם.', ru: 'Увеличивает количество плиток на сетке. Долгое нажатие для установки пользовательского размера.', nl: 'Verhoogt het aantal tegels op het raster. Druk lang om een aangaste grootte in te stellen.' },
  help_resizeDown: { en: 'Decrease the number of tiles on the grid. Long-press to set a custom size.', he: 'הקטנת מספר האריחים בלוח. לחיצה ארוכה לקביעת גודל מותאם.', ru: 'Уменьшает количество плиток на сетке. Долгое нажатие для установки пользовательского размера.', nl: 'Verlaagt het aantal tegels op het raster. Druk lang om een aangaste grootte in te stellen.' },
  help_gap: { en: 'Adjust the spacing between the tiles.', he: 'שינוי המרווחים בין האריחים.', ru: 'Регулирует расстояние между плитками.', nl: 'Past de ruimte tussen de tegels aan.' },
  help_save: { en: 'Open the save menu to export your creation as an image or project file.', he: 'פתיחת תפריט השמירה לייצוא היצירה כתמונה או כקובץ פרויקט.', ru: 'Открывает меню сохранения для экспорта вашего творения в виде изображения или файла проекта.', nl: 'Opent het opslagmenu om je creatie te exporteren als een afbeelding of projectbestand.' },
  help_breathe: { en: 'Start a calming, pulsing animation across the grid.', he: 'הפעלת אנימציית נשימה מרגיעה על הלוח.', ru: 'Запускает успокаивающую, пульсирующую анимацию по всей сетке.', nl: 'Start een kalmerende, pulserende animatie over het raster.' },
  help_tutorial: { en: 'Opens this guide.', he: 'פתיחת מדריך זה.', ru: 'Открывает это руководство.', nl: 'Opent deze gids.' },
  help_shortcut_undo: { en: "Undo last action", he: "בטל פעולה אחרונה", ru: "Отменить последнее действие", nl: "Laatste actie ongedaan maken" },
  help_shortcut_redo: { en: "Redo last action", he: "בצע שוב פעולה אחרונה", ru: "Повторить последнее действие", nl: "Laatste actie opnieuw uitvoeren" },
  help_shortcut_save: { en: "Save as image", he: "שמור כתמונה", ru: "Сохранить как изображение", nl: "Opslaan als afbeelding" },
  help_shortcut_invert: { en: "Invert colors", he: "הפוך צבעים", ru: "Инвертировать цвета", nl: "Kleuren omkeren" },
  help_shortcut_random: { en: "Randomize board", he: "ערבב לוח", ru: "Случайное заполнение", nl: "Willekeurig bord" },
  help_shortcut_dark: { en: "Fill with darkest color", he: "מלא בצבע הכהה ביותר", ru: "Заполнить самым темным цветом", nl: "Vullen met donkerste kleur" },
  help_shortcut_brush: { en: "Toggle Brush/Copy mode", he: "שנה מצב מכחול/העתקה", ru: "Переключить режим кисти/копирования", nl: "Wissel Penseel/Kopieermodus" },
  help_shortcut_symmetry: { en: "Cycle symmetry modes", he: "שנה מצב סימטריה", ru: "Переключить режимы симметрии", nl: "Wissel symmetriemodi" },
  help_shortcut_gap: { en: "Adjust grid gap", he: "שנה מרווח רשת", ru: "Настроить зазор сетки", nl: "Rasterafstand aanpassen" },
  help_shortcut_palette: { en: "Cycle palettes", he: "שנה פלטות צבעים", ru: "Переключить палитры", nl: "Wissel paletten" },
  help_shortcut_resize: { en: "Resize grid", he: "שנה גודל רשת", ru: "Изменить размер сетки", nl: "Rastergrootte wijzigen" },
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
