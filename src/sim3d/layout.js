// Camera framing shared by every task. Metres; +x is screen-right, +y up, +z toward the viewer. The wall is at z = -0.75.
// A focus names the area a step is about: its centre on the z = 0 plane and the half-width and half-height that must stay
// in view. The camera keeps one gentle downward tilt and dollies between framings, so the work always fills the stage.
export const VIEW={fov:42,eye:[0,0.72,1.5],look:[0,0.3,0]};
export const WIDE={c:[0,0.3],w:1.0,h:0.58};
const TAN_HALF_FOV=Math.tan(VIEW.fov*Math.PI/360),TILT=0.28;
// Camera position and look-at for a focus at a given aspect ratio (width / height).
export function cameraPose(focus,aspect){
 const dist=Math.max(focus.h,focus.w/aspect)/TAN_HALF_FOV;
 return {eye:[focus.c[0],focus.c[1]+dist*TILT,dist],look:[focus.c[0],focus.c[1],0],dist};
}
export const mixFocus=(a,b,k)=>({c:[a.c[0]+(b.c[0]-a.c[0])*k,a.c[1]+(b.c[1]-a.c[1])*k],w:a.w+(b.w-a.w)*k,h:a.h+(b.h-a.h)*k});
