// Optional V1 settings extension. Missing options always mean the original engines.
export const DEFAULT_EVOLUTION_TUNING = Object.freeze({
    brightnessEvo: Object.freeze({ smoothing: .5, contrast: .1 }),
    breathe: Object.freeze({ speed: 1, depth: 1 }),
    islands: Object.freeze({ activity: .05 }),
    dla: Object.freeze({ batchSize: 100 })
});

export const EVOLUTION_TUNING_LIMITS = {
    brightnessEvo: { smoothing: [.05, 1, .05], contrast: [.01, 1, .01] },
    breathe: { speed: [.25, 3, .05], depth: [.25, 1.5, .05] },
    islands: { activity: [.01, .5, .01] },
    dla: { batchSize: [10, 1000, 10] }
};
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function validateEvolutionTuning(value = {}) {
    if (!object(value)) throw Error('Invalid evolution tuning');
    const result = structuredClone(DEFAULT_EVOLUTION_TUNING);
    for (const [simulation, options] of Object.entries(value)) {
        if (!Object.hasOwn(result, simulation) || !object(options)) throw Error('Unknown evolution tuning');
        for (const [key, number] of Object.entries(options)) {
            const limits = EVOLUTION_TUNING_LIMITS[simulation][key];
            if (!limits || !Number.isFinite(number) || number < limits[0] || number > limits[1] ||
                (simulation === 'dla' && !Number.isInteger(number))) throw Error('Invalid evolution tuning value');
            result[simulation][key] = number;
        }
    }
    return result;
}
