// Step 5: check the equipment. The longest step: colour-coded kit, circuit breaker, PAT label, cable
// (with a cloth), tidy cable, dust bag, hose and wand, casing and wheels, accessories.
// `check` ties a beat to a check in src/data/steps.js, so a test can see none is left out.
import { SHOTS, orbit, onPart } from '../scene/shots.js';
import { PLACES } from '../scene/room.js';
import { V, along } from './moves.js';

const vacShot = (o = {}) => orbit((w) => w.vac.root.position.clone().add(V(0.5, 0.3, -0.1)), { dist: 3.2, az: 0.15, el: 0.38, fov: 38, ...o });

export const STEP_5 = {
  n: 5,
  title: { en: 'Check the equipment', hi: 'उपकरण की जाँच करें', ne: 'उपकरणको जाँच गर्नुहोस्' },
  beats: [
    {
      check: 'kit', cam: 'kit', hl: ['cloths'],
      say: {
        en: 'Gather your equipment: the vacuum cleaner with its attachments, colour-coded cloths, a dustpan and brush, and a refuse bag. Use the right colour for each area, so germs do not spread from one area to another.',
        hi: 'अपना सामान इकट्ठा करें: वैक्यूम क्लीनर और उसके अटैचमेंट, रंग से बँटे कपड़े, डस्टपैन और ब्रश, और कचरे की थैली। हर जगह के लिए सही रंग का कपड़ा इस्तेमाल करें, ताकि कीटाणु एक जगह से दूसरी जगह न फैलें।',
        ne: 'आफ्ना सामान जम्मा गर्नुहोस्: भ्याकुम क्लिनर र यसका सामानहरू, रङ अनुसार छुट्याइएका कपडा, डस्टप्यान र ब्रश, र फोहोर राख्ने झोला। हरेक ठाउँका लागि सही रङको कपडा प्रयोग गर्नुहोस्, ताकि जीवाणु एक ठाउँबाट अर्को ठाउँमा नफैलियोस्।',
      },
      act: function* (c) {
        yield* c.walk(PLACES.equip[0], PLACES.equip[1], { face: -Math.PI / 2 });
        c.adjust({ lean: 0.12, headPitch: 0.3 });
        yield* c.reach('L', V(-3.57, 0.9, 1.43), 0.9);
        c.carry(c.props.cloth, { hand: 'L', off: [0, -0.02, 0], rot: [0, 0, 0] });
        c.release('L'); c.pose('idle');
        for (const z of [1.95, 2.15]) { c.gaze(V(-3.45, 0.85, z)); yield* c.wait(1.5); }
        c.gaze(null); c.tick('cloths');
      },
    },
    {
      check: 'circuit', cam: 'breaker', hl: ['breaker'],
      say: {
        en: 'If the building needs a circuit breaker for the power supply, check that it switches on and off properly.',
        hi: 'अगर इमारत की बिजली के लिए सर्किट ब्रेकर ज़रूरी है, तो जाँचें कि वह ठीक से चालू और बंद होता है।',
        ne: 'यदि भवनको बिजलीका लागि सर्किट ब्रेकर चाहिन्छ भने, त्यो ठीकसँग खुल्छ र बन्द हुन्छ कि जाँच गर्नुहोस्।',
      },
      act: function* (c) {
        yield* c.walk(PLACES.breaker[0], PLACES.breaker[1], { face: Math.PI });
        const lever = c.room.breaker.lever;
        yield* c.reach('R', V(2.0, 1.43, -2.76), 0.8);
        yield* c.tween(0.35, (k) => { lever.rotation.z = 0.7 * k; });
        yield* c.wait(0.7);
        yield* c.tween(0.35, (k) => { lever.rotation.z = 0.7 * (1 - k); });
        c.tick('breaker'); yield* c.wait(1.0);
        c.release('R');
      },
    },
    {
      check: 'pat', cam: onPart('pat', { dist: 1.3, az: -0.55, el: 0.22, fov: 34 }), hl: ['pat'],
      say: {
        en: 'Check the PAT label. The portable appliance test must be in date and follow your company policy. Do this before you operate the machine.',
        hi: 'पैट टेस्ट का लेबल जाँचें। पोर्टेबल एप्लायंस टेस्ट की तारीख़ वैध होनी चाहिए और कंपनी की नीति के अनुसार होनी चाहिए। मशीन चलाने से पहले यह देखें।',
        ne: 'प्याट टेस्टको लेबल जाँच गर्नुहोस्। पोर्टेबल एप्लायन्स टेस्टको मिति सकिएको हुनु हुँदैन र कम्पनीको नीति अनुसार हुनुपर्छ। मेसिन चलाउनुअघि यो हेर्नुहोस्।',
      },
      act: function* (c) {
        const p = c.vac.anchor.pat();
        const sx = p.x + 0.6, sz = p.z + 0.5;
        yield* c.walk(sx, sz, { face: Math.atan2(p.x - sx, p.z - sz) });
        c.adjust({ lean: 0.22, headPitch: 0.35 });
        yield* c.reach('R', p.clone().add(V(0.02, 0.0, 0.13)), 1.3);
        c.tick('pat'); yield* c.wait(1.8);
        c.release('R'); c.pose('idle');
      },
    },
    {
      check: 'cable', cam: vacShot(), hl: ['cable'],
      say: {
        en: 'Check the cable. Run a clean cloth along it, from the machine to the plug, and feel for cuts, scrapes or bare wires. If it is faulty, report it, and do not use the machine.',
        hi: 'तार की जाँच करें। एक साफ़ कपड़े को मशीन से प्लग तक तार पर फेरें, और देखें कि कहीं कटी, छिली या नंगी तार तो नहीं। अगर खराबी हो तो रिपोर्ट करें और मशीन का इस्तेमाल न करें।',
        ne: 'तार जाँच गर्नुहोस्। सफा कपडाले मेसिनदेखि प्लगसम्म तारमा सुमसुम्याउनुहोस्, र काटिएको, खुइलिएको वा खुला तार छ कि हेर्नुहोस्। बिग्रेको भए रिपोर्ट गर्नुहोस्, र मेसिन प्रयोग नगर्नुहोस्।',
      },
      act: function* (c) {
        const vac = c.vac;
        // take the plug from the coil and lay the cable out on the floor
        const coil = vac.root.localToWorld(V(-0.08, 0, -0.42));
        yield* c.walk(coil.x + 0.5, coil.z - 0.5, { face: Math.atan2(-0.5, 0.5) });
        c.adjust({ crouch: 0.6, lean: 0.3 });
        yield* c.reach('R', V(coil.x, 0.06, coil.z), 0.9);
        c.w.cableHold('R'); c.release('R'); c.adjust({ crouch: 0, lean: 0.05 });
        yield* c.walk(1.0, 1.95, { face: Math.PI / 2 });
        c.adjust({ crouch: 0.6, lean: 0.3 }); yield* c.wait(0.7);
        c.w.cableLay(1.3, 1.6, 0.2);
        c.adjust({ crouch: 0, lean: 0.1 }); yield* c.wait(0.6);

        // run the cloth along it, from the machine to the plug
        const plug = V(1.3, 0, 1.6), ex = vac.exit();
        const d = plug.clone().sub(ex).setY(0).normalize(), side = V(d.z, 0, -d.x).multiplyScalar(0.32);   // the far side, so the cable is between the worker and the camera
        let s = 0.1;                                       // start just past the machine, so the worker does not stand in it
        vac.cableLift = { s, h: 0.95 };
        const b0 = ex.clone().lerp(plug, s).add(side);
        yield* c.walk(b0.x, b0.z, { face: Math.atan2(d.x, d.z) });
        c.worker.setIK('L', () => vac.cableAt(s));
        c.adjust({ lean: 0.22, headPitch: 0.4 });
        c.gaze(() => vac.cableAt(s));
        while (s < 1) {
          s = Math.min(1, s + c.dt * 0.3); vac.cableLift.s = s;
          const b = ex.clone().lerp(plug, s).add(side);
          c.worker.walkTo(b.x, b.z, c.dt, 0.7, null);
          yield;
        }
        c.worker.speed = 0;
        c.tick('cable'); yield* c.wait(1.0);
        vac.cableLift = null; c.release('L'); c.gaze(null); c.pose('idle');
      },
    },
    {
      check: 'cable-lay', cam: vacShot(), hl: ['cable'],
      say: {
        en: 'Lay the cable neatly. It must never be a trip hazard.',
        hi: 'तार को सलीके से रखें। वह कभी भी ठोकर लगने का खतरा नहीं बनना चाहिए।',
        ne: 'तारलाई मिलाएर राख्नुहोस्। यो कहिल्यै ठेस लाग्ने खतरा बन्नु हुँदैन।',
      },
      act: function* (c) {
        const vac = c.vac;
        c.adjust({ crouch: 0.6, lean: 0.3 });
        yield* c.reach('R', V(1.3, 0.08, 1.6), 0.9);
        c.w.cableHold('R'); c.release('R'); c.adjust({ crouch: 0, lean: 0.05 });
        yield* c.walk(-0.5, 1.6, { face: -Math.PI / 2 });
        c.adjust({ crouch: 0.6, lean: 0.3 }); yield* c.wait(0.8);
        c.w.cableCoil();
        c.adjust({ crouch: 0, lean: 0 }); c.tick('cable'); yield* c.wait(1.6);
        c.uncarry(c.props.cloth); c.props.cloth.visible = false;       // the cloth is put away
        c.pose('idle');
      },
    },
    {
      check: 'bag', cam: onPart('bag', { dist: 1.45, az: -0.3, el: 0.42, fov: 34 }), hl: ['bag'],
      say: {
        en: 'Check the dust bag. Lift it by one corner to see how full it is. Never press down on it: you could be cut by something sharp, or blow dust into the air. If it is two-thirds full or more, change it.',
        hi: 'डस्ट बैग देखें। उसे एक कोने से उठाकर देखें कि कितना भरा है। उसे कभी दबाएं नहीं: कोई नुकीली चीज़ चुभ सकती है, या धूल उड़ सकती है। अगर वह दो-तिहाई या उससे ज़्यादा भरा हो, तो उसे बदल दें।',
        ne: 'धुलो झोला जाँच गर्नुहोस्। एक कुनाबाट उठाएर कति भरिएको छ हेर्नुहोस्। यसलाई कहिल्यै नदबाउनुहोस्: तिखो चीजले काट्न सक्छ, वा धुलो उड्न सक्छ। दुई तिहाई वा बढी भरिएको छ भने बदल्नुहोस्।',
      },
      act: function* (c) {
        const vac = c.vac, p = vac.root.position;
        const sx = p.x + 0.5, sz = p.z - 0.55;
        yield* c.walk(sx, sz, { face: Math.atan2(p.x - sx, p.z - sz) });
        c.adjust({ crouch: 0.3, lean: 0.3, headPitch: 0.3 });
        vac.lidT = 1; yield* c.wait(1.1);
        vac.bagLiftT = 1;
        c.worker.setIK('R', () => vac.bagBody.localToWorld(V(0.13, 0.17, 0.04)));
        yield* c.wait(2.6); c.tick('bag');
        vac.bagLiftT = 0; yield* c.wait(1.0);
        vac.lidT = 0; c.release('R'); c.pose('idle'); yield* c.wait(0.9);
      },
    },
    {
      check: 'hose', cam: vacShot({ dist: 2.6 }), hl: ['hose', 'wand'],
      say: {
        en: 'Look along the hose and the wand for blockages, splits or kinks. When the machine is switched on, you will also feel the suction at the end of the hose.',
        hi: 'होज़ और वैंड को देखें कि कहीं रुकावट, दरार या मोड़ तो नहीं। मशीन चालू होने पर होज़ के सिरे पर सक्शन भी महसूस करें।',
        ne: 'होज र वान्डमा अवरोध, चिरा वा बाङ्गो परेको छ कि हेर्नुहोस्। मेसिन चालु भएपछि होजको छेउमा सक्सन पनि महसुस गर्नुहोस्।',
      },
      act: function* (c) {
        const vac = c.vac;
        const hm = vac.hoseMid.clone();
        yield* c.walk(hm.x + 0.4, hm.z - 0.8, { face: Math.atan2(-0.4, 0.8) });
        c.adjust({ crouch: 0.2, lean: 0.25, headPitch: 0.35 });
        const pts = () => [vac.inlet(V(0, 0, 0)), vac.hoseMid.clone(), vac.handle(V(0, 0, 0))];
        let s = 0.2; c.worker.setIK('R', () => along(pts(), s).add(V(0, 0.03, 0)));
        c.gaze(() => along(pts(), s));
        while (s < 0.85) { s += c.dt * 0.2; yield; }
        c.tick('hose'); c.tick('wand'); yield* c.wait(0.8);
        c.release('R'); c.gaze(null); c.pose('idle');
      },
    },
    {
      check: 'casing', cam: vacShot({ dist: 2.4, az: -0.2 }), hl: ['casing', 'wheels'],
      say: {
        en: 'Check the casing for damage that could stop the machine working well, and make sure the wheels roll freely.',
        hi: 'देखें कि मशीन के ढाँचे में कोई टूट-फूट तो नहीं जो उसके काम में रुकावट डाले, और पहिए आसानी से घूमते हों।',
        ne: 'मेसिनको खोलमा कामलाई असर गर्ने बिग्रिएको ठाउँ छ कि हेर्नुहोस्, र पाङ्ग्राहरू सजिलै घुम्छन् भन्ने निश्चित गर्नुहोस्।',
      },
      act: function* (c) {
        const vac = c.vac, base = vac.root.position.clone();
        const fwd = V(Math.sin(vac.root.rotation.y), 0, Math.cos(vac.root.rotation.y));
        const sx = base.x + 0.65, sz = base.z - 0.55;
        yield* c.walk(sx, sz, { face: Math.atan2(base.x - sx, base.z - sz) });
        c.adjust({ lean: 0.3, crouch: 0.2, headPitch: 0.3 });
        c.worker.setIK('R', () => vac.anchor.casing().add(V(0.12, 0, 0.0)));
        yield* c.tween(3.4, (k) => { vac.root.position.copy(base).addScaledVector(fwd, 0.4 * Math.sin(k * Math.PI * 2)); });
        c.tick('casing'); c.tick('wheels'); yield* c.wait(0.9);
        c.release('R'); c.pose('idle');
      },
    },
    {
      check: 'tools', cam: onPart('tools', { dist: 1.5, az: 0.55, el: 0.25, fov: 34 }), hl: ['tools'],
      say: {
        en: 'Make sure you have the right accessories for the job: the floor head, the crevice tool and the brush for edges and corners.',
        hi: 'देखें कि काम के लिए सही अटैचमेंट हैं: फ़्लोर हेड, कोनों के लिए क्रेविस टूल और ब्रश।',
        ne: 'काम अनुसारका सही सामान छन् भन्ने हेर्नुहोस्: फ्लोर हेड, किनारा र कुनाका लागि क्रेभिस टूल र ब्रश।',
      },
      act: function* (c) {
        const vac = c.vac;
        c.adjust({ lean: 0.25, crouch: 0.25, headPitch: 0.35 });
        c.worker.setIK('R', () => vac.anchor.tools().add(V(0.04, 0.03, 0.02)));
        c.gaze(() => vac.anchor.tools());
        yield* c.wait(3.2); c.tick('tools'); yield* c.wait(0.8);
        c.release('R'); c.gaze(null); c.pose('idle');
      },
    },
  ],
};
