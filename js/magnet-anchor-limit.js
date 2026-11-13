// Session-only technician preference; it is never part of profile settings.
export const DEFAULT_MAGNET_ANCHOR_LIMIT = 300;
export const MAGNET_ANCHOR_LIMITS = Object.freeze([300, 600, 1000, 1500, 2000]);

export function validateMagnetAnchorLimit(value) {
    if (!MAGNET_ANCHOR_LIMITS.includes(value)) throw new Error('Invalid Magnet anchor limit');
    return value;
}

export function recordedMagnetAnchorLimit(rules) {
    return rules?.anchorLimit === undefined ? DEFAULT_MAGNET_ANCHOR_LIMIT : validateMagnetAnchorLimit(rules.anchorLimit);
}

export function magnetRecordingRules(rules, limit) {
    validateMagnetAnchorLimit(limit);
    // An older injected rule must not leak into profile preferences or override
    // the session/replay selection. Legacy 300 recordings keep their payload.
    const { anchorLimit, ...recorded } = rules;
    return limit === DEFAULT_MAGNET_ANCHOR_LIMIT ? recorded : { ...recorded, anchorLimit: limit };
}
