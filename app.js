(function() {
      // ---- Helper function for color sorting ----
      function getLuminance(hex) {
        const rgb = parseInt(hex.substring(1), 16);
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = (rgb >> 0) & 0xff;
        // Formula for perceived brightness
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }

      // ---- I18N Translations Object ----
      const translations = {
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

        // --- Updated Keys ---
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
        error_readFile: { en: 'Error: Could not read the project file. It might be corrupted.', he: 'שגיאה: לא ניתן לקרוא את קובץ הפרויקט. ייתכן שהוא פגום.', ru: 'Ошибка: Не удалось прочитать файл проекта. Возможно, он повреждён.', nl: 'Fout: Kon het projectbestand niet lezen. Het is mogelijk beschadigd.' }
      };

      // ---- Language & State ----
      const availableLangs = ['en', 'he', 'ru', 'nl'];
      let currentLang = 'en';
      
const PALETTES = [
    // --- Group 1: The Foundations ---
    {
        name: translations.paletteName_journey[currentLang],
        originalName: "Journey",
        emoji: '🌓',
        colors: ["#000000", "#424242", "#7B1FA2", "#5E35B1", "#3949AB", "#673AB7", "#8E24AA", "#AD1457", "#3F51B5", "#B71C1C", "#9C27B0", "#C2185B", "#C62828", "#2E7D32", "#D32F2F", "#D81B60", "#AB47BC", "#757575", "#1976D2", "#E91E63", "#E53935", "#FF1744", "#EC407A", "#F44336", "#1E88E5", "#0097A7", "#EF5350", "#F4511E", "#FF4081", "#43A047", "#FF5252", "#FF5722", "#2196F3", "#F06292", "#4CAF50", "#FF7043", "#F57C00", "#9E9E9E", "#42A5F5", "#FB8C00", "#66BB6A", "#FF8C00", "#00BCD4", "#AFB42B", "#F48FB1", "#FF9800", "#8BC34A", "#26C6DA", "#FFA726", "#BDBDBD", "#9CCC65", "#FBC02D", "#CDDC39", "#FFE082", "#FFEE58"]
    },
    {
        name: translations.paletteName_focus[currentLang],
        originalName: "Focus",
        emoji: '🧘',
        colors: ["#000000", "#1A0B2E", "#0B172E", "#333333", "#7F7F7F", "#CCCCCC", "#4A0072", "#8E24AA", "#C2185B", "#E91E63", "#EC407A", "#F8BBD0", "#B71C1C", "#D32F2F", "#F4511E", "#FB8C00", "#FFA726", "#FFECB3", "#FBC02D", "#FDD835", "#FFEE58", "#FFF176", "#FFF9C4", "#FFFFFF", "#1B5E20", "#388E3C", "#4CAF50", "#81C784", "#A5D6A7", "#E8F5E9", "#0D47A1", "#1976D2", "#2196F3", "#42A5F5", "#90CAF9", "#E3F2FD", "#004D40", "#00796B", "#009688", "#4DB6AC", "#80CBC4", "#B2DFDB", "#1A237E", "#303F9F", "#3F51B5", "#5C6BC0", "#9FA8DA", "#C5CAE9"]
    },
    // --- Group 2: The Four Seasons ---
    { 
        name: translations.paletteName_spring[currentLang], 
        originalName: "Japanese Spring", 
        emoji: '🌸', 
        colors: ["#B39DDB", "#F48FB1", "#64B5F6", "#81C784", "#90CAF9", "#87CEFA", "#81D4FA", "#A5D6A7", "#D1C4E9", "#FFB7C5", "#F8BBD0", "#80DEEA", "#FFC0CB", "#C1E1C1", "#FFD1DC", "#B3E5FC", "#DCEDC8", "#E6E6FA", "#FFECB3", "#A7FFEB", "#FFF59D", "#FFF9C4", "#FFF8DC"] 
    },
    { 
        name: translations.paletteName_summer[currentLang], 
        originalName: "Brazilian Summer", 
        emoji: '☀️', 
        colors: ["#2962FF", "#F50057", "#FF1493", "#1E90FF", "#FF5722", "#00A86B", "#FF69B4", "#FF7F50", "#00B0FF", "#00C853", "#00BFFF", "#2ECC71", "#00C4FF", "#64DD17", "#00E676", "#40E0D0", "#FFC107", "#1DE9B6", "#FFD700", "#FDD835", "#00FF7F", "#18FFFF", "#FFEB3B"] 
    },
    { 
        name: translations.paletteName_autumn[currentLang], 
        originalName: "New-York Autumn", 
        emoji: '🍂', 
        colors: ["#3E2723", "#4E342E", "#8B0000", "#37474F", "#5D4037", "#2F4F4F", "#8B3A3A", "#8B4513", "#A52A2A", "#B22222", "#795548", "#556B2F", "#607D8B", "#808000", "#6B8E23", "#D2691E", "#B8860B", "#CD853F", "#FF7F50", "#C2A14A", "#FF8C00", "#DAA520", "#F4A460"] 
    },
    { 
        name: translations.paletteName_winter[currentLang], 
        originalName: "Icelandic Winter", 
        emoji: '❄️', 
        colors: ["#263238", "#37474F", "#455A64", "#546E7A", "#78909C", "#9E9E9E", "#03A9F4", "#90A4AE", "#29B6F6", "#4FC3F7", "#B0BEC5", "#BDBDBD", "#4DD0E1", "#81D4FA", "#80DEEA", "#CFD8DC", "#B3E5FC", "#A7FFEB", "#ECEFF1", "#E1F5FE", "#E6F7FF", "#F5F5F5", "#FFFFFF"] 
    },
    // --- Group 3: Scenes from Nature ---
    { 
        name: translations.paletteName_rainforest[currentLang], 
        originalName: "Amazon Rainforest", 
        emoji: '🌳', 
        colors: ["#013220", "#0B5345", "#145A32", "#0E6655", "#196F3D", "#117864", "#117A65", "#1D8348", "#1E8449", "#138D75", "#229954", "#239B56", "#16A085", "#27AE60", "#28B463", "#45B39D", "#52BE80", "#2ECC71", "#48C9B0", "#73C6B6", "#58D68D", "#82E0AA", "#A9DFBF"] 
    },
    { 
        name: translations.paletteName_sunrise[currentLang], 
        originalName: "Desert Sunrise", 
        emoji: '🐪', 
        colors: ["#4B0610", "#5A0C16", "#69121C", "#781822", "#861E28", "#95242E", "#A42A34", "#B33A3A", "#C23640", "#C94752", "#D15864", "#D86976", "#E07A88", "#E78B9A", "#EE9CAC", "#DDA0DD", "#BDB0D0", "#C3B1E1", "#F1A8AB", "#F3B4A9", "#D8BFD8", "#F6BFA8", "#F8CBA6", "#FAD6A5", "#E6E6FA"] 
    },
    { 
        name: translations.paletteName_sea[currentLang], 
        originalName: "Deep Sea", 
        emoji: '🌊', 
        colors: ["#000000", "#0B0C10", "#1C1C1C", "#000080", "#252525", "#00008B", "#191970", "#0000CD", "#36454F", "#483D8B", "#2F4F4F", "#0000FF", "#8A2BE2", "#9932CC", "#6A5ACD", "#008080", "#008B8B", "#BA55D3", "#9370DB", "#5F9EA0", "#20B2AA", "#66CDAA", "#40E0D0", "#00FFFF", "#7FFFD4"] 
    },
    { 
        name: translations.paletteName_sky[currentLang], 
        originalName: "Sky", 
        emoji: '☁️', 
        colors: ["#303F9F", "#0D47A1", "#304FFE", "#3F51B5", "#01579B", "#1565C0", "#3D5AFE", "#2962FF", "#1976D2", "#0277BD", "#2979FF", "#1E88E5", "#0288D1", "#0091EA", "#039BE5", "#03A9F4", "#00B0FF", "#29B6F6", "#4FC3F7", "#40C4FF", "#81D4FA", "#B3E5FC", "#E1F5FE"]
    },
    // --- Group 4: Themed & Gentle ---
    { 
        name: translations.paletteName_cherry[currentLang], 
        originalName: "Cherry Blossom", 
        emoji: '桜', 
        iconHTML: '<span style="color: #FFB6C1;">桜</span>', 
        colors: ["#69476E", "#86688B", "#8F6AAD", "#A284C2", "#A389A4", "#BC8F8F", "#B59ECB", "#D4A3A3", "#C0A9BD", "#BDB0D0", "#C3B1E1", "#C9B7D4", "#E1B5B5", "#D8BFD8", "#E0BBE4", "#D6CADD", "#FBC4AB", "#EECBCB", "#FFC4D0", "#DCD0E2", "#FFD1DC", "#E6Dce5", "#F4DEDE", "#FFDDE1", "#F8E9E9"] 
    },
    { 
        name: translations.paletteName_jasmine[currentLang], 
        originalName: "Jasmine Dream", 
        iconHTML: '<svg viewBox="0 0 24 24" style="width: var(--icon-size); height: var(--icon-size);"><defs><linearGradient id="jasmineGradient" gradientTransform="rotate(90)"><stop offset="5%" stop-color="#AB6BB7" /><stop offset="95%" stop-color="#4B0082" /></linearGradient></defs><g transform="translate(12,12) rotate(18)"><path d="M0,-11 C 5,-6 5,5 0,1 C -5,5 -5,-6 0,-11 Z" transform="rotate(0)" fill="url(#jasmineGradient)"/><path d="M0,-11 C 5,-6 5,5 0,1 C -5,5 -5,-6 0,-11 Z" transform="rotate(72)" fill="url(#jasmineGradient)"/><path d="M0,-11 C 5,-6 5,5 0,1 C -5,5 -5,-6 0,-11 Z" transform="rotate(144)" fill="url(#jasmineGradient)"/><path d="M0,-11 C 5,-6 5,5 0,1 C -5,5 -5,-6 0,-11 Z" transform="rotate(216)" fill="url(#jasmineGradient)"/><path d="M0,-11 C 5,-6 5,5 0,1 C -5,5 -5,-6 0,-11 Z" transform="rotate(288)" fill="url(#jasmineGradient)"/></g><circle cx="12" cy="12" r="2.5" fill="#FFD700"/></svg>', 
        colors: ["#4B0082", "#5A189A", "#682A7A", "#6A1E97", "#7B1E8A", "#743993", "#804090", "#854772", "#8C4888", "#8F588C", "#986089", "#9B5AA3", "#A0636A", "#9E6F80", "#AB6BB7", "#A97585", "#A8769C", "#AE7E82", "#B97F62", "#B885B1", "#B39178", "#B59095", "#C4927E", "#C69A7B", "#D29B5A", "#C59EAA", "#C2AA8E", "#C9AD70", "#DEAE77", "#D2B7A3", "#E1B674", "#D0C187", "#E3BF68", "#E0CF9C", "#E5D680", "#F0E595"] 
    },
    {
        name: translations.paletteName_healing[currentLang],
        originalName: "Healing",
        emoji: '✨',
        colors: ["#1A3A3A", "#FFFFFF", "#FADADD", "#F9C6C5", "#F7A3A2", "#E88282", "#FFDAB9", "#FFC3A0", "#FFFACD", "#FAFAD2", "#FFDEAD", "#F3D6A3", "#DEB887", "#D2B48C", "#F0FFF0", "#D3F2D3", "#B3E0B3", "#98D8AA", "#77C38B", "#58A16F", "#AFEEEE", "#A5E1E1", "#80D0C7", "#64BDB3", "#48A9A6", "#3E8E7E", "#E0FFFF", "#CDEAF5", "#B0E0E6", "#87CEEB", "#64A6C4", "#4682B4", "#E6E6FA", "#D8BFD8", "#C3B1E1", "#B19CD9", "#9370DB", "#7A68A6", "#F5F5DC", "#F5DEB3", "#D3D3D3", "#C0C0C0", "#A9A9A9", "#808080"]
    },
    // --- Group 5: Abstract & Elemental ---
    { 
        name: translations.paletteName_noise[currentLang], 
        originalName: "Brown Noise", 
        iconHTML: '<svg viewBox="0 0 24 24" style="width: var(--icon-size); height: var(--icon-size);"><polygon points="7,3 17,3 21,21 3,21" style="fill:#FFD700;" /></svg>', 
        colors: ["#3E2F00", "#523F00", "#665000", "#7A6000", "#8E7000", "#A28000", "#B69000", "#CAA000", "#DEB000", "#F2C000", "#F4C306", "#F6C70C", "#F8CA12", "#FACC18", "#FCD01E", "#FED324", "#FFD52A", "#FFD700", "#FFD730", "#FFD936", "#FFDB3C", "#FFDD42", "#FFDF48", "#FFE14E", "#FFE354"] 
    },
    { 
        name: translations.paletteName_cosmos[currentLang], 
        originalName: "Cosmos", 
        emoji: '🌌', 
        colors: ["#000000", "#0B0C10", "#00008B", "#1F2833", "#191970", "#263238", "#4B0082", "#37474F", "#483D8B", "#8A2BE2", "#BA55D3", "#9370DB", "#1E90FF", "#FF00FF", "#DA70D6", "#FF69B4", "#00BFFF", "#40E0D0", "#B0E0E6", "#FFFACD", "#F8F8FF", "#E0FFFF", "#FFFFFF"] 
    }
];

      // ---- Sort all palettes by luminance on startup ----
      PALETTES.forEach(palette => {
        palette.colors.sort((a, b) => getLuminance(a) - getLuminance(b));
      });

      // ---- Onboarding State ----
      const ONBOARDING_STORAGE_KEY = 'colorGridOnboardingComplete';
      let isOnboarding = false;
      let onboardingStep = 0; // 0 = inactive, 1 = start, 2 = undo/redo, 3 = more tools, 4 = full UI

      function getText(key) {
        if (!translations[key] || !translations[key][currentLang]) {
            console.warn(`Translation key not found for lang '${currentLang}': ${key}`);
            return translations[key] ? translations[key]['en'] : key;
        }
        return translations[key][currentLang];
      }
      
      // ---- START: Game of Life Rules Object ----
      const defaultGameOfLifeRules = {
        survivalMin: 3, 
        survivalMax: 5,
        birth: 3,
        liveCellDef: 'notDarkest',
        colorGenetics: 'average'
      };
      let gameOfLifeRules = { ...defaultGameOfLifeRules };
      // ---- END: Game of Life Rules Object ----

      // ---- START: Gravitational Sort Rules Object ----
      const defaultGravitationalSortRules = {
        direction: 'down', // 'up', 'left', 'right'
        strength: 1.0      // 1.0 = 100%
      };
      let gravitationalSortRules = { ...defaultGravitationalSortRules };
      // ---- END: Gravitational Sort Rules Object ----

      let activePaletteIndex = 0;
      let n = 11;
      const GOLD = '#FFD700';
      let separatorPx = 0;
      let isBrushModeOn = true; 
      let hasPerformedInitialAutofill = false; 
      let hasTriggeredFirstNudge = false;
      let hasUsedRandomize = false;
      let isAnimating = false;
      let isBreathing = false;
      let isSimModeActive = false;
      let selectedColor = null;
      let isRainbowModeActive = false;
      let selectedColorIndex = -1;
      let colorPickerPage = 0;
      const COLORS_PER_PAGE = 24;

      // ---- START: State variables for new "Arm & Play" logic ----
      let isLifePlaying = false;
      let lifeIntervalId = null;
      let armedSimulation = null; // Can be 'gameOfLife', 'brightnessEvo', 'breathe', 'gravitationalSort'
      // ---- END: New state variables ----

      const SYMMETRY_MODES = ['off', 'vertical', 'horizontal', 'mandala', 'kaleidoscope'];
      let symmetryMode = 'off';
      const SEPARATORS = [6, 5, 3, 2, 0];
      const SIZES = [75, 65, 55, 49, 35, 27, 21, 15, 11, 9, 7, 5, 3];
      const LONG_PRESS_SHOW_MS = 600;
      
      const tiles = () => Array.from(board.querySelectorAll('.tile'));
      const isGold = (el) => !!el.dataset.goldOverlay;
      const paletteLen = () => palette().length;
      const norm = (k, m = paletteLen()) => ((k % m) + m) % m;

      const HISTORY_LIMIT = 20;
      let history = [];
      let future = [];

      // ---- Element Cache ----
      const appContainer = document.getElementById('appContainer');
      const appShell = document.querySelector('.app-shell');
      const controlsContainer = document.getElementById('controlsContainer');
      const board = document.getElementById('board');
      const boardOverlay = document.getElementById('boardOverlay');
      const btnRandom = document.getElementById('btnRandom');
      const btnPalette = document.getElementById('btnPalette');
      const btnGap = document.getElementById('btnGap');
      const btnUndo = document.getElementById('btnUndo');
      const btnRedo = document.getElementById('btnRedo');
      const btnInvert = document.getElementById('btnInvert');
      const btnBrushMode = document.getElementById('btnBrushMode');
      const btnSpecialReset = document.getElementById('btnSpecialReset');
      const btnTutorial = document.getElementById('btnTutorial');
      const btnDark = document.getElementById('btnDark');
      const btnGameOfLife = document.getElementById('btnGameOfLife');
      const btnToggleSimMode = document.getElementById('btnToggleSimMode');
      const btnBrightnessEvo = document.getElementById('btnBrightnessEvo');
      const btnGravitationalSort = document.getElementById('btnGravitationalSort');
      const root = document.documentElement;
      const tileClasses = 'tile aspect-square w-full outline-none focus-visible:ring-inset focus-visible:ring-4 focus-visible:ring-white/90';
      const btnShowBreatheMenu = document.getElementById('btnShowBreatheMenu');
      const btnSymmetry = document.getElementById('btnSymmetry');
      const btnColorPicker = document.getElementById('btnColorPicker');
      const originalColorPickerIconHTML = btnColorPicker.innerHTML;
      const btnExitBreathe = document.getElementById('btnExitBreathe');
      const btnResetBoard = document.getElementById('btnResetBoard');
      const btnResizeUp = document.getElementById('btnResizeUp');
      const btnResizeDown = document.getElementById('btnResizeDown');
      const btnSave = document.getElementById('btnSave');
      const saveModal = document.getElementById('saveModal');
      const imagePreview = document.getElementById('imagePreview');
      const btnModalClose = document.getElementById('btnModalClose');
      const fileNameInput = document.getElementById('fileNameInput');
      let generatedImageFile = null;
      const btnSaveImage = document.getElementById('btnSaveImage');
      const btnSaveProjectIdea = document.getElementById('btnSaveProjectIdea');
      const btnLoadProjectIdea = document.getElementById('btnLoadProjectIdea');
      const projectFileInput = document.getElementById('projectFileInput');
      const breatheModal = document.getElementById('breatheModal');
      const btnBreatheModalClose = document.getElementById('btnBreatheModalClose');
      const btnStartSoloBreathe = document.getElementById('btnStartSoloBreathe');
      const btnStartGroupBreathe = document.getElementById('btnStartGroupBreathe');
      const colorPickerModal = document.getElementById('colorPickerModal');
      const colorPickerHeader = document.getElementById('colorPickerHeader');
      const colorPickerPaletteName = document.getElementById('colorPickerPaletteName');
      const colorPickerSwatches = document.getElementById('colorPickerSwatches');
      const btnPrevPalette = document.getElementById('btnPrevPalette');
      const btnNextPalette = document.getElementById('btnNextPalette');
      const colorPickerPagination = document.getElementById('colorPickerPagination');
      const helpModal = document.getElementById('helpModal');
      const btnHelpModalClose = document.getElementById('btnHelpModalClose');
      const resizeModal = document.getElementById('resizeModal');
      const btnResizeModalClose = document.getElementById('btnResizeModalClose');
      const resizeInput = document.getElementById('resizeInput');
      const btnConfirmResize = document.getElementById('btnConfirmResize');
      const longPressOverlay = document.getElementById('longPressOverlay');
      const longPressDisplay = document.getElementById('longPressDisplay');
      const paletteModal = document.getElementById('paletteModal');
      const btnPaletteModalClose = document.getElementById('btnPaletteModalClose');
      const paletteModalGrid = document.getElementById('paletteModalGrid');
      let longPressTimer = null;
      let wasLongPress = false;
      const btnLangToggle = document.getElementById('btnLangToggle');
      
      const btnPlayPauseLife = document.getElementById('btnPlayPauseLife');
      const iconPlay = document.getElementById('iconPlay');
      const iconPause = document.getElementById('iconPause');
      const btnStepForward = document.getElementById('btnStepForward');

      const gameOfLifeSettingsModal = document.getElementById('gameOfLifeSettingsModal');
      const golSurvivalMin = document.getElementById('golSurvivalMin');
      const golSurvivalMax = document.getElementById('golSurvivalMax');
      const golBirth = document.getElementById('golBirth');
      const golLiveCellDef = document.getElementById('golLiveCellDef');
      const golColorGenetics = document.getElementById('golColorGenetics');
      const btnGolSettingsSave = document.getElementById('btnGolSettingsSave');
      const btnGolSettingsCancel = document.getElementById('btnGolSettingsCancel');
      const btnGolSettingsReset = document.getElementById('btnGolSettingsReset');

      // Gravitational Sort Modal Elements
      const gravitationalSortSettingsModal = document.getElementById('gravitationalSortSettingsModal');
      const gsDirectionButtons = gravitationalSortSettingsModal.querySelectorAll('.gs-direction-btn');
      const gsStrengthSlider = document.getElementById('gsStrength');
      const gsStrengthValue = document.getElementById('gsStrengthValue');
      const btnGsSettingsSave = document.getElementById('btnGsSettingsSave');
      const btnGsSettingsCancel = document.getElementById('btnGsSettingsCancel');

      function palette() { return PALETTES[activePaletteIndex].colors; }

      function getCurrentState() {
          return { 
            n, 
            activePaletteIndex, 
            paletteName: PALETTES[activePaletteIndex].originalName, 
            separatorPx, 
            symmetryMode,
            selectedColor,
            isRainbowModeActive,
            tiles: tiles().map(el => ({ 
                k: getIndex(el), 
                isGold: isGold(el),
                v: el.dataset.v !== undefined ? parseFloat(el.dataset.v) : getIndex(el) 
            }))
          };
      }

      function areStatesEqual(stateA, stateB) {
        if (!stateA || !stateB) return false;
        if (stateA.n !== stateB.n || stateA.activePaletteIndex !== stateB.activePaletteIndex || stateA.separatorPx !== stateB.separatorPx || stateA.symmetryMode !== stateB.symmetryMode || stateA.selectedColor !== stateB.selectedColor || stateA.isRainbowModeActive !== stateB.isRainbowModeActive || stateA.tiles.length !== stateB.tiles.length) return false;
        for (let i = 0; i < stateA.tiles.length; i++) {
          if (stateA.tiles[i].k !== stateB.tiles[i].k || stateA.tiles[i].isGold !== stateB.isGold) return false;
        }
        return true;
      }
      function applyState(state) {
        let paletteIdx = PALETTES.findIndex(p => p.originalName === state.paletteName);
        if (paletteIdx === -1) {
            paletteIdx = state.activePaletteIndex;
        }
        activePaletteIndex = paletteIdx >= 0 && paletteIdx < PALETTES.length ? paletteIdx : 0;
        
        separatorPx = state.separatorPx;
        symmetryMode = state.symmetryMode || 'off';

        selectedColor = state.selectedColor || null;
        isRainbowModeActive = state.isRainbowModeActive || false;
        if (selectedColor) {
            selectedColorIndex = palette().indexOf(selectedColor);
            if (selectedColorIndex === -1) {
                selectedColor = null;
            }
        } else {
            selectedColorIndex = -1;
        }
        updateGlowEffect();
        updateColorPickerButtonUI();

        updatePaletteHeader();
        applySeparator();
        updateSymmetryUI();
        if (n !== state.n) {
            n = state.n;
            buildBoard(n, false);
        }
        const tileElements = tiles();
        state.tiles.forEach((tileState, i) => {
            if (tileElements[i]) {
                const el = tileElements[i];
                const k = (typeof tileState === 'object' && tileState !== null) ? tileState.k : tileState;
                const isG = (typeof tileState === 'object' && tileState !== null) ? tileState.isGold : false;

                if (isG) {
                    applyGoldOverlay(el);
                } else {
                    clearGoldOverlay(el);
                    setIndex(el, k);
                }
                
                if (tileState && typeof tileState.v !== 'undefined') {
                    el.dataset.v = tileState.v;
                } else {
                    delete el.dataset.v;
                }
            }
        });
      }
      function pushHistory(state) {
        history.push(state);
        if (history.length > HISTORY_LIMIT) { history.shift(); }
        future = [];
        updateUndoRedoButtons();
      }
      function performAction(actionFn) {
        const beforeState = getCurrentState();
        actionFn();
        const afterState = getCurrentState();
        if (!areStatesEqual(beforeState, afterState)) {
            pushHistory({ before: beforeState, after: afterState });
            hasPerformedInitialAutofill = true;
        }
      }
      function undo() {
        if (history.length === 0) return;
        const lastAction = history.pop();
        future.push(lastAction);
        applyState(lastAction.before);
        clearAllHighlights();
        updateUndoRedoButtons();
      }
      function redo() {
        if (future.length === 0) return;
        const nextAction = future.pop();
        history.push(nextAction);
        applyState(nextAction.after);
        clearAllHighlights();
        updateUndoRedoButtons();
      }
      function updateUndoRedoButtons() {
        btnUndo.disabled = history.length === 0;
        btnRedo.disabled = future.length === 0;
      }

      function getPaletteColor(k) { return palette()[norm(k)]; }
      function createTile(idx = 0) {
        const d = document.createElement('div');
        d.className = tileClasses;
        d.setAttribute('role', 'gridcell');
        d.setAttribute('tabindex', '0');
        setIndex(d, idx);
        return d;
      }
      function setIndex(el, k, v) {
        const finalK = Math.round(k);
        el.dataset.k = String(finalK);
        if (!isGold(el)) {
          el.style.background = getPaletteColor(finalK);
        }
        if (v !== undefined) {
            el.dataset.v = v;
        } else {
            delete el.dataset.v;
        }
      }
      function getIndex(el) { return parseInt(el.dataset.k || '0', 10); }
      function applyGoldOverlay(el) { el.style.background = GOLD; el.dataset.goldOverlay = '1'; }
      function clearGoldOverlay(el) {
        if (isGold(el)) {
          delete el.dataset.goldOverlay;
          el.style.background = getPaletteColor(getIndex(el));
        }
      }
      function clearAllHighlights() {
        tiles().forEach(el => {
            el.classList.remove('source-highlight', 'target-highlight');
        });
      }
      function buildBoard(size, applyGold = true) {
        root.style.setProperty('--grid-size', size);
        board.innerHTML = '';
        const frag = document.createDocumentFragment();
        for (let i = 0; i < size * size; i++) {
            const tile = createTile(0);
            if(applyGold) applyGoldOverlay(tile);
            frag.appendChild(tile);
        }
        board.appendChild(frag);
        if (applyGold) { hasPerformedInitialAutofill = false; }
      }
      function updatePaletteHeader() {
        const pal = PALETTES[activePaletteIndex];
        if (pal.iconHTML) { btnPalette.innerHTML = pal.iconHTML; } 
        else { btnPalette.innerHTML = ''; btnPalette.textContent = pal.emoji; }
        const label = `${getText('tooltip_palette')}: ${pal.name} (${activePaletteIndex + 1}/${PALETTES.length})`;
        btnPalette.title = getText('tooltip_palette');
        btnPalette.setAttribute('aria-label', label);
      }
      function applySeparator() {
        root.style.setProperty('--gap-px', separatorPx + 'px');
        root.style.setProperty('--tile-radius', (separatorPx === 0 ? '0px' : '2px'));
        btnGap.title = getText('tooltip_gap');
        btnGap.setAttribute('aria-label', getText('tooltip_gap'));
      }

      async function animateBoardTransition(actionFn) {
        if (isAnimating) return;
        isAnimating = true;
        boardOverlay.style.opacity = '1';
        await new Promise(resolve => setTimeout(resolve, 350));
        actionFn();
        await new Promise(resolve => setTimeout(resolve, 50));
        boardOverlay.style.opacity = '0';
        await new Promise(resolve => setTimeout(resolve, 350));
        isAnimating = false;
      }
      
      function applyInitialPattern() {
        const currentTiles = tiles();
        const BLACK_INDEX = 0; // Black is the first color in the default palette

        // Calculate the center tile index
        const centerIndex = Math.floor((n * n) / 2);

        currentTiles.forEach((tile, index) => {
          clearGoldOverlay(tile); // Clear any existing gold overlays first
          if (index === centerIndex) {
            // This is the center tile, make it gold
            applyGoldOverlay(tile);
          } else {
            // All other tiles are black
            setIndex(tile, BLACK_INDEX);
          }
        });
      }

      function cycleSeparator() {
          performAction(() => {
            const seq = SEPARATORS;
            let idx = seq.indexOf(separatorPx);
            if (idx === -1) { idx = seq.indexOf(seq.reduce((p, c) => (Math.abs(c - separatorPx) < Math.abs(p - separatorPx) ? c : p))); }
            separatorPx = seq[(idx + 1) % seq.length];
            applySeparator();
          });
      }
      function fillRandom() {
        tiles().forEach(el => {
          clearGoldOverlay(el);
          setIndex(el, Math.floor(Math.random() * paletteLen()));
        });
      }
      function randomizeAll() {
        performAction(fillRandom);
        hasUsedRandomize = true;
      }

      function shuffleExistingColors() {
          const nonGoldTiles = tiles().filter(tile => !isGold(tile));
          if (nonGoldTiles.length < 2) return;

          const existingColors = nonGoldTiles.map(tile => getIndex(tile));

          for (let i = existingColors.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [existingColors[i], existingColors[j]] = [existingColors[j], existingColors[i]];
          }

          nonGoldTiles.forEach((tile, index) => {
              setIndex(tile, existingColors[index]);
          });
      }

      function getDarkestColorIndex(colors) {
          let darkestIndex = 0;
          let minLuminance = Infinity;
          colors.forEach((hex, index) => {
              const luminance = getLuminance(hex);
              if (luminance < minLuminance) {
                  minLuminance = luminance;
                  darkestIndex = index;
              }
          });
          return darkestIndex;
      }
      
      function getLightestColorIndex(colors) {
          let lightestIndex = 0;
          let maxLuminance = -1;
          colors.forEach((hex, index) => {
              const luminance = getLuminance(hex);
              if (luminance > maxLuminance) {
                  maxLuminance = luminance;
                  lightestIndex = index;
              }
          });
          return lightestIndex;
      }

      function goDark() {
        const darkestIndex = 0; // With sorted palettes, the first is always the darkest
        tiles().forEach(el => {
          clearGoldOverlay(el);
          setIndex(el, darkestIndex);
        });
      }

      function goDarkAction() {
        animateBoardTransition(() => performAction(goDark));
      }
      
      function invertGrid() {
        performAction(() => {
            const len = paletteLen();
            tiles().forEach(el => {
                const currentIndex = getIndex(el);
                const invertedIndex = (len - 1) - currentIndex;
                setIndex(el, invertedIndex);
            });
        });
      }
      
      function resetSelectedColor() {
          selectedColor = null;
          selectedColorIndex = -1;
          isRainbowModeActive = false;
          updateGlowEffect();
          updateColorPickerButtonUI();
      }

      function resetToGoldAndDefaultPalette() {
        performAction(() => {
            activePaletteIndex = 0;
            separatorPx = 0;
            n = 11;
            symmetryMode = 'off';
            resetSelectedColor();
            updatePaletteHeader();
            applySeparator();
            updateSymmetryUI();
            buildBoard(n, false); 
            applyInitialPattern();
            hasPerformedInitialAutofill = true;
        });
        setBrushMode(true);
      }

      function specialReset() {
        activePaletteIndex = Math.floor(Math.random() * PALETTES.length);
        separatorPx = SEPARATORS[Math.floor(Math.random() * SEPARATORS.length)];
        n = SIZES[Math.floor(Math.random() * SIZES.length)];
        resetSelectedColor();
        updatePaletteHeader();
        applySeparator();
        buildBoard(n, false);
        fillRandom();
        hasPerformedInitialAutofill = true;
      }
      
      function handlePaletteSwitch(backwards = false) {
        const len = PALETTES.length;
        switchToPalette((activePaletteIndex + (backwards ? -1 : 1) + len) % len);
      }
      
      function switchToPalette(index) {
        if (index === activePaletteIndex) return;
        performAction(() => {
            activePaletteIndex = index;
            resetSelectedColor();
            updatePaletteHeader();
            tiles().forEach(el => {
                if (!isGold(el)) { // Don't change gold tiles
                    el.style.background = palette()[norm(getIndex(el))];
                }
            });
        });
      }


      function switchPalette(backwards = false) {
        const shouldTriggerNudge = !hasUsedRandomize && !hasTriggeredFirstNudge;
        handlePaletteSwitch(backwards);
        if (shouldTriggerNudge) {
            hasTriggeredFirstNudge = true;
            btnRandom.classList.add('glow-animation');
            setTimeout(() => { btnRandom.classList.remove('glow-animation'); }, 4000);
        }
      }
      
      function _performResize(newSize) {
        const oldStates1D = tiles().map(el => ({ k: getIndex(el), isGold: isGold(el) }));
        const oldSize = n;
        const oldStates2D = [];
        for (let i = 0; i < oldSize; i++) {
            oldStates2D.push(oldStates1D.slice(i * oldSize, (i + 1) * oldSize));
        }
        n = newSize;
        buildBoard(n, false);
        const newTiles = tiles();
        const diff = oldSize - newSize;
        const offset = Math.floor(Math.abs(diff) / 2);
        if (newSize < oldSize) {
            for (let row = 0; row < newSize; row++) {
                for (let col = 0; col < newSize; col++) {
                    const newIndex = row * newSize + col;
                    const oldRowInOldGrid = row + offset;
                    const oldColInOldGrid = col + offset;
                    if (oldRowInOldGrid < oldSize && oldColInOldGrid < oldSize) {
                        const oldState = oldStates2D[oldRowInOldGrid][oldColInOldGrid];
                        if (newTiles[newIndex] && oldState) {
                            if (oldState.isGold) { applyGoldOverlay(newTiles[newIndex]); } 
                            else { clearGoldOverlay(newTiles[newIndex]); setIndex(newTiles[newIndex], oldState.k); }
                        }
                    }
                }
            }
        } else {
            for (let row = 0; row < newSize; row++) {
                for (let col = 0; col < newSize; col++) {
                    const newIndex = row * newSize + col;
                    const newTile = newTiles[newIndex];
                    const oldRowInOldGrid = row - offset;
                    const oldColInOldGrid = col - offset;
                    const isWithinOldBounds = oldRowInOldGrid >= 0 && oldRowInOldGrid < oldSize && oldColInOldGrid >= 0 && oldColInOldGrid < oldSize;
                    if (isWithinOldBounds) {
                        const oldState = oldStates2D[oldRowInOldGrid][oldColInOldGrid];
                        if (oldState) {
                            if (oldState.isGold) { applyGoldOverlay(newTile); } 
                            else { clearGoldOverlay(newTile); setIndex(newTile, oldState.k); }
                        }
                    } else {
                        clearGoldOverlay(newTile);
                        setIndex(newTile, 0);
                    }
                }
            }
        }
      }

      function resizeGrid(increase = false) {
        const seq = SIZES;
        let newSize;
        if (increase) {
            newSize = [...seq].reverse().find(size => size > n);
            if (newSize === undefined) newSize = seq[0];
        } else {
            newSize = seq.find(size => size < n);
            if (newSize === undefined) newSize = seq[seq.length - 1];
        }
        if (newSize === n) return;
        animateBoardTransition(() => performAction(() => _performResize(newSize)));
      }
      
      // ---- START: "Arm & Play" and Breathing Logic ----

      function _stopBreatheAnimation() {
        tiles().forEach(tile => {
            tile.classList.remove('breathing-tile');
            tile.style.animationDelay = '';
        });
        isBreathing = false;
      }

      function pauseLife() {
        if (!isLifePlaying) return;
        
        _stopBreatheAnimation();

        isLifePlaying = false;
        clearInterval(lifeIntervalId);
        lifeIntervalId = null;
        
        iconPlay.style.display = 'block';
        iconPause.style.display = 'none';

        if (armedSimulation === 'gameOfLife' || armedSimulation === 'brightnessEvo' || armedSimulation === 'gravitationalSort') {
          btnStepForward.disabled = false;
        }

        btnGameOfLife.disabled = false;
        btnBrightnessEvo.disabled = false;
        btnShowBreatheMenu.disabled = false;
        btnGravitationalSort.disabled = false;
      }

      function stepForward() {
        if (armedSimulation === 'gameOfLife') {
          performAction(runGameOfLifeGeneration);
        } else if (armedSimulation === 'brightnessEvo') {
          performAction(runBrightnessEvolution);
        } else if (armedSimulation === 'gravitationalSort') {
          performAction(runGravitationalSortGeneration);
        }
      }

      function togglePlayPauseLife() {
          if (isLifePlaying) {
              pauseLife();
              return;
          }

          if (!armedSimulation) return;

          let simulationFunction;
          let interval = 200;

          switch (armedSimulation) {
              case 'gameOfLife':
                  simulationFunction = runGameOfLifeGeneration;
                  break;
              case 'brightnessEvo':
                  simulationFunction = runBrightnessEvolution;
                  break;
              case 'gravitationalSort':
                  simulationFunction = runGravitationalSortGeneration;
                  interval = 150; // Faster interval for sorting
                  break;
              case 'breathe':
                  openBreatheModal();
                  return; // Exit here for breathe mode
          }
          
          if (simulationFunction) {
              isLifePlaying = true;
              iconPlay.style.display = 'none';
              iconPause.style.display = 'block';
              btnGameOfLife.disabled = true;
              btnBrightnessEvo.disabled = true;
              btnShowBreatheMenu.disabled = true;
              btnGravitationalSort.disabled = true;
              btnStepForward.disabled = true;
              lifeIntervalId = setInterval(() => {
                  performAction(simulationFunction);
              }, interval);
          }
      }
      
      function armSimulation(simulationName) {
        if (isLifePlaying) return;
      
        const simButtons = [btnGameOfLife, btnBrightnessEvo, btnShowBreatheMenu, btnGravitationalSort];
        simButtons.forEach(btn => btn.classList.remove('simulation-active'));
      
        if (armedSimulation === simulationName) {
          armedSimulation = null;
          btnPlayPauseLife.disabled = true;
          btnStepForward.disabled = true;
        } else {
          armedSimulation = simulationName;
          btnPlayPauseLife.disabled = false;
          
          if (simulationName !== 'breathe') {
            btnStepForward.disabled = false;
          } else {
            btnStepForward.disabled = true;
          }
          
          const buttonToActivate = simButtons.find(btn => btn.id.toLowerCase().includes(simulationName.toLowerCase()));
          if(buttonToActivate) {
            buttonToActivate.classList.add('simulation-active');
          }
        }
      }

      function resetArmedState() {
        armedSimulation = null;
        const simButtons = [btnGameOfLife, btnBrightnessEvo, btnShowBreatheMenu, btnGravitationalSort];
        simButtons.forEach(btn => btn.classList.remove('simulation-active'));
        btnPlayPauseLife.disabled = true;
        btnStepForward.disabled = true;
      }
      
      function startBreathingEffect(isGrouped = false) {
          if (isLifePlaying) return;
          isBreathing = true;
          isLifePlaying = true;

          iconPlay.style.display = 'none';
          iconPause.style.display = 'block';
          btnGameOfLife.disabled = true;
          btnBrightnessEvo.disabled = true;
          btnShowBreatheMenu.disabled = true;
          
          const allTiles = tiles();
          if (isGrouped) {
              const colorDelayMap = new Map();
              const uniqueColors = [...new Set(allTiles.map(tile => {
                  return isGold(tile) ? GOLD : tile.style.backgroundColor;
              }))];
              uniqueColors.forEach(color => {
                  colorDelayMap.set(color, Math.random() * 3);
              });
              allTiles.forEach(tile => {
                  const colorKey = isGold(tile) ? GOLD : tile.style.backgroundColor;
                  const delay = colorDelayMap.get(colorKey);
                  tile.style.animationDelay = `${delay}s`;
                  tile.classList.add('breathing-tile');
              });
          } else {
              allTiles.forEach(tile => {
                  tile.style.animationDelay = `${Math.random() * 3}s`;
                  tile.classList.add('breathing-tile');
              });
          }
      }

      // --- END: "Arm & Play" and Breathing Logic ---

      function prepareBoardForSimMode() {
        animateBoardTransition(() => {
            performAction(() => {
                if (n !== 75) {
                    _performResize(75);
                }
                separatorPx = 0; 
                applySeparator();
                symmetryMode = 'kaleidoscope'; 
                updateSymmetryUI();

                goDark();

                const currentPalette = palette();
                const lightestIndex = currentPalette.length - 1;
                selectedColor = currentPalette[lightestIndex];
                selectedColorIndex = lightestIndex;
                isRainbowModeActive = false;
                updateColorPickerButtonUI();
                updateGlowEffect();
            });
        });
      }

      function toggleSimMode() {
        const duration = 500;

        controlsContainer.style.opacity = '0';

        setTimeout(() => {
            isSimModeActive = !isSimModeActive;
            controlsContainer.classList.toggle('sim-mode-active', isSimModeActive);

            if (isSimModeActive) {
                pauseLife();
                resetArmedState();
            } else {
                pauseLife();
                resetArmedState();
            }

            const controlsToHide = [
                btnBrushMode, btnGap, btnResetBoard,
                btnTutorial, btnSave, btnSpecialReset,
                btnPalette, btnInvert
            ];

            controlsToHide.forEach(btn => btn.classList.toggle('control-hidden', isSimModeActive));
            btnPlayPauseLife.classList.toggle('control-hidden', !isSimModeActive);
            btnToggleSimMode.classList.toggle('active', isSimModeActive);

            controlsContainer.style.opacity = '1';
        }, duration);
      }

      function setBrushMode(isBrushOn) {
          isBrushModeOn = isBrushOn;
          btnBrushMode.classList.toggle('brush-on', isBrushOn);
          const newTitle = isBrushOn ? getText('brushMode_paint') : getText('brushMode_copy');
          btnBrushMode.title = newTitle;
          btnBrushMode.setAttribute('aria-label', newTitle);
          clearAllHighlights();
          if (pointerState.dragSource) pointerState.dragSource = null;
      }
      function toggleBrushMode() {
          setBrushMode(!isBrushModeOn);
      }
      function closeModal() {
        saveModal.classList.remove('modal-visible');
        if (imagePreview.src) { URL.revokeObjectURL(imagePreview.src); }
        imagePreview.src = '';
        generatedImageFile = null;
      }

      async function savePNG_Optimized() {
        btnSave.disabled = true;
        const TILE_SIZE = 20;
        const GAP_SIZE = separatorPx > 0 ? 2 : 0;
        const PADDING = 50;
        const canvasSize = (n * TILE_SIZE) + ((n - 1) * GAP_SIZE) + PADDING;

        const canvas = document.createElement('canvas');
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        const currentTiles = tiles();
        const currentPalette = palette();

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const tileIndex = i * n + j;
                const tileElement = currentTiles[tileIndex];
                
                if (isGold(tileElement)) {
                    ctx.fillStyle = GOLD;
                } else {
                    const colorIndex = getIndex(tileElement);
                    ctx.fillStyle = currentPalette[norm(colorIndex, currentPalette.length)];
                }

                const x = (j * (TILE_SIZE + GAP_SIZE)) + (PADDING / 2);
                const y = (i * (TILE_SIZE + GAP_SIZE)) + (PADDING / 2);

                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            }
        }
        
        canvas.toBlob((blob) => {
            if (!blob) {
                console.error('Blob creation failed');
                btnSave.disabled = false;
                return;
            }
            generatedImageFile = new File([blob], 'board.png', { type: 'image/png' });
            imagePreview.src = URL.createObjectURL(blob);
            fileNameInput.value = PALETTES[activePaletteIndex]?.name || getText('saveModal_defaultFilename');
            saveModal.classList.add('modal-visible');
            btnSave.disabled = false;
        }, 'image/png');
      }

      function getSanitizedFileName(extension) {
        let defaultName = PALETTES[activePaletteIndex]?.originalName === 'Default' ? getText('saveModal_defaultFilename') : PALETTES[activePaletteIndex]?.name;
        let fileName = fileNameInput.value.trim() || defaultName || 'Creation';
        return fileName.replace(/[<>:"/\\|?*]/g, '_') + `.${extension}`;
      }

      function getSymmetricIndices(index) {
          if (symmetryMode === 'off') return [index];
          const row = Math.floor(index / n);
          const col = index % n;
          const N = n - 1;
          const indices = new Set([index]);

          if (symmetryMode === 'horizontal' || symmetryMode === 'mandala' || symmetryMode === 'kaleidoscope') {
              indices.add(row * n + (N - col));
          }
          if (symmetryMode === 'vertical' || symmetryMode === 'mandala' || symmetryMode === 'kaleidoscope') {
              indices.add((N - row) * n + col);
          }
          if (symmetryMode === 'mandala' || symmetryMode === 'kaleidoscope') {
              indices.add((N - row) * n + (N - col));
          }
          if (symmetryMode === 'kaleidoscope') {
              const currentPoints = Array.from(indices).map(idx => ({ r: Math.floor(idx / n), c: idx % n }));
              currentPoints.forEach(pt => {
                  indices.add(pt.c * n + pt.r);
              });
          }
          return Array.from(indices);
      }
      
      function updateSymmetryButtonUI() {
          const parts = {
              top: btnSymmetry.querySelector('.part.top'),
              bottom: btnSymmetry.querySelector('.part.bottom'),
              left: btnSymmetry.querySelector('.part.left'),
              right: btnSymmetry.querySelector('.part.right'),
              centerDot: btnSymmetry.querySelector('.part.center-dot'),
          };
          const activeColor = GOLD;
          const inactiveColor = 'transparent';

          // Reset all parts
          parts.top.style.stroke = inactiveColor;
          parts.bottom.style.stroke = inactiveColor;
          parts.left.style.stroke = inactiveColor;
          parts.right.style.stroke = inactiveColor;
          parts.centerDot.style.fill = inactiveColor;
          
          if (symmetryMode === 'vertical') {
              parts.top.style.stroke = activeColor;
              parts.bottom.style.stroke = activeColor;
          } else if (symmetryMode === 'horizontal') {
              parts.left.style.stroke = activeColor;
              parts.right.style.stroke = activeColor;
          } else if (symmetryMode === 'mandala') {
              parts.top.style.stroke = activeColor;
              parts.bottom.style.stroke = activeColor;
              parts.left.style.stroke = activeColor;
              parts.right.style.stroke = activeColor;
          } else if (symmetryMode === 'kaleidoscope') {
              parts.top.style.stroke = activeColor;
              parts.bottom.style.stroke = activeColor;
              parts.left.style.stroke = activeColor;
              parts.right.style.stroke = activeColor;
              parts.centerDot.style.fill = activeColor;
          }

          let titleKey;
          switch (symmetryMode) {
              case 'vertical': titleKey = 'symmetry_vertical'; break;
              case 'horizontal': titleKey = 'symmetry_horizontal'; break;
              case 'mandala': titleKey = 'symmetry_mandala'; break;
              case 'kaleidoscope': titleKey = 'symmetry_kaleidoscope'; break;
              default: titleKey = 'symmetry_off';
          }
          const title = getText(titleKey);
          btnSymmetry.setAttribute('aria-label', title);
          btnSymmetry.title = getText('tooltip_symmetry');
      }
      
      function updateSymmetryUI() { updateSymmetryButtonUI(); }
      function cycleSymmetryMode() {
          performAction(() => {
              const currentIndex = SYMMETRY_MODES.indexOf(symmetryMode);
              symmetryMode = SYMMETRY_MODES[(currentIndex + 1) % SYMMETRY_MODES.length];
              updateSymmetryUI();
          });
      }

      const pointerState = { id: null, downEl: null, downX: 0, downY: 0, longPressTimer: null, suppressClick: false, isDragging: false, dragSource: null, currentTarget: null, beforeState: null, longPressTarget: null };
      
      function applyActionToTiles(indices, actionFn) {
          const allTiles = tiles();
          indices.forEach(idx => {
              if (allTiles[idx]) {
                  actionFn(allTiles[idx]);
              }
          });
      }

      function onPointerDown(e) {
        if (isLifePlaying) return;
        const el = e.target.closest('.tile'); if (!el) return;
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        Object.assign(pointerState, { id: e.pointerId, downEl: el, downX: e.clientX, downY: e.clientY, suppressClick: false, isDragging: false, dragSource: null, currentTarget: null, beforeState: getCurrentState() });
        
        pointerState.longPressTimer = setTimeout(() => {
            if (pointerState.isDragging) return;
            pointerState.suppressClick = true;
            if (selectedColor || isRainbowModeActive) {
                performAction(resetSelectedColor);
            } else {
                openColorPickerModal(el);
            }
        }, LONG_PRESS_SHOW_MS);

        if (!isBrushModeOn) { 
            clearAllHighlights(); 
            el.classList.add('source-highlight'); 
            pointerState.dragSource = el; 
        }
      }

      function onPointerMove(e) {
        if (pointerState.id !== e.pointerId) return;
        if (!pointerState.isDragging) {
            const dist = Math.hypot(e.clientX - pointerState.downX, e.clientY - pointerState.downY);
            if (dist >= 8) {
                clearTimeout(pointerState.longPressTimer);
                pointerState.longPressTimer = null;
                pointerState.isDragging = true;
                pointerState.suppressClick = true;
                if (isBrushModeOn && selectedColorIndex === -1) {
                    pointerState.dragSource = pointerState.downEl;
                    clearGoldOverlay(pointerState.dragSource);
                }
            }
        }
        if (!pointerState.isDragging) return;
        const targetEl = document.elementFromPoint(e.clientX, e.clientY)?.closest('.tile');
        if (!targetEl || targetEl === pointerState.currentTarget) return;
        pointerState.currentTarget?.classList.remove('ring-4', 'ring-white', 'target-highlight');
        pointerState.currentTarget = targetEl;
        if (isBrushModeOn) {
            if (isRainbowModeActive) {
                const targetIndices = getSymmetricIndices(tiles().indexOf(targetEl));
                applyActionToTiles(targetIndices, tile => {
                    clearGoldOverlay(tile);
                    const randomIndex = Math.floor(Math.random() * paletteLen());
                    setIndex(tile, randomIndex);
                });
            } else if (selectedColorIndex !== -1) {
                const targetIndices = getSymmetricIndices(tiles().indexOf(targetEl));
                applyActionToTiles(targetIndices, tile => {
                    clearGoldOverlay(tile);
                    setIndex(tile, selectedColorIndex);
                });
            } else {
                const sourceIndex = getIndex(pointerState.dragSource);
                const targetIndices = getSymmetricIndices(tiles().indexOf(targetEl));
                applyActionToTiles(targetIndices, tile => {
                    clearGoldOverlay(tile);
                    setIndex(tile, sourceIndex);
                });
                targetEl.classList.add('ring-4', 'ring-white');
            }
        } else {
            if (targetEl !== pointerState.dragSource) {
                targetEl.classList.add('target-highlight');
            } else {
                pointerState.currentTarget = null;
            }
        }
      }

      function onPointerUp(e) {
        if (isBreathing) return;
        clearTimeout(pointerState.longPressTimer);
        const beforeState = pointerState.beforeState;
        if (pointerState.isDragging) {
            if (!isBrushModeOn && pointerState.currentTarget) {
                const sourceEl = pointerState.dragSource; 
                const targetEl = pointerState.currentTarget;
                const targetIndices = getSymmetricIndices(tiles().indexOf(targetEl));
                applyActionToTiles(targetIndices, tile => {
                    if (isGold(sourceEl)) { applyGoldOverlay(tile); } 
                    else { clearGoldOverlay(tile); setIndex(tile, getIndex(sourceEl)); }
                });
            }
        } else if (!pointerState.suppressClick && e.target.closest('.tile')) {
            const tile = e.target.closest('.tile');
            if (isRainbowModeActive) {
                const indices = getSymmetricIndices(tiles().indexOf(tile));
                applyActionToTiles(indices, el => {
                    clearGoldOverlay(el);
                    const randomIndex = Math.floor(Math.random() * paletteLen());
                    setIndex(el, randomIndex);
                });
            } else if (selectedColorIndex !== -1) {
                const indices = getSymmetricIndices(tiles().indexOf(tile));
                applyActionToTiles(indices, el => {
                    clearGoldOverlay(el);
                    setIndex(el, selectedColorIndex);
                });
            } else {
                const indices = getSymmetricIndices(tiles().indexOf(tile));
                applyActionToTiles(indices, el => {
                    clearGoldOverlay(el); 
                    setIndex(el, getIndex(el) + 1);
                });
            }
        }
        const afterState = getCurrentState();
        if (beforeState && !areStatesEqual(beforeState, afterState)) {
             pushHistory({ before: beforeState, after: afterState }); 
             hasPerformedInitialAutofill = true;
             if (isOnboarding) {
                if (onboardingStep === 1) advanceOnboarding(2);
                else if (onboardingStep === 2) advanceOnboarding(3);
                else if (onboardingStep === 3) advanceOnboarding(4);
             }
        }
        clearAllHighlights();
        pointerState.currentTarget?.classList.remove('ring-4', 'ring-white', 'target-highlight');
        Object.assign(pointerState, { id: null, downEl: null, isDragging: false, dragSource: null, currentTarget: null, beforeState: null, longPressTarget: null });
      }

      function updateLayout() {
        if (window.innerWidth < 768) { appShell.style.width = ''; return; }
        const controlsHeight = controlsContainer.offsetHeight;
        const viewportHeight = window.innerHeight;
        const topMargin = parseInt(window.getComputedStyle(appShell.parentElement).paddingTop, 10);
        const availableHeight = viewportHeight - controlsHeight - (topMargin * 2);
        const newWidth = Math.min(720, window.innerWidth * 0.85, availableHeight);
        appShell.style.width = `${newWidth}px`;
      }
      board.addEventListener('pointerdown', onPointerDown);
      board.addEventListener('pointermove', onPointerMove);
      board.addEventListener('pointerup', onPointerUp);
      board.addEventListener('pointercancel', onPointerUp);

      function openBreatheModal() {
        if (isLifePlaying) return;
        breatheModal.classList.add('modal-visible');
      }

      function closeBreatheModal() {
        breatheModal.classList.remove('modal-visible');
      }

      function openResizeModal() {
        if (isBreathing) return;
        resizeInput.value = n; 
        resizeModal.classList.add('modal-visible');
        resizeInput.focus();
        resizeInput.select();
    }

    function closeResizeModal() {
        resizeModal.classList.remove('modal-visible');
    }

    function handleConfirmResize() {
        let newSize = parseInt(resizeInput.value, 10);
        if (isNaN(newSize) || newSize < 1 || newSize > 75) {
            resizeInput.style.borderColor = 'red';
            setTimeout(() => { resizeInput.style.borderColor = ''; }, 1000);
            return;
        }
        closeResizeModal();
        if (newSize !== n) {
             animateBoardTransition(() => performAction(() => _performResize(newSize)));
        }
    }

    function createRainbowIconSVG(currentPalette) {
        const p = currentPalette || palette();
        const c1 = p[0] || '#FFD700';
        const c2 = p[Math.floor(p.length / 4)] || '#42A5F5';
        const c3 = p[Math.floor(p.length / 2)] || '#F44336';
        const c4 = p[Math.floor(p.length * 3 / 4)] || '#66BB6A';
        return `<svg viewBox="0 0 24 24" fill="none" stroke="none" style="width: var(--icon-size); height: var(--icon-size);">
            <rect x="4" y="4" width="8" height="8" fill="${c1}" rx="1"/>
            <rect x="12" y="4" width="8" height="8" fill="${c2}" rx="1"/>
            <rect x="4" y="12" width="8" height="8" fill="${c3}" rx="1"/>
            <rect x="12" y="12" width="8" height="8" fill="${c4}" rx="1"/>
        </svg>`;
    }
    
    function updateGlowEffect() {
        if (isRainbowModeActive) {
            board.classList.add('glowing-border-rainbow');
            board.classList.remove('glowing-border');
        } else if (selectedColor) {
            root.style.setProperty('--glow-color', selectedColor);
            board.classList.add('glowing-border');
            board.classList.remove('glowing-border-rainbow');
        } else {
            board.classList.remove('glowing-border', 'glowing-border-rainbow');
        }
    }

    function updateColorPickerButtonUI() {
        if (!btnColorPicker.querySelector('circle') && !isRainbowModeActive) {
            btnColorPicker.innerHTML = originalColorPickerIconHTML;
        }
        const colorPickerIconCircle = btnColorPicker.querySelector('svg circle');
        if (isRainbowModeActive) {
            btnColorPicker.innerHTML = createRainbowIconSVG();
        } else if (selectedColor) {
            if(colorPickerIconCircle) {
                colorPickerIconCircle.style.fill = selectedColor;
                colorPickerIconCircle.style.stroke = selectedColor === '#000000' ? '#424242' : selectedColor;
            }
        } else {
             if(colorPickerIconCircle) {
                colorPickerIconCircle.style.fill = '#000';
                colorPickerIconCircle.style.stroke = '#fff';
             }
        }
    }

      function selectColorAndClose(color) {
        const targetTile = pointerState.longPressTarget;
        isRainbowModeActive = false;
        selectedColor = color;
        selectedColorIndex = palette().indexOf(color);
        updateGlowEffect();
        updateColorPickerButtonUI();
        if (targetTile) {
            performAction(() => {
                const targetIndices = getSymmetricIndices(tiles().indexOf(targetTile));
                applyActionToTiles(targetIndices, tile => {
                    clearGoldOverlay(tile);
                    setIndex(tile, selectedColorIndex);
                });
            });
        }
        closeColorPickerModal();
      }

      function selectRainbowAndClose() {
        const targetTile = pointerState.longPressTarget;
        isRainbowModeActive = true;
        selectedColor = null;
        selectedColorIndex = -1;
        updateGlowEffect();
        updateColorPickerButtonUI();
        if (targetTile) {
            performAction(() => {
                const targetIndices = getSymmetricIndices(tiles().indexOf(targetTile));
                applyActionToTiles(targetIndices, tile => {
                    clearGoldOverlay(tile);
                    const randomIndex = Math.floor(Math.random() * paletteLen());
                    setIndex(tile, randomIndex);
                });
            });
        }
        closeColorPickerModal();
    }

      function renderColorPickerContent() {
          const currentPalette = PALETTES[activePaletteIndex];
          const colors = currentPalette.colors;
          const totalPages = Math.ceil(colors.length / COLORS_PER_PAGE);
          
          if (colorPickerPage >= totalPages) {
              colorPickerPage = 0;
          }

          if (totalPages > 1) {
            colorPickerHeader.style.display = 'flex';
          } else {
            colorPickerHeader.style.display = 'none';
          }

          const displayIcon = currentPalette.iconHTML || currentPalette.emoji || '';
          colorPickerPaletteName.innerHTML = displayIcon;
          
          colorPickerSwatches.innerHTML = '';
          const frag = document.createDocumentFragment();

          const rainbowSwatch = document.createElement('div');
          rainbowSwatch.className = 'color-swatch';
          const rainbowSwatchInner = document.createElement('div');
          rainbowSwatchInner.className = 'color-swatch-inner';
          rainbowSwatchInner.innerHTML = createRainbowIconSVG();
          rainbowSwatch.appendChild(rainbowSwatchInner);
          rainbowSwatch.setAttribute('aria-label', getText('colorPicker_rainbow'));
          rainbowSwatch.addEventListener('click', () => selectRainbowAndClose());
          frag.appendChild(rainbowSwatch);

          const startIndex = colorPickerPage * COLORS_PER_PAGE;
          const endIndex = startIndex + COLORS_PER_PAGE;
          const pageColors = colors.slice(startIndex, endIndex);

          pageColors.forEach((color) => {
              const swatch = document.createElement('div');
              swatch.className = 'color-swatch';
              const swatchInner = document.createElement('div');
              swatchInner.className = 'color-swatch-inner';
              swatchInner.style.backgroundColor = color;
              swatch.appendChild(swatchInner);
              swatch.dataset.color = color;
              swatch.setAttribute('aria-label', `${getText('colorPicker_select')} ${color}`);
              swatch.addEventListener('click', () => selectColorAndClose(color));
              frag.appendChild(swatch);
          });
          
          const placeholdersNeeded = (COLORS_PER_PAGE + 1) - (pageColors.length + 1);
          for (let i = 0; i < placeholdersNeeded; i++) {
              const placeholder = document.createElement('div');
              placeholder.className = 'color-swatch';
              placeholder.style.pointerEvents = 'none';
              placeholder.style.opacity = '0';
              frag.appendChild(placeholder);
          }

          colorPickerSwatches.appendChild(frag);

          colorPickerPagination.innerHTML = '';
          if (totalPages > 1) {
              for (let i = 0; i < totalPages; i++) {
                  const dot = document.createElement('div');
                  dot.className = 'pagination-dot' + (i === colorPickerPage ? ' active' : '');
                  dot.dataset.page = i;
                  dot.addEventListener('click', (e) => {
                      colorPickerPage = parseInt(e.target.dataset.page, 10);
                      renderColorPickerContent();
                  });
                  colorPickerPagination.appendChild(dot);
              }
          }
      }

      function openColorPickerModal(targetTile = null) {
          if (isBreathing) return;
          pointerState.longPressTarget = targetTile;
          colorPickerPage = 0;
          renderColorPickerContent();
          colorPickerModal.classList.add('modal-visible');
      }

      function closeColorPickerModal() {
          colorPickerModal.classList.remove('modal-visible');
          pointerState.longPressTarget = null;
      }
      
      function openHelpModal() { 
        populateHelpModal();
        helpModal.classList.add('modal-visible'); 
      }
      function closeHelpModal() { helpModal.classList.remove('modal-visible'); }

      function openPaletteModal() {
        if (isBreathing) return;
        populatePaletteModal();
        paletteModal.classList.add('modal-visible');
      }

      function closePaletteModal() {
          paletteModal.classList.remove('modal-visible');
      }

      function populatePaletteModal() {
          paletteModalGrid.innerHTML = '';
          const frag = document.createDocumentFragment();
          PALETTES.forEach((palette, index) => {
              const preview = document.createElement('div');
              preview.className = 'palette-preview';
              preview.addEventListener('click', () => {
                  switchToPalette(index);
                  closePaletteModal();
              });

              const iconContainer = document.createElement('div');
              iconContainer.className = 'palette-preview-icon';

              if (palette.iconHTML) {
                  iconContainer.innerHTML = palette.iconHTML;
                  const childElement = iconContainer.firstElementChild;
                  if (childElement) {
                      childElement.style.width = '40px';
                      childElement.style.height = '40px';
                      if (childElement.tagName.toLowerCase() === 'span') {
                          childElement.style.fontSize = '36px';
                      }
                  }
              } else {
                  iconContainer.textContent = palette.emoji;
              }

              const name = document.createElement('span');
              name.className = 'palette-preview-name';
              name.textContent = palette.name;

              preview.appendChild(iconContainer);
              preview.appendChild(name);
              frag.appendChild(preview);
          });
          paletteModalGrid.appendChild(frag);
      }
      
      // ---- START: Game of Life Settings Modal Functions ----
      function openGolSettingsModal() {
        if (isBreathing || isLifePlaying) return;
        
        golSurvivalMin.value = gameOfLifeRules.survivalMin;
        golSurvivalMax.value = gameOfLifeRules.survivalMax;
        golBirth.value = gameOfLifeRules.birth;
        golLiveCellDef.value = gameOfLifeRules.liveCellDef;
        golColorGenetics.value = gameOfLifeRules.colorGenetics;
        
        gameOfLifeSettingsModal.style.display = 'flex';
        setTimeout(() => gameOfLifeSettingsModal.classList.add('modal-visible'), 10);
      }

      function closeGolSettingsModal() {
        gameOfLifeSettingsModal.classList.remove('modal-visible');
        setTimeout(() => gameOfLifeSettingsModal.style.display = 'none', 300);
      }

      function saveGolSettings() {
        gameOfLifeRules.survivalMin = parseInt(golSurvivalMin.value, 10) || 0;
        gameOfLifeRules.survivalMax = parseInt(golSurvivalMax.value, 10) || 0;
        gameOfLifeRules.birth = parseInt(golBirth.value, 10) || 0;
        gameOfLifeRules.liveCellDef = golLiveCellDef.value;
        gameOfLifeRules.colorGenetics = golColorGenetics.value;
        closeGolSettingsModal();
      }

      function resetGolSettings() {
        gameOfLifeRules = { ...defaultGameOfLifeRules };
        golSurvivalMin.value = gameOfLifeRules.survivalMin;
        golSurvivalMax.value = gameOfLifeRules.survivalMax;
        golBirth.value = gameOfLifeRules.birth;
        golLiveCellDef.value = gameOfLifeRules.liveCellDef;
        golColorGenetics.value = gameOfLifeRules.colorGenetics;
      }
      // ---- END: Game of Life Settings Modal Functions ----

      // ---- START: Gravitational Sort Settings Modal Functions ----
      function openGravitationalSortSettingsModal() {
          if (isBreathing || isLifePlaying) return;
          
          gsDirectionButtons.forEach(btn => {
              btn.classList.toggle('active', btn.dataset.direction === gravitationalSortRules.direction);
          });
          
          gsStrengthSlider.value = gravitationalSortRules.strength * 100;
          gsStrengthValue.textContent = `${Math.round(gravitationalSortRules.strength * 100)}%`;

          gravitationalSortSettingsModal.style.display = 'flex';
          setTimeout(() => gravitationalSortSettingsModal.classList.add('modal-visible'), 10);
      }

      function closeGravitationalSortSettingsModal() {
          gravitationalSortSettingsModal.classList.remove('modal-visible');
          setTimeout(() => gravitationalSortSettingsModal.style.display = 'none', 300);
      }

      function saveGravitationalSortSettings() {
          const activeBtn = gravitationalSortSettingsModal.querySelector('.gs-direction-btn.active');
          if (activeBtn) {
              gravitationalSortRules.direction = activeBtn.dataset.direction;
          }
          gravitationalSortRules.strength = parseInt(gsStrengthSlider.value, 10) / 100;
          closeGravitationalSortSettingsModal();
      }
      // ---- END: Gravitational Sort Settings Modal Functions ----

      // ---- Simulation Core Logic ----
      function runGameOfLifeGeneration() {
          const currentPalette = palette();
          const darkestIndex = 0; 
          const lightestIndex = currentPalette.length - 1;
          const halfIndex = Math.floor(lightestIndex / 2);

          const allCurrentTiles = tiles();

          let currentState = [];
          for (let i = 0; i < n; i++) {
              currentState[i] = [];
              for (let j = 0; j < n; j++) {
                  const tile = allCurrentTiles[i * n + j];
                  const tileIndex = getIndex(tile);
                  
                  let isAlive = false;
                  switch (gameOfLifeRules.liveCellDef) {
                      case 'notDarkest':
                          isAlive = tileIndex !== darkestIndex;
                          break;
                      case 'notLightest':
                          isAlive = tileIndex !== lightestIndex;
                          break;
                      case 'notDarkestAndLightest':
                          isAlive = tileIndex !== darkestIndex && tileIndex !== lightestIndex;
                          break;
                      case 'topHalf':
                          isAlive = tileIndex > halfIndex;
                          break;
                      case 'bottomHalf':
                          isAlive = tileIndex < halfIndex && tileIndex !== darkestIndex;
                          break;
                      default:
                          isAlive = tileIndex !== darkestIndex;
                  }
                  
                  if(isGold(tile)) isAlive = false;

                  currentState[i][j] = {
                      isAlive,
                      k: tileIndex,
                  };
              }
          }

          const nextState = [];
          for (let i = 0; i < n; i++) {
              nextState[i] = [];
              for (let j = 0; j < n; j++) {
                  let liveNeighbors = 0;
                  const neighborColors = [];

                  for (let di = -1; di <= 1; di++) {
                      for (let dj = -1; dj <= 1; dj++) {
                          if (di === 0 && dj === 0) continue;
                          const ni = i + di;
                          const nj = j + dj;
                          if (ni >= 0 && ni < n && nj >= 0 && nj < n && currentState[ni][nj].isAlive) {
                              liveNeighbors++;
                              neighborColors.push(currentPalette[currentState[ni][nj].k]);
                          }
                      }
                  }
                  
                  const cell = currentState[i][j];
                  let becomesAlive = false;
                  let newK = cell.k;

                  if (cell.isAlive) { 
                      becomesAlive = liveNeighbors >= gameOfLifeRules.survivalMin && liveNeighbors <= gameOfLifeRules.survivalMax;
                  } else {
                      becomesAlive = liveNeighbors === gameOfLifeRules.birth;
                      if (becomesAlive) {
                          const geneticColor = getGeneticColor(neighborColors, gameOfLifeRules.colorGenetics);
                          newK = findClosestColorIndex(geneticColor, currentPalette);
                      }
                  }
                  
                  nextState[i][j] = {
                      isAlive: becomesAlive,
                      k: becomesAlive ? newK : darkestIndex,
                  };
              }
          }

          for (let i = 0; i < n; i++) {
              for (let j = 0; j < n; j++) {
                  const tile = allCurrentTiles[i * n + j];
                  const state = nextState[i][j];
                  if (!isGold(tile)) {
                      setIndex(tile, state.k);
                  }
              }
          }
      }

      function runBrightnessEvolution() {
          const smoothingFactor = 0.5;

          const allCurrentTiles = tiles();
          const currentState = allCurrentTiles.map(tile => ({
              v: tile.dataset.v !== undefined ? parseFloat(tile.dataset.v) : getIndex(tile),
              isGold: isGold(tile)
          }));

          const nextStateV = [];

          for (let i = 0; i < n * n; i++) {
              const cell = currentState[i];
              if (cell.isGold) {
                  nextStateV[i] = cell.v;
                  continue;
              }
              const row = Math.floor(i / n);
              const col = i % n;
              
              let totalBrightness = 0;
              let neighborCount = 0;

              for (let di = -1; di <= 1; di++) {
                  for (let dj = -1; dj <= 1; dj++) {
                      const ni = row + di;
                      const nj = col + dj;
                      if (ni >= 0 && ni < n && nj >= 0 && nj < n) {
                          const neighbor = currentState[ni * n + nj];
                          if (!neighbor.isGold) {
                              totalBrightness += neighbor.v;
                              neighborCount++;
                          }
                      }
                  }
              }

              if (neighborCount > 0) {
                  const averageBrightness = totalBrightness / neighborCount;
                  const currentV = cell.v;
                  const newV = currentV + (averageBrightness - currentV) * smoothingFactor;
                  nextStateV[i] = newV;
              } else {
                  nextStateV[i] = cell.v;
              }
          }

          allCurrentTiles.forEach((tile, i) => {
              if (!isGold(tile)) {
                  const newV = nextStateV[i];
                  setIndex(tile, newV, newV);
              }
          });
      }

      function runGravitationalSortGeneration() {
          const allCurrentTiles = tiles();
          const currentStateIndices = allCurrentTiles.map(tile => getIndex(tile));
          const strength = gravitationalSortRules.strength;
          let changed = false;

          switch (gravitationalSortRules.direction) {
              case 'down':
                  for (let row = n - 2; row >= 0; row--) {
                      for (let col = 0; col < n; col++) {
                          const i = row * n + col;
                          const below_i = (row + 1) * n + col;
                          if (currentStateIndices[i] < currentStateIndices[below_i] && Math.random() < strength) {
                              [currentStateIndices[i], currentStateIndices[below_i]] = [currentStateIndices[below_i], currentStateIndices[i]];
                              changed = true;
                          }
                      }
                  }
                  break;
              case 'up':
                  for (let row = 1; row < n; row++) {
                      for (let col = 0; col < n; col++) {
                          const i = row * n + col;
                          const above_i = (row - 1) * n + col;
                          if (currentStateIndices[i] > currentStateIndices[above_i] && Math.random() < strength) {
                              [currentStateIndices[i], currentStateIndices[above_i]] = [currentStateIndices[above_i], currentStateIndices[i]];
                              changed = true;
                          }
                      }
                  }
                  break;
              case 'right':
                  for (let col = n - 2; col >= 0; col--) {
                      for (let row = 0; row < n; row++) {
                          const i = row * n + col;
                          const right_i = row * n + (col + 1);
                          if (currentStateIndices[i] < currentStateIndices[right_i] && Math.random() < strength) {
                              [currentStateIndices[i], currentStateIndices[right_i]] = [currentStateIndices[right_i], currentStateIndices[i]];
                              changed = true;
                          }
                      }
                  }
                  break;
              case 'left':
                  for (let col = 1; col < n; col++) {
                      for (let row = 0; row < n; row++) {
                          const i = row * n + col;
                          const left_i = row * n + (col - 1);
                          if (currentStateIndices[i] > currentStateIndices[left_i] && Math.random() < strength) {
                              [currentStateIndices[i], currentStateIndices[left_i]] = [currentStateIndices[left_i], currentStateIndices[i]];
                              changed = true;
                          }
                      }
                  }
                  break;
          }

          if (changed) {
              allCurrentTiles.forEach((tile, i) => {
                  if (getIndex(tile) !== currentStateIndices[i]) {
                      setIndex(tile, currentStateIndices[i]);
                  }
              });
          }
      }

      // ---- Color manipulation helper functions ----
      function hexToRgb(hex) {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16)
          } : null;
      }
      
      function getGeneticColor(parentHexColors, method = 'randomMix') {
        if (parentHexColors.length === 0) return 'rgb(0,0,0)';
        const parentRgbColors = parentHexColors.map(hex => hexToRgb(hex)).filter(Boolean);
        if (parentRgbColors.length === 0) return 'rgb(0,0,0)';

        let r, g, b;

        switch (method) {
            case 'average':
                r = Math.round(parentRgbColors.reduce((sum, c) => sum + c.r, 0) / parentRgbColors.length);
                g = Math.round(parentRgbColors.reduce((sum, c) => sum + c.g, 0) / parentRgbColors.length);
                b = Math.round(parentRgbColors.reduce((sum, c) => sum + c.b, 0) / parentRgbColors.length);
                break;

            case 'dominant':
                // For this example, "dominant" is the parent with highest luminance
                let dominantColor = parentRgbColors[0];
                let maxLuminance = -1;
                parentRgbColors.forEach((c, i) => {
                    const lum = getLuminance(parentHexColors[i]);
                    if (lum > maxLuminance) {
                        maxLuminance = lum;
                        dominantColor = c;
                    }
                });
                r = dominantColor.r;
                g = dominantColor.g;
                b = dominantColor.b;
                break;

            case 'randomMix':
            default:
                const getRandomComponent = (component) => {
                    const randomIndex = Math.floor(Math.random() * parentRgbColors.length);
                    return parentRgbColors[randomIndex][component];
                };
                r = getRandomComponent('r');
                g = getRandomComponent('g');
                b = getRandomComponent('b');
                break;
        }

        return `rgb(${r}, ${g}, ${b})`;
      }

      function findClosestColorIndex(targetRgb, colorPalette) {
          let closestIndex = 0;
          let minDistance = Infinity;
          const target = targetRgb.match(/\d+/g).map(Number);

          colorPalette.forEach((hex, index) => {
              const rgb = hexToRgb(hex);
              if (!rgb) return;
              const dist = Math.sqrt(
                  Math.pow(target[0] - rgb.r, 2) +
                  Math.pow(target[1] - rgb.g, 2) +
                  Math.pow(target[2] - rgb.b, 2)
              );
              if (dist < minDistance) {
                  minDistance = dist;
                  closestIndex = index;
              }
          });
          return closestIndex;
      }

      function prepareForLifeLongPress() {
          performAction(() => {
              const darkestIndex = 0;
              tiles().forEach(el => {
                  clearGoldOverlay(el);
                  setIndex(el, darkestIndex);
              });
              
              const currentPalette = palette();
              const lightestIndex = currentPalette.length - 1;
              if (lightestIndex >= 0) {
                  selectedColor = currentPalette[lightestIndex];
                  selectedColorIndex = lightestIndex;
                  isRainbowModeActive = false;
                  updateColorPickerButtonUI();
                  updateGlowEffect();
              }
          });
      }

      function handleCtrlClick(e, actionFn) {
        // Allow the play/pause button to function even when breathing
        if (isBreathing && e.currentTarget.id !== 'btnPlayPauseLife') return;

        if (wasLongPress) {
          wasLongPress = false;
          return;
        }
        actionFn();
        if (isOnboarding && onboardingStep === 3) {
            advanceOnboarding(4);
        }
      }

      function handleColorPickerClick() {
        if (selectedColor || isRainbowModeActive) {
            performAction(resetSelectedColor);
        } else {
            openColorPickerModal();
        }
      }

      function navigateColorPages(isNext) {
        const totalPages = Math.ceil(PALETTES[activePaletteIndex].colors.length / COLORS_PER_PAGE);
        if(totalPages <= 1) return;
        if(isNext) {
          colorPickerPage = (colorPickerPage + 1) % totalPages;
        } else {
          colorPickerPage = (colorPickerPage - 1 + totalPages) % totalPages;
        }
        renderColorPickerContent();
      }
      
      let lastWheelTime = 0; let touchStartX = 0; let touchEndX = 0;
      function handlePaletteWheel(e) { if (Date.now() - lastWheelTime < 200) return; e.preventDefault(); navigateColorPages(e.deltaY > 0); lastWheelTime = Date.now(); }
      function handleTouchStart(e) { touchStartX = e.changedTouches[0].screenX; }
      function handleTouchEnd(e) { touchEndX = e.changedTouches[0].screenX; handleSwipeGesture(); }
      function handleSwipeGesture() { if (touchEndX < touchStartX - 50) { navigateColorPages(true); } if (touchEndX > touchStartX + 50) { navigateColorPages(false); } }
      
      async function handleSaveImage() {
        if (!generatedImageFile) return;
        const isMobile = navigator.share && navigator.canShare;
        const fileToSave = new File([generatedImageFile], getSanitizedFileName('png'), { type: generatedImageFile.type });
        if (isMobile) { try { await navigator.share({ files: [fileToSave], title: 'Followed my intuition' }); } catch (err) { if (err.name !== 'AbortError') { console.error('Share API error:', err); } } } else { const link = document.createElement('a'); link.href = URL.createObjectURL(fileToSave); link.download = fileToSave.name; link.click(); URL.revokeObjectURL(link.href); }
        closeModal();
      }
      async function handleSaveProject() {
          const state = getCurrentState();
          const stateString = JSON.stringify(state, null, 2);
          const blob = new Blob([stateString], { type: 'application/json' });
          const fileName = getSanitizedFileName('json');
          const projectFile = new File([blob], fileName, { type: 'application/json' });
          const isMobile = navigator.share && navigator.canShare;
          if (isMobile) { try { await navigator.share({ files: [projectFile], title: 'My Idea' }); } catch (err) { if (err.name !== 'AbortError') { console.error('Share API error:', err); } } } else { const link = document.createElement('a'); link.href = URL.createObjectURL(projectFile); link.download = fileName; link.click(); URL.revokeObjectURL(link.href); }
          closeModal();
      }
      function handleLoadProject() { projectFileInput.click(); closeModal(); }
      function onProjectFileSelected(event) {
        const file = event.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
          try {
            const state = JSON.parse(e.target.result);
            if (state.n && state.tiles && typeof state.activePaletteIndex !== 'undefined') { animateBoardTransition(() => { applyState(state); history = []; future = []; updateUndoRedoButtons(); }); } 
            else { alert(getText('error_invalidFile')); }
          } catch (error) { console.error("Failed to load or parse project file:", error); alert(getText('error_readFile')); }
        };
        reader.readAsText(file);
        event.target.value = null;
      }
      
      function hideLongPressDisplay() {
          clearTimeout(longPressTimer);
          longPressOverlay.classList.remove('visible');
          longPressDisplay.classList.remove('visible');
          setTimeout(() => { longPressDisplay.innerHTML = ''; }, 250);
      }
      function handlePointerDownCtrl(e) {
          if (isBreathing) return;
          const btn = e.currentTarget;
          longPressTimer = setTimeout(() => {
              wasLongPress = true;

              if (btn.id === 'btnRandom') {
                  performAction(shuffleExistingColors);
                  return;
              }
              
              if (btn.id === 'btnToggleSimMode') {
                  if (!isSimModeActive) {
                      toggleSimMode();
                  }
                  prepareBoardForSimMode();
                  return;
              }

              if (btn.id === 'btnGameOfLife') {
                  openGolSettingsModal();
                  return;
              }

              if (btn.id === 'btnGravitationalSort') {
                  openGravitationalSortSettingsModal();
                  return;
              }

              if (btn.id === 'btnPalette') {
                  openPaletteModal();
                  return;
              }
              if (btn.id === 'btnResizeUp' || btn.id === 'btnResizeDown') {
                  openResizeModal(); 
                  return; 
              }
              if (btn.id === 'btnBrushMode') {
                  const customHTML = `<div class="flex flex-col items-center justify-center gap-4 text-lg text-gray-300"><div class="flex items-center gap-4"><svg viewBox="0 0 24 24" style="width: var(--icon-size); height: var(--icon-size);"><path d="M12 2 L2 22 L22 22 Z" stroke="#fff" stroke-width="2" fill="#fff" /></svg><span>${getText('brushMode_paint')}</span></div><div class="flex items-center gap-4"><svg viewBox="0 0 24 24" style="width: var(--icon-size); height: var(--icon-size);"><path d="M12 2 L2 22 L22 22 Z" stroke="#fff" stroke-width="2" fill="#000" /></svg><span>${getText('brushMode_copy')}</span></div></div>`;
                  longPressDisplay.innerHTML = customHTML;
              } else {
                  let iconElement;
                  if (btn.classList.contains('palette')) { iconElement = btn.cloneNode(true); iconElement.style.background = 'transparent'; iconElement.style.border = 'none'; } 
                  else { iconElement = btn.querySelector('.glyph, svg, .glyph-save, .glyph-reset, .glyph-special-reset, .glyph-dark'); }
                  if (!iconElement) return;
                  const clonedIcon = iconElement.cloneNode(true);
                  const baseIconSize = parseInt(getComputedStyle(root).getPropertyValue('--icon-size'));
                  const targetIconSize = baseIconSize * 2;
                  if (btn.classList.contains('palette')) { clonedIcon.style.fontSize = `${targetIconSize}px`; } 
                  else { clonedIcon.style.width = `${targetIconSize}px`; clonedIcon.style.height = `${targetIconSize}px`; }
                  const textElement = document.createElement('p');
                  if (btn.id === 'btnPalette') { textElement.innerHTML = PALETTES[activePaletteIndex].name; } 
                  else if (btn.id === 'btnSymmetry') { 
                    let key;
                    if (symmetryMode === 'vertical') key = 'symmetry_vertical';
                    else if (symmetryMode === 'horizontal') key = 'symmetry_horizontal';
                    else if (symmetryMode === 'mandala') key = 'symmetry_mandala';
                    else if (symmetryMode === 'kaleidoscope') key = 'symmetry_kaleidoscope';
                    else key = 'symmetry_off';
                    textElement.innerHTML = getText(key); 
                  }
                  else { textElement.innerHTML = btn.title || ""; }
                  textElement.className = 'text-lg text-gray-300 text-center px-4';
                  longPressDisplay.innerHTML = '';
                  longPressDisplay.appendChild(clonedIcon);
                  longPressDisplay.appendChild(textElement);
              }
              longPressOverlay.classList.add('visible');
              longPressDisplay.classList.add('visible');
          }, LONG_PRESS_SHOW_MS);
      }
      
      function populateHelpModal() {
        const contentDiv = document.getElementById('helpModalContent');
        contentDiv.innerHTML = '';

        const categories = {
            inspiration: {
                titleKey: 'help_category_inspiration',
                buttons: ['btnPalette', 'btnRandom', 'btnInvert', 'btnSpecialReset']
            },
            order: {
                titleKey: 'help_category_order',
                buttons: ['btnResizeUp', 'btnResizeDown', 'btnGap', 'btnDark']
            },
            touch: {
                titleKey: 'help_category_touch',
                buttons: ['btnBrushMode', 'btnSymmetry', 'btnColorPicker']
            },
            evolution: {
                titleKey: 'help_category_evolution',
                buttons: ['btnToggleSimMode', 'btnShowBreatheMenu', 'btnGameOfLife', 'btnBrightnessEvo', 'btnGravitationalSort', 'btnPlayPauseLife']
            },
            tools: {
                titleKey: 'help_category_tools',
                buttons: ['btnUndo', 'btnRedo', 'btnSave', 'btnResetBoard']
            }
        };

        const helpData = {
            'btnPalette': getText('help_palette'), 'btnRandom': getText('help_random'), 'btnInvert': getText('help_invert'),
            'btnSpecialReset': getText('help_specialReset'), 'btnResizeUp': getText('help_resizeUp'),
            'btnResizeDown': getText('help_resizeDown'), 'btnGap': getText('help_gap'), 'btnDark': getText('help_dark'),
            'btnBrushMode': getText('help_brushMode'), 'btnSymmetry': getText('help_symmetry'), 'btnColorPicker': getText('help_colorPicker'),
            'btnToggleSimMode': getText('help_toggleSimMode'), 'btnShowBreatheMenu': getText('help_breathe'),
            'btnGameOfLife': getText('help_gameOfLife'), 'btnBrightnessEvo': getText('help_brightnessEvo'),
            'btnGravitationalSort': getText('help_gravitationalSort'),
            'btnPlayPauseLife': getText('help_playPauseLife'), 'btnUndo': getText('help_undo'), 'btnRedo': getText('help_redo'),
            'btnSave': getText('help_save'), 'btnResetBoard': getText('help_resetBoard')
        };

        for (const categoryKey in categories) {
            const category = categories[categoryKey];
            const titleEl = document.createElement('h3');
            titleEl.className = 'help-category-title';
            titleEl.textContent = getText(category.titleKey);
            contentDiv.appendChild(titleEl);

            category.buttons.forEach(btnId => {
                const btn = document.getElementById(btnId);
                if (!btn || !helpData[btnId]) return;

                const helpItem = document.createElement('div');
                helpItem.className = 'flex items-center gap-4';

                const iconWrapper = document.createElement('div');
                iconWrapper.className = 'help-item-icon-wrapper';
                iconWrapper.innerHTML = btn.innerHTML;
                
                if (btnId === 'btnPlayPauseLife') {
                    const playIcon = iconWrapper.querySelector('#iconPlay');
                    if(playIcon) playIcon.style.display = 'block';
                    const pauseIcon = iconWrapper.querySelector('#iconPause');
                    if(pauseIcon) pauseIcon.style.display = 'none';
                }

                const textWrapper = document.createElement('div');
                textWrapper.textContent = helpData[btnId];
                textWrapper.className = 'text-gray-300 text-sm';
                
                helpItem.appendChild(iconWrapper);
                helpItem.appendChild(textWrapper);
                contentDiv.appendChild(helpItem);
            });
        }
        
        const tipsTitle = document.createElement('h3');
        tipsTitle.className = 'help-category-title';
        tipsTitle.textContent = getText('help_category_tips');
        contentDiv.appendChild(tipsTitle);

        const tipsContainer = document.createElement('div');
        tipsContainer.className = 'space-y-3 text-sm text-gray-300 pl-2';
        const tips = ['help_tip1', 'help_tip2', 'help_tip3', 'help_tip4', 'help_tip5', 'help_tip6'];

        tips.forEach(tipKey => {
            const tipItem = document.createElement('p');
            const accent = document.createElement('span');
            accent.textContent = '*';
            accent.style.color = GOLD;
            accent.style.marginRight = '8px';
            tipItem.appendChild(accent);
            tipItem.appendChild(document.createTextNode(getText(tipKey)));
            tipsContainer.appendChild(tipItem);
        });

        contentDiv.appendChild(tipsContainer);

        const shortcutsTitle = document.createElement('h3');
        shortcutsTitle.className = 'help-category-title';
        shortcutsTitle.textContent = getText('help_category_shortcuts');
        contentDiv.appendChild(shortcutsTitle);

        const shortcutsContainer = document.createElement('div');
        shortcutsContainer.className = 'space-y-2';

        const shortcuts = [
            { keys: ['Ctrl', '+', 'Z'], descriptionKey: 'help_shortcut_undo' }, { keys: ['Ctrl', '+', 'Y'], descriptionKey: 'help_shortcut_redo' },
            { keys: ['Ctrl', '+', 'S'], descriptionKey: 'help_shortcut_save' }, { keys: ['I'], descriptionKey: 'help_shortcut_invert' },
            { keys: ['R'], descriptionKey: 'help_shortcut_random' }, { keys: ['D'], descriptionKey: 'help_shortcut_dark' },
            { keys: ['B'], descriptionKey: 'help_shortcut_brush' }, { keys: ['M'], descriptionKey: 'help_shortcut_symmetry' },
            { keys: ['G'], descriptionKey: 'help_shortcut_gap' }, { keys: ['←', '/', '→'], descriptionKey: 'help_shortcut_palette' },
            { keys: ['+', '/', '-'], descriptionKey: 'help_shortcut_resize' }
        ];

        shortcuts.forEach(shortcut => {
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between gap-4';
            const description = document.createElement('span');
            description.className = 'text-gray-300 text-sm';
            description.textContent = getText(shortcut.descriptionKey);
            const keysWrapper = document.createElement('div');
            shortcut.keys.forEach(key => {
                if (key === '+' || key === '/') {
                    keysWrapper.appendChild(document.createTextNode(` ${key} `));
                } else {
                    const keyEl = document.createElement('span');
                    keyEl.className = 'kbd-key';
                    keyEl.textContent = key;
                    keysWrapper.appendChild(keyEl);
                }
            });
            item.appendChild(description);
            item.appendChild(keysWrapper);
            shortcutsContainer.appendChild(item);
        });
        contentDiv.appendChild(shortcutsContainer);
      }

      function setTextContent() {
        const splashTextEl = document.getElementById('splashText');
        if (splashTextEl) splashTextEl.textContent = getText('splashTitle');
        const fileNameLabelEl = document.getElementById('fileNameLabel');
        if (fileNameLabelEl) fileNameLabelEl.textContent = getText('saveModal_feelsLike');
        if (fileNameInput) fileNameInput.placeholder = getText('saveModal_defaultFilename');
        if (btnModalClose) btnModalClose.title = getText('saveModal_close');
        if (btnSaveImage) btnSaveImage.title = getText('saveModal_saveImage');
        if (btnSaveProjectIdea) btnSaveProjectIdea.title = getText('saveModal_saveIdea');
        if (btnLoadProjectIdea) btnLoadProjectIdea.title = getText('saveModal_loadIdea');
        const breatheSoloLabelEl = document.getElementById('breatheSoloLabel');
        if (breatheSoloLabelEl) breatheSoloLabelEl.textContent = getText('breatheModal_solo');
        const breatheGroupLabelEl = document.getElementById('breatheGroupLabel');
        if (breatheGroupLabelEl) breatheGroupLabelEl.textContent = getText('breatheModal_group');
        const resizeModalTitleEl = document.getElementById('resizeModalTitle');
        if (resizeModalTitleEl) resizeModalTitleEl.textContent = getText('resizeModal_title');
        const resizeModalPromptEl = document.getElementById('resizeModalPrompt');
        if (resizeModalPromptEl) resizeModalPromptEl.textContent = getText('resizeModal_prompt');
        if (btnConfirmResize) btnConfirmResize.textContent = getText('resizeModal_confirm');
        const helpModalTitleEl = document.getElementById('helpModalTitle');
        if (helpModalTitleEl) helpModalTitleEl.textContent = getText('help_title');
        const paletteModalTitleEl = document.getElementById('paletteModalTitle');
        if(paletteModalTitleEl) paletteModalTitleEl.textContent = getText('paletteModal_title');
        const helpIntroTextEl = document.getElementById('helpIntroText');
        if (helpIntroTextEl) helpIntroTextEl.textContent = getText('help_intro');
        
        // Modal Titles
        const gsSettingsTitle = document.getElementById('gsSettingsTitle');
        if (gsSettingsTitle) gsSettingsTitle.textContent = getText('gs_modal_title');
        const btnGsSettingsCancelEl = document.getElementById('btnGsSettingsCancel');
        if (btnGsSettingsCancelEl) btnGsSettingsCancelEl.textContent = getText('gs_modal_cancel');
        const btnGsSettingsSaveEl = document.getElementById('btnGsSettingsSave');
        if (btnGsSettingsSaveEl) btnGsSettingsSaveEl.textContent = getText('gs_modal_save_close');
        
        // Tooltips
        if(btnInvert) btnInvert.title = getText('tooltip_invert');
        if(btnRandom) btnRandom.title = getText('tooltip_random');
        if(btnColorPicker) btnColorPicker.title = getText('tooltip_colorPicker');
        if(btnSymmetry) btnSymmetry.title = getText('tooltip_symmetry');
        if(btnRedo) btnRedo.title = getText('tooltip_redo');
        if(btnUndo) btnUndo.title = getText('tooltip_undo');
        if(btnDark) btnDark.title = getText('tooltip_dark');
        if(btnSpecialReset) btnSpecialReset.title = getText('tooltip_specialReset');
        if(btnResetBoard) btnResetBoard.title = getText('tooltip_resetBoard');
        if(btnResizeUp) btnResizeUp.title = getText('tooltip_resizeUp');
        if(btnResizeDown) btnResizeDown.title = getText('tooltip_resizeDown');
        if(btnSave) btnSave.title = getText('tooltip_save');
        if(btnShowBreatheMenu) btnShowBreatheMenu.title = getText('tooltip_breathe');
        if(btnTutorial) btnTutorial.title = getText('tooltip_tutorial');
        if(btnGameOfLife) btnGameOfLife.title = getText('tooltip_gameOfLife');
        if(btnBrightnessEvo) btnBrightnessEvo.title = getText('tooltip_brightnessEvo');
        if(btnGravitationalSort) btnGravitationalSort.title = getText('tooltip_gravitationalSort');
        if(btnLangToggle) btnLangToggle.textContent = currentLang.toUpperCase();
        
        const allButtonsForAria = document.querySelectorAll('.ctrl');
        allButtonsForAria.forEach(btn => {
            if (btn.title) {
              btn.setAttribute('aria-label', btn.title)
            }
        });
      }
      
      // ---- Language Switching Logic ----
      function changeLanguage(lang) {
        currentLang = lang;

        const helpModalInnerContainer = document.getElementById('helpModalInnerContainer');
        if (lang === 'he') {
            helpModalInnerContainer.classList.add('rtl-mode');
        } else {
            helpModalInnerContainer.classList.remove('rtl-mode');
        }

        PALETTES.forEach(p => {
          const key = Object.keys(translations).find(k => translations[k].en === p.originalName);
          if (key && translations[key][currentLang]) {
            p.name = getText(key);
          } else {
            p.name = p.originalName;
          }
        });

        setTextContent();
        
        updatePaletteHeader();

        if (helpModal.classList.contains('modal-visible')) {
            populateHelpModal();
        }

        try {
          localStorage.setItem('userLanguage', lang);
        } catch (e) {
          console.warn('Could not save language to localStorage.');
        }
      }

      function toggleLanguage() {
        const currentIndex = availableLangs.indexOf(currentLang);
        const nextIndex = (currentIndex + 1) % availableLangs.length;
        const newLang = availableLangs[nextIndex];
        changeLanguage(newLang);
      }
      
      // ---- Onboarding Logic ----
      function updateOnboardingUI() {
        const allControls = document.querySelectorAll('.ctrl');

        // Define controls for each stage
        const stage1Controls = [btnPalette, btnSpecialReset];
        const stage2Controls = [...stage1Controls, btnUndo, btnRedo];
        const stage3Controls = [...stage2Controls, btnSymmetry, btnResizeUp, btnResizeDown, btnShowBreatheMenu, btnDark];

        // Hide all controls initially if onboarding is active
        if (onboardingStep > 0) {
            allControls.forEach(btn => {
                btn.classList.remove('onboarding-visible');
                btn.classList.add('onboarding-hidden');
            });
        }

        // Function to make a set of controls visible
        const showControls = (controls) => {
            setTimeout(() => {
                controls.forEach(btn => {
                    btn.classList.remove('onboarding-hidden');
                    btn.classList.add('onboarding-visible');
                });
            }, 50);
        };

        if (onboardingStep === 1) {
            showControls(stage1Controls);
        } else if (onboardingStep === 2) {
            showControls(stage2Controls);
        } else if (onboardingStep === 3) {
            showControls(stage3Controls);
        } else if (onboardingStep >= 4) {
            // Show all controls
            allControls.forEach(btn => {
                btn.classList.remove('onboarding-hidden');
                btn.classList.add('onboarding-visible');
            });
            // Nudge the tutorial button
            btnTutorial.classList.add('glow-animation');
            setTimeout(() => {
                btnTutorial.classList.remove('glow-animation');
            }, 4000); // Let it glow for 4 seconds
        }
      }
      
      function advanceOnboarding(step) {
          if (!isOnboarding || step <= onboardingStep) return;

          onboardingStep = step;
          updateOnboardingUI();

          if (onboardingStep >= 4) {
              isOnboarding = false;
              try {
                  localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
              } catch (e) {
                  console.warn('Could not save onboarding status to localStorage.');
              }
          }
      }

      function startOnboarding() {
          isOnboarding = true;
          onboardingStep = 1;
          updateOnboardingUI();
      }

      async function initializeApp() {
        const splashScreen = document.getElementById('splashScreen');
        const splashText = document.getElementById('splashText');
        
        try {
            const savedLang = localStorage.getItem('userLanguage');
            if (savedLang && availableLangs.includes(savedLang)) {
                currentLang = savedLang;
            }
        } catch(e) {
            console.warn('Could not read language from localStorage.');
        }

        changeLanguage(currentLang);

        buildBoard(n, false); 
        fillRandom();
        hasPerformedInitialAutofill = true;
        
        applySeparator();
        updateUndoRedoButtons();
        setBrushMode(true);
        updateSymmetryUI();
        updateColorPickerButtonUI();
        updateGlowEffect();
        updateLayout();
        
        const helpModalContent = document.getElementById('helpModalContent');
        const btnResetOnboarding = document.createElement('button');
        btnResetOnboarding.id = 'btnResetOnboarding';
        helpModalContent.parentNode.appendChild(btnResetOnboarding);
        btnResetOnboarding.addEventListener('click', () => {
            try {
                localStorage.removeItem(ONBOARDING_STORAGE_KEY);
                location.reload();
            } catch (e) {
                console.error('Failed to reset onboarding', e);
            }
        });

        // ---- Event Listeners ----
        btnRandom.addEventListener('click', (e) => handleCtrlClick(e, randomizeAll));
        btnInvert.addEventListener('click', (e) => handleCtrlClick(e, invertGrid));
        btnPalette.addEventListener('click', (e) => handleCtrlClick(e, () => {
          switchPalette();
          if (isOnboarding) {
            if (onboardingStep === 1) advanceOnboarding(2);
            else if (onboardingStep === 2) advanceOnboarding(3);
          }
        }));
        btnResetBoard.addEventListener('click', (e) => handleCtrlClick(e, () => animateBoardTransition(resetToGoldAndDefaultPalette)));
        btnSpecialReset.addEventListener('click', (e) => handleCtrlClick(e, () => {
          animateBoardTransition(() => {
            performAction(specialReset);
            if (isOnboarding && onboardingStep === 1) advanceOnboarding(2);
          });
        }));
        btnResizeUp.addEventListener('click', (e) => handleCtrlClick(e, () => resizeGrid(true)));
        btnResizeDown.addEventListener('click', (e) => handleCtrlClick(e, () => resizeGrid(false)));
        btnSave.addEventListener('click', (e) => handleCtrlClick(e, savePNG_Optimized));
        btnGap.addEventListener('click', (e) => handleCtrlClick(e, cycleSeparator));
        btnBrushMode.addEventListener('click', (e) => handleCtrlClick(e, toggleBrushMode));
        btnUndo.addEventListener('click', (e) => handleCtrlClick(e, undo));
        btnRedo.addEventListener('click', (e) => handleCtrlClick(e, redo));
        btnTutorial.addEventListener('click', (e) => handleCtrlClick(e, openHelpModal));
        btnSymmetry.addEventListener('click', (e) => handleCtrlClick(e, cycleSymmetryMode));
        btnColorPicker.addEventListener('click', (e) => handleCtrlClick(e, handleColorPickerClick));
        btnDark.addEventListener('click', (e) => handleCtrlClick(e, goDarkAction));
        btnToggleSimMode.addEventListener('click', (e) => handleCtrlClick(e, toggleSimMode));
        
        // ---- START: UPDATED SIMULATION BUTTON LISTENERS ----
        btnGameOfLife.addEventListener('click', (e) => handleCtrlClick(e, () => armSimulation('gameOfLife')));
        btnBrightnessEvo.addEventListener('click', (e) => handleCtrlClick(e, () => armSimulation('brightnessEvo')));
        btnShowBreatheMenu.addEventListener('click', (e) => handleCtrlClick(e, () => armSimulation('breathe')));
        btnGravitationalSort.addEventListener('click', (e) => handleCtrlClick(e, () => armSimulation('gravitationalSort')));
        btnPlayPauseLife.addEventListener('click', (e) => handleCtrlClick(e, togglePlayPauseLife));
        btnStepForward.addEventListener('click', (e) => handleCtrlClick(e, stepForward));
        // ---- END: UPDATED SIMULATION BUTTON LISTENERS ----
        
        btnModalClose.addEventListener('click', closeModal);
        saveModal.addEventListener('click', (e) => { if (e.target === saveModal) { closeModal(); } });
        btnBreatheModalClose.addEventListener('click', closeBreatheModal);
        breatheModal.addEventListener('click', (e) => { if (e.target === breatheModal) { closeBreatheModal(); } });
        btnStartSoloBreathe.addEventListener('click', () => { closeBreatheModal(); startBreathingEffect(false); });
        btnStartGroupBreathe.addEventListener('click', () => { closeBreatheModal(); startBreathingEffect(true); });
        colorPickerModal.addEventListener('click', (e) => { if (e.target === colorPickerModal) { closeColorPickerModal(); } });
        btnHelpModalClose.addEventListener('click', closeHelpModal);
        helpModal.addEventListener('click', (e) => { if (e.target === helpModal) { closeHelpModal(); } });
        btnNextPalette.addEventListener('click', () => navigateColorPages(true));
        btnPrevPalette.addEventListener('click', () => navigateColorPages(false));
        btnConfirmResize.addEventListener('click', handleConfirmResize);
        resizeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { handleConfirmResize(); } });
        btnResizeModalClose.addEventListener('click', closeResizeModal);
        resizeModal.addEventListener('click', (e) => { if (e.target === resizeModal) { closeResizeModal(); } });
        colorPickerModal.addEventListener('wheel', handlePaletteWheel);
        colorPickerModal.addEventListener('touchstart', handleTouchStart, { passive: true });
        colorPickerModal.addEventListener('touchend', handleTouchEnd, { passive: true });
        btnSaveImage.addEventListener('click', handleSaveImage);
        btnSaveProjectIdea.addEventListener('click', handleSaveProject);
        btnLoadProjectIdea.addEventListener('click', handleLoadProject);
        projectFileInput.addEventListener('change', onProjectFileSelected);
        btnPaletteModalClose.addEventListener('click', closePaletteModal);
        paletteModal.addEventListener('click', (e) => { if (e.target === paletteModal) { closePaletteModal(); } });
        
        btnGolSettingsSave.addEventListener('click', saveGolSettings);
        btnGolSettingsCancel.addEventListener('click', closeGolSettingsModal);
        btnGolSettingsReset.addEventListener('click', resetGolSettings);

        // Gravitational Sort Modal Listeners
        gsDirectionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                gsDirectionButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        gsStrengthSlider.addEventListener('input', () => {
            gsStrengthValue.textContent = `${gsStrengthSlider.value}%`;
        });
        btnGsSettingsSave.addEventListener('click', saveGravitationalSortSettings);
        btnGsSettingsCancel.addEventListener('click', closeGravitationalSortSettingsModal);


        document.querySelectorAll('.ctrl').forEach(btn => {
            btn.addEventListener('pointerdown', handlePointerDownCtrl);
            btn.addEventListener('pointerup', hideLongPressDisplay);
            btn.addEventListener('pointerleave', hideLongPressDisplay);
        });
        btnLangToggle.addEventListener('click', toggleLanguage);
        window.addEventListener('resize', updateLayout);
        window.addEventListener('contextmenu', e => e.preventDefault());

        // --- Keyboard Shortcuts ---
        window.addEventListener('keydown', (e) => {
            if (document.querySelector('.modal-visible') || e.target.tagName === 'INPUT') {
                return;
            }

            const isCtrlOrCmd = e.ctrlKey || e.metaKey;

            if (isCtrlOrCmd && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            } else if (isCtrlOrCmd && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                redo();
            } else if (isCtrlOrCmd && e.key.toLowerCase() === 's') {
                e.preventDefault();
                savePNG_Optimized();
            } else {
                switch (e.key.toLowerCase()) {
                    case 'i': invertGrid(); break;
                    case 'r': randomizeAll(); break;
                    case 'd': goDarkAction(); break;
                    case 'b': toggleBrushMode(); break;
                    case 'm': cycleSymmetryMode(); break;
                    case 'g': cycleSeparator(); break;
                    case 'arrowright':
                    case 'pagedown':
                        switchPalette(false);
                        break;
                    case 'arrowleft':
                    case 'pageup':
                        switchPalette(true);
                        break;
                    case '+':
                    case '=':
                        resizeGrid(true);
                        break;
                    case '-':
                        resizeGrid(false);
                        break;
                }
            }
        });

        // --- Splash Screen & Onboarding ---
        let hasCompletedOnboarding = true;
        try {
            hasCompletedOnboarding = localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
        } catch (e) {
            console.warn('Could not read onboarding status from localStorage.');
        }

        if (!hasCompletedOnboarding) {
          document.querySelectorAll('.ctrl').forEach(c => c.classList.add('onboarding-hidden'));
          startOnboarding();
        }

        splashText.style.animation = 'fadeInText 2.5s linear forwards';
        await new Promise(r => setTimeout(r, 5000));
        splashText.style.animation = 'fadeOutText 1.5s linear forwards';
        await new Promise(r => setTimeout(r, 1500));
        const focusButton = document.getElementById('btnSpecialReset');
        focusButton.classList.add('splash-tutorial-focus');
        splashText.style.display = 'none';
        await new Promise(r => setTimeout(r, 1500)); 
        splashScreen.style.opacity = '0';
        await new Promise(r => setTimeout(r, 2000));
        splashScreen.remove();
        focusButton.classList.remove('splash-tutorial-focus');
      }

      initializeApp();

    })();