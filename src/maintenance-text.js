import {LESSONS} from './maintenance-lessons.js';

// Written steps for browsers that cannot show 3D (no WebGL2): the same lessons the 3D practice demonstrates, as a list.
// Nothing is simulated here; it keeps the procedure readable for every learner.
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function tasks(machine){
 const wet=machine==='junior-429';
 return [[wet?'wet-filter':'filter',wet?'Weekly caged filter wash':'Weekly textile filter wash'],['bag',wet?'Change dry dust bag':'Change the dust bag'],['terminals','Inspect the connector']];
}
export function mountMaintenanceText(container,{machine='junior-103',getLanguage=()=> 'english'}={}){
 const render=()=>{
  const hi=getLanguage()==='hinglish';
  container.innerHTML=`<div class="maintenance-steps-text">${tasks(machine).map(([kind,title])=>`<section><h2>${escape(title)}</h2><ol>${LESSONS[kind].map(frame=>`<li><strong>${escape(hi?(frame.titleHi||frame.title):frame.title)}.</strong> ${escape(hi?(frame.captionHi||frame.caption):frame.caption)}</li>`).join('')}</ol></section>`).join('')}<p class="mt-note">These written steps describe the same sequence as the 3D practice. They are a learning aid, not a maintenance certificate.</p></div>`;
 };
 render();document.addEventListener('efs-guide-language',render);
 return {setMachine(id){machine=id;render();},pause(){},destroy(){document.removeEventListener('efs-guide-language',render);container.replaceChildren();}};
}
