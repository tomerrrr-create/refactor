// Experimental branching fractures. All runtime state is small and serializable;
// board colors are the collision surface, so live drawing participates directly.
export function createCracksState(n, seed = 0x51f15e) {
    return { version: 1, n, random: seed >>> 0 || 1, steps: 0, roots: 0, tips: [] };
}
export function restoreCracksState(value) {
    if (!value || value.version !== 1 || !Number.isInteger(value.n) || value.n < 1 || value.n > 327 ||
        !Number.isInteger(value.random) || value.random < 1 || value.random > 0xffffffff ||
        !Number.isSafeInteger(value.steps) || value.steps < 0 || !Number.isSafeInteger(value.roots) || value.roots < 0 ||
        !Array.isArray(value.tips) || value.tips.length > 48 || value.tips.some(t =>
            ![t.x,t.y,t.angle].every(Number.isFinite) || t.x < 0 || t.x >= value.n || t.y < 0 || t.y >= value.n ||
            !Number.isSafeInteger(t.age) || t.age < 0)) throw new Error('Invalid cracks state');
    return { ...value, tips: value.tips.map(t => ({...t})) };
}
export function runCracksGeneration({n,currentBoardState,currentPalette,contourRules}, previous) {
    const state = previous?.n === n ? restoreCracksState(previous) : createCracksState(n);
    const random = () => { let x=state.random; x^=x<<13;x^=x>>>17;x^=x<<5;state.random=x>>>0;return state.random/0x100000000; };
    const line = contourRules.lineColor === 'lightest' ? currentPalette.length-1 : 0;
    let board=currentBoardState;
    const available = index => index>=0 && index<n*n && !board[index].isGold && board[index].k!==line;
    const paint = index => {
        if(board===currentBoardState)board=currentBoardState.slice();
        board[index]={...board[index],k:line,v:line};
    };
    // A few nuclei, preferably inside material. Bounded sampling avoids scanning
    // or duplicating a 249x249 board on every frame, including an empty canvas.
    const rootLimit=Math.min(16,Math.max(3,Math.ceil(n/18)));
    if(state.roots<rootLimit && (state.steps===0 || state.steps%12===0 || !state.tips.length)) {
        for(let attempt=0;attempt<96;attempt++) {
            const index=Math.floor(random()*n*n);
            if(!available(index))continue;
            const x=index%n,y=Math.floor(index/n);
            const inside=x>0&&y>0&&x<n-1&&y<n-1&&[index-1,index+1,index-n,index+n].every(available);
            if(!inside&&attempt<80)continue;
            paint(index);const angle=random()*Math.PI*2;
            state.tips.push({x,y,angle,age:0},{x,y,angle:angle+Math.PI,age:0});state.roots++;break;
        }
    }
    const next=[];
    for(const tip of state.tips) {
        const angle=tip.angle+(random()-.5)*.24;
        let x=tip.x,y=tip.y;
        const old=Math.round(y)*n+Math.round(x);
        for(let i=0;i<3;i++){x+=Math.cos(angle)*.65;y+=Math.sin(angle)*.65;if(Math.round(y)*n+Math.round(x)!==old)break;}
        const col=Math.round(x),row=Math.round(y);
        if(col<0||col>=n||row<0||row>=n||!available(row*n+col))continue;
        paint(row*n+col);const age=tip.age+1;
        next.push({x:Math.max(0,Math.min(n-1,x)),y:Math.max(0,Math.min(n-1,y)),angle,age});
        if(age%11===0&&next.length<46&&random()<.65)next.push({x:col,y:row,angle:angle+(random()<.5?-1:1)*(0.65+random()*.55),age:0});
    }
    state.tips=next.slice(0,48);state.steps++;
    return { nextBoardState:board, nextCracksState:state };
}
