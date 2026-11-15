// Version 1: image-driven fluid velocity and conservative discrete pigment transport.
// Coarse velocity is checkpoint state; scratch buffers are derived and reusable.
export const INITIAL_INK_RULES = Object.freeze({flow:65,swirl:65,viscosity:25});
const MAX_GRID = 33;
export function validateInkRules(value = INITIAL_INK_RULES) {
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!Object.hasOwn(INITIAL_INK_RULES,key)))throw Error('Invalid Ink rules');
    const rules={...INITIAL_INK_RULES,...value};
    for(const v of Object.values(rules))if(!Number.isInteger(v)||v<0||v>100)throw Error('Invalid Ink rules');
    return rules;
}
export function createInkState(n) {
    if(!Number.isInteger(n)||n<1||n>327)throw Error('Invalid Ink board size');
    const g=Math.min(n,MAX_GRID),length=g*g;
    return {inkVersion:1,n,frame:0,vx:Array(length).fill(0),vy:Array(length).fill(0),density:Array(length).fill(0)};
}
export function restoreInkState(value) {
    if(!value||value.inkVersion!==1||!Number.isInteger(value.frame)||value.frame<0||!Number.isSafeInteger(value.frame))throw Error('Invalid Ink state');
    const state=createInkState(value.n),length=state.vx.length;
    for(const key of ['vx','vy','density']){
        const bound=key==='density'?1:2;
        if(!Array.isArray(value[key])||value[key].length!==length||value[key].some(v=>!Number.isFinite(v)||Math.abs(v)>bound||(key==='density'&&v<0)))throw Error('Invalid Ink state');
        state[key]=value[key].map(Math.fround);
    }
    state.frame=value.frame;return state;
}
export function validateInkSnapshot(value) {
    if(!value||value.inkVersion!==1)throw Error('Invalid Ink snapshot');
    return {inkVersion:1,rules:validateInkRules(value.rules),state:restoreInkState(value.state)};
}
let scratch;
const norm=(k,p)=>((k%p)+p)%p;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function bilinear(values,g,x,y){
    x=clamp(x,0,g-1);y=clamp(y,0,g-1);
    const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(g-1,x0+1),y1=Math.min(g-1,y0+1),fx=x-x0,fy=y-y0;
    return (values[y0*g+x0]*(1-fx)+values[y0*g+x1]*fx)*(1-fy)+(values[y1*g+x0]*(1-fx)+values[y1*g+x1]*fx)*fy;
}
function choice(i,frame){let h=(Math.imul(i+1,0x85ebca6b)^Math.imul(frame+1,0x9e3779b1))>>>0;h=Math.imul(h^(h>>>16),0x7feb352d);h=Math.imul(h^(h>>>15),0x846ca68b);return ((h^(h>>>16))>>>0)/4294967296;}
export function runInkGeneration({n,currentBoardState:board,currentPalette,inkRules=INITIAL_INK_RULES},state){
    if(!state||state.n!==n)state=createInkState(n);
    const g=Math.min(n,MAX_GRID),length=g*g,p=Math.max(1,currentPalette.length),scale=n>1?(g-1)/(n-1):0;
    if(!scratch||scratch.n!==n){scratch={n,moved:new Uint8Array(n*n)};for(const key of ['mass','weights','ux','uy','nx','ny','div','pa','pb'])scratch[key]=new Float32Array(length);}
    const {mass,weights,ux,uy,nx,ny,div,moved}=scratch;mass.fill(0);weights.fill(0);moved.fill(0);
    // Read the live artwork every generation. A new brush stroke immediately
    // changes density and injects momentum; no hidden brush/clock input is needed.
    for(let i=0;i<n*n;i++){
        const tile=board[i];if(tile.isGold)continue;
        const x=(i%n)*scale,y=Math.floor(i/n)*scale,x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(g-1,x0+1),y1=Math.min(g-1,y0+1),fx=x-x0,fy=y-y0;
        const rank=norm(tile.k,p)/Math.max(1,p-1);
        let at=y0*g+x0,w=(1-fx)*(1-fy);mass[at]+=rank*w;weights[at]+=w;
        at=y0*g+x1;w=fx*(1-fy);mass[at]+=rank*w;weights[at]+=w;
        at=y1*g+x0;w=(1-fx)*fy;mass[at]+=rank*w;weights[at]+=w;
        at=y1*g+x1;w=fx*fy;mass[at]+=rank*w;weights[at]+=w;
    }
    let mean=0;for(let i=0;i<length;i++){mass[i]=weights[i]?mass[i]/weights[i]:0;mean+=mass[i];}mean/=length;
    const flow=inkRules.flow/100,swirl=inkRules.swirl/100,viscosity=inkRules.viscosity/100;
    for(let r=0;r<g;r++)for(let c=0;c<g;c++){
        const i=r*g+c,l=r*g+Math.max(0,c-1),rr=r*g+Math.min(g-1,c+1),u=Math.max(0,r-1)*g+c,d=Math.min(g-1,r+1)*g+c;
        const dx=(mass[rr]-mass[l])*.5,dy=(mass[d]-mass[u])*.5,change=mass[i]-state.density[i];
        const smoothX=(state.vx[l]+state.vx[rr]+state.vx[u]+state.vx[d])*.25;
        const smoothY=(state.vy[l]+state.vy[rr]+state.vy[u]+state.vy[d])*.25;
        ux[i]=clamp((state.vx[i]*(1-viscosity*.25)+smoothX*viscosity*.25)*.985 + dy*swirl*.32 + change*dy*swirl*.8,-2,2);
        uy[i]=clamp((state.vy[i]*(1-viscosity*.25)+smoothY*viscosity*.25)*.985 - dx*swirl*.32 - (mass[i]-mean)*flow*.12 - change*flow*.3,-2,2);
    }
    // Advect momentum, then project out compression using a small pressure grid.
    for(let r=0;r<g;r++)for(let c=0;c<g;c++){const i=r*g+c;nx[i]=bilinear(ux,g,c-ux[i]*.5,r-uy[i]*.5);ny[i]=bilinear(uy,g,c-ux[i]*.5,r-uy[i]*.5);}
    for(let r=0;r<g;r++)for(let c=0;c<g;c++){
        const i=r*g+c,l=r*g+Math.max(0,c-1),rr=r*g+Math.min(g-1,c+1),u=Math.max(0,r-1)*g+c,d=Math.min(g-1,r+1)*g+c;
        div[i]=(nx[rr]-nx[l]+ny[d]-ny[u])*.5;
    }
    let pa=scratch.pa,pb=scratch.pb;pa.fill(0);pb.fill(0);
    for(let iteration=0;iteration<10;iteration++){
        for(let r=0;r<g;r++)for(let c=0;c<g;c++){
            const i=r*g+c;pb[i]=(pa[r*g+Math.max(0,c-1)]+pa[r*g+Math.min(g-1,c+1)]+pa[Math.max(0,r-1)*g+c]+pa[Math.min(g-1,r+1)*g+c]-div[i])*.25;
        }
        const saved=pa;pa=pb;pb=saved;
    }
    for(let r=0;r<g;r++)for(let c=0;c<g;c++){
        const i=r*g+c;
        state.vx[i]=Math.fround(c===0||c===g-1?0:clamp(nx[i]-(pa[r*g+Math.min(g-1,c+1)]-pa[r*g+Math.max(0,c-1)])*.5,-2,2));
        state.vy[i]=Math.fround(r===0||r===g-1?0:clamp(ny[i]-(pa[Math.min(g-1,r+1)*g+c]-pa[Math.max(0,r-1)*g+c])*.5,-2,2));
        state.density[i]=mass[i];
    }
    const cellScale=g>1?(n-1)/(g-1):0,maxStep=Math.min(1,n/249),frame=state.frame;
    for(let cursor=0;cursor<n*n;cursor++){
        const i=frame%2?(n*n-1-cursor):cursor;if(moved[i]||board[i].isGold)continue;
        const r=Math.floor(i/n),c=i%n,rank=norm(board[i].k,p);
        let x=bilinear(state.vx,g,c*scale,r*scale)*cellScale*flow*.6;
        let y=bilinear(state.vy,g,c*scale,r*scale)*cellScale*flow*.6;
        const speed=Math.hypot(x,y);if(speed>maxStep){x*=maxStep/speed;y*=maxStep/speed;}
        const ax=Math.abs(x),ay=Math.abs(y),diagonal=Math.min(ax,ay),primary=Math.max(ax,ay)-diagonal,random=choice(i,frame);
        let dr=0,dc=0;if(random<diagonal){dr=Math.sign(y);dc=Math.sign(x);}else if(random<diagonal+primary){if(ax>ay)dc=Math.sign(x);else dr=Math.sign(y);}else continue;
        const row=r+dr,col=c+dc;if(row<0||row>=n||col<0||col>=n)continue;const j=row*n+col;
        // Rank-dependent mobility makes sorting alter the actual flow, while
        // whole-tile exchanges retain every original pigment and protected cell.
        if(moved[j]||board[j].isGold||rank<=norm(board[j].k,p))continue;
        const saved=board[i];board[i]=board[j];board[j]=saved;moved[i]=moved[j]=1;
    }
    state.frame++;
    return {nextBoardState:board,nextInkState:state};
}
