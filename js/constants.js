// js/constants.js

import { getText, translations } from './i18n.js';

// --- Data ---
export const PALETTES = [


{
    originalName: "Golden Midnight Extended", 
    iconHTML: '<svg viewBox="0 0 24 24" style="width: var(--icon-size); height: var(--icon-size);"><path fill="none" stroke="#FFD700" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M10.5 15 C 9.5 15, 9 14, 9 13 C 9 11, 11 10.5, 12.5 10.5 C 15 10.5, 16.5 12.5, 16.5 15 C 16.5 18, 14 19.5, 11.5 19.5 C 8.5 19.5, 6 17.5, 6 14 C 6 10, 8.5 7, 11.5 7 L 11.5 3 C 11.5 1.5, 13.5 1.5, 13.5 3 C 13.5 5.5, 11.5 7.5, 11.5 10 L 11.5 21 C 11.5 22.5, 9.5 23, 8.5 22 C 7.5 21, 8 20, 8 20" /><circle cx="8" cy="20" r="1" fill="#FFD700" /></svg>', 
    colors: [
        "#000000", "#030201", "#050401", "#080602", "#0a0802", "#0d0a02", "#0f0c03", "#120e03",
        "#141105", "#171305", "#1a1506", "#1c1807", "#1f1a08", "#221c09", "#251f09", "#28210a",
        "#2b240b", "#2e260c", "#31290d", "#352c0e", "#382f0f", "#3c3210", "#3f3511", "#433812",
        "#463a13", "#4b3e14", "#4f4115", "#524416", "#554618", "#5a4a19", "#5f4e1b", "#62511c",
        "#65531d", "#6a571f", "#6f5b21", "#725e22", "#766123", "#7c6625", "#826b27", "#856d28",
        "#887029", "#8e752b", "#947a2c", "#987d2e", "#9b8030", "#a58834", "#af9038", "#b9993c",
        "#c4a241", "#ceab46", "#d9b44b", "#e4bd50", "#efc756", "#f7cf5c", "#ffd763", "#ffdb70",
        "#ffde7d", "#ffe189", "#ffe598", "#ffe8a6", "#ffecb3", "#fff2ce", "#fff9e9", "#ffffff"
    ]
},


{
  originalName: "Journey (23)",
  emoji: '🌓',
  colors: ["#000000","#424242","#7B1FA2","#5E35B1","#673AB7","#9C27B0","#C2185B","#E91E63","#FF1744","#C62828","#D32F2F","#3F51B5","#1976D2","#2196F3","#42A5F5","#0097A7","#00BCD4","#4CAF50","#66BB6A","#FF5722","#FFA726","#FFC107","#BDBDBD"]
    },





{
  originalName: "Behind Eyelids 24",
  emoji: '🌑',
  colors: [
    "#000000",     // 0  – שחור מוחלט (רקע בסיסי)
    "#0a000f",     // 1
    "#11001a",     // 2
    "#180024",     // 3
    "#1f0033",     // 4
    "#002233",     // 5   כחול-שחור עמוק
    "#00334d",     // 6
    "#004466",     // 7
    "#005577",     // 8   כחול-טורקיז כהה
    "#1a664d",     // 9   ירוק-כהה עדין
    "#33664d",     // 10
    "#4d664d",     // 11  ירוק-אפור-כהה
    "#66334d",     // 12  מגנטה-סגול כהה
    "#804d66",     // 13
    "#996680",     // 14  ורוד-סגול רך
    "#b28099",     // 15
    "#cc99b2",     // 16  ורוד בהיר-רך יותר
    "#e6b2cc",     // 17
    "#ffcc99",     // 18  כתום-צהוב חלש מאוד
    "#ffddaa",     // 19
    "#ffeedd",     // 20  צהוב-קרם עדין
    "#e6e6ff",     // 21  לבן-כחול-בהיר מאוד
    "#d9e6ff",     // 22
    "#cce6ff"      // 23  כחול-לבן קר-בהיר (נקודות זוהרות)
  ]
},


  { 
        originalName: "New-York Autumn", 
        emoji: '🍂', 
        colors: ["#190F0B", "#4E342E", "#8B0000", "#37474F", "#5D4037", "#2F4F4F", "#8B3A3A", "#8B4513", "#A52A2A", "#B22222", "#795548", "#556B2F", "#607D8B", "#808000", "#6B8E23", "#D2691E", "#B8860B", "#CD853F", "#FF7F50", "#C2A14A", "#FF8C00", "#DAA520", "#F4A460"] 
    },


   { 
        originalName: "Icelandic Winter", 
        emoji: '❄️', 
        colors: ["#263238", "#37474F", "#455A64", "#546E7A", "#78909C", "#9E9E9E", "#03A9F4", "#90A4AE", "#29B6F6", "#4FC3F7", "#B0BEC5", "#BDBDBD", "#4DD0E1", "#81D4FA", "#80DEEA", "#CFD8DC", "#B3E5FC", "#A7FFEB", "#ECEFF1", "#E1F5FE", "#E6F7FF", "#F5F5F5", "#FFFFFF"] 
    },


{
  "originalName": "Argentine Spring",
  "emoji": "🇦🇷",
  "colors": ["#6A0DAD", "#B284BE", "#E6E6FA", "#87CEEB", "#75AADB", "#FFFFFF", "#FFC72C", "#E60000", "#E03C8A", "#FFAA00", "#FF6700", "#C71585", "#7CFC00", "#5A6E44", "#34A853", "#004000", "#9B0000", "#000000", "#C68E65", "#3B2B20", "#0078AE", "#FCD116", "#B26B3B"]
},




  { 
        originalName: "Sky", 
        emoji: '☁️', 
        colors: ["#303F9F", "#0D47A1", "#304FFE", "#3F51B5", "#01579B", "#1565C0", "#3D5AFE", "#2962FF", "#1976D2", "#0277BD", "#2979FF", "#1E88E5", "#0288D1", "#0091EA", "#039BE5", "#03A9F4", "#00B0FF", "#29B6F6", "#4FC3F7", "#40C4FF", "#81D4FA", "#B3E5FC", "#E1F5FE"]
    },

{ 
        originalName: "Cosmos", 
        emoji: '🌌', 
        colors: ["#000000", "#0B0C10", "#00008B", "#1F2833", "#191970", "#263238", "#4B0082", "#37474F", "#483D8B", "#8A2BE2", "#BA55D3", "#9370DB", "#1E90FF", "#FF00FF", "#DA70D6", "#FF69B4", "#00BFFF", "#40E0D0", "#B0E0E6", "#FFFACD", "#F8F8FF", "#E0FFFF", "#FFFFFF"] 
    },



 { 
        originalName: "Deep Sea", 
        emoji: '🌊', 
        colors: ["#000000", "#0B0C10", "#1C1C1C", "#000080", "#252525", "#00008B", "#191970", "#0000CD", "#36454F", "#483D8B", "#2F4F4F", "#0000FF", "#8A2BE2", "#9932CC", "#6A5ACD", "#008080", "#008B8B", "#BA55D3", "#9370DB", "#5F9EA0", "#20B2AA", "#66CDAA", "#40E0D0", "#00FFFF", "#7FFFD4"] 
    },
  


{
        originalName: "Magic Aurora (23)",
        emoji: '🦄',
        colors: ["#10002B", "#240046", "#3C096C", "#5A189A", "#7B2CBF", "#9D4EDD", "#C77DFF", "#E0AAFF", "#F8D7DA", "#FFC8DD", "#FF9EBB", "#FF6392", "#FF0A54", "#F72585", "#B5179E", "#7209B7", "#4CC9F0", "#4895EF", "#4361EE", "#3F37C9", "#3A0CA3", "#480CA8", "#32004F"]
    },




{
        originalName: "Golden Midnight", 
        emoji: '🔱', 
        colors: ["#000000", "#0A0802", "#141105", "#1F1A08", "#2B240B", "#382F0F", "#463A13", "#554618", "#65531D", "#766123", "#887029", "#9B8030", "#AF9038", "#C4A241", "#D9B44B", "#EFC756", "#FFD763", "#FFDE7D", "#FFE598", "#FFECB3", "#FFF2CE", "#FFF9E9", "#FFFFFF"]
    },


{
    originalName: "Magma Flow",
    emoji: '🌋',
    colors: ["#000000", "#1a0505", "#2b0505", "#3d0505", "#5c0808", "#7a0a0a", "#9e0e0e", "#bd1111", "#de1414", "#ff0000", "#ff3300", "#ff4500", "#ff5e00", "#ff7300", "#ff8c00", "#ffa500", "#ffb700", "#ffcc00", "#ffd700", "#ffe100", "#ffff00", "#ffffbf", "#ffffff"]
},









{
        originalName: "Obsidian Soul", 
        emoji: '🌑', 
        colors: ["#050505", "#0D0B14", "#13111C", "#1A1626", "#221C31", "#2B223C", "#352848", "#3F2F55", "#4B3663", "#573E72", "#644682", "#714F92", "#7F58A3", "#8D62B5", "#9C6CC7", "#AB77DA", "#BB82ED", "#CC8EFF", "#D59FFF", "#DEB0FF", "#E7C1FF", "#F0D2FF", "#FFFFFF"]
 

   },




{
  originalName: "Classic Painter",
  emoji: "🎨",
  colors: [
    "#1B1B1B", "#FFFFFF", "#F2E9DC", "#D4C4A8", "#8D6E63",
    "#A52A2A", "#C0392B", "#E74C3C", "#F39C12", "#F1C40F",
    "#F7E06F", "#27AE60", "#2ECC71", "#16A085", "#1ABC9C",
    "#2471A3", "#3498DB", "#5DADE2", "#7F8C8D", "#95A5A6",
    "#8E44AD", "#9B59B6", "#D35400"
  ]
    },


{
  originalName: "Northern Lights",
  emoji: '🌈',
  colors: ["#020617","#030712","#040815","#05091A","#05101F","#061826","#052E3B","#044155","#036672","#059669","#22C55E","#A3E635","#ECFE71","#E5F3FF","#C7D2FE","#A5B4FC","#818CF8","#7C3AED","#6D28D9","#5B21B6","#4C1D95","#312E81","#020617"]
},

{
    originalName: "Coffee House",
    emoji: '☕',
    colors: ["#2b1b17", "#3b2f2f", "#4e3629", "#5d4037", "#6f4e37", "#795548", "#8d6e63", "#a1887f", "#bcaaa4", "#d7ccc8", "#efebe9", "#ffffff", "#d2b48c", "#f5f5dc", "#fff8e7", "#deb887", "#cd853f", "#8b4513", "#a0522d", "#fffdd0", "#f4a460"]
},


    {
        originalName: "Focus",
        emoji: '🧘',
        colors: ["#000000", "#1A0B2E", "#0B172E", "#333333", "#7F7F7F", "#CCCCCC", "#4A0072", "#8E24AA", "#C2185B", "#E91E63", "#EC407A", "#F8BBD0", "#B71C1C", "#D32F2F", "#F4511E", "#FB8C00", "#FFA726", "#FFECB3", "#FBC02D", "#FDD835", "#FFEE58", "#FFF176", "#FFF9C4", "#FFFFFF", "#1B5E20", "#388E3C", "#4CAF50", "#81C784", "#A5D6A7", "#E8F5E9", "#0D47A1", "#1976D2", "#2196F3", "#42A5F5", "#90CAF9", "#E3F2FD", "#004D40", "#00796B", "#009688", "#4DB6AC", "#80CBC4", "#B2DFDB", "#1A237E", "#303F9F", "#3F51B5", "#5C6BC0", "#9FA8DA", "#C5CAE9"]
    },


{
        originalName: "Monochrome",
        emoji: '☯️',
        colors: ["#FFFFFF", "#F9F9F9", "#F3F3F3", "#EDEDED", "#E7E7E7", "#E1E1E1", "#DBDBDB", "#D5D5D5", "#CFCFCF", "#C9C9C9", "#C3C3C3", "#BDBDBD", "#B7B7B7", "#B1B1B1", "#ABABAB", "#A5A5A5", "#9F9F9F", "#999999", "#939393", "#8D8D8D", "#878787", "#818181", "#7B7B7B", "#757575", "#6F6F6F", "#696969", "#636363", "#5D5D5D", "#575757", "#515151", "#4B4B4B", "#454545", "#3F3F3F", "#393939", "#333333", "#2D2D2D", "#272727", "#212121", "#1B1B1B", "#151515", "#0F0F0F", "#0C0C0C", "#090909", "#060606", "#040404", "#020202", "#000000"]
    },


{
        originalName: "Serene Sky",
        emoji: '🕊️',
        colors: ["#FDFEFF", "#F8FAFB", "#F2F6F7", "#ECF2F5", "#E6EEF3", "#E0EAF1", "#DAE6EF", "#D4E2ED", "#CEDDEA", "#C8D9E8", "#C2D5E6", "#BCD1E4", "#B6CCE2", "#B0C8E0", "#AAC4DE", "#A4C0DC", "#9EBBD9", "#98B7D7", "#92B3D5", "#8CAFD3", "#86AAD1", "#80A6CF", "#7AA2CD", "#749ECB", "#6E99C8", "#6895C6", "#6291C4", "#5C8DC2", "#5688C0", "#5084BE", "#4A80BC", "#447CBA", "#3E77B7", "#3873B5", "#3270B0", "#2D6CAB", "#2868A6", "#2363A1", "#1E5F9C", "#195B97", "#145792", "#0F528D", "#0A4E88", "#054983", "#00457E", "#003F73"]
    },

{
        originalName: "Elemental Gems",
        emoji: '💎',
        colors: ["#0F0F0F", "#1C1C1C", "#2A2A2A", "#383838", "#464646", "#545454", "#626262", "#707070", "#7E7E7E", "#8C8C8C", "#9A9A9A", "#A8A8A8", "#B6B6B6", "#C4C4C4", "#D2D2D2", "#E0E0E0", "#EEEDED", "#F9F9F9", "#FFFDFB", "#B08D57", "#C29D69", "#D4AF7A", "#E6C18B", "#F8D39C", "#4F7942", "#3A6351", "#2F5233", "#5E8C61", "#7BAE7F", "#99D6A6", "#135E82", "#1C7A9B", "#2799B9", "#3AB3D0", "#56CFE1", "#72EFDD", "#5A3E85", "#6C4F96", "#7E60A7", "#9273B8", "#A687C9", "#BA9BDA", "#D0B0EB", "#E6C6FC", "#F0DBFF", "#FBF2FF"]
    },



{
        originalName: "Electric Dreams", 
        emoji: '⚡', 
        colors: ["#000000", "#000306", "#00060C", "#000911", "#000C17", "#000F1D", "#001429", "#001D3A", "#00264C", "#002F5D", "#00376F", "#004080", "#004C97", "#0057AE", "#0063C5", "#006FDC", "#007AF3", "#008CFF", "#00A3FF", "#00BAFF", "#00D1FF", "#00E8FF", "#00FFFF"]
    },

    {
        originalName: "Lilac Noir", 
        emoji: '🌒', 
        colors: ["#000000", "#0A0A0A", "#141414", "#1E1E1E", "#282828", "#323232", "#3D3D3D", "#474747", "#514E53", "#5C5360", "#67596D", "#725E7A", "#7E6387", "#896994", "#946EA1", "#A075AB", "#AD7FAF", "#BB88B3", "#C891B6", "#D69BBA", "#E4A4BE", "#F1AEC1", "#FFB7C5"]
    },




{
    originalName: "Sin City",
    emoji: '💋',
    colors: ["#000000", "#1a1a1a", "#333333", "#4d4d4d", "#666666", "#808080", "#999999", "#b3b3b3", "#cccccc", "#e6e6e6", "#ffffff", "#ff0000", "#d30000", "#a80000", "#7a0000", "#2b2b2b", "#f0f0f0", "#ff3333", "#0a0a0a", "#550000", "#111111"]
},



  { 
        originalName: "Desert Sunrise", 
        emoji: '🐪', 
        colors: ["#4B0610", "#5A0C16", "#69121C", "#781822", "#861E28", "#95242E", "#A42A34", "#B33A3A", "#C23640", "#C94752", "#D15864", "#D86976", "#E07A88", "#E78B9A", "#EE9CAC", "#DDA0DD", "#BDB0D0", "#C3B1E1", "#F1A8AB", "#F3B4A9", "#D8BFD8", "#F6BFA8", "#F8CBA6", "#FAD6A5", "#E6E6FA"] 
    },
   



    { 
        originalName: "Cherry Blossom", 
        emoji: '桜', 
        iconHTML: '<span style="color: #FFB6C1;">桜</span>', 
        colors: ["#69476E", "#86688B", "#8F6AAD", "#A284C2", "#A389A4", "#BC8F8F", "#B59ECB", "#D4A3A3", "#C0A9BD", "#BDB0D0", "#C3B1E1", "#C9B7D4", "#E1B5B5", "#D8BFD8", "#E0BBE4", "#D6CADD", "#FBC4AB", "#EECBCB", "#FFC4D0", "#DCD0E2", "#FFD1DC", "#E6Dce5", "#F4DEDE", "#FFDDE1", "#F8E9E9"] 
    },
   
    
    { 
        originalName: "Brown Noise", 
        iconHTML: '<svg viewBox="0 0 24 24" style="width: var(--icon-size); height: var(--icon-size);"><polygon points="7,3 17,3 21,21 3,21" style="fill:#FFD700;" /></svg>', 
        colors: ["#3E2F00", "#523F00", "#665000", "#7A6000", "#8E7000", "#A28000", "#B69000", "#CAA000", "#DEB000", "#F2C000", "#F4C306", "#F6C70C", "#F8CA12", "#FACC18", "#FCD01E", "#FED324", "#FFD52A", "#FFD700", "#FFD730", "#FFD936", "#FFDB3C", "#FFDD42", "#FFDF48", "#FFE14E", "#FFE354"] 
    },
    

 { 
        originalName: "Jasmine Dream", 
        iconHTML: '<svg viewBox="0 0 24 24" style="width: var(--icon-size); height: var(--icon-size);"><defs><linearGradient id="jasmineGradient" gradientTransform="rotate(90)"><stop offset="5%" stop-color="#AB6BB7" /><stop offset="95%" stop-color="#4B0082" /></linearGradient></defs><g transform="translate(12,12) rotate(18)"><path d="M0,-11 C 5,-6 5,5 0,1 C -5,5 -5,-6 0,-11 Z" transform="rotate(0)" fill="url(#jasmineGradient)"/><path d="M0,-11 C 5,-6 5,5 0,1 C -5,5 -5,-6 0,-11 Z" transform="rotate(72)" fill="url(#jasmineGradient)"/><path d="M0,-11 C 5,-6 5,5 0,1 C -5,5 -5,-6 0,-11 Z" transform="rotate(144)" fill="url(#jasmineGradient)"/><path d="M0,-11 C 5,-6 5,5 0,1 C -5,5 -5,-6 0,-11 Z" transform="rotate(216)" fill="url(#jasmineGradient)"/><path d="M0,-11 C 5,-6 5,5 0,1 C -5,5 -5,-6 0,-11 Z" transform="rotate(288)" fill="url(#jasmineGradient)"/></g><circle cx="12" cy="12" r="2.5" fill="#FFD700"/></svg>', 
        colors: ["#4B0082", "#5A189A", "#682A7A", "#6A1E97", "#7B1E8A", "#743993", "#804090", "#854772", "#8C4888", "#8F588C", "#986089", "#9B5AA3", "#A0636A", "#9E6F80", "#AB6BB7", "#A97585", "#A8769C", "#AE7E82", "#B97F62", "#B885B1", "#B39178", "#B59095", "#C4927E", "#C69A7B", "#D29B5A", "#C59EAA", "#C2AA8E", "#C9AD70", "#DEAE77", "#D2B7A3", "#E1B674", "#D0C187", "#E3BF68", "#E0CF9C", "#E5D680", "#F0E595"] 
    },



    { 
        originalName: "Japanese Spring", 
        emoji: '🌸', 
        colors: ["#4A148C", "#B39DDB", "#F48FB1", "#64B5F6", "#81C784", "#90CAF9", "#87CEFA", "#81D4FA", "#A5D6A7", "#D1C4E9", "#FFB7C5", "#F8BBD0", "#80DEEA", "#FFC0CB", "#C1E1C1", "#FFD1DC", "#B3E5FC", "#DCEDC8", "#E6E6FA", "#FFECB3", "#A7FFEB", "#FFF59D", "#FFF9C4", "#FFF8DC"] 
    },
  

  { 
        originalName: "Brazilian Summer", 
        emoji: '☀️', 
        colors: ["#000050","#2962FF", "#F50057", "#FF1493", "#1E90FF", "#FF5722", "#00A86B", "#FF69B4", "#FF7F50", "#00B0FF", "#00C853", "#00BFFF", "#2ECC71", "#00C4FF", "#64DD17", "#00E676", "#40E0D0", "#FFC107", "#1DE9B6", "#FFD700", "#FDD835", "#00FF7F", "#18FFFF", "#FFEB3B"] 
   },
  
 
    { 
        originalName: "Amazon Rainforest", 
        emoji: '🌳', 
        colors: ["#013220", "#0B5345", "#145A32", "#0E6655", "#196F3D", "#117864", "#117A65", "#1D8348", "#1E8449", "#138D75", "#229954", "#239B56", "#16A085", "#27AE60", "#28B463", "#45B39D", "#52BE80", "#2ECC71", "#48C9B0", "#73C6B6", "#58D68D", "#82E0AA", "#A9DFBF"] 
    },
 

{
    originalName: "Amethyst Dream",
    emoji: '🔮',
    colors: ["#1a0b1e", "#220e29", "#2b1235", "#331541", "#3b184d", "#441b59", "#4c1e65", "#552171", "#5d247d", "#662789", "#6e2a95", "#772da1", "#7f30ad", "#813ec3", "#8b4ec8", "#955dcd", "#9f6dd2", "#a97cd7", "#b38cdc", "#bd9be1", "#c7aae6", "#d1baeb", "#dbc9f0", "#e5d8f5", "#efe8fa", "#f9f7ff", "#f5eeff", "#f0e2ff", "#ebd6ff", "#e6caff", "#e2bdff", "#deafff", "#d9a2ff", "#d494ff", "#cf85ff", "#ca76ff", "#c568ff", "#c059ff", "#bb4aff", "#b243f5", "#aa40e9", "#a13cdd", "#9939d1", "#9036c5", "#8833b9", "#772ebf"]
},



{
  originalName: "Night Rainbow",
  emoji: '🌌',
  colors: (function() {
    // הגדרת "תחנות" הצבע: מחושך, לשיא (שפיץ), וחוזר חלילה.
    const stops = [
      { pos: 0,   r: 0,   g: 0,   b: 0 },     // שחור מוחלט
      { pos: 15,  r: 15,  g: 0,   b: 30 },    // סגול עמוק (בסיס)
      { pos: 32,  r: 140, g: 40,  b: 220 },   // שפיץ 1: סגול בוהק
      { pos: 50,  r: 0,   g: 15,  b: 40 },    // כחול לילה
      { pos: 68,  r: 0,   g: 180, b: 255 },   // שפיץ 2: תכלת זוהר
      { pos: 85,  r: 0,   g: 25,  b: 15 },    // ירוק יער אפל
      { pos: 104, r: 16,  g: 150, b: 100 },   // שפיץ 3: ירוק יער בקבוקי רך
      { pos: 122, r: 25,  g: 20,  b: 0 },     // זית עמוק
      { pos: 140, r: 255, g: 200, b: 0 },     // שפיץ 4: זהב בוהק
      { pos: 158, r: 35,  g: 5,   b: 10 },    // בורדו אפל
      { pos: 176, r: 235, g: 90,  b: 90 },    // שפיץ 5: אדום רך ונעים (Pastel/Coral)
      { pos: 194, r: 25,  g: 0,   b: 20 },    // שזיף עמוק
      { pos: 214, r: 255, g: 50,  b: 150 },   // שפיץ 6: ורוד מגנטה
      { pos: 236, r: 15,  g: 0,   b: 10 },    // דעיכה חזרה
      { pos: 255, r: 0,   g: 0,   b: 0 }      // שחור מוחלט
    ];
    
    const out = [];
    for (let i = 0; i < 256; i++) {
        let s = 0;
        // מציאת המקטע הנוכחי
        while (s < stops.length - 2 && i >= stops[s+1].pos) { s++; }
        
        const start = stops[s];
        const end = stops[s+1];
        const segmentLen = end.pos - start.pos;
        const progress = segmentLen === 0 ? 0 : (i - start.pos) / segmentLen;
        
        // שימוש בפונקציית החלקה (Smoothstep) למעברים אורגניים וטבעיים
        const ease = progress * progress * (3 - 2 * progress); 
        
        const r = Math.round(start.r + (end.r - start.r) * ease);
        const g = Math.round(start.g + (end.g - start.g) * ease);
        const b = Math.round(start.b + (end.b - start.b) * ease);
        
        out.push('#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join(''));
    }
    return out;
  })()
},



{
  originalName: "Earth & Spirit",
  emoji: '🌿',
  colors: [
    "#05020a", "#06030b", "#06030c", "#07040e", "#07040f", "#080510", "#080511", "#090612", 
    "#090613", "#0a0715", "#0a0716", "#0b0817", "#0c0818", "#0c0919", "#0d091b", "#0d0a1c", 
    "#0e0a1d", "#0e0b1e", "#0f0b1f", "#0f0c21", "#100c22", "#100d23", "#110d24", "#120e27", 
    "#121029", "#13112b", "#13132e", "#141430", "#141533", "#151735", "#151838", "#16193a", 
    "#161b3c", "#171c3f", "#171e41", "#181f44", "#182046", "#192248", "#19234b", "#1a244d", 
    "#1a2650", "#1b2752", "#1b2855", "#1c2a57", "#1c2b59", "#1d2e5a", "#1d305c", "#1d325d", 
    "#1e345e", "#1e375f", "#1f3960", "#1f3b62", "#203d63", "#203f64", "#214265", "#214466", 
    "#224667", "#224869", "#224b6a", "#234d6b", "#234f6c", "#24516d", "#24546f", "#255670", 
    "#255871", "#265a72", "#265c73", "#265d71", "#275d6f", "#275d6d", "#285e6b", "#285e69", 
    "#285f67", "#295f65", "#296063", "#296061", "#2a615f", "#2a615d", "#2a625c", "#2b625a", 
    "#2b6358", "#2c6356", "#2c6354", "#2c6452", "#2d6450", "#2d654e", "#2d654c", "#2e664a", 
    "#2f6649", "#316748", "#336747", "#356846", "#376845", "#386844", "#3a6944", "#3c6943", 
    "#3e6a42", "#406a41", "#426b40", "#446b3f", "#466c3e", "#486c3d", "#4a6d3d", "#4c6d3c", 
    "#4e6d3b", "#506e3a", "#526e39", "#546f38", "#566f37", "#587037", "#5a7136", "#5e7236", 
    "#617437", "#657537", "#687737", "#6b7937", "#6f7a37", "#727c38", "#757d38", "#797f38", 
    "#7c8138", "#808239", "#838439", "#868539", "#8a8739", "#8d893a", "#908a3a", "#948c3a", 
    "#978d3a", "#9b8f3a", "#9e913b", "#a1923b", "#a4933b", "#a6943b", "#a8953b", "#aa963b", 
    "#ac973b", "#af983b", "#b1983b", "#b3993b", "#b59a3b", "#b79b3b", "#b99c3b", "#bb9c3a", 
    "#bd9d3a", "#bf9e3a", "#c19f3a", "#c4a03a", "#c6a13a", "#c8a13a", "#caa23a", "#cca33a", 
    "#cea43a", "#d0a53a", "#d1a43a", "#d0a139", "#d09f38", "#d09d37", "#cf9b36", "#cf9835", 
    "#cf9635", "#ce9434", "#ce9133", "#ce8f32", "#cd8d31", "#cd8b30", "#cc8830", "#cc862f", 
    "#cc842e", "#cb812d", "#cb7f2c", "#cb7d2c", "#ca7b2b", "#ca782a", "#c97629", "#c97428", 
    "#c87228", "#c66f28", "#c56d28", "#c36b28", "#c26928", "#c06628", "#be6428", "#bd6228", 
    "#bb6028", "#ba5d28", "#b85b28", "#b65928", "#b55728", "#b35428", "#b25228", "#b05028", 
    "#ae4e28", "#ad4c28", "#ab4928", "#aa4728", "#a84528", "#a64328", "#a44128", "#a03f28", 
    "#9d3d27", "#9a3c27", "#963a27", "#933927", "#903727", "#8d3527", "#893426", "#863226", 
    "#833026", "#7f2f26", "#7c2d26", "#792b25", "#762a25", "#722825", "#6f2625", "#6c2525", 
    "#682325", "#652224", "#622024", "#5f1e24", "#5c1d23", "#591c23", "#571c22", "#541b22", 
    "#521a21", "#4f1920", "#4d1820", "#4a171f", "#47161e", "#45151e", "#42151d", "#40141c", 
    "#3d131c", "#3b121b", "#38111b", "#36101a", "#330f19", "#300f19", "#2e0e18", "#2b0d17", 
    "#290c17", "#260b16", "#250b15", "#230a15", "#220a14", "#200914", "#1f0913", "#1d0913", 
    "#1c0812", "#1a0812", "#190711", "#170711", "#160710", "#14060f", "#13060f", "#11050e", 
    "#10050e", "#0e040d", "#0d040d", "#0b040c", "#0a030c", "#08030b", "#07020b", "#05020a"
  ]
},

{
  originalName: "Optimism & Air",
  emoji: '🌅',
  colors: [
    "#2a1b4d", "#2c1c4e", "#2e1d50", "#301e51", "#331f52", "#352054", "#372155", "#392257", 
    "#3b2358", "#3d2459", "#3f255b", "#42275c", "#44285d", "#46295f", "#482a60", "#4a2b62", 
    "#4c2c63", "#4e2d64", "#512e66", "#532f67", "#553068", "#57316a", "#59326b", "#5c346c", 
    "#5f356d", "#61376e", "#64386f", "#67396f", "#693b70", "#6c3c71", "#6f3e72", "#713f73", 
    "#744174", "#774275", "#7a4475", "#7c4576", "#7f4777", "#824878", "#844979", "#874b7a", 
    "#8a4c7b", "#8c4e7c", "#8f4f7c", "#92517d", "#95527e", "#98557e", "#9b577f", "#9e597f", 
    "#a15c7f", "#a45e80", "#a76080", "#aa6380", "#ad6581", "#b06781", "#b36a81", "#b66c82", 
    "#b96e82", "#bc7182", "#bf7383", "#c27583", "#c57883", "#c87a83", "#cb7c84", "#ce7f84", 
    "#d18184", "#d48385", "#d68585", "#d88783", "#d98981", "#da8b80", "#db8d7e", "#dd8f7c", 
    "#de907b", "#df9279", "#e19477", "#e29676", "#e39874", "#e49a73", "#e69b71", "#e79d6f", 
    "#e89f6e", "#e9a16c", "#eba36a", "#eca469", "#eda667", "#efa865", "#f0aa64", "#f1ac62", 
    "#f2ae61", "#f3b062", "#f3b262", "#f4b463", "#f5b663", "#f5b863", "#f6ba64", "#f6bc64", 
    "#f7be65", "#f8c065", "#f8c266", "#f9c466", "#f9c667", "#fac867", "#fbca68", "#fbcc68", 
    "#fccf68", "#fcd169", "#fdd369", "#fdd56a", "#fed76a", "#ffd96b", "#ffda6d", "#ffdc70", 
    "#ffdd74", "#ffde78", "#ffdf7c", "#ffe07f", "#ffe183", "#ffe287", "#ffe48a", "#ffe58e", 
    "#ffe692", "#ffe796", "#ffe899", "#ffe99d", "#ffeaa1", "#ffeca5", "#ffeda8", "#ffeeac", 
    "#ffefb0", "#fff0b4", "#fff1b7", "#fff2bb", "#fff3bf", "#fff4c2", "#fff4c5", "#fff5c8", 
    "#fff5cb", "#fff6ce", "#fff7d1", "#fff7d4", "#fff8d7", "#fff8da", "#fff9dd", "#fff9e0", 
    "#fffae3", "#fffae6", "#fffbe9", "#fffbec", "#fffcef", "#fffdf2", "#fffdf5", "#fffef8", 
    "#fffefb", "#fffffe", "#feffff", "#fdfeff", "#fcfefe", "#fbfdfe", "#fafdfe", "#f9fcfe", 
    "#f7fcfd", "#f6fbfd", "#f5fbfd", "#f4fafd", "#f3fafd", "#f2f9fc", "#f1f9fc", "#f0f8fc", 
    "#eef8fc", "#edf7fb", "#ecf7fb", "#ebf6fb", "#eaf6fb", "#e9f5fb", "#e8f5fa", "#e6f4fa", 
    "#e4f3fa", "#e1f2f9", "#dff1f9", "#dcf0f8", "#d9eff8", "#d6eef7", "#d4edf7", "#d1ecf7", 
    "#ceebf6", "#cceaf6", "#c9e9f5", "#c6e8f5", "#c3e7f4", "#c1e6f4", "#bee5f3", "#bbe4f3", 
    "#b8e3f2", "#b6e1f2", "#b3e0f1", "#b0dff1", "#addef1", "#abddf0", "#a8dcf0", "#a4daef", 
    "#a1d8ef", "#9ed6ee", "#9ad4ee", "#97d3ed", "#94d1ed", "#91cfec", "#8dcdec", "#8acbeb", 
    "#87c9eb", "#83c8ea", "#80c6ea", "#7dc4e9", "#7ac2e9", "#76c0e8", "#73bee8", "#70bde7", 
    "#6cbbe7", "#69b9e6", "#66b7e6", "#63b5e5", "#60b3e4", "#5eb1e2", "#5caee1", "#5aacdf", 
    "#58aade", "#56a7dc", "#54a5db", "#52a2d9", "#4fa0d8", "#4d9ed6", "#4b9bd5", "#4999d3", 
    "#4797d2", "#4594d0", "#4392cf", "#418fcd", "#3f8dcc", "#3d8bca", "#3a88c9", "#3886c7", 
    "#3684c6", "#3481c4", "#337fc1", "#327cbe", "#317abb", "#3077b8", "#2e75b5", "#2d72b2", 
    "#2c70af", "#2b6dac", "#2a6ba9", "#2969a6", "#2866a3", "#2664a0", "#25619d", "#245f9a", 
    "#235c97", "#225a94", "#215791", "#20558e", "#1e528b", "#1d5088", "#1c4d85", "#1b4b82"
  ]
},

  



].map(p => ({ ...p, name: getText(Object.keys(translations).find(k => translations[k]?.en === p.originalName) || '') || p.originalName }));


// --- App Settings & Magic Numbers ---
export const GOLD = '#FFD700';
export const ONBOARDING_STORAGE_KEY = 'colorGridOnboardingComplete';
export const HISTORY_LIMIT = 20;
export const COLORS_PER_PAGE = 24;
export const LONG_PRESS_SHOW_MS = 600;

// --- Grid Configuration ---
export const SYMMETRY_MODES = ['off', 'vertical', 'horizontal', 'mandala', 'kaleidoscope'];
export const SEPARATORS = [6, 5, 3, 2, 0];
export const SIZES = [299, 249, 199, 149, 101, 75, 65, 55, 49, 35, 27, 21, 15, 11, 9, 7, 5, 3];

// --- Default Simulation Rules ---
export const defaultGameOfLifeRules = {
    survival: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    birth: [1, 2, 3, 4, 5, 6, 7, 8]
};


export const defaultGravitationalSortRules = {
    direction: 'up',
    strength: 0.6
};


// --- START: Added for Spiral Settings ---
export const defaultSpiralRules = {
    method: 'b'
};


// --- START: Magnet Settings ---
export const defaultMagnetRules = {
    method: 'magnet'
};
// --- END: Magnet Settings ---


export const defaultErosionRules = {
    erosionStrength: 0.1
};

export const defaultDlaRules = {
    colorGenetics: true,
    injectFromEdges: false,
    fastMode: false // הוספנו את השורה הזו
};

// --- START: Added for Contour Settings ---
export const defaultContourRules = {
    sensitivity: 75,
    lineColor: 'darkest'
};
// --- END: Added for Contour Settings ---


// --- START: Added for Chi Flow (Sandpile) Settings ---
export const defaultChiFlowRules = {
    awakening: [3, 4, 5, 6, 7, 8], // מקביל ל: neighborsWithEnergy >= 3
    flow: [2, 3],                  // מקביל ל: pullingNeighborsCount === 2 || 3
    reach: 0                       // ערך התחלתי לסליידר המגנטיות (טווח 1-10)
};
// --- END: Added for Chi Flow (Sandpile) Settings ---

// --- START: Added for Turing Patterns Settings ---
export const defaultTuringRules = {
    feed: 0.034, // הערך המדויק של פריסט Chaos (כאוס)
    kill: 0.056, 
    dA: 1.0,     
    dB: 0.5,     
    timeStep: 1.0
};
// --- END: Added for Turing Patterns Settings ---

