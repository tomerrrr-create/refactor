// js/simulations.js

// --- Internal helper functions ---
// These functions are used by the simulations in this file.

import { getGeneticColor, findClosestColorIndex } from './colors.js';

export { runGameOfLifeGeneration } from './simulations/game_of_life.js';
export { runGravitationalSortGeneration, resetGravitationalSortCaches } from './simulations/gravitational_sort.js';
export { runSpiralGeneration } from './simulations/spiral.js';
export { runMagnetGeneration, resetMagnetCaches } from './simulations/magnet.js';
export { runErosionGeneration } from './simulations/erosion.js';
export { runBrightnessEvolution, runContrastGeneration } from './simulations/brightness.js';
export { runContourGeneration } from './simulations/contour.js';
export { generateSandpile } from './simulations/chi_flow.js';
export { runTuringGeneration } from './simulations/turing.js';
export { runDlaGeneration } from './simulations/dla.js';
export { getBreatheBrightnessFactor } from './simulations/breathe.js';









