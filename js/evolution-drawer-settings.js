// Toolbar identities only; existing engine, logger and button IDs stay unchanged.
export const EVOLUTION_CATALOG = Object.freeze([
    ['dla','btnDla','help_dla'],['contour','btnContour','cracks_settings_title'],
    ['gameOfLife','btnGameOfLife','help_gameOfLife'],['brightnessEvo','btnBrightnessEvo','help_brightnessEvo'],
    ['islands','btnIslands','help_islands'],['spiral','btnSpiral','help_spiral'],
    ['magnet','btnMagnetModes','help_magnet'],['gravitationalSort','btnGravitationalSort','help_gravitationalSort'],
    ['sandpile','btnSandpile','help_sandpile'],['erosion','btnErosion','help_erosion'],
    ['breathe','btnShowBreatheMenu','help_breathe'],['turing','btnTuring','help_turing'],
    ['cymatics','btnCymatics','help_cymatics'],['nudgeBrighter','btnNudgeBrighter','help_nudge']
].map(([id,button,key])=>Object.freeze({id,button,key})));
// Historical first-page order, retained for compatibility with ten-slot files.
export const DEFAULT_EVOLUTION_SLOTS = Object.freeze(EVOLUTION_CATALOG.slice(0,10).map(e=>e.id));
export const EVOLUTION_PAGE_SIZE = 10;
export const INTERNAL_NAV_SLOTS = Object.freeze([7,17]);
export const DEFAULT_EVOLUTION_LAYOUT = Object.freeze([
    ...DEFAULT_EVOLUTION_SLOTS.slice(0,5), 'magnet', 'gravitationalSort', null, 'sandpile', 'erosion',
    'spiral', 'breathe', 'turing', 'cymatics', null, null, null, null, 'nudgeBrighter', null
]);
// Older ten/twenty-place preferences remain readable. Upgrade once: layouts
// already reserving the two navigation places keep their exact assignments.
function reserveNavigation(slots) {
    if(INTERNAL_NAV_SLOTS.every(i=>slots[i]===null))return slots;
    const source=[...slots];
    slots[5]=source[6];slots[6]=source[7];slots[7]=null;slots[17]=null;
    for(const [id,preferred] of [[source[5],10],[source[17],18]]){
        if(id===null)continue;
        let at=slots[preferred]===null?preferred:slots.findIndex((v,i)=>i>=10&&v===null&&!INTERNAL_NAV_SLOTS.includes(i));
        if(at<0)at=slots.findIndex((v,i)=>v===null&&!INTERNAL_NAV_SLOTS.includes(i));
        slots[at]=id;
    }
    return slots;
}
export const evolutionControlId = id => id === 'nudgeDarker' ? 'nudgeBrighter' : id;
// Add the newly movable Nudge without moving any existing saved assignment.
function addNudge(slots) {
    if (!slots.includes('nudgeBrighter')) {
        const target = slots[18] === null ? 18 : slots.findIndex((v,i)=>v===null&&!INTERNAL_NAV_SLOTS.includes(i));
        slots[target] = 'nudgeBrighter';
    }
    return slots;
}
export function validateEvolutionSlots(value=DEFAULT_EVOLUTION_LAYOUT) {
    if(!Array.isArray(value))throw new Error('Invalid evolution drawer slots');
    if(value.length===20){
        const slots=value.map(id=>id===null?null:evolutionControlId(id));
        const assigned=slots.filter(id=>id!==null);
        if(new Set(assigned).size!==assigned.length||assigned.some(id=>!EVOLUTION_CATALOG.some(e=>e.id===id)))throw new Error('Invalid evolution drawer slots');
        const missing=EVOLUTION_CATALOG.filter(e=>!assigned.includes(e.id));
        if(missing.length===0)return reserveNavigation(slots);
        if(missing.length===1&&missing[0].id==='nudgeBrighter')return reserveNavigation(addNudge(slots));
        throw new Error('Invalid evolution drawer slots');
    }
    if(value.length!==10||new Set(value).size!==10||value.some(id=>!EVOLUTION_CATALOG.some(e=>e.id===evolutionControlId(id))))throw new Error('Invalid evolution drawer slots');
    // Historical ten-slot layouts could contain both Nudge directions. Keep the
    // first unified Nudge position and fill only the now-duplicate position.
    const seen=new Set(),slots=value.map(id=>{id=evolutionControlId(id);if(seen.has(id))return null;seen.add(id);return id;});
    for(let index=0;index<slots.length;index++)if(slots[index]===null)slots[index]=EVOLUTION_CATALOG.find(e=>!slots.includes(e.id)).id;
    const remaining=EVOLUTION_CATALOG.filter(e=>e.id!=='nudgeBrighter'&&!slots.includes(e.id)).map(e=>e.id);
    return reserveNavigation(addNudge([...slots,...remaining,...Array(10-remaining.length).fill(null)]));
}
export function assignEvolutionSlot(value,slot,id) {
    const slots=validateEvolutionSlots(value);
    id=evolutionControlId(id);
    if(!Number.isInteger(slot)||slot<0||slot>=20||INTERNAL_NAV_SLOTS.includes(slot)||!EVOLUTION_CATALOG.some(e=>e.id===id))throw new Error('Invalid evolution drawer assignment');
    const previous=slots.indexOf(id);
    if(previous>=0)slots[previous]=slots[slot];
    slots[slot]=id;return slots;
}
export function moveEvolutionSlot(value,from,to) {
    const slots=validateEvolutionSlots(value);
    if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||from>=20||to<0||to>=20||INTERNAL_NAV_SLOTS.includes(from)||INTERNAL_NAV_SLOTS.includes(to)||slots[from]===null)throw new Error('Invalid evolution drawer move');
    [slots[from],slots[to]]=[slots[to],slots[from]];
    return slots;
}
