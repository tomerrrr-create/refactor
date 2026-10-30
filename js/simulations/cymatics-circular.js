// Circular-membrane-inspired modes J_m(root*r) cos(m*theta).
// Frequencies use a fixed artistic calibration; this is not an acoustic solver.
function bessel(order,x){
    let term=1;
    for(let i=1;i<=order;i++)term*=x/(2*i);
    let sum=term;
    for(let k=1;k<100;k++){
        term*=-(x*x/4)/(k*(k+order));sum+=term;
        if(Math.abs(term)<1e-14*Math.max(1,Math.abs(sum)))break;
    }
    return sum;
}
let modes;
function getModes(){
    if(modes)return modes;
    modes=[];const limit=Math.sqrt(600);
    for(let m=0;m<=8;m++){
        let previous=.1,value=bessel(m,previous);
        for(let x=.2;x<=limit;x+=.1){
            const next=bessel(m,x);
            if(value*next<0){
                let lo=previous,hi=x,left=value;
                for(let i=0;i<35;i++){const mid=(lo+hi)/2,y=bessel(m,mid);if(left*y<=0)hi=mid;else{lo=mid;left=y;}}
                const root=(lo+hi)/2;
                modes.push({m,root,frequency:40*root*root,coupling:bessel(m,root*.38)});
            }
            previous=x;value=next;
        }
    }
    return modes;
}
export function createCircularResonanceField(n,frequency){
    if(!Number.isInteger(n)||n<1||n>327||!Number.isInteger(frequency)||frequency<20||frequency>20000)throw new Error('Invalid circular resonance field');
    const responses=getModes().map(mode=>{
        const ratio=frequency/mode.frequency;
        return {...mode,weight:mode.coupling**2/(mode.frequency**4*((1-ratio*ratio)**2+(.12*ratio)**2))};
    }).sort((a,b)=>b.weight-a.weight);
    const maximum=responses[0].weight,selected=responses.filter(mode=>mode.weight>=maximum*.015).slice(0,24);
    const radius=new Float64Array(n*n),angle=new Float64Array(n*n),energy=new Float64Array(n*n);
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
        const i=y*n+x,px=(2*x+1)/n-1,py=(2*y+1)/n-1;
        radius[i]=Math.hypot(px,py);angle[i]=Math.atan2(py,px)-.7;
    }
    let peak=0;
    for(const {m,root,weight} of selected){
        const radial=Float64Array.from({length:2049},(_,i)=>bessel(m,root*i/2048));
        for(let i=0;i<energy.length;i++)if(radius[i]<=1){
            const position=radius[i]*2048,lo=Math.floor(position),fraction=position-lo;
            const amplitude=(radial[lo]+(radial[Math.min(lo+1,2048)]-radial[lo])*fraction)*Math.cos(m*angle[i]);
            energy[i]+=weight/maximum*amplitude*amplitude;
        }
    }
    for(const e of energy)if(e>peak)peak=e;
    // Define the surrounding square too: no pigment is deleted or immobilized.
    // Its higher energy guides higher palette ranks into the circular region.
    for(let i=0;i<energy.length;i++)if(radius[i]>1)energy[i]=peak*(1+radius[i]-1);
    const scale=peak*Math.SQRT2;
    return Uint16Array.from(energy,e=>scale?Math.round(Math.min(1,e/scale)*65535):0);
}
