// Device preference; remembered selections are deliberately session-only.
export const EVOLUTION_MODE_MEMORY_KEY = 'colorGridRememberEvolutionModes';
export const evolutionModeKey = simulation => ['nudgeBrighter','nudgeDarker'].includes(simulation) ? 'nudge' : simulation;
// First human-cycle choices. Turing and one-shot utilities have no cycle.
export const DEFAULT_EVOLUTION_CYCLE_MODES = Object.freeze({
    gameOfLife:'personal',sandpile:'personal',gravitationalSort:'up',spiral:'b',
    magnet:'magnet',brightnessEvo:'brightness',dla:'genetics',breathe:'solo',
    erosion:'channels',islands:'classic',contour:'all',cymatics:3,nudge:'nudgeBrighter'
});
export const defaultEvolutionCycleMode = simulation => DEFAULT_EVOLUTION_CYCLE_MODES[evolutionModeKey(simulation)];
export function createEvolutionModeMemory({storage, blocked = () => false} = {}) {
    let enabled = false;
    const modes = new Map();
    try { enabled = (storage ?? globalThis.localStorage)?.getItem(EVOLUTION_MODE_MEMORY_KEY) === 'true'; } catch {}
    const active = () => enabled && !blocked();
    return {
        enabled: () => enabled,
        active,
        setEnabled(value) {
            enabled = Boolean(value);
            if (!enabled) modes.clear();
            try { (storage ?? globalThis.localStorage)?.setItem(EVOLUTION_MODE_MEMORY_KEY,String(enabled)); } catch {}
        },
        remember(simulation, mode) {
            if (active() && simulation && mode !== 'off' && (typeof mode === 'string' || Number.isInteger(mode))) modes.set(evolutionModeKey(simulation),mode);
        },
        recall: simulation => active() ? modes.get(evolutionModeKey(simulation)) : undefined,
        clear: () => modes.clear()
    };
}
