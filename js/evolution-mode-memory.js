// Device preference; remembered selections are deliberately session-only.
export const EVOLUTION_MODE_MEMORY_KEY = 'colorGridRememberEvolutionModes';
export const evolutionModeKey = simulation => ['nudgeBrighter','nudgeDarker'].includes(simulation) ? 'nudge' : simulation;
// First human-cycle choices. Turing and one-shot utilities have no cycle.
export const DEFAULT_EVOLUTION_CYCLE_MODES = Object.freeze({
    gameOfLife:'personal',sandpile:'personal',gravitationalSort:'up',spiral:'b',
    magnet:'magnet',brightnessEvo:'brightness',dla:'genetics',breathe:'solo',
    erosion:'channels',islands:'classic',contour:'all',cymatics:3,nudge:'nudgeBrighter',wind:'ripple'
});
export const defaultEvolutionCycleMode = simulation => DEFAULT_EVOLUTION_CYCLE_MODES[evolutionModeKey(simulation)];
export function createEvolutionModeMemory({storage, blocked = () => false} = {}) {
    let enabled = false;
    const modes = new Map(), completedCycles = new Set();
    try { enabled = (storage ?? globalThis.localStorage)?.getItem(EVOLUTION_MODE_MEMORY_KEY) === 'true'; } catch {}
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
        // Explicit Off ends this cycle. Keep the inactive symbol, but begin
        // at the first mode next time; ordinary handoffs still recall modes.
        entry(simulation) {
            if(!active())return undefined;
            return completedCycles.has(evolutionModeKey(simulation)) ? defaultEvolutionCycleMode(simulation) : modes.get(evolutionModeKey(simulation));
        },
        finishCycle(simulation) {
            const key=evolutionModeKey(simulation);
            if(active()&&modes.has(key))completedCycles.add(key);
        },
        enterCycle(simulation) {if(active())completedCycles.delete(evolutionModeKey(simulation));},
        clear() {modes.clear();completedCycles.clear();}
    };
}
