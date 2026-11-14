// Session-only Magnet setting; it is never part of profile settings.
export const DEFAULT_MAGNET_ANCHOR_LIMIT = 300;
export const MAGNET_ANCHOR_LIMITS = Object.freeze([300, 600, 1000, 1500, 2000]);

export function validateMagnetAnchorLimit(value) {
    if (!MAGNET_ANCHOR_LIMITS.includes(value)) throw new Error('Invalid Magnet anchor limit');
    return value;
}

export function recordedMagnetAnchorLimit(rules) {
    return rules?.anchorLimit === undefined ? DEFAULT_MAGNET_ANCHOR_LIMIT : validateMagnetAnchorLimit(rules.anchorLimit);
}

export const COMBINED_MAGNET_FIELD = 'combined-v1';
export function recordedMagnetCombinedField(rules) {
    if (rules?.fieldModel === undefined) return false;
    if (rules.fieldModel !== COMBINED_MAGNET_FIELD) throw new Error('Invalid Magnet field model');
    return true;
}

export function magnetRecordingRules(rules, limit, combinedField = false) {
    validateMagnetAnchorLimit(limit);
    // An older injected rule must not leak into profile preferences or override
    // the session/replay selection. Legacy 300 recordings keep their payload.
    const { anchorLimit, fieldModel, ...recorded } = rules;
    if (combinedField) recorded.fieldModel = COMBINED_MAGNET_FIELD;
    return limit === DEFAULT_MAGNET_ANCHOR_LIMIT ? recorded : { ...recorded, anchorLimit: limit };
}
