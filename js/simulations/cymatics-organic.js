// Artistic fields, not acoustic or cosmological solvers. Phase is driven only
// by the recorded generation cursor; neither map consumes the engine's PRNG.
const TAU=2*Math.PI;
let cloudGeometry='',waves=null,cloudKey='',cloudField=null;
let cosmicGeometry='',coordinates=null,cosmicKey='',cosmicField=null;
function validate(n,frequency,steps){
    if(!Number.isInteger(n)||n<1||n>327||!Number.isInteger(frequency)||frequency<20||frequency>20000||!Number.isSafeInteger(steps)||steps<0)throw new Error('Invalid organic resonance field');
}
export function createCloudField(n,frequency,steps=0){
    validate(n,frequency,steps);
    const geometry=n+':'+frequency,step=steps%1200,key=geometry+':'+step;
    if(cloudKey===key)return cloudField;
    if(cloudGeometry!==geometry){
        const scale=.8+Math.sqrt(frequency/800);
        waves=Array.from({length:9},(_,j)=>{
            const octave=Math.floor(j/3),angle=j*2.399963229728653,weight=1/(3*2**octave),k=TAU*scale*2**octave;
            const cosine=new Float32Array(n*n),sine=new Float32Array(n*n);
            for(let y=0;y<n;y++)for(let x=0;x<n;x++){
                const a=k*((x+.5)/n*Math.cos(angle)+(y+.5)/n*Math.sin(angle))+j*1.718;
                cosine[y*n+x]=weight*Math.cos(a);sine[y*n+x]=weight*Math.sin(a);
            }
            return {cosine,sine,speed:[1,-1,2,-2,1,3,2,-3,1][j]};
        });cloudGeometry=geometry;
    }
    const phase=TAU*step/1200,cos=waves.map(w=>Math.cos(w.speed*phase)),sin=waves.map(w=>Math.sin(w.speed*phase));
    cloudField=new Uint16Array(n*n);
    for(let i=0;i<cloudField.length;i++){
        let sum=0;for(let j=0;j<waves.length;j++)sum+=waves[j].cosine[i]*cos[j]-waves[j].sine[i]*sin[j];
        const density=.5+sum/3.5;cloudField[i]=Math.round(Math.max(0,Math.min(1,density))**2*65535);
    }
    cloudKey=key;return cloudField;
}
// A warped periodic Voronoi field: equal-distance boundaries form filaments,
// meeting around voids. Small independent node orbits keep those links moving.
const nodes=Array.from({length:12},(_,i)=>({x:((i+1)*.7548776662466927)%1,y:((i+1)*.5698402909980532)%1,phase:i*2.399963229728653}));
export function createCosmicField(n,frequency,steps=0){
    validate(n,frequency,steps);
    const geometry=n+':'+frequency,step=steps%1200,key=geometry+':'+step;
    if(cosmicKey===key)return cosmicField;
    if(cosmicGeometry!==geometry){
        const scale=.55+.6*Math.sqrt(frequency/800);
        coordinates=Array.from({length:6},()=>new Float32Array(n*n));
        for(let y=0;y<n;y++)for(let x=0;x<n;x++){
            const i=y*n+x,u=scale*(x+.5)/n,v=scale*(y+.5)/n;
            coordinates[0][i]=u;coordinates[1][i]=v;
            coordinates[2][i]=Math.sin(TAU*v);coordinates[3][i]=Math.cos(TAU*v);
            coordinates[4][i]=Math.sin(TAU*u);coordinates[5][i]=Math.cos(TAU*u);
        }cosmicGeometry=geometry;
    }
    const phase=TAU*step/1200,s=Math.sin(phase),c=Math.cos(phase),s2=Math.sin(2*phase),c2=Math.cos(2*phase);
    const sites=nodes.map((node,j)=>({x:node.x+.035*Math.sin(phase*(1+j%3)+node.phase),y:node.y+.035*Math.cos(phase*(1+j%2)+node.phase)}));
    cosmicField=new Uint16Array(n*n);
    for(let i=0;i<cosmicField.length;i++){
        const x=coordinates[0][i]+.09*(coordinates[2][i]*c+coordinates[3][i]*s),y=coordinates[1][i]+.07*(coordinates[4][i]*c2-coordinates[5][i]*s2);
        let first=Infinity,second=Infinity;
        for(const site of sites){let dx=x-site.x,dy=y-site.y;dx-=Math.round(dx);dy-=Math.round(dy);const d=dx*dx+dy*dy;
            if(d<first){second=first;first=d;}else if(d<second)second=d;
        }
        cosmicField[i]=Math.round(Math.min(1,(second-first)/.065)**.7*65535);
    }
    cosmicKey=key;return cosmicField;
}
