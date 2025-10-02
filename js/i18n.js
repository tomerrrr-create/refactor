// js/i18n.js

// 1. הגדר את המשתנים שיהיו פנימיים למודול
const availableLangs = ['en', 'he', 'ru', 'nl'];
let currentLang = 'en'; // ערך התחלתי

// 2. זהו כל אובייקט התרגומים שהוצאנו החוצה
export const translations = {
  help_category_evolution: { en: "Evolution", he: "אבולוציה", ru: "Эволюция", nl: "Evolutie" },
  help_category_tips: { en: "Tips & Tricks", he: "טיפים וטריקים", ru: "Советы и хитрости", nl: "Tips & Trucs" },
  help_tip1: { en: "Long-press Sim Mode to prep the board: max size, dark background, and lightest brush.", he: "לחיצה ארוכה על מצב סימולציה מכינה את הלוח ליצירה: גודל מקסימלי, רקע כהה ומכחול בהיר.", ru: "Длительное нажатие на режим симуляции готовит холст: макс. размер, тёмный фон и светлая кисть.", nl: "Druk lang op Sim Modus om het bord voor te bereiden: max. grootte, donkere achtergrond en lichtste penseel." },
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
  resizeModal_prompt: { en: "Enter a number between 1 and 75.", he: "בין 1 ל-75", ru: "Введите число от 1 до 75.", nl: "Voer een getal in tussen 1 en 75." },
  resizeModal_confirm: { en: "Set Size", he: "קבע גודל", ru: "Установить", nl: "Instellen" },
  paletteModal_title: { en: "Select a Palette", he: "בחירת פלטה", ru: "Выберите палитру", nl: "Kies een palet" },
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
  help_category_simulations: { en: "Simulations & Automations", he: "סימולציות ואוטומציה", ru: "Симуляции и автоматизация", nl: "Simulaties & Automatisering" },
  help_toggleSimMode: { en: 'Simulation Mode: Toggles a UI layout focused on automation tools. Long-press prepares the board for simulation (max size, dark background, light brush).', he: 'מצב סימולציה: משנה את פריסת הכפתורים לממשק ייעודי לסימולציות. לחיצה ארוכה מכינה את הלוח לסימולציה (גודל מקסימלי, רקע כהה, מכחול בהיר).', ru: 'Режим симуляции: переключает раскладку интерфейса на инструменты автоматизации. Долгое нажатие подготавливает доску для симуляции (макс. размер, тёмный фон, светлая кисть).', nl: 'Simulatiemodus: Schakelt een UI-layout in die gericht is op automatiseringstools. Lang indrukken bereidt het bord voor op simulatie (maximale grootte, donkere achtergrond, lichte kwast).' },
  help_playPauseLife: { en: 'Play/Pause Life: (In Sim Mode) Runs the "Game of Life" as a continuous animation, generation after generation. Press again to pause.', he: 'הפעלה/השהיה: (במצב סימולציה) מריץ את "משחק החיים" כאנימציה רציפה, דור אחר דור. לחיצה נוספת משהה את הסימולציה.', ru: 'Запуск/Пауза Жизни: (в режиме симуляции) запускает "Игру в жизнь" как непрерывную анимацию, поколение за поколением. Нажмите ещё раз для паузы.', nl: 'Leven Starten/Pauzeren: (In Sim Modus) Voert het "Game of Life" uit als een continue animatie, generatie na generatie. Druk nogmaals om te pauzeren.' },
  help_invert: { en: 'Invert all colors to their opposite in the current palette.', he: 'הופך כל צבע על הלוח לצבע המשלים שלו בפלטה הנוכחית.', ru: 'Инвертирует все цвета на их противоположные в текущей палитре.', nl: 'Keert alle kleuren om naar hun tegenovergestelde in het huidige palet.' },
  help_palette: { en: 'Cycle through available color palettes.', he: 'מעבר בין פלטות צבעים.', ru: 'Переключает доступные цветовые палитры.', nl: 'Bladert door beschikbare kleurpaletten.' },
  help_random: { en: 'Fill the entire grid with random colors from the current palette.', he: 'מילוי הלוח בצבעים אקראיים מהפלטה הנוכחית.', ru: 'Заполняет всю сетку случайными цветами из текущей палитры.', nl: 'Vult het hele raster met willekeurige kleuren uit het huidige palet.' },
  help_colorPicker: { en: 'Select a specific color to paint with. Tap again to deselect.', he: 'בחירת צבע ספציפי לציור. לחץ שוב לביטול הבחירה.', ru: 'Выбирает определённый цвет для рисования. Нажмите ещё раз, чтобы отменить выбор.', nl: 'Selecteert een specifieke kleur om mee te schilderen. Tik nogмаals om de selectie op te heffen.' },
  help_symmetry: { en: 'Cycle through symmetry modes: Off, Vertical, Horizontal, Mandala, and Kaleidoscope.', he: 'מעבר בין מצבי סימטריה: כבוי, אנכי, אופקי, מנדלה וקליידוסקופ.', ru: 'Переключает режимы симметрии: выкл., вертикальная, горизонтальная, мандала и калейдоскоп.', nl: 'Schakelt tussen symmetriemodi: Uit, Verticaal, Horizontaal, Mandala en Caleidoscoop.' },
  help_brushMode: { en: 'Toggle between Paint mode (drag to paint) and Copy mode (tap source, then tap destination).', he: 'שינוי מצב בין ציור (גרירה) להעתקה (הקשה על מקור ואז על יעד).', ru: 'Переключает между режимом рисования (перетаскивание) и режимом копирования (нажмите на источник, затем на место назначения).', nl: 'Schakelt tussen Verfmodus (slepen om te schilderen) en Kopieermodus (tik op bron, dan op bestemming).' },
  help_redo: { en: 'Redo the last action that was undone.', he: 'ביצוע מחדש של הפעולה האחרונה שבוטלה.', ru: 'Повторяет последнее отменённое действие.', nl: 'Voert de laatste ongedaan gemaakte actie opnieuw uit.' },
  help_undo: { en: 'Undo the last action.', he: 'ביטול הפעולה האחרוна.', ru: 'Отменяет последнее действие.', nl: 'Maakt de laatste actie ongedaan.' },
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
  help_shortcut_redo: { en: "Redo last action", he: "בצע שוב פעולה אחרוна", ru: "Повторить последнее действие", nl: "Laatste actie opnieuw uitvoeren" },
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
  
  // DLA Modal Translations
  dla_modal_title: { en: "Fractal Growth Settings (DLA)", he: "הגדרות צמיחה פרקטלית (DLA)", ru: "Настройки фрактального роста (DLA)", nl: "Instellingen Fractale Groei (DLA)" },
  dla_genetics_label: { en: "Color Genetics", he: "גנטיקת צבעים", ru: "Цветовая генетика", nl: "Kleurengenetica" },
  dla_genetics_desc: { en: "New particles inherit color from their neighbors.", he: "חלקיקים חדשים יורשים צבע משכניהם.", ru: "Новые частицы наследуют цвет от соседей.", nl: "Nieuwe deeltjes erven kleur van hun buren." },
  dla_edges_label: { en: "Spawn from Edges", he: "לידה מהקצוות", ru: "Появление с краёв", nl: "Verschijnen vanaf de randen" },
  dla_edges_desc: { en: "Particles start from the grid borders.", he: "חלקיקים מתחילים את דרכם מגבולות הלוח.", ru: "Частицы начинают с границ сетки.", nl: "Deeltjes starten vanaf de rasterranden." },
  dla_modal_save_close: { en: "Save & Close", he: "שמור וסגור", ru: "Сохранить и закрыть", nl: "Opslaan & Sluiten" },
  dla_modal_cancel: { en: "Cancel", he: "ביטול", ru: "Отмена", nl: "Annuleren" }
};

// 3. שנה את הפונקציות כך שיהיו ניתנות לייצוא (export)
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
  }
}

export function getText(key) {
  if (!translations[key] || !translations[key][currentLang]) {
    console.warn(`Translation key not found for lang '${currentLang}': ${key}`);
    return translations[key] ? translations[key]['en'] : key;
  }
  return translations[key][currentLang];
}

// פונקציית אתחול שפה
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