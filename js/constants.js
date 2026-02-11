// js/constants.js

import { getText, translations } from './i18n.js';

// --- Data ---
export const PALETTES = [


{
  originalName: "Journey (23)",
  emoji: '🌓',
  colors: ["#000000","#424242","#7B1FA2","#5E35B1","#673AB7","#9C27B0","#C2185B","#E91E63","#FF1744","#C62828","#D32F2F","#3F51B5","#1976D2","#2196F3","#42A5F5","#0097A7","#00BCD4","#4CAF50","#66BB6A","#FF5722","#FFA726","#FFC107","#BDBDBD"]
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
        colors: ["#050505", "#0D0B14", "#13111C", "#1A1626", "#221C31", "#2B223C", "#352848", "#3F2F55", "#4B3663", "#573E72", "#644682", "#714F92", "#7F58A3", "#8D62B5", "#9C6CC7", "#AB77DA", "#BB82ED", "#CC8EFF", "#D59FFF", "#DEB0FF", "#E7C1FF", "#F0D2FF", "#F9E3FF"]
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
        originalName: "Emerald Grove",
        emoji: '🌿',
        colors: ["#E8FFF5", "#E1FDF0", "#DAFBEB", "#D3F9E6", "#CCF7E1", "#C5F5DC", "#BEF3D7", "#B7F1D2", "#B0EFCD", "#A9EDC8", "#A2EBC3", "#9BE9BE", "#94E7B9", "#8DE5B4", "#86E3AF", "#7FE1AA", "#78DFA5", "#71DDA0", "#6AD89A", "#63D394", "#5CCE8E", "#55C988", "#4EC482", "#47BF7C", "#40BA76", "#39B570", "#32B06A", "#2BAA64", "#24A55E", "#1DA058", "#169B52", "#10964C", "#0A9146", "#088C42", "#07873E", "#06823A", "#057D36", "#047832", "#03732E", "#026E2A", "#016926", "#016422", "#015F1E", "#015A1A", "#015516", "#015012", "#014B0E", "#01460A", "#014206", "#013E04", "#013A03", "#013703", "#013403", "#013103", "#012E03", "#012B03", "#012803", "#012503", "#012203", "#011F03", "#011C03", "#011A03", "#011803", "#00180E"]
    }



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
    birth: [3]
};

export const defaultGravitationalSortRules = {
    direction: 'up',
    strength: 0.6
};

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