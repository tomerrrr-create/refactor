// js/colors.js

// --- הגדרות מיון עיצוב אלכימיה ---
export const SORT_MODES = [
    { method: 'luminance', icon: '<circle cx="5.5" cy="12" r="3" fill="gray" stroke="none"/><path d="M 10.5 10 L 13.5 12 L 10.5 14" fill="none" stroke="currentColor" stroke-width="1.0" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18.5" cy="12" r="3" fill="white" stroke="none"/>' },
    { method: 'dark-rainbow', icon: '<path d="M 6 19 V 10 A 6 6 0 0 1 18 10 V 19"/>' },
    { method: 'reversed', icon: '<circle cx="5.5" cy="12" r="3" fill="white" stroke="none"/><path d="M 10.5 10 L 13.5 12 L 10.5 14" fill="none" stroke="currentColor" stroke-width="1.0" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18.5" cy="12" r="3" fill="gray" stroke="none"/>' },
    { method: 'center-out', icon: '<path d="M 4 12 Q 12 5 20 12 Q 12 19 4 12 Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>' },
    { method: 'temperature', icon: '<path d="M 16 18 A 6 6 0 1 1 16 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="18" cy="6" r="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/>' }
];

export function adjustBrightness(hex, factor) {
    const rgb = hexToRgb(hex);
    if (!rgb) return 'rgb(0,0,0)';
    const r = Math.round(Math.max(0, Math.min(255, rgb[0] * factor)));
    const g = Math.round(Math.max(0, Math.min(255, rgb[1] * factor)));
    const b = Math.round(Math.max(0, Math.min(255, rgb[2] * factor)));
    return `rgb(${r},${g},${b})`;
}

export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
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
        case 'waves': {
            const sorted = [...sortedByLuminance];
            const quarter = Math.floor(sorted.length / 4);
            const q1 = sorted.slice(0, quarter); 
            const q2 = sorted.slice(quarter, quarter * 2).reverse(); 
            const q3 = sorted.slice(quarter * 2, quarter * 3); 
            const q4 = sorted.slice(quarter * 3).reverse(); 
            return [...q1, ...q2, ...q3, ...q4];
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
        case 'biomes': {
            return [...colorsArray].sort((a, b) => {
                const bucketSize = 90; 
                const bucketA = Math.floor(getHue(a) / bucketSize);
                const bucketB = Math.floor(getHue(b) / bucketSize);
                if (bucketA === bucketB) {
                    return getLuminance(a) - getLuminance(b);
                }
                return bucketA - bucketB;
            });
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