import { CYMATICS_RESONANCE_MAPS } from './cymatics-settings.js';
import { RESONANCE_MAPS } from './vortices-modes.js';
import { loadToolbarCycle, orderToolbarCycle, persistToolbarCycle } from './toolbar-cycle-storage.js';

export const RESONANCE_CYCLE_VERSIONS = RESONANCE_MAPS.map(name => CYMATICS_RESONANCE_MAPS[name]);
export const DEFAULT_RESONANCE_CYCLE = Object.freeze(RESONANCE_CYCLE_VERSIONS.filter(version => version !== CYMATICS_RESONANCE_MAPS.diagonal));
const STORAGE_KEY = 'colorGridResonanceCycleV1';

export const loadResonanceCycle = storage => loadToolbarCycle(STORAGE_KEY, RESONANCE_CYCLE_VERSIONS, DEFAULT_RESONANCE_CYCLE, storage);
export const orderResonanceCycle = modes => orderToolbarCycle(modes, RESONANCE_CYCLE_VERSIONS);
export const persistResonanceCycle = (modes, storage) => persistToolbarCycle(STORAGE_KEY, modes, storage);
