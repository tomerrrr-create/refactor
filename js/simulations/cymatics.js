import {CYMATICS_PATTERNS,validateCymaticsRules} from '../cymatics-settings.js';
// Chladni-inspired square plate, not an acoustic solver. Only a derived field is
// cached; serializable PRNG state and steps determine every particle exchange.
let fieldSize=0,fieldPattern='',field=null;
export function getCymaticsField(n,pattern){
    if(field&&fieldSize===n&&fieldPattern===pattern)return field;
    const pair=CYMATICS_PATTERNS[pattern];if(!Number.isInteger(n)||n<1||n>327||!pair)throw new Error('Invalid Cymatics field');
    const [m,k]=pair,cosM=new Float64Array(n),cosK=new Float64Array(n);
    for(let i=0;i<n;i++){const x=Math.PI*(i+.5)/n;cosM[i]=Math.cos(m*x);cosK[i]=Math.cos(k*x);}
    field=new Uint16Array(n*n);
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
        const amplitude=cosM[x]*cosK[y]-cosK[x]*cosM[y];
        field[y*n+x]=Math.round(Math.min(1,amplitude*amplitude/4)*65535);
    }
    fieldSize=n;fieldPattern=pattern;return field;
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
    const rules=validateCymaticsRules(cymaticsRules),state=previous?.n===n?restoreCymaticsState(previous):createCymaticsState(n),energy=getCymaticsField(n,rules.pattern);
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
