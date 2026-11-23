// UI identities keep the original engine methods and legacy recordings intact.
export const MAGNET_CYCLE = Object.freeze(['off','field_cosmic_magnet','magnet','cosmic_magnet','field_magnet']);
export const MAGNET_METHODS = Object.freeze([...MAGNET_CYCLE.slice(1),'time_magnet','expand']);
export const isCombinedMagnetMode = method => method==='field_magnet'||method==='field_cosmic_magnet';
export const magnetEngineMethod = method => isCombinedMagnetMode(method)?method.slice(6):method;
