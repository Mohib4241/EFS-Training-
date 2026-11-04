// The page look sits on the root element (data-look). It is always Studio: the Hologram look has no switch any more, and an old
// saved choice is forgotten. The rig keeps both so the look can come back without a rebuild.
export const LOOKS=['studio','hologram'];
const KEY='efs-look';
export const getLook=()=>document.documentElement.dataset.look==='hologram'?'hologram':'studio';
export function setLook(look,remember=true){
 if(!LOOKS.includes(look))look='studio';
 document.documentElement.dataset.look=look;
 if(remember)try{localStorage.setItem(KEY,look);}catch{}
 document.dispatchEvent(new CustomEvent('efs-look',{detail:look}));
}
export function initLook(){try{localStorage.removeItem(KEY);}catch{}setLook('studio',false);}
