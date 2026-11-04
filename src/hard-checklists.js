// Three maintenance checklists for every Hard Services machine, in the same lesson-first, isolated, ordered style as the Soft Services
// practice. Each one is a visual, power-isolated observation exercise on the 3D model: isolate, identify three areas in order, then respond to
// the concern the last one shows. They teach what to look at and why; they never authorise opening, testing, tightening or repairing real
// equipment, and they carry no measured limits, torques or intervals (those come from the exact manual and site procedure).
// The first checklist of each machine is the original inspection (module.checks); the other two are written here.
const area=(part,title,body,finding)=>finding?{part,title,body,finding}:{part,title,body};

const EXTRA={
 'motor-1ph':[
  {title:'Shaft, bearings and drive end',summary:'Where a rotating machine first shows wear: the shaft, its key and the two bearing areas.',checks:[
   area('shaft','Observe the shaft and key','Identify the shaft extension and its key, and the guard that must cover it when coupled. A picture cannot show wear, alignment or balance.'),
   area('de-bearing','Identify the drive-end bearing area','Note where noise, heat or grease leakage would be looked for on real equipment. Bearing condition cannot be judged by appearance alone.'),
   area('nde-bearing','Recognise a bearing concern','Observe the marked non-drive-end bearing area.','The amber marker represents grease leakage and discoloured paint at the non-drive-end bearing. Keep the motor out of use and report it for competent assessment.')]},
  {title:'Earth, terminals and starting circuit',summary:'The connection and starting side of a capacitor-start motor, observed with the supply isolated.',checks:[
   area('earth','Observe the protective earth point','Identify the earth connection and why it must be present and visibly secure. A model cannot verify continuity.'),
   area('terminal-box','Observe the terminal-box cover and entry','Notice the cover, its seal and the cable entry without opening a real terminal box.'),
   area('start-switch','Recognise a starting-circuit concern','Observe the marked centrifugal start switch.','The amber marker represents a start switch that may be sticking, which on real equipment shows as a motor that hums without speeding up. Isolate it and report it; the starting circuit is tested only by a competent person.')]}
 ],
 'motor-3ph':[
  {title:'Shaft, bearings and drive end',summary:'The rotating parts that carry the load: the shaft, its key and both bearing areas.',checks:[
   area('shaft','Observe the shaft and key','Identify the shaft extension and key, and the guard that must cover it when coupled. Alignment and balance cannot be seen in a picture.'),
   area('nde-bearing','Identify the non-drive-end bearing area','Note where heat, noise or grease leakage would be looked for on real equipment. Appearance alone does not prove a bearing is sound.'),
   area('de-bearing','Recognise a bearing concern','Observe the marked drive-end bearing area.','The amber marker represents an overheated-looking drive-end bearing area with discoloured paint. Keep the motor out of use and report it for competent assessment.')]},
  {title:'Earth, terminal board and windings',summary:'The electrical side, observed with the supply isolated, and why insulation is tested rather than judged by eye.',checks:[
   area('earth','Observe the protective earth point','Identify the earth connection and why it must be present and visibly secure. A model cannot verify continuity.'),
   area('terminal-board','Observe the terminal board links','Identify the link arrangement and that it must match the supply and the nameplate. Do not change links from this exercise.'),
   area('windings','Recognise a winding concern','Observe the marked winding in the opened teaching model.','The amber marker represents darkened winding insulation. A real winding is judged by insulation testing by a competent person, never by eye. Keep the motor out of use and report it.')]}
 ],
 'alternator':[
  {title:'Bearing, shaft and rotating rectifier',summary:'The rotating side of a brushless alternator, stopped and prevented from restarting.',checks:[
   area('bearing','Observe the bearing support','Identify the bearing support and where heat, noise or grease leakage would be looked for. Condition cannot be judged by appearance.'),
   area('shaft','Observe the shaft','Identify the shaft and why alignment with the prime mover matters. A picture cannot show alignment.'),
   area('rectifier','Recognise a rotating-rectifier concern','Observe the marked rotating rectifier.','The amber marker represents a scorched rotating-rectifier assembly. Isolate the set, prevent restart and report it; rotating diodes are tested only by a competent person with the set stopped.')]},
  {title:'Exciter, output windings and regulator',summary:'How the field is supplied and controlled, and what a regulator concern looks like.',checks:[
   area('exciter-stator','Observe the exciter stator','Identify the stationary exciter field, which feeds the rotating exciter through the regulator. Its condition cannot be judged by eye.'),
   area('windings','Observe the output windings','Identify the output windings in the opened teaching model. Real windings are assessed by insulation testing, not by appearance.'),
   area('avr','Recognise a regulator concern','Observe the marked automatic voltage regulator.','The amber marker represents heat-affected, discoloured components on the regulator. Isolate the set, prevent restart and report it; regulator connections are not disturbed from this exercise.')]}
 ],
 'megger':[
  {title:'Display, selector and test control',summary:'The controls a tester is trusted through: can it be read, set correctly and operated without force?',checks:[
   area('screen','Observe the display','Identify the display and why an unreadable or cracked display means the result cannot be trusted.'),
   area('dial','Observe the function and voltage selector','Check the selector sits firmly in a position and that the chosen test matches the item and the manual. The model cannot show the real range.'),
   area('test-key','Recognise a test-control concern','Observe the marked test control.','The amber marker represents a test control that sticks. Remove the tester from use and report it; never force a control.')]},
  {title:'Battery, discharge path and rear cover',summary:'What is inside the case: the supply, the path that lets test energy decay, and the cover that keeps it closed.',checks:[
   area('battery','Observe the battery area','Identify the battery supply and that the cover must be in place. A model cannot show charge or battery condition.'),
   area('discharge','Review the discharge path','Identify the block that lets stored test energy decay after a test, and why the leads stay connected until the item is shown to be discharged, as the manual describes.'),
   area('back','Recognise a rear-cover concern','Observe the marked rear cover.','The amber marker represents a cracked or missing rear cover that exposes the internal blocks. Remove the tester from use and report it.')]}
 ],
 'multimeter':[
  {title:'Display, function switch and holster',summary:'Can the meter be read, set to the intended function and protected from knocks?',checks:[
   area('screen','Observe the display','Identify the display and why a faint, partial or cracked display means the reading cannot be trusted.'),
   area('case','Observe the protective holster','Identify the holster and that it protects the body from knocks and drops. It does not make a damaged meter safe to use.'),
   area('dial','Recognise a function-switch concern','Observe the marked rotary function switch.','The amber marker represents a function switch that does not settle firmly in its positions. Remove the meter from use and report it; a wrong function is a common cause of harm.')]},
  {title:'Rear cover, battery and fuses',summary:'What protects the user when the meter is wrongly connected: the cover, the supply and the fused current inputs.',checks:[
   area('back','Observe the rear cover and stand','Identify the rear cover and that it must be properly seated. A model cannot show whether a real cover is secure.'),
   area('battery','Observe the battery','Identify the battery and that its compartment must be closed. The model cannot show charge.'),
   area('fuses','Recognise a fuse concern','Observe the marked current-input fuse blocks.','The amber marker represents a fuse of the wrong type fitted. Remove the meter from use and report it; fuses are replaced only with the type the manual specifies.')]}
 ],
 'cascade':[
  {title:'Pumps, valves and buffer',summary:'The water side of the plant: moving the heat, isolating a branch, and keeping the circuits apart.',checks:[
   area('pumps','Observe the circulation pumps','Identify the pumps and why flow must be proved before units run. Noise, heat or a weep is reported, not repaired, from this exercise.'),
   area('valves','Observe branch isolation and check valves','Identify the isolation and check valves and why their positions matter. Do not operate real valves from this exercise.'),
   area('buffer','Recognise a hydraulic leak','Observe the marked buffer vessel connection.','The amber marker represents a weep at the buffer vessel connection. Record and report it; do not tighten a real connection from this exercise.')]},
  {title:'Sensors, controller and load side',summary:'How the cascade knows what the building needs, and what stops it delivering.',checks:[
   area('sensors','Observe the common temperature sensors','Identify the sensors and their cable entries. A sensor reading cannot be judged by eye.'),
   area('controls','Observe the cascade controller and its communications link','Notice the cover, cable entries and labels. Settings are changed only by authorised persons.'),
   area('load','Recognise a load-side concern','Observe the marked heating circuit.','The amber marker represents a heating circuit closed off at the load, so the plant would have nowhere to deliver heat. Record and report it; do not reopen real valves from this exercise.')]}
 ]
};
const FIRST={
 'motor-1ph':['Enclosure, cooling and mounting','The first things seen on a walk-round: the fan guard, the mounting and the capacitor enclosure.'],
 'motor-3ph':['Enclosure, cooling and terminal box','The first things seen on a walk-round: the fan guard, the mounting and the terminal-box area.'],
 'alternator':['Drive, enclosure and ventilation','The first things seen on a walk-round: the drive interface, the output enclosure and the air inlet.'],
 'megger':['Case, sockets and leads','The first things checked before a tester is used: the case, the sockets and the leads.'],
 'multimeter':['Body, sockets and leads','The first things checked before a meter is used: the body, the input sockets and the probe leads.'],
 'cascade':['Headers, protection and outdoor coil','The first things seen on a plant walk-round: pipework, the flow-proof protection and the heat-pump air path.']
};

// Adds module.checklists (three each). module.checks stays the first checklist, so everything written for one inspection still works.
export function attachChecklists(modules){
 for(const module of Object.values(modules)){
  const [title,summary]=FIRST[module.id];
  module.checklists=[{id:`${module.id}-1`,title,summary,checks:module.checks},...EXTRA[module.id].map((list,index)=>({id:`${module.id}-${index+2}`,...list}))];
 }
 return modules;
}
