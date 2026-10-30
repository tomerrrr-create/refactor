// Three fixed point sources. Dispersion-inspired k ∝ sqrt(f), not an audio solver.
const sources=[[-.6,-.45],[.6,-.25],[-.05,.65]];
let geometryKey='',components=null,fieldKey='',field=null;
export function createInterferenceField(n,frequency,phaseStep=0){
    if(!Number.isInteger(n)||n<1||n>327||!Number.isInteger(frequency)||frequency<20||frequency>20000||!Number.isSafeInteger(phaseStep)||phaseStep<0)throw new Error('Invalid interference field');
    const geometry=n+':'+frequency,step=phaseStep%1200,key=geometry+':'+step;
    if(field&&fieldKey===key)return field;
    if(geometryKey!==geometry){
        const waveNumber=2*Math.PI*Math.sqrt(frequency/160);
        components=sources.map(([sx,sy])=>{
            const cosine=new Float64Array(n*n),sine=new Float64Array(n*n);
            for(let y=0;y<n;y++)for(let x=0;x<n;x++){
                const i=y*n+x,distance=Math.hypot((2*x+1)/n-1-sx,(2*y+1)/n-1-sy),amplitude=1/Math.sqrt(1+distance),angle=waveNumber*distance;
                cosine[i]=amplitude*Math.cos(angle);sine[i]=amplitude*Math.sin(angle);
            }
            return {cosine,sine};
        });geometryKey=geometry;
    }
    const phase=step*2*Math.PI/1200,angles=[0,phase,2*phase+.9],cos=angles.map(Math.cos),sin=angles.map(Math.sin);
    field=new Uint16Array(n*n);
    for(let i=0;i<field.length;i++){
        let sum=0;
        for(let source=0;source<3;source++)sum+=components[source].cosine[i]*cos[source]-components[source].sine[i]*sin[source];
        field[i]=Math.round(Math.min(1,sum*sum/9)*65535);
    }
    fieldKey=key;return field;
}
