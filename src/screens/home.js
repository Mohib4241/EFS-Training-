import { SIMULATIONS, readProgress, progressKey } from '../data/simulations.js';
import { MODULES, equipmentArt } from '../data/modules.js';
import { ICON } from '../icons.js';
import { esc, store } from '../shell.js';

export class HomeScreen {
  constructor(app, view = 'home') { this.app = app; this.view = view; this.filter = 'all'; this.query = ''; }
  title() { return this.view === 'progress' ? 'My learning' : this.view === 'labs' ? 'Simulation lab' : 'Learning hub'; }
  subtitle() { return 'EFS Academy · Facility services'; }
  get wantsVoice() { return false; }
  build() {
    if (this.el) return;
    this.el = document.createElement('section'); this.el.className = 'screen dashboard'; this.el.lang = 'en'; this.el.hidden = true;
    this.el.innerHTML = `<div class="dashboard-wrap">
      <div class="page-intro"><div><p class="eyebrow">LEARN. PRACTISE. PERFORM.</p><h2>${this.view === 'progress' ? 'Your next step starts here.' : this.view === 'labs' ? 'Your virtual workshop.' : 'Build skills. Build confidence.'}</h2><p>Hands-on learning for the people who keep places running.</p></div><span class="edition">EFS <b>ACADEMY</b><span class="edition-dot"></span></span></div>
      ${this.view === 'home' ? `<div class="welcome-grid"><article class="welcome-card"><div class="welcome-copy"><span class="pill"><i></i> A NEW WAY TO LEARN</span><h3>From knowing how.<br>To showing how.</h3><p>Step inside the equipment. Learn with your guide.<br>Practise every decision in a safe, virtual space.</p><div class="welcome-actions"><button class="primary" data-go="lab/vacuum">Enter the simulation ${ICON.next}</button><button class="text-link" data-go="vacuum/sop">Watch a lesson ${ICON.play}</button></div><div class="hero-facts"><span>${ICON.apart} Interactive 3D</span><span>${ICON.sound} Guided narration</span><span>${ICON.check} Knowledge checks</span></div></div><div class="welcome-visual"><img src="media/reference-presenter.jpg" alt="EFS animated trainer in the white EFS uniform from your reference video"><button data-go="vacuum/sop" class="guide-caption"><span class="guide-play">${ICON.play}</span><span><b>See the SOP in action</b><small>Your guide performs the procedure</small></span></button></div></article><aside class="learning-path"><span class="path-icon">${ICON.apart}</span><p class="eyebrow">YOUR LEARNING JOURNEY</p><h3>Small steps.<br>Real capability.</h3><ol><li><b>01</b><span>Explore<small>Understand the equipment</small></span></li><li><b>02</b><span>Practise<small>Make decisions in the lab</small></span></li><li><b>03</b><span>Check<small>Put your knowledge to work</small></span></li></ol><button class="text-link" data-go="progress">View my learning ${ICON.next}</button></aside></div>` : ''}
      <div class="section-top"><div><p class="eyebrow">${this.view === 'progress' ? 'PRACTICE RECORD' : 'BUILT FOR YOUR EVERYDAY'}</p><h3>${this.view === 'progress' ? 'Pick up where you left off' : 'Explore your training'}</h3></div><button class="text-link" data-go="library">Browse SOP library ${ICON.next}</button></div>
      <div class="catalog-toolbar"><div class="filter-tabs" role="group" aria-label="Filter training"><button class="selected" data-filter="all">All modules <span>4</span></button><button data-filter="Soft services">Soft services</button><button data-filter="Hard services">Hard services</button></div><label class="course-search">${ICON.search}<input type="search" placeholder="Find a skill or equipment…" aria-label="Search training modules"></label></div>
      <div class="module-grid" aria-live="polite"></div><div class="learning-summary"></div>
      <div class="source-strip"><span class="source-strip-icon">${ICON.book}</span><div><b>The procedure, always within reach.</b><p>Explore every procedure in the supplied BU3 manual and open the original source alongside your training.</p></div><button class="ghost" data-go="library">Open SOP library ${ICON.next}</button></div>
      <footer class="dashboard-foot"><span>EFS Academy · Learn with purpose.</span><span>Practice records are saved on this device.</span></footer>
    </div>`;
    this.app.shell.screensEl.appendChild(this.el);
    this.el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.go) this.app.go(b.dataset.go);
      if (b.dataset.filter) { this.filter = b.dataset.filter; this.paintCards(); }
    });
    this.el.querySelector('input').addEventListener('input', e => { this.query = e.target.value.toLowerCase(); this.paintCards(); });
  }
  paintCards() {
    const modules = MODULES.filter(m => (this.filter === 'all' || m.category === this.filter) && `${m.title} ${m.category} ${m.description}`.toLowerCase().includes(this.query));
    for (const b of this.el.querySelectorAll('[data-filter]')) { b.classList.toggle('selected', b.dataset.filter === this.filter); b.setAttribute('aria-pressed', String(b.dataset.filter === this.filter)); }
    this.el.querySelector('.module-grid').innerHTML = modules.length ? modules.map((m, i) => {
      const saved = readProgress(m.id, store.get(progressKey(m.id), '{}'));
      const total = SIMULATIONS[m.id].steps.length + SIMULATIONS[m.id].quiz.length;
      const percent = Math.round(saved.index / total * 100);
      return `<article class="module-card" style="--course-color:${m.color}"><button class="module-art" data-go="${m.route}" aria-label="Open ${esc(m.title)} simulation"><span class="course-label">${m.category === 'Soft services' ? 'SOFT SERVICES' : 'HARD SERVICES'}</span><span class="cube-badge">${ICON.apart} 3D</span>${equipmentArt(m.id)}</button><div class="module-body"><div class="module-meta"><span>${m.tag}</span><span>${ICON.clock} ${m.duration}</span></div><h4>${m.title}</h4><p>${m.description}</p><div class="module-bottom"><span class="module-progress">${percent ? `${percent}% practised` : 'Ready when you are'}</span><button data-go="${m.route}" class="module-launch" aria-label="${percent ? 'Continue' : 'Start'} ${esc(m.title)}">${percent ? 'Continue' : 'Start learning'} ${ICON.next}</button></div><div class="course-progress"><span style="width:${percent}%"></span></div></div></article>`;
    }).join('') : '<div class="empty-state">No modules match your search. Try another skill or select All modules.</div>';
    if (this.view === 'progress') this.el.querySelector('.learning-summary').innerHTML = '<p class="record-note">These records track simulation practice on this browser. They are not an equipment authorization or a competency certificate.</p>';
  }
  enter() { this.el.hidden = false; this.paintCards(); this.app.host.style.visibility = 'hidden'; document.body.dataset.page = 'dashboard'; }
  leave() { this.el.hidden = true; this.app.host.style.visibility = ''; delete document.body.dataset.page; }
  update() {}
}
