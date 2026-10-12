// js/colors.js

/**
 * ==========================================
 * COLORS.JS - Color Management & Sorting Utilities
 * ==========================================
 * This file centralizes all logic and mathematics related to color management in the application.
 * 
 * Responsibilities:
 * 1. Color conversions (e.g., HEX to RGB).
 * 2. Calculating color properties (luminance, temperature, hue).
 * 3. Advanced algorithms for sorting color palettes (design modes, rainbow, reversed, etc.).
 * 
 * Note: The functions in this file are "pure" - 
 * they only perform calculations and do not directly modify the user interface (UI) or the board state.
 */

// --- הגדרות מיון עיצוב אלכימיה ---
export const SORT_MODES = [
    { method: 'luminance', icon: '<g fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="8"/><path d="M12 4C5 7 5 17 12 20"/></g>' },
    { method: 'dark-rainbow', icon: '<path d="M3 16a9 9 0 0 1 2.1-5.8 M6.5 8.88A9 9 0 0 1 21 16 M6 16a6 6 0 0 1 12 0" fill="none" stroke="currentColor" stroke-width="1.2"/>' },
    { method: 'reversed', icon: '<g fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="8"/><path d="M12 4C19 7 19 17 12 20"/></g>' },
    { method: 'center-out', icon: '<path d="M12 20V4 M10 20L5 12Q3.5 10 2 10 M14 20l5-8q1.5-2 3-2" fill="none" stroke="currentColor" stroke-width="1.2"/>' },
    { method: 'temperature', icon: '<path d="M7 4C8 8 3 10 3 14c0 8 8 8 8 0l-.2-3.5Q8.5 12 8.5 8 8 5.5 7 4Z M18 4l3 8-3 8-3-8Z" fill="none" stroke="currentColor" stroke-width="1.2"/>' },
    { method: 'outside-in', icon: '<path d="M3.6 7l5 5-5 5 M20.4 7l-5 5 5 5" fill="none" stroke="currentColor" stroke-width="1.2"/>' },
    { method: 'hue', icon: '<g fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="8" stroke-dasharray="3 3.3"/></g>' },
    { method: 'zig-zag', icon: '<path d="M3 16l5-8 8 8 5-8" fill="none" stroke="currentColor" stroke-width="1.2"/>' },
    { method: 'zen-void', icon: '<path d="M5 8Q3 4 8 5C12 6 16 6 19 5L5 19C8 18 12 18 16 19Q21 20 19 16" fill="none" stroke="currentColor" stroke-width="1.2"/>' }
];

export function normalizeSortMethod(method) {
    return SORT_MODES.some(mode => mode.method === method) ? method : 'luminance';
}

export function adjustBrightness(hex, factor) {
    const rgb = hexToRgb(hex);
    if (!rgb) return 'rgb(0,0,0)';
    const r = Math.round(Math.max(0, Math.min(255, rgb[0] * factor)));
    const g = Math.round(Math.max(0, Math.min(255, rgb[1] * factor)));
    const b = Math.round(Math.max(0, Math.min(255, rgb[2] * factor)));
    return `rgb(${r},${g},${b})`;
}

export function hexToRgb(hex) {

    // הגנה קריטית: אם אין צבע או שזה לא טקסט (למשל undefined), נחזיר שחור במקום לקרוס
    if (!hex || typeof hex !== 'string') return [0, 0, 0];
    
    // מניחים שהפורמט הוא תמיד #RRGGBB
    const rgb = parseInt(hex.substring(1), 16);
    return [
        (rgb >> 16) & 0xff, // R
        (rgb >> 8) & 0xff,  // G
        (rgb >> 0) & 0xff   // B
    ];
}

export function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

export function getLuminance(hex) {
    const rgb = parseInt(hex.substring(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    return Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
}

export function getHue(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0;
    if (max !== min) {
        const d = max - min;
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return h * 360;
}

export function getHSV(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return { h: 0, s: 0, v: 0 };
    const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const v = max;
    const d = max - min;
    const s = max === 0 ? 0 : d / max;
    let h = 0;
    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s, v: v };
}

export function sortColorsArray(colorsArray, method) {
    const sortedByLuminance = [...colorsArray].sort((a, b) => getLuminance(a) - getLuminance(b));

    switch (method) {
        case 'zen-void': {
            let rSum = 0, gSum = 0, bSum = 0;
            colorsArray.forEach(c => {
                const rgb = hexToRgb(c) || { r: 0, g: 0, b: 0 };
                rSum += rgb[0]; gSum += rgb[1]; bSum += rgb[2]; // Fixed: hexToRgb returns an array [r,g,b]
            });
            const len = colorsArray.length;
            const avgR = rSum / len, avgG = gSum / len, avgB = bSum / len;

            return [...colorsArray].sort((a, b) => {
                const rgbA = hexToRgb(a) || [0, 0, 0];
                const rgbB = hexToRgb(b) || [0, 0, 0];
                const distA = Math.hypot(rgbA[0] - avgR, rgbA[1] - avgG, rgbA[2] - avgB);
                const distB = Math.hypot(rgbB[0] - avgR, rgbB[1] - avgG, rgbB[2] - avgB);
                return distA - distB;
            });
        }
        case 'zig-zag': {
            const reversedLuminance = [...sortedByLuminance].reverse();
            const mid = Math.floor(reversedLuminance.length / 2);
            const darkHalf = reversedLuminance.slice(mid);
            const lightHalf = reversedLuminance.slice(0, mid);
            return [...darkHalf, ...lightHalf];
        }
        case 'outside-in': {
            const outsideInArray = new Array(sortedByLuminance.length);
            let left = 0;
            let right = sortedByLuminance.length - 1;
            for (let i = 0; i < sortedByLuminance.length; i++) {
                if (i % 2 === 0) {
                    outsideInArray[left] = sortedByLuminance[i];
                    left++;
                } else {
                    outsideInArray[right] = sortedByLuminance[i];
                    right--;
                }
            }
            return outsideInArray;
        }
        case 'center-out': {
            const centerOut = new Array(sortedByLuminance.length);
            let center = Math.floor(sortedByLuminance.length / 2);
            let left = center - 1; let right = center + 1;
            centerOut[center] = sortedByLuminance[0];
            for(let i = 1; i < sortedByLuminance.length; i++) {
                if (i % 2 !== 0) {
                    if (right < sortedByLuminance.length) centerOut[right++] = sortedByLuminance[i];
                    else centerOut[left--] = sortedByLuminance[i];
                } else {
                    if (left >= 0) centerOut[left--] = sortedByLuminance[i];
                    else centerOut[right++] = sortedByLuminance[i];
                }
            }
            return centerOut;
        }
        case 'reversed':
            return [...sortedByLuminance].reverse();
        case 'hue':
            return [...colorsArray].sort((a, b) => {
                const hueDiff = getHue(a) - getHue(b);
                if (Math.abs(hueDiff) < 1) {
                    return getLuminance(a) - getLuminance(b);
                }
                return hueDiff;
            });
        case 'dark-rainbow': {
            const darks = [];
            const lights = [];
            const colors = [];
            
            colorsArray.forEach(hex => {
                const hsv = getHSV(hex);
                const lum = getLuminance(hex);
                if (hsv.s < 0.12 || hsv.v < 0.08) {
                    if (lum < 128) darks.push(hex);
                    else lights.push(hex);
                } else {
                    colors.push(hex);
                }
            });

            darks.sort((a, b) => getLuminance(a) - getLuminance(b));
            lights.sort((a, b) => getLuminance(a) - getLuminance(b));

            colors.sort((a, b) => {
                const hsvA = getHSV(a);
                const hsvB = getHSV(b);
                const hueA = (hsvA.h + 30) % 360;
                const hueB = (hsvB.h + 30) % 360;
                const bucketSize = 20; 
                const bucketA = Math.floor(hueA / bucketSize);
                const bucketB = Math.floor(hueB / bucketSize);
                
                if (bucketA === bucketB) {
                    const lumA = getLuminance(a);
                    const lumB = getLuminance(b);
                    return bucketA % 2 === 0 ? lumA - lumB : lumB - lumA;
                }
                return bucketA - bucketB;
            });

            return [...darks, ...colors, ...lights];
        }
        case 'temperature':
            return [...colorsArray].sort((a, b) => {
                const rgbA = hexToRgb(a) || [0,0,0];
                const rgbB = hexToRgb(b) || [0,0,0];
                const tempA = rgbA[0] - rgbA[2];
                const tempB = rgbB[0] - rgbB[2];
                const tempDiff = tempB - tempA; 
                if (tempDiff === 0) {
                    return getLuminance(a) - getLuminance(b);
                }
                return tempDiff;
            });
        case 'luminance':
        default:
            return sortedByLuminance;
    }
}


// --- Genetics & Simulation Color Helpers ---
export function getGeneticColor(parentHexColors, method = 'randomMix') {
    if (parentHexColors.length === 0) return 'rgb(0,0,0)';
    
    // שימוש ב-hexToRgb הקיים ב-colors.js (מחזיר מערך [r, g, b])
    const parentRgbColors = parentHexColors.map(hexToRgb).filter(Boolean);
    if (parentRgbColors.length === 0) return 'rgb(0,0,0)';
  
    let r, g, b;
  
    switch (method) {
        case 'average':
            r = Math.round(parentRgbColors.reduce((sum, c) => sum + c[0], 0) / parentRgbColors.length);
            g = Math.round(parentRgbColors.reduce((sum, c) => sum + c[1], 0) / parentRgbColors.length);
            b = Math.round(parentRgbColors.reduce((sum, c) => sum + c[2], 0) / parentRgbColors.length);
            break;
        case 'dominant':
            let dominantColor = parentRgbColors[0];
            let maxLuminance = -1;
            parentRgbColors.forEach((c, i) => {
                const hex = parentHexColors[i];
                const lum = getLuminance(hex);
                if (lum > maxLuminance) {
                    maxLuminance = lum;
                    dominantColor = c;
                }
            });
            r = dominantColor[0];
            g = dominantColor[1];
            b = dominantColor[2];
            break;
        case 'randomMix':
        default:
            const getRandomComponent = (index) => {
                const randomIndex = Math.floor(Math.random() * parentRgbColors.length);
                return parentRgbColors[randomIndex][index];
            };
            r = getRandomComponent(0);
            g = getRandomComponent(1);
            b = getRandomComponent(2);
            break;
    }
  
    return `rgb(${r}, ${g}, ${b})`;
}
  
export function findClosestColorIndex(targetRgb, colorPalette) {
    let closestIndex = 0;
    let minDistance = Infinity;
    const target = targetRgb.match(/\d+/g).map(Number);
  
    colorPalette.forEach((hex, index) => {
        const rgb = hexToRgb(hex); // מחזיר מערך [r, g, b]
        if (!rgb) return;
        const dist = Math.sqrt(
            Math.pow(target[0] - rgb[0], 2) +
            Math.pow(target[1] - rgb[1], 2) +
            Math.pow(target[2] - rgb[2], 2)
        );
        if (dist < minDistance) {
            minDistance = dist;
            closestIndex = index;
        }
    });
    return closestIndex;
}
