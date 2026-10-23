// The procedure the training follows: what each step covers, and which vacuum parts it shows.
//
// Two documents were used, in this order of authority:
//   1. the 16-step Standard Operating Procedure for vacuum cleaning (`sop`): this decides what is
//      taught, in what order and with what figures;
//   2. the company's six-step vacuum job card (`card`): used only where the procedure is silent.
// Each check says where it comes from in `from`. Where the two disagree, the procedure wins.
//
// The wording is our own. `parts` are the vacuum parts a step shows: only the parts needed to
// operate the machine, never its insides. The narration of every step, in English, Hindi and
// Nepali, is in src/steps/; a test checks that every check here is covered by a narrated beat.

export const PHASES = {
  safety: { label: 'Before you start' },
  method: { label: 'Cleaning' },
  storage: { label: 'Finishing and storing' },
};

export const PARTS = {
  casing: { name: 'Casing' },
  wheels: { name: 'Wheels' },
  switch: { name: 'On / off switch' },
  cable: { name: 'Power cable and plug' },
  pat: { name: 'PAT test label' },
  bag: { name: 'Dust bag and its compartment' },
  hose: { name: 'Hose' },
  wand: { name: 'Wand (tube)' },
  head: { name: 'Floor head (brush on / off)' },
  tools: { name: 'Accessories (crevice tool, brush)' },
};

// Other things the training points at that are not part of the vacuum.
export const POINTED = ['breaker', 'socket', 'cloths', 'sign', 'pests', 'crack', 'torn', 'lane'];

// `card` is the job-card step a check covers, if any.
export const STEPS = [
  { n: 1, phase: 'safety', title: 'Check the area for risks and put up warning signs', parts: [], checks: [{ id: 'risk', from: 'sop', text: 'Look around for dangers' }, { id: 'sign', from: 'sop', text: 'Put out a warning sign', parts: [] }] },
  { n: 2, phase: 'safety', title: 'Know the paperwork: risk assessment, method statement and the maker\'s instructions', parts: [], checks: [{ id: 'docs', from: 'sop', text: 'The three documents', parts: [] }] },
  { n: 3, phase: 'safety', title: 'Wash your hands and cover any cut with a waterproof dressing', parts: [], checks: [{ id: 'wash', from: 'sop', text: 'Wash hands', parts: [] }, { id: 'cuts', from: 'sop', text: 'Cover cuts', parts: [] }] },
  { n: 4, phase: 'safety', title: 'Check and put on your protective equipment (PPE)', parts: [], checks: [{ id: 'ppe', from: 'sop', text: 'Vest, gloves, glasses', parts: [] }] },
  {
    n: 5, phase: 'safety', title: 'Check the equipment is complete and safe to use',
    parts: ['pat', 'cable', 'bag', 'hose', 'wand', 'casing', 'wheels', 'tools'],
    checks: [
      { id: 'kit', from: 'sop', text: 'The colour-coded kit is there and the right colour for the area', parts: [] },
      { id: 'circuit', from: 'sop', text: 'If the building needs a circuit breaker, it switches on and off properly', parts: [] },
      // the procedure only says the PAT check must follow company policy; the job card adds that it comes before the machine is used
      { id: 'pat', from: 'sop+card', card: 1, text: 'The PAT label is in date and follows company policy, checked before the machine is used', parts: ['pat'] },
      { id: 'cable', from: 'sop+card', card: 2, text: 'Run a clean cloth along the cable from the machine to the plug to feel for cuts, scrapes or bare wire; report a faulty one', parts: ['cable'] },
      { id: 'cable-lay', from: 'sop', text: 'Lay the cable neatly so it is never a trip hazard', parts: ['cable'] },
      // the procedure says two-thirds full; the job card says above 70%. The procedure's figure is used.
      { id: 'bag', from: 'sop', card: 3, text: 'Lift the bag by one corner, never press on it; change it when it is two-thirds full or more', parts: ['bag'] },
      { id: 'hose', from: 'sop', text: 'Look along the hose and wand for blockages, splits or kinks; the suction is felt when the machine is on', parts: ['hose', 'wand'] },
      { id: 'casing', from: 'sop', text: 'The casing is not damaged and the wheels turn freely', parts: ['casing', 'wheels'] },
      { id: 'tools', from: 'sop', text: 'The right accessories for the job are with the machine', parts: ['tools'] },
    ],
  },
  { n: 6, phase: 'safety', title: 'Look for signs of pests and report them without disturbing anything', parts: [], checks: [{ id: 'pests', from: 'sop', text: 'Report signs of pests, do not disturb them', parts: [] }] },
  { n: 7, phase: 'safety', title: 'Look for damage to the building or fittings and report it', parts: [], checks: [{ id: 'damage', from: 'sop', text: 'Report damage', parts: [] }] },
  { n: 8, phase: 'method', title: 'Pick up large debris and sticky dirt first, and keep the refuse bag out of the way', parts: [], checks: [{ id: 'litter', from: 'sop', text: 'Remove large debris and sticky dirt; refuse bag where nobody can trip', parts: [] }] },
  {
    n: 9, phase: 'method', title: 'Set the floor head for the floor: brush on for hard floors, brush off for carpet',
    parts: ['head'],
    checks: [
      { id: 'brush-hard', from: 'sop', text: 'Brush on for hard floors', parts: ['head'] },
      { id: 'brush-carpet', from: 'sop', text: 'Brush retracted for soft floors', parts: ['head'] },
    ],
  },
  {
    n: 10, phase: 'method', title: 'Plug in safely',
    parts: ['cable', 'switch', 'hose'],
    checks: [
      { id: 'plug-where', from: 'sop', text: 'Use a socket behind the line of work and close to the exit', parts: ['cable'] },
      { id: 'plug-dry', from: 'sop', text: 'Socket switched off and hands dry before the plug goes in', parts: ['cable'] },
      { id: 'plug-stand', from: 'sop', text: 'Never stand on the cable', parts: ['cable'] },
      { id: 'suction', from: 'sop', text: 'Once it is on, feel the suction at the end of the hose; weak suction means a blockage', parts: ['hose', 'switch'] },
    ],
  },
  {
    n: 11, phase: 'method', title: 'Start with the edges and corners, with the right accessory and a good body posture',
    parts: ['tools', 'wand', 'hose'],
    checks: [
      { id: 'edges', from: 'sop', text: 'Clean edges and corners with the accessories, in manageable areas', parts: ['tools', 'wand'] },
      // body posture is only on the job card
      { id: 'posture', from: 'card', card: 4, text: 'Keep a good body posture: knees bent, back straight, no overreaching', parts: [] },
    ],
  },
  {
    n: 12, phase: 'method', title: 'Clean in overlapping passes, working away from the socket',
    parts: ['head', 'wand', 'hose', 'cable', 'switch'],
    checks: [
      { id: 'pass-away', from: 'sop', text: 'Start at the socket and work away from it, so the cable stays behind you', parts: ['cable', 'head'] },
      { id: 'pass-traffic', from: 'sop', card: 5, text: 'Give extra time to traffic lanes (entrances, exits, under desks on carpet) and go over them in both directions', parts: ['head'] },
      { id: 'pass-brush', from: 'sop', text: 'Brush back on when the floor changes to a hard one', parts: ['head'] },
      { id: 'pass-off', from: 'sop', text: 'When you stop, switch off at the machine and at the socket, unplug, and park it clear of people', parts: ['switch', 'cable'] },
    ],
  },
  {
    n: 13, phase: 'storage', title: 'Clean the equipment, check it again and change the bag if needed, then store it so it can dry and air',
    parts: ['bag', 'casing', 'wheels', 'cable', 'hose', 'wand', 'head', 'tools'],
    checks: [
      { id: 'clean', from: 'sop', text: 'Wipe the machine and accessories; used cloths go to the laundry as company procedure says', parts: ['casing', 'wheels', 'tools'] },
      { id: 'bag-change', from: 'sop', card: 3, text: 'Do the safety checks again and change the bag if it is two-thirds full or more', parts: ['bag'] },
      { id: 'store', from: 'sop', card: 6, text: 'Store the machine where air can circulate, in its designated place', parts: [] },
    ],
  },
  { n: 14, phase: 'storage', title: 'Take down the warning signs and clean them before storing', parts: [], checks: [{ id: 'signs-down', from: 'sop', text: 'Wipe the signs clean after each use and store them', parts: [] }] },
  { n: 15, phase: 'storage', title: 'Take off your PPE and wash your hands', parts: [], checks: [{ id: 'ppe-off', from: 'sop', text: 'Remove PPE, wash hands', parts: [] }] },
  { n: 16, phase: 'storage', title: 'Leave the store room clean, tidy and secure', parts: [], checks: [{ id: 'secure', from: 'sop', card: 6, text: 'Store left clean, tidy and secure; lights and air conditioning off', parts: [] }] },
];

export const JOB_CARD = [
  { n: 1, title: 'Check the PAT test before operating the machine' },
  { n: 2, title: 'Inspect the wire (cable) for wear and tear' },
  { n: 3, title: 'Check the vacuum bag; change it if it is filled above 70%' },
  { n: 4, title: 'Start cleaning from the corners, keeping a proper body posture' },
  { n: 5, title: 'Pay special attention to high-traffic areas (entrance and exits)' },
  { n: 6, title: 'Clean and store the vacuum machine in its designated area inside the store room' },
];
