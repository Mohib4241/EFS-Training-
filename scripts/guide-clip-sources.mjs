// Prints every Guide line that needs a recording as JSON: [{key, language, text}]
import {clipSources} from '../src/guide-audio.js';
console.log(JSON.stringify(clipSources(),null,1));
