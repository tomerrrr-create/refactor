// Advected, volume-conserving phase-field droplets. Surface relaxation is a
// mass-corrected Allen–Cahn approximation; flow is driven and pressure-projected.
// This artistic 2D model is separate from the conservative Oil lattice engine.
export const INITIAL_DROPLETS_RULES=Object.freeze({flow:55,tension:75,viscosity:45});
const MAX_GRID=97,UNIT=65535,VELOCITY=4096,GOLD=32768;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const norm=(k,p)=>((k%p)+p)%p;
export function validateDropletsRules(value=INITIAL_DROPLETS_RULES){
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!Object.hasOwn(INITIAL_DROPLETS_RULES,k)))throw Error('Invalid Droplets rules');
    const rules={...INITIAL_DROPLETS_RULES,...value};
    if(Object.values(rules).some(v=>!Number.isInteger(v)||v<0||v>100))throw Error('Invalid Droplets rules');
    return rules;
}
export function createDropletsState(n){
    if(!Number.isInteger(n)||n<1||n>327)throw Error('Invalid Droplets size');
    const size=Math.min(n,MAX_GRID)**2,state={dropletsVersion:1,n,frame:0,initialized:false,background:0,volume:0,palette:[]};
    for(const key of ['phase','red','green','blue'])state[key]=new Uint16Array(size);
    state.vx=new Int16Array(size);state.vy=new Int16Array(size);state.seen=new Uint16Array(n*n);return state;
}
function encode(array){
    const bytes=new Uint8Array(array.length*2);for(let i=0;i<array.length;i++){bytes[i*2]=array[i]&255;bytes[i*2+1]=(array[i]>>>8)&255;}
    let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);
}
function decode(text,array){
    if(typeof text!=='string'||text.length!==Math.ceil(array.length*2/3)*4||!/^[A-Za-z0-9+/]*={0,2}$/.test(text))throw Error('Invalid Droplets field');
    const binary=atob(text);if(binary.length!==array.length*2)throw Error('Invalid Droplets field');
    for(let i=0;i<array.length;i++)array[i]=binary.charCodeAt(i*2)|(binary.charCodeAt(i*2+1)<<8);
}
export function recordDropletsState(state){
    const value={dropletsVersion:1,n:state.n,frame:state.frame,initialized:state.initialized,background:state.background,volume:state.volume,palette:[...state.palette]};
    for(const key of ['phase','red','green','blue','vx','vy','seen'])value[key]=encode(state[key]);return value;
}
export function restoreDropletsState(value){
    if(!value||value.dropletsVersion!==1||!Number.isSafeInteger(value.frame)||value.frame<0||typeof value.initialized!=='boolean'||!Array.isArray(value.palette)||value.palette.length>4096||value.palette.some(c=>typeof c!=='string'||!/^#[\da-f]{6}$/i.test(c)))throw Error('Invalid Droplets state');
    const state=createDropletsState(value.n),p=Math.max(1,value.palette.length);
    if(!Number.isInteger(value.background)||value.background<0||value.background>=p||!Number.isSafeInteger(value.volume)||value.volume<0||value.volume>state.phase.length*UNIT||value.initialized!==Boolean(value.palette.length))throw Error('Invalid Droplets bounds');
    for(const key of ['phase','red','green','blue','vx','vy','seen'])decode(value[key],state[key]);
    let mass=0;for(let i=0;i<state.phase.length;i++){
        mass+=state.phase[i];if(state.red[i]>state.phase[i]||state.green[i]>state.phase[i]||state.blue[i]>state.phase[i]||Math.abs(state.vx[i])>VELOCITY*2||Math.abs(state.vy[i])>VELOCITY*2)throw Error('Invalid Droplets material');
    }
    if(mass!==value.volume||state.seen.some(v=>(v&~GOLD)>=p))throw Error('Invalid Droplets volume or observation');
    Object.assign(state,{frame:value.frame,initialized:value.initialized,background:value.background,volume:value.volume,palette:[...value.palette]});return state;
}
export function validateDropletsSnapshot(value){
    if(!value||value.dropletsVersion!==1)throw Error('Invalid Droplets snapshot');
    return {dropletsVersion:1,rules:validateDropletsRules(value.rules),state:recordDropletsState(restoreDropletsState(value.state))};
}
function rgb(hex){const number=parseInt(hex.slice(1),16);return [(number>>>16)/255,((number>>>8)&255)/255,(number&255)/255];}
function colorCache(palette){return {palette:[...palette],rgb:palette.map(rgb),lookup:new Int16Array(32768).fill(-1)};}
function nearest(cache,r,g,b){
    const qr=clamp(Math.round(r*31),0,31),qg=clamp(Math.round(g*31),0,31),qb=clamp(Math.round(b*31),0,31),key=(qr<<10)|(qg<<5)|qb;
    let index=cache.lookup[key];if(index>=0)return index;
    let distance=Infinity;const rr=qr/31,gg=qg/31,bb=qb/31;
    for(let k=0;k<cache.rgb.length;k++){const c=cache.rgb[k],d=(c[0]-rr)**2+(c[1]-gg)**2+(c[2]-bb)**2;if(d<distance){distance=d;index=k;}}
    cache.lookup[key]=index;return index;
}
function sample(values,g,x,y){
    x=clamp(x,0,g-1);y=clamp(y,0,g-1);const c=Math.floor(x),r=Math.floor(y),cc=Math.min(g-1,c+1),rr=Math.min(g-1,r+1),fx=x-c,fy=y-r;
    return (values[r*g+c]*(1-fx)+values[r*g+cc]*fx)*(1-fy)+(values[rr*g+c]*(1-fx)+values[rr*g+cc]*fx)*fy;
}
let scratch;
function workspace(n,palette){
    const g=Math.min(n,MAX_GRID),size=g*g;
    if(!scratch||scratch.n!==n){
        scratch={n,g,solid:new Uint8Array(size),counts:new Uint32Array(size),rank:new Float32Array(size),labels:new Int32Array(size),regions:new Int32Array(size),parents:new Int32Array(size),queue:new Int32Array(size),targets:new Float64Array(size),sums:new Float64Array(size),weights:new Float64Array(size)};
        for(const key of ['a','r','gColor','b','next','ar','ag','ab','ux','uy','div','pa','pb'])scratch[key]=new Float32Array(size);
    }
    if(!scratch.colors||scratch.colors.palette.length!==palette.length||scratch.colors.palette.some((c,i)=>c!==palette[i]))scratch.colors=colorCache(palette);
    return scratch;
}
function remapPalette(state,palette,board,colors){
    const old=state.palette,p=palette.length;if(old.length===p&&old.every((c,i)=>c===palette[i]))return;
    const oldColors=colorCache(old),lookup=new Map(palette.map((c,i)=>[c,i])),sameColors=old.length===p&&old.every(c=>lookup.has(c)),mapping=new Int16Array(old.length).fill(-1);
    if(sameColors){for(let k=0;k<old.length;k++)mapping[k]=lookup.get(old[k]);}
    else for(let i=0;i<board.length;i++){const k=state.seen[i]&~GOLD;if(mapping[k]<0)mapping[k]=norm(board[i].k,p);}
    for(let k=0;k<mapping.length;k++)if(mapping[k]<0)mapping[k]=k%p;
    if(!sameColors)for(let i=0;i<state.phase.length;i++){
        const a=state.phase[i];if(!a)continue;
        const k=nearest(oldColors,state.red[i]/a,state.green[i]/a,state.blue[i]/a),c=colors.rgb[mapping[k]];
        state.red[i]=Math.round(a*c[0]);state.green[i]=Math.round(a*c[1]);state.blue[i]=Math.round(a*c[2]);
    }
    state.background=mapping[state.background];for(let i=0;i<state.seen.length;i++)state.seen[i]=mapping[state.seen[i]&~GOLD]|(state.seen[i]&GOLD);
    state.palette=[...palette];
}
function initialize(state,board,palette,w){
    const p=palette.length,n=state.n,g=w.g,size=g*g,hist=new Uint32Array(p);for(const t of board)if(!t.isGold)hist[norm(t.k,p)]++;
    let background=0;for(let k=1;k<p;k++)if(hist[k]>hist[background])background=k;
    const dense=hist[background]<board.length*.35;if(dense)background=0;
    state.background=background;state.palette=[...palette];state.initialized=true;
    w.a.fill(0);w.r.fill(0);w.gColor.fill(0);w.b.fill(0);w.rank.fill(0);w.counts.fill(0);
    for(let i=0;i<board.length;i++){
        const t=board[i];if(t.isGold)continue;const k=norm(t.k,p),c=Math.round((i%n)*(g-1)/Math.max(1,n-1)),r=Math.round(Math.floor(i/n)*(g-1)/Math.max(1,n-1)),at=r*g+c;
        w.counts[at]++;w.rank[at]+=k/Math.max(1,p-1);
        if(dense||k!==background){const color=w.colors.rgb[k];w.a[at]++;w.r[at]+=color[0];w.gColor[at]+=color[1];w.b[at]+=color[2];}
    }
    const ranks=Array.from(w.rank,(v,i)=>v/Math.max(1,w.counts[i])).sort((a,b)=>a-b),threshold=ranks[Math.floor(size*.7)]??.7;
    for(let i=0;i<size;i++){
        const count=w.a[i],oil=!w.solid[i]&&(dense?w.rank[i]/Math.max(1,w.counts[i])>=threshold:count>0);
        state.phase[i]=oil?UNIT:0;state.red[i]=oil?Math.round(UNIT*w.r[i]/Math.max(1,count)):0;state.green[i]=oil?Math.round(UNIT*w.gColor[i]/Math.max(1,count)):0;state.blue[i]=oil?Math.round(UNIT*w.b[i]/Math.max(1,count)):0;
    }
    state.volume=state.phase.reduce((s,v)=>s+v,0);state.vx.fill(0);state.vy.fill(0);
}
function addEdits(state,board,w){
    const n=state.n,g=w.g,p=state.palette.length,scale=(g-1)/Math.max(1,n-1);let count=0;
    for(let i=0;i<board.length;i++){
        const actual=norm(board[i].k,p),old=state.seen[i];if(Boolean(old&GOLD)!==Boolean(board[i].isGold)||state.palette[old&~GOLD]!==state.palette[actual])count++;
    }
    if(count>board.length*.35){initialize(state,board,state.palette,w);return;}
    for(let i=0;i<board.length;i++){
        const tile=board[i],k=norm(tile.k,p),old=state.seen[i];if(Boolean(old&GOLD)===Boolean(tile.isGold)&&state.palette[old&~GOLD]===state.palette[k])continue;
        const x=(i%n)*scale,y=Math.floor(i/n)*scale,color=w.colors.rgb[k],erase=tile.isGold||k===state.background;
        for(let r=Math.max(0,Math.floor(y)-1);r<=Math.min(g-1,Math.ceil(y)+1);r++)for(let c=Math.max(0,Math.floor(x)-1);c<=Math.min(g-1,Math.ceil(x)+1);c++){
            const at=r*g+c,d=Math.hypot(c-x,r-y);if(d>1.6)continue;
            const a=w.solid[at]||erase?0:Math.max(state.phase[at],Math.round(UNIT*clamp(1-d/2)));
            state.volume+=a-state.phase[at];state.phase[at]=a;
            state.red[at]=Math.round(a*color[0]);state.green[at]=Math.round(a*color[1]);state.blue[at]=Math.round(a*color[2]);
        }
    }
}
function root(w,id){if(id<0)return -1;let r=id;while(w.parents[r]!==r)r=w.parents[r];while(w.parents[id]!==id){const next=w.parents[id];w.parents[id]=r;id=next;}return r;}
function prepareRegions(state,w){
    const g=w.g,{labels,queue}=w;labels.fill(-1);w.targets.fill(0);w.regionCount=0;
    // Track separate drops before advection. Their volume budgets join only
    // once their diffuse interfaces actually meet, avoiding remote evaporation.
    for(let start=0;start<labels.length;start++){
        if(labels[start]>=0||state.phase[start]<UNIT*.12||w.solid[start])continue;
        const id=w.regionCount++;w.parents[id]=id;let head=0,tail=1;queue[0]=start;labels[start]=id;
        while(head<tail){const i=queue[head++],r=Math.floor(i/g),c=i%g;for(const at of [c?i-1:-1,c+1<g?i+1:-1,r?i-g:-1,r+1<g?i+g:-1])if(at>=0&&labels[at]<0&&!w.solid[at]&&state.phase[at]>=UNIT*.12){labels[at]=id;queue[tail++]=at;}}
    }
    if(w.regionCount===0&&state.volume){let maximum=0;for(let i=1;i<labels.length;i++)if(state.phase[i]>state.phase[maximum])maximum=i;labels[maximum]=0;w.regionCount=1;w.parents[0]=0;}
    // Extend ownership through water for interface motion and material transport.
    let head=0,tail=0;for(let i=0;i<labels.length;i++)if(labels[i]>=0)queue[tail++]=i;
    while(head<tail){const i=queue[head++],r=Math.floor(i/g),c=i%g;for(const at of [c?i-1:-1,c+1<g?i+1:-1,r?i-g:-1,r+1<g?i+g:-1])if(at>=0&&labels[at]<0&&!w.solid[at]){labels[at]=labels[i];queue[tail++]=at;}}
    for(let i=0;i<labels.length;i++)if(labels[i]>=0)w.targets[labels[i]]+=state.phase[i]/UNIT;
}
function projectMass(values,w){
    const g=w.g,solid=w.solid;
    // A neck joining two diffuse interfaces merges their volume budgets.
    for(let r=0;r<g;r++)for(let c=0;c<g;c++){
        const i=r*g+c;if(values[i]<.12||solid[i])continue;
        for(const j of [c+1<g?i+1:-1,r+1<g?i+g:-1])if(j>=0&&values[j]>=.12&&!solid[j]){
            const a=root(w,w.regions[i]),b=root(w,w.regions[j]);if(a>=0&&b>=0&&a!==b){w.parents[b]=a;w.targets[a]+=w.targets[b];w.targets[b]=0;}
        }
    }
    for(let i=0;i<values.length;i++)w.regions[i]=root(w,w.regions[i]);
    for(let pass=0;pass<4;pass++){
        w.sums.fill(0);w.weights.fill(0);
        for(let i=0;i<values.length;i++){values[i]=solid[i]?0:clamp(values[i]);const id=w.regions[i];if(id>=0){w.sums[id]+=values[i];w.weights[id]+=values[i]*(1-values[i]);}}
        let correction=false;
        for(let i=0;i<values.length;i++){
            const id=w.regions[i];if(id<0||solid[i]||w.weights[id]<1e-10)continue;
            const difference=w.targets[id]-w.sums[id];if(Math.abs(difference)>1e-6){values[i]=clamp(values[i]+difference*values[i]*(1-values[i])/w.weights[id]);correction=true;}
        }
        if(!correction)break;
    }
}
function velocity(state,w,rules){
    const g=w.g,flow=rules.flow/100,visc=rules.viscosity/100,t=state.frame*.003,scale=g/61;
    if(flow===0){state.vx.fill(0);state.vy.fill(0);return;}
    for(let r=0;r<g;r++)for(let c=0;c<g;c++){
        const i=r*g+c,x=c/Math.max(1,g-1),y=r/Math.max(1,g-1),sx=Math.sin(Math.PI*x),sy=Math.sin(Math.PI*y),f=.055*Math.sin(2*Math.PI*x+t)+.035*Math.cos(2*Math.PI*y-t*.7);
        const a=state.phase[i]/UNIT,rank=a>.02?nearest(w.colors,state.red[i]/Math.max(1,state.phase[i]),state.green[i]/Math.max(1,state.phase[i]),state.blue[i]/Math.max(1,state.phase[i]))/Math.max(1,state.palette.length-1):.5;
        const u=sx*(Math.PI*Math.cos(Math.PI*y)*f-sy*.035*2*Math.PI*Math.sin(2*Math.PI*y-t*.7));
        const v=-(Math.PI*Math.cos(Math.PI*x)*sy*f+sx*sy*.055*2*Math.PI*Math.cos(2*Math.PI*x+t))-.05*(rank-.5)*a;
        const relaxation=.18*(1-.75*visc),speed=flow*scale*(1-.6*visc);
        w.ux[i]=w.solid[i]?0:(state.vx[i]/VELOCITY*(1-relaxation)+u*speed*relaxation);
        w.uy[i]=w.solid[i]?0:(state.vy[i]/VELOCITY*(1-relaxation)+v*speed*relaxation);
    }
    for(let r=0;r<g;r++)for(let c=0;c<g;c++){
        const i=r*g+c,l=r*g+Math.max(0,c-1),rr=r*g+Math.min(g-1,c+1),up=Math.max(0,r-1)*g+c,d=Math.min(g-1,r+1)*g+c;
        w.div[i]=(w.ux[rr]-w.ux[l]+w.uy[d]-w.uy[up])*.5;
    }
    let pa=w.pa,pb=w.pb;pa.fill(0);pb.fill(0);
    for(let iteration=0;iteration<8;iteration++){
        for(let r=0;r<g;r++)for(let c=0;c<g;c++){const i=r*g+c;pb[i]=w.solid[i]?0:(pa[r*g+Math.max(0,c-1)]+pa[r*g+Math.min(g-1,c+1)]+pa[Math.max(0,r-1)*g+c]+pa[Math.min(g-1,r+1)*g+c]-w.div[i])*.25;}
        const old=pa;pa=pb;pb=old;
    }
    for(let r=0;r<g;r++)for(let c=0;c<g;c++){
        const i=r*g+c;
        state.vx[i]=w.solid[i]||c===0||c===g-1?0:Math.round(clamp(w.ux[i]-(pa[r*g+Math.min(g-1,c+1)]-pa[r*g+Math.max(0,c-1)])*.5,-2,2)*VELOCITY);
        state.vy[i]=w.solid[i]||r===0||r===g-1?0:Math.round(clamp(w.uy[i]-(pa[Math.min(g-1,r+1)*g+c]-pa[Math.max(0,r-1)*g+c])*.5,-2,2)*VELOCITY);
    }
}
function evolve(state,w,rules){
    const g=w.g;
    for(let i=0;i<state.phase.length;i++){w.a[i]=state.phase[i]/UNIT;w.r[i]=state.red[i]/UNIT;w.gColor[i]=state.green[i]/UNIT;w.b[i]=state.blue[i]/UNIT;}
    prepareRegions(state,w);
    for(let r=0;r<g;r++)for(let c=0;c<g;c++){
        const i=r*g+c,x=c-state.vx[i]/VELOCITY,y=r-state.vy[i]/VELOCITY;
        w.regions[i]=w.labels[Math.round(clamp(y,0,g-1))*g+Math.round(clamp(x,0,g-1))];
        if(w.regions[i]<0)w.regions[i]=w.labels[i];
        w.next[i]=w.solid[i]?0:sample(w.a,g,x,y);w.ar[i]=sample(w.r,g,x,y);w.ag[i]=sample(w.gColor,g,x,y);w.ab[i]=sample(w.b,g,x,y);
    }
    w.rank.set(w.next);projectMass(w.next,w);
    // Keep the transported mixture before relaxing its interface.
    for(let i=0;i<w.a.length;i++){
        const a=Math.max(1e-7,w.rank[i]);w.r[i]=clamp(w.ar[i]/a);w.gColor[i]=clamp(w.ag[i]/a);w.b[i]=clamp(w.ab[i]/a);w.a[i]=w.next[i];
    }
    if(rules.tension>0)for(let substep=0;substep<4;substep++){
        const dt=.02+rules.tension*.0018;
        for(let r=0;r<g;r++)for(let c=0;c<g;c++){
            const i=r*g+c,a=w.a[i];let lap=0;
            for(const at of [r*g+Math.max(0,c-1),r*g+Math.min(g-1,c+1),Math.max(0,r-1)*g+c,Math.min(g-1,r+1)*g+c])lap+=(w.solid[at]?a:w.a[at])-a;
            w.next[i]=w.solid[i]?0:clamp(a+dt*(.8*lap-3.6*a*(1-a)*(1-2*a)));
        }
        projectMass(w.next,w);w.a.set(w.next);
    }
    let sum=0;
    for(let r=0;r<g;r++)for(let c=0;c<g;c++){
        const i=r*g+c,a=w.a[i];let red=w.r[i],green=w.gColor[i],blue=w.b[i];
        if(a>.0001&&w.ar[i]+w.ag[i]+w.ab[i]<1e-7){
            let weight=0;red=green=blue=0;
            for(const at of [r*g+Math.max(0,c-1),r*g+Math.min(g-1,c+1),Math.max(0,r-1)*g+c,Math.min(g-1,r+1)*g+c]){weight+=w.a[at];red+=w.a[at]*w.r[at];green+=w.a[at]*w.gColor[at];blue+=w.a[at]*w.b[at];}
            if(weight>1e-7){red/=weight;green/=weight;blue/=weight;}
        }
        const amount=Math.round(a*UNIT);state.phase[i]=amount;sum+=amount;state.red[i]=Math.round(amount*clamp(red));state.green[i]=Math.round(amount*clamp(green));state.blue[i]=Math.round(amount*clamp(blue));
    }
    // Fixed-point residual correction gives exact global oil-volume conservation.
    let difference=state.volume-sum;
    for(let i=0;i<state.phase.length&&difference;i++)if(!w.solid[i]&&state.phase[i]>0&&state.phase[i]<UNIT){
        const old=state.phase[i],delta=clamp(difference,-old,UNIT-old),a=old+delta;state.phase[i]=a;difference-=delta;
        state.red[i]=Math.round(state.red[i]*a/old);state.green[i]=Math.round(state.green[i]*a/old);state.blue[i]=Math.round(state.blue[i]*a/old);
    }
    // An entirely binary field can have no interface capacity (e.g. a full board).
    if(difference)for(let i=0;i<state.phase.length&&difference;i++)if(!w.solid[i]){
        const old=state.phase[i],delta=clamp(difference,-old,UNIT-old);state.phase[i]+=delta;difference-=delta;
        if(old){state.red[i]=Math.round(state.red[i]*state.phase[i]/old);state.green[i]=Math.round(state.green[i]*state.phase[i]/old);state.blue[i]=Math.round(state.blue[i]*state.phase[i]/old);}
    }
}
export function runDropletsGeneration({n,currentBoardState:board,currentPalette:palette,dropletsRules=INITIAL_DROPLETS_RULES},state){
    if(!state||state.n!==n)state=createDropletsState(n);
    if(!palette.length)return {nextBoardState:board,nextDropletsState:state};
    const w=workspace(n,palette),g=w.g,p=palette.length,scale=(g-1)/Math.max(1,n-1);w.solid.fill(0);
    for(let i=0;i<board.length;i++)if(board[i].isGold)w.solid[Math.round(Math.floor(i/n)*scale)*g+Math.round((i%n)*scale)]=1;
    if(!state.initialized)initialize(state,board,palette,w);else{remapPalette(state,palette,board,w.colors);addEdits(state,board,w);}
    for(let i=0;i<state.phase.length;i++)if(w.solid[i]&&state.phase[i]){state.volume-=state.phase[i];state.phase[i]=state.red[i]=state.green[i]=state.blue[i]=0;}
    velocity(state,w,dropletsRules);evolve(state,w,dropletsRules);
    const background=w.colors.rgb[state.background];
    for(let i=0;i<state.phase.length;i++){w.a[i]=state.phase[i]/UNIT;w.r[i]=state.red[i]/UNIT;w.gColor[i]=state.green[i]/UNIT;w.b[i]=state.blue[i]/UNIT;}
    for(let i=0;i<board.length;i++){
        const tile=board[i];if(!tile.isGold){
            const x=(i%n)*scale,y=Math.floor(i/n)*scale,a=sample(w.a,g,x,y),alpha=clamp((a-.3)/.4);
            let k=state.background;
            if(alpha>0&&a>1e-7){const red=sample(w.r,g,x,y)/a,green=sample(w.gColor,g,x,y)/a,blue=sample(w.b,g,x,y)/a;k=nearest(w.colors,background[0]*(1-alpha)+red*alpha,background[1]*(1-alpha)+green*alpha,background[2]*(1-alpha)+blue*alpha);}
            tile.k=tile.v=k;tile.prevK=null;
        }
        state.seen[i]=norm(tile.k,p)|(tile.isGold?GOLD:0);
    }
    state.frame++;
    return {nextBoardState:board,nextDropletsState:state};
}
