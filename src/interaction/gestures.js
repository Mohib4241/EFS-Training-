// Pure gesture interpretation, independent of the camera and renderer.
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const clamp = x => Math.min(1,Math.max(0,x));
export class Gestures {
  constructor(){this.reset();}
  reset(){this.pinch=false;this.last=null;this.start=null;this.pair=null;this.fistAt=-Infinity;this.toggledAt=-Infinity;}
  update(hands,time,explode=0){
    if(!hands.length){this.reset();return {mode:'Show your hand',hands:[]};}
    const h=hands[0],p={x:1-h[8].x,y:h[8].y},palm=Math.max(.025,distance(h[5],h[17]));
    const ratio=distance(h[4],h[8])/palm;
    const pinched=ratio<(this.pinch?.48:.32);
    const result={pointer:p,hands,mode:'Point · quick pinch to inspect'};
    if(hands.length===2){
      const gap=distance(hands[0][9],hands[1][9]);
      if(!this.pair)this.pair={gap,explode};
      result.explode=clamp(this.pair.explode+(gap-this.pair.gap)*2.5);
      result.mode='Two hands · pull apart to open';this.pinch=false;this.start=null;this.last=null;
      return result;
    }
    this.pair=null;
    const folded=[8,12,16,20].filter(i=>distance(h[i],h[0])<distance(h[i-2],h[0])*1.12).length;
    if(folded>=3)this.fistAt=time;
    if(folded===0&&time-this.fistAt<900&&time-this.toggledAt>1400){result.toggle=true;this.toggledAt=time;this.fistAt=-Infinity;}
    if(pinched&&!this.pinch)this.start={...p,time,travel:0};
    if(pinched&&this.last&&this.pinch){const dx=p.x-this.last.x,dy=p.y-this.last.y;this.start.travel+=Math.hypot(dx,dy);result.orbit={x:dx,y:dy};result.mode='Pinch held · orbit';}
    if(!pinched&&this.pinch&&this.start&&time-this.start.time<450&&this.start.travel<.045)result.select=p;
    this.pinch=pinched;this.last=p;result.pinched=pinched;return result;
  }
}
export const HAND_EDGES=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
