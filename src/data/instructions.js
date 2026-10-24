// What the Instructions page checks, step by step, and where each point comes from: `sop` is the
// 16-step Standard Operating Procedure; `brief` is the plain good practice the training brief asked for
// that the procedure does not spell out (a dry floor, a plug that is straight, pulling a plug out by the
// plug). The job card is not used here. A test checks that every check is shown by a narrated beat.
export const INSTR_PHASES = {
  before: { label: 'Before you use the machine' },
  care: { label: 'Looking after the machine' },
};

export const INSTR_CHECKS = [
  { n: 1, phase: 'before', title: 'Everything must be dry', checks: [
    { id: 'floor-dry', from: 'brief', text: 'Do not vacuum a wet floor; dry it first or wait' },
    { id: 'hands-dry', from: 'sop', text: 'Dry hands; the machine, cable and plug dry too' },
  ] },
  { n: 2, phase: 'before', title: 'Check the cable', checks: [
    { id: 'cable-bare', from: 'sop', text: 'A cable with bare wire is never used; report it' },
    { id: 'cable-cloth', from: 'sop', text: 'Run a clean cloth along the cable from the machine to the plug' },
  ] },
  { n: 3, phase: 'before', title: 'Check the PAT label', checks: [{ id: 'pat', from: 'sop', text: 'The portable appliance test is in date, as company policy says' }] },
  { n: 4, phase: 'before', title: 'Check the dust bag', checks: [{ id: 'bag', from: 'sop', text: 'Lift the bag by a corner, never press; change at two-thirds full' }] },
  { n: 5, phase: 'before', title: 'Check the hose, tube and body', checks: [
    { id: 'hose-body', from: 'sop', text: 'Hose and tube clear; body undamaged; wheels free' },
    { id: 'tools', from: 'sop', text: 'The right accessories are with the machine' },
  ] },
  { n: 6, phase: 'before', title: 'Check the connection', checks: [
    { id: 'socket-off', from: 'sop', text: 'Socket switched off, not cracked or loose' },
    { id: 'plug-pins', from: 'brief', text: 'Plug pins straight; plug not cracked or burnt' },
    { id: 'plug-in', from: 'sop', text: 'Plug in with dry hands; it sits firm; then switch the socket on' },
  ] },
  { n: 7, phase: 'before', title: 'Test the suction', checks: [{ id: 'suction', from: 'sop', text: 'Suction is felt when the machine is on; weak suction means a blockage' }] },
  { n: 8, phase: 'care', title: 'Switch off and unplug', checks: [
    { id: 'switch-off', from: 'sop', text: 'Switch off at the machine and at the socket, then unplug' },
    { id: 'unplug-plug', from: 'brief', text: 'Pull on the plug, never the cable' },
  ] },
  { n: 9, phase: 'care', title: 'Wipe the machine', checks: [{ id: 'wipe', from: 'sop', text: 'Wipe the casing, wheels and accessories with the right colour cloth' }] },
  { n: 10, phase: 'care', title: 'Change the dust bag', checks: [{ id: 'bag-change', from: 'sop', text: 'The end of the job is the best time to change the bag, and it goes out with the waste' }] },
  { n: 11, phase: 'care', title: 'Check again and report', checks: [{ id: 'recheck', from: 'sop', text: 'Check the machine again for damage and report it' }] },
  { n: 12, phase: 'care', title: 'Store it', checks: [{ id: 'store', from: 'sop', text: 'Store it where air can circulate, in its place' }] },
];
