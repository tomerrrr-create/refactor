import {createCloudField,createCosmicField} from './cymatics-organic.js';
import {moveCymaticsField} from './cymatics-motion.js';
import {createInterferenceField} from './cymatics-interference.js';
import {createCircularResonanceField} from './cymatics-circular.js';
import {validateCymaticsRules} from '../cymatics-settings.js';
// Chladni-inspired square plate, not an acoustic solver. Only a derived field is
// cached; serializable PRNG state and steps determine every particle exchange.
let fieldSize=0,fieldPattern='',field=null;
// Fixed virtual square plate: bending-mode frequencies grow with m²+k².
// 40 Hz is a chosen plate calibration, not a universal frequency-to-shape law.
const resonanceModes=[];
for(let m=1;m<=20;m++)for(let k=m+1;k<=20;k++)if(40*(m*m+k*k)<=24000)resonanceModes.push([m,k,40*(m*m+k*k)]);
export function getCymaticsField(n,frequency,resonanceVersion,phaseStep=0){
    if(resonanceVersion===5)return createCloudField(n,frequency,phaseStep);
    if(resonanceVersion===6)return createCosmicField(n,frequency,phaseStep);
    if(resonanceVersion===4)return createInterferenceField(n,frequency,phaseStep);
    const base=getStaticCymaticsField(n,frequency,resonanceVersion);
    return frequency!==undefined&&phaseStep!==0?moveCymaticsField(base,n,resonanceVersion??1,phaseStep):base;
}
function getStaticCymaticsField(n,frequency,resonanceVersion){
    if(resonanceVersion===3){
        const key='resonance-v3:'+frequency;
        if(field&&fieldSize===n&&fieldPattern===key)return field;
        field=createCircularResonanceField(n,frequency);fieldSize=n;fieldPattern=key;return field;
    }
    if(resonanceVersion===2)return getVariedResonanceField(n,frequency);
    if(frequency!==undefined)return getResonanceField(n,frequency);
    throw new Error('Resonance requires a frequency');
}

function getResonanceField(n,frequency){
    if(!Number.isInteger(n)||n<1||n>327||!Number.isInteger(frequency)||frequency<20||frequency>20000)throw new Error('Invalid resonance field');
    const key='resonance:'+frequency;
    if(field&&fieldSize===n&&fieldPattern===key)return field;
    // Damped independent modes: sum their time-averaged squared amplitudes.
    // Normalize weights to avoid a flat, numerically vanishing off-resonance map.
    const weights=resonanceModes.map(([m,k,f])=>{const ratio=frequency/f;return 1/((1-ratio*ratio)**2+(.12*ratio)**2);});
    const maximum=Math.max(...weights),selected=resonanceModes.map((mode,i)=>({mode,weight:weights[i]/maximum})).filter(v=>v.weight>=.015);
    const cos=Array.from({length:21},(_,m)=>Float64Array.from({length:n},(_,i)=>Math.cos(m*Math.PI*(i+.5)/n)));
    const energy=new Float64Array(n*n);let peak=0;
    for(const {mode:[m,k],weight} of selected)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
        const a=cos[m][x]*cos[k][y]-cos[k][x]*cos[m][y];energy[y*n+x]+=weight*a*a;
    }
    for(const e of energy)if(e>peak)peak=e;
    field=Uint16Array.from(energy,e=>peak?Math.round(e/peak*65535):0);fieldSize=n;fieldPattern=key;return field;
}
// General rectangular standing modes, including axial stripes (m=0 or k=0).
// A fixed off-center drive couples differently to horizontal and vertical modes;
// no antisymmetric subtraction forces every mode onto the same diagonal.
const variedModes=[];
for(let m=0;m<=24;m++)for(let k=0;k<=24;k++){
    const frequency=40*(m*m+k*k);
    if(frequency>0&&frequency<=24000)variedModes.push({m,k,frequency,coupling:Math.cos(m*Math.PI*.27)*Math.cos(k*Math.PI*.41)});
}
function getVariedResonanceField(n,frequency){
    if(!Number.isInteger(n)||n<1||n>327||!Number.isInteger(frequency)||frequency<20||frequency>20000)throw new Error('Invalid resonance field');
    const key='resonance-v2:'+frequency;
    if(field&&fieldSize===n&&fieldPattern===key)return field;
    // Forced damped modal response, weighted by the drive location and stiffness.
    // Independent time-averaged energies avoid phase-dependent flicker.
    const responses=variedModes.map(mode=>{
        const ratio=frequency/mode.frequency;
        return {...mode,weight:mode.coupling**2/(mode.frequency**4*((1-ratio*ratio)**2+(.12*ratio)**2))};
    }).sort((a,b)=>b.weight-a.weight);
    const maximum=responses[0].weight,selected=responses.filter(mode=>mode.weight>=maximum*.015).slice(0,32);
    const cos=Array.from({length:25},(_,m)=>Float64Array.from({length:n},(_,i)=>Math.cos(m*Math.PI*(i+.5)/n)));
    const energy=new Float64Array(n*n);let peak=0;
    for(const {m,k,weight} of selected)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
        const a=cos[m][x]*cos[k][y];energy[y*n+x]+=weight/maximum*a*a;
    }
    for(const e of energy)if(e>peak)peak=e;
    field=Uint16Array.from(energy,e=>peak?Math.round(e/peak*65535):0);fieldSize=n;fieldPattern=key;return field;
}
export function createCymaticsState(n,seed=0x43ad19){
    return restoreCymaticsState({version:1,n,random:seed,steps:0});
}
export function restoreCymaticsState(value){
    if(!value||value.version!==1||!Number.isInteger(value.n)||value.n<1||value.n>327||
       !Number.isInteger(value.random)||value.random<1||value.random>0xffffffff||!Number.isSafeInteger(value.steps)||value.steps<0)throw new Error('Invalid Cymatics state');
    return {version:1,n:value.n,random:value.random,steps:value.steps};
}
export function validateCymaticsSnapshot(value){
    if(!value||value.cymaticsVersion!==1)throw new Error('Invalid Cymatics recording');
    return {cymaticsVersion:1,rules:validateCymaticsRules(value.rules),state:restoreCymaticsState(value.state)};
}
const dx=[-1,0,1,-1,1,-1,0,1],dy=[-1,-1,-1,0,0,1,1,1];
export function runCymaticsGeneration({n,currentBoardState:board,currentPalette,cymaticsRules},previous){
    const rules=validateCymaticsRules(cymaticsRules),state=previous?.n===n?restoreCymaticsState(previous):createCymaticsState(n),energy=getCymaticsField(n,rules.frequency,rules.resonanceVersion,rules.phaseMotion?state.steps:0);
    const random=()=>{let x=state.random;x^=x<<13;x^=x>>>17;x^=x<<5;state.random=x>>>0;return state.random/4294967296;};
    const length=currentPalette.length,rank=k=>((k%length)+length)%length;
    const attempts=Math.max(1,Math.round(n*n*.5*rules.strength/100));
    if(n>1&&length>1)for(let attempt=0;attempt<attempts;attempt++){
        const i=Math.floor(random()*board.length),direction=Math.floor(random()*8),x=i%n+dx[direction],y=Math.floor(i/n)+dy[direction];
        if(x<0||y<0||x>=n||y>=n)continue;
        const j=y*n+x,a=board[i],b=board[j];
        if(a.isGold||b.isGold||(rank(a.k)-rank(b.k))*(energy[i]-energy[j])<=0)continue;
        // Move existing pigments, preserving the color histogram and gold cells.
        const k=a.k,v=a.v??a.k;a.k=b.k;a.v=b.v??b.k;b.k=k;b.v=v;a.prevK=b.prevK=null;
    }
    state.steps++;return {nextBoardState:board,nextCymaticsState:state};
}
