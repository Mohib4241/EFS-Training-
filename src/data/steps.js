// The vacuum-cleaning procedure the training follows, written in our own words from two documents:
//   - the 16-step Standard Operating Procedure for vacuum cleaning (`sop`), and
//   - the company's six-step vacuum cleaning job card (`card`), whose steps are matched to the SOP.
// English only for now. The narration in Hindi and Nepali is written per step in the next phase.
//
// `parts` are the vacuum parts that step needs to show: only parts that matter to operating the
// machine, never its insides.

export const PHASES = {
  safety: { label: 'Before you start' },
  method: { label: 'Cleaning' },
  storage: { label: 'Finishing and storing' },
};

// The parts of a vacuum cleaner that the training shows. Draft: to be confirmed against the machine used.
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

// `card` is the job-card step this step covers, if any. A check with `card` is one of the six.
export const STEPS = [
  { n: 1, phase: 'safety', title: 'Check the area for risks and put up warning signs', parts: [] },
  { n: 2, phase: 'safety', title: 'Know the paperwork: risk assessment, method statement and the maker\'s instructions', parts: [] },
  { n: 3, phase: 'safety', title: 'Wash your hands and cover any cut with a waterproof dressing', parts: [] },
  { n: 4, phase: 'safety', title: 'Check and put on your protective equipment (PPE)', parts: [] },
  {
    n: 5, phase: 'safety', title: 'Check the equipment is complete and safe to use',
    parts: ['pat', 'cable', 'bag', 'hose', 'casing', 'wheels', 'tools', 'switch'],
    checks: [
      { id: 'pat', card: 1, text: 'The PAT (portable appliance test) label is in date and follows company policy', parts: ['pat'] },
      { id: 'cable', card: 2, text: 'Run a clean cloth along the cable from the machine to the plug to feel for cuts, scrapes or bare wire; report a faulty one', parts: ['cable'] },
      { id: 'cable-lay', text: 'Lay the cable neatly so it is never a trip hazard', parts: ['cable'] },
      { id: 'bag', card: 3, text: 'Lift the bag by one corner to see how full it is, never press on it; a bag two-thirds to 70% full needs changing', parts: ['bag'] },
      { id: 'hose', text: 'With the machine on, feel the suction at the hose end to find a blockage', parts: ['hose', 'switch'] },
      { id: 'casing', text: 'The casing is not damaged and the wheels turn freely', parts: ['casing', 'wheels'] },
      { id: 'tools', text: 'The right accessories for the job are with the machine', parts: ['tools'] },
      { id: 'circuit', text: 'If the building needs a circuit breaker, check that it switches on and off properly', parts: [] },
    ],
  },
  { n: 6, phase: 'safety', title: 'Look for signs of pests and report them without disturbing anything', parts: [] },
  { n: 7, phase: 'safety', title: 'Look for damage to the building or fittings and report it', parts: [] },
  { n: 8, phase: 'method', title: 'Pick up large debris and sticky dirt first, and keep the refuse bag out of the way', parts: [] },
  { n: 9, phase: 'method', title: 'Set the floor head for the floor: brush on for hard floors, brush off for carpet', parts: ['head'] },
  {
    n: 10, phase: 'method', title: 'Plug in safely',
    parts: ['cable', 'switch'],
    checks: [
      { id: 'plug-dry', text: 'Socket switched off and hands dry before the plug goes in', parts: ['cable'] },
      { id: 'plug-where', text: 'Use a socket behind your line of work and near the exit', parts: ['cable'] },
      { id: 'plug-stand', text: 'Never stand on the cable', parts: ['cable'] },
    ],
  },
  { n: 11, phase: 'method', title: 'Start with the edges and corners, with the right accessory and a good body posture', card: 4, parts: ['tools', 'wand', 'hose'] },
  {
    n: 12, phase: 'method', title: 'Clean in overlapping passes, working away from the socket',
    parts: ['head', 'wand', 'hose', 'cable', 'switch'],
    checks: [
      { id: 'pass-away', text: 'Start at the socket and work away from it, so the cable stays behind you', parts: ['cable', 'head'] },
      { id: 'pass-traffic', card: 5, text: 'Give extra time to traffic lanes (entrances, exits, under desks on carpet) and go over them in both directions', parts: ['head'] },
      { id: 'pass-off', text: 'When you stop, switch off at the machine and at the socket, unplug, and park it clear of people', parts: ['switch', 'cable'] },
    ],
  },
  { n: 13, phase: 'storage', title: 'Clean the equipment, check it again and change the bag if needed, then store it so it can dry and air', card: 6, parts: ['bag', 'casing', 'cable', 'hose', 'wand', 'head', 'tools'] },
  { n: 14, phase: 'storage', title: 'Take down the warning signs and clean them before storing', parts: [] },
  { n: 15, phase: 'storage', title: 'Take off your PPE and wash your hands', parts: [] },
  { n: 16, phase: 'storage', title: 'Leave the store room clean, tidy and secure', card: 6, parts: [] },
];

// The two documents give slightly different figures for when a bag must be changed (two-thirds full
// in the procedure, above 70% on the job card). The figure the narrator says is still to be decided.

export const JOB_CARD = [
  { n: 1, title: 'Check the PAT test before operating the machine' },
  { n: 2, title: 'Inspect the wire (cable) for wear and tear' },
  { n: 3, title: 'Check the vacuum bag; change it if it is filled above 70%' },
  { n: 4, title: 'Start cleaning from the corners, keeping a proper body posture' },
  { n: 5, title: 'Pay special attention to high-traffic areas (entrance and exits)' },
  { n: 6, title: 'Clean and store the vacuum machine in its designated area inside the store room' },
];
