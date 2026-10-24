// Small line icons drawn as SVG, so they look the same on every phone and computer (emoji do not).
const s = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const f = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">${d}</svg>`;

export const ICON = {
  menu: s('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  close: s('<path d="M6 6l12 12M18 6L6 18"/>'),
  home: s('<path d="M3.5 11L12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>'),
  vacuum: s('<circle cx="7.5" cy="16" r="4.5"/><circle cx="7.5" cy="16" r="1.3"/><path d="M11 13.5c2.5-1.5 4-4.5 5-8"/><path d="M16 5.5l2.6 13"/><path d="M15.5 19.5h6"/>'),
  snow: s('<path d="M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2L3.8 16.8"/><path d="M9.3 4.4L12 6.3l2.7-1.9M9.3 19.6l2.7-1.9 2.7 1.9M4.6 11.2l3.1 1.1-.6 3.2M19.4 12.8l-3.1-1.1.6-3.2"/>'),
  chev: s('<path d="M6 9l6 6 6-6"/>'),
  sound: s('<path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4z"/><path d="M16.3 8.7a4.8 4.8 0 010 6.6M18.9 6.2a8.4 8.4 0 010 11.6"/>'),
  muted: s('<path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4z"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/>'),
  gear: s('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3L5.5 5.5"/>'),
  globe: s('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.8 3.9 5.8 3.9 9s-1.3 6.2-3.9 9c-2.6-2.8-3.9-5.8-3.9-9S9.4 5.8 12 3z"/>'),
  play: f('<path d="M8 5.2v13.6a.8.8 0 001.2.7l10.9-6.8a.8.8 0 000-1.4L9.2 4.5A.8.8 0 008 5.2z"/>'),
  pause: f('<rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/>'),
  replay: s('<path d="M3.5 12a8.5 8.5 0 108.5-8.5 8.6 8.6 0 00-6.1 2.6L3.5 8.5"/><path d="M3.5 3.5v5h5"/>'),
  next: s('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  prev: s('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  hand: s('<path d="M8 13V5.5a1.5 1.5 0 013 0V12M11 11V4a1.5 1.5 0 013 0v7M14 11V5.5a1.5 1.5 0 013 0V13"/><path d="M17 11.5a1.5 1.5 0 013 0V15a7 7 0 01-7 7h-1a7 7 0 01-6-3.4L3.5 14a1.5 1.5 0 012.6-1.5L8 15"/>'),
  air: s('<path d="M3 8h10a3 3 0 10-3-3"/><path d="M3 12h15a3 3 0 11-3 3"/><path d="M3 16h7"/>'),
  power: s('<path d="M12 3v8"/><path d="M6.3 6.8a8 8 0 1011.4 0"/>'),
  cut: s('<path d="M4 20L20 4"/><rect x="3" y="3" width="18" height="18" rx="3"/>'),
  apart: s('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><path d="M10 10l4 4"/>'),
  reset: s('<path d="M4 4v6h6"/><path d="M20 20v-6h-6"/><path d="M5.6 15A7.5 7.5 0 0018.4 17M18.4 9A7.5 7.5 0 005.6 7"/>'),
  info: s('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
  check: s('<path d="M5 12.5l4.5 4.5L19 7"/>'),
};
