// Toolbar identities only; existing engine, logger and button IDs stay unchanged.
export const PATTERN_EVOLUTIONS = Object.freeze([
    ['crystal', 'btnPenroseCrystal'], ['pinwheel-map', 'btnPinwheelTiles'],
    ['octagonal', 'btnOctagonalCrystal'], ['apollonian', 'btnTangentCircles'], ['voronoi', 'btnVoronoiCells']
].map(([id, button]) => Object.freeze({ id, button, key: `fibonacci_${id}` })));
export const isPatternEvolution = id => PATTERN_EVOLUTIONS.some(pattern => pattern.id === id);

export const EVOLUTION_CATALOG = Object.freeze([
    ['dla','btnDla','help_dla'],['contour','btnContour','cracks_settings_title'],
    ['gameOfLife','btnGameOfLife','help_gameOfLife'],['brightnessEvo','btnBrightnessEvo','help_brightnessEvo'],
    ['islands','btnIslands','help_islands'],['spiral','btnSpiral','help_spiral'],
    ['magnet','btnMagnetModes','help_magnet'],['gravitationalSort','btnGravitationalSort','help_gravitationalSort'],
    ['sandpile','btnSandpile','help_sandpile'],['erosion','btnErosion','help_erosion'],
    ['breathe','btnShowBreatheMenu','help_breathe'],['turing','btnTuring','help_turing'],
    ['cymatics','btnCymatics','help_cymatics'],['nudgeBrighter','btnNudgeBrighter','help_nudge'],
    ['ink','btnInk','help_ink'],['network','btnNetwork','help_network'],['fibonacci','btnFibonacci','help_fibonacci']
].map(([id,button,key])=>Object.freeze({id,button,key})).concat(PATTERN_EVOLUTIONS));
// Historical first-page order, retained for compatibility with ten-slot files.
export const DEFAULT_EVOLUTION_SLOTS = Object.freeze(EVOLUTION_CATALOG.slice(0,10).map(e=>e.id));
export const EVOLUTION_PAGE_SIZE = 10;
export const INTERNAL_NAV_SLOTS = Object.freeze([7,17,27]);
const previousCatalog = EVOLUTION_CATALOG.filter(({ id }) => !isPatternEvolution(id));
const defaultPatternsPage = Object.freeze([...PATTERN_EVOLUTIONS.map(({ id }) => id), null, null, null, null, null]);
// Physical left-to-right order, shared by first launch, factory profiles and Reset.
export const DEFAULT_EVOLUTION_LAYOUT = Object.freeze([
    'sandpile', 'magnet', 'gameOfLife', 'brightnessEvo', 'islands',
    'nudgeBrighter', 'gravitationalSort', null, 'ink', 'erosion',
    'contour', 'dla', 'cymatics', 'network', 'turing',
    'fibonacci', 'spiral', null, 'breathe', null,
    ...defaultPatternsPage
]);
// Older ten/twenty-place preferences remain readable. Upgrade once: layouts
// already reserving the two navigation places keep their exact assignments.
function reserveNavigation(slots) {
    if(slots[7]===null&&slots[17]===null)return slots;
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
function addInk(slots) {
    if(!slots.includes('ink')){
        const target=slots[15]===null?15:slots.findIndex((id,i)=>id===null&&!INTERNAL_NAV_SLOTS.includes(i));
        if(target<0)throw new Error('No space for Ink');
        slots[target]='ink';
    }
    return slots;
}
function addNetwork(slots) {
    if(!slots.includes('network')) {
        const target=slots[10]===null?10:slots.findIndex((id,i)=>id===null&&!INTERNAL_NAV_SLOTS.includes(i));
        if(target<0)throw new Error('No space for Network');
        slots[target]='network';
    }
    return slots;
}
function addFibonacci(slots) {
    if (slots.includes('fibonacci')) return slots;
    const preferred = DEFAULT_EVOLUTION_LAYOUT.indexOf('fibonacci');
    const target = slots[preferred] === null ? preferred : slots.findIndex((id, i) => id === null && !INTERNAL_NAV_SLOTS.includes(i));
    if (target < 0) throw new Error('No space for Fibonacci');
    slots[target] = 'fibonacci';
    return slots;
}
export function validateEvolutionSlots(value=DEFAULT_EVOLUTION_LAYOUT) {
    if(!Array.isArray(value))throw new Error('Invalid evolution drawer slots');
    if (value.length === DEFAULT_EVOLUTION_LAYOUT.length) {
        const slots = value.map(id => id === 'oil' ? null : evolutionControlId(id));
        const assigned = slots.filter(id => id !== null);
        if (assigned.length !== EVOLUTION_CATALOG.length || new Set(assigned).size !== EVOLUTION_CATALOG.length ||
            !EVOLUTION_CATALOG.every(({ id }) => assigned.includes(id)) || !INTERNAL_NAV_SLOTS.every(i => slots[i] === null)) {
            throw new Error('Invalid evolution drawer slots');
        }
        return slots;
    }
    if(value.length===20){
        const slots=value.map(id=>id===null||id==='oil'?null:evolutionControlId(id));
        const assigned=slots.filter(id=>id!==null);
        if(new Set(assigned).size!==assigned.length||assigned.some(id=>!previousCatalog.some(e=>e.id===id)))throw new Error('Invalid evolution drawer slots');
        const missing=previousCatalog.filter(e=>!assigned.includes(e.id));
        if(missing.length===0)return [...reserveNavigation(slots), ...defaultPatternsPage];
        if(missing.every(e=>['nudgeBrighter','ink','network','fibonacci'].includes(e.id)))return [...addFibonacci(addNetwork(addInk(reserveNavigation(addNudge(slots))))), ...defaultPatternsPage];
        throw new Error('Invalid evolution drawer slots');
    }
    if(value.length!==10||new Set(value).size!==10||value.some(id=>id!=='oil'&&!previousCatalog.some(e=>e.id===evolutionControlId(id))))throw new Error('Invalid evolution drawer slots');
    // Historical ten-slot layouts could contain both Nudge directions. Keep the
    // first unified Nudge position and fill only the now-duplicate position.
    const seen=new Set(['oil']),slots=value.map(id=>{id=evolutionControlId(id);if(seen.has(id))return null;seen.add(id);return id;});
    for(let index=0;index<slots.length;index++)if(slots[index]===null)slots[index]=previousCatalog.find(e=>!slots.includes(e.id)).id;
    const remaining=previousCatalog.filter(e=>!['nudgeBrighter','ink','network','fibonacci'].includes(e.id)&&!slots.includes(e.id)).map(e=>e.id);
    return [...addFibonacci(addNetwork(addInk(reserveNavigation(addNudge([...slots,...remaining,...Array(10-remaining.length).fill(null)]))))), ...defaultPatternsPage];
}

// Keep controls moved to drawer three reachable when the feature is off.
// This is a view of the saved map. Re-enabling Patterns restores the saved places.
export function evolutionSlotOrder(slots, showPatterns) {
    const order = slots.map((_, i) => i);
    if (showPatterns) return order;
    for (let from = 2 * EVOLUTION_PAGE_SIZE; from < slots.length; from++) {
        const id = slots[from];
        if (!id || isPatternEvolution(id)) continue;
        const to = order.findIndex((source, i) => i < 2 * EVOLUTION_PAGE_SIZE && !INTERNAL_NAV_SLOTS.includes(i) && (slots[source] === null || isPatternEvolution(slots[source])));
        [order[from], order[to]] = [order[to], order[from]];
    }
    return order;
}
export function assignEvolutionSlot(value,slot,id) {
    const slots=validateEvolutionSlots(value);
    id=evolutionControlId(id);
    if(!Number.isInteger(slot)||slot<0||slot>=slots.length||INTERNAL_NAV_SLOTS.includes(slot)||!EVOLUTION_CATALOG.some(e=>e.id===id))throw new Error('Invalid evolution drawer assignment');
    const previous=slots.indexOf(id);
    if(previous>=0)slots[previous]=slots[slot];
    slots[slot]=id;return slots;
}
export function moveEvolutionSlot(value,from,to) {
    const slots=validateEvolutionSlots(value);
    if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||from>=slots.length||to<0||to>=slots.length||INTERNAL_NAV_SLOTS.includes(from)||INTERNAL_NAV_SLOTS.includes(to)||slots[from]===null)throw new Error('Invalid evolution drawer move');
    [slots[from],slots[to]]=[slots[to],slots[from]];
    return slots;
}
