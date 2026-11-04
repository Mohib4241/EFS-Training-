// The only part of hand control that is not lazy: a tiny handle each page gives to the shared UI. The camera, the model and the
// gesture engine live in hand.js, which is fetched when the learner opens the hand panel. One module is shared by every page.
let loaded=null;
export const stopHands=()=>loaded?.stop();
export function handHandle(getContext){
 return {
  get active(){return loaded?.active===true;},
  async toggle(){loaded??=await import('./hand.js');return loaded.togglePanel(getContext());},
  // a page that has just (re)built its viewer rebinds a running session to it
  attach(){if(loaded?.active)loaded.attach(getContext());},
  stop(){loaded?.stop();}
 };
}
