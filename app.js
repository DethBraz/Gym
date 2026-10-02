'use strict';

/* ---------- Utilidades ---------- */
const KEY = 'gym:v1';
const DAY = 864e5;
const $ = (sel, el = document) => el.querySelector(sel);
let _seq = 0;
const uid = () => Date.now().toString(36) + (_seq++).toString(36) + Math.random().toString(36).slice(2, 6);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString('pt-BR');
const fmtInt = (n) => Math.round(n).toLocaleString('pt-BR');
// 1RM estimado (fórmula de Epley)
const e1rm = (w, r) => (w > 0 && r > 0 ? (r === 1 ? w : w * (1 + r / 30)) : 0);
const repsTop = (target) => { const m = String(target).match(/\d+/g); return m ? +m[m.length - 1] : 0; };
const fmtDur = (ms) => {
  const m = Math.floor(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${m} min`;
};
const fmtClock = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};
const fmtRest = (sec) => (sec >= 60 ? `${Math.floor(sec / 60)}min${sec % 60 ? ` ${sec % 60}s` : ''}` : `${sec}s`);
const fmtDate = (ts, opts = { weekday: 'short', day: '2-digit', month: 'short' }) => new Date(ts).toLocaleDateString('pt-BR', opts);
const dayStart = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const weekStart = (ts) => { const d = new Date(dayStart(ts)); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
const ago = (ts) => {
  const days = Math.round((dayStart(Date.now()) - dayStart(ts)) / DAY);
  return days === 0 ? 'hoje' : days === 1 ? 'ontem' : `há ${days} dias`;
};

/* ---------- Dados ---------- */
const LIB = [
  ['Peito', ['Supino reto com barra', 'Supino inclinado com halteres', 'Supino declinado', 'Crucifixo com halteres', 'Crossover', 'Peck deck', 'Flexão de braço']],
  ['Costas', ['Puxada frontal', 'Barra fixa', 'Remada curvada', 'Remada baixa', 'Remada unilateral', 'Pulldown com corda', 'Levantamento terra']],
  ['Ombros', ['Desenvolvimento com halteres', 'Desenvolvimento militar', 'Elevação lateral', 'Elevação frontal', 'Crucifixo inverso', 'Encolhimento']],
  ['Bíceps', ['Rosca direta', 'Rosca alternada', 'Rosca martelo', 'Rosca Scott', 'Rosca concentrada']],
  ['Tríceps', ['Tríceps pulley', 'Tríceps corda', 'Tríceps testa', 'Tríceps francês', 'Mergulho em paralelas']],
  ['Pernas', ['Agachamento livre', 'Leg press 45°', 'Cadeira extensora', 'Mesa flexora', 'Cadeira flexora', 'Stiff', 'Afundo', 'Agachamento búlgaro', 'Hack machine', 'Cadeira adutora', 'Cadeira abdutora', 'Elevação pélvica']],
  ['Panturrilha', ['Panturrilha em pé', 'Panturrilha sentado']],
  ['Core', ['Abdominal supra', 'Abdominal infra', 'Abdominal na polia', 'Prancha']],
];
const MUSCLES = [...LIB.map(([m]) => m), 'Cardio', 'Outro'];

function seed() {
  const exercises = [];
  for (const [muscle, names] of LIB) for (const name of names) exercises.push({ id: uid(), name, muscle });
  const id = (n) => exercises.find((e) => e.name === n).id;
  const it = (n, sets, reps, rest = 90) => ({ exerciseId: id(n), sets, reps, rest });
  return {
    version: 1,
    exercises,
    routines: [
      { id: uid(), name: 'Treino A — Peito, Ombro e Tríceps', items: [
        it('Supino reto com barra', 4, '8-10', 120), it('Supino inclinado com halteres', 3, '10-12'),
        it('Crucifixo com halteres', 3, '12'), it('Desenvolvimento com halteres', 3, '10'),
        it('Elevação lateral', 3, '12-15', 60), it('Tríceps corda', 3, '12', 60),
      ] },
      { id: uid(), name: 'Treino B — Costas e Bíceps', items: [
        it('Puxada frontal', 4, '8-10', 120), it('Remada curvada', 3, '8-10', 120),
        it('Remada baixa', 3, '10-12'), it('Crucifixo inverso', 3, '12-15', 60),
        it('Rosca direta', 3, '10'), it('Rosca martelo', 3, '12', 60),
      ] },
      { id: uid(), name: 'Treino C — Pernas', items: [
        it('Agachamento livre', 4, '6-8', 150), it('Leg press 45°', 3, '10-12', 120),
        it('Cadeira extensora', 3, '12'), it('Mesa flexora', 3, '12'),
        it('Stiff', 3, '10', 120), it('Panturrilha em pé', 4, '15', 60),
      ] },
    ],
    sessions: [],
    bodyweight: [],
    active: null,
    settings: { rest: 90, unit: 'kg', sound: true, vibrate: true },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (e) { console.warn('Falha ao carregar dados', e); }
  return seed();
}
function normalize(d) {
  const base = seed();
  return {
    ...base, ...d,
    exercises: Array.isArray(d.exercises) ? d.exercises : base.exercises,
    routines: Array.isArray(d.routines) ? d.routines : [],
    sessions: Array.isArray(d.sessions) ? d.sessions : [],
    bodyweight: Array.isArray(d.bodyweight) ? d.bodyweight : [],
    settings: { ...base.settings, ...(d.settings || {}) },
  };
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('⚠️ Não foi possível salvar os dados'); }
}

let S = load();
const ui = { tab: 'treino', draft: null, progEx: null, metric: 'e1rm', pick: null };

const exById = (id) => S.exercises.find((e) => e.id === id);
const exName = (id) => exById(id)?.name ?? 'Exercício removido';
const unit = () => S.settings.unit;

/** Histórico de um exercício: [{date, sets:[{w,r}]}] do mais antigo ao mais recente. */
function historyOf(exId) {
  const out = [];
  for (const s of S.sessions) for (const en of s.entries) if (en.exerciseId === exId && en.sets.length) out.push({ date: s.start, sets: en.sets });
  return out.sort((a, b) => a.date - b.date);
}
const lastSets = (exId) => { const h = historyOf(exId); return h.length ? h[h.length - 1].sets : []; };
const sessionVolume = (s) => s.entries.reduce((v, en) => v + en.sets.reduce((a, x) => a + x.w * x.r, 0), 0);
const sessionSets = (s) => s.entries.reduce((n, en) => n + en.sets.length, 0);

/* ---------- Ícones (traço, estilo Lucide) ---------- */
const ICONS = {
  dumbbell: '<path d="M14.4 14.4 9.6 9.6"/><path d="M18.66 21.49a2 2 0 1 1-2.83-2.83l-1.77 1.77a2 2 0 1 1-2.83-2.83l6.36-6.36a2 2 0 1 1 2.83 2.83l-1.77 1.77a2 2 0 1 1 2.83 2.83z"/><path d="m21.5 21.5-1.4-1.4"/><path d="M3.9 3.9 2.5 2.5"/><path d="M6.4 12.77a2 2 0 1 1-2.83-2.83l1.77-1.77a2 2 0 1 1-2.83-2.83l2.83-2.83a2 2 0 1 1 2.83 2.83l1.77-1.77a2 2 0 1 1 2.83 2.83z"/>',
  list: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  chart: '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',
  settings: '<path d="M20 7h-9M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" fill="currentColor" stroke="none"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  copy: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  scale: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7l10-5z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  note: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  phone: '<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M12 18h.01"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

const TABS = [['treino', 'dumbbell', 'Treino'], ['rotinas', 'list', 'Rotinas'], ['historico', 'calendar', 'Histórico'], ['progresso', 'chart', 'Progresso'], ['ajustes', 'settings', 'Ajustes']];

// Cada rotina ganha um par de cores para o selo (A, B, C…)
const PALETTE = [['#ff8a3d', '#ff2d78'], ['#7c5cff', '#3dc8ff'], ['#22d39a', '#3dc8ff'], ['#ffc53d', '#ff6a3d'], ['#ff2d78', '#7c5cff'], ['#3dc8ff', '#22d39a']];
const grad = (r) => {
  const i = Math.max(0, S.routines.findIndex((x) => x.id === r.id));
  const [a, b] = PALETTE[i % PALETTE.length];
  return `--g1:${a};--g2:${b}`;
};
const badge = (name) => {
  const m = String(name).match(/treino\s+([a-z0-9])\b/i);
  return (m ? m[1] : String(name).trim()[0] || '?').toUpperCase();
};
const estMin = (r) => Math.max(5, Math.round(r.items.reduce((t, i) => t + i.sets * ((+i.rest || 0) + 40), 0) / 60 / 5) * 5);
const emptyState = (icon, text) => `<div class="empty"><span class="e-icon">${ic(icon)}</span><p>${text}</p></div>`;

/* ---------- Render ---------- */
function render() {
  const views = { treino: vTreino, rotinas: vRotinas, historico: vHistorico, progresso: vProgresso, ajustes: vAjustes };
  $('#main').innerHTML = ui.draft ? vEditor() : views[ui.tab]();
  document.querySelectorAll('.nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === ui.tab));
  tick();
}

function vTreino() {
  if (S.active) return vActive();
  const now = Date.now();
  const thisWeek = S.sessions.filter((s) => s.start >= weekStart(now)).length;
  const next = nextRoutine();
  const h = new Date().getHours();
  const hello = h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  return `
    <header class="top">
      <div class="grow">
        <p class="eyebrow">${hello} · ${fmtDate(now, { weekday: 'long', day: 'numeric', month: 'long' }).replace('-feira', '')}</p>
        <h1>Bora treinar</h1>
      </div>
    </header>
    <div class="stats">
      <div class="stat s1"><span class="stat-ic">${ic('flame')}</span><b>${streakWeeks()}</b><span>semanas seguidas</span></div>
      <div class="stat s2"><span class="stat-ic">${ic('calendar')}</span><b>${thisWeek}</b><span>nesta semana</span></div>
      <div class="stat s3"><span class="stat-ic">${ic('trophy')}</span><b>${S.sessions.length}</b><span>treinos no total</span></div>
    </div>
    ${next ? `
      <section class="hero" style="${grad(next)}">
        <div class="hero-top">
          <span class="pill">${ic('zap')} Próximo treino</span>
          <span class="badge lg">${badge(next.name)}</span>
        </div>
        <h2>${esc(next.name)}</h2>
        <div class="meta">
          <span>${ic('dumbbell')} ${next.items.length} exercícios</span>
          <span>${ic('clock')} ~${estMin(next)} min</span>
        </div>
        <div class="tags">${next.items.slice(0, 3).map((i) => `<span class="tag">${esc(exName(i.exerciseId))}</span>`).join('')}${next.items.length > 3 ? `<span class="tag">+${next.items.length - 3}</span>` : ''}</div>
        <button class="btn primary big" data-a="start" data-id="${next.id}">${ic('play')} Começar treino</button>
      </section>` : ''}
    <div class="sec-head"><h3>Suas rotinas</h3><button class="link" data-a="tab" data-tab="rotinas">Gerenciar</button></div>
    <div class="list">
      ${S.routines.map((r) => `
        <div class="card r-card">
          <span class="badge" style="${grad(r)}">${badge(r.name)}</span>
          <div class="grow">
            <b class="r-name">${esc(r.name)}</b>
            <small class="muted">${r.items.length} exercícios${lastDoneLabel(r.id)}</small>
          </div>
          <button class="go" data-a="start" data-id="${r.id}" aria-label="Iniciar ${esc(r.name)}">${ic('play')}</button>
        </div>`).join('') || emptyState('list', 'Nenhuma rotina ainda. Crie uma na aba Rotinas.')}
    </div>
    <button class="btn ghost wide" data-a="start">${ic('plus')} Treino livre</button>`;
}

function nextRoutine() {
  if (!S.routines.length) return null;
  const last = [...S.sessions].sort((a, b) => b.start - a.start).find((s) => S.routines.some((r) => r.id === s.routineId));
  if (!last) return S.routines[0];
  const i = S.routines.findIndex((r) => r.id === last.routineId);
  return S.routines[(i + 1) % S.routines.length];
}
function lastDoneLabel(rid) {
  const s = S.sessions.filter((x) => x.routineId === rid).sort((a, b) => b.start - a.start)[0];
  return s ? ` · feito ${ago(s.start)}` : '';
}
function streakWeeks() {
  const weeks = new Set(S.sessions.map((s) => weekStart(s.start)));
  let w = weekStart(Date.now());
  if (!weeks.has(w)) w = weekStart(w - DAY); // semana atual ainda pode estar em andamento
  let n = 0;
  while (weeks.has(w)) { n++; w = weekStart(w - DAY); }
  return n;
}

/* ----- Treino em andamento ----- */
function vActive() {
  const a = S.active;
  const done = a.entries.reduce((n, en) => n + en.sets.filter((s) => s.done).length, 0);
  const total = a.entries.reduce((n, en) => n + en.sets.length, 0);
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `
    <header class="top sticky">
      <div class="grow">
        <p class="eyebrow live"><i></i><span data-elapsed="${a.start}">0:00</span> · ${done}/${total} séries</p>
        <h1 class="t-sm">${esc(a.name)}</h1>
      </div>
      <button class="btn primary" data-a="finish">${ic('check')} Finalizar</button>
      <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
    </header>
    ${a.entries.map(vEntry).join('') || emptyState('dumbbell', 'Adicione o primeiro exercício.')}
    <button class="btn ghost wide" data-a="add-ex">${ic('plus')} Adicionar exercício</button>
    <label class="field"><span>${ic('note')} Anotações do treino</span>
      <textarea data-f="notes" rows="2" placeholder="Como você se sentiu? Algo a ajustar?">${esc(a.notes)}</textarea></label>
    <button class="btn danger-ghost wide" data-a="discard">${ic('trash')} Descartar treino</button>`;
}

/** Valores sugeridos (placeholder) para uma série: série anterior deste treino, ou a mesma série da última vez. */
function suggestion(en, si, prev) {
  const above = si > 0 ? en.sets[si - 1] : null;
  const p = prev[si] ?? prev[prev.length - 1];
  const w = above && above.w !== '' ? above.w : p ? fmt(p.w) : '';
  const r = p ? String(p.r) : String(repsTop(en.target) || '');
  return { w, r };
}

function overloadTip(en, prev) {
  const top = repsTop(en.target);
  if (!prev.length || !top) return '';
  const maxW = Math.max(...prev.map((s) => s.w));
  const atMax = prev.filter((s) => s.w === maxW);
  if (maxW > 0 && prev.length >= en.sets.length && atMax.every((s) => s.r >= top)) {
    return `Da última vez você fez todas as reps com ${fmt(maxW)} ${unit()}. Hora de subir a carga!`;
  }
  return '';
}

function vEntry(en, ei) {
  const prev = lastSets(en.exerciseId);
  const tip = overloadTip(en, prev);
  const complete = en.sets.length && en.sets.every((s) => s.done);
  return `
    <section class="card ex ${complete ? 'complete' : ''}">
      <div class="ex-head">
        <span class="ex-num">${complete ? ic('check') : ei + 1}</span>
        <div class="grow">
          <h3>${esc(exName(en.exerciseId))}</h3>
          <div class="ex-meta"><span>${en.sets.length} × ${esc(en.target)}</span><span>${ic('clock')} ${fmtRest(en.rest)}</span></div>
        </div>
        <div class="ex-tools">
          ${ei > 0 ? `<button class="icon" data-a="ex-up" data-ei="${ei}" aria-label="Mover para cima">${ic('up')}</button>` : ''}
          <button class="icon" data-a="ex-del" data-ei="${ei}" aria-label="Remover exercício">${ic('x')}</button>
        </div>
      </div>
      ${tip ? `<div class="tip">${ic('zap')}<span>${tip}</span></div>` : ''}
      <div class="sets">
        <div class="set-row head"><span>Série</span><span>Anterior</span><span>${unit()}</span><span>Reps</span><span></span></div>
        ${en.sets.map((s, si) => {
          const p = prev[si];
          const sg = suggestion(en, si, prev);
          return `
          <div class="set-row ${s.done ? 'done' : ''}">
            <span class="n">${si + 1}</span>
            <span class="prev">${p ? `${fmt(p.w)} × ${p.r}` : '—'}</span>
            <input inputmode="decimal" enterkeyhint="next" aria-label="Carga série ${si + 1}" data-ei="${ei}" data-si="${si}" data-f="w" value="${esc(s.w)}" placeholder="${esc(sg.w)}">
            <input inputmode="numeric" enterkeyhint="done" aria-label="Repetições série ${si + 1}" data-ei="${ei}" data-si="${si}" data-f="r" value="${esc(s.r)}" placeholder="${esc(sg.r)}">
            <button class="check" data-a="toggle-set" data-ei="${ei}" data-si="${si}" aria-label="Concluir série ${si + 1}">${ic('check')}</button>
          </div>`;
        }).join('')}
      </div>
      <div class="ex-foot">
        <button class="btn sm soft" data-a="add-set" data-ei="${ei}">${ic('plus')} Série</button>
        ${en.sets.length > 1 ? `<button class="btn sm ghost" data-a="del-set" data-ei="${ei}">${ic('minus')} Série</button>` : ''}
      </div>
    </section>`;
}

function newEntry(exerciseId, sets = 3, reps = '10', rest = S.settings.rest) {
  return {
    exerciseId, target: String(reps || '10'), rest: +rest || S.settings.rest,
    sets: Array.from({ length: Math.max(1, +sets || 1) }, () => ({ w: '', r: '', done: false })),
  };
}

function startWorkout(rid) {
  if (S.active) return;
  const r = S.routines.find((x) => x.id === rid);
  S.active = {
    id: uid(), routineId: r?.id ?? null, name: r?.name ?? 'Treino livre', start: Date.now(), notes: '',
    entries: (r?.items ?? []).filter((i) => exById(i.exerciseId)).map((i) => newEntry(i.exerciseId, i.sets, i.reps, i.rest)),
  };
  save();
  ui.tab = 'treino';
  render();
  scrollTo(0, 0);
  wake(true);
}

function finishWorkout() {
  const a = S.active;
  const entries = a.entries
    .map((en) => ({ exerciseId: en.exerciseId, sets: en.sets.filter((s) => s.done).map((s) => ({ w: num(s.w), r: Math.round(num(s.r)) })) }))
    .filter((en) => en.sets.length);
  if (!entries.length) {
    if (confirm('Nenhuma série foi concluída. Descartar este treino?')) discardWorkout();
    return;
  }
  const pending = a.entries.reduce((n, en) => n + en.sets.filter((s) => !s.done).length, 0);
  if (pending && !confirm(`${pending} série(s) não marcada(s) serão ignoradas. Finalizar treino?`)) return;

  // Recordes pessoais (comparados com o histórico antes deste treino)
  const prs = [];
  for (const en of entries) {
    const hist = historyOf(en.exerciseId).flatMap((h) => h.sets);
    if (!hist.length) continue;
    const bestW = Math.max(...hist.map((s) => s.w));
    const best1 = Math.max(...hist.map((s) => e1rm(s.w, s.r)));
    const nowW = Math.max(...en.sets.map((s) => s.w));
    const now1 = Math.max(...en.sets.map((s) => e1rm(s.w, s.r)));
    if (nowW > bestW) prs.push([exName(en.exerciseId), `Carga máxima: ${fmt(nowW)} ${unit()}`, `antes ${fmt(bestW)}`]);
    else if (now1 > best1 + 0.05) prs.push([exName(en.exerciseId), `1RM estimado: ${fmt(now1)} ${unit()}`, `antes ${fmt(best1)}`]);
  }

  const session = { id: a.id, routineId: a.routineId, name: a.name, start: a.start, end: Date.now(), notes: a.notes.trim(), entries };
  S.sessions.push(session);
  S.active = null;
  save();
  stopRest();
  wake(false);
  render();
  showSummary(session, prs);
}

function discardWorkout() {
  S.active = null;
  save();
  stopRest();
  wake(false);
  render();
}

function showSummary(s, prs) {
  openModal(`
    <div class="done-hero">
      <span class="done-ic">${ic('trophy')}</span>
      <h2>Treino concluído!</h2>
      <p class="muted">${esc(s.name)}</p>
    </div>
    <div class="summary-grid">
      <div><b>${fmtDur(s.end - s.start)}</b><span>duração</span></div>
      <div><b>${sessionSets(s)}</b><span>séries</span></div>
      <div><b>${fmtInt(sessionVolume(s))}</b><span>volume (${unit()})</span></div>
    </div>
    ${prs.length ? `
      <h3 class="sec">Novos recordes</h3>
      <div class="pr-list">${prs.map(([ex, what, before]) => `
        <div class="pr-item"><span class="pr-ic">${ic('trophy')}</span><div class="grow"><b>${esc(ex)}</b><small>${esc(what)} · ${esc(before)}</small></div></div>`).join('')}</div>`
      : '<p class="muted small center">Continue firme: consistência é o que traz resultado.</p>'}
    <button class="btn primary big" data-a="close-modal" style="margin-top:18px">Fechar</button>`);
}

/* ----- Rotinas ----- */
function vRotinas() {
  return `
    <header class="top">
      <div class="grow"><p class="eyebrow">${S.routines.length} rotinas</p><h1>Rotinas</h1></div>
      <button class="btn primary sm" data-a="ed-new">${ic('plus')} Nova</button>
    </header>
    <div class="list">
      ${S.routines.map((r, i) => `
        <div class="card rt">
          <div class="rt-head">
            <span class="badge" style="${grad(r)}">${badge(r.name)}</span>
            <div class="grow">
              <b class="r-name">${esc(r.name)}</b>
              <small class="muted">${r.items.length} exercícios · ~${estMin(r)} min${lastDoneLabel(r.id)}</small>
            </div>
            <div class="ex-tools">
              ${i > 0 ? `<button class="icon" data-a="rt-up" data-i="${i}" aria-label="Mover para cima">${ic('up')}</button>` : ''}
              <button class="icon" data-a="ed-open" data-id="${r.id}" aria-label="Editar">${ic('edit')}</button>
            </div>
          </div>
          <ol class="rt-list">
            ${r.items.map((it) => `<li><span>${esc(exName(it.exerciseId))}</span><span class="muted">${it.sets} × ${esc(it.reps)}</span></li>`).join('') || '<li class="muted">Sem exercícios</li>'}
          </ol>
          <div class="row gap">
            <button class="btn sm primary" data-a="start" data-id="${r.id}" ${S.active ? 'disabled' : ''}>${ic('play')} Iniciar</button>
            <button class="btn sm soft" data-a="rt-dup" data-id="${r.id}">${ic('copy')} Duplicar</button>
          </div>
        </div>`).join('') || emptyState('list', 'Nenhuma rotina. Crie a primeira!')}
    </div>
    <p class="hint">A ordem das rotinas define o próximo treino sugerido (A → B → C → A…).</p>`;
}

function vEditor() {
  const d = ui.draft;
  return `
    <header class="top">
      <button class="icon" data-a="ed-cancel" aria-label="Voltar">${ic('back')}</button>
      <h1 class="t-sm grow">${d.isNew ? 'Nova rotina' : 'Editar rotina'}</h1>
      <button class="btn primary sm" data-a="ed-save">${ic('check')} Salvar</button>
    </header>
    <label class="field"><span>Nome da rotina</span>
      <input data-ed="name" value="${esc(d.name)}" placeholder="Ex.: Treino A — Peito"></label>
    <div class="sec-head"><h3>Exercícios</h3><span class="muted small">${d.items.length}</span></div>
    ${d.items.map((it, i) => `
      <div class="card ex">
        <div class="ex-head">
          <span class="ex-num">${i + 1}</span>
          <b class="grow">${esc(exName(it.exerciseId))}</b>
          <div class="ex-tools">
            ${i > 0 ? `<button class="icon" data-a="ed-up" data-i="${i}" aria-label="Mover para cima">${ic('up')}</button>` : ''}
            <button class="icon" data-a="ed-del" data-i="${i}" aria-label="Remover">${ic('x')}</button>
          </div>
        </div>
        <div class="grid3">
          <label class="field"><span>Séries</span><input inputmode="numeric" data-ed="sets" data-i="${i}" value="${esc(it.sets)}"></label>
          <label class="field"><span>Reps</span><input data-ed="reps" data-i="${i}" value="${esc(it.reps)}" placeholder="8-12"></label>
          <label class="field"><span>Descanso (s)</span><input inputmode="numeric" data-ed="rest" data-i="${i}" value="${esc(it.rest)}"></label>
        </div>
      </div>`).join('') || emptyState('dumbbell', 'Nenhum exercício ainda.')}
    <button class="btn ghost wide" data-a="ed-add">${ic('plus')} Adicionar exercício</button>
    ${d.isNew ? '' : `<button class="btn danger-ghost wide" data-a="ed-delete">${ic('trash')} Excluir rotina</button>`}`;
}

function saveDraft() {
  const d = ui.draft;
  const name = d.name.trim();
  if (!name) return toast('Dê um nome para a rotina');
  const items = d.items.map((it) => ({
    exerciseId: it.exerciseId,
    sets: Math.min(20, Math.max(1, Math.round(num(it.sets)) || 3)),
    reps: String(it.reps).trim() || '10',
    rest: Math.max(0, Math.round(num(it.rest))) || S.settings.rest,
  }));
  const r = { id: d.id, name, items };
  const i = S.routines.findIndex((x) => x.id === d.id);
  if (i >= 0) S.routines[i] = r; else S.routines.push(r);
  save();
  ui.draft = null;
  render();
  toast('Rotina salva');
}

/* ----- Histórico ----- */
function vHistorico() {
  const list = [...S.sessions].sort((a, b) => b.start - a.start);
  const now = Date.now();
  const last30 = list.filter((s) => s.start > now - 30 * DAY);
  // Mapa das últimas 5 semanas (seg → dom)
  const trainedDays = new Set(S.sessions.map((s) => dayStart(s.start)));
  const first = weekStart(now) - 28 * DAY;
  const cells = [];
  for (let i = 0; i < 35; i++) {
    const d = new Date(first); d.setDate(d.getDate() + i);
    const t = d.getTime();
    cells.push(`<i class="${trainedDays.has(t) ? 'on' : ''} ${t === dayStart(now) ? 'today' : ''} ${t > now ? 'future' : ''}" title="${fmtDate(t)}"></i>`);
  }
  return `
    <header class="top"><div class="grow"><p class="eyebrow">Últimos 30 dias</p><h1>Histórico</h1></div></header>
    <div class="card">
      <div class="kpis">
        <div><b>${last30.length}</b><span>treinos</span></div>
        <div><b>${fmtInt(last30.reduce((v, s) => v + sessionVolume(s), 0))}</b><span>${unit()} de volume</span></div>
        <div><b>${last30.reduce((n, s) => n + sessionSets(s), 0)}</b><span>séries</span></div>
      </div>
      <div class="heat-head">${['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d) => `<span>${d}</span>`).join('')}</div>
      <div class="heat" aria-label="Dias treinados nas últimas 5 semanas">${cells.join('')}</div>
    </div>
    <div class="sec-head"><h3>Sessões</h3><span class="muted small">${list.length}</span></div>
    <div class="list">
    ${list.map((s) => `
      <details class="card sess">
        <summary>
          <span class="date-blk"><b>${new Date(s.start).getDate()}</b><small>${fmtDate(s.start, { month: 'short' }).replace('.', '')}</small></span>
          <div class="grow">
            <b class="r-name">${esc(s.name)}</b>
            <div class="sess-meta"><span>${ic('clock')} ${fmtDur(s.end - s.start)}</span><span>${ic('layers')} ${sessionSets(s)} séries</span><span>${ic('dumbbell')} ${fmtInt(sessionVolume(s))} ${unit()}</span></div>
          </div>
        </summary>
        <div class="sess-body">
          ${s.entries.map((en) => `
            <div class="hist-ex"><b>${esc(exName(en.exerciseId))}</b>
              <div class="set-chips">${en.sets.map((x) => `<span>${fmt(x.w)} × ${x.r}</span>`).join('')}</div></div>`).join('')}
          ${s.notes ? `<p class="note">${ic('note')} ${esc(s.notes)}</p>` : ''}
          <div class="row gap">
            <button class="btn sm soft" data-a="to-routine" data-id="${s.id}">${ic('copy')} Salvar como rotina</button>
            <button class="btn sm danger-ghost" data-a="del-session" data-id="${s.id}">${ic('trash')} Excluir</button>
          </div>
        </div>
      </details>`).join('') || emptyState('calendar', 'Seus treinos finalizados aparecem aqui.')}
    </div>`;
}

/* ----- Progresso ----- */
function vProgresso() {
  const used = [...new Set(S.sessions.flatMap((s) => s.entries.map((e) => e.exerciseId)))]
    .filter(exById).sort((a, b) => exName(a).localeCompare(exName(b), 'pt-BR'));
  let body = '';
  if (!used.length) {
    body = emptyState('chart', 'Finalize um treino para ver sua evolução por exercício.');
  } else {
    if (!used.includes(ui.progEx)) {
      const last = [...S.sessions].sort((a, b) => b.start - a.start)[0];
      ui.progEx = last.entries.map((e) => e.exerciseId).find((id) => used.includes(id)) ?? used[0];
    }
    const hist = historyOf(ui.progEx);
    const metrics = {
      e1rm: ['1RM', '1RM estimado', (sets) => Math.max(...sets.map((s) => e1rm(s.w, s.r)))],
      max: ['Carga', 'Carga máxima', (sets) => Math.max(...sets.map((s) => s.w))],
      vol: ['Volume', 'Volume por treino', (sets) => sets.reduce((v, s) => v + s.w * s.r, 0)],
      reps: ['Reps', 'Repetições por treino', (sets) => sets.reduce((v, s) => v + s.r, 0)],
    };
    const [, label, fn] = metrics[ui.metric];
    const pts = hist.map((h) => ({ x: h.date, y: fn(h.sets) }));
    const all = hist.flatMap((h) => h.sets.map((s) => ({ ...s, date: h.date })));
    const bestW = all.reduce((b, s) => (s.w > b.w || (s.w === b.w && s.r > b.r) ? s : b), all[0]);
    const best1 = all.reduce((b, s) => (e1rm(s.w, s.r) > e1rm(b.w, b.r) ? s : b), all[0]);
    const first = pts[0]?.y ?? 0, lastV = pts[pts.length - 1]?.y ?? 0;
    const diff = first ? ((lastV - first) / first) * 100 : 0;
    const u = ui.metric === 'reps' ? '' : unit();
    body = `
      <div class="select-wrap">
        <select data-c="prog-ex" aria-label="Exercício">${used.map((id) => `<option value="${id}" ${id === ui.progEx ? 'selected' : ''}>${esc(exName(id))}</option>`).join('')}</select>
      </div>
      <div class="seg">${Object.entries(metrics).map(([k, [short]]) => `<button class="${k === ui.metric ? 'on' : ''}" data-a="metric" data-m="${k}">${short}</button>`).join('')}</div>
      <div class="card chart-card">
        <p class="eyebrow">${label}</p>
        <div class="row" style="align-items:baseline">
          <span class="big-num">${fmt(lastV)}<small>${u ? ` ${u}` : ''}</small></span>
          ${pts.length > 1 ? `<span class="delta ${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '↑' : '↓'} ${fmt(Math.abs(diff))}%</span>` : ''}
        </div>
        ${lineChart(pts, u, 'c1')}
      </div>
      <div class="records">
        <div><span class="rec-ic r1">${ic('dumbbell')}</span><b>${fmt(bestW.w)} ${unit()} × ${bestW.r}</b><span>Maior carga · ${fmtDate(bestW.date, { day: '2-digit', month: '2-digit' })}</span></div>
        <div><span class="rec-ic r2">${ic('zap')}</span><b>${fmt(e1rm(best1.w, best1.r))} ${unit()}</b><span>Melhor 1RM estimado</span></div>
        <div><span class="rec-ic r3">${ic('calendar')}</span><b>${hist.length}</b><span>Sessões registradas</span></div>
        <div><span class="rec-ic r4">${ic('layers')}</span><b>${fmtInt(all.reduce((v, s) => v + s.w * s.r, 0))}</b><span>Volume total (${unit()})</span></div>
      </div>
      <div class="sec-head"><h3>Últimas sessões</h3></div>
      <div class="card">${hist.slice(-6).reverse().map((h) => `
        <div class="hist-row"><span class="muted small">${fmtDate(h.date, { day: '2-digit', month: 'short' }).replace('.', '')}</span>
        <div class="set-chips">${h.sets.map((s) => `<span>${fmt(s.w)} × ${s.r}</span>`).join('')}</div></div>`).join('')}</div>`;
  }

  const bw = [...S.bodyweight].sort((a, b) => a.date - b.date);
  const bwLast = bw[bw.length - 1];
  const bwDiff = bw.length > 1 ? bwLast.w - bw[0].w : 0;
  return `
    <header class="top"><div class="grow"><p class="eyebrow">Sua evolução</p><h1>Progresso</h1></div></header>
    ${body}
    <div class="sec-head"><h3>Peso corporal</h3></div>
    <div class="card">
      ${bwLast ? `
        <div class="row" style="align-items:baseline">
          <span class="big-num">${fmt(bwLast.w)}<small> ${unit()}</small></span>
          ${bw.length > 1 ? `<span class="delta neutral">${bwDiff >= 0 ? '+' : ''}${fmt(bwDiff)} ${unit()}</span>` : ''}
        </div>
        <p class="small muted" style="margin:2px 0 0">${fmtDate(bwLast.date)} · <a href="#" data-a="bw-undo">desfazer último</a></p>` : ''}
      ${lineChart(bw.map((b) => ({ x: b.date, y: b.w })), unit(), 'c2')}
      <div class="row" style="margin-top:12px">
        <input inputmode="decimal" id="bw-in" placeholder="Peso de hoje (${unit()})" aria-label="Peso corporal">
        <button class="btn primary" data-a="bw-add">Registrar</button>
      </div>
    </div>`;
}

function lineChart(pts, u = '', id = 'c') {
  if (pts.length < 2) {
    return `<div class="chart-empty">${ic('chart')}<span>${pts.length ? 'Registre mais uma vez para ver o gráfico.' : 'Sem dados ainda.'}</span></div>`;
  }
  const W = 340, H = 160, P = { l: 30, r: 12, t: 16, b: 22 };
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs) === x0 ? x0 + 1 : Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = (y1 - y0) * 0.2 || Math.max(1, y1 * 0.1);
  y0 = Math.max(0, y0 - pad); y1 += pad;
  const X = (x) => P.l + ((x - x0) / (x1 - x0)) * (W - P.l - P.r);
  const Y = (y) => H - P.b - ((y - y0) / (y1 - y0)) * (H - P.t - P.b);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
  const area = `${line}L${X(pts[pts.length - 1].x).toFixed(1)},${H - P.b}L${X(pts[0].x).toFixed(1)},${H - P.b}Z`;
  const ticks = [y0, (y0 + y1) / 2, y1].map((v) => `
    <line class="grid" x1="${P.l}" x2="${W - P.r}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/>
    <text x="${P.l - 6}" y="${(Y(v) + 3).toFixed(1)}" text-anchor="end">${fmtInt(v)}</text>`).join('');
  const dd = (t) => fmtDate(t, { day: '2-digit', month: '2-digit' });
  const last = pts[pts.length - 1];
  const lx = X(last.x), ly = Y(last.y);
  return `
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de evolução">
      <defs>
        <linearGradient id="${id}-l" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#ff8a3d"/><stop offset="1" stop-color="#ff2d78"/></linearGradient>
        <linearGradient id="${id}-a" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ff2d78" stop-opacity=".35"/><stop offset="1" stop-color="#ff2d78" stop-opacity="0"/></linearGradient>
      </defs>
      ${ticks}
      <path d="${area}" fill="url(#${id}-a)"/>
      <path class="line" d="${line}" stroke="url(#${id}-l)"/>
      ${pts.length <= 40 ? pts.slice(0, -1).map((p) => `<circle class="dot" cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="2.5"/>`).join('') : ''}
      <circle class="halo" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="9"/>
      <circle class="last" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="4.5"/>
      <text class="val" x="${Math.min(lx, W - P.r).toFixed(1)}" y="${(ly - 13).toFixed(1)}" text-anchor="end">${fmt(last.y)}${u ? ` ${u}` : ''}</text>
      <text x="${P.l}" y="${H - 5}">${dd(pts[0].x)}</text>
      <text x="${W - P.r}" y="${H - 5}" text-anchor="end">${dd(last.x)}</text>
    </svg>`;
}

/* ----- Ajustes ----- */
function vAjustes() {
  const st = S.settings;
  return `
    <header class="top"><div class="grow"><p class="eyebrow">Preferências</p><h1>Ajustes</h1></div></header>
    <div class="sec-head"><h3>Treino</h3></div>
    <div class="group">
      <label class="g-row"><span class="g-ic i1">${ic('clock')}</span><span class="grow">Descanso padrão</span>
        <span class="g-input"><input inputmode="numeric" data-c="set-rest" value="${st.rest}" aria-label="Descanso padrão em segundos"><small>s</small></span></label>
      <label class="g-row"><span class="g-ic i2">${ic('dumbbell')}</span><span class="grow">Unidade de carga</span>
        <select class="g-select" data-c="set-unit">
          <option value="kg" ${st.unit === 'kg' ? 'selected' : ''}>kg</option>
          <option value="lb" ${st.unit === 'lb' ? 'selected' : ''}>lb</option>
        </select></label>
      <label class="g-row"><span class="g-ic i3">${ic('bell')}</span><span class="grow">Som ao fim do descanso</span>
        <input type="checkbox" class="switch" data-c="set-sound" ${st.sound ? 'checked' : ''}></label>
      <label class="g-row"><span class="g-ic i4">${ic('phone')}</span><span class="grow">Vibrar ao fim do descanso</span>
        <input type="checkbox" class="switch" data-c="set-vibrate" ${st.vibrate ? 'checked' : ''}></label>
    </div>
    <div class="sec-head"><h3>Seus dados</h3></div>
    <div class="group">
      <button class="g-row" data-a="export"><span class="g-ic i2">${ic('download')}</span><span class="grow">Exportar backup</span></button>
      <label class="g-row"><span class="g-ic i2">${ic('upload')}</span><span class="grow">Importar backup</span><input type="file" accept="application/json,.json" data-c="import" hidden></label>
      <button class="g-row danger" data-a="reset"><span class="g-ic i5">${ic('trash')}</span><span class="grow">Apagar todos os dados</span></button>
    </div>
    <p class="hint">${S.sessions.length} treinos · ${S.routines.length} rotinas · ${S.exercises.length} exercícios. Tudo fica salvo só neste aparelho; faça backup de vez em quando.</p>
    <div class="sec-head"><h3>Instalar no celular</h3></div>
    <div class="card install">
      <p><b>Android (Chrome)</b><br><span class="muted">Menu ⋮ → “Instalar app”.</span></p>
      <p><b>iPhone (Safari)</b><br><span class="muted">Compartilhar → “Adicionar à Tela de Início”.</span></p>
      <p class="muted small">Depois de instalado, o app funciona offline.</p>
    </div>`;
}

/* ---------- Modal / seletor de exercícios ---------- */
function openModal(html) {
  const m = $('#modal');
  m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  m.hidden = false;
}
function closeModal() {
  const m = $('#modal');
  m.hidden = true;
  m.innerHTML = '';
  ui.pick = null;
}

function openPicker(onPick) {
  ui.pick = onPick;
  openModal(`
    <div class="sheet-head"><h2>Escolher exercício</h2><button class="icon" data-a="close-modal" aria-label="Fechar">${ic('x')}</button></div>
    <div class="search">${ic('search')}<input id="pick-q" type="search" placeholder="Buscar ou criar exercício…" autocomplete="off"></div>
    <div class="pick-list" id="pick-list">${pickList('')}</div>`);
  setTimeout(() => $('#pick-q')?.focus(), 50);
}
function pickList(q) {
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const nq = norm(q.trim());
  const found = S.exercises.filter((e) => !nq || norm(e.name).includes(nq));
  const groups = MUSCLES.map((m) => [m, found.filter((e) => (e.muscle || 'Outro') === m)]).filter(([, l]) => l.length);
  const exact = S.exercises.some((e) => norm(e.name) === nq);
  return `
    ${q.trim() && !exact ? `
      <div class="create">
        <b>${ic('plus')} Criar “${esc(q.trim())}”</b>
        <div class="row gap"><select id="pick-muscle" aria-label="Grupo muscular">${MUSCLES.map((m) => `<option>${m}</option>`).join('')}</select>
        <button class="btn primary" data-a="pick-new">Criar</button></div>
      </div>` : ''}
    ${groups.map(([m, list]) => `
      <div class="pick-group">${m}</div>
      ${list.map((e) => { const n = historyOf(e.id).length; return `<button class="pick-item" data-a="pick" data-id="${e.id}"><span>${esc(e.name)}</span>${n ? `<span class="count">${n}×</span>` : ''}</button>`; }).join('')}`).join('')}
    ${!found.length && !q.trim() ? '<p class="muted">Nenhum exercício.</p>' : ''}`;
}

/* ---------- Timer de descanso ---------- */
let rest = null; // { end, total, fired }
let audio = null;

function unlockAudio() {
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch { /* sem áudio */ }
}
function alarm() {
  if (S.settings.vibrate && navigator.vibrate) navigator.vibrate([250, 120, 250, 120, 400]);
  if (!S.settings.sound || !audio) return;
  const t0 = audio.currentTime;
  [0, 0.25, 0.5].forEach((d, i) => {
    const o = audio.createOscillator(), g = audio.createGain();
    o.frequency.value = i === 2 ? 1320 : 880;
    g.gain.setValueAtTime(0.0001, t0 + d);
    g.gain.exponentialRampToValueAtTime(0.4, t0 + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.18);
    o.connect(g).connect(audio.destination);
    o.start(t0 + d); o.stop(t0 + d + 0.2);
  });
}
function startRest(sec) {
  if (!sec) return;
  rest = { end: Date.now() + sec * 1000, total: sec * 1000, fired: false };
  tick();
}
function stopRest() { rest = null; tick(); }

function tick() {
  document.querySelectorAll('[data-elapsed]').forEach((el) => { el.textContent = fmtClock(Date.now() - +el.dataset.elapsed); });
  const box = $('#rest');
  if (!rest) { box.hidden = true; return; }
  const left = rest.end - Date.now();
  box.hidden = false;
  if (left <= 0) {
    if (!rest.fired) { rest.fired = true; alarm(); }
    box.classList.add('over');
    $('#rest-time').textContent = 'Bora!';
    $('#rest-ring').style.strokeDashoffset = '0';
    if (left < -15000) stopRest();
  } else {
    box.classList.remove('over');
    $('#rest-time').textContent = fmtClock(left + 999);
    $('#rest-ring').style.strokeDashoffset = String(100 - Math.min(100, (left / rest.total) * 100));
  }
}
setInterval(tick, 250);

/* ---------- Tela sempre ligada durante o treino ---------- */
let lock = null;
async function wake(on) {
  try {
    if (on && !lock && 'wakeLock' in navigator) {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } else if (!on && lock) { await lock.release(); lock = null; }
  } catch { /* não suportado ou negado */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { if (S.active) wake(true); tick(); }
});

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- Ações ---------- */
const entryAt = (el) => S.active.entries[+el.dataset.ei];

const actions = {
  tab(el) {
    ui.tab = el.dataset.tab; ui.draft = null;
    render(); scrollTo(0, 0);
  },
  start(el) {
    if (S.active) { ui.tab = 'treino'; render(); return toast('Já existe um treino em andamento'); }
    startWorkout(el.dataset.id);
  },
  finish: finishWorkout,
  discard() { if (confirm('Descartar este treino? As séries registradas serão perdidas.')) discardWorkout(); },
  'toggle-set'(el) {
    unlockAudio();
    const en = entryAt(el), si = +el.dataset.si, s = en.sets[si];
    if (!s.done) {
      const sg = suggestion(en, si, lastSets(en.exerciseId));
      if (s.w === '') s.w = sg.w;
      if (s.r === '') s.r = sg.r;
      if (!(num(s.r) > 0)) { toast('Informe as repetições'); return; }
      s.done = true;
      const allDone = S.active.entries.every((e) => e.sets.every((x) => x.done));
      if (allDone) { stopRest(); toast('Todas as séries feitas! Toque em Finalizar 🎉'); } else startRest(en.rest);
    } else {
      s.done = false;
    }
    save(); render();
  },
  'add-set'(el) {
    const en = entryAt(el);
    en.sets.push({ w: '', r: '', done: false });
    save(); render();
  },
  'del-set'(el) {
    const en = entryAt(el);
    if (en.sets.length > 1) en.sets.pop();
    save(); render();
  },
  'ex-up'(el) {
    const i = +el.dataset.ei, e = S.active.entries;
    [e[i - 1], e[i]] = [e[i], e[i - 1]];
    save(); render();
  },
  'ex-del'(el) {
    const en = entryAt(el);
    if (en.sets.some((s) => s.done) && !confirm(`Remover ${exName(en.exerciseId)} e as séries já feitas?`)) return;
    S.active.entries.splice(+el.dataset.ei, 1);
    save(); render();
  },
  'add-ex'() {
    openPicker((id) => {
      S.active.entries.push(newEntry(id, 3, '10'));
      save(); render();
      scrollTo(0, document.body.scrollHeight);
    });
  },

  'rest-add'(el) {
    if (!rest) return;
    const d = +el.dataset.s * 1000;
    const base = Math.max(Date.now(), rest.end);
    rest.end = Math.max(Date.now() + 1000, base + d);
    rest.total = Math.max(rest.total, rest.end - Date.now());
    rest.fired = false;
    tick();
  },
  'rest-skip': stopRest,

  'ed-new'() { ui.draft = { id: uid(), name: '', items: [], isNew: true }; render(); },
  'ed-open'(el) {
    const r = S.routines.find((x) => x.id === el.dataset.id);
    ui.draft = JSON.parse(JSON.stringify(r));
    render(); scrollTo(0, 0);
  },
  'ed-cancel'() { ui.draft = null; render(); },
  'ed-save': saveDraft,
  'ed-add'() {
    openPicker((id) => {
      ui.draft.items.push({ exerciseId: id, sets: 3, reps: '10', rest: S.settings.rest });
      render();
    });
  },
  'ed-up'(el) {
    const i = +el.dataset.i, it = ui.draft.items;
    [it[i - 1], it[i]] = [it[i], it[i - 1]];
    render();
  },
  'ed-del'(el) { ui.draft.items.splice(+el.dataset.i, 1); render(); },
  'ed-delete'() {
    if (!confirm(`Excluir a rotina “${ui.draft.name}”? O histórico de treinos continua salvo.`)) return;
    S.routines = S.routines.filter((r) => r.id !== ui.draft.id);
    ui.draft = null; save(); render();
  },
  'rt-up'(el) {
    const i = +el.dataset.i, r = S.routines;
    [r[i - 1], r[i]] = [r[i], r[i - 1]];
    save(); render();
  },
  'rt-dup'(el) {
    const r = S.routines.find((x) => x.id === el.dataset.id);
    const copy = { ...JSON.parse(JSON.stringify(r)), id: uid(), name: `${r.name} (cópia)` };
    S.routines.splice(S.routines.indexOf(r) + 1, 0, copy);
    save(); render(); toast('Rotina duplicada');
  },

  'del-session'(el) {
    if (!confirm('Excluir este treino do histórico?')) return;
    S.sessions = S.sessions.filter((s) => s.id !== el.dataset.id);
    save(); render();
  },
  'to-routine'(el) {
    const s = S.sessions.find((x) => x.id === el.dataset.id);
    ui.draft = {
      id: uid(), isNew: true, name: s.routineId ? `${s.name} (nova)` : '',
      items: s.entries.map((en) => ({ exerciseId: en.exerciseId, sets: en.sets.length, reps: String(Math.max(...en.sets.map((x) => x.r))), rest: S.settings.rest })),
    };
    ui.tab = 'rotinas'; render(); scrollTo(0, 0);
  },

  metric(el) { ui.metric = el.dataset.m; render(); },
  'bw-add'() {
    const w = num($('#bw-in').value);
    if (!(w > 0)) return toast('Digite seu peso');
    S.bodyweight.push({ date: Date.now(), w });
    save(); render(); toast('Peso registrado ✔');
  },
  'bw-undo'(el, e) {
    e.preventDefault();
    const bw = [...S.bodyweight].sort((a, b) => a.date - b.date);
    S.bodyweight = bw.slice(0, -1);
    save(); render();
  },

  export() {
    const blob = new Blob([JSON.stringify({ ...S, active: null }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gym-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  reset() {
    if (!confirm('Apagar TODOS os treinos, rotinas e registros? Isso não pode ser desfeito.')) return;
    S = seed(); save(); stopRest(); wake(false); render(); toast('Dados apagados');
  },

  'close-modal': closeModal,
  pick(el) { const cb = ui.pick; closeModal(); cb?.(el.dataset.id); },
  'pick-new'() {
    const name = $('#pick-q').value.trim();
    if (!name) return;
    const ex = { id: uid(), name, muscle: $('#pick-muscle').value };
    S.exercises.push(ex); save();
    const cb = ui.pick; closeModal(); cb?.(ex.id);
  },
};

document.addEventListener('click', (e) => {
  if (e.target.id === 'modal') return closeModal();
  const el = e.target.closest('[data-a]');
  if (!el || el.disabled) return;
  actions[el.dataset.a]?.(el, e);
});

document.addEventListener('input', (e) => {
  const el = e.target, d = el.dataset;
  if (d.f && S.active) {
    if (d.f === 'notes') S.active.notes = el.value;
    else S.active.entries[+d.ei].sets[+d.si][d.f] = el.value.replace(/[^\d.,]/g, '');
    save();
  } else if (d.ed && ui.draft) {
    if (d.ed === 'name') ui.draft.name = el.value;
    else ui.draft.items[+d.i][d.ed] = el.value;
  } else if (el.id === 'pick-q') {
    $('#pick-list').innerHTML = pickList(el.value);
  }
});

document.addEventListener('change', async (e) => {
  const el = e.target, c = el.dataset.c;
  if (!c) return;
  if (c === 'prog-ex') { ui.progEx = el.value; render(); }
  else if (c === 'set-rest') { S.settings.rest = Math.max(0, Math.round(num(el.value))) || 90; save(); }
  else if (c === 'set-unit') { S.settings.unit = el.value; save(); }
  else if (c === 'set-sound') { S.settings.sound = el.checked; save(); }
  else if (c === 'set-vibrate') { S.settings.vibrate = el.checked; save(); }
  else if (c === 'import') {
    const file = el.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.exercises) || !Array.isArray(data.sessions)) throw new Error('formato');
      if (!confirm(`Importar backup com ${data.sessions.length} treinos? Os dados atuais serão substituídos.`)) return;
      S = normalize({ ...data, active: S.active });
      save(); render(); toast('Backup importado ✔');
    } catch { toast('Arquivo de backup inválido'); }
    el.value = '';
  }
});

// Enter no campo de carga pula para reps; Enter em reps conclui a série
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || !e.target.dataset?.f) return;
  const { f, ei, si } = e.target.dataset;
  if (f === 'w') { e.preventDefault(); $(`input[data-f="r"][data-ei="${ei}"][data-si="${si}"]`)?.focus(); }
  else if (f === 'r') {
    e.preventDefault(); e.target.blur();
    if (!S.active.entries[+ei].sets[+si].done) $(`[data-a="toggle-set"][data-ei="${ei}"][data-si="${si}"]`)?.click();
  }
});

/* ---------- Início ---------- */
$('#nav').innerHTML = TABS.map(([t, i, l]) => `<button data-a="tab" data-tab="${t}">${ic(i)}<span>${l}</span></button>`).join('');
$('#rest-skip').innerHTML = ic('x');
render();
if (S.active) wake(true);
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
