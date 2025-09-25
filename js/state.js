// js/state.js
import { defaultGameOfLifeRules } from './config.js';

/**
 * קובץ זה מרכז את כל המצב המשתנה של האפליקציה באובייקט יחיד.
 * כל שינוי במצב האפליקציה צריך לעבור דרך אובייקט זה.
 */

export const state = {
  // הגדרות שפה ותצוגה
  currentLang: 'en',
  isAnimating: false,
  isBreathing: false,

  // מצב הלוח
  n: 11, // גודל הלוח (11x11)
  separatorPx: 0,
  tiles: [], // מערך שיחזיק את כל אריחי ה-DOM

  // מצב צבע ופלטה
  activePaletteIndex: 0,
  selectedColor: null,
  isRainbowModeActive: false,
  selectedColorIndex: -1,
  colorPickerPage: 0,

  // מצב כלי היצירה
  isBrushModeOn: true,
  symmetryMode: 'off',

  // היסטוריה (Undo/Redo)
  history: [],
  future: [],

  // מצב סימולציות
  isSimModeActive: false,
  isLifePlaying: false,
  lifeIntervalId: null,
  gameOfLifeRules: { ...defaultGameOfLifeRules },

  // משתני עזר למעקב אחרי התנהגות משתמש
  hasPerformedInitialAutofill: false,
  hasTriggeredFirstNudge: false,
  hasUsedRandomize: false,

  // מצב הדרכה (Onboarding)
  isOnboarding: false,
  onboardingStep: 0,
};