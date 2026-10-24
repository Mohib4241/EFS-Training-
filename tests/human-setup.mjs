// The narrator's body for tests: made directly from the model (a coarser, quicker version of what the
// build makes), since there is no page to load dist/human.bin into.
import { generateHuman } from '../tools/human.mjs';
import { setHumanData, fromGenerated, humanData } from '../src/scene/human/body.js';

if (!humanData()) setHumanData(fromGenerated(await generateHuman({ quick: true })));
