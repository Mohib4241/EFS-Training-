// What the narrator says on the Instructions page: twelve short steps, the first seven about what to
// check before the machine is used (dry, cable, label, bag, hose and body, the connection, the suction)
// and the last five about looking after it (switch off and unplug, wipe, change the bag, check again,
// store). Each step has a title and one sentence group per beat, matched by position (see
// src/steps/instructions.js). Where a point comes from the SOP the check says so in
// src/data/instructions.js; the rest is the plain good practice the brief asked for (dry, unplug by the
// plug). The Hindi and Nepali use those languages' own words.
export const INSTR_TEXT = [
  {
    title: { en: 'Everything must be dry', hi: 'सब कुछ सूखा होना चाहिए', ne: 'सबै कुरा सुक्खा हुनुपर्छ' },
    beats: [
      { en: 'A vacuum cleaner is only for dry floors. If you see a wet patch like this, stop. Do not plug in. Dry it first, or wait until it is dry.',
        hi: 'धूल खींचने वाली मशीन सिर्फ़ सूखे फ़र्श के लिए होती है। ऐसी गीली जगह दिखे, तो रुक जाइए। तार मत लगाइए। पहले उसे सुखाइए, या सूखने का इंतज़ार कीजिए।',
        ne: 'धुलो तान्ने मेसिन सुक्खा भुइँका लागि मात्र हो। यस्तो भिजेको ठाउँ देखे रोकिनुहोस्। तार नजोड्नुहोस्। पहिले त्यसलाई सुकाउनुहोस्, वा सुक्न पर्खनुहोस्।' },
      { en: 'Your hands must be dry too. The machine, the cable and the plug must also be dry. Wet hands and electricity are dangerous.',
        hi: 'आपके हाथ भी सूखे होने चाहिए। मशीन, तार और तार का सिरा भी सूखा होना चाहिए। गीले हाथ और बिजली ख़तरनाक होते हैं।',
        ne: 'तपाईंका हात पनि सुक्खा हुनुपर्छ। मेसिन, तार र तारको छेउ पनि सुक्खा हुनुपर्छ। भिजेको हात र बिजुली खतरनाक हुन्छन्।' },
    ],
  },
  {
    title: { en: 'Check the cable', hi: 'तार की जाँच कीजिए', ne: 'तारको जाँच गर्नुहोस्' },
    beats: [
      { en: 'Look at this cable. You can see bare wire. Never use a machine with a cable like this. Report it, as your company says.',
        hi: 'यह तार देखिए। इसमें नंगा तार दिख रहा है। ऐसे तार वाली मशीन कभी मत चलाइए। कंपनी के नियम के अनुसार इसकी सूचना दीजिए।',
        ne: 'यो तार हेर्नुहोस्। यसमा खुला तार देखिन्छ। यस्तो तार भएको मेसिन कहिल्यै नचलाउनुहोस्। कम्पनीको नियम अनुसार यसको जानकारी दिनुहोस्।' },
      { en: "Now check the machine's own cable. Run a clean cloth along it, from the machine to the plug. If you feel a cut or a scrape, stop and report it.",
        hi: 'अब मशीन के अपने तार की जाँच कीजिए। एक साफ़ कपड़ा मशीन से तार के सिरे तक फेरिए। कहीं कटा या छिला लगे, तो रुकिए और सूचना दीजिए।',
        ne: 'अब मेसिनको आफ्नै तार जाँच गर्नुहोस्। सफा कपडा मेसिनदेखि तारको छेउसम्म सुमसुम्याउनुहोस्। कतै काटिएको वा छिलिएको लागे रोकिनुहोस् र जानकारी दिनुहोस्।' },
    ],
  },
  {
    title: { en: 'Check the PAT label', hi: 'जाँच की पर्ची देखिए', ne: 'जाँचको पर्ची हेर्नुहोस्' },
    beats: [
      { en: "Find the PAT label on the machine. It shows that the electrical safety test was done. It must be in date, as your company's rules say. If it is not, do not use the machine.",
        hi: 'मशीन पर पैट की पर्ची ढूँढिए। यह दिखाती है कि बिजली की सुरक्षा जाँच हो चुकी है। उसकी तारीख़ कंपनी के नियम के अनुसार निकल न गई हो। निकल गई हो, तो मशीन मत चलाइए।',
        ne: 'मेसिनमा प्याटको पर्ची खोज्नुहोस्। यसले बिजुलीको सुरक्षा जाँच भइसकेको देखाउँछ। कम्पनीको नियम अनुसार त्यसको म्याद सकिएको हुनु हुँदैन। म्याद सकिएको छ भने मेसिन नचलाउनुहोस्।' },
    ],
  },
  {
    title: { en: 'Check the dust bag', hi: 'धूल की थैली देखिए', ne: 'धुलो झोला हेर्नुहोस्' },
    beats: [
      { en: 'Open the lid and look at the dust bag. Lift it by one corner. Never press on it. If it is two-thirds full or more, change it, because a full bag strains the motor.',
        hi: 'ढक्कन खोलकर धूल की थैली देखिए। उसे एक कोने से उठाइए। उसे कभी दबाइए मत। दो-तिहाई या उससे ज़्यादा भरी हो, तो बदल दीजिए, क्योंकि भरी थैली से मोटर पर ज़ोर पड़ता है।',
        ne: 'ढक्कन खोलेर धुलो झोला हेर्नुहोस्। एउटा कुनाबाट उठाउनुहोस्। कहिल्यै नदबाउनुहोस्। दुई तिहाई वा बढी भरिएको छ भने बदल्नुहोस्, किनकि भरिएको झोलाले मोटरमाथि जोर पर्छ।' },
    ],
  },
  {
    title: { en: 'Check the hose, tube and body', hi: 'नली और बाहरी खोल देखिए', ne: 'नली र बाहिरी खोल हेर्नुहोस्' },
    beats: [
      { en: 'Look along the hose and the tube for blocks, cracks or bends. Check that the outer body is not damaged, and that the wheels turn freely.',
        hi: 'लचीली नली और सीधी नली को देखिए कि कहीं रुकावट, दरार या मोड़ तो नहीं। देखिए कि बाहरी खोल टूटा न हो, और पहिए आसानी से घूमते हों।',
        ne: 'लचिलो नली र सिधा नली हेर्नुहोस्, कतै अवरोध, चिरा वा बाङ्गो परेको छ कि। बाहिरी खोल नबिग्रिएको र पाङ्ग्रा सजिलै घुम्ने छन् भन्ने हेर्नुहोस्।' },
      { en: 'Make sure the right tools are with the machine for your job: the floor head, and the small tools for corners.',
        hi: 'देखिए कि आपके काम के सही औज़ार मशीन के साथ हैं: फ़र्श वाला सिरा, और कोनों के लिए छोटे औज़ार।',
        ne: 'तपाईंको कामका सही औजार मेसिनसँग छन् भन्ने हेर्नुहोस्: भुइँ सफा गर्ने भाग, र कुनाका लागि साना औजार।' },
    ],
  },
  {
    title: { en: 'Check the connection', hi: 'बिजली का जोड़ देखिए', ne: 'बिजुलीको जोड हेर्नुहोस्' },
    beats: [
      { en: 'Now the connection. First look at the socket. It must be switched off, and it must not be cracked or loose.',
        hi: 'अब बिजली का जोड़। पहले बिजली का बोर्ड देखिए। उसका बटन बंद होना चाहिए, और वह टूटा या ढीला न हो।',
        ne: 'अब बिजुलीको जोड। पहिले बिजुली बोर्ड हेर्नुहोस्। त्यसको बटन बन्द हुनुपर्छ, र त्यो फुटेको वा खुकुलो हुनु हुँदैन।' },
      { en: 'Look at the plug. The pins must be straight, and the plug must not be cracked or burnt.',
        hi: 'तार के सिरे को देखिए। उसके पिन सीधे हों, और वह टूटा या जला हुआ न हो।',
        ne: 'तारको छेउ हेर्नुहोस्। त्यसका पिन सिधा हुनुपर्छ, र त्यो फुटेको वा जलेको हुनु हुँदैन।' },
      { en: 'With dry hands, push the plug in all the way. It must sit firm, not loose. Then switch the socket on.',
        hi: 'सूखे हाथों से तार के सिरे को पूरा अंदर तक दबाइए। वह कसकर बैठे, ढीला न रहे। फिर बोर्ड का बटन चालू कीजिए।',
        ne: 'सुक्खा हातले तारको छेउ पूरै भित्रसम्म थिच्नुहोस्। त्यो कसिलो बस्नुपर्छ, खुकुलो हुनु हुँदैन। त्यसपछि बोर्डको बटन चालु गर्नुहोस्।' },
    ],
  },
  {
    title: { en: 'Test the suction', hi: 'हवा का खिंचाव जाँचिए', ne: 'हावा तान्ने शक्ति जाँच्नुहोस्' },
    beats: [
      { en: 'Switch the machine on. Hold the floor head near a piece of paper. If the paper is pulled in, the suction is good. If it is weak, there may be a block.',
        hi: 'मशीन चालू कीजिए। फ़र्श वाले सिरे को काग़ज़ के टुकड़े के पास ले जाइए। काग़ज़ खिंच जाए, तो खिंचाव ठीक है। कमज़ोर हो, तो कहीं रुकावट हो सकती है।',
        ne: 'मेसिन चालु गर्नुहोस्। भुइँ सफा गर्ने भाग कागजको टुक्राको नजिक लैजानुहोस्। कागज तानियो भने तान्ने शक्ति ठीक छ। कमजोर छ भने कतै अवरोध हुन सक्छ।' },
    ],
  },
  {
    title: { en: 'Switch off and unplug', hi: 'बंद कीजिए और तार निकालिए', ne: 'बन्द गर्नुहोस् र तार निकाल्नुहोस्' },
    beats: [
      { en: 'When you finish, switch the machine off. Then switch off at the socket. Pull the plug out by holding the plug itself, never by pulling the cable.',
        hi: 'काम ख़त्म होने पर मशीन बंद कीजिए। फिर बोर्ड का बटन भी बंद कीजिए। तार को खींचकर नहीं, तार के सिरे को पकड़कर निकालिए।',
        ne: 'काम सकिएपछि मेसिन बन्द गर्नुहोस्। त्यसपछि बोर्डको बटन पनि बन्द गर्नुहोस्। तार तानेर होइन, तारको छेउ समातेर निकाल्नुहोस्।' },
    ],
  },
  {
    title: { en: 'Wipe the machine', hi: 'मशीन को पोंछिए', ne: 'मेसिन पुछ्नुहोस्' },
    beats: [
      { en: 'Wipe the outer body and the wheels with a clean cloth. Wipe the hose, the tube and the tools too. Use the right colour cloth for this area.',
        hi: 'बाहरी खोल और पहियों को साफ़ कपड़े से पोंछिए। लचीली नली, सीधी नली और औज़ारों को भी पोंछिए। इस जगह के लिए सही रंग का कपड़ा लीजिए।',
        ne: 'बाहिरी खोल र पाङ्ग्रा सफा कपडाले पुछ्नुहोस्। लचिलो नली, सिधा नली र औजारहरू पनि पुछ्नुहोस्। यो ठाउँका लागि सही रङको कपडा लिनुहोस्।' },
    ],
  },
  {
    title: { en: 'Change the dust bag', hi: 'धूल की थैली बदलिए', ne: 'धुलो झोला बदल्नुहोस्' },
    beats: [
      { en: 'Now check the dust bag again. This is the best time to change it. Open the lid, lift the full bag out by the corner, and put it in the rubbish bag.',
        hi: 'अब धूल की थैली फिर देखिए। उसे बदलने का यही सबसे अच्छा समय है। ढक्कन खोलिए, भरी थैली को कोने से उठाकर निकालिए, और कचरे की थैली में डाल दीजिए।',
        ne: 'अब धुलो झोला फेरि हेर्नुहोस्। यसलाई बदल्ने यही सबैभन्दा राम्रो समय हो। ढक्कन खोल्नुहोस्, भरिएको झोला कुनाबाट उठाएर निकाल्नुहोस्, र फोहोरको झोलामा हाल्नुहोस्।' },
      { en: 'Fit a new bag, then close the lid firmly.',
        hi: 'नई थैली लगाइए और ढक्कन कसकर बंद कीजिए।',
        ne: 'नयाँ झोला जडान गर्नुहोस् र ढक्कन कसेर बन्द गर्नुहोस्।' },
    ],
  },
  {
    title: { en: 'Check again and report', hi: 'फिर जाँचिए और बताइए', ne: 'फेरि जाँच्नुहोस् र जानकारी दिनुहोस्' },
    beats: [
      { en: "Check the machine again for damage from today's work. If you find any, report it as your company says. Do not use a damaged machine.",
        hi: 'आज के काम से मशीन को कोई नुक़सान तो नहीं हुआ, यह फिर देखिए। कुछ मिले, तो कंपनी के नियम के अनुसार सूचना दीजिए। टूटी-फूटी मशीन मत चलाइए।',
        ne: 'आजको कामले मेसिनलाई कुनै नोक्सान भयो कि भनेर फेरि हेर्नुहोस्। केही भेटे कम्पनीको नियम अनुसार जानकारी दिनुहोस्। बिग्रेको मेसिन नचलाउनुहोस्।' },
    ],
  },
  {
    title: { en: 'Store it', hi: 'मशीन को रखिए', ne: 'मेसिन राख्नुहोस्' },
    beats: [
      { en: 'Coil the cable neatly. Store the machine in its marked place, where air can move around it, so that it dries.',
        hi: 'तार को सलीके से लपेटिए। मशीन को उसकी तय जगह पर रखिए, जहाँ हवा उसके चारों ओर चल सके, ताकि वह सूख जाए।',
        ne: 'तारलाई मिलाएर बेर्नुहोस्। मेसिनलाई तोकिएको ठाउँमा राख्नुहोस्, जहाँ हावा चल्न सक्छ, ताकि त्यो सुकोस्।' },
    ],
  },
];
