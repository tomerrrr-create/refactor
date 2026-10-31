// Artistic fields, not acoustic or cosmological solvers. Phase is driven only
// by the recorded generation cursor; this field does not consume the PRNG.
const TAU=2*Math.PI;
let cloudGeometry='',waves=null,cloudKey='',cloudField=null;
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
