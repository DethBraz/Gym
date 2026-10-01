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
  return `
    <header class="top"><h1 class="grow">Bora treinar 💪</h1></header>
    <div class="stats">
      <div class="stat"><b>${thisWeek}</b><span>treinos nesta semana</span></div>
      <div class="stat"><b>${streakWeeks()}</b><span>semanas seguidas</span></div>
      <div class="stat"><b>${S.sessions.length}</b><span>treinos no total</span></div>
    </div>
    ${next ? `
      <section class="card hero">
        <small>Próximo treino sugerido</small>
        <h2>${esc(next.name)}</h2>
        <p class="muted small">${next.items.map((i) => esc(exName(i.exerciseId))).join(' · ') || 'Sem exercícios'}</p>
        <button class="btn primary big" data-a="start" data-id="${next.id}">Começar treino</button>
      </section>` : ''}
    <h3 class="sec">Suas rotinas</h3>
    <div class="list">
      ${S.routines.map((r) => `
        <div class="card row">
          <div class="grow"><b>${esc(r.name)}</b>
            <div class="muted small">${r.items.length} exercícios${lastDoneLabel(r.id)}</div></div>
          <button class="btn" data-a="start" data-id="${r.id}">Iniciar</button>
        </div>`).join('') || '<p class="muted">Nenhuma rotina ainda. Crie uma na aba Rotinas.</p>'}
    </div>
    <button class="btn ghost wide" data-a="start">+ Treino livre (sem rotina)</button>`;
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
  return `
    <header class="top sticky">
      <div class="grow">
        <h1 class="t-sm">${esc(a.name)}</h1>
        <span class="muted small">⏱ <span data-elapsed="${a.start}">0:00</span> · ${done}/${total} séries</span>
      </div>
      <button class="btn primary" data-a="finish">Finalizar</button>
    </header>
    ${a.entries.map(vEntry).join('') || '<div class="empty muted"><div class="e-icon">🏋️</div>Adicione o primeiro exercício.</div>'}
    <button class="btn ghost wide" data-a="add-ex">+ Adicionar exercício</button>
    <label class="field"><span>Anotações do treino</span>
      <textarea data-f="notes" rows="2" placeholder="Como você se sentiu? Algo a ajustar?">${esc(a.notes)}</textarea></label>
    <button class="btn danger-ghost wide" data-a="discard">Descartar treino</button>`;
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
  return `
    <section class="card">
      <div class="ex-head">
        <h3>${esc(exName(en.exerciseId))}</h3>
        <div class="ex-tools">
          ${ei > 0 ? `<button class="icon" data-a="ex-up" data-ei="${ei}" aria-label="Mover para cima">↑</button>` : ''}
          <button class="icon" data-a="ex-del" data-ei="${ei}" aria-label="Remover exercício">✕</button>
        </div>
      </div>
      <div class="muted small">Meta ${en.sets.length} × ${esc(en.target)} · descanso ${fmtRest(en.rest)}</div>
      ${tip ? `<div class="tip">💡 ${tip}</div>` : ''}
      <div class="sets">
        <div class="set-row head"><span>#</span><span>Anterior</span><span>${unit()}</span><span>Reps</span><span></span></div>
        ${en.sets.map((s, si) => {
          const p = prev[si];
          const sg = suggestion(en, si, prev);
          return `
          <div class="set-row ${s.done ? 'done' : ''}">
            <span class="n">${si + 1}</span>
            <span class="prev">${p ? `${fmt(p.w)}×${p.r}` : '—'}</span>
            <input inputmode="decimal" enterkeyhint="next" aria-label="Carga série ${si + 1}" data-ei="${ei}" data-si="${si}" data-f="w" value="${esc(s.w)}" placeholder="${esc(sg.w)}">
            <input inputmode="numeric" enterkeyhint="done" aria-label="Repetições série ${si + 1}" data-ei="${ei}" data-si="${si}" data-f="r" value="${esc(s.r)}" placeholder="${esc(sg.r)}">
            <button class="check" data-a="toggle-set" data-ei="${ei}" data-si="${si}" aria-label="Concluir série ${si + 1}">✓</button>
          </div>`;
        }).join('')}
      </div>
      <div class="row gap">
        <button class="btn sm" data-a="add-set" data-ei="${ei}">+ Série</button>
        ${en.sets.length > 1 ? `<button class="btn sm ghost" data-a="del-set" data-ei="${ei}">− Série</button>` : ''}
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
    if (nowW > bestW) prs.push(`${exName(en.exerciseId)}: carga máxima ${fmt(nowW)} ${unit()} (antes ${fmt(bestW)})`);
    else if (now1 > best1 + 0.05) prs.push(`${exName(en.exerciseId)}: 1RM estimado ${fmt(now1)} ${unit()} (antes ${fmt(best1)})`);
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
    <div class="sheet-head"><h2>Treino concluído! 🎉</h2></div>
    <p class="muted">${esc(s.name)}</p>
    <div class="summary-grid">
      <div><b>${fmtDur(s.end - s.start)}</b><span>duração</span></div>
      <div><b>${sessionSets(s)}</b><span>séries</span></div>
      <div><b>${fmtInt(sessionVolume(s))}</b><span>volume (${unit()})</span></div>
    </div>
    ${prs.length ? `<h3 class="sec">🏆 Novos recordes</h3>${prs.map((p) => `<p class="pr">${esc(p)}</p>`).join('')}` : '<p class="muted small">Continue firme — consistência é o que traz resultado.</p>'}
    <button class="btn primary big" data-a="close-modal" style="margin-top:14px">Fechar</button>`);
}

/* ----- Rotinas ----- */
function vRotinas() {
  return `
    <header class="top"><h1 class="grow">Rotinas</h1><button class="btn primary" data-a="ed-new">+ Nova</button></header>
    <div class="list">
      ${S.routines.map((r, i) => `
        <div class="card">
          <div class="ex-head">
            <b>${esc(r.name)}</b>
            <div class="ex-tools">
              ${i > 0 ? `<button class="icon" data-a="rt-up" data-i="${i}" aria-label="Mover para cima">↑</button>` : ''}
              <button class="icon" data-a="ed-open" data-id="${r.id}" aria-label="Editar">✎</button>
            </div>
          </div>
          <p class="muted small">${r.items.map((it) => `${esc(exName(it.exerciseId))} <span style="opacity:.7">${it.sets}×${esc(it.reps)}</span>`).join(' · ') || 'Sem exercícios'}</p>
          <div class="row gap">
            <button class="btn sm primary" data-a="start" data-id="${r.id}" ${S.active ? 'disabled' : ''}>Iniciar</button>
            <button class="btn sm" data-a="rt-dup" data-id="${r.id}">Duplicar</button>
          </div>
        </div>`).join('') || '<div class="empty muted"><div class="e-icon">📋</div>Nenhuma rotina. Crie a primeira!</div>'}
    </div>
    <p class="muted small" style="margin-top:14px">A ordem das rotinas define o “próximo treino sugerido” (A → B → C → A…).</p>`;
}

function vEditor() {
  const d = ui.draft;
  return `
    <header class="top">
      <button class="icon" data-a="ed-cancel" aria-label="Voltar">←</button>
      <h1 class="t-sm grow">${d.isNew ? 'Nova rotina' : 'Editar rotina'}</h1>
      <button class="btn primary" data-a="ed-save">Salvar</button>
    </header>
    <label class="field"><span>Nome da rotina</span>
      <input data-ed="name" value="${esc(d.name)}" placeholder="Ex.: Treino A — Peito"></label>
    <h3 class="sec">Exercícios</h3>
    ${d.items.map((it, i) => `
      <div class="card">
        <div class="ex-head">
          <b>${i + 1}. ${esc(exName(it.exerciseId))}</b>
          <div class="ex-tools">
            ${i > 0 ? `<button class="icon" data-a="ed-up" data-i="${i}" aria-label="Mover para cima">↑</button>` : ''}
            <button class="icon" data-a="ed-del" data-i="${i}" aria-label="Remover">✕</button>
          </div>
        </div>
        <div class="grid3">
          <label class="field"><span>Séries</span><input inputmode="numeric" data-ed="sets" data-i="${i}" value="${esc(it.sets)}"></label>
          <label class="field"><span>Reps</span><input data-ed="reps" data-i="${i}" value="${esc(it.reps)}" placeholder="8-12"></label>
          <label class="field"><span>Descanso (s)</span><input inputmode="numeric" data-ed="rest" data-i="${i}" value="${esc(it.rest)}"></label>
        </div>
      </div>`).join('') || '<p class="muted">Nenhum exercício ainda.</p>'}
    <button class="btn ghost wide" data-a="ed-add">+ Adicionar exercício</button>
    ${d.isNew ? '' : '<button class="btn danger-ghost wide" data-a="ed-delete">Excluir rotina</button>'}`;
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
  toast('Rotina salva ✔');
}

/* ----- Histórico ----- */
function vHistorico() {
  const list = [...S.sessions].sort((a, b) => b.start - a.start);
  const now = Date.now();
  const last30 = list.filter((s) => s.start > now - 30 * DAY);
  // Mapa das últimas 4 semanas (seg → dom)
  const trainedDays = new Set(S.sessions.map((s) => dayStart(s.start)));
  const first = weekStart(now) - 21 * DAY;
  const cells = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(first); d.setDate(d.getDate() + i);
    const t = d.getTime();
    cells.push(`<i class="${trainedDays.has(t) ? 'on' : ''} ${t === dayStart(now) ? 'today' : ''}" title="${fmtDate(t)}"></i>`);
  }
  return `
    <header class="top"><h1 class="grow">Histórico</h1></header>
    <div class="card">
      <div class="row"><div class="grow"><b>${last30.length} treinos</b> <span class="muted small">nos últimos 30 dias</span></div>
      <span class="muted small">${fmtInt(last30.reduce((v, s) => v + sessionVolume(s), 0))} ${unit()} de volume</span></div>
      <div class="heat" aria-label="Dias treinados nas últimas 4 semanas">${cells.join('')}</div>
    </div>
    <h3 class="sec">Sessões</h3>
    ${list.map((s) => `
      <details class="card">
        <summary>
          <div class="grow"><b>${esc(s.name)}</b>
            <div class="muted small">${fmtDate(s.start)} · ${fmtDur(s.end - s.start)} · ${sessionSets(s)} séries · ${fmtInt(sessionVolume(s))} ${unit()}</div></div>
        </summary>
        ${s.entries.map((en) => `
          <div class="hist-ex"><b>${esc(exName(en.exerciseId))}</b>
            <div class="sets-line">${en.sets.map((x) => `${fmt(x.w)}×${x.r}`).join(' · ')}</div></div>`).join('')}
        ${s.notes ? `<p class="muted small" style="margin-top:10px">📝 ${esc(s.notes)}</p>` : ''}
        <div class="row gap">
          <button class="btn sm" data-a="to-routine" data-id="${s.id}">Salvar como rotina</button>
          <button class="btn sm danger-ghost" data-a="del-session" data-id="${s.id}">Excluir</button>
        </div>
      </details>`).join('') || '<div class="empty muted"><div class="e-icon">🗓️</div>Seus treinos finalizados aparecem aqui.</div>'}`;
}

/* ----- Progresso ----- */
function vProgresso() {
  const used = [...new Set(S.sessions.flatMap((s) => s.entries.map((e) => e.exerciseId)))]
    .filter(exById).sort((a, b) => exName(a).localeCompare(exName(b), 'pt-BR'));
  let body = '';
  if (!used.length) {
    body = '<div class="empty muted"><div class="e-icon">📈</div>Finalize um treino para ver sua evolução por exercício.</div>';
  } else {
    if (!used.includes(ui.progEx)) {
      const last = [...S.sessions].sort((a, b) => b.start - a.start)[0];
      ui.progEx = last.entries.map((e) => e.exerciseId).find((id) => used.includes(id)) ?? used[0];
    }
    const hist = historyOf(ui.progEx);
    const metrics = {
      e1rm: ['1RM estimado', (sets) => Math.max(...sets.map((s) => e1rm(s.w, s.r)))],
      max: ['Carga máxima', (sets) => Math.max(...sets.map((s) => s.w))],
      vol: ['Volume', (sets) => sets.reduce((v, s) => v + s.w * s.r, 0)],
      reps: ['Reps totais', (sets) => sets.reduce((v, s) => v + s.r, 0)],
    };
    const [label, fn] = metrics[ui.metric];
    const pts = hist.map((h) => ({ x: h.date, y: fn(h.sets) }));
    const all = hist.flatMap((h) => h.sets.map((s) => ({ ...s, date: h.date })));
    const bestW = all.reduce((b, s) => (s.w > b.w || (s.w === b.w && s.r > b.r) ? s : b), all[0]);
    const best1 = all.reduce((b, s) => (e1rm(s.w, s.r) > e1rm(b.w, b.r) ? s : b), all[0]);
    const first = pts[0]?.y ?? 0, lastV = pts[pts.length - 1]?.y ?? 0;
    const diff = first ? ((lastV - first) / first) * 100 : 0;
    body = `
      <label class="field"><span>Exercício</span>
        <select data-c="prog-ex">${used.map((id) => `<option value="${id}" ${id === ui.progEx ? 'selected' : ''}>${esc(exName(id))}</option>`).join('')}</select></label>
      <div class="chips">${Object.entries(metrics).map(([k, [l]]) => `<button class="chip ${k === ui.metric ? 'on' : ''}" data-a="metric" data-m="${k}">${l}</button>`).join('')}</div>
      <div class="card">
        <div class="row"><b class="grow">${label}</b>
          ${pts.length > 1 ? `<span class="small ${diff >= 0 ? 'pr' : 'muted'}">${diff >= 0 ? '▲' : '▼'} ${fmt(Math.abs(diff))}% desde o início</span>` : ''}</div>
        ${lineChart(pts, ui.metric === 'reps' ? '' : unit())}
        <div class="records">
          <div><b>${fmt(bestW.w)} ${unit()} × ${bestW.r}</b><span>Maior carga · ${fmtDate(bestW.date, { day: '2-digit', month: '2-digit' })}</span></div>
          <div><b>${fmt(e1rm(best1.w, best1.r))} ${unit()}</b><span>Melhor 1RM estimado</span></div>
          <div><b>${hist.length}</b><span>sessões registradas</span></div>
          <div><b>${fmtInt(all.reduce((v, s) => v + s.w * s.r, 0))}</b><span>volume total (${unit()})</span></div>
        </div>
      </div>
      <h3 class="sec">Últimas sessões</h3>
      <div class="card">${hist.slice(-6).reverse().map((h) => `
        <div class="row" style="padding:6px 0"><span class="muted small" style="width:74px">${fmtDate(h.date, { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
        <span class="sets-line grow">${h.sets.map((s) => `${fmt(s.w)}×${s.r}`).join(' · ')}</span></div>`).join('')}</div>`;
  }

  const bw = [...S.bodyweight].sort((a, b) => a.date - b.date);
  const bwLast = bw[bw.length - 1];
  return `
    <header class="top"><h1 class="grow">Progresso</h1></header>
    ${body}
    <h3 class="sec">Peso corporal</h3>
    <div class="card">
      <div class="row">
        <input inputmode="decimal" id="bw-in" placeholder="${bwLast ? fmt(bwLast.w) : 'Seu peso'} ${unit()}" aria-label="Peso corporal">
        <button class="btn primary" data-a="bw-add">Registrar</button>
      </div>
      ${bwLast ? `<p class="small muted">Último: <b style="color:var(--text)">${fmt(bwLast.w)} ${unit()}</b> em ${fmtDate(bwLast.date)}${bw.length > 1 ? ` · variação ${bwLast.w - bw[0].w >= 0 ? '+' : ''}${fmt(bwLast.w - bw[0].w)} ${unit()}` : ''}
        · <a href="#" data-a="bw-undo" style="color:var(--muted)">desfazer último</a></p>` : ''}
      ${lineChart(bw.map((b) => ({ x: b.date, y: b.w })), unit())}
    </div>`;
}

function lineChart(pts, u = '') {
  if (pts.length < 2) {
    return `<div class="chart-empty muted small">${pts.length ? 'Registre mais uma vez para ver o gráfico.' : 'Sem dados ainda.'}</div>`;
  }
  const W = 340, H = 170, P = { l: 34, r: 14, t: 18, b: 22 };
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs) === x0 ? x0 + 1 : Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = (y1 - y0) * 0.15 || Math.max(1, y1 * 0.1);
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
      ${ticks}
      <path class="area" d="${area}"/>
      <path class="line" d="${line}"/>
      ${pts.length <= 40 ? pts.slice(0, -1).map((p) => `<circle class="dot" cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="3"/>`).join('') : ''}
      <circle class="last" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="4.5"/>
      <text class="val" x="${Math.min(lx, W - P.r).toFixed(1)}" y="${(ly - 9).toFixed(1)}" text-anchor="end">${fmt(last.y)}${u ? ` ${u}` : ''}</text>
      <text x="${P.l}" y="${H - 6}">${dd(pts[0].x)}</text>
      <text x="${W - P.r}" y="${H - 6}" text-anchor="end">${dd(last.x)}</text>
    </svg>`;
}

/* ----- Ajustes ----- */
function vAjustes() {
  const st = S.settings;
  return `
    <header class="top"><h1 class="grow">Ajustes</h1></header>
    <div class="card">
      <label class="field" style="margin-top:0"><span>Descanso padrão (segundos)</span>
        <input inputmode="numeric" data-c="set-rest" value="${st.rest}"></label>
      <label class="field"><span>Unidade de carga</span>
        <select data-c="set-unit">
          <option value="kg" ${st.unit === 'kg' ? 'selected' : ''}>Quilos (kg)</option>
          <option value="lb" ${st.unit === 'lb' ? 'selected' : ''}>Libras (lb)</option>
        </select></label>
      <label class="check-field"><span>Som ao fim do descanso</span><input type="checkbox" data-c="set-sound" ${st.sound ? 'checked' : ''}></label>
      <label class="check-field"><span>Vibrar ao fim do descanso</span><input type="checkbox" data-c="set-vibrate" ${st.vibrate ? 'checked' : ''}></label>
    </div>
    <h3 class="sec">Seus dados</h3>
    <div class="card">
      <p class="small muted" style="margin-top:0">Tudo fica salvo só neste aparelho/navegador. Faça backup de vez em quando.</p>
      <div class="row gap" style="flex-wrap:wrap">
        <button class="btn" data-a="export">⬇️ Exportar backup</button>
        <label class="btn">⬆️ Importar backup<input type="file" accept="application/json,.json" data-c="import" hidden></label>
      </div>
      <p class="small muted">${S.sessions.length} treinos · ${S.routines.length} rotinas · ${S.exercises.length} exercícios</p>
      <button class="btn danger-ghost wide" data-a="reset">Apagar todos os dados</button>
    </div>
    <h3 class="sec">Instalar no celular</h3>
    <div class="card small muted">
      <p style="margin-top:0"><b style="color:var(--text)">Android (Chrome):</b> menu ⋮ → “Instalar app” ou “Adicionar à tela inicial”.</p>
      <p><b style="color:var(--text)">iPhone (Safari):</b> botão Compartilhar → “Adicionar à Tela de Início”.</p>
      <p>Depois de instalado, o app funciona offline.</p>
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
    <div class="sheet-head"><h2>Escolher exercício</h2><button class="icon" data-a="close-modal" aria-label="Fechar">✕</button></div>
    <input id="pick-q" type="search" placeholder="Buscar ou criar exercício…" autocomplete="off">
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
      <div class="card" style="margin-top:6px">
        <b>Criar “${esc(q.trim())}”</b>
        <div class="row gap"><select id="pick-muscle">${MUSCLES.map((m) => `<option>${m}</option>`).join('')}</select>
        <button class="btn primary" data-a="pick-new">Criar</button></div>
      </div>` : ''}
    ${groups.map(([m, list]) => `
      <div class="pick-group">${m}</div>
      ${list.map((e) => `<button class="pick-item" data-a="pick" data-id="${e.id}"><span>${esc(e.name)}</span><span class="muted small">${historyOf(e.id).length || ''}</span></button>`).join('')}`).join('')}
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
    $('#rest-time').textContent = 'Próxima série! 💥';
    $('#rest-fill').style.width = '0%';
    if (left < -15000) stopRest();
  } else {
    box.classList.remove('over');
    $('#rest-time').textContent = fmtClock(left + 999);
    $('#rest-fill').style.width = `${Math.min(100, (left / rest.total) * 100)}%`;
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
render();
if (S.active) wake(true);
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
