// The words on the controls, in the three languages. The narration itself is in src/steps/.
// There are no subtitles: the narration is only spoken. Step headings and part names are labels.
export const LANG_NAMES = { en: 'English', hi: 'हिन्दी', ne: 'नेपाली' };

export const UI = {
  en: {
    title: 'Vacuum Training', sub: 'Soft services · step by step',
    start: 'Start training', choose: 'Choose the language of the narrator', again: 'Watch again',
    play: 'Play', pause: 'Pause', next: 'Next step', prev: 'Previous step', steps: 'Steps', step: 'Step', of: 'of',
    sound: 'Sound', muted: 'Sound off', language: 'Language', done: 'Training complete', doneSub: 'You have been through every step of the vacuum cleaning procedure.',
    noVoice: 'No voice for this language on this device. The scene still plays, without sound.',
    approxVoice: 'No Nepali voice on this device, so a Hindi voice reads it. The pronunciation will be approximate.',
    partsUsed: 'Parts used in this step', phases: { safety: 'Before you start', method: 'Cleaning', storage: 'Finishing and storing' },
    hint: 'Space: play or pause · ← →: step · L: language · M: sound',
  },
  hi: {
    title: 'वैक्यूम प्रशिक्षण', sub: 'सॉफ़्ट सर्विसेज़ · चरण दर चरण',
    start: 'प्रशिक्षण शुरू करें', choose: 'वर्णन की भाषा चुनें', again: 'फिर से देखें',
    play: 'चलाएं', pause: 'रोकें', next: 'अगला चरण', prev: 'पिछला चरण', steps: 'चरण', step: 'चरण', of: '/',
    sound: 'आवाज़', muted: 'आवाज़ बंद', language: 'भाषा', done: 'प्रशिक्षण पूरा हुआ', doneSub: 'आपने वैक्यूम सफ़ाई की पूरी प्रक्रिया देख ली है।',
    noVoice: 'इस डिवाइस पर इस भाषा की आवाज़ नहीं है। दृश्य बिना आवाज़ के चलता रहेगा।',
    approxVoice: 'इस डिवाइस पर नेपाली आवाज़ नहीं है, इसलिए हिन्दी आवाज़ पढ़ेगी। उच्चारण लगभग ही सही होगा।',
    partsUsed: 'इस चरण में काम आने वाले हिस्से', phases: { safety: 'शुरू करने से पहले', method: 'सफ़ाई', storage: 'काम ख़त्म करना और रखना' },
    hint: 'स्पेस: चलाएं या रोकें · ← →: चरण · L: भाषा · M: आवाज़',
  },
  ne: {
    title: 'भ्याकुम तालिम', sub: 'सफ्ट सर्भिस · चरण-चरणमा',
    start: 'तालिम सुरु गर्नुहोस्', choose: 'वर्णनको भाषा छान्नुहोस्', again: 'फेरि हेर्नुहोस्',
    play: 'चलाउनुहोस्', pause: 'रोक्नुहोस्', next: 'अर्को चरण', prev: 'अघिल्लो चरण', steps: 'चरणहरू', step: 'चरण', of: '/',
    sound: 'आवाज', muted: 'आवाज बन्द', language: 'भाषा', done: 'तालिम सकियो', doneSub: 'तपाईंले भ्याकुम सफाइको सबै चरण हेर्नुभयो।',
    noVoice: 'यो उपकरणमा यो भाषाको आवाज छैन। दृश्य आवाजबिना नै चल्छ।',
    approxVoice: 'यो उपकरणमा नेपाली आवाज छैन, त्यसैले हिन्दी आवाजले पढ्छ। उच्चारण लगभग मात्र मिल्छ।',
    partsUsed: 'यो चरणमा प्रयोग हुने भागहरू', phases: { safety: 'सुरु गर्नुअघि', method: 'सफाइ', storage: 'काम सकेर राख्ने' },
    hint: 'स्पेस: चलाउने वा रोक्ने · ← →: चरण · L: भाषा · M: आवाज',
  },
};

export const PART_NAMES = {
  casing: { en: 'Casing', hi: 'ढाँचा (बॉडी)', ne: 'खोल' },
  wheels: { en: 'Wheels', hi: 'पहिए', ne: 'पाङ्ग्रा' },
  switch: { en: 'On / off switch', hi: 'चालू / बंद स्विच', ne: 'अन / अफ स्विच' },
  cable: { en: 'Power cable and plug', hi: 'बिजली की तार और प्लग', ne: 'बिजलीको तार र प्लग' },
  pat: { en: 'PAT test label', hi: 'पैट टेस्ट लेबल', ne: 'प्याट टेस्ट लेबल' },
  bag: { en: 'Dust bag', hi: 'धूल की थैली (डस्ट बैग)', ne: 'धुलो झोला' },
  hose: { en: 'Hose', hi: 'होज़ पाइप', ne: 'होज पाइप' },
  wand: { en: 'Wand (tube)', hi: 'वैंड (नली)', ne: 'वान्ड (ट्युब)' },
  head: { en: 'Floor head', hi: 'फ़्लोर हेड', ne: 'फ्लोर हेड' },
  tools: { en: 'Accessories', hi: 'अटैचमेंट', ne: 'सामानहरू (एक्सेसरी)' },
  // things that are not part of the vacuum but are pointed at
  breaker: { en: 'Circuit breaker', hi: 'सर्किट ब्रेकर', ne: 'सर्किट ब्रेकर' },
  socket: { en: 'Wall socket', hi: 'दीवार का सॉकेट', ne: 'भित्ताको सकेट' },
  sign: { en: 'Warning sign', hi: 'चेतावनी बोर्ड', ne: 'चेतावनी चिह्न' },
  cloths: { en: 'Colour-coded cloths', hi: 'रंग वाले कपड़े', ne: 'रङ छुट्याइएका कपडा' },
  pests: { en: 'Signs of pests', hi: 'कीड़ों-चूहों के निशान', ne: 'कीरा र मुसाका चिह्न' },
  crack: { en: 'Broken tile', hi: 'टूटी टाइल', ne: 'फुटेको टायल' },
  torn: { en: 'Torn carpet', hi: 'फटा कालीन', ne: 'च्यातिएको कार्पेट' },
  lane: { en: 'Traffic lane', hi: 'आवाजाही का रास्ता', ne: 'आवतजावतको बाटो' },
};
