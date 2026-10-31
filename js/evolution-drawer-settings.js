// Toolbar identities only; existing engine, logger and button IDs stay unchanged.
export const EVOLUTION_CATALOG = Object.freeze([
    ['dla','btnDla','help_dla'],['contour','btnContour','drawer_cracks_contours'],
    ['gameOfLife','btnGameOfLife','help_gameOfLife'],['brightnessEvo','btnBrightnessEvo','help_brightnessEvo'],
    ['islands','btnIslands','help_islands'],['spiral','btnSpiral','help_spiral'],
    ['magnet','btnMagnetModes','help_magnet'],['gravitationalSort','btnGravitationalSort','help_gravitationalSort'],
    ['sandpile','btnSandpile','help_sandpile'],['erosion','btnErosion','help_erosion'],
    ['breathe','btnShowBreatheMenu','help_breathe'],['turing','btnTuring','help_turing'],
    ['nudgeBrighter','btnNudgeBrighter','help_nudge'],['cymatics','btnCymatics','help_cymatics']
].map(([id,button,key])=>Object.freeze({id,button,key})));
export const DEFAULT_EVOLUTION_SLOTS = Object.freeze(EVOLUTION_CATALOG.slice(0,10).map(e=>e.id));
export const evolutionControlId = id => id === 'nudgeDarker' ? 'nudgeBrighter' : id;
export function validateEvolutionSlots(value=DEFAULT_EVOLUTION_SLOTS) {
    if(!Array.isArray(value)||value.length!==10||new Set(value).size!==10||value.some(id=>!EVOLUTION_CATALOG.some(e=>e.id===evolutionControlId(id))))throw new Error('Invalid evolution drawer slots');
    const slots=value.map(evolutionControlId);
    // Legacy layouts may contain both old directions. Keep the first Nudge
    // position and fill the redundant position with the first unused control.
    return slots.map((id,index)=>slots.indexOf(id)===index?id:EVOLUTION_CATALOG.find(e=>!slots.includes(e.id)).id);
}
export function assignEvolutionSlot(value,slot,id) {
    const slots=validateEvolutionSlots(value);
    id=evolutionControlId(id);
    if(!Number.isInteger(slot)||slot<0||slot>=10||!EVOLUTION_CATALOG.some(e=>e.id===id))throw new Error('Invalid evolution drawer assignment');
    const previous=slots.indexOf(id);
    if(previous>=0)slots[previous]=slots[slot];
    slots[slot]=id;return slots;
}
