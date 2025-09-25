// js/board.js
import { state } from './state.js';
import { GOLD } from './constants.js';
import { board, root } from './dom.js';
import { getPaletteColor } from './palette.js';

/**
 * מודול זה אחראי על כל הלוגיקה והמניפולציה של לוח המשחק.
 */

const tileClasses = 'tile aspect-square w-full outline-none focus-visible:ring-inset focus-visible:ring-4 focus-visible:ring-white/90';

// --- Private Helper Functions ---

// בודק אם על אריח מסוים יש שכבת זהב
const isGold = (el) => !!el.dataset.goldOverlay;

// יוצר אלמנט של אריח בודד
function createTile(idx = 0) {
    const d = document.createElement('div');
    d.className = tileClasses;
    d.setAttribute('role', 'gridcell');
    d.setAttribute('tabindex', '0');
    setIndex(d, idx);
    return d;
}

// מחיל שכבת זהב על אריח
function applyGoldOverlay(el) {
    el.style.background = GOLD;
    el.dataset.goldOverlay = '1';
}

// --- Exported Functions ---

/**
 * מחזיר את כל אלמנטי האריחים מה-DOM כמערך.
 * @returns {HTMLElement[]}
 */
export function getTiles() {
    return Array.from(board.querySelectorAll('.tile'));
}

/**
 * קובע את אינדקס הצבע של אריח ומעדכן את הרקע שלו.
 * @param {HTMLElement} el - אלמנט האריח.
 * @param {number} k - אינדקס הצבע החדש.
 */
export function setIndex(el, k) {
    el.dataset.k = String(k);
    if (!isGold(el)) {
        el.style.background = getPaletteColor(k);
    }
}

/**
 * מחזיר את אינדקס הצבע הנוכחי של אריח.
 * @param {HTMLElement} el - אלמנט האריח.
 * @returns {number}
 */
export function getIndex(el) {
    return parseInt(el.dataset.k || '0', 10);
}

/**
 * מסיר שכבת זהב מאריח ומחזיר לו את הצבע המקורי שלו.
 * @param {HTMLElement} el - אלמנט האריח.
 */
export function clearGoldOverlay(el) {
    if (isGold(el)) {
        delete el.dataset.goldOverlay;
        el.style.background = getPaletteColor(getIndex(el));
    }
}

/**
 * בונה מחדש את כל הלוח עם גודל נתון.
 * @param {number} size - מספר האריחים בשורה/טור.
 */
export function buildBoard(size) {
    root.style.setProperty('--grid-size', size);
    board.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (let i = 0; i < size * size; i++) {
        // מתחילים את הלוח עם צבע שחור (אינדקס 0)
        const tile = createTile(0);
        frag.appendChild(tile);
    }
    board.appendChild(frag);
}

/**
 * מקבל אינדקס של אריח ומחזיר מערך של כל האינדקסים הסימטריים לו,
 * בהתבסס על מצב הסימטריה הנוכחי.
 * @param {number} index - האינדקס של האריח המקורי.
 * @returns {number[]} מערך של כל האינדקסים הסימטריים (כולל המקורי).
 */
export function getSymmetricIndices(index) {
    const n = state.n;
    const symmetryMode = state.symmetryMode;

    if (symmetryMode === 'off') return [index];

    const row = Math.floor(index / n);
    const col = index % n;
    const N = n - 1; // last index
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
        // יוצר עותק של האינדקסים כדי למנוע לולאה אינסופית בזמן איטרציה על ה-Set
        const currentPoints = Array.from(indices).map(idx => ({ r: Math.floor(idx / n), c: idx % n }));
        currentPoints.forEach(pt => {
            indices.add(pt.c * n + pt.r); // symmetry on the diagonal
        });
    }
    return Array.from(indices);
}