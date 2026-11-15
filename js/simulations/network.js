import {magnetAnchorIndex} from '../magnet-anchor.js';
// A bounded, deterministic branching network growing from the live artwork.
// Trails retain underlying colors and yield ownership to brush overwrites.
export const INITIAL_NETWORK_RULES=Object.freeze({growth:65,branching:40,persistence:75});
// New UI defaults are separate from legacy rule snapshots with no background field.
export const DEFAULT_NETWORK_PREFERENCES=Object.freeze({...INITIAL_NETWORK_RULES,mode:'spatial',backgroundMode:'luminance'});
export const NETWORK_BACKGROUND_MODES=Object.freeze(['auto','first','luminance']);
const MAX_AGENTS=128,MAX_SOURCES=96,MAX_TRAILS=12000;
const norm=(k,p)=>((k%p)+p)%p;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function random(id,frame,salt=0){let h=(Math.imul(id+1,0x85ebca6b)^Math.imul(frame+1,0x9e3779b1)^salt)>>>0;h=Math.imul(h^(h>>>16),0x7feb352d);h=Math.imul(h^(h>>>15),0x846ca68b);return ((h^(h>>>16))>>>0)/4294967296;}
export function validateNetworkRules(value=INITIAL_NETWORK_RULES){
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>k!=='mode'&&k!=='backgroundMode'&&!Object.hasOwn(INITIAL_NETWORK_RULES,k)))throw Error('Invalid Network rules');
    const rules={...INITIAL_NETWORK_RULES,...value};
    if(Object.keys(INITIAL_NETWORK_RULES).some(k=>!Number.isInteger(rules[k])||rules[k]<0||rules[k]>100)||
        (rules.backgroundMode!==undefined&&!NETWORK_BACKGROUND_MODES.includes(rules.backgroundMode)))throw Error('Invalid Network rules');
    if(rules.mode!==undefined&&!['palette','spatial'].includes(rules.mode))throw Error('Invalid Network mode');
    if(rules.mode==='palette')delete rules.mode;
    if(rules.backgroundMode==='auto')delete rules.backgroundMode;
    return rules;
}
export function createNetworkState(n){
    if(!Number.isInteger(n)||n<1||n>327)throw Error('Invalid Network size');
    return {networkVersion:1,growthVersion:2,transitionVersion:1,n,frame:0,nextId:0,palette:[],background:0,sources:[],agents:[],trails:[]};
}
export function restoreNetworkState(value){
    if(!value||value.networkVersion!==1||!Number.isSafeInteger(value.frame)||value.frame<0||!Number.isSafeInteger(value.nextId)||value.nextId<0)throw Error('Invalid Network state');
    const state=createNetworkState(value.n),n=state.n;
    if(value.mode!==undefined&&value.mode!=='spatial')throw Error('Invalid Network mode');
    if(value.mode==='spatial')state.mode='spatial';
    if(value.transitionVersion===undefined)delete state.transitionVersion;
    else if(value.transitionVersion!==1)throw Error('Invalid Network transition version');
    if(value.sourceMode!==undefined){if(!['palette','spatial'].includes(value.sourceMode)||value.transitionVersion!==1)throw Error('Invalid Network source mode');state.sourceMode=value.sourceMode;}
    if(value.stableSources!==undefined){if(value.stableSources!==true||value.transitionVersion!==1)throw Error('Invalid Network source identity');state.stableSources=true;}
    // Missing growthVersion is the original engine, retained for recorded journeys.
    if(value.growthVersion===undefined)delete state.growthVersion;
    else if(value.growthVersion!==2)throw Error('Invalid Network growth version');
    if(!Array.isArray(value.palette)||value.palette.length>4096||value.palette.some(c=>typeof c!=='string'||!/^#[\da-f]{3,8}$/i.test(c)))throw Error('Invalid Network palette');
    if(value.backgroundMode!==undefined&&!NETWORK_BACKGROUND_MODES.includes(value.backgroundMode))throw Error('Invalid Network background mode');
    const p=Math.max(1,value.palette.length),integer=(v,max)=>Number.isInteger(v)&&v>=0&&v<max;
    const point=v=>Number.isFinite(v)&&v>=0&&v<=n-1;
    if(!integer(value.background,p)||!Array.isArray(value.sources)||value.sources.length>MAX_SOURCES||!Array.isArray(value.agents)||value.agents.length>MAX_AGENTS||!Array.isArray(value.trails)||value.trails.length>Math.min(MAX_TRAILS,n*n))throw Error('Invalid Network bounds');
    if(value.palette.length===0&&(value.sources.length||value.agents.length||value.trails.length))throw Error('Invalid uninitialized Network');
    const sourceIds=new Set(),trailIds=new Set(),agentIds=new Set();
    for(const source of value.sources){
        if(!Array.isArray(source)||source.length!==5||!integer(source[0],Math.min(n,17)**2)||!point(source[1])||!point(source[2])||!integer(source[3],p)||!integer(source[4],n*n)||sourceIds.has(source[0]))throw Error('Invalid Network source');
        sourceIds.add(source[0]);
    }
    for(const trail of value.trails){
        if(!Array.isArray(trail)||trail.length!==4||!integer(trail[0],n*n)||!integer(trail[1],p)||!integer(trail[2],p)||!Number.isInteger(trail[3])||trail[3]<1||trail[3]>1024||trailIds.has(trail[0]))throw Error('Invalid Network trail');
        trailIds.add(trail[0]);
    }
    for(const agent of value.agents){
        if(!agent||!integer(agent.id,value.nextId)||agentIds.has(agent.id)||!point(agent.x)||!point(agent.y)||!Number.isFinite(agent.angle)||Math.abs(agent.angle)>Math.PI+1e-6||!integer(agent.k,p)||!integer(agent.age,901)||!integer(agent.origin,Math.min(n,17)**2)||!Number.isInteger(agent.target)||agent.target< -1||agent.target>=Math.min(n,17)**2)throw Error('Invalid Network tip');
        agentIds.add(agent.id);
    }
    return {...state,...(value.backgroundMode&&value.backgroundMode!=='auto'?{backgroundMode:value.backgroundMode}:{}),frame:value.frame,nextId:value.nextId,palette:[...value.palette],background:value.background,sources:value.sources.map(v=>[...v]),trails:value.trails.map(v=>[...v]),agents:value.agents.map(v=>({...v}))};
}
export function validateNetworkSnapshot(value){
    if(!value||value.networkVersion!==1)throw Error('Invalid Network snapshot');
    return {networkVersion:1,rules:validateNetworkRules(value.rules),state:restoreNetworkState(value.state)};
}
let scratch;
function paint(tile,k){tile.k=tile.v=k;tile.prevK=null;}
function remapPalette(state,palette,board){
    if(state.palette.length===palette.length&&state.palette.every((c,i)=>c===palette[i]))return;
    const old=state.palette,p=Math.max(1,palette.length),lookup=new Map(palette.map((c,i)=>[c,i]));
    const map=k=>lookup.get(old[k])??Math.round(k*(p-1)/Math.max(1,old.length-1));
    if(old.length){
        const sameColors=old.length===p&&old.every(c=>lookup.has(c));
        for(const t of state.trails){t[1]=sameColors?map(t[1]):norm(board[t[0]].k,p);t[2]=map(t[2]);}
        for(const agent of state.agents)agent.k=map(agent.k);
        for(const source of state.sources)source[3]=map(source[3]);
        state.background=map(state.background);
    }else{
        const counts=new Uint32Array(p);for(const tile of board)if(!tile.isGold)counts[norm(tile.k,p)]++;
        for(let k=0;k<p;k++)if(counts[k]>counts[state.background])state.background=k;
    }
    state.palette=[...palette];
}
// One representative per spatial bucket, chosen from original source edges.
// Generated trails are excluded, so they cannot turn into self-replicating seeds.
function readSources(board,n,p,background,marks,scratch,spatial=false,colors=null,preferred=[]){
    const g=Math.min(n,17),buckets=new Map(),{labels,queue}=scratch;labels.fill(0);let externalCount=0;const sizes=new Map(),contacts=new Map();
    const external=i=>!board[i].isGold&&!marks.has(i)&&(spatial?colors[norm(board[i].k,p)]!==colors[background]:norm(board[i].k,p)!==background);
    // Connected painted patches are distinct nutrient sources. Tips target
    // other patches rather than making invisible shortcuts inside their own.
    for(let start=0;start<n*n;start++){
        if(labels[start]||!external(start))continue;
        let head=0,tail=1;queue[0]=start;labels[start]=start+1;const touching=spatial?new Set():null;
        while(head<tail){
            externalCount++;const i=queue[head++],r=Math.floor(i/n),c=i%n;
            for(const at of [c>0?i-1:-1,c+1<n?i+1:-1,r>0?i-n:-1,r+1<n?i+n:-1]){
                if(spatial&&marks.has(at))touching.add(at);
                if(at<0||labels[at]||!external(at))continue;labels[at]=start+1;queue[tail++]=at;
            }
        }
        if(spatial){sizes.set(start,tail);contacts.set(start,touching.size);}
    }
    for(let i=0;i<n*n;i++){
        if(!labels[i])continue;const k=norm(board[i].k,p),r=Math.floor(i/n),c=i%n;
        const edge=r===0||r===n-1||c===0||c===n-1||[i-1,i+1,i-n,i+n].some(at=>at>=0&&at<board.length&&!labels[at]);
        if(!edge)continue;
        const id=Math.min(g-1,Math.floor(r*g/n))*g+Math.min(g-1,Math.floor(c*g/n));
        const score=spatial?random(i,0):Math.abs(k-background)+random(i,0)*.01,previous=buckets.get(id);
        if(!previous||score>previous.score)buckets.set(id,{source:[id,c,r,k,labels[i]-1],score});
    }
    // Once modes have been exchanged, a valid representative remains the same
    // source. Different scoring must not turn another point of its patch into a birth.
    const pinned=new Set();
    for(const source of preferred){
        const index=Math.round(source[2])*n+Math.round(source[1]);
        if(!labels[index]||colors[norm(board[index].k,p)]!==colors[source[3]])continue;
        const k=norm(board[index].k,p);pinned.add(source[0]);
        buckets.set(source[0],{source:[source[0],source[1],source[2],k,labels[index]-1],score:Infinity});
    }
    return {sources:[...buckets.values()].sort((a,b)=>Number(pinned.has(b.source[0]))-Number(pinned.has(a.source[0]))||random(a.source[0],0)-random(b.source[0],0)).slice(0,MAX_SOURCES).map(v=>v.source).sort((a,b)=>a[0]-b[0]),dense:externalCount>n*n*.7,sizes,contacts};
}
function chooseTarget(agent,sources,p,avoid=-1,spatial=null){
    let best=-1,score=Infinity;const origin=sources.find(s=>s[0]===agent.origin);
    for(const source of sources){
        if(source[0]===agent.origin||source[0]===avoid||source[4]===origin?.[4])continue;
        const dx=source[1]-agent.x,dy=source[2]-agent.y,distance=Math.hypot(dx,dy),rank=source[3]/Math.max(1,p-1);
        if((distance<2&&source[0]!==agent.target)||(!spatial&&rank<.15))continue;
        const weight=spatial?(1+Math.min(2,Math.sqrt(spatial.sizes.get(source[4])??1)/8))/(1+.35*(spatial.traffic.get(source[4])??0)):.5+rank;
        const candidate=distance/weight*(1+Math.abs(wrap(Math.atan2(dy,dx)-agent.angle))*.12)*(.5+random(agent.id,source[0],91)*1.5);
        if(candidate<score){score=candidate;best=source[0];}
    }
    return best;
}
function addAgent(state,source,angle,p,target=-1,spatial=null){
    if(state.agents.length>=MAX_AGENTS)return;
    const agent={id:state.nextId++,x:source[1],y:source[2],angle:Math.fround(wrap(angle)),k:source[3],origin:source[0],target,age:0};
    if(target===-1)agent.target=chooseTarget(agent,state.sources,p,-1,spatial);
    state.agents.push(agent);
}
export function runNetworkGeneration({n,currentBoardState:board,currentPalette,originalPalette=currentPalette,networkRules=INITIAL_NETWORK_RULES},state){
    if(!state||state.n!==n)state=createNetworkState(n);
    const p=Math.max(1,currentPalette.length),rules=networkRules,spatialMode=rules.mode==='spatial',continuous=state.growthVersion===2;
    if(!scratch||scratch.n!==n)scratch={n,marks:new Map(),labels:new Int32Array(n*n),queue:new Int32Array(n*n)};
    const marks=scratch.marks;marks.clear();
    const previousBackgroundMode=state.backgroundMode??'auto',wasSpatial=state.mode==='spatial';
    remapPalette(state,currentPalette,board);
    const mode=spatialMode?(rules.backgroundMode==='luminance'?'luminance':'auto'):(rules.backgroundMode??'auto');
    if(spatialMode&&(!wasSpatial||(mode==='auto'&&previousBackgroundMode!=='auto'))){
        // Stable color ties and a fixed pigment identity remove sorting from background selection.
        const counts=new Map();for(const tile of board)if(!tile.isGold){const color=currentPalette[norm(tile.k,p)];counts.set(color,(counts.get(color)??0)+1);}
        const selected=[...counts].sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?-1:a[0]>b[0]?1:0))[0]?.[0];
        state.background=Math.max(0,currentPalette.indexOf(selected));
    }
    if(spatialMode)state.mode='spatial';else delete state.mode;
    if(mode==='first')state.background=0;
    else if(mode==='luminance')state.background=Math.max(0,magnetAnchorIndex(currentPalette,{anchorColor:'luminance'},originalPalette));
    else if(!spatialMode&&previousBackgroundMode!=='auto'){
        const counts=new Uint32Array(p);for(const tile of board)if(!tile.isGold)counts[norm(tile.k,p)]++;
        state.background=0;for(let k=1;k<p;k++)if(counts[k]>counts[state.background])state.background=k;
    }
    if(mode==='auto')delete state.backgroundMode;else state.backgroundMode=mode;
    const decay=1+Math.floor((100-rules.persistence)/30);
    if(rules.growth===0){state.frame++;return {nextBoardState:board,nextNetworkState:state};}
    for(const trail of state.trails){
        const tile=board[trail[0]];
        // A brush overwrite takes ownership immediately, including a new gold cell.
        if(tile.isGold||currentPalette[norm(tile.k,p)]!==currentPalette[trail[1]])continue;
        trail[1]=norm(tile.k,p);trail[3]-=decay;
        if(trail[3]<=0)paint(tile,trail[2]);else marks.set(trail[0],trail);
    }
    const sourceMode=spatialMode?'spatial':'palette';
    const modeTransition=state.transitionVersion===1&&state.sourceMode!==undefined&&state.sourceMode!==sourceMode;
    if(modeTransition)state.stableSources=true;
    const preferred=state.stableSources?state.sources:[];
    if(state.transitionVersion===1)state.sourceMode=sourceMode;
    const previous=new Map(state.sources.map(s=>[s[0],s]));
    const observed=readSources(board,n,p,state.background,marks,scratch,spatialMode,currentPalette,preferred);state.sources=observed.sources;
    const spatial=spatialMode?{sizes:observed.sizes,traffic:new Map([...observed.contacts].map(([id,count])=>[id,Math.min(32,count)/4]))}:null;
    if(spatial){
        const byId=new Map(state.sources.map(source=>[source[0],source[4]]));
        for(const agent of state.agents){const patch=byId.get(agent.target);if(patch!==undefined)spatial.traffic.set(patch,(spatial.traffic.get(patch)??0)+1);}
        if(!wasSpatial)for(const agent of state.agents)agent.target=-1;
    }
    const firstNewAgentId=state.nextId;
    // A bucket is a sampling location, not a source identity. Its old source
    // must still belong to the observed patch and retain its pigment.
    const retainedOrigins=new Set();
    if(continuous)for(const source of state.sources){
        const old=previous.get(source[0]);if(!old)continue;
        const index=Math.round(old[2])*n+Math.round(old[1]);
        if(scratch.labels[index]===source[4]+1&&(spatialMode?currentPalette[norm(board[index].k,p)]===currentPalette[old[3]]:norm(board[index].k,p)===old[3]))retainedOrigins.add(source[0]);
    }
    // New brush islands are immediate new buds. Later launches reinforce links.
    if(!modeTransition)for(const source of state.sources)if(!previous.has(source[0])||(spatialMode?currentPalette[previous.get(source[0])[3]]!==currentPalette[source[3]]:previous.get(source[0])[3]!==source[3])||(continuous&&!retainedOrigins.has(source[0]))){
        addAgent(state,source,random(source[0],state.frame)*Math.PI*2-Math.PI,p,-1,spatial);
        if(state.agents.length<32)addAgent(state,source,random(source[0],state.frame,12345)*Math.PI*2-Math.PI,p,-1,spatial);
    }
    if(state.sources.length&&state.frame%10===0){const source=state.sources[Math.floor(state.frame/10)%state.sources.length];addAgent(state,source,random(source[0],state.frame)*Math.PI*2-Math.PI,p,-1,spatial);}
    if(!spatialMode&&wasSpatial)for(const agent of state.agents)agent.target=-1;
    const sourceMap=new Map(state.sources.map(s=>[s[0],s]));
    const sourceCells=new Set(state.sources.map(s=>Math.round(s[2])*n+Math.round(s[1])));
    const deposit=(i,k,amount)=>{
        const tile=board[i];if(!tile||tile.isGold)return null;
        let trail=marks.get(i);
        if(trail){trail[3]=Math.min(1024,trail[3]+amount);return trail;}
        if(sourceCells.has(i)||(!observed.dense&&(spatialMode?currentPalette[norm(tile.k,p)]!==currentPalette[state.background]:norm(tile.k,p)!==state.background))||marks.size>=Math.min(MAX_TRAILS,n*n))return null;
        trail=[i,k,norm(tile.k,p),240+rules.persistence*2];marks.set(i,trail);paint(tile,k);return trail;
    };
    const speed=(.25+rules.growth*.009)*Math.min(1,n/149),alive=[],children=[];
    for(const agent of state.agents){
        if(agent.age++>600)continue;
        if(!sourceMap.has(agent.origin)||(continuous&&agent.id<firstNewAgentId&&!retainedOrigins.has(agent.origin)))continue;
        if(agent.age%18===0||!sourceMap.has(agent.target))agent.target=chooseTarget(agent,state.sources,p,-1,spatial);
        const target=sourceMap.get(agent.target);
        if(target&&Math.hypot(target[1]-agent.x,target[2]-agent.y)<.65)continue;
        let vx=Math.cos(agent.angle),vy=Math.sin(agent.angle);
        if(target){const dx=target[1]-agent.x,dy=target[2]-agent.y,d=Math.hypot(dx,dy)||1;vx=dx/d;vy=dy/d;}
        // Low-ranked nearby source colors oppose growth; sorted high ranks attract.
        if(!spatialMode)for(const source of state.sources){
            if(source[0]===agent.origin||source[3]/Math.max(1,p-1)>=.15)continue;
            const dx=agent.x-source[1],dy=agent.y-source[2],d=Math.hypot(dx,dy);
            if(d>0&&d<n/8){const force=(1-d/(n/8))*.65;vx+=dx/d*force;vy+=dy/d*force;}
        }
        let desired=Math.atan2(vy,vx);
        if(target)desired+=Math.sin((agent.x-agent.y)/n*Math.PI*3+agent.origin*.37)*.35;
        // Prefer a reinforced nearby route when it still points toward the goal.
        // This gathers traffic into threads instead of a broad spray of paths.
        const sensor=Math.max(2,n/40);let bestTrail=0,bestOffset=0;
        for(const offset of [-.55,0,.55]){
            const c=Math.round(agent.x+Math.cos(desired+offset)*sensor),r=Math.round(agent.y+Math.sin(desired+offset)*sensor);
            if(c<0||c>=n||r<0||r>=n)continue;
            let strength=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
                const x=c+dx,y=r+dy;if(x>=0&&x<n&&y>=0&&y<n)strength+=marks.get(y*n+x)?.[3]??0;
            }
            if(strength>bestTrail){bestTrail=strength;bestOffset=offset;}
        }
        if(bestTrail>900)desired+=bestOffset*.7;
        const turn=clamp(wrap(desired-agent.angle),-.28,.28);
        agent.angle=wrap(agent.angle+turn+(random(agent.id,state.frame)-.5)*(target ? .12 : .35));
        let x=agent.x+Math.cos(agent.angle)*speed,y=agent.y+Math.sin(agent.angle)*speed;
        if(x<0||x>n-1){agent.angle=wrap(Math.PI-agent.angle);x=clamp(x,0,n-1);}
        if(y<0||y>n-1){agent.angle=wrap(-agent.angle);y=clamp(y,0,n-1);}
        const index=Math.round(y)*n+Math.round(x);
        const path=[];
        if(continuous){
            const x0=Math.round(agent.x),y0=Math.round(agent.y),x1=Math.round(x),y1=Math.round(y);
            const steps=Math.max(1,Math.abs(x1-x0),Math.abs(y1-y0));
            for(let step=1;step<=steps;step++)path.push(Math.round(y0+(y1-y0)*step/steps)*n+Math.round(x0+(x1-x0)*step/steps));
            // Do not jump across a protected cell on the way to a free endpoint.
            if(path.some(i=>board[i].isGold)){agent.angle=wrap(agent.angle+Math.PI*.65);alive.push(agent);continue;}
        }
        if(board[index].isGold){agent.angle=wrap(agent.angle+Math.PI*.65);alive.push(agent);continue;}
        agent.x=Math.fround(x);agent.y=Math.fround(y);agent.angle=Math.fround(wrap(agent.angle));
        if(continuous)for(const at of path.slice(0,-1))deposit(at,agent.k,95);
        const trail=deposit(index,agent.k,95);
        if(trail&&trail[3]>700&&state.frame%4===0){
            const side=state.frame%8?-1:1,c=Math.round(x-Math.sin(agent.angle)*side),r=Math.round(y+Math.cos(agent.angle)*side);
            if(c>=0&&c<n&&r>=0&&r<n)deposit(r*n+c,trail[1],30);
        }
        if(agent.age>8&&random(agent.id,state.frame,0x13579)<rules.branching*.00025&&alive.length+children.length<MAX_AGENTS){
            const child={...agent,id:state.nextId++,age:0,angle:Math.fround(wrap(agent.angle+(random(agent.id,state.frame,77)<.5?-1:1)*.8))};
            child.target=chooseTarget(child,state.sources,p,agent.target,spatial);children.push(child);
        }
        alive.push(agent);
    }
    state.agents=[...alive,...children].slice(0,MAX_AGENTS);state.trails=[...marks.values()];state.frame++;
    return {nextBoardState:board,nextNetworkState:state};
}
