import { CYMATICS_RESONANCE_MAPS, INITIAL_CYMATICS_RULES } from './cymatics-settings.js';
import { RESONANCE_MAPS } from './vortices-modes.js';
import { loadToolbarCycle, orderToolbarCycle, persistToolbarCycle } from './toolbar-cycle-storage.js';

export const RESONANCE_CYCLE_VERSIONS = RESONANCE_MAPS.map(name => CYMATICS_RESONANCE_MAPS[name]);
export const DEFAULT_RESONANCE_CYCLE = Object.freeze(RESONANCE_CYCLE_VERSIONS.filter(version => version !== CYMATICS_RESONANCE_MAPS.clouds));
const STORAGE_KEY = 'colorGridResonanceCycleV1';

export const orderResonanceCycle = modes => [
    INITIAL_CYMATICS_RULES.resonanceVersion,
    ...orderToolbarCycle(modes, RESONANCE_CYCLE_VERSIONS).filter(version => version !== INITIAL_CYMATICS_RULES.resonanceVersion)
];
export const loadResonanceCycle = storage => orderResonanceCycle(loadToolbarCycle(STORAGE_KEY, RESONANCE_CYCLE_VERSIONS, DEFAULT_RESONANCE_CYCLE, storage));
export const persistResonanceCycle = (modes, storage) => persistToolbarCycle(STORAGE_KEY, modes, storage);
