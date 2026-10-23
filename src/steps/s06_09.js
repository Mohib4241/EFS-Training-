// Steps 6 to 9: look for pests, look for damage, clear large litter, choose the floor-head setting.
import { SHOTS, orbit, onPart, fixed, onWorker } from '../scene/shots.js';
import { PLACES } from '../scene/room.js';
import { V } from './moves.js';

// a point beside the worker's head, where a phone goes to the ear
const ear = (c) => () => {
  const w = c.worker, h = w.head.getWorldPosition(V(0, 0, 0));
  return h.addScaledVector(w.right(), 0.13).addScaledVector(w.forward(), 0.02).add(V(0, -0.02, 0));
};
const behind = (o = {}) => onWorker({ dist: 3.4, az: 0.55, el: 0.42, lift: 0.5, fov: 40, ...o });

export const STEPS_6_9 = [
  {
    n: 6,
    title: { en: 'Look for pests', hi: 'कीड़ों-चूहों के निशान देखें', ne: 'कीरा र मुसाका चिह्न हेर्नुहोस्' },
    beats: [
      {
        check: 'pests', cam: 'store',
        say: {
          en: 'Look for signs of pests, such as droppings or gnawed things, in the cleaning store and all around the work area.',
          hi: 'सफ़ाई के स्टोर और काम की पूरी जगह में कीड़ों या चूहों के निशान देखें, जैसे बीट या कुतरी हुई चीज़ें।',
          ne: 'सफाइ भण्डार र काम गर्ने सबै ठाउँमा कीरा वा मुसाका चिह्न हेर्नुहोस्, जस्तै मल वा कुतरिएका सामान।',
        },
        act: function* (c) {
          yield* c.walk(PLACES.store[0], PLACES.store[1], { face: Math.PI });
          c.w.setAnim('store', 1); yield* c.wait(1.2);
          c.pose({ headPitch: 0.1 });
          for (const p of [[-3.6, 1.6, -2.5], [-3.0, 0.5, -2.5], [-3.3, 1.9, -2.5]]) { c.gaze(V(...p)); yield* c.wait(1.1); }
          c.gaze(null);
        },
      },
      {
        check: 'pests', cam: fixed([-0.9, 1.3, -1.9], [-3.1, 0.1, -2.1], 40), hl: ['pests'],
        say: {
          en: 'If you find any, report it as your company policy says. But do not touch it or clean it up: the pest-control company needs it as evidence.',
          hi: 'अगर कुछ मिले तो कंपनी की नीति के अनुसार रिपोर्ट करें। उसे छुएं या साफ़ न करें: पेस्ट कंट्रोल कंपनी को उसकी सबूत के तौर पर ज़रूरत होती है।',
          ne: 'केही भेटिए कम्पनीको नीति अनुसार रिपोर्ट गर्नुहोस्। तर त्यसलाई नछुनुहोस् र सफा नगर्नुहोस्: पेस्ट कन्ट्रोल कम्पनीलाई त्यो प्रमाणका रूपमा चाहिन्छ।',
        },
        act: function* (c) {
          c.props.pests.visible = true;
          c.adjust({ lean: 0.2, headPitch: 0.45 }); c.gaze(V(-3.1, 0.05, -2.1)); yield* c.wait(1.6);
          yield* c.walk(-2.5, -1.0, { face: Math.atan2(-0.6, -1.1) });
          c.pose('idle'); c.gaze(null);
          const ph = c.props.phone; c.carry(ph, { hand: 'R', off: [0, 0, 0.0], rot: [0, 0, 0] });
          c.worker.setIK('R', ear(c)); c.adjust({ armR: [1.2, 0.4, 2.0] });
          yield* c.wait(3.0);
          c.release('R'); c.uncarry(ph); ph.visible = false; c.pose('idle');
        },
      },
    ],
  },
  {
    n: 7,
    title: { en: 'Look for damage', hi: 'टूट-फूट देखें', ne: 'बिग्रिएको ठाउँ हेर्नुहोस्' },
    beats: [
      {
        check: 'damage', cam: 'finds', hl: ['crack', 'torn'],
        say: {
          en: 'Look for damage too, such as broken tiles, torn or snagged carpet, or chipped desks, in the store and in the work area.',
          hi: 'टूट-फूट भी देखें, जैसे टूटी टाइलें, फटा या उधड़ा कालीन, या छिला हुआ डेस्क, स्टोर में और काम की जगह पर।',
          ne: 'बिग्रिएको ठाउँ पनि हेर्नुहोस्, जस्तै फुटेको टायल, च्यातिएको वा उप्किएको कार्पेट, वा खिइएको डेस्क, भण्डारमा र काम गर्ने ठाउँमा।',
        },
        act: function* (c) {
          c.props.crack.visible = true; c.props.torn.visible = true;
          yield* c.walk(-1.0, -0.6, { face: Math.atan2(0.5, -0.8) });
          c.adjust({ lean: 0.15, headPitch: 0.4 }); c.gaze(V(-0.5, 0.02, -1.4));
          c.worker.setIK('R', V(-0.6, 0.55, -1.0)); c.adjust({ armR: [1.2, 0.1, 0.3] });
          yield* c.wait(2.2);
          c.release('R'); c.pose('idle'); c.gaze(V(0.6, 0.05, 1.8));
          yield* c.walk(-0.2, 1.0, { face: Math.atan2(0.8, 0.8) });
          c.worker.setIK('R', V(0.4, 0.5, 1.5)); c.adjust({ armR: [1.2, 0.1, 0.3], headPitch: 0.4 });
          yield* c.wait(2.2);
          c.release('R'); c.gaze(null); c.pose('idle');
        },
      },
      {
        check: 'damage', cam: 'finds', hl: ['crack', 'torn'],
        say: {
          en: 'Report it as your company policy says. That stops it getting worse, and stops you being blamed for it.',
          hi: 'कंपनी की नीति के अनुसार इसकी रिपोर्ट करें। इससे नुकसान बढ़ता नहीं और आप पर दोष नहीं आता।',
          ne: 'कम्पनीको नीति अनुसार रिपोर्ट गर्नुहोस्। यसले बिग्रिएको अझ बढ्न दिँदैन, र तपाईंलाई दोष लाग्दैन।',
        },
        act: function* (c) {
          const ph = c.props.phone; c.carry(ph, { hand: 'R', off: [0, 0, 0], rot: [0, 0, 0] });
          c.worker.setIK('R', ear(c)); c.adjust({ armR: [1.2, 0.4, 2.0] });
          yield* c.wait(3.2);
          c.release('R'); c.uncarry(ph); ph.visible = false; c.pose('idle');
        },
      },
    ],
  },
  {
    n: 8,
    title: { en: 'Clear large litter first', hi: 'पहले बड़ा कचरा हटाएं', ne: 'पहिले ठूलो फोहोर हटाउनुहोस्' },
    beats: [
      {
        check: 'litter', cam: 'kit',
        say: {
          en: 'Start by removing large pieces of litter and sticky dirt. Take the dustpan, the brush, the scraper and the refuse bag, and put the bag down where nobody can trip over it.',
          hi: 'सबसे पहले बड़ा कचरा और चिपकी गंदगी हटाएं। डस्टपैन, ब्रश, स्क्रैपर और कचरे की थैली लें, और थैली ऐसी जगह रखें जहाँ कोई ठोकर न खाए।',
          ne: 'सुरुमा ठूलो फोहोर र टाँसिएको फोहोर हटाउनुहोस्। डस्टप्यान, ब्रश, स्क्रेपर र फोहोरको झोला लिनुहोस्, र झोला कसैले ठेस नखाने ठाउँमा राख्नुहोस्।',
        },
        act: function* (c) {
          yield* c.walk(PLACES.equip[0], PLACES.equip[1], { face: -Math.PI / 2 });
          c.adjust({ lean: 0.15, headPitch: 0.3 });
          yield* c.reach('R', V(-3.45, 0.95, 2.05), 0.8);
          const bag = c.props.refuse; c.carry(bag, { hand: 'R', off: [0, -0.27, 0.02], rot: [0, 0, 0] });
          c.release('R'); c.pose('idle');
          c.cam(behind({ az: 0.9 }));
          yield* c.walk(-2.25, -2.1, { face: Math.PI });
          c.adjust({ crouch: 0.7, lean: 0.25 }); yield* c.wait(0.9);
          c.drop(bag, -2.25, 0, -2.72, 0);
          c.adjust({ crouch: 0, lean: 0 }); yield* c.wait(0.6);
          c.cam('kit');
          yield* c.walk(PLACES.equip[0], PLACES.equip[1], { face: -Math.PI / 2 });
          c.adjust({ lean: 0.15, headPitch: 0.3 });
          yield* c.reach('L', V(-3.45, 0.82, 1.93), 0.7);
          c.carry(c.props.dustpan, { hand: 'L', off: [0, 0, 0.12], rot: [0, 0, 0] }); c.release('L');
          yield* c.reach('R', V(-3.27, 0.82, 1.95), 0.7);
          c.carry(c.props.brush, { hand: 'R', off: [0, 0, 0.1], rot: [0, 0, 0] }); c.release('R');
          c.pose('idle');
        },
      },
      {
        check: 'litter', cam: behind({ dist: 3.0 }),
        say: {
          en: 'Scrape off anything stuck to the floor, like this chewing gum.',
          hi: 'फ़र्श पर चिपकी चीज़ को खुरचकर हटाएं, जैसे यह च्यूइंग गम।',
          ne: 'भुइँमा टाँसिएको कुरा, जस्तै यो चुइङ गम, कोतरेर हटाउनुहोस्।',
        },
        act: function* (c) {
          const gum = c.props.stuck, sc = c.props.scraper;
          c.props.brush.visible = false; c.uncarry(c.props.brush);
          c.carry(sc, { hand: 'R', off: [0, 0, 0.1], rot: [0, 0, 0] }); sc.visible = true;
          yield* c.walk(-1.0, 1.55, { face: Math.PI });
          c.adjust({ crouch: 0.75, lean: 0.35, headPitch: 0.45 });
          c.gaze(V(-1.0, 0.02, 1.05));
          c.worker.setIK('R', () => V(-1.0 + 0.04 * Math.sin(c.w.time * 10), 0.05, 1.12));
          yield* c.wait(2.8);
          gum.visible = false;
          c.release('R'); c.gaze(null); c.pose('idle'); c.uncarry(sc); sc.visible = false;
        },
      },
      {
        check: 'litter', cam: behind({ dist: 3.4, az: 0.7 }),
        say: {
          en: 'Sweep the loose litter into the dustpan, and put it into the refuse bag.',
          hi: 'बिखरा हुआ कचरा झाड़कर डस्टपैन में लें और कचरे की थैली में डालें।',
          ne: 'छरिएको फोहोरलाई बढारेर डस्टप्यानमा लिनुहोस्, र फोहोरको झोलामा हाल्नुहोस्।',
        },
        act: function* (c) {
          const brush = c.props.brush; c.carry(brush, { hand: 'R', off: [0, 0, 0.1], rot: [0, 0, 0] });
          for (const item of c.props.debris.filter((d) => d !== c.props.stuck)) {
            const p = item.position.clone();
            yield* c.walk(p.x, p.z + 0.65, { face: Math.PI });
            c.adjust({ crouch: 0.75, lean: 0.35, headPitch: 0.45 });
            const pan = V(p.x - 0.05, 0.04, p.z + 0.2);
            c.worker.setIK('L', pan);
            c.worker.setIK('R', () => V(p.x + 0.1 * Math.sin(c.w.time * 8), 0.05, p.z - 0.02));
            yield* c.wait(1.3);
            yield* c.tween(0.5, (k) => { item.position.lerp(V(pan.x, 0.07, pan.z), k); });
            item.visible = false;
            c.release('L'); c.release('R'); c.pose('idle');
          }
          yield* c.walk(-2.25, -2.1, { face: Math.PI });
          c.adjust({ crouch: 0.5, lean: 0.3 });
          c.worker.setIK('L', V(-2.25, 0.35, -2.7)); yield* c.wait(1.4);
          c.release('L'); c.pose('idle');
          // the kit goes back on its table
          for (const [prop, x, z] of [[c.props.dustpan, -3.45, 1.93], [c.props.brush, -3.27, 1.95], [c.props.scraper, -3.25, 1.65]]) { c.drop(prop, x, 0.77, z, 0); prop.visible = true; }
        },
      },
    ],
  },
  {
    n: 9,
    title: { en: 'Choose the right setting', hi: 'सही सेटिंग चुनें', ne: 'सही सेटिङ छान्नुहोस्' },
    beats: [
      {
        check: 'brush-hard', cam: onPart('head', { dist: 1.5, az: -0.45, el: 0.4, fov: 34 }), hl: ['head'],
        say: {
          en: 'Now choose the setting that suits the floor. On hard floors, the brush is on.',
          hi: 'अब फ़र्श के हिसाब से सही सेटिंग चुनें। सख़्त फ़र्श पर ब्रश चालू रखा जाता है।',
          ne: 'अब भुइँ सुहाउँदो सेटिङ छान्नुहोस्। कडा भुइँमा ब्रश चालु राखिन्छ।',
        },
        act: function* (c) {
          const vac = c.vac; vac.brushT = 1;
          const h = vac.tool.position;
          yield* c.walk(h.x + 0.45, h.z - 0.6, { face: Math.atan2(-0.45, 0.6) });
          c.adjust({ crouch: 0.8, lean: 0.3, headPitch: 0.4 });
          c.worker.setIK('R', () => vac.headFloor.localToWorld(V(0.1, 0.07, -0.02)));
          yield* c.wait(3.2); c.tick('head');
        },
      },
      {
        check: 'brush-carpet', cam: onPart('head', { dist: 1.5, az: -0.45, el: 0.4, fov: 34 }), hl: ['head'],
        say: {
          en: 'On carpet and other soft floors, retract the brush. We start on the carpet, so press the pedal to retract it.',
          hi: 'कालीन और दूसरे नरम फ़र्श पर ब्रश अंदर कर दें। हम कालीन से शुरू कर रहे हैं, इसलिए पैडल दबाकर ब्रश अंदर करें।',
          ne: 'कार्पेट र अरू नरम भुइँमा ब्रश भित्र लैजानुहोस्। हामी कार्पेटबाट सुरु गर्दैछौँ, त्यसैले प्याडल थिचेर ब्रश भित्र लैजानुहोस्।',
        },
        act: function* (c) {
          const vac = c.vac;
          yield* c.wait(0.6);
          vac.pedal = 1; vac.brushT = 0;
          yield* c.wait(2.8); c.tick('head');
          c.release('R'); c.pose('idle');
        },
      },
    ],
  },
];
