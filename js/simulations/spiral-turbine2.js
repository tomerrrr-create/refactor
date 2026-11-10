// Experimental Turbine 2. Existing Spiral methods keep their original behavior.
// These nine shared offsets avoid allocating a direction object for every cell.
const steps = Object.freeze(Array.from({length:9},(_,i)=>Object.freeze({dr:Math.floor(i/3)-1,dc:i%3-1})));
export function turbine2Direction(dx,dy,choice) {
    const scale=Math.max(1,Math.hypot(dx,dy)),x=dx/scale,y=dy/scale;
    const ax=Math.abs(x),ay=Math.abs(y),diagonal=Math.min(ax,ay),primary=Math.max(ax,ay)-diagonal;
    let dr=0,dc=0;
    if(choice<diagonal){dr=Math.sign(y);dc=Math.sign(x);}
    else if(choice<diagonal+primary){if(ax>ay)dc=Math.sign(x);else dr=Math.sign(y);}
    // The remaining probability is a stay. This compensates for diagonal steps
    // being sqrt(2) longer, so the expected displacement follows the true vector.
    return steps[(dr+1)*3+dc+1];
}
let geometry;
export function runTurbine2Generation(n,board) {
    if(!geometry||geometry.n!==n){
        const center=(n-1)/2,radius=new Float64Array(n*n),angle=new Float64Array(n*n);
        for(let i=0;i<n*n;i++){
            const y=Math.floor(i/n)-center,x=i%n-center;
            radius[i]=Math.hypot(x,y);angle[i]=Math.atan2(y,x);
        }
        geometry={n,center,radius,angle,order:new Int32Array(n*n),moved:new Uint8Array(n*n)};
    }
    const {center,radius,angle,order,moved}=geometry;
    moved.fill(0);
    // Start from the same enumeration each frame: no hidden board/session state
    // is needed to interpret a recipe, JSON artwork or an Undo-restored board.
    for(let i=0;i<order.length;i++)order[i]=i;
    for(let i=order.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1)),saved=order[i];order[i]=order[j];order[j]=saved;
    }
    const phase=Date.now()*.00015;
    for(const i of order){
        if(moved[i]||board[i].isGold||radius[i]===0)continue;
        const row=Math.floor(i/n),col=i%n,r=radius[i];
        const eddy=Math.sin(row*.03+phase)*Math.cos(col*.03-phase);
        const targetRadius=Math.max(0,r-.8+eddy*.25),targetAngle=angle[i]+.10+2/Math.max(r,1)+eddy*.06;
        const targetR=Math.max(0,Math.min(n-1,center+targetRadius*Math.sin(targetAngle)));
        const targetC=Math.max(0,Math.min(n-1,center+targetRadius*Math.cos(targetAngle)));
        const {dr,dc}=turbine2Direction(targetC-col,targetR-row,Math.random());
        if(!dr&&!dc)continue;
        const j=(row+dr)*n+col+dc;
        if(moved[j]||board[j].isGold||board[i].k>=board[j].k||Math.random()>=.6)continue;
        const saved=board[i];board[i]=board[j];board[j]=saved;
        moved[i]=moved[j]=1;
    }
    return board;
}
