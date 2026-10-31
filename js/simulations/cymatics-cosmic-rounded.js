// Soft interacting islands and curved bridges, replacing hard nearest-site
// boundaries. Recorded generations drive a closed, deterministic phase loop.
const TAU=2*Math.PI;
const seeds=Array.from({length:24},(_,i)=>({x:((i+1)*.7548776662466927)%1,y:((i+1)*.5698402909980532)%1,phase:i*2.399963229728653}));
let nodes=null,links=null,radiusScale=0;
let geometryKey='',coordinates=null,fieldKey='',field=null;
export function createRoundedCosmicField(n,frequency,steps=0){
    if(!Number.isInteger(n)||n<1||n>327||!Number.isInteger(frequency)||frequency<20||frequency>20000||!Number.isSafeInteger(steps)||steps<0)throw new Error('Invalid rounded cosmic field');
    const geometry=n+':'+frequency,step=steps%1200,key=geometry+':'+step;
    if(fieldKey===key)return field;
    if(geometryKey!==geometry){
        const detail=Math.log2(1+frequency/400),count=Math.min(24,Math.round(6+3*detail));
        nodes=seeds.slice(0,count);radiusScale=.19/Math.sqrt(1+.3*detail);links=[];
        for(let i=0;i<nodes.length;i++){
            const nearest=nodes.map((b,j)=>({j,d:(b.x-nodes[i].x)**2+(b.y-nodes[i].y)**2})).filter(b=>b.j!==i).sort((a,b)=>a.d-b.d).slice(0,2);
            for(const {j} of nearest)if(!links.some(([a,b])=>a===j&&b===i))links.push([i,j]);
        }
        coordinates=Array.from({length:9},()=>new Float32Array(n*n));
        for(let y=0;y<n;y++)for(let x=0;x<n;x++){
            const i=y*n+x,u=(x+.5)/n,v=(y+.5)/n;
            coordinates[0][i]=u;coordinates[1][i]=v;
            coordinates[2][i]=Math.sin(TAU*v);coordinates[3][i]=Math.cos(TAU*v);
            coordinates[4][i]=Math.sin(TAU*u);coordinates[5][i]=Math.cos(TAU*u);
        }geometryKey=geometry;
    }
    const phase=TAU*step/1200,s=Math.sin(phase),c=Math.cos(phase),s2=Math.sin(2*phase),c2=Math.cos(2*phase);
    const sites=nodes.map((node,j)=>({x:node.x+.045*Math.sin((1+j%3)*phase+node.phase),y:node.y+.045*Math.cos((1+j%2)*phase+node.phase),radius:radiusScale*(1+.16*Math.sin(phase+node.phase))}));
    const bridges=links.map(([a,b],j)=>{
        const from=sites[a],to=sites[b],dx=to.x-from.x,dy=to.y-from.y,length2=Math.max(1e-12,dx*dx+dy*dy);
        return {x:from.x,y:from.y,dx,dy,length2,nx:-dy/Math.sqrt(length2),ny:dx/Math.sqrt(length2),bend:.035*Math.sin(phase+j*1.7)};
    });
    const [,,,,,,warpedX,warpedY,density]=coordinates;density.fill(0);
    for(let i=0;i<density.length;i++){
        warpedX[i]=coordinates[0][i]+.055*(coordinates[2][i]*c+coordinates[3][i]*s);
        warpedY[i]=coordinates[1][i]+.055*(coordinates[4][i]*c2-coordinates[5][i]*s2);
    }
    // Each compact kernel visits only its bounding box. The extra warp margin
    // keeps this identical to full-board evaluation while avoiding O(n²*sites).
    for(const site of sites)addSite(density,warpedX,warpedY,n,site);
    for(const bridge of bridges)addBridge(density,warpedX,warpedY,n,bridge,radiusScale);
    // Smooth saturation blends overlaps into rounded junctions, keeping a
    // continuous field rather than clipping bridges into sharp plateaus.
    field=saturate(density);
    fieldKey=key;return field;
}

function bounds(n,x0,y0,x1,y1,margin){
    return [Math.max(0,Math.floor((x0-margin)*n)-1),Math.max(0,Math.floor((y0-margin)*n)-1),Math.min(n-1,Math.ceil((x1+margin)*n)+1),Math.min(n-1,Math.ceil((y1+margin)*n)+1)];
}
function addSite(density,warpedX,warpedY,n,site){
    const [x0,y0,x1,y1]=bounds(n,site.x,site.y,site.x,site.y,site.radius+.055),inverse=1/(site.radius*site.radius);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
        const i=y*n+x,dx=warpedX[i]-site.x,dy=warpedY[i]-site.y,q=1-(dx*dx+dy*dy)*inverse;
        if(q>0)density[i]+=q*q*q;
    }
}
function addBridge(density,warpedX,warpedY,n,bridge,radiusScale){
    const [x0,y0,x1,y1]=bounds(n,Math.min(bridge.x,bridge.x+bridge.dx),Math.min(bridge.y,bridge.y+bridge.dy),Math.max(bridge.x,bridge.x+bridge.dx),Math.max(bridge.y,bridge.y+bridge.dy),.09*radiusScale/.155+Math.abs(bridge.bend)+.055);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
        const i=y*n+x,dx=warpedX[i]-bridge.x,dy=warpedY[i]-bridge.y,t=Math.max(0,Math.min(1,(dx*bridge.dx+dy*bridge.dy)/bridge.length2));
        const bend=bridge.bend*4*t*(1-t),u=dx-t*bridge.dx-bend*bridge.nx,v=dy-t*bridge.dy-bend*bridge.ny;
        const radius=(.065+.025*4*t*(1-t))*radiusScale/.155,q=1-(u*u+v*v)/(radius*radius);
        if(q>0)density[i]+=.55*q*q*q;
    }
}
function saturate(density){
    const field=new Uint16Array(density.length);
    for(let i=0;i<field.length;i++)field[i]=Math.round(65535/(1+2.5*density[i]));
    return field;
}
