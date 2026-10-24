// The welcome on the home page: five short lines, each with a move for the narrator (see
// src/scene/presenter.js): nod, point at the EFS mark, turn to show the back, tip the cap, wave. The next
// line starts when the move and the voice have both finished, in every language.
export const GREETING = [
  { move: 'nod',
    say: { en: 'Hello!', hi: 'नमस्ते!', ne: 'नमस्ते!' } },
  { move: 'point',
    say: { en: 'Welcome to Soft Services Training, from EFS.',
           hi: 'ईएफ़एस की ओर से, सॉफ़्ट सर्विसेज़ प्रशिक्षण में आपका स्वागत है।',
           ne: 'ईएफएसको तर्फबाट, सफ्ट सर्भिस तालिममा तपाईंलाई स्वागत छ।' } },
  { move: 'turn',
    say: { en: 'I will be your guide. In every lesson, you will see me in this uniform.',
           hi: 'मैं आपका मार्गदर्शक हूँ। हर पाठ में आप मुझे इसी वर्दी में देखेंगे।',
           ne: 'म तपाईंको मार्गदर्शक हुँ। हरेक पाठमा तपाईंले मलाई यही पोशाकमा देख्नुहुनेछ।' } },
  { move: 'tip',
    say: { en: 'It is nice to meet you.', hi: 'आपसे मिलकर अच्छा लगा।', ne: 'तपाईंलाई भेटेर खुसी लाग्यो।' } },
  { move: 'wave',
    say: { en: 'To begin, open the menu at the top left. There you can choose Vacuum Cleaning, or Chiller Training.',
           hi: 'शुरू करने के लिए ऊपर बाईं ओर की सूची खोलिए। वहाँ आप धूल खींचने वाली मशीन से सफ़ाई, या चिलर का प्रशिक्षण चुन सकते हैं।',
           ne: 'सुरु गर्न माथि बायाँतिरको सूची खोल्नुहोस्। त्यहाँ तपाईं मेसिनले धुलो सफा गर्ने तालिम, वा चिलरको तालिम छान्न सक्नुहुन्छ।' } },
];
