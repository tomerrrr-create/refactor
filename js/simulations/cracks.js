import { getLuminance } from '../colors.js';
import { DEFAULT_CRACKS_GROWTH } from '../cracks-settings.js';
// Original palette order breaks equal-luminance ties exactly like the default
// stable luminance sort. Resolve its color back into the current sorted palette.
export function getCracksLineIndex({currentPalette,originalPalette=currentPalette,contourRules,cracksBrush}) {
    if(contourRules.lineColor==='brush')return Math.max(0,currentPalette.indexOf(cracksBrush?.color));
    if(contourRules.lineColor==='lightest')return currentPalette.length-1;
    if(contourRules.lineColor!=='original-anchor')return 0;
    let anchor=originalPalette[0],light=getLuminance(anchor);
    for(let i=1;i<originalPalette.length;i++){
        const candidate=getLuminance(originalPalette[i]);
        if(candidate<light){anchor=originalPalette[i];light=candidate;}
    }
    return Math.max(0,currentPalette.indexOf(anchor));
}
// Sparse immutable chunks: 256 visited cells in each 64-character hex string.
// Copies only the small chunk directory and edited strings; history shares the rest.
function rainbowMode(context){return context.contourRules.lineColor==='brush' && context.cracksBrush?.rainbow===true;}
function trailHas(state,index){const chunk=state?.rainbowTrail?.[Math.floor(index/256)];return !!(parseInt(chunk?.[Math.floor(index%256/4)]||'0',16)&(1<<(index%4)));}
function trailEditor(state){
    let copied=false;
    return (index,visited)=>{
        const key=Math.floor(index/256),at=Math.floor(index%256/4),mask=1<<(index%4),old=state.rainbowTrail?.[key]??'0'.repeat(64),bits=parseInt(old[at],16),next=visited?bits|mask:bits&~mask;
        if(next===bits)return;
        if(!copied){state.rainbowTrail={...state.rainbowTrail};copied=true;}
        const chunk=old.slice(0,at)+next.toString(16)+old.slice(at+1);
        if(/^0+$/.test(chunk))delete state.rainbowTrail[key];else state.rainbowTrail[key]=chunk;
    };
}
function validTrail(value,n){
    if(value===undefined)return true;
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>Math.ceil(n*n/256))return false;
    return Object.entries(value).every(([key,chunk])=>{
        if(!/^(0|[1-9][0-9]*)$/.test(key)||Number(key)>=Math.ceil(n*n/256)||typeof chunk!=='string'||!/^[0-9a-f]{64}$/.test(chunk))return false;
        const start=Number(key)*256;
        if(start+256<=n*n)return true;
        for(let bit=n*n-start;bit<256;bit++)if(parseInt(chunk[Math.floor(bit/4)],16)&(1<<(bit%4)))return false;
        return true;
    });
}
// Experimental branching fractures. All runtime state is small and serializable;
// board colors are the collision surface, so live drawing participates directly.
export function createCracksState(n, seed = 0x51f15e) {
    return { version: 3, n, random: seed >>> 0 || 1, steps: 0, roots: 0, tips: [], pendingSeed: null };
}
export function restoreCracksState(value) {
    if (!value || ![1,2,3].includes(value.version) || !Number.isInteger(value.n) || value.n < 1 || value.n > 327 ||
        !Number.isInteger(value.random) || value.random < 1 || value.random > 0xffffffff ||
        !Number.isSafeInteger(value.steps) || value.steps < 0 || !Number.isSafeInteger(value.roots) || value.roots < 0 ||
        (value.version >= 2 && value.pendingSeed !== null && (!Number.isInteger(value.pendingSeed) || value.pendingSeed < 0 || value.pendingSeed >= value.n*value.n)) ||
        !validTrail(value.rainbowTrail,value.n) ||
        !Array.isArray(value.tips) || value.tips.length > 48 || value.tips.some(t =>
            ![t.x,t.y,t.angle].every(Number.isFinite) || t.x < 0 || t.x >= value.n || t.y < 0 || t.y >= value.n ||
            !Number.isSafeInteger(t.age) || t.age < 0)) throw new Error('Invalid cracks state');
    return { ...value, ...(value.rainbowTrail ? {rainbowTrail:{...value.rainbowTrail}} : {}), tips: value.tips.map(t => ({...t})) };
}
function materialResistance(state, rules, paletteLength, k) {
    if(state.version<3 || !rules.material?.enabled || !rules.material.strength)return 0;
    return (1-Math.max(0,Math.min(1,k/Math.max(1,paletteLength-1))))*rules.material.strength/100;
}
// Explicit Play/settings changes can revive an exhausted run. Search only on
// those actions, never per frame, and leave surviving tips/old recipes intact.
export function prepareCracksResume(context, previous) {
    if (!previous || previous.version < 3 || previous.steps === 0 || previous.tips.length || previous.pendingSeed !== null) return previous;
    const {n,currentBoardState:board,currentPalette,contourRules}=context;
    if (previous.n !== n) return previous;
    const line=getCracksLineIndex(context);
    const available=i=>i>=0&&i<n*n&&!board[i].isGold&&(rainbowMode(context)?!trailHas(previous,i):board[i].k!==line)&&materialResistance(previous,contourRules,currentPalette.length,board[i].k)<.5;
    const start=previous.random%(n*n);
    for(let offset=0;offset<n*n;offset++) {
        const i=(start+offset)%(n*n),x=i%n,y=Math.floor(i/n);
        if(available(i)&&((x>0&&available(i-1))||(x<n-1&&available(i+1))||(y>0&&available(i-n))||(y<n-1&&available(i+n)))) {
            return {...previous,roots:0,pendingSeed:i};
        }
    }
    return previous;
}
// Merge painted targets between generations independent of brush packet grouping.
// Painting queues a nucleus; it does not change pixels or advance the simulation.
// Version-1 recordings retain their original finite-root behavior.
export function queueCracksGrowth(context, previous, changes) {
    const {n,currentBoardState:board,currentPalette,contourRules}=context;
    const previousState=previous?.n===n ? previous : createCracksState(n);
    if(previousState.version<2)return previousState;
    const state={...previousState};
    const edit=trailEditor(state);
    const painted=[...changes];for(const change of painted)if(Number.isInteger(change.i)&&change.i>=0&&change.i<n*n)edit(change.i,false);
    const line=getCracksLineIndex(context);
    const available=i=>Number.isInteger(i)&&i>=0&&i<n*n&&board[i]&&!board[i].isGold&&(rainbowMode(context)?!trailHas(state,i):board[i].k!==line)&&materialResistance(state,contourRules,currentPalette.length,board[i].k)<.5;
    let seed=available(state.pendingSeed)?state.pendingSeed:null;
    for(const change of painted)if(available(change.i)&&(seed===null||change.i<seed))seed=change.i;
    if(seed===null)return state;
    return {...state,roots:0,pendingSeed:seed};
}
export function runCracksGeneration(context, previous) {
    const {n,currentBoardState,currentPalette,contourRules}=context;
    const state = previous?.n === n ? restoreCracksState(previous) : createCracksState(n);
    const growth = state.version>=3 ? contourRules.growth ?? DEFAULT_CRACKS_GROWTH : DEFAULT_CRACKS_GROWTH;
    const random = () => { let x=state.random; x^=x<<13;x^=x>>>17;x^=x<<5;state.random=x>>>0;return state.random/0x100000000; };
    const line = getCracksLineIndex(context),rainbow=rainbowMode(context),editTrail=trailEditor(state);
    let board=currentBoardState;
    const available = index => index>=0 && index<n*n && !board[index].isGold && (rainbow?!trailHas(state,index):board[index].k!==line);
    const resistance=index=>materialResistance(state,contourRules,currentPalette.length,board[index].k);
    const materialAvailable=index=>available(index)&&resistance(index)<.5;
    const paint = index => {
        if(board===currentBoardState)board=currentBoardState.slice();
        const color=rainbow?Math.floor(random()*currentPalette.length):line;
        board[index]={...board[index],k:color,v:color};editTrail(index,rainbow);
    };
    // A few nuclei, preferably inside material. Bounded sampling avoids scanning
    // or duplicating a 249x249 board on every frame, including an empty canvas.
    const rootLimit=Math.min(16,Math.max(3,Math.ceil(n/18)));
    const paintedSeed=state.version>=2 ? state.pendingSeed : null;
    if(state.version>=2)state.pendingSeed=null;
    if(paintedSeed!==null || (state.roots<rootLimit && (state.steps===0 || state.steps%12===0 || !state.tips.length))) {
        for(let attempt=0;attempt<96;attempt++) {
            let index;
            if(paintedSeed!==null && attempt===0 && materialAvailable(paintedSeed)) {
                // Prefer an interior cell of the new patch to an edge, so both
                // initial tips have room. This bounded 3x3 search runs once.
                index=paintedSeed;
                const sx=paintedSeed%n,sy=Math.floor(paintedSeed/n);
                search:for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++) {
                    const x=sx+dx,y=sy+dy,i=y*n+x;
                    if(x>0&&y>0&&x<n-1&&y<n-1&&[i,i-1,i+1,i-n,i+n].every(materialAvailable)){index=i;break search;}
                }
            } else index=Math.floor(random()*n*n);
            if(!materialAvailable(index))continue;
            const x=index%n,y=Math.floor(index/n);
            const inside=x>0&&y>0&&x<n-1&&y<n-1&&[index-1,index+1,index-n,index+n].every(materialAvailable);
            if(!inside&&attempt<80&&!(paintedSeed!==null&&attempt===0))continue;
            paint(index);const angle=random()*Math.PI*2;
            state.tips.push({x,y,angle,age:0},{x,y,angle:angle+Math.PI,age:0});state.roots++;break;
        }
    }
    const next=[];
    for(const tip of state.tips) {
        let angle=tip.angle+(random()-.5)*.24*(growth.curvature/100);
        const project=direction=>{
            let x=tip.x,y=tip.y;const old=Math.round(y)*n+Math.round(x);
            for(let i=0;i<3;i++){x+=Math.cos(direction)*.65;y+=Math.sin(direction)*.65;if(Math.round(y)*n+Math.round(x)!==old)break;}
            const col=Math.round(x),row=Math.round(y);
            return {x,y,col,row,index:row*n+col,valid:col>=0&&col<n&&row>=0&&row<n};
        };
        let target=project(angle);
        // Original collision rules still apply to line-colored and gold cells.
        if(!target.valid||!available(target.index))continue;
        if(state.version>=3&&contourRules.material?.enabled&&contourRules.material.strength>0){
            let best=target,bestAngle=angle,cost=resistance(target.index),found=cost<.5;
            // Hard colors are barriers. Nearby softer lanes may bend the tip;
            // there is no board scan or random mutation of the existing artwork.
            if(cost>.2)for(const turn of [-.45,.45,-.9,.9,-1.35,1.35]){
                const candidate=project(angle+turn);
                if(!candidate.valid||!materialAvailable(candidate.index))continue;
                const score=resistance(candidate.index)+Math.abs(turn)*.12;
                if(!found||score<cost-.04){best=candidate;bestAngle=angle+turn;cost=score;found=true;}
            }
            if(!found)continue;
            target=best;angle=bestAngle;
            // Slow down in resistant material, retaining the live tip to retry.
            if(random()<resistance(target.index)*.8){next.push({...tip,angle});continue;}
        }
        const {x,y,col,row}=target;
        paint(row*n+col);const age=tip.age+1;
        next.push({x:Math.max(0,Math.min(n-1,x)),y:Math.max(0,Math.min(n-1,y)),angle,age});
        if(age%growth.branchInterval===0&&next.length<46&&random()<growth.branchChance/100)next.push({x:col,y:row,angle:angle+(random()<.5?-1:1)*(0.65+random()*.55),age:0});
    }
    state.tips=next.slice(0,48);state.steps++;
    return { nextBoardState:board, nextCracksState:state };
}
