// Toolbar identities only; existing engine, logger and button IDs stay unchanged.
export const EVOLUTION_CATALOG = Object.freeze([
    ['dla','btnDla','help_dla'],['contour','btnContour','cracks_settings_title'],
    ['gameOfLife','btnGameOfLife','help_gameOfLife'],['brightnessEvo','btnBrightnessEvo','help_brightnessEvo'],
    ['islands','btnIslands','help_islands'],['spiral','btnSpiral','help_spiral'],
    ['magnet','btnMagnetModes','help_magnet'],['gravitationalSort','btnGravitationalSort','help_gravitationalSort'],
    ['sandpile','btnSandpile','help_sandpile'],['erosion','btnErosion','help_erosion'],
    ['breathe','btnShowBreatheMenu','help_breathe'],['turing','btnTuring','help_turing'],
    ['cymatics','btnCymatics','help_cymatics']
].map(([id,button,key])=>Object.freeze({id,button,key})));
export const DEFAULT_EVOLUTION_SLOTS = Object.freeze(EVOLUTION_CATALOG.slice(0,10).map(e=>e.id));
export const EVOLUTION_PAGE_SIZE = 10;
export const DEFAULT_EVOLUTION_LAYOUT = Object.freeze([
    ...DEFAULT_EVOLUTION_SLOTS, ...EVOLUTION_CATALOG.slice(10).map(e=>e.id), ...Array(7).fill(null)
]);
export const isFixedEvolution = id => id === 'nudgeBrighter' || id === 'nudgeDarker';
export const evolutionControlId = id => id === 'nudgeDarker' ? 'nudgeBrighter' : id;
export function validateEvolutionSlots(value=DEFAULT_EVOLUTION_LAYOUT) {
    if(!Array.isArray(value))throw new Error('Invalid evolution drawer slots');
    if(value.length===20){
        const assigned=value.filter(id=>id!==null);
        if(assigned.length!==EVOLUTION_CATALOG.length||new Set(assigned).size!==assigned.length||assigned.some(id=>!EVOLUTION_CATALOG.some(e=>e.id===id)))throw new Error('Invalid evolution drawer slots');
        return [...value];
    }
    if(value.length!==10||new Set(value).size!==10||value.some(id=>!isFixedEvolution(id)&&!EVOLUTION_CATALOG.some(e=>e.id===id)))throw new Error('Invalid evolution drawer slots');
    // Nudge is now fixed outside the overlay. Replace only its old slots,
    // preserving every other assignment and using distinct unused controls.
    const slots=value.map(id=>isFixedEvolution(id)?null:id);
    for(let index=0;index<slots.length;index++)if(slots[index]===null)slots[index]=EVOLUTION_CATALOG.find(e=>!slots.includes(e.id)).id;
    const remaining=EVOLUTION_CATALOG.filter(e=>!slots.includes(e.id)).map(e=>e.id);
    return [...slots,...remaining,...Array(10-remaining.length).fill(null)];
}
export function assignEvolutionSlot(value,slot,id) {
    const slots=validateEvolutionSlots(value);
    id=evolutionControlId(id);
    if(!Number.isInteger(slot)||slot<0||slot>=20||!EVOLUTION_CATALOG.some(e=>e.id===id))throw new Error('Invalid evolution drawer assignment');
    const previous=slots.indexOf(id);
    if(previous>=0)slots[previous]=slots[slot];
    slots[slot]=id;return slots;
}
export function moveEvolutionSlot(value,from,to) {
    const slots=validateEvolutionSlots(value);
    if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||from>=20||to<0||to>=20||slots[from]===null)throw new Error('Invalid evolution drawer move');
    [slots[from],slots[to]]=[slots[to],slots[from]];
    return slots;
}
