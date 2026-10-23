// Steps 1 to 4 of the procedure: arrive and make the area safe, know the paperwork, wash your hands,
// put on protective equipment. Each beat is one narrated sentence or two, with the action beside it.
import { SHOTS, orbit } from '../scene/shots.js';
import { PLACES } from '../scene/room.js';
import { V } from './moves.js';

// a point in front of the worker's chest, for hands that show or hold something
const front = (c, side = 0, up = 1.25, fwd = 0.38) => () => {
  const w = c.worker, f = w.forward(), l = V(f.z, 0, -f.x);
  return w.pos.clone().addScaledVector(f, fwd).addScaledVector(l, side).add(V(0, up, 0));
};
const facing = (extra = {}) => orbit((w) => w.worker.pos.clone().add(V(0, 1.0, 0)), { dist: 3.7, az: -0.4, el: 0.14, fov: 38, ...extra });

export const STEPS_1_4 = [
  {
    n: 1,
    title: { en: 'Arrive and make the area safe', hi: 'पहुँचें और जगह को सुरक्षित बनाएं', ne: 'आइपुग्नुहोस् र ठाउँ सुरक्षित बनाउनुहोस्' },
    beats: [
      {
        check: 'risk', cam: 'door',
        say: {
          en: 'You arrive at the work area. Before you start, look around for anything that could hurt you or other people, such as a wet floor, a trailing cable, or people walking through.',
          hi: 'आप काम की जगह पर पहुँचते हैं। शुरू करने से पहले चारों ओर देखें कि कोई ऐसी चीज़ तो नहीं जिससे आपको या दूसरों को चोट लग सकती है, जैसे गीला फ़र्श, फैली हुई तार, या आते-जाते लोग।',
          ne: 'तपाईं काम गर्ने ठाउँमा आइपुग्नुहुन्छ। सुरु गर्नुअघि वरिपरि हेर्नुहोस्, आफूलाई वा अरूलाई चोट लाग्न सक्ने कुनै कुरा छ कि, जस्तै भिजेको भुइँ, छरिएको तार, वा हिँडिरहेका मानिसहरू।',
        },
        act: function* (c) {
          c.pose('idle');
          yield* c.walk(3.7, -0.3);
          yield* c.walk(2.6, 0.7, { face: 0 });
          for (const p of [[1.0, 1.3, 2.6], [0.2, 0.3, -1.2], [3.2, 0.4, 1.5]]) { c.gaze(V(...p)); yield* c.wait(1.4); }
          c.gaze(null);
        },
      },
      {
        check: 'sign', cam: 'sign',
        say: {
          en: 'Then put out a warning sign, so that everyone can see that cleaning is going on here.',
          hi: 'फिर चेतावनी का बोर्ड रखें, ताकि सभी को दिखे कि यहाँ सफ़ाई चल रही है।',
          ne: 'त्यसपछि चेतावनी चिह्न राख्नुहोस्, ताकि सबैले देख्न सकून् कि यहाँ सफाइ भइरहेको छ।',
        },
        act: function* (c) {
          yield* c.walk(2.75, 1.2, { face: 0 });
          c.adjust({ crouch: 0.75, lean: 0.12 }); yield* c.wait(0.9);
          c.drop(c.props.sign, 2.75, 0, 1.7, 0);
          c.adjust({ crouch: 0, lean: 0 }); yield* c.wait(0.8);
          c.hl(['sign']); yield* c.wait(1.2);
          yield* c.walk(2.2, 0.4, { face: 0 });
        },
      },
    ],
  },
  {
    n: 2,
    title: { en: 'Know your paperwork', hi: 'अपने दस्तावेज़ जानें', ne: 'आफ्ना कागजात जान्नुहोस्' },
    beats: [
      {
        check: 'docs', cam: SHOTS.room,
        say: {
          en: 'Know the papers for this job. First, the task risk assessment. It lists the dangers, and how to stay safe.',
          hi: 'इस काम के कागज़ात जानें। पहला, टास्क रिस्क असेसमेंट। इसमें खतरे और बचाव के तरीके लिखे होते हैं।',
          ne: 'यस कामका कागजातहरू जान्नुहोस्। पहिलो, टास्क रिस्क एसेसमेन्ट। यसमा खतरा र सुरक्षित रहने तरिका लेखिएको हुन्छ।',
        },
        act: function* (c) {
          yield* c.walk(-0.3, -1.55, { face: Math.PI });
          const clip = c.props.clipboard; c.drop(clip, -0.1, 0.77, -2.5, 0); clip.rotation.set(-Math.PI / 2, 0, 0);
          c.adjust({ armL: [0.95, 0.1, 0.5], lean: 0.12 });
          yield* c.reach('L', V(-0.1, 0.87, -2.3), 0.9);
          c.release('L');
          c.carry(clip, { hand: 'L', off: [0, 0.0, 0.06], rot: [0, 0, 0] });
          c.cam(facing());
          yield* c.walk(0.4, -0.2, { face: 0 });
          c.pose({ headPitch: 0.1 });
          c.worker.setIK('L', front(c, 0.3, 1.1, 0.3)); c.worker.setIK('R', front(c, -0.3, 1.32, 0.3));
          const d = c.props.docs[0]; c.carry(d, { hand: 'R', off: [0, 0.0, 0.06], rot: [0, 0, 0] });
          c.gaze(() => d.position); yield* c.wait(2.2);
        },
      },
      {
        check: 'docs',
        say: {
          en: 'Second, the method statement, or Standard Operating Procedure. It gives the steps to follow, in order.',
          hi: 'दूसरा, मेथड स्टेटमेंट या स्टैंडर्ड ऑपरेटिंग प्रोसीजर। इसमें काम के चरण क्रम से लिखे होते हैं।',
          ne: 'दोस्रो, मेथड स्टेटमेन्ट वा स्ट्यान्डर्ड अपरेटिङ प्रोसिजर। यसमा काम गर्ने चरणहरू क्रमैसँग लेखिएका हुन्छन्।',
        },
        act: function* (c) {
          c.props.docs[0].visible = false; c.uncarry(c.props.docs[0]);
          const d = c.props.docs[1]; c.carry(d, { hand: 'R', off: [0, 0.0, 0.06], rot: [0, 0, 0] });
          c.gaze(() => d.position); yield* c.wait(2.2);
        },
      },
      {
        check: 'docs',
        say: {
          en: 'Third, the maker\'s operating instructions for the machine. Read them before you use it.',
          hi: 'तीसरा, मशीन बनाने वाले के संचालन निर्देश। मशीन चलाने से पहले उन्हें पढ़ें।',
          ne: 'तेस्रो, मेसिन बनाउने कम्पनीका सञ्चालन निर्देशन। मेसिन चलाउनुअघि ती पढ्नुहोस्।',
        },
        act: function* (c) {
          c.props.docs[1].visible = false; c.uncarry(c.props.docs[1]);
          const d = c.props.docs[2]; c.carry(d, { hand: 'R', off: [0, 0.0, 0.06], rot: [0, 0, 0] });
          c.gaze(() => d.position); yield* c.wait(2.2);
          c.gaze(null); d.visible = false; c.uncarry(d);
          const clip = c.props.clipboard; c.uncarry(clip); clip.visible = false;
          c.release('L'); c.release('R'); c.pose('idle');
        },
      },
    ],
  },
  {
    n: 3,
    title: { en: 'Wash your hands', hi: 'हाथ धोएं', ne: 'हात धुनुहोस्' },
    beats: [
      {
        check: 'wash', cam: 'basin',
        say: {
          en: 'Wash your hands the way your company policy says.',
          hi: 'अपनी कंपनी की नीति के अनुसार हाथ धोएं।',
          ne: 'आफ्नो कम्पनीको नीति अनुसार हात धुनुहोस्।',
        },
        act: function* (c) {
          yield* c.walk(PLACES.basin[0], PLACES.basin[1] - 0.2, { face: Math.PI });
          c.pose({ lean: 0.2, headPitch: 0.3, armR: [0.9, 0.2, 1.2], armL: [0.9, 0.2, 1.2] });
          c.w.water = true;
          const wash = (dx) => () => V(-1.7 + dx + 0.045 * Math.sin(c.w.time * 9), 1.02, -2.62 + 0.03 * Math.cos(c.w.time * 9));
          c.worker.setIK('R', wash(-0.04)); c.worker.setIK('L', wash(0.04));
          yield* c.wait(3.6);
          c.w.water = false; c.release('R'); c.release('L');
        },
      },
      {
        check: 'cuts',
        say: {
          en: 'Check for cuts and grazes. Cover any with a waterproof dressing, so that germs and cleaning products cannot get into your blood.',
          hi: 'कटे या छिले हुए हिस्से देखें। उन्हें वाटरप्रूफ पट्टी से ढकें, ताकि कीटाणु और सफ़ाई के रसायन खून में न जा सकें।',
          ne: 'काटिएको वा खाटा परेको ठाउँ छ कि जाँच गर्नुहोस्। त्यसलाई पानी नछिर्ने पट्टीले छोप्नुहोस्, ताकि जीवाणु र सफाइका रसायन रगतमा पस्न नपाऊन्।',
        },
        act: function* (c) {
          c.cam(facing({ dist: 3.0 }));
          yield* c.walk(-1.4, -0.4, { face: 0 });
          c.pose({ lean: 0.1, headPitch: 0.45, armR: [0.9, 0.2, 1.7], armL: [0.9, 0.2, 1.7] });
          c.worker.setIK('R', front(c, -0.08, 1.2, 0.34)); c.worker.setIK('L', front(c, 0.08, 1.2, 0.34));
          c.gaze(front(c, 0, 1.2, 0.34)); yield* c.wait(1.8);
          c.worker.setPPE('plaster', true); yield* c.wait(1.6);
          c.gaze(null); c.release('R'); c.release('L'); c.pose('idle');
        },
      },
    ],
  },
  {
    n: 4,
    title: { en: 'Put on protective equipment', hi: 'सुरक्षा उपकरण पहनें', ne: 'सुरक्षा उपकरण लगाउनुहोस्' },
    beats: [
      {
        check: 'ppe', cam: 'ppe',
        say: {
          en: 'Check and put on the protective equipment your risk assessment asks for. First, a high-visibility vest. Make sure it fits, suits the job, and is not damaged.',
          hi: 'आपके रिस्क असेसमेंट में जो सुरक्षा उपकरण बताए गए हैं, उन्हें जाँचें और पहनें। पहले, चमकीली जैकेट। देखें कि वह ठीक आती है, काम के लायक है और फटी नहीं है।',
          ne: 'तपाईंको रिस्क एसेसमेन्टले भनेका सुरक्षा उपकरण जाँच गरेर लगाउनुहोस्। पहिले, चम्किलो भेस्ट। यो नापमा मिलेको, काम सुहाउँदो र नफाटेको छ भन्ने हेर्नुहोस्।',
        },
        act: function* (c) {
          yield* c.walk(PLACES.ppe[0], PLACES.ppe[1], { face: -Math.PI / 2 });
          c.adjust({ lean: 0.15, headPitch: 0.3 });
          yield* c.reach('R', V(-3.45, 0.86, 0.03), 0.9);
          c.props.ppeVest.visible = false; c.release('R');
          c.adjust({ lean: 0, headPitch: 0 }); c.worker.setPPE('vest', true);
          yield* c.wait(1.6);
        },
      },
      {
        check: 'ppe',
        say: {
          en: 'Next, gloves. They should be the right ones for the job, with no holes.',
          hi: 'अब दस्ताने। वे काम के हिसाब से सही हों और उनमें कोई छेद न हो।',
          ne: 'अब पन्जा। ती काम सुहाउँदा हुनुपर्छ र प्वाल नभएका हुनुपर्छ।',
        },
        act: function* (c) {
          c.adjust({ lean: 0.15, headPitch: 0.3 });
          yield* c.reach('R', V(-3.45, 0.86, 0.33), 0.9);
          c.props.ppeGloves.visible = false; c.release('R');
          c.adjust({ lean: 0, headPitch: 0.25, armR: [0.9, 0.2, 1.6], armL: [0.9, 0.2, 1.6] }); c.worker.setPPE('gloves', true);
          yield* c.wait(1.8);
        },
      },
      {
        check: 'ppe',
        say: {
          en: 'And safety glasses, if the assessment asks for them. Keep them clean and undamaged.',
          hi: 'और सेफ़्टी चश्मा, अगर असेसमेंट में लिखा हो। उसे साफ़ और बिना टूटा-फूटा रखें।',
          ne: 'र सुरक्षा चस्मा, यदि एसेसमेन्टले भनेको छ भने। यसलाई सफा र नफुटेको राख्नुहोस्।',
        },
        act: function* (c) {
          c.pose({ lean: 0.15, headPitch: 0.3 });
          yield* c.reach('R', V(-3.45, 0.86, 0.55), 0.9);
          c.props.ppeGlasses.visible = false; c.release('R');
          c.pose('idle'); c.worker.setPPE('glasses', true);
          c.cam(facing({ dist: 3.2, az: 0.2 }));
          yield* c.walk(-1.8, 0.4, { face: 0 });
          c.pose('wave'); yield* c.wait(1.6); c.pose('idle');
        },
      },
    ],
  },
];
