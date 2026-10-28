// Scene layout in metres. The machine stands at the origin on a tiled floor; +x is screen-right, +y up, +z toward the viewer.
// The interaction plane is z = 0: hands and held objects are matched to it in screen space so depth noise from a webcam never matters.
export const VIEW={fov:42,eye:[0,0.72,1.5],look:[0,0.3,0]};
export const TANK={radius:0.185,height:0.4};
export const PLACE={
 headSeated:[0,0.4,0],            // origin of the motor head when clipped onto the tank
 headRest:[0.5,0.47,-0.02],       // origin of the head when parked on the stool
 inTank:[0,0.385,0],              // collar of a bag hanging in the tank
 tray:[-0.52,0.05,-0.03],        // top edge of a used bag lying on the removal tray
 bin:[0.78,0.27,0.14],            // sealed bag dropped in the bin
 shelf:[-0.58,0.8,-0.4],          // clean bag waiting on the shelf
 socket:[-0.7,0.27,-0.744],
 plugIn:[-0.7,0.27,-0.7],
 plugOut:[-0.36,0.04,-0.2],
 tape:[-0.3,0.05,0.3],            // sealing tape roll beside the tray
 carryZ:0.16                      // held objects ride in front of the machine
};
// Drop zones on the interaction plane: [xMin,xMax,yMin,yMax]. They are tested against the held grip anchor
// (the head's handle, a bag's collar), which is the point the learner's fingers are on.
export const ZONES={
 rest:[0.32,0.7,0.5,0.95],
 head:[-0.24,0.24,0.44,0.9],     // where the head's handle ends up when it is seated on the tank
 tray:[-0.74,-0.3,0,0.42],
 bin:[0.62,0.94,0,0.48],
 machine:[-0.26,0.26,0.12,0.5]    // the tank mouth, where a bag's collar goes
};
export const inZone=(zone,x,y)=>{const [x0,x1,y0,y1]=ZONES[zone];return x>=x0&&x<=x1&&y>=y0&&y<=y1;};

// Camera framings. A focus names the part of the room a step is about: its centre on the z = 0 plane and the half-width and
// half-height (metres) that must stay in view. The camera dollies between them, so the machine always fills the stage.
export const FOCUS={
 wide:{c:[0,0.3],w:1.0,h:0.58},
 plug:{c:[-0.32,0.3],w:0.7,h:0.46},
 clips:{c:[0,0.36],w:0.5,h:0.4},
 stool:{c:[0.28,0.42],w:0.54,h:0.46},
 tray:{c:[-0.28,0.28],w:0.52,h:0.44},
 tape:{c:[-0.38,0.18],w:0.44,h:0.38},
 bin:{c:[0.12,0.27],w:1.0,h:0.46},
 shelf:{c:[-0.3,0.55],w:0.56,h:0.5},
 seat:{c:[0.28,0.5],w:0.56,h:0.46}
};
export const FOCUS_OF_PHASE={isolate:'plug',release:'clips',secure:'clips',open:'stool',remove:'tray',seal:'tape',dispose:'bin',fit:'shelf',close:'seat'};
const TAN_HALF_FOV=Math.tan(VIEW.fov*Math.PI/360),TILT=0.28;
// Camera position and look-at for a focus at a given aspect ratio (width / height); the tilt matches the wide view.
export function cameraPose(focus,aspect){
 const dist=Math.max(focus.h,focus.w/aspect)/TAN_HALF_FOV;
 return {eye:[focus.c[0],focus.c[1]+dist*TILT,dist],look:[focus.c[0],focus.c[1],0],dist};
}
export const mixFocus=(a,b,k)=>({c:[a.c[0]+(b.c[0]-a.c[0])*k,a.c[1]+(b.c[1]-a.c[1])*k],w:a.w+(b.w-a.w)*k,h:a.h+(b.h-a.h)*k});
