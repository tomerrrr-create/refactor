import {runTurbine2Generation} from './spiral-turbine2.js';
import {runTurbineGeneration} from './spiral-turbine.js';

let cachedField;
let cachedTransition;

function createRoundTransition(n) {
    const center=(n-1)/2;
    const interior=new Float32Array(n*n),rim=new Float32Array(n*n);
    for(let i=0;i<interior.length;i++){
        const radius=Math.hypot(i%n-center,Math.floor(i/n)-center)/Math.max(1,center);
        const t=Math.max(0,Math.min(1,(radius-.73)/.22));
        rim[i]=t*t*(3-2*t);
        interior[i]=1-rim[i];
    }
    return {n,interior,rim};
}

function createInteriorField(n,version) {
    const legacy=version===1;
    const center=(n-1)/2,radius=center*(legacy ? .33 : .38);
    const count=legacy ? 3 : 4,orbit=center*(legacy ? .4 : .54);
    const vortices=Array.from({length:count},(_,i)=>{
        const angle=i*2*Math.PI/count-(legacy ? Math.PI/2 : Math.PI*3/8);
        return {x:center+orbit*Math.cos(angle),y:center+orbit*Math.sin(angle)};
    });
    const x=new Float32Array(n*n),y=new Float32Array(n*n),weight=new Float32Array(n*n);
    for(let i=0;i<weight.length;i++){
        const row=Math.floor(i/n),col=i%n;
        for(const vortex of vortices){
            const dx=col-vortex.x,dy=row-vortex.y,distance=Math.hypot(dx,dy);
            if(distance>=radius)continue;
            const inner=Math.max(1,radius*.12,distance);
            x[i]=-dy/inner;
            y[i]=dx/inner;
            // Local rotation fades to zero inside the parent circle's rim.
            const ratio=distance/radius;
            const fade=Math.max(0,(ratio-.38)/.62);
            weight[i]=.9*(legacy ? (1-ratio**2)**2 : 1-fade*fade*(3-2*fade));
            break;
        }
    }
    return {n,version,x,y,weight};
}

export function runCombinedTurbineGeneration(n,board,rules) {
    const version=rules.fieldVersion??1;
    const frame=rules.frame??0;
    // Mulberry32 per generation keeps replay independent of wall time and
    // restores the exact next set of swaps from a saved frame.
    let seed=(frame^Math.imul(n,0x9e3779b1))>>>0;
    const random=()=>{
        seed=(seed+0x6d2b79f5)>>>0;
        let value=Math.imul(seed^(seed>>>15),seed|1);
        value^=value+Math.imul(value^(value>>>7),value|61);
        return ((value^(value>>>14))>>>0)/4294967296;
    };
    const phase=(frame%1440)*Math.PI/720;
    if(version===3){
        if(cachedTransition?.n!==n)cachedTransition=createRoundTransition(n);
        // Use Turbine's own flow in the center and blend into Turbine 2
        // across a radial band so there is no hard boundary between passes.
        runTurbineGeneration(n,board,rules.strength,{coverage:cachedTransition.interior,phase:phase*4,random});
        runTurbine2Generation(n,board,rules.strength,{coverage:cachedTransition.rim,phase,random});
    }else{
        if(cachedField?.n!==n||cachedField.version!==version)cachedField=createInteriorField(n,version);
        runTurbine2Generation(n,board,rules.strength,{...cachedField,phase,random});
    }
    rules.frame=(frame+1)>>>0;
    return board;
}
