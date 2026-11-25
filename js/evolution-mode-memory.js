import { CYMATICS_RESONANCE_MAPS } from './cymatics-settings.js';
import { MAGNET_CYCLE } from './magnet-modes.js';
import { DEFAULT_GEOMETRIC_FLOW_CYCLE } from './geometric-flow-cycle.js';

// Remembered selections are deliberately session-only.
export const EVOLUTION_MODE_MEMORY_KEY = 'colorGridRememberEvolutionModes';
export const DEFAULT_REMEMBER_SIMULATION_MODES = true;
export const evolutionModeKey = simulation => ['nudgeBrighter','nudgeDarker'].includes(simulation) ? 'nudge' : simulation;
// First human-cycle choices. Turing and one-shot utilities have no cycle.
export const DEFAULT_EVOLUTION_CYCLE_MODES = Object.freeze({
    gameOfLife:'personal',sandpile:'personal',gravitationalSort:'up',spiral:DEFAULT_GEOMETRIC_FLOW_CYCLE[0],
    magnet:MAGNET_CYCLE[1],brightnessEvo:'brightness',dla:'genetics',breathe:'solo',
    ink:'turbine2',network:'spatial',fibonacci:'restart',erosion:'channels',islands:'classic',contour:'all',cymatics:CYMATICS_RESONANCE_MAPS.heart,nudge:'nudgeBrighter',wind:'ripple'
});
export const defaultEvolutionCycleMode = simulation => DEFAULT_EVOLUTION_CYCLE_MODES[evolutionModeKey(simulation)];
export function createEvolutionModeMemory({storage, blocked = () => false} = {}) {
    let enabled = DEFAULT_REMEMBER_SIMULATION_MODES;
    const modes = new Map(), completedCycles = new Set();
    try {
        const saved = (storage ?? globalThis.localStorage)?.getItem(EVOLUTION_MODE_MEMORY_KEY);
        if (saved === 'true' || saved === 'false') enabled = saved === 'true';
    } catch {}
    const active = () => enabled && !blocked();
    return {
        enabled: () => enabled,
        active,
        setEnabled(value) {
            enabled = Boolean(value);
            if (!enabled) {modes.clear();completedCycles.clear();}
            try { (storage ?? globalThis.localStorage)?.setItem(EVOLUTION_MODE_MEMORY_KEY,String(enabled)); } catch {}
        },
        remember(simulation, mode) {
            if (active() && simulation && mode !== 'off' && (typeof mode === 'string' || Number.isInteger(mode))) modes.set(evolutionModeKey(simulation),mode);
        },
        recall: simulation => active() ? modes.get(evolutionModeKey(simulation)) : undefined,
        // Explicit Off ends this cycle. Both the inactive symbol and next tap
        // use the first mode; ordinary handoffs still recall the last selection.
        entry(simulation, firstMode = defaultEvolutionCycleMode(simulation)) {
            if(!active())return undefined;
            return completedCycles.has(evolutionModeKey(simulation)) ? firstMode : modes.get(evolutionModeKey(simulation));
        },
        finishCycle(simulation) {
            const key=evolutionModeKey(simulation);
            if(active()&&modes.has(key))completedCycles.add(key);
        },
        enterCycle(simulation) {if(active())completedCycles.delete(evolutionModeKey(simulation));},
        clear() {modes.clear();completedCycles.clear();}
    };
}
