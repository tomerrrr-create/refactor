import {runTurbine2Generation} from './spiral-turbine2.js';

let cachedField;
function createInteriorField(n) {
    const center=(n-1)/2,radius=center*.33;
    const vortices=Array.from({length:3},(_,i)=>{
        const angle=i*2*Math.PI/3-Math.PI/2;
        return {x:center+center*.4*Math.cos(angle),y:center+center*.4*Math.sin(angle)};
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
            weight[i]=.9*(1-(distance/radius)**2)**2;
            break;
        }
    }
    return {n,x,y,weight};
}

export function runCombinedTurbineGeneration(n,board,rules) {
    if(cachedField?.n!==n)cachedField=createInteriorField(n);
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
    const result=runTurbine2Generation(n,board,rules.strength,{
        ...cachedField,phase:(frame%1440)*Math.PI/720,random
    });
    rules.frame=(frame+1)>>>0;
    return result;
}
