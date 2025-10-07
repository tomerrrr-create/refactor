// js/constants.js

import { getText, translations } from './i18n.js';

// --- Data ---
export const PALETTES = [
    // --- Group 1: The Foundations ---


    {
        originalName: "Journey",
        emoji: '🌓',
        colors: ["#000000", "#424242", "#7B1FA2", "#5E35B1", "#3949AB", "#673AB7", "#8E24AA", "#AD1457", "#3F51B5", "#B71C1C", "#9C27B0", "#C2185B", "#C62828", "#2E7D32", "#D32F2F", "#D81B60", "#AB47BC", "#757575", "#1976D2", "#E91E63", "#E53935", "#FF1744", "#EC407A", "#F44336", "#1E88E5", "#0097A7", "#EF5350", "#F4511E", "#FF4081", "#43A047", "#FF5252", "#FF5722", "#2196F3", "#F06292", "#4CAF50", "#FF7043", "#F57C00", "#9E9E9E", "#42A5F5", "#FB8C00", "#66BB6A", "#FF8C00", "#00BCD4", "#AFB42B", "#F48FB1", "#FF9800", "#8BC34A", "#26C6DA", "#FFA726", "#BDBDBD", "#9CCC65", "#FBC02D", "#CDDC39", "#FFE082", "#FFEE58"]
    },


    {
        originalName: "Focus",
        emoji: '🧘',
        colors: ["#000000", "#1A0B2E", "#0B172E", "#333333", "#7F7F7F", "#CCCCCC", "#4A0072", "#8E24AA", "#C2185B", "#E91E63", "#EC407A", "#F8BBD0", "#B71C1C", "#D32F2F", "#F4511E", "#FB8C00", "#FFA726", "#FFECB3", "#FBC02D", "#FDD835", "#FFEE58", "#FFF176", "#FFF9C4", "#FFFFFF", "#1B5E20", "#388E3C", "#4CAF50", "#81C784", "#A5D6A7", "#E8F5E9", "#0D47A1", "#1976D2", "#2196F3", "#42A5F5", "#90CAF9", "#E3F2FD", "#004D40", "#00796B", "#009688", "#4DB6AC", "#80CBC4", "#B2DFDB", "#1A237E", "#303F9F", "#3F51B5", "#5C6BC0", "#9FA8DA", "#C5CAE9"]
    },
    // --- Group 2: The Four Seasons ---
    { 
        originalName: "Japanese Spring", 
        emoji: '🌸', 
        colors: ["#B39DDB", "#F48FB1", "#64B5F6", "#81C784", "#90CAF9", "#87CEFA", "#81D4FA", "#A5D6A7", "#D1C4E9", "#FFB7C5", "#F8BBD0", "#80DEEA", "#FFC0CB", "#C1E1C1", "#FFD1DC", "#B3E5FC", "#DCEDC8", "#E6E6FA", "#FFECB3", "#A7FFEB", "#FFF59D", "#FFF9C4", "#FFF8DC"] 
    },
    { 
        originalName: "Brazilian Summer", 
        emoji: '☀️', 
        colors: ["#2962FF", "#F50057", "#FF1493", "#1E90FF", "#FF5722", "#00A86B", "#FF69B4", "#FF7F50", "#00B0FF", "#00C853", "#00BFFF", "#2ECC71", "#00C4FF", "#64DD17", "#00E676", "#40E0D0", "#FFC107", "#1DE9B6", "#FFD700", "#FDD835", "#00FF7F", "#18FFFF", "#FFEB3B"] 
    },
    { 
        originalName: "New-York Autumn", 
        emoji: '🍂', 
        colors: ["#3E2723", "#4E342E", "#8B0000", "#37474F", "#5D4037", "#2F4F4F", "#8B3A3A", "#8B4513", "#A52A2A", "#B22222", "#795548", "#556B2F", "#607D8B", "#808000", "#6B8E23", "#D2691E", "#B8860B", "#CD853F", "#FF7F50", "#C2A14A", "#FF8C00", "#DAA520", "#F4A460"] 
    },
    { 
        originalName: "Icelandic Winter", 
        emoji: '❄️', 
        colors: ["#263238", "#37474F", "#455A64", "#546E7A", "#78909C", "#9E9E9E", "#03A9F4", "#90A4AE", "#29B6F6", "#4FC3F7", "#B0BEC5", "#BDBDBD", "#4DD0E1", "#81D4FA", "#80DEEA", "#CFD8DC", "#B3E5FC", "#A7FFEB", "#ECEFF1", "#E1F5FE", "#E6F7FF", "#F5F5F5", "#FFFFFF"] 
    },
    // --- Group 3: Scenes from Nature ---
    { 
        originalName: "Amazon Rainforest", 
        emoji: '🌳', 
        colors: ["#013220", "#0B5345", "#145A32", "#0E6655", "#196F3D", "#117864", "#117A65", "#1D8348", "#1E8449", "#138D75", "#229954", "#239B56", "#16A085", "#27AE60", "#28B463", "#45B39D", "#52BE80", "#2ECC71", "#48C9B0", "#73C6B6", "#58D68D", "#82E0AA", "#A9DFBF"] 
    },
    { 
        originalName: "Desert Sunrise", 
        emoji: '🐪', 
        colors: ["#4B0610", "#5A0C16", "#69121C", "#781822", "#861E28", "#95242E", "#A42A34", "#B33A3A", "#C23640", "#C94752", "#D15864", "#D86976", "#E07A88", "#E78B9A", "#EE9CAC", "#DDA0DD", "#BDB0D0", "#C3B1E1", "#F1A8AB", "#F3B4A9", "#D8BFD8", "#F6BFA8", "#F8CBA6", "#FAD6A5", "#E6E6FA"] 
    },
    { 
        originalName: "Deep Sea", 
        emoji: '🌊', 
        colors: ["#000000", "#0B0C10", "#1C1C1C", "#000080", "#252525", "#00008B", "#191970", "#0000CD", "#36454F", "#483D8B", "#2F4F4F", "#0000FF", "#8A2BE2", "#9932CC", "#6A5ACD", "#008080", "#008B8B", "#BA55D3", "#9370DB", "#5F9EA0", "#20B2AA", "#66CDAA", "#40E0D0", "#00FFFF", "#7FFFD4"] 
    },
    { 
        originalName: "Sky", 
        emoji: '☁️', 
        colors: ["#303F9F", "#0D47A1", "#304FFE", "#3F51B5", "#01579B", "#1565C0", "#3D5AFE", "#2962FF", "#1976D2", "#0277BD", "#2979FF", "#1E88E5", "#0288D1", "#0091EA", "#039BE5", "#03A9F4", "#00B0FF", "#29B6F6", "#4FC3F7", "#40C4FF", "#81D4FA", "#B3E5FC", "#E1F5FE"]
    },


{
    originalName: "Sky–Magenta–Mint (Refined)",
    emoji: '🌈',
    colors: [
        "#B8DCEC", "#A6D3E7", "#94CAE2", "#82C1DD", "#70B8D8", "#5EAED3", "#4CA5CE", "#3A9CC9",
        "#3490C0", "#3184B7", "#2F78AE", "#2C6CA5", "#29609C", "#275493", "#24488A", "#223C81",
        "#3A3C8C", "#513C97", "#683CA2", "#7F3CAD", "#963CB8", "#AD3CC3", "#C33CCE", "#CA46C4",
        "#D250BA", "#D95AB0", "#E064A6", "#E76E9C", "#EE7892", "#F58288", "#F98B7D", "#FD9472",
        "#FB946E", "#F9946A", "#F79466", "#F59462", "#EFA06B", "#E8AC74", "#E1B87D", "#DAC486",
        "#CFC98F", "#C4CE98", "#B9D3A1", "#AED8AA", "#A3DDB3", "#98E2BC", "#8DE7C5", "#82ECCE",
        "#78E9C9", "#6EE6C4", "#64E3BF", "#5AD0B5", "#50BDAA", "#46AAA0", "#3C9795", "#32848B",
        "#297180", "#1F5E75", "#174E69", "#104E5C", "#0B4D4F", "#094C42", "#084A35", "#084828"
    ]
},


{ 
        originalName: "Tel Aviv Sunset",
        emoji: '🌇',
        colors: ["#0d3b66", "#1c294a", "#2b213b", "#481b5e", "#6a0d83", "#892d8a", "#ad3f8f", "#ce4993", "#e05481", "#ee5d6c", "#f57667", "#fb9062", "#fc9d54", "#ffac4a", "#ff8c42", "#f99e52", "#f4ae58", "#eeaf61", "#f8c87f", "#fcdca2", "#f8c0cb", "#f5e3e0", "#fdf6f4"]
    },
{
        originalName: "Lavender Dawn",
        emoji: '🌅',
        colors: ["#3D2A4D", "#463058", "#503664", "#593C70", "#62427C", "#6C4888", "#754E94", "#7F549F", "#895AAA", "#9360B6", "#9D66C2", "#A76CCE", "#B172D9", "#BB78E5", "#C57EF1", "#CF84FD", "#D48CFB", "#D994F9", "#DE9CF7", "#E3A4F5", "#E8ACF3", "#EDB4F1", "#F2BCEF", "#F7C4ED", "#FCCCEB", "#FFD5E8", "#FFDDE6", "#FFE6E3", "#FFEEDF", "#FFF2D7", "#FFF6CF", "#FFF9C7", "#FFFCC0", "#FDF5BA", "#FBEFB4", "#F9E8AE", "#F7E2A8", "#F5DCA2", "#F3D59C", "#F1CF96", "#EEC890", "#EBC28A", "#E9BB84", "#E6B57E", "#E4AE78", "#E1A872", "#DFA16C"]
    },
{
        originalName: "Monochrome",
        emoji: '☯️',
        colors: ["#FFFFFF", "#F9F9F9", "#F3F3F3", "#EDEDED", "#E7E7E7", "#E1E1E1", "#DBDBDB", "#D5D5D5", "#CFCFCF", "#C9C9C9", "#C3C3C3", "#BDBDBD", "#B7B7B7", "#B1B1B1", "#ABABAB", "#A5A5A5", "#9F9F9F", "#999999", "#939393", "#8D8D8D", "#878787", "#818181", "#7B7B7B", "#757575", "#6F6F6F", "#696969", "#636363", "#5D5D5D", "#575757", "#515151", "#4B4B4B", "#454545", "#3F3F3F", "#393939", "#333333", "#2D2D2D", "#272727", "#212121", "#1B1B1B", "#151515", "#0F0F0F", "#0C0C0C", "#090909", "#060606", "#040404", "#020202", "#000000"]
    },

{
        originalName: "Phoenix Fire",
        emoji: '🔥',
        colors: ["#1A0A0A", "#2A0E0C", "#3A1410", "#4A1913", "#5A1E16", "#6B2318", "#7B281B", "#8C2E1E", "#9C3321", "#AD3824", "#BD3D26", "#CE4229", "#DE472C", "#EF4C2F", "#FF5131", "#FF5C26", "#FF6621", "#FF701C", "#FF7A17", "#FF8412", "#FF8E0D", "#FF9800", "#FFA31A", "#FFAD33", "#FFB84D", "#FFC266", "#FFCC80", "#FFD699", "#FFE0B3", "#FFEBCC", "#FFF5E6", "#FFD580", "#FFBF40", "#E6A833", "#CC9226", "#B37C1A", "#99660D", "#805000", "#664000", "#4C3000", "#332000", "#FF6F61", "#E63946", "#C71F37", "#A4161A", "#701010", "#400B0B"]
    },

{
        originalName: "Serene Sky",
        emoji: '🕊️',
        colors: ["#FDFEFF", "#F8FAFB", "#F2F6F7", "#ECF2F5", "#E6EEF3", "#E0EAF1", "#DAE6EF", "#D4E2ED", "#CEDDEA", "#C8D9E8", "#C2D5E6", "#BCD1E4", "#B6CCE2", "#B0C8E0", "#AAC4DE", "#A4C0DC", "#9EBBD9", "#98B7D7", "#92B3D5", "#8CAFD3", "#86AAD1", "#80A6CF", "#7AA2CD", "#749ECB", "#6E99C8", "#6895C6", "#6291C4", "#5C8DC2", "#5688C0", "#5084BE", "#4A80BC", "#447CBA", "#3E77B7", "#3873B5", "#3270B0", "#2D6CAB", "#2868A6", "#2363A1", "#1E5F9C", "#195B97", "#145792", "#0F528D", "#0A4E88", "#054983", "#00457E", "#003F73"]
    },

{
        originalName: "Emerald Grove",
        emoji: '🌿',
        colors: ["#E8FFF5", "#E1FDF0", "#DAFBEB", "#D3F9E6", "#CCF7E1", "#C5F5DC", "#BEF3D7", "#B7F1D2", "#B0EFCD", "#A9EDC8", "#A2EBC3", "#9BE9BE", "#94E7B9", "#8DE5B4", "#86E3AF", "#7FE1AA", "#78DFA5", "#71DDA0", "#6AD89A", "#63D394", "#5CCE8E", "#55C988", "#4EC482", "#47BF7C", "#40BA76", "#39B570", "#32B06A", "#2BAA64", "#24A55E", "#1DA058", "#169B52", "#10964C", "#0A9146", "#088C42", "#07873E", "#06823A", "#057D36", "#047832", "#03732E", "#026E2A", "#016926", "#016422", "#015F1E", "#015A1A", "#015516", "#015012", "#014B0E", "#01460A", "#014206", "#013E04", "#013A03", "#013703", "#013403", "#013103", "#012E03", "#012B03", "#012803", "#012503", "#012203", "#011F03", "#011C03", "#011A03", "#011803", "#00180E"]
    },


{
        originalName: "Elemental Gems",
        emoji: '💎',
        colors: ["#0F0F0F", "#1C1C1C", "#2A2A2A", "#383838", "#464646", "#545454", "#626262", "#707070", "#7E7E7E", "#8C8C8C", "#9A9A9A", "#A8A8A8", "#B6B6B6", "#C4C4C4", "#D2D2D2", "#E0E0E0", "#EEEDED", "#F9F9F9", "#FFFDFB", "#B08D57", "#C29D69", "#D4AF7A", "#E6C18B", "#F8D39C", "#4F7942", "#3A6351", "#2F5233", "#5E8C61", "#7BAE7F", "#99D6A6", "#135E82", "#1C7A9B", "#2799B9", "#3AB3D0", "#56CFE1", "#72EFDD", "#5A3E85", "#6C4F96", "#7E60A7", "#9273B8", "#A687C9", "#BA9BDA", "#D0B0EB", "#E6C6FC", "#F0DBFF", "#FBF2FF"]
    },

{
        originalName: "Blue Graphite",
        emoji: '✏️',
        colors: ["#F7FAFC", "#EFF4F8", "#E7EEF4", "#DFE8F0", "#D7E2EC", "#CFDCE8", "#C7D6E4", "#BFCEE0", "#B7C6DC", "#AFBED8", "#A7B6D4", "#9FAED0", "#97A6CC", "#8F9EC8", "#8796C4", "#7F8EC0", "#7786BC", "#6F7EB8", "#6776B4", "#5F6EB0", "#5766AC", "#4F5EA8", "#4756A4", "#3F4EA0", "#38479C", "#324098", "#2D3A92", "#28348C", "#232E86", "#1E287F", "#1A237A", "#181F70", "#161B66", "#14175C", "#121352", "#100F48", "#0E0B3E", "#0C0734", "#0A052B", "#080321", "#07021B", "#060116", "#050011", "#04000C", "#030008", "#020004", "#000000"]
    },

{
        originalName: "Rustic Copper",
        emoji: '⛏️',
        colors: ["#FFF9F3", "#FFF5EB", "#FAEDE0", "#F5E4D4", "#F0DBC8", "#EBD2BC", "#E6C9B0", "#E0C0A4", "#DBB798", "#D6AE8C", "#D1A580", "#CC9C74", "#C79268", "#C2895C", "#BD8050", "#B87744", "#B36E38", "#AE652C", "#A85C26", "#A25323", "#9C4A20", "#96411D", "#90381A", "#8A2F17", "#842614", "#7E1D11", "#78140E", "#720B0B", "#6C0809", "#660607", "#600505", "#5A0404", "#540303", "#4E0303", "#480303", "#420404", "#3C0505", "#360606", "#300707", "#2A0808", "#240909", "#1E0A0A", "#190908", "#150806", "#120704", "#0E0603", "#0B0502", "#080402", "#060302", "#050202", "#040101", "#030000", "#020000", "#000000", "#2A0C05", "#3F1408", "#53200B", "#683011", "#7C4018", "#91501E", "#A66024", "#BA702B", "#CF8031", "#E49038", "#F9A03E"]
    },


/* EXVLUDED PALLETES--------------EXCULDED
{
        originalName: "Twilight Magic",
        emoji: '🌠',
        colors: ["#E6FAFF", "#E0F7FE", "#DAF4FD", "#D4F1FC", "#CEEEFB", "#C8EBFA", "#C2E8F9", "#BCE5F8", "#B6E2F7", "#B0DFF6", "#AADCF5", "#A4D9F4", "#9ED6F3", "#98D3F2", "#92D0F1", "#8CCDF0", "#86CAEF", "#80C7EE", "#7AC4ED", "#74C1EC", "#6EBEEB", "#68BBEA", "#62B8E9", "#5CB5E8", "#56B2E7", "#50AFE6", "#4AACE5", "#44A9E4", "#3EA6E3", "#38A3E2", "#32A0E1", "#2C9DE0", "#269ADF", "#2097DE", "#1A94DD", "#1491DC", "#0E8EDB", "#088BDA", "#0489D7", "#0888D3", "#1287CF", "#1C86CB", "#2685C7", "#3084C3", "#3A83BF", "#4482BB", "#4E81B7", "#5880B3", "#627FAF", "#6C7EAB", "#767DA7", "#807CA3", "#8A7B9F", "#947A9B", "#9E7997", "#A878A3", "#B277AF", "#BC76BB", "#C675C7", "#D074D3", "#DA73DF", "#E473EB", "#EE72F7", "#F8F1FF"]
    },
{
        originalName: "Healing",
        emoji: '✨',
        colors: ["#1A3A3A", "#FFFFFF", "#FADADD", "#F9C6C5", "#F7A3A2", "#E88282", "#FFDAB9", "#FFC3A0", "#FFFACD", "#FAFAD2", "#FFDEAD", "#F3D6A3", "#DEB887", "#D2B48C", "#F0FFF0", "#D3F2D3", "#B3E0B3", "#98D8AA", "#77C38B", "#58A16F", "#AFEEEE", "#A5E1E1", "#80D0C7", "#64BDB3", "#48A9A6", "#3E8E7E", "#E0FFFF", "#CDEAF5", "#B0E0E6", "#87CEEB", "#64A6C4", "#4682B4", "#E6E6FA", "#D8BFD8", "#C3B1E1", "#B19CD9", "#9370DB", "#7A68A6", "#F5F5DC", "#F5DEB3", "#D3D3D3", "#C0C0C0", "#A9A9A9", "#808080"]
    },


*/


{
    originalName: "Amethyst Dream",
    emoji: '🔮',
    colors: ["#1a0b1e", "#220e29", "#2b1235", "#331541", "#3b184d", "#441b59", "#4c1e65", "#552171", "#5d247d", "#662789", "#6e2a95", "#772da1", "#7f30ad", "#813ec3", "#8b4ec8", "#955dcd", "#9f6dd2", "#a97cd7", "#b38cdc", "#bd9be1", "#c7aae6", "#d1baeb", "#dbc9f0", "#e5d8f5", "#efe8fa", "#f9f7ff", "#f5eeff", "#f0e2ff", "#ebd6ff", "#e6caff", "#e2bdff", "#deafff", "#d9a2ff", "#d494ff", "#cf85ff", "#ca76ff", "#c568ff", "#c059ff", "#bb4aff", "#b243f5", "#aa40e9", "#a13cdd", "#9939d1", "#9036c5", "#8833b9", "#772ebf"]
},

    { 
        originalName: "Cherry Blossom", 
        emoji: '桜', 
        iconHTML: '<span style="color: #FFB6C1;">桜</span>', 
        colors: ["#69476E", "#86688B", "#8F6AAD", "#A284C2", "#A389A4", "#BC8F8F", "#B59ECB", "#D4A3A3", "#C0A9BD", "#BDB0D0", "#C3B1E1", "#C9B7D4", "#E1B5B5", "#D8BFD8", "#E0BBE4", "#D6CADD", "#FBC4AB", "#EECBCB", "#FFC4D0", "#DCD0E2", "#FFD1DC", "#E6Dce5", "#F4DEDE", "#FFDDE1", "#F8E9E9"] 
    },
    { 
        originalName: "Jasmine Dream", 
        iconHTML: '<svg viewBox="0 0 24 24" style="width: var(--icon-size); height: var(--icon-size);"><defs><linearGradient id="jasmineGradient" gradientTransform="rotate(90)"><stop offset="5%" stop-color="#AB6BB7" /><stop offset="95%" stop-color="#4B0082" /></linearGradient></defs><g transform="translate(12,12) rotate(18)"><path d="M0,-11 C 5,-6 5,5 0,1 C -5,5 -5,-6 0,-11 Z" transform="rotate(0)" fill="url(#jasmineGradient)"/><path d="M0,-11 C 5,-6 5,5 0,1 C -5,5 -5,-6 0,-11 Z" transform="rotate(72)" fill="url(#jasmineGradient)"/><path d="M0,-11 C 5,-6 5,5 0,1 C -5,5 -5,-6 0,-11 Z" transform="rotate(144)" fill="url(#jasmineGradient)"/><path d="M0,-11 C 5,-6 5,5 0,1 C -5,5 -5,-6 0,-11 Z" transform="rotate(216)" fill="url(#jasmineGradient)"/><path d="M0,-11 C 5,-6 5,5 0,1 C -5,5 -5,-6 0,-11 Z" transform="rotate(288)" fill="url(#jasmineGradient)"/></g><circle cx="12" cy="12" r="2.5" fill="#FFD700"/></svg>', 
        colors: ["#4B0082", "#5A189A", "#682A7A", "#6A1E97", "#7B1E8A", "#743993", "#804090", "#854772", "#8C4888", "#8F588C", "#986089", "#9B5AA3", "#A0636A", "#9E6F80", "#AB6BB7", "#A97585", "#A8769C", "#AE7E82", "#B97F62", "#B885B1", "#B39178", "#B59095", "#C4927E", "#C69A7B", "#D29B5A", "#C59EAA", "#C2AA8E", "#C9AD70", "#DEAE77", "#D2B7A3", "#E1B674", "#D0C187", "#E3BF68", "#E0CF9C", "#E5D680", "#F0E595"] 
    },
    
    { 
        originalName: "Brown Noise", 
        iconHTML: '<svg viewBox="0 0 24 24" style="width: var(--icon-size); height: var(--icon-size);"><polygon points="7,3 17,3 21,21 3,21" style="fill:#FFD700;" /></svg>', 
        colors: ["#3E2F00", "#523F00", "#665000", "#7A6000", "#8E7000", "#A28000", "#B69000", "#CAA000", "#DEB000", "#F2C000", "#F4C306", "#F6C70C", "#F8CA12", "#FACC18", "#FCD01E", "#FED324", "#FFD52A", "#FFD700", "#FFD730", "#FFD936", "#FFDB3C", "#FFDD42", "#FFDF48", "#FFE14E", "#FFE354"] 
    },
    

{
    originalName: "Nature",
    emoji: '🌍',
    colors: ["#2E160B", "#3B1D0E", "#442111", "#4B2612", "#532B14", "#5B3016", "#633518", "#6B3A1A", "#73401C", "#7B441E", "#834920", "#8B4E22", "#935324", "#9B5826", "#A35D28", "#AB622A", "#B3672C", "#BB6C2E", "#C37130", "#CB7632", "#D37B34", "#DB8036", "#E38538", "#EB8A3A", "#F0933F", "#F49C44", "#F8A549", "#FCAD4E", "#FFB653", "#FFBF58", "#FFC95D", "#FFD262", "#8B6E3B", "#7B7534", "#6C7B2D", "#5C8226", "#4D891F", "#3D9018", "#2E9711", "#249E16", "#1CA61C", "#14AD21", "#0CB527", "#06BD2D", "#04C937", "#08D540", "#0CE149", "#10ED52", "#14F95B", "#1CF664", "#24F36D", "#2CF076", "#34ED7F", "#3CEA88", "#44E791", "#4CE49A", "#54E1A3", "#5CDEAC", "#64DBB5", "#6CD8BE", "#74D5C7", "#7CD2D0", "#84CFD9", "#8CCCE2", "#58B7D5", "#52ACD3", "#4CA1D1", "#4696CF", "#408BCD", "#3A80CB", "#3475C9", "#2E6AC7", "#2860C5", "#2356C3", "#1E4CC1", "#1942BF", "#1438BD", "#0F2EBA", "#0A24B8", "#051AB6", "#071EBB", "#0A22C0", "#0E26C5", "#122ACA", "#162ECF", "#1A32D4", "#1E36D9", "#223ADE", "#263EE3", "#2A42E8", "#2E46ED", "#324AF2", "#364EF7", "#3A52FC", "#3E56FF", "#425AFF", "#4979FF", "#5187FF", "#5995FF", "#61A3FF", "#69B1FF", "#71BFFF", "#79CDFF", "#81DBFF", "#89E9FF", "#91F7FF", "#99FAFF", "#A1F5FF", "#A9F0FF", "#B1EBFF", "#B9E6FF", "#C1E1FF", "#C9DCFF", "#D1D7FF", "#D9D2FF", "#E1CDFF", "#E9D8FF", "#F1E3FF", "#F9EEFF", "#FFF9FF", "#FFF7F7", "#FFF5EF", "#FFF3E7", "#FFF1DF", "#FFEFD7", "#FFECCF", "#FFEAC7", "#FFE8BF"]
},



{ 
        originalName: "Cosmos", 
        emoji: '🌌', 
        colors: ["#000000", "#0B0C10", "#00008B", "#1F2833", "#191970", "#263238", "#4B0082", "#37474F", "#483D8B", "#8A2BE2", "#BA55D3", "#9370DB", "#1E90FF", "#FF00FF", "#DA70D6", "#FF69B4", "#00BFFF", "#40E0D0", "#B0E0E6", "#FFFACD", "#F8F8FF", "#E0FFFF", "#FFFFFF"] 
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
export const SIZES = [149, 101, 75, 65, 55, 49, 35, 27, 21, 15, 11, 9, 7, 5, 3];

// --- Default Simulation Rules ---
export const defaultGameOfLifeRules = {
    survivalMin: 3, 
    survivalMax: 5,
    birth: 3,
    liveCellDef: 'notDarkest',
    colorGenetics: 'average'
};

export const defaultGravitationalSortRules = {
    direction: 'down',
    strength: 0.7
};

export const defaultErosionRules = {
    erosionStrength: 0.1
};

export const defaultDlaRules = {
    colorGenetics: true,
    injectFromEdges: false,
    fastMode: false // הוספנו את השורה הזו
};

