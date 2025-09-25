// js/config.js

/**
 * קובץ זה מכיל את אובייקטי התצורה הגדולים והסטטיים של האפליקציה,
 * כמו תרגומים ופלטות צבעים.
 */

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
export const translations = {
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
  paletteName_breeze: { en: "Breeze", he: "בריזה", ru: "Бриз", nl: "Bries" },
  paletteName_sky: { en: "Sky", he: "רקיע", ru: "Небо", nl: "Lucht" },
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

export const PALETTES = [
  { name: "Journey", originalName: "Journey", emoji: '🌓', colors: ["#000000", "#424242", "#7B1FA2", "#5E35B1", "#3949AB", "#673AB7", "#8E24AA", "#AD1457", "#3F51B5", "#B71C1C", "#9C27B0", "#C2185B", "#C62828", "#2E7D32", "#D32F2F", "#D81B60", "#AB47BC", "#757575", "#1976D2", "#E91E63", "#E53935", "#FF1744", "#EC407A", "#F44336", "#1E88E5", "#0097A7", "#EF5350", "#F4511E", "#FF4081", "#43A047", "#FF5252", "#FF5722", "#2196F3", "#F06292", "#4CAF50", "#FF7043", "#F57C00", "#9E9E9E", "#42A5F5", "#FB8C00", "#66BB6A", "#FF8C00", "#00BCD4", "#AFB42B", "#F48FB1", "#FF9800", "#8BC34A", "#26C6DA", "#FFA726", "#BDBDBD", "#9CCC65", "#FBC02D", "#CDDC39", "#FFE082", "#FFEE58", "#FFF176", "#FFD700", "#FDD835", "#F5F5F5", "#FFFFFF"] },
  { name: "New-York Autumn", originalName: "New-York Autumn", emoji: '🍂', colors: ["#3E2723", "#4E342E", "#8B0000", "#37474F", "#5D4037", "#2F4F4F", "#8B3A3A", "#8B4513", "#A52A2A", "#B22222", "#795548", "#556B2F", "#607D8B", "#808000", "#6B8E23", "#D2691E", "#B8860B", "#CD853F", "#FF7F50", "#C2A14A", "#FF8C00", "#DAA520", "#F4A460"] },
  { name: "Brazilian Summer", originalName: "Brazilian Summer", emoji: '☀️', colors: ["#2962FF", "#F50057", "#FF1493", "#1E90FF", "#FF5722", "#00A86B", "#FF69B4", "#FF7F50", "#00B0FF", "#00C853", "#00BFFF", "#2ECC71", "#00C4FF", "#64DD17", "#00E676", "#40E0D0", "#FFC107", "#1DE9B6", "#FFD700", "#FDD835", "#00FF7F", "#18FFFF", "#FFEB3B"] },
  { name: "Icelandic Winter", originalName: "Icelandic Winter", emoji: '❄️', colors: ["#263238", "#37474F", "#455A64", "#546E7A", "#78909C", "#9E9E9E", "#03A9F4", "#90A4AE", "#29B6F6", "#4FC3F7", "#B0BEC5", "#BDBDBD", "#4DD0E1", "#81D4FA", "#80DEEA", "#CFD8DC", "#B3E5FC", "#A7FFEB", "#ECEFF1", "#E1F5FE", "#E6F7FF", "#F5F5F5", "#FFFFFF"] },
  { name: "Japanese Spring", originalName: "Japanese Spring", emoji: '🌸', colors: ["#B39DDB", "#F48FB1", "#64B5F6", "#81C784", "#90CAF9", "#87CEFA", "#81D4FA", "#A5D6A7", "#D1C4E9", "#FFB7C5", "#F8BBD0", "#80DEEA", "#FFC0CB", "#C1E1C1", "#FFD1DC", "#B3E5FC", "#DCEDC8", "#E6E6FA", "#FFECB3", "#A7FFEB", "#FFF59D", "#FFF9C4", "#FFF8DC"] },
  { name: "Amazon Rainforest", originalName: "Amazon Rainforest", emoji: '🌳', colors: ["#013220", "#0B5345", "#145A32", "#0E6655", "#196F3D", "#117864", "#117A65", "#1D8348", "#1E8449", "#138D75", "#229954", "#239B56", "#16A085", "#27AE60", "#28B463", "#45B39D", "#52BE80", "#2ECC71", "#48C9B0", "#73C6B6", "#58D68D", "#82E0AA", "#A9DFBF"] },
  { name: "Desert Sunrise", originalName: "Desert Sunrise", emoji: '🐪', colors: ["#4B0610", "#5A0C16", "#69121C", "#781822", "#861E28", "#95242E", "#A42A34", "#B33A3A", "#C23640", "#C94752", "#D15864", "#D86976", "#E07A88", "#E78B9A", "#EE9CAC", "#DDA0DD", "#BDB0D0", "#C3B1E1", "#F1A8AB", "#F3B4A9", "#D8BFD8", "#F6BFA8", "#F8CBA6", "#FAD6A5", "#E6E6FA"] },
  { name: "Cherry Blossom", originalName: "Cherry Blossom", emoji: '桜', iconHTML: '<span style="color: #FFB6C1;">桜</span>', colors: ["#69476E", "#86688B", "#8F6AAD", "#A284C2", "#A389A4", "#BC8F8F", "#B59ECB", "#D4A3A3", "#C0A9BD", "#BDB0D0", "#C3B1E1", "#C9B7D4", "#E1B5B5", "#D8BFD8", "#E0BBE4", "#D6CADD", "#FBC4AB", "#EECBCB", "#FFC4D0", "#DCD0E2", "#FFD1DC", "#E6DCE5", "#F4DEDE", "#FFDDE1", "#F8E9E9"] },
  { name: "Deep Sea", originalName: "Deep Sea", emoji: '🌊', colors: ["#000000", "#0B0C10", "#1C1C1C", "#000080", "#252525", "#00008B", "#191970", "#0000CD", "#36454F", "#483D8B", "#2F4F4F", "#0000FF", "#8A2BE2", "#9932CC", "#6A5ACD", "#008080", "#008B8B", "#BA55D3", "#9370DB", "#5F9EA0", "#20B2AA", "#66CDAA", "#40E0D0", "#00FFFF", "#7FFFD4"] },
  { name: "Brown Noise", originalName: "Brown Noise", iconHTML: '<svg viewBox="0 0 24 24" style="width: var(--icon-size); height: var(--icon-size);"><polygon points="7,3 17,3 21,21 3,21" style="fill:#FFD700;" /></svg>', colors: ["#3E2F00", "#523F00", "#665000", "#7A6000", "#8E7000", "#A28000", "#B69000", "#CAA000", "#DEB000", "#F2C000", "#F4C306", "#F6C70C", "#F8CA12", "#FACC18", "#FCD01E", "#FED324", "#FFD52A", "#FFD700", "#FFD730", "#FFD936", "#FFDB3C", "#FFDD42", "#FFDF48", "#FFE14E", "#FFE354"] },
  { name: "Cosmos", originalName: "Cosmos", emoji: '🌌', colors: ["#000000", "#0B0C10", "#00008B", "#1F2833", "#191970", "#263238", "#4B0082", "#37474F", "#483D8B", "#8A2BE2", "#BA55D3", "#9370DB", "#1E90FF", "#FF00FF", "#DA70D6", "#FF69B4", "#00BFFF", "#40E0D0", "#B0E0E6", "#FFFACD", "#F8F8FF", "#E0FFFF", "#FFFFFF"] },
  { name: "Jasmine Dream", originalName: "Jasmine Dream", iconHTML: '<svg viewBox="0 0 24 24" style="width: var(--icon-size); height: var(--icon-size);"><defs><linearGradient id="jasmineGradient" gradientTransform="rotate(90)"><stop offset="5%" stop-color="#AB6BB7" /><stop offset="95%" stop-color="#4B0082" /></linearGradient></defs><g transform="translate(12,12) rotate(18)"><path d="M0,-11 C 5,-6 5,5 0,1 C -5,5 -5,-6 0,-11 Z" transform="rotate(0)" fill="url(#jasmineGradient)"/><path d="M0,-11 C 5,-6 5,5 0,1 C -5,5 -5,-6 0,-11 Z" transform="rotate(72)" fill="url(#jasmineGradient)"/><path d="M0,-11 C 5,-6 5,5 0,1 C -5,5 -5,-6 0,-11 Z" transform="rotate(144)" fill="url(#jasmineGradient)"/><path d="M0,-11 C 5,-6 5,5 0,1 C -5,5 -5,-6 0,-11 Z" transform="rotate(216)" fill="url(#jasmineGradient)"/><path d="M0,-11 C 5,-6 5,5 0,1 C -5,5 -5,-6 0,-11 Z" transform="rotate(288)" fill="url(#jasmineGradient)"/></g><circle cx="12" cy="12" r="2.5" fill="#FFD700"/></svg>', colors: ["#4B0082", "#5A189A", "#682A7A", "#6A1E97", "#7B1E8A", "#743993", "#804090", "#854772", "#8C4888", "#8F588C", "#986089", "#9B5AA3", "#A0636A", "#9E6F80", "#AB6BB7", "#A97585", "#A8769C", "#AE7E82", "#B97F62", "#B885B1", "#B39178", "#B59095", "#C4927E", "#C69A7B", "#D29B5A", "#C59EAA", "#C2AA8E", "#C9AD70", "#DEAE77", "#D2B7A3", "#E1B674", "#D0C187", "#E3BF68", "#E0CF9C", "#E5D680", "#F0E595"] },
  { name: "Breeze", originalName: "Breeze", emoji: '🍃', colors: ["#2E8B57", "#20B2AA", "#3CB371", "#00BFFF", "#48D1CC", "#66CDAA", "#40E0D0", "#D2B48C", "#87CEEB", "#87CEFA", "#ADD8E6", "#98FB98", "#B0E0E6", "#7FFFD4", "#EEDD82", "#AFEEEE", "#F0E68C", "#FFEBCD", "#F5F5DC", "#F0F8FF", "#FFF5EE", "#F8F8FF", "#F0FFF0", "#FFFAF0", "#FFFFFF"] },
  { name: "Sky", originalName: "Sky", emoji: '☁️', colors: ["#303F9F", "#0D47A1", "#304FFE", "#3F51B5", "#01579B", "#1565C0", "#3D5AFE", "#2962FF", "#1976D2", "#0277BD", "#2979FF", "#1E88E5", "#0288D1", "#0091EA", "#039BE5", "#03A9F4", "#00B0FF", "#29B6F6", "#4FC3F7", "#40C4FF", "#81D4FA", "#B3E5FC", "#E1F5FE"] }
];

// ---- Sort all palettes by luminance on startup ----
PALETTES.forEach(palette => {
  palette.colors.sort((a, b) => getLuminance(a) - getLuminance(b));
});

// ---- Game of Life Default Rules ----
export const defaultGameOfLifeRules = {
  survivalMin: 3,
  survivalMax: 5,
  birth: 3,
  liveCellDef: 'notDarkest',
  colorGenetics: 'average'
};