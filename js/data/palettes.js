
import { getText, translations } from '../i18n.js';

export const PALETTES = [
  {
    originalName: "Journey",
    emoji: '🌓',
    colors: ["#000000","#424242","#7B1FA2","#5E35B1","#673AB7","#9C27B0","#C2185B","#E91E63","#FF1744","#C62828","#D32F2F","#3F51B5","#1976D2","#2196F3","#42A5F5","#0097A7","#00BCD4","#4CAF50","#66BB6A","#FF5722","#FFA726","#FFC107","#BDBDBD"]
  },
  {
    originalName: "Zionism",
    emoji: '🇮🇱',
    colors: ["#001F3F","#003087","#005EB8","#0077E6","#40A9FF","#A3D8FF","#E6F0FF","#F5F8FF","#FFFFFF","#FFD700","#FFCC00","#FFB300","#E67E22","#2E8B57","#3CB371","#66C76F","#98E0A0","#C8102E","#E31C3D","#8B0000","#2C2C2C","#5A5A5A","#B0B0B0"]
  },
  {
    originalName: "Ancient Mythos 64",
    emoji: '🏺',
    colors: (function() {
        const orig = [
            "#0D0906", "#1A1512", "#2B221E", "#3E3029", "#564135", "#705442", 
            "#8A6952", "#A68064", "#C39A77", "#DFB68F", "#FBE3B8", "#D4AF37", 
            "#AA8222", "#8B0000", "#660000", "#4A0404", "#2E0E02", "#1E2A3A", 
            "#2B3C53", "#3C516D", "#4F6889", "#504136", "#362A21", "#1E1610"
        ];
        function hexToRgb(h) { return [parseInt(h.slice(1,3), 16), parseInt(h.slice(3,5), 16), parseInt(h.slice(5,7), 16)]; }
        function rgbToHex(r, g, b) { return "#" + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0').toUpperCase()).join(''); }
        const rgbs = orig.map(hexToRgb);
        const dists = [];
        let totalDist = 0;
        for (let i = 0; i < rgbs.length - 1; i++) {
            let d = Math.sqrt(Math.pow(rgbs[i+1][0] - rgbs[i][0], 2) + Math.pow(rgbs[i+1][1] - rgbs[i][1], 2) + Math.pow(rgbs[i+1][2] - rgbs[i][2], 2));
            if (d === 0) d = 0.1; 
            dists.push(d);
            totalDist += d;
        }
        const out = [];
        for (let i = 0; i < 64; i++) {
            if (i === 0) { out.push(orig[0]); continue; }
            if (i === 63) { out.push(orig[orig.length - 1]); continue; }
            let targetDist = (i / 63) * totalDist;
            let accum = 0;
            let s = 0;
            while (s < dists.length - 1 && accum + dists[s] <= targetDist) {
                accum += dists[s];
                s++;
            }
            let progress = (targetDist - accum) / dists[s];
            progress = Math.max(0, Math.min(1, progress));
            let c1 = rgbs[s];
            let c2 = rgbs[s+1];
            let r = c1[0] + (c2[0] - c1[0]) * progress;
            let g = c1[1] + (c2[1] - c1[1]) * progress;
            let b = c1[2] + (c2[2] - c1[2]) * progress;
            out.push(rgbToHex(r, g, b));
        }
        return out;
    })()
  }
].map(p => ({ ...p, name: getText(Object.keys(translations).find(k => translations[k]?.en === p.originalName) || '') || p.originalName }));
