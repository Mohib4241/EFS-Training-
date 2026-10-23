import { PHASES, PARTS, STEPS, JOB_CARD } from './data/steps.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cardTitle = (n) => JOB_CARD.find((c) => c.n === n)?.title || '';

function stepHtml(s) {
  const cards = new Set([s.card, ...(s.checks || []).map((c) => c.card)].filter(Boolean));
  const badges = [...cards].sort().map((n) => `<span class="badge card" title="${esc(cardTitle(n))}">Job card ${n}</span>`).join('');
  const checks = (s.checks || []).length
    ? `<ul>${s.checks.map((c) => `<li>${esc(c.text)}${c.card ? `<span class="badge card">Job card ${c.card}</span>` : ''}</li>`).join('')}</ul>`
    : '';
  const parts = s.parts.length
    ? `<div class="parts" aria-label="Vacuum parts this step shows">${s.parts.map((id) => `<span class="badge">${esc(PARTS[id].name)}</span>`).join('')}</div>`
    : '';
  const hasBody = checks || parts;
  return `<details class="step"${hasBody ? '' : ' data-flat'}>
    <summary><span class="num">${s.n}</span><span><span class="t">${esc(s.title)}</span>${badges ? `<span class="badges">${badges}</span>` : ''}</span>${hasBody ? '<span class="chev" aria-hidden="true">›</span>' : '<span></span>'}</summary>
    ${hasBody ? `<div class="body">${checks}${parts}</div>` : ''}
  </details>`;
}

const partIds = new Set(STEPS.flatMap((s) => [...s.parts, ...(s.checks || []).flatMap((c) => c.parts)]));
const facts = [[STEPS.length, 'steps'], [JOB_CARD.length, 'job-card checks'], [partIds.size, 'vacuum parts shown']];
document.getElementById('facts').innerHTML = facts.map(([n, t]) => `<li><b>${n}</b><span>${t}</span></li>`).join('');

const root = document.getElementById('outline');
root.innerHTML = Object.entries(PHASES).map(([key, ph]) => `<div class="phase"><h3>${esc(ph.label)}</h3>${STEPS.filter((s) => s.phase === key).map(stepHtml).join('')}</div>`).join('');

// A step with nothing inside it does not open.
root.addEventListener('click', (e) => { const d = e.target.closest('details[data-flat]'); if (d) e.preventDefault(); });
