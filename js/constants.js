// js/constants.js

/**
 * קובץ זה מרכז את כל הערכים הקבועים וההגדרות הגלובליות של האפליקציה.
 * המטרה היא למנוע "מספרי קסם" ומחרוזות טקסט בקוד המרכזי.
 */

// מפתח לשמירת סטטוס ההדרכה ב-LocalStorage
export const ONBOARDING_STORAGE_KEY = 'colorGridOnboardingComplete';

// מגבלת היסטוריה עבור Undo/Redo
export const HISTORY_LIMIT = 20;

// מצבי סימטריה אפשריים
export const SYMMETRY_MODES = ['off', 'vertical', 'horizontal', 'mandala', 'kaleidoscope'];

// גדלי מרווחים אפשריים בפיקסלים
export const SEPARATORS = [6, 5, 3, 2, 0];

// גדלי לוח אפשריים
export const SIZES = [75, 65, 55, 49, 35, 27, 21, 15, 11, 9, 7, 5, 3];

// זמן המתנה בלחיצה ארוכה (במילישניות)
export const LONG_PRESS_SHOW_MS = 400;

// מספר הצבעים שיוצגו בכל עמוד בבורר הצבעים
export const COLORS_PER_PAGE = 24;

// צבע הזהב
export const GOLD = '#FFD700';