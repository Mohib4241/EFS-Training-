// Steps 13 to 16: clean and store the equipment, take down the warning signs, take off protective
// equipment and wash your hands, leave the store tidy and secure.
import { SHOTS, orbit, onPart, fixed, onWorker } from '../scene/shots.js';
import { PLACES } from '../scene/room.js';
import { V, takeTool, putDownTool } from './moves.js';

const vacShot = (o = {}) => orbit((w) => w.vac.root.position.clone().add(V(0.4, 0.3, 0)), { dist: 3.0, az: 0.1, el: 0.4, fov: 38, ...o });
const facing = (o = {}) => orbit((w) => w.worker.pos.clone().add(V(0, 1.2, 0)), { dist: 2.9, az: -0.4, el: 0.12, fov: 36, ...o });

export const STEPS_13_16 = [
  {
    n: 13,
    title: { en: 'Clean and store the equipment', hi: 'उपकरण साफ़ करके रखें', ne: 'उपकरण सफा गरेर राख्नुहोस्' },
    beats: [
      {
        check: 'clean', cam: vacShot(),
        say: {
          en: 'Clean the machine and your equipment. Wipe the casing and the wheels, and wipe down the accessories. Used cloths go to the laundry, as your company procedure says.',
          hi: 'मशीन और अपने उपकरण साफ़ करें। ढाँचा, पहिए और अटैचमेंट पोंछें। इस्तेमाल किए कपड़े कंपनी की प्रक्रिया के अनुसार धुलाई में भेजें।',
          ne: 'मेसिन र आफ्ना उपकरण सफा गर्नुहोस्। खोल, पाङ्ग्रा र सामानहरू पुछ्नुहोस्। प्रयोग गरिएका कपडा कम्पनीको प्रक्रिया अनुसार धुलाइमा पठाउनुहोस्।',
        },
        act: function* (c) {
          const vac = c.vac, p = vac.root.position;
          c.carry(c.props.cloth, { hand: 'L', off: [0, -0.02, 0], rot: [0, 0, 0] });
          yield* c.walk(p.x + 0.5, p.z - 0.55, { face: Math.atan2(-0.5, 0.55) });
          c.adjust({ lean: 0.3, crouch: 0.2, headPitch: 0.3 });
          const wipe = (get) => () => get().add(V(0.09 * Math.sin(c.w.time * 6), 0.02 * Math.sin(c.w.time * 12), 0.07 * Math.cos(c.w.time * 6)));
          c.hl(['casing']); c.worker.setIK('L', wipe(() => vac.anchor.casing().add(V(0, -0.05, 0.1)))); yield* c.wait(2.4);
          c.hl(['wheels']); c.adjust({ crouch: 0.55 }); c.worker.setIK('L', wipe(() => vac.anchor.wheels())); yield* c.wait(2.0);
          c.hl(['tools']); c.adjust({ crouch: 0.2 }); c.worker.setIK('L', wipe(() => vac.anchor.tools())); yield* c.wait(2.0);
          c.noHl(); c.release('L'); c.pose('idle');
          c.uncarry(c.props.cloth); c.props.cloth.visible = false;
        },
      },
      {
        check: 'bag-change', cam: onPart('bag', { dist: 1.5, az: -0.3, el: 0.42, fov: 34 }), hl: ['bag'],
        say: {
          en: 'Do the safety checks again. This is the best time to change the vacuum bag. Here it is more than two-thirds full, so we change it. The checks also show if the machine was damaged while in use, so you can report it.',
          hi: 'सुरक्षा जाँच फिर से करें। वैक्यूम बैग बदलने का यही सबसे अच्छा समय है। यहाँ वह दो-तिहाई से ज़्यादा भरा है, इसलिए हम उसे बदलते हैं। जाँच से यह भी पता चलता है कि इस्तेमाल में मशीन को नुकसान तो नहीं हुआ, ताकि आप रिपोर्ट कर सकें।',
          ne: 'सुरक्षा जाँच फेरि गर्नुहोस्। भ्याकुम झोला बदल्ने यही सबैभन्दा राम्रो समय हो। यहाँ यो दुई तिहाईभन्दा बढी भरिएको छ, त्यसैले हामी बदल्छौँ। जाँचले प्रयोगमा मेसिन बिग्रियो कि भन्ने पनि देखाउँछ, ताकि तपाईंले रिपोर्ट गर्न सक्नुहोस्।',
        },
        act: function* (c) {
          const vac = c.vac, p = vac.root.position;
          vac.setFill(0.75);
          const sx = p.x + 0.5, sz = p.z - 0.55;
          yield* c.walk(sx, sz, { face: Math.atan2(p.x - sx, p.z - sz) });
          c.adjust({ crouch: 0.3, lean: 0.3, headPitch: 0.3 });
          vac.lidT = 1; yield* c.wait(1.1);
          vac.bagLiftT = 1;
          c.worker.setIK('R', () => vac.bagBody.localToWorld(V(0.13, 0.17, 0.04)));
          yield* c.wait(2.4);                                    // it is well over two-thirds full
          vac.bagShown = false; yield* c.wait(1.0);              // the full bag goes into the refuse bag
          vac.setFill(0); vac.bagShown = true; vac.bagLiftT = 0; // a new bag goes in
          yield* c.wait(1.6);
          vac.lidT = 0; c.release('R'); c.pose('idle'); yield* c.wait(0.8);
        },
      },
      {
        check: 'store', cam: 'store',
        say: {
          en: 'Store the machine so that air can move around it and help it dry. Put it in its marked place in the store, with the cable coiled neatly.',
          hi: 'मशीन को ऐसे रखें कि उसके चारों ओर हवा आ-जा सके और वह सूख सके। उसे स्टोर में उसकी निशान लगी जगह पर रखें, तार को सलीके से लपेटकर।',
          ne: 'मेसिनलाई वरिपरि हावा चल्न र सुक्न सक्ने गरी राख्नुहोस्। यसलाई भण्डारमा चिह्न लगाइएको ठाउँमा, तार मिलाएर बेरेर राख्नुहोस्।',
        },
        act: function* (c) {
          const vac = c.vac, from = vac.root.position.clone(), to = V(-3.35, 0, -2.62);
          c.w.cableCoil();
          // go to the machine, then wheel it to the store
          yield* c.walk(from.x + 0.3, from.z + 0.9, { face: Math.PI });
          c.w.setAnim('store', 1);
          c.cam(orbit((w) => w.vac.root.position.clone().add(V(0, 0.4, 0)), { dist: 3.6, az: 0.5, el: 0.4, fov: 40 }));
          const startYaw = vac.root.rotation.y;
          let k = 0;
          while (k < 1) {
            k = Math.min(1, k + c.dt / 5.5);
            vac.root.position.lerpVectors(from, to, k * k * (3 - 2 * k));
            vac.root.rotation.y = startYaw + (0 - startYaw) * Math.min(1, k * 1.6);
            const w = vac.root.position;
            c.worker.walkTo(w.x + 0.35, w.z + 0.85, c.dt, 1.0, null);
            yield;
          }
          c.worker.speed = 0;
          c.cam('store'); yield* c.wait(1.6);
          yield* c.walk(-2.5, -1.2, { face: Math.PI });
        },
      },
    ],
  },
  {
    n: 14,
    title: { en: 'Take down the warning signs', hi: 'चेतावनी बोर्ड हटाएं', ne: 'चेतावनी चिह्न हटाउनुहोस्' },
    beats: [
      {
        check: 'signs-down', cam: 'sign',
        say: {
          en: 'Take down the warning signs. Wipe them clean after each use, to avoid spreading germs from one area to another, then store them safely.',
          hi: 'चेतावनी बोर्ड हटाएं। हर इस्तेमाल के बाद उन्हें पोंछकर साफ़ करें, ताकि कीटाणु एक जगह से दूसरी जगह न फैलें, फिर उन्हें सुरक्षित रखें।',
          ne: 'चेतावनी चिह्नहरू हटाउनुहोस्। प्रत्येक प्रयोगपछि पुछेर सफा गर्नुहोस्, ताकि जीवाणु एक ठाउँबाट अर्को ठाउँमा नफैलियोस्, अनि सुरक्षित राख्नुहोस्।',
        },
        act: function* (c) {
          const sign = c.props.sign;
          c.carry(c.props.cloth, { hand: 'L', off: [0, -0.02, 0], rot: [0, 0, 0] });
          yield* c.walk(2.75, 1.15, { face: 0, speed: 1.2 });
          // wipe it with the cloth
          c.adjust({ lean: 0.2, headPitch: 0.3 });
          c.worker.setIK('L', () => V(2.75 + 0.1 * Math.sin(c.w.time * 7), 0.4 + 0.05 * Math.sin(c.w.time * 9), 1.62));
          c.hl(['sign']); yield* c.wait(2.6); c.noHl(); c.release('L');
          c.uncarry(c.props.cloth); c.props.cloth.visible = false;
          // pick it up and take it to the store
          c.adjust({ crouch: 0.7, lean: 0.2 }); yield* c.reach('R', V(2.75, 0.5, 1.65), 0.8);
          c.carry(sign, { hand: 'R', off: [0, -0.62, 0.02], rot: [0, Math.PI / 2, 0] }); c.release('R');
          c.adjust({ crouch: 0, lean: 0 }); c.pose('idle');
          c.cam(orbit((w) => w.worker.pos.clone().add(V(0, 0.8, 0)), { dist: 4.2, az: 0.5, el: 0.35, fov: 40 }));
          yield* c.walk(-2.7, -1.3, { speed: 1.25 });
          yield* c.walk(-2.9, -1.9, { face: Math.PI, speed: 1.0 });
          c.cam('store');
          c.adjust({ crouch: 0.7, lean: 0.2 }); yield* c.wait(0.9);
          c.drop(sign, -2.95, 0.1, -2.55, 0);
          c.adjust({ crouch: 0, lean: 0 }); yield* c.wait(0.8);
        },
      },
    ],
  },
  {
    n: 15,
    title: { en: 'Remove PPE and wash your hands', hi: 'सुरक्षा उपकरण उतारें और हाथ धोएं', ne: 'सुरक्षा उपकरण फुकाल्नुहोस् र हात धुनुहोस्' },
    beats: [
      {
        check: 'ppe-off', cam: facing({ dist: 2.6 }),
        say: {
          en: 'Take off your protective equipment: gloves, glasses and vest.',
          hi: 'अपने सुरक्षा उपकरण उतारें: दस्ताने, चश्मा और जैकेट।',
          ne: 'आफ्ना सुरक्षा उपकरण फुकाल्नुहोस्: पन्जा, चस्मा र भेस्ट।',
        },
        act: function* (c) {
          yield* c.walk(-1.4, 0.2, { face: 0 });
          c.pose({ armR: [0.9, 0.2, 1.6], armL: [0.9, 0.2, 1.6], headPitch: 0.25 });
          yield* c.wait(1.0); c.worker.setPPE('gloves', false);
          yield* c.wait(1.2); c.worker.setPPE('glasses', false);
          c.pose({ armR: [0.5, 0.35, 1.0], armL: [0.5, 0.35, 1.0] });
          yield* c.wait(1.2); c.worker.setPPE('vest', false);
          c.pose('idle'); yield* c.wait(0.8);
        },
      },
      {
        check: 'ppe-off', cam: 'basin',
        say: {
          en: 'Then wash your hands, as your company policy says.',
          hi: 'फिर अपनी कंपनी की नीति के अनुसार हाथ धोएं।',
          ne: 'त्यसपछि कम्पनीको नीति अनुसार हात धुनुहोस्।',
        },
        act: function* (c) {
          yield* c.walk(PLACES.basin[0], PLACES.basin[1] - 0.2, { face: Math.PI });
          c.pose({ lean: 0.2, headPitch: 0.3, armR: [0.9, 0.2, 1.2], armL: [0.9, 0.2, 1.2] });
          c.w.water = true;
          const wash = (dx) => () => V(-1.7 + dx + 0.045 * Math.sin(c.w.time * 9), 1.02, -2.62 + 0.03 * Math.cos(c.w.time * 9));
          c.worker.setIK('R', wash(-0.04)); c.worker.setIK('L', wash(0.04));
          yield* c.wait(3.6);
          c.w.water = false; c.release('R'); c.release('L'); c.pose('idle');
        },
      },
    ],
  },
  {
    n: 16,
    title: { en: 'Leave the store tidy and secure', hi: 'स्टोर को साफ़, व्यवस्थित और सुरक्षित छोड़ें', ne: 'भण्डारलाई सफा, मिलाएर र सुरक्षित छोड्नुहोस्' },
    beats: [
      {
        check: 'secure', cam: 'store',
        say: {
          en: 'Before you go, leave the storage area clean, tidy and secure.',
          hi: 'जाने से पहले स्टोर की जगह को साफ़, व्यवस्थित और सुरक्षित छोड़ें।',
          ne: 'जानुअघि भण्डार ठाउँलाई सफा, मिलाएर र सुरक्षित छोड्नुहोस्।',
        },
        act: function* (c) {
          yield* c.walk(PLACES.store[0] + 0.3, PLACES.store[1], { face: Math.PI });
          c.gaze(V(-3.3, 1.0, -2.6)); yield* c.wait(1.6);
          c.worker.setIK('R', V(-3.1, 1.1, -2.35)); c.w.setAnim('store', 0); yield* c.wait(1.6);
          c.release('R'); c.gaze(null);
        },
      },
      {
        check: 'secure', cam: 'door',
        say: {
          en: 'It is good, sustainable practice to turn off the lights and the air conditioning, if there is any, before you lock up. Well done: the job is complete.',
          hi: 'बंद करने से पहले, अगर हों तो, बत्तियाँ और एयर कंडीशनर बंद कर देना अच्छी और टिकाऊ आदत है। शाबाश: काम पूरा हुआ।',
          ne: 'ताल्चा लगाउनुअघि, भए बत्ती र एयर कन्डिसनर बन्द गर्नु राम्रो र दिगो बानी हो। शाबास: काम सकियो।',
        },
        act: function* (c) {
          yield* c.walk(3.45, 0.75, { face: Math.PI / 2, speed: 1.2 });
          c.worker.setIK('R', V(3.9, 1.25, 0.75)); yield* c.wait(0.9);
          c.room.lightSwitch.rocker.rotation.x = 0.4; c.w.setLights(false); yield* c.wait(1.2);
          c.release('R'); c.pose('idle');
          yield* c.walk(3.7, -0.3, { speed: 1.0 });
          yield* c.walk(5.3, -0.3, { face: Math.PI / 2, speed: 1.0 });
          c.pose('wave'); yield* c.wait(1.2);
          c.w.setAnim('door', 0); c.pose('idle'); yield* c.wait(1.6);
        },
      },
    ],
  },
];
