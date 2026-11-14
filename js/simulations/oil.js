// Conservative lattice phase separation: pigments exchange places at their interfaces
// through diffusion when that lowers interfacial energy. No pixels or replacement colors are added.
export const INITIAL_OIL_RULES = Object.freeze({tension:80,drift:20,mobility:70});
export function validateOilRules(value = INITIAL_OIL_RULES) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        Object.keys(value).some(key => !Object.hasOwn(INITIAL_OIL_RULES,key))) throw Error('Invalid Oil rules');
    const rules = {...INITIAL_OIL_RULES,...value};
    for (const v of Object.values(rules)) if (!Number.isInteger(v) || v<0 || v>100) throw Error('Invalid Oil rules');
    return rules;
}
export function createOilState(n) {
    if (!Number.isInteger(n) || n<1 || n>327) throw Error('Invalid Oil board size');
    return {oilVersion:1,n,frame:0};
}
export function restoreOilState(value) {
    if (!value || value.oilVersion!==1 || !Number.isSafeInteger(value.frame) || value.frame<0) throw Error('Invalid Oil state');
    return {...createOilState(value.n),frame:value.frame};
}
export function validateOilSnapshot(value) {
    if (!value || value.oilVersion!==1) throw Error('Invalid Oil snapshot');
    return {oilVersion:1,rules:validateOilRules(value.rules),state:restoreOilState(value.state)};
}
const directions = [[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1]];
const kernel=Array.from({length:7},(_,i)=>Math.exp(-((i-3)**2)/4));
const rankOf = (k,p) => ((k%p)+p)%p;
const phaseOf = (k,p) => Math.min(3,Math.floor(rankOf(k,p)*4/p));
const cost = (a,b) => a===b ? 0 : 1 + Math.abs(a-b)*.08;
function random(i,frame,salt=0) {
    let h=(Math.imul(i+1,0x85ebca6b)^Math.imul(frame+1,0x9e3779b1)^salt)>>>0;
    h=Math.imul(h^(h>>>16),0x7feb352d);h=Math.imul(h^(h>>>15),0x846ca68b);
    return ((h^(h>>>16))>>>0)/4294967296;
}
let scratch;
// Recompute phase neighborhoods from the LIVE artwork. Separable convolution
// avoids rescanning the full neighborhood for every proposed exchange.
function buildFields(board,n,phase,fields,temp,boundaries) {
    const length=n*n;fields.fill(0);temp.fill(0);boundaries.length=0;
    for(let r=0;r<n;r++)for(let c=0;c<n;c++) {
        const i=r*n+c;
        if(!board[i].isGold && ((c>0&&phase[i-1]!==phase[i])||(c+1<n&&phase[i+1]!==phase[i])||
            (r>0&&phase[i-n]!==phase[i])||(r+1<n&&phase[i+n]!==phase[i])))boundaries.push(i);
        for(let dx=-3;dx<=3;dx++) {
            const x=c+dx;if(x<0||x>=n)continue;const at=r*n+x;
            if(!board[at].isGold)temp[phase[at]*length+i]+=kernel[dx+3];
        }
    }
    for(let p=0;p<4;p++)for(let r=0;r<n;r++)for(let c=0;c<n;c++) {
        const i=r*n+c;let sum=0;
        for(let dy=-3;dy<=3;dy++){const y=r+dy;if(y>=0&&y<n)sum+=temp[p*length+y*n+c]*kernel[dy+3];}
        fields[p*length+i]=sum;
    }
}
function localCost(fields,length,i,p) {
    let sum=0;for(let phase=0;phase<4;phase++)sum+=cost(p,phase)*fields[phase*length+i];return sum;
}
function updateFields(fields,n,r,c,a,b) {
    const length=n*n;
    for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++) {
        const y=r+dy,x=c+dx;if(y<0||y>=n||x<0||x>=n)continue;
        const at=y*n+x,weight=kernel[dy+3]*kernel[dx+3];
        fields[a*length+at]-=weight;fields[b*length+at]+=weight;
    }
}
export function runOilGeneration({n,currentBoardState:board,currentPalette,oilRules=INITIAL_OIL_RULES},state) {
    if (!state || state.n!==n) state=createOilState(n);
    const p=Math.max(1,currentPalette.length),length=n*n;
    if (!scratch || scratch.n!==n) scratch={n,phase:new Uint8Array(length),moved:new Uint8Array(length),fields:new Float64Array(length*4),temp:new Float64Array(length*4),boundaries:[]};
    const {phase,moved,fields,temp,boundaries}=scratch;moved.fill(0);
    for (let i=0;i<length;i++) phase[i]=phaseOf(board[i].k,p);
    const tension=oilRules.tension/100,drift=oilRules.drift/100,mobility=oilRules.mobility/100;
    if(mobility===0 || (tension===0&&drift===0)){state.frame++;return {nextBoardState:board,nextOilState:state};}
    buildFields(board,n,phase,fields,temp,boundaries);
    for(let cursor=0;cursor<boundaries.length;cursor++) {
        const i=boundaries[state.frame%2?boundaries.length-1-cursor:cursor];
        if(moved[i] || random(i,state.frame)>mobility)continue;
        const r=Math.floor(i/n),c=i%n;let j;
        if(random(i,state.frame,0x27d4eb2d)<.35) {
            // Diffusion between interface sites lets pigment leave convex tips
            // and fill necks. It also permits slower coarsening between drops.
            j=boundaries[Math.floor(random(i,state.frame,0x165667b1)*boundaries.length)];
        }else{
            const [dr,dc]=directions[Math.floor(random(i,state.frame,0x51ed270b)*8)];
            const row=r+dr,col=c+dc;if(row<0||row>=n||col<0||col>=n)continue;j=row*n+col;
        }
        const a=phase[i],b=phase[j];
        if(i===j || moved[j] || board[j].isGold || a===b)continue;
        const row=Math.floor(j/n),col=j%n,dy=row-r,dx=col-c;
        const mutual=Math.abs(dy)<=3&&Math.abs(dx)<=3?kernel[dy+3]*kernel[dx+3]:0;
        // Fields include self and the shared pair. Correct both contributions
        // so this is the actual change in symmetric interfacial energy.
        const delta=localCost(fields,length,i,b)-localCost(fields,length,i,a)+
            localCost(fields,length,j,a)-localCost(fields,length,j,b)+2*cost(a,b)*(mutual-1);
        const buoyancy=(rankOf(board[i].k,p)-rankOf(board[j].k,p))/Math.max(1,p-1)*Math.max(-1,Math.min(1,dy));
        if(tension*delta+drift*buoyancy*.8>1e-8)continue;
        const tile=board[i];board[i]=board[j];board[j]=tile;phase[i]=b;phase[j]=a;moved[i]=moved[j]=1;
        updateFields(fields,n,r,c,a,b);updateFields(fields,n,row,col,b,a);
    }
    state.frame++;
    return {nextBoardState:board,nextOilState:state};
}
