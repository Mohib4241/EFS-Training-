import { PHASES, STEPS, JOB_CARD } from '../data/steps.js';
import { esc } from '../shell.js';
import { ICON } from '../icons.js';
import {sourcePages} from '../data/procedure.js';

export const SOP_SOURCES = [
  { id: 'sop', title: 'BU3 · Vacuum cleaning', publisher: 'BICSc · Version 3.0 · October 2020', pages: 3, url: 'media/vacuum-sop.pdf' },
  { id: 'card', title: 'Vacuum cleaning job card', publisher: 'EFS Centre of Excellence · 6 checks', pages: 1, url: 'media/vacuum-job-card.pdf' },
];

// Printed source pages, including the two procedures that continue onto another page.
export const SOP_PAGES = Object.fromEntries(STEPS.map(({n}) => [n, sourcePages(n)]));

export function findSteps(query = '', phase = 'all') {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return STEPS.filter((step) => {
    const text = [step.n, step.title, PHASES[step.phase].label, ...step.checks.map((c) => c.text)].join(' ').toLocaleLowerCase();
    return (phase === 'all' || phase === step.phase) && words.every((word) => text.includes(word));
  });
}

export class LibraryScreen {
  constructor(app) { this.app = app; this.phase = 'all'; this.query = ''; }
  title() { return 'SOP library'; }
  subtitle() { return 'Source-backed learning'; }
  build() {
    if (this.el) return;
    const el = this.el = document.createElement('section');
    el.className = 'screen library-page'; el.lang = 'en'; el.hidden = true;
    el.innerHTML = `<div class="library-wrap">
      <header class="library-header">
        <p class="eyebrow">THE KNOWLEDGE BASE</p>
        <h2>Vacuum cleaning procedures</h2>
        <p>Explore the complete supplied vacuum-cleaning procedure, then put it into practice.</p>
        <div class="library-actions"><a class="primary-btn" href="#/vacuum/sop">${ICON.play} Play guided SOP</a><a class="secondary-btn" href="#/lab/vacuum">${ICON.vacuum} Open vacuum lab</a></div>
      </header>
      <div class="library-facts"><span><strong>16</strong> procedure steps</span><span><strong>6</strong> job-card checks</span><span><strong>10 m²</strong> practice area, including a corner and edge</span></div>
      <section class="library-sources" aria-label="Original source documents">${SOP_SOURCES.map((source) => `<a class="source-card" href="${source.url}#page=1" target="_blank" rel="noopener"><span class="source-icon">${ICON.info}</span><span><strong>${esc(source.title)}</strong><small>${esc(source.publisher)}</small></span><span class="source-format">PDF · ${source.pages} ${source.pages === 1 ? 'page' : 'pages'} ↗</span></a>`).join('')}</section>
      <aside class="source-note"><strong>Source note</strong><p>The SOP requires changing the bag at <b>two-thirds full or more</b>; the job card says <b>above 70%</b>. This training follows the SOP's two-thirds threshold. PPE and electrical checks follow the task risk assessment and company policy.</p></aside>
      <div class="library-tools">
        <label class="library-search"><span>Search procedure</span><input type="search" placeholder="Search cable, PPE, storage…" aria-label="Search procedure steps" autocomplete="off"></label>
        <div class="library-filters" role="group" aria-label="Filter by procedure phase"><button type="button" data-phase="all" aria-pressed="true">All steps</button>${Object.entries(PHASES).map(([id, phase]) => `<button type="button" data-phase="${id}" aria-pressed="false">${esc(phase.label)}</button>`).join('')}</div>
      </div>
      <p class="library-count" aria-live="polite"></p>
      <div class="library-step-list"></div>
      <section class="library-jobcard"><h2>The six job-card checks</h2><div class="jobcard-checks">${JOB_CARD.map((check) => `<div><span>${check.n.toString().padStart(2, '0')}</span><p>${esc(check.title)}</p></div>`).join('')}</div><a href="media/vacuum-job-card.pdf#page=1" target="_blank" rel="noopener">View original EFS job card ↗</a></section>
      <aside class="library-coverage"><strong>Library coverage</strong><p>These are all procedures in the two supplied documents. Drilling, MCB and HVAC labs are illustrative learning scenarios; their approved site SOPs and equipment manuals have not been supplied.</p></aside>
      <footer class="library-attribution">Procedure adapted from BICSc BU3, BICSc_EDU_D022, Version 3.0, October 2020. Original documents remain available above. Source text is in English; the guided vacuum lesson supports English, Hindi and Nepali.</footer>
    </div>`;
    this.app.shell.screensEl.appendChild(el);
    el.querySelector('input').addEventListener('input', (event) => { this.query = event.target.value; this.paintSteps(); });
    el.querySelector('.library-filters').addEventListener('click', (event) => {
      const button = event.target.closest('[data-phase]'); if (!button) return;
      this.phase = button.dataset.phase;
      el.querySelectorAll('[data-phase]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      this.paintSteps();
    });
    this.paintSteps();
  }
  paintSteps() {
    const matches = findSteps(this.query, this.phase);
    this.el.querySelector('.library-count').textContent = `${matches.length} of ${STEPS.length} steps${this.phase !== 'all' ? ` · ${PHASES[this.phase].label}` : ''}`;
    this.el.querySelector('.library-step-list').innerHTML = matches.length ? matches.map((step) => `<details class="library-step">
      <summary><span class="library-step-number">${step.n.toString().padStart(2, '0')}</span><span><small>${esc(PHASES[step.phase].label)}</small><strong>${esc(step.title)}</strong></span><span class="library-expand">${ICON.chev}</span></summary>
      <div class="library-step-content"><ul>${step.checks.map((check) => `<li>${esc(check.text)}${check.card ? ` <small class="check-source">Job card ${check.card}</small>` : ''}</li>`).join('')}</ul><div class="library-page-links"><span>BU3 source:</span>${SOP_PAGES[step.n].map((page) => `<a href="media/vacuum-sop.pdf#page=${page}" target="_blank" rel="noopener">Page ${page} ↗</a>`).join('')}</div></div>
    </details>`).join('') : '<div class="library-empty"><h2>No matching steps</h2><p>Try a shorter search or choose All steps.</p></div>';
  }
  enter() { this.app.host.style.visibility = 'hidden'; this.el.hidden = false; this.app.narrator.stop(); }
  leave() { this.el.hidden = true; this.app.host.style.visibility = ''; }
  update() {}
}
