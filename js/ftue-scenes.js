// Reproducible practice artwork only. Simulation algorithms keep their real behavior.
export const FTUE_PALETTE='Journey';
export const FTUE_CREATION_SIZE=21;
export function ftueDemoSize(simulation){return simulation==='gravitationalSort'?50:249;}
export function createFtueArtwork(simulation,n,paletteLength){
 if(!Number.isInteger(n)||n<1||!Number.isInteger(paletteLength)||paletteLength<2)throw Error('Invalid practice scene');
 const color=value=>Math.max(0,Math.min(paletteLength-1,value));
 return Array.from({length:n*n},(_,index)=>{
  const x=index%n,y=Math.floor(index/n),u=x/Math.max(1,n-1),v=y/Math.max(1,n-1);
  const noise=((Math.imul(index+19,1664525)^Math.imul(x+7,1013904223))>>>0)%paletteLength;
  let k=noise;
  if(simulation==='creation')k=Math.floor((u+v)*.5*(paletteLength-1));
  else if(simulation==='islands')k=(Math.floor(u*12)*5+Math.floor(v*12)*7)%paletteLength;
  else if(simulation==='magnet')k=Math.abs(u-.5)<.025||Math.abs(v-.5)<.025?0:1+noise%(paletteLength-1);
  else if(simulation==='dla')k=(u-.5)**2+(v-.5)**2<.0016?paletteLength-1:0;
  else if(['turing','ink','oil','network','contour'].includes(simulation)){
   const centers=simulation==='contour'?[[.5,.5,.20]]:[[.28,.35,.09],[.68,.38,.10],[.48,.72,.08]];
   k=0;for(let p=0;p<centers.length;p++){const [cx,cy,r]=centers[p];if((u-cx)**2+(v-cy)**2<r*r){k=1+(p*7+Math.floor(u*9+v*7))%(paletteLength-1);break;}}
  }else if(simulation==='gameOfLife'){
   const gx=x%16,gy=y%16,glider=(gx===2&&gy===1)||(gx===3&&gy===2)||(gy===3&&gx>=1&&gx<=3);
   k=glider?1+(Math.floor(x/16)*5+Math.floor(y/16)*7)%(paletteLength-1):0;
  }
  else if(simulation==='erosion')k=v<.24?Math.floor(paletteLength*.85):v<.36?Math.floor(paletteLength*.5):Math.floor(paletteLength*.12)+(noise%3);
  else if(['breathe','nudgeBrighter'].includes(simulation))k=Math.floor((u+v)*.5*(paletteLength-1));
  return {k:color(k),v:color(k),isGold:false,prevK:null,animStart:0,startDelay:0};
 });
}
