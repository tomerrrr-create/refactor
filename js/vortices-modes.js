// The toolbar groups existing engines without changing their recording IDs.
export const VORTICES_MODES = Object.freeze({
    turbine2: {engine:'gravitationalSort', label:'spiral_turbine2'},
    flow: {engine:'ink', label:'help_ink'},
    left: {engine:'spiral', label:'spiral_left'},
    cosmic: {engine:'cymatics', label:'cymatics_map_cosmic', map:6},
    a: {engine:'spiral', label:'spiral_a'},
    circular: {engine:'cymatics', label:'cymatics_map_circular', map:3},
    black_hole: {engine:'gravitationalSort', label:'spiral_black_hole'},
    tornado: {engine:'spiral', label:'spiral_tornado'}
});
export const VORTICES_CYCLE = Object.freeze(['off', ...Object.keys(VORTICES_MODES)]);
export const VORTICES_RESONANCE_MAPS = Object.freeze(['cosmic', 'circular']);
export const RESONANCE_MAPS = Object.freeze(['interference', 'diagonal', 'grid', 'clouds']);

export function vorticesModeFor(engine, mode) {
    if (engine === 'ink') return 'flow';
    if (engine === 'cymatics') return VORTICES_RESONANCE_MAPS.find(name => VORTICES_MODES[name].map === mode);
    return Object.hasOwn(VORTICES_MODES, mode) && VORTICES_MODES[mode].engine === engine ? mode : undefined;
}
