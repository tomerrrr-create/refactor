// Phase drives smooth, closed coordinate motion of an unchanged static map.
// Sampling is bounded and reflected at square edges; this is visual advection,
// not a new acoustic solver. Circular motion rotates and contracts the rings inside the canvas.
let geometrySize=0,radius=null,cachedBase=null,cachedStep=-1,cachedMap=null,cachedField=null;
function reflect(value,edge){
    if(value>=0&&value<=edge)return value;
    const period=2*edge;value=((value%period)+period)%period;
    return value<=edge?value:period-value;
}
export function moveCymaticsField(base,n,map,steps){
    if(!Number.isInteger(n)||n<1||base.length!==n*n||!Number.isSafeInteger(steps)||steps<0||![1,2,3].includes(map))throw new Error('Invalid Cymatics motion');
    const step=steps%1200;
    if(step===0||n===1)return base;
    if(cachedBase===base&&cachedStep===step&&cachedMap===map)return cachedField;
    if(map===3&&geometrySize!==n){
        radius=Float64Array.from({length:n*n},(_,i)=>Math.hypot((2*(i%n)+1)/n-1,(2*Math.floor(i/n)+1)/n-1));geometrySize=n;
    }
    const phase=step*2*Math.PI/1200,s=Math.sin(phase),c=Math.cos(phase),s2=Math.sin(2*phase),bend=map===1?Float64Array.from({length:n},(_,i)=>Math.sin(Math.PI*((2*i+1)/n-1))):null,field=new Uint16Array(n*n),edge=n-1;
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
        const i=y*n+x,u=(2*x+1)/n-1,v=(2*y+1)/n-1;let a,b;
        if(map===3){
            const r=radius[i];
            if(r>=1){field[i]=base[i];continue;}
            // Rotate petals; a smooth radial pulse moves rings too, vanishing
            // at the center. The rim contracts gently, staying inside the canvas.
            const scale=1+.045*(1-c)+.04*s2*(1-r*r),sourceRadius=r*scale;
            // Preserve the static circular map's exterior extension. Reflection
            // here would introduce a spurious second ring against the square.
            if(sourceRadius>=1){field[i]=Math.round(Math.min(1,sourceRadius/Math.SQRT2)*65535);continue;}
            a=(c*u+s*v)*scale;b=(-s*u+c*v)*scale;
        }else if(map===2){
            // A slow two-axis drift and reciprocal stretch of the lattice.
            a=u*(1+.05*s2)+.16*s;b=v/(1+.05*s2)+.12*(c-1);
        }else{
            // Counter-moving axes and a gentle shear free the common diagonal.
            a=u+.14*s+.10*s2*v+.06*s*bend[y];b=v+.12*s2-.08*s*u+.04*s2*bend[x];
        }
        const sx=reflect((a+1)*n/2-.5,edge),sy=reflect((b+1)*n/2-.5,edge),x0=Math.floor(sx),y0=Math.floor(sy),x1=Math.min(x0+1,edge),y1=Math.min(y0+1,edge),fx=sx-x0,fy=sy-y0;
        const top=base[y0*n+x0]*(1-fx)+base[y0*n+x1]*fx,bottom=base[y1*n+x0]*(1-fx)+base[y1*n+x1]*fx;
        field[i]=Math.round(top*(1-fy)+bottom*fy);
    }
    cachedBase=base;cachedStep=step;cachedMap=map;cachedField=field;return field;
}
