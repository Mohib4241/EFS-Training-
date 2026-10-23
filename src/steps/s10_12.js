// Steps 10 to 12: plug in safely, edges and corners first, clean in overlapping passes.
import { SHOTS, orbit, onPart, fixed, onWorker } from '../scene/shots.js';
import { PLACES, SOCKET_POS } from '../scene/room.js';
import { V, takeTool, putDownTool } from './moves.js';

const follow = (o = {}) => onWorker({ dist: 4.2, az: 0.5, el: 0.5, lift: 0.3, fov: 40, ...o });
const sideOn = (o = {}) => orbit((w) => w.worker.pos.clone().add(V(0, 0.8, 0)), { dist: 3.2, az: 0.0, el: 0.2, fov: 36, ...o });

// one pass of the floor head in a straight line: the worker walks to (x, z) with the head ahead of them
function* pass(c, x, z, speed = 0.95) { yield* c.walk(x, z, { speed }); }

export const STEPS_10_12 = [
  {
    n: 10,
    title: { en: 'Plug in safely', hi: 'सुरक्षित तरीके से प्लग लगाएं', ne: 'सुरक्षित तरिकाले प्लग लगाउनुहोस्' },
    beats: [
      {
        check: 'plug-where', cam: follow({ az: 0.9, dist: 4.6 }), hl: ['socket'],
        say: {
          en: 'Connect the machine to the power. Use a socket behind the line of your work, and as close to the exit as you can. That keeps the cable out of your way.',
          hi: 'मशीन को बिजली से जोड़ें। ऐसा सॉकेट चुनें जो आपके काम की दिशा के पीछे हो और निकास के जितना हो सके उतना पास हो। इससे तार रास्ते से बाहर रहती है।',
          ne: 'मेसिनलाई बिजलीमा जोड्नुहोस्। तपाईंको कामको लाइनभन्दा पछाडि र बाहिर निस्कने ठाउँ जति सक्दो नजिकको सकेट प्रयोग गर्नुहोस्। यसले तारलाई बाटोबाट टाढा राख्छ।',
        },
        act: function* (c) {
          // take the wand and bring the machine over to the socket
          yield* takeTool(c, { clean: false, d: 0.85, elev: 1.15 });
          yield* c.walk(2.7, -0.9, { speed: 1.0 });
          yield* c.walk(3.05, -1.75, { speed: 0.9, face: Math.PI });
          yield* putDownTool(c);
          c.cam('socket'); yield* c.wait(1.2); c.tick('socket');
        },
      },
      {
        check: 'plug-dry', cam: 'socket', hl: ['socket', 'cable'],
        say: {
          en: 'Always plug in with the socket switched off, and with dry hands.',
          hi: 'प्लग हमेशा तब लगाएं जब सॉकेट का स्विच बंद हो, और हाथ सूखे हों।',
          ne: 'प्लग सधैँ सकेटको स्विच बन्द गरेर र हात सुक्खा भएपछि मात्र लगाउनुहोस्।',
        },
        act: function* (c) {
          const vac = c.vac;
          // dry hands on the cloth
          c.pose({ armR: [0.8, 0.2, 1.7], armL: [0.8, 0.2, 1.7], shake: 1, headPitch: 0.3 }); yield* c.wait(1.8);
          c.pose('idle');
          // pick the plug up from beside the machine
          const coil = vac.root.localToWorld(V(-0.08, 0, -0.42));
          yield* c.walk(coil.x + 0.35, coil.z - 0.45, { face: Math.atan2(-0.35, 0.45) });
          c.adjust({ crouch: 0.6, lean: 0.3 });
          yield* c.reach('R', V(coil.x, 0.06, coil.z), 0.8);
          c.w.cableHold('R'); c.release('R'); c.adjust({ crouch: 0, lean: 0.05 });
          // the socket is switched off
          yield* c.walk(PLACES.socket[0] - 0.2, PLACES.socket[1], { face: Math.PI });
          c.adjust({ crouch: 0.35, lean: 0.2 });
          c.worker.setIK('L', V(3.1, 0.4, -2.85)); yield* c.wait(0.8); c.release('L');
          // plug in
          c.worker.setIK('R', V(SOCKET_POS.x, SOCKET_POS.y, SOCKET_POS.z + 0.06)); yield* c.wait(1.0);
          c.w.cablePlug();
          yield* c.wait(0.6); c.release('R'); c.adjust({ crouch: 0, lean: 0.05 });
          // switch the socket on
          c.worker.setIK('L', V(3.1, 0.4, -2.85)); yield* c.wait(0.8);
          c.w.setSocket(true); yield* c.wait(0.6); c.release('L'); c.tick('socket'); c.tick('cable');
          c.pose('idle');
        },
      },
      {
        check: 'plug-stand', cam: sideOn({ dist: 4.0, az: 0.5, el: 0.4 }), hl: ['cable'],
        say: {
          en: 'Never stand on the cable. Something sharp on your shoe could cut the wire, and that would put you in danger.',
          hi: 'तार पर कभी न खड़े हों। जूते में लगी कोई नुकीली चीज़ तार काट सकती है, और इससे आपकी जान को ख़तरा हो सकता है।',
          ne: 'तारमा कहिल्यै नउभिनुहोस्। जुत्तामा लागेको तिखो चीजले तार काट्न सक्छ, र त्यसले तपाईंलाई खतरामा पार्न सक्छ।',
        },
        act: function* (c) {
          yield* c.walk(2.45, -1.8, { face: Math.PI });
          c.gaze(() => c.vac.cableMid); c.adjust({ headPitch: 0.3 }); yield* c.wait(2.6);
          c.gaze(null); c.pose('idle');
        },
      },
      {
        check: 'suction', cam: onPart('switch', { dist: 1.6, az: -0.5, el: 0.5, fov: 34 }), hl: ['switch', 'hose'],
        say: {
          en: 'Switch on the machine, and feel the suction at the end of the hose. If it is weak, there may be a blockage.',
          hi: 'मशीन चालू करें, और होज़ के सिरे पर सक्शन महसूस करें। अगर वह कमज़ोर हो, तो कहीं रुकावट हो सकती है।',
          ne: 'मेसिन चालु गर्नुहोस्, र होजको छेउमा सक्सन महसुस गर्नुहोस्। कमजोर छ भने कतै अवरोध हुन सक्छ।',
        },
        act: function* (c) {
          const vac = c.vac, p = vac.root.position;
          yield* c.walk(p.x + 0.5, p.z - 0.55, { face: Math.atan2(-0.5, 0.55) });
          c.adjust({ crouch: 0.3, lean: 0.3, headPitch: 0.35 });
          yield* c.reach('R', () => vac.anchor.switch().add(V(0, 0.03, 0)), 0.9);
          vac.on = true; c.tick('switch'); yield* c.wait(0.7);
          c.adjust({ crouch: 0.75 });
          c.worker.setIK('R', () => vac.headFloor.localToWorld(V(0, 0.05, 0.0)));
          yield* c.wait(2.6); c.tick('hose');
          c.release('R'); c.pose('idle');
        },
      },
    ],
  },
  {
    n: 11,
    title: { en: 'Edges and corners first', hi: 'पहले किनारे और कोने', ne: 'पहिले किनारा र कुना' },
    beats: [
      {
        check: 'edges', cam: orbit((w) => w.worker.pos.clone().add(V(0, 0.7, 0)), { dist: 3.4, az: -0.5, el: 0.4, fov: 38 }),
        say: {
          en: 'Start with the edges and corners. Fit the crevice tool, and clean them thoroughly, one manageable area at a time.',
          hi: 'किनारों और कोनों से शुरू करें। क्रेविस टूल लगाएं और एक-एक छोटे हिस्से को अच्छी तरह साफ़ करें।',
          ne: 'किनारा र कुनाबाट सुरु गर्नुहोस्। क्रेभिस टूल जडान गर्नुहोस्, र एक-एक सजिलो भाग राम्ररी सफा गर्नुहोस्।',
        },
        act: function* (c) {
          const vac = c.vac;
          // take the crevice tool from its clip and fit it to the wand
          c.cam(onPart('tools', { dist: 1.7, az: 0.5, el: 0.3, fov: 34 })); c.hl(['tools']);
          const tp = vac.anchor.tools();
          yield* c.walk(tp.x + 0.5, tp.z - 0.6, { face: Math.atan2(-0.5, 0.6) });
          c.adjust({ crouch: 0.3, lean: 0.25 });
          yield* c.reach('R', () => vac.anchor.tools().add(V(0.03, 0, 0.02)), 0.9);
          vac.setTool('crevice'); c.release('R'); c.pose('idle'); c.noHl(); yield* c.wait(0.5);
          // take the wand, go to the corner nearest the socket
          c.cam(orbit((w) => w.worker.pos.clone().add(V(0, 0.7, 0)), { dist: 3.2, az: -0.5, el: 0.4, fov: 38 }));
          yield* takeTool(c, { clean: true, d: 0.95, elev: 0.8, lat: 0, width: 0.1, stroke: true, amp: 0.09, freq: 6 });
          yield* c.walk(3.4, -2.4, { face: 3 * Math.PI / 4, speed: 0.9 });
          c.adjust({ crouch: 0.55, lean: 0.25 });
          yield* c.wait(3.6);
        },
      },
      {
        check: 'posture', cam: fixed([2.0, 1.5, 0.6], [2.6, 0.5, -2.6], 38),
        say: {
          en: 'Keep a good posture while you work. Bend your knees, keep your back straight, and do not overreach.',
          hi: 'काम करते समय सही मुद्रा रखें। घुटने मोड़ें, पीठ सीधी रखें, और बहुत दूर तक हाथ न बढ़ाएं।',
          ne: 'काम गर्दा सही मुद्रा राख्नुहोस्। घुँडा बाङ्गो पार्नुहोस्, ढाड सीधा राख्नुहोस्, र धेरै टाढासम्म हात नपुर्‍याउनुहोस्।',
        },
        act: function* (c) {
          c.w.operate(null); yield* c.wait(0.4);
          c.w.operate({ clean: true, d: 0.95, elev: 0.8, lat: 0.35, width: 0.1, stroke: true, amp: 0.09, freq: 6 });
          yield* c.wait(0.8);
          c.adjust({ crouch: 0.5, lean: 0.2 });
          yield* c.walk(3.4, -2.55, { face: -Math.PI / 2, speed: 0.5 });
          yield* c.walk(1.9, -2.55, { face: -Math.PI / 2, speed: 0.45 });
          yield* putDownTool(c);
          c.vac.setTool('floor'); c.pose('idle'); yield* c.wait(0.6);
        },
      },
    ],
  },
  {
    n: 12,
    title: { en: 'Clean in overlapping passes', hi: 'एक-दूसरे पर चढ़ती पट्टियों में सफ़ाई', ne: 'एकआपसमा मिल्ने लाइनमा सफा गर्नुहोस्' },
    beats: [
      {
        check: 'pass-away', cam: orbit((w) => w.worker.pos.clone().add(V(0, 0.2, 0)), { dist: 4.4, az: -0.5, el: 0.6, fov: 40 }),
        say: {
          en: 'Now fit the floor head again, and clean the floor in a set pattern, with passes that overlap a little. Start at the point closest to the socket, and work away from it.',
          hi: 'अब फ़्लोर हेड फिर से लगाएं, और फ़र्श को तय तरीके से साफ़ करें, ऐसी पट्टियों में जो थोड़ी-थोड़ी एक-दूसरे पर चढ़ें। सॉकेट के सबसे पास वाली जगह से शुरू करें और उससे दूर जाएं।',
          ne: 'अब फ्लोर हेड फेरि जडान गर्नुहोस्, र भुइँलाई तोकिएको ढाँचामा, अलिअलि एकआपसमा मिल्ने लाइनमा सफा गर्नुहोस्। सकेटको सबैभन्दा नजिकको ठाउँबाट सुरु गर्नुहोस् र त्यसबाट टाढा जानुहोस्।',
        },
        act: function* (c) {
          yield* takeTool(c, { clean: true, d: 0.85, elev: 1.15, lat: 0, width: 0.3, stroke: true, amp: 0.2, freq: 5 });
          yield* c.walk(3.55, -2.0, { face: 0, speed: 0.9 });
          const lanes = [3.55, 3.3, 3.05];
          let z0 = -2.0, z1 = 0.1;
          for (let i = 0; i < lanes.length; i++) {
            yield* pass(c, lanes[i], i % 2 === 0 ? z1 : z0);
            if (i < lanes.length - 1) yield* c.walk(lanes[i + 1], i % 2 === 0 ? z1 : z0, { speed: 0.9 });
          }
        },
      },
      {
        check: 'pass-away', cam: orbit((w) => w.worker.pos.clone().add(V(0, 0.2, 0)), { dist: 4.8, az: -0.45, el: 0.62, fov: 40 }),
        say: {
          en: 'This keeps the cable behind you. You will not trip on it, and you will not stretch it or pull the plug out of the socket.',
          hi: 'इससे तार आपके पीछे रहती है। आप उस पर ठोकर नहीं खाएंगे, और न तार खिंचेगी, न प्लग सॉकेट से निकलेगा।',
          ne: 'यसले तारलाई तपाईंको पछाडि राख्छ। तपाईं त्यसमा ठेस खानुहुन्न, तार तनिँदैन, र प्लग सकेटबाट निस्कँदैन।',
        },
        hl: ['cable'],
        act: function* (c) {
          const lanes = [2.8, 2.55, 2.3, 2.05];
          let up = true;                                   // the worker is at the near end after three lanes
          const zN = 0.1, zF = -2.0;
          let at = c.worker.pos.z;
          for (let i = 0; i < lanes.length; i++) {
            const target = Math.abs(at - zN) < Math.abs(at - zF) ? zF : zN;
            yield* c.walk(lanes[i], at, { speed: 0.9 });
            yield* pass(c, lanes[i], target);
            at = target;
          }
          c.tick('cable');
        },
      },
      {
        check: 'pass-traffic', cam: orbit(V(3.3, 0, -0.4), { dist: 4.0, az: -0.4, el: 0.7, fov: 40 }), hl: ['lane'],
        say: {
          en: 'Give extra attention to traffic lanes. They are at entrances and exits, and under desks on carpet. Clean them in both directions, to lift grit that would wear the carpet away.',
          hi: 'आवाजाही वाले रास्तों पर ख़ास ध्यान दें। ये दरवाज़ों के पास और कालीन पर डेस्क के नीचे होते हैं। इन्हें दोनों दिशाओं में साफ़ करें, ताकि वह कण निकल जाएं जो कालीन को घिस देते हैं।',
          ne: 'आवतजावत हुने बाटोमा विशेष ध्यान दिनुहोस्। यी प्रवेश र निकास नजिक, र कार्पेटमा डेस्कमुनि हुन्छन्। दुवै दिशामा सफा गर्नुहोस्, ताकि कार्पेट खियाउने कण निस्कियोस्।',
        },
        act: function* (c) {
          yield* c.walk(2.3, -0.7, { face: Math.PI / 2, speed: 0.95 });
          for (const z of [-0.7, -0.4]) {
            yield* c.walk(2.3, z, { speed: 0.9 });
            yield* c.walk(2.95, z, { speed: 0.9 });                    // towards the door
            yield* c.walk(2.3, z, { speed: 0.9 });                     // and back
          }
          c.tick('lane');
        },
      },
      {
        check: 'pass-brush', cam: orbit((w) => w.worker.pos.clone().add(V(0, 0.2, 0)), { dist: 4.2, az: -0.4, el: 0.55, fov: 40 }),
        say: {
          en: 'When you reach hard floor, switch the brush back on.',
          hi: 'जब सख़्त फ़र्श पर पहुँचें, तो ब्रश फिर से चालू कर दें।',
          ne: 'कडा भुइँमा पुगेपछि ब्रश फेरि चालु गर्नुहोस्।',
        },
        hl: ['head'],
        act: function* (c) {
          const vac = c.vac;
          yield* c.walk(0.3, 0.9, { speed: 1.0, face: Math.PI });
          vac.pedal = 1; vac.brushT = 1; yield* c.wait(1.0); c.tick('head');
          yield* c.walk(0.1, -1.4, { speed: 0.9 });
          yield* c.walk(-0.15, -1.4, { speed: 0.9 });
          yield* c.walk(-0.15, 0.9, { speed: 0.9 });
        },
      },
      {
        check: 'pass-off', cam: 'room', hl: ['switch', 'socket'],
        say: {
          en: 'Whenever you stop, switch off at the machine and at the socket, unplug, and park the machine where it will not be in anyone\'s way.',
          hi: 'जब भी रुकें, मशीन और सॉकेट दोनों पर स्विच बंद करें, प्लग निकालें, और मशीन को ऐसी जगह रखें जहाँ वह किसी के रास्ते में न आए।',
          ne: 'जब पनि रोकिनुहुन्छ, मेसिन र सकेट दुवैमा स्विच बन्द गर्नुहोस्, प्लग निकाल्नुहोस्, र मेसिनलाई कसैको बाटोमा नपर्ने ठाउँमा राख्नुहोस्।',
        },
        act: function* (c) {
          const vac = c.vac;
          yield* putDownTool(c);
          // off at the machine
          const p = vac.root.position;
          yield* c.walk(p.x + 0.5, p.z - 0.5, { face: Math.atan2(-0.5, 0.5) });
          c.adjust({ crouch: 0.3, lean: 0.3 });
          yield* c.reach('R', () => vac.anchor.switch().add(V(0, 0.03, 0)), 0.8);
          vac.on = false; c.release('R'); c.pose('idle');
          // off at the socket, and unplug
          yield* c.walk(PLACES.socket[0] - 0.2, PLACES.socket[1], { face: Math.PI });
          c.adjust({ crouch: 0.35, lean: 0.2 });
          c.worker.setIK('L', V(3.1, 0.4, -2.85)); yield* c.wait(0.8);
          c.w.setSocket(false); yield* c.wait(0.5); c.release('L');
          c.worker.setIK('R', V(SOCKET_POS.x, SOCKET_POS.y, SOCKET_POS.z + 0.06)); yield* c.wait(0.8);
          c.w.cableHold('R'); yield* c.wait(0.4); c.release('R'); c.pose('idle');
          // coil the cable and park the machine out of the way
          yield* c.walk(p.x + 0.4, p.z - 0.3, { face: -Math.PI / 2 });
          c.w.cableCoil();
          yield* takeTool(c, { clean: false, d: 0.85, elev: 1.15 });
          yield* c.walk(-1.4, -1.0, { speed: 1.0 });
          yield* putDownTool(c);
        },
      },
    ],
  },
];
