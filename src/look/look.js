// The two looks share every control. The choice sits on the root element (data-look) and is remembered in localStorage.
export const LOOKS=['studio','hologram'];
const KEY='efs-look';
export const getLook=()=>document.documentElement.dataset.look==='hologram'?'hologram':'studio';
export function setLook(look,remember=true){
 if(!LOOKS.includes(look))look='studio';
 document.documentElement.dataset.look=look;
 if(remember)try{localStorage.setItem(KEY,look);}catch{}
 document.dispatchEvent(new CustomEvent('efs-look',{detail:look}));
}
export function initLook(){let saved=null;try{saved=localStorage.getItem(KEY);}catch{}setLook(LOOKS.includes(saved)?saved:'studio',false);}
