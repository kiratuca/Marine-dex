// ═══════════════════════════════════════════════════════════
//  MARINE-DEX · Aplicació principal
// ═══════════════════════════════════════════════════════════
import { store, startSync, uid } from './store.js';
import { SPECIES, RARITIES, REGIONS } from './data/species.js';
import { BADGES, SEAS, COUNTRY_SEA, DIVE_TAGS, SUITS } from './data/badges.js';
import { COUNTRIES } from './data/countries.js';

const APP_VERSION = '1.0.0';

// ── Utilitats ────────────────────────────────────────────────
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const fmtDate = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('ca-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const num = v => { if (v === '' || v == null) return null; const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
const fmtNum = n => n == null ? '—' : (Math.round(n * 10) / 10).toLocaleString('ca-ES');
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const flag = a2 => (a2 && /^[A-Z]{2}$/.test(a2)) ? String.fromCodePoint(...[...a2].map(c => 127397 + c.charCodeAt(0))) : '🏳️';
const fmtHours = min => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m} min`; };

const COUNTRY = Object.fromEntries(COUNTRIES.map(([a2, n, name, lat, lng]) => [a2, { a2, num: n, name, lat, lng }]));
const NUM2A2 = Object.fromEntries(COUNTRIES.map(([a2, n]) => [n, a2]));
const COUNTRIES_SORTED = [...COUNTRIES].sort((a, b) => a[2].localeCompare(b[2], 'ca'));
const cName = a2 => COUNTRY[a2]?.name || a2 || '—';
const rarity = r => RARITIES[r] || RARITIES[0];
const SEA_REG = { med: ['med'], atl: ['atl'], roig: ['roig', 'glob'], carib: ['carib', 'glob'], indo: ['indo', 'glob', 'roig'], pac: ['epac', 'indo', 'glob'], altre: [] };

// ── Estat derivat ────────────────────────────────────────────
function derive() {
  const custom = store.list('species').map(s => ({ ...s, custom: true, reg: s.reg || [], f: s.f || [] }));
  const species = [...SPECIES, ...custom];
  const spMap = Object.fromEntries(species.map((s, i) => [s.id, { ...s, idx: i + 1 }]));
  const dives = store.list('dives').sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.createdAt || 0) - (b.createdAt || 0));
  const diveNo = new Map(dives.map((d, i) => [d.id, i + 1]));
  const seen = {};
  const touch = id => (seen[id] ??= { first: null, dives: [], countries: new Set(), manual: false });
  for (const d of dives) {
    for (const sp of d.species || []) {
      if (!spMap[sp]) continue;
      const s = touch(sp); s.dives.push(d); if (d.country) s.countries.add(d.country);
      if (!s.first || d.date < s.first) s.first = d.date;
    }
  }
  for (const u of store.list('unlocks')) {
    if (!spMap[u.id]) continue;
    const s = touch(u.id); s.manual = true;
    if (!s.first || (u.date && u.date < s.first)) s.first = u.date || s.first;
  }
  const bucket = new Set(store.list('bucket').map(b => b.id));
  return { species, spMap, dives, diveNo, seen, bucket };
}

function computeStats(D) {
  const st = { dives: D.dives.length, minutes: 0, maxDepth: 0, maxTime: 0, minTemp: null, maxTemp: null,
    tags: {}, seas: {}, countries: 0, species: 0, byRarity: [0, 0, 0, 0], tagSeen: {} };
  const cs = new Set();
  for (const d of D.dives) {
    st.minutes += d.time || 0;
    st.maxDepth = Math.max(st.maxDepth, d.depth || 0);
    st.maxTime = Math.max(st.maxTime, d.time || 0);
    if (d.temp != null) { st.minTemp = st.minTemp == null ? d.temp : Math.min(st.minTemp, d.temp); st.maxTemp = st.maxTemp == null ? d.temp : Math.max(st.maxTemp, d.temp); }
    (d.tags || []).forEach(t => st.tags[t] = true);
    if (d.sea) st.seas[d.sea] = true;
    if (d.country) cs.add(d.country);
  }
  st.countries = cs.size;
  for (const id of Object.keys(D.seen)) {
    const sp = D.spMap[id]; if (!sp) continue;
    st.species++; st.byRarity[sp.r]++;
    (sp.tags || []).forEach(t => st.tagSeen[t] = true);
  }
  return st;
}
const earnedBadges = st => BADGES.filter(b => { try { return !!b.test(st); } catch { return false; } });

// ── Toast ────────────────────────────────────────────────────
let toastT;
function toast(msg) {
  const t = $('#toast'); t.innerHTML = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
}

// ── Full inferior (sheet) ────────────────────────────────────
const sheet = $('#sheet');
function openSheet(html, mount) {
  $('#sheet-body').innerHTML = html;
  const wasOpen = !sheet.hidden;
  sheet.hidden = false; sheet.classList.remove('closing');
  $('.sheet-panel').scrollTop = 0;
  document.body.style.overflow = 'hidden';
  if (!wasOpen) history.pushState({ sheet: 1 }, '');
  mount?.($('#sheet-body'));
}
function hideSheet() {
  if (sheet.hidden || sheet.classList.contains('closing')) return;
  sheet.classList.add('closing');
  setTimeout(() => { sheet.hidden = true; sheet.classList.remove('closing'); $('#sheet-body').innerHTML = ''; document.body.style.overflow = ''; }, 210);
}
function closeSheet() { if (history.state?.sheet) history.back(); else hideSheet(); }
sheet.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeSheet(); });
window.addEventListener('popstate', () => hideSheet());

// ── Components ───────────────────────────────────────────────
function spCard(sp, D, { isNew = false, compact = false } = {}) {
  const unlocked = !!D.seen[sp.id];
  const r = rarity(sp.r);
  return `<button class="sp-card ${unlocked ? '' : 'locked'} ${isNew ? 'new' : ''}" data-r="${sp.r}" data-sp="${esc(sp.id)}" type="button">
    ${compact ? '' : `<span class="num">#${String(sp.idx).padStart(3, '0')}</span>`}
    ${D.bucket.has(sp.id) ? '<span class="star">⭐</span>' : ''}
    <span class="emo">${esc(sp.e || '🐟')}</span>
    <span class="nm">${esc(sp.n)}</span>
    <span class="rt">${r.icon} ${r.name}</span>
  </button>`;
}

function diveRow(d, D) {
  const sp = (d.species || []).map(id => D.spMap[id]?.e).filter(Boolean);
  const tags = (d.tags || []).map(t => DIVE_TAGS.find(x => x.id === t)?.icon).filter(Boolean).join(' ');
  return `<button class="dive" data-dive="${esc(d.id)}" type="button">
    <div class="no"><div><b>${D.diveNo.get(d.id)}</b><small>núm.</small></div></div>
    <div>
      <h3>${esc(d.site || 'Sense nom')}</h3>
      <div class="meta">${flag(d.country)} ${esc(cName(d.country))} · ${fmtDate(d.date)} ${tags ? '· ' + tags : ''}</div>
      <div class="nums">
        <span>⬇️ ${fmtNum(d.depth)} m</span><span>⏱️ ${fmtNum(d.time)} min</span>${d.temp != null ? `<span>🌡️ ${fmtNum(d.temp)} °C</span>` : ''}
      </div>
      ${sp.length ? `<div class="emos">${sp.slice(0, 12).join('')}${sp.length > 12 ? ` <small class="muted">+${sp.length - 12}</small>` : ''}</div>` : ''}
    </div>
  </button>`;
}

function medal(b, on) {
  return `<button class="badge ${on ? '' : 'off'}" data-badge="${b.id}" type="button">
    <div class="medal"><span>${b.icon}</span></div><div class="nm">${esc(b.name)}</div></button>`;
}

// Delegació global de clics a targetes
document.addEventListener('click', e => {
  const sp = e.target.closest('[data-sp]'); if (sp) { speciesSheet(sp.dataset.sp); return; }
  const dv = e.target.closest('[data-dive]'); if (dv) { diveSheet(dv.dataset.dive); return; }
  const bd = e.target.closest('[data-badge]');
  if (bd) { const b = BADGES.find(x => x.id === bd.dataset.badge); const on = !bd.classList.contains('off'); toast(`${b.icon} <b>${esc(b.name)}</b> — ${esc(b.desc)}${on ? ' ✅' : ''}`); }
});

// ═══════════════ VISTA: INICI ═══════════════
function renderHome(D) {
  const st = computeStats(D);
  const earned = earnedBadges(st);
  const total = D.species.length;
  const pct = total ? Math.round(st.species / total * 100) : 0;
  const perR = RARITIES.map(r => ({ r, total: D.species.filter(s => s.r === r.id).length, got: st.byRarity[r.id] }));
  const recent = Object.entries(D.seen).filter(([id]) => D.spMap[id]).sort((a, b) => (b[1].first || '').localeCompare(a[1].first || '')).slice(0, 10).map(([id]) => D.spMap[id]);
  const last = D.dives[D.dives.length - 1];
  const wish = [...D.bucket].map(id => D.spMap[id]).filter(s => s && !D.seen[s.id]);
  const bubbles = Array.from({ length: 7 }, (_, i) => { const s = 6 + (i * 7) % 16; return `<i style="left:${8 + i * 13}%;width:${s}px;height:${s}px;animation-delay:${-i * 1.1}s;animation-duration:${6 + i % 3 * 2}s"></i>`; }).join('');

  $('#v-home').innerHTML = `
    <div class="hero">
      <div class="bubbles">${bubbles}</div>
      <h1>La vostra bitàcola<br>sota l'aigua 🌊</h1>
      <p>${st.dives ? `Última immersió: ${fmtDate(last.date)} · ${esc(last.site || '')}` : 'Comenceu a omplir el quadern i el Marine-Dex.'}</p>
      <div class="stats">
        <div class="stat"><b>${st.dives}</b><span>immersions</span></div>
        <div class="stat"><b>${fmtHours(st.minutes)}</b><span>sota l'aigua</span></div>
        <div class="stat"><b>${fmtNum(st.maxDepth)} m</b><span>profunditat màxima</span></div>
        <div class="stat"><b>${st.countries}</b><span>${st.countries === 1 ? 'país' : 'països'}</span></div>
      </div>
      ${st.dives ? '' : '<button class="btn primary block" style="margin-top:16px;position:relative" data-new-dive>🤿 Registra la primera immersió</button>'}
    </div>

    <div class="section-title"><h2>Marine-Dex</h2><a href="#dex">Obrir →</a></div>
    <a class="card dex-progress" href="#dex">
      <div class="ring" style="--p:${pct}"><div><div><b>${st.species}</b><small>de ${total}</small></div></div></div>
      <div class="rarity-bars">
        ${perR.map(x => `<div class="rbar"><span style="color:${x.r.color}">${x.r.icon} ${x.r.name}</span>
          <div class="track"><div class="fill" style="width:${x.total ? x.got / x.total * 100 : 0}%;background:${x.r.color}"></div></div><em>${x.got}/${x.total}</em></div>`).join('')}
      </div>
    </a>

    <div class="section-title"><h2>Últims descobriments</h2></div>
    ${recent.length ? `<div class="hscroll">${recent.map(s => spCard(s, D, { compact: true })).join('')}</div>`
      : `<div class="empty"><span class="big">🔍</span>Encara no heu desbloquejat cap animal.<br>Registreu una immersió o obriu el Dex.</div>`}

    ${last ? `<div class="section-title"><h2>Última immersió</h2><a href="#log">Bitàcola →</a></div>${diveRow(last, D)}` : ''}

    <div class="section-title"><h2>Insígnies <span class="muted small">${earned.length}/${BADGES.length}</span></h2><a href="#map" data-goto-badges>Totes →</a></div>
    ${earned.length ? `<div class="hscroll">${earned.slice().reverse().map(b => `<div style="width:92px">${medal(b, true)}</div>`).join('')}</div>`
      : `<div class="empty"><span class="big">🏅</span>Les medalles es desbloquegen soles en registrar immersions.</div>`}

    ${wish.length ? `<div class="section-title"><h2>⭐ Llista de desitjos</h2><a href="#dex" data-goto-wish>Veure →</a></div>
      <div class="hscroll">${wish.map(s => spCard(s, D, { compact: true })).join('')}</div>` : ''}
  `;
}
document.addEventListener('click', e => {
  if (e.target.closest('[data-new-dive]')) diveForm();
  if (e.target.closest('[data-goto-wish]')) dexState.filter = 'wish';
  if (e.target.closest('[data-goto-badges]')) setTimeout(() => $('#badges-anchor')?.scrollIntoView({ behavior: 'smooth' }), 400);
});

// ═══════════════ VISTA: MARINE-DEX ═══════════════
const dexState = { q: '', filter: 'all', rar: null, built: false };
function renderDex(D) {
  const v = $('#v-dex');
  if (!dexState.built) {
    v.innerHTML = `
      <div class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="dexQ" type="search" placeholder="Busca un animal…" autocomplete="off"></div>
      <div class="seg" id="dexSeg">
        <button data-f="all">Tots</button><button data-f="seen">Vistos</button><button data-f="locked">Per veure</button><button data-f="wish">⭐ Desitjos</button>
      </div>
      <div class="chips" id="dexRar">${RARITIES.map(r => `<button class="chip" data-r="${r.id}" style="--c:${r.color}"><span class="dot" style="background:${r.color}"></span>${r.name}</button>`).join('')}</div>
      <div class="dex-head"><span id="dexCount"></span><button class="chip" id="addSpecies" type="button">＋ Afegir espècie</button></div>
      <div class="dex-grid" id="dexGrid"></div>`;
    $('#dexQ').addEventListener('input', e => { dexState.q = e.target.value; renderDex(derive()); });
    $('#dexSeg').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { dexState.filter = b.dataset.f; renderDex(derive()); } });
    $('#dexRar').addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) { const r = +b.dataset.r; dexState.rar = dexState.rar === r ? null : r; renderDex(derive()); } });
    $('#addSpecies').addEventListener('click', () => speciesForm());
    dexState.built = true;
  }
  $$('#dexSeg button').forEach(b => b.classList.toggle('on', b.dataset.f === dexState.filter));
  $$('#dexRar .chip').forEach(b => { const on = +b.dataset.r === dexState.rar; b.classList.toggle('on', on); b.style.color = on ? b.style.getPropertyValue('--c') : ''; });

  const q = norm(dexState.q);
  const list = D.species.map(s => D.spMap[s.id]).filter(s => {
    if (q && !norm(s.n + ' ' + s.s).includes(q)) return false;
    if (dexState.rar != null && s.r !== dexState.rar) return false;
    if (dexState.filter === 'seen' && !D.seen[s.id]) return false;
    if (dexState.filter === 'locked' && D.seen[s.id]) return false;
    if (dexState.filter === 'wish' && !D.bucket.has(s.id)) return false;
    return true;
  });
  const got = Object.keys(D.seen).filter(id => D.spMap[id]).length;
  $('#dexCount').textContent = `${got} de ${D.species.length} desbloquejats · ${list.length} a la llista`;
  $('#dexGrid').innerHTML = list.length ? list.map(s => spCard(s, D)).join('')
    : `<div class="empty" style="grid-column:1/-1"><span class="big">${dexState.filter === 'wish' ? '⭐' : '🌊'}</span>${dexState.filter === 'wish' ? 'Encara no hi ha cap animal a la llista de desitjos. Obre una fitxa i toca ☆.' : 'Cap animal coincideix amb el filtre.'}</div>`;
}

// ── Fitxa d'espècie ──────────────────────────────────────────
function speciesSheet(id, { justUnlocked = false } = {}) {
  const D = derive();
  const sp = D.spMap[id]; if (!sp) return;
  const s = D.seen[id];
  const r = rarity(sp.r);
  const wish = D.bucket.has(id);
  const regions = (sp.reg || []).map(k => REGIONS[k]).filter(Boolean).join(', ') || '—';
  const facts = (sp.f || []).filter(Boolean);

  const body = s ? `
    <div class="seen-box"><span style="font-size:1.5rem">✅</span><div>
      <b>Vist per primer cop:</b> ${fmtDate(s.first)}<br>
      <span class="muted small">${s.dives.length} ${s.dives.length === 1 ? 'immersió' : 'immersions'}${s.countries.size ? ' · ' + [...s.countries].map(c => flag(c) + ' ' + esc(cName(c))).join(', ') : ''}${s.manual && !s.dives.length ? ' · desbloqueig manual' : ''}</span></div></div>
    <div class="facts-grid">
      <div class="fact wide"><small>Hàbitat</small><span>${esc(sp.hab || '—')}</span></div>
      <div class="fact"><small>Mida</small><span>${esc(sp.mida || '—')}</span></div>
      <div class="fact"><small>Profunditat</small><span>${esc(sp.prof || '—')}</span></div>
      <div class="fact wide"><small>On viu</small><span>${esc(regions)}</span></div>
    </div>
    ${facts.length ? `<h3 style="margin:4px 0 10px">Curiositats</h3><ul class="trivia">${facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
    ${s.dives.length ? `<h3 style="margin:20px 0 10px">Vist a</h3><div class="mini-dives">${s.dives.slice().reverse().map(d => `
      <button class="mini-dive" data-dive="${esc(d.id)}" type="button"><span>${flag(d.country)} ${esc(d.site || cName(d.country))}</span><span class="muted">#${D.diveNo.get(d.id)} · ${fmtDate(d.date)}</span></button>`).join('')}</div>` : ''}
  ` : `
    <p class="lock-note">🔒 Encara no l'heu vist. Quan el trobeu, desbloquegeu-lo per veure la fitxa completa.</p>
    <div class="actions" style="margin:0 0 6px">
      <button class="btn primary block" id="spUnlock">🔓 Desbloquejar</button>
      <button class="btn block ${wish ? 'aqua' : ''}" id="spWish">${wish ? '⭐ A la llista de desitjos' : '☆ Afegir a desitjos'}</button>
    </div>
    <div class="facts-grid">
      <div class="fact wide"><small>On buscar-lo</small><span>${esc(regions)}</span></div>
      <div class="fact"><small>Mida</small><span class="blurred">██████</span></div>
      <div class="fact"><small>Profunditat</small><span class="blurred">█████</span></div>
    </div>
    <ul class="trivia blurred"><li>Aquesta curiositat es revela en desbloquejar l'animal.</li><li>Un altre secret amagat de l'espècie.</li></ul>
  `;

  openSheet(`
    <div class="sp-hero">
      <div class="sp-orb" data-r="${sp.r}" ${justUnlocked ? 'style="animation:pop .7s cubic-bezier(.2,1.6,.4,1)"' : ''}><span class="${s ? '' : 'silhouette'}">${esc(sp.e || '🐟')}</span></div>
      <div class="muted small">#${String(sp.idx).padStart(3, '0')}${sp.custom ? ' · personalitzada' : ''}</div>
      <h2>${esc(sp.n)}</h2>
      ${sp.s ? `<div class="sci">${esc(sp.s)}</div>` : ''}
      <span class="rtag" style="color:${r.color}">${r.icon} ${r.name}</span>
    </div>
    ${body}
    <div class="actions">
      ${s ? `<button class="btn block ${wish ? 'aqua' : ''}" id="spWish">${wish ? '⭐ A la llista de desitjos' : '☆ Afegir a desitjos'}</button>` : ''}
      ${s && s.manual && !s.dives.length ? `<button class="btn ghost block small" id="spRelock">Tornar a bloquejar</button>` : ''}
      ${sp.custom ? `<button class="btn danger block" id="spDelete">Eliminar espècie personalitzada</button>` : ''}
    </div>
  `, el => {
    $('#spUnlock', el)?.addEventListener('click', () => {
      const before = earnedBadges(computeStats(derive())).map(b => b.id);
      store.put('unlocks', id, { date: today() });
      if (D.bucket.has(id)) store.remove('bucket', id);
      const newB = earnedBadges(computeStats(derive())).filter(b => !before.includes(b.id));
      speciesSheet(id, { justUnlocked: true });
      toast(`✨ <b>${esc(sp.n)}</b> desbloquejat!${newB.length ? ` · Nova insígnia: ${newB.map(b => b.icon + ' ' + esc(b.name)).join(', ')}` : ''}`);
    });
    $('#spWish', el).addEventListener('click', () => {
      if (wish) store.remove('bucket', id); else store.put('bucket', id, { date: today() });
      speciesSheet(id);
    });
    $('#spRelock', el)?.addEventListener('click', () => { store.remove('unlocks', id); speciesSheet(id); });
    confirmBtn($('#spDelete', el), () => { store.remove('species', id); closeSheet(); toast('Espècie eliminada'); });
  });
}

// Botó amb confirmació de doble toc (evita diàlegs natius)
function confirmBtn(btn, action) {
  if (!btn) return;
  let armed = false, t;
  const label = btn.innerHTML;
  btn.addEventListener('click', () => {
    if (armed) { clearTimeout(t); action(); return; }
    armed = true; btn.innerHTML = 'Toca de nou per confirmar';
    t = setTimeout(() => { armed = false; btn.innerHTML = label; }, 3000);
  });
}

// ── Espècie personalitzada ───────────────────────────────────
function speciesForm() {
  openSheet(`
    <h2>Nova espècie</h2>
    <form class="form" id="spForm" novalidate>
      <div class="grid2" style="grid-template-columns:90px 1fr">
        <div class="field"><label>Icona</label><input name="e" value="🐟" maxlength="4" style="text-align:center;font-size:1.6rem"></div>
        <div class="field"><label>Nom <span class="req">*</span></label><input name="n" required placeholder="Ex: Peix ballesta"></div>
      </div>
      <div class="field"><label>Nom científic</label><input name="s" placeholder="Opcional"></div>
      <div class="field"><label>Raresa</label><select name="r">${RARITIES.map(r => `<option value="${r.id}">${r.icon} ${r.name}</option>`).join('')}</select></div>
      <div class="field"><label>Hàbitat</label><input name="hab" placeholder="On viu?"></div>
      <div class="grid2"><div class="field"><label>Mida</label><input name="mida"></div><div class="field"><label>Profunditat</label><input name="prof"></div></div>
      <div class="field"><label>Curiositats (una per línia)</label><textarea name="f"></textarea></div>
      <div class="form-err" id="spErr"></div>
      <button class="btn primary block" type="submit">Afegir al Marine-Dex</button>
    </form>`, el => {
    $('#spForm', el).addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const n = fd.get('n').trim();
      if (!n) { $('#spErr').textContent = 'Posa un nom a l\'espècie.'; e.target.n.classList.add('invalid'); return; }
      const id = 'c-' + uid();
      store.put('species', id, { n, e: fd.get('e').trim() || '🐟', s: fd.get('s').trim(), r: +fd.get('r'), hab: fd.get('hab').trim(),
        mida: fd.get('mida').trim(), prof: fd.get('prof').trim(), f: fd.get('f').split('\n').map(x => x.trim()).filter(Boolean), reg: [], createdAt: Date.now() });
      speciesSheet(id);
      toast('Espècie afegida al Dex');
    });
  });
}

// ═══════════════ VISTA: BITÀCOLA ═══════════════
function renderLog(D) {
  const v = $('#v-log');
  if (!D.dives.length) {
    v.innerHTML = `<h1 style="margin:4px 2px 16px">Quadern de bitàcola</h1>
      <div class="empty"><span class="big">📓</span>Encara no hi ha cap immersió.<br><br><button class="btn primary" data-new-dive>＋ Nova immersió</button></div>`;
    return;
  }
  const st = computeStats(D);
  const byYear = {};
  D.dives.slice().reverse().forEach(d => (byYear[(d.date || '????').slice(0, 4)] ??= []).push(d));
  v.innerHTML = `
    <h1 style="margin:4px 2px 4px">Quadern de bitàcola</h1>
    <p class="muted small" style="margin:0 2px 8px">${st.dives} immersions · ${fmtHours(st.minutes)} sota l'aigua · màx ${fmtNum(st.maxDepth)} m</p>
    ${Object.entries(byYear).sort((a, b) => b[0].localeCompare(a[0])).map(([y, ds]) => `<div class="year">${y} · ${ds.length}</div>${ds.map(d => diveRow(d, D)).join('')}`).join('')}
  `;
}

// ── Detall d'immersió ────────────────────────────────────────
function diveSheet(id) {
  const D = derive();
  const d = store.get('dives', id); if (!d) return;
  const sps = (d.species || []).map(x => D.spMap[x]).filter(Boolean);
  const tags = (d.tags || []).map(t => DIVE_TAGS.find(x => x.id === t)).filter(Boolean);
  openSheet(`
    <div class="dive-hero">
      <div class="kicker">Immersió #${D.diveNo.get(id)} · ${fmtDate(d.date)}</div>
      <h2>${esc(d.site || 'Sense nom')}</h2>
      <div class="muted">${flag(d.country)} ${esc(cName(d.country))}${d.sea ? ' · ' + esc(SEAS[d.sea] || '') : ''}</div>
      <div class="dive-stats">
        <div><b>${fmtNum(d.depth)}</b><small>m màx</small></div>
        <div><b>${fmtNum(d.time)}</b><small>min fons</small></div>
        <div><b>${fmtNum(d.temp)}</b><small>°C aigua</small></div>
      </div>
    </div>
    <div class="facts-grid">
      <div class="fact"><small>Vestit</small><span>${esc(d.suit || '—')}</span></div>
      <div class="fact"><small>Ploms</small><span>${d.weights != null ? fmtNum(d.weights) + ' kg' : '—'}</span></div>
      ${tags.length ? `<div class="fact wide"><small>Tipus</small><span>${tags.map(t => t.icon + ' ' + t.label).join(' · ')}</span></div>` : ''}
    </div>
    <h3 style="margin:4px 0 10px">Animals vistos (${sps.length})</h3>
    ${sps.length ? `<div class="dex-grid">${sps.map(s => spCard(s, D)).join('')}</div>` : '<p class="muted">Cap animal registrat.</p>'}
    ${d.notes ? `<h3 style="margin:20px 0 10px">Notes</h3><div class="card notes">${esc(d.notes)}</div>` : ''}
    <div class="actions btn-row" style="display:flex">
      <button class="btn" id="dvEdit">✏️ Editar</button>
      <button class="btn danger" id="dvDel">🗑️ Eliminar</button>
    </div>
  `, el => {
    $('#dvEdit', el).addEventListener('click', () => diveForm(id));
    confirmBtn($('#dvDel', el), () => { store.remove('dives', id); closeSheet(); toast('Immersió eliminada'); });
  });
}

// ── Formulari d'immersió ─────────────────────────────────────
function diveForm(id) {
  const D = derive();
  const old = id ? store.get('dives', id) : null;
  const prev = D.dives[D.dives.length - 1] || {};
  const v = old || { date: today(), country: prev.country || '', sea: prev.sea || '', site: '', time: '', depth: '', temp: '',
    suit: prev.suit || '', weights: prev.weights ?? '', tags: [], species: [], notes: '' };
  const sel = new Set(v.species || []);
  const tags = new Set(v.tags || []);
  const recentC = [...new Set(D.dives.slice().reverse().map(d => d.country).filter(Boolean))].slice(0, 6);
  const sites = [...new Set(D.dives.map(d => d.site).filter(Boolean))];
  const opt = (val, label, cur) => `<option value="${esc(val)}" ${val === cur ? 'selected' : ''}>${esc(label)}</option>`;
  const nOrEmpty = x => x == null ? '' : String(x).replace('.', ',');

  openSheet(`
    <h2>${old ? 'Editar immersió' : 'Nova immersió 🤿'}</h2>
    <form class="form" id="diveF" novalidate>
      <div class="field"><label>Data <span class="req">*</span></label><input type="date" name="date" value="${esc(v.date)}" required></div>
      <div class="field"><label>País <span class="req">*</span></label>
        <select name="country" required><option value="">Tria el país…</option>
          ${recentC.length ? `<optgroup label="Recents">${recentC.map(c => opt(c, flag(c) + ' ' + cName(c), v.country)).join('')}</optgroup>` : ''}
          <optgroup label="Tots els països">${COUNTRIES_SORTED.filter(c => !recentC.includes(c[0])).map(c => opt(c[0], flag(c[0]) + ' ' + c[2], v.country)).join('')}</optgroup>
        </select></div>
      <div class="field"><label>Punt d'immersió <span class="req">*</span></label>
        <input name="site" value="${esc(v.site)}" placeholder="Ex: Illes Medes – La Vaca" list="sitesList" autocomplete="off">
        <datalist id="sitesList">${sites.map(s => `<option value="${esc(s)}">`).join('')}</datalist></div>
      <div class="field"><label>Mar / regió</label>
        <select name="sea"><option value="">—</option>${Object.entries(SEAS).map(([k, l]) => opt(k, l, v.sea)).join('')}</select></div>
      <div class="grid3">
        <div class="field"><label>Temps fons <span class="req">*</span></label><div class="unit"><input name="time" inputmode="numeric" value="${nOrEmpty(v.time)}" placeholder="45"><em>min</em></div></div>
        <div class="field"><label>Prof. màx <span class="req">*</span></label><div class="unit"><input name="depth" inputmode="decimal" value="${nOrEmpty(v.depth)}" placeholder="18"><em>m</em></div></div>
        <div class="field"><label>Temp. aigua</label><div class="unit"><input name="temp" inputmode="decimal" value="${nOrEmpty(v.temp)}" placeholder="22"><em>°C</em></div></div>
      </div>
      <div class="grid2">
        <div class="field"><label>Vestit</label><select name="suit"><option value="">—</option>${SUITS.map(s => opt(s, s, v.suit)).join('')}</select></div>
        <div class="field"><label>Ploms</label><div class="unit"><input name="weights" inputmode="decimal" value="${nOrEmpty(v.weights)}" placeholder="6"><em>kg</em></div></div>
      </div>
      <div class="field"><span class="lbl">Tipus d'immersió</span>
        <div class="tag-toggle" id="tagT">${DIVE_TAGS.map(t => `<button type="button" data-t="${t.id}" class="${tags.has(t.id) ? 'on' : ''}">${t.icon} ${t.label}</button>`).join('')}</div></div>

      <div class="fieldset">
        <div class="lbl"><span>🐠 Animals vistos</span><span class="selected-line" id="selLine"></span></div>
        <div class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="pickQ" type="search" placeholder="Busca…" autocomplete="off"></div>
        <div class="picker" id="picker"></div>
      </div>

      <div class="field"><label>Notes</label><textarea name="notes" placeholder="Corrent, visibilitat, companys, anècdotes…">${esc(v.notes)}</textarea></div>
      <div class="form-err" id="dvErr"></div>
      <div class="sticky-save"><button class="btn primary block" type="submit">${old ? 'Guardar canvis' : 'Guardar immersió'}</button></div>
    </form>`, el => {
    const f = $('#diveF', el);
    let seaTouched = !!old;
    f.sea.addEventListener('change', () => { seaTouched = true; drawPicker(); });
    f.country.addEventListener('change', () => {
      if (!seaTouched || !f.sea.value) f.sea.value = COUNTRY_SEA[f.country.value] || '';
      drawPicker();
    });
    if (!f.sea.value && f.country.value) f.sea.value = COUNTRY_SEA[f.country.value] || '';

    $('#tagT', el).addEventListener('click', e => {
      const b = e.target.closest('[data-t]'); if (!b) return;
      tags.has(b.dataset.t) ? tags.delete(b.dataset.t) : tags.add(b.dataset.t);
      b.classList.toggle('on');
    });

    const pickQ = $('#pickQ', el);
    function drawPicker() {
      const q = norm(pickQ.value);
      const regs = SEA_REG[f.sea.value] || [];
      const all = D.species.map(s => D.spMap[s.id]).filter(s => !q || norm(s.n + ' ' + s.s).includes(q));
      const local = regs.length ? all.filter(s => (s.reg || []).some(r => regs.includes(r))) : [];
      const rest = all.filter(s => !local.includes(s));
      const btn = s => `<button type="button" class="pick ${sel.has(s.id) ? 'on' : ''}" data-pick="${esc(s.id)}">
        ${!D.seen[s.id] ? '<span class="nw">NOU</span>' : ''}<span class="e">${esc(s.e)}</span>${esc(s.n)}</button>`;
      $('#picker', el).innerHTML =
        (local.length ? `<div class="pick-sep">Típics de ${esc(SEAS[f.sea.value])}</div>${local.map(btn).join('')}<div class="pick-sep">Altres</div>` : '')
        + rest.map(btn).join('') || '<p class="muted small" style="grid-column:1/-1">Cap resultat. Pots afegir espècies noves des del Dex.</p>';
      $('#selLine', el).textContent = sel.size ? `${sel.size} seleccionat${sel.size > 1 ? 's' : ''}` : '';
    }
    pickQ.addEventListener('input', drawPicker);
    $('#picker', el).addEventListener('click', e => {
      const b = e.target.closest('[data-pick]'); if (!b) return;
      const sid = b.dataset.pick;
      sel.has(sid) ? sel.delete(sid) : sel.add(sid);
      b.classList.toggle('on');
      $('#selLine', el).textContent = sel.size ? `${sel.size} seleccionat${sel.size > 1 ? 's' : ''}` : '';
    });
    drawPicker();

    f.addEventListener('submit', e => {
      e.preventDefault();
      $$('.invalid', f).forEach(x => x.classList.remove('invalid'));
      const req = ['date', 'country', 'site', 'time', 'depth'].filter(k => !String(f[k].value).trim() || (['time', 'depth'].includes(k) && num(f[k].value) == null));
      if (req.length) { req.forEach(k => f[k].classList.add('invalid')); $('#dvErr').textContent = 'Omple els camps obligatoris marcats en vermell.'; f[req[0]].focus(); return; }

      const D0 = derive();
      const beforeSeen = new Set(Object.keys(D0.seen));
      const beforeBadges = earnedBadges(computeStats(D0)).map(b => b.id);

      const rec = {
        date: f.date.value, country: f.country.value, sea: f.sea.value, site: f.site.value.trim(),
        time: num(f.time.value), depth: num(f.depth.value), temp: num(f.temp.value),
        suit: f.suit.value, weights: num(f.weights.value), tags: [...tags], species: [...sel],
        notes: f.notes.value.trim(), createdAt: old?.createdAt || Date.now(),
      };
      const did = id || uid();
      store.put('dives', did, rec);
      // Si eren a la llista de desitjos, ja s'han complert
      rec.species.forEach(s => { if (D0.bucket.has(s)) store.remove('bucket', s); });

      const D1 = derive();
      const newSp = Object.keys(D1.seen).filter(x => !beforeSeen.has(x)).map(x => D1.spMap[x]).filter(Boolean).sort((a, b) => b.r - a.r);
      const newB = earnedBadges(computeStats(D1)).filter(b => !beforeBadges.includes(b.id));
      if (newSp.length || newB.length) celebrate(newSp, newB, D1);
      else { closeSheet(); toast(old ? 'Canvis guardats ✅' : 'Immersió guardada ✅'); }
    });
  });
}

// ── Celebració de desbloquejos ───────────────────────────────
function celebrate(sps, badges, D) {
  const best = sps.reduce((m, s) => Math.max(m, s.r), -1);
  openSheet(`
    <div class="celebrate">
      <div class="burst">${best === 3 ? '👑' : best === 2 ? '✨' : sps.length ? '🎉' : '🏅'}</div>
      <h2 style="margin:6px 0 4px">${sps.length ? `${sps.length === 1 ? 'Nova espècie desbloquejada!' : sps.length + ' espècies noves!'}` : 'Nova insígnia!'}</h2>
      <p class="muted" style="margin:0">Immersió guardada al quadern.</p>
      ${sps.length ? `<div class="unlock-list">${sps.map((s, i) => spCard(s, D).replace('class="sp-card', `style="animation-delay:${i * .12}s" class="sp-card`)).join('')}</div>` : ''}
      ${badges.map(b => `<div class="badge-new"><div class="medal">${b.icon}</div><div><b>${esc(b.name)}</b><br><span class="muted small">${esc(b.desc)}</span></div></div>`).join('')}
      <div class="actions"><button class="btn primary block" data-close>Genial! 🙌</button></div>
    </div>`);
}

// ═══════════════ VISTA: MAPA + INSÍGNIES ═══════════════
let map, geoLayer, pinLayer, mapLoading = false;
async function initMap() {
  if (map) { setTimeout(() => map.invalidateSize(), 60); return; }
  if (mapLoading || !window.L) return;
  mapLoading = true;
  const el = $('#map');
  map = L.map(el, { zoomControl: false, attributionControl: false, minZoom: 0.5, maxZoom: 8, zoomSnap: 0.25, worldCopyJump: false,
    maxBounds: [[-75, -220], [85, 220]], maxBoundsViscosity: .8 });
  L.control.zoom({ position: 'topright' }).addTo(map);
  map.fitBounds([[-50, -165], [72, 180]]);
  try {
    const topo = await fetch('data/world-50m.json').then(r => r.json());
    const fc = topojson.feature(topo, topo.objects.countries);
    fc.features.forEach(f => unwrapAntimeridian(f.geometry));
    geoLayer = L.geoJSON(fc, {
      style: () => ({}),
      onEachFeature: (feat, layer) => layer.on('click', e => countryPopup(NUM2A2[feat.id], e.latlng, feat.properties?.name)),
    }).addTo(map);
  } catch (e) { console.warn('No es pot carregar el mapa', e); }
  pinLayer = L.layerGroup().addTo(map);
  mapLoading = false;
  updateMap(derive());
}

// Evita les línies horitzontals dels països que creuen el meridià 180 (Rússia, Fiji…)
function unwrapAntimeridian(g) {
  if (!g) return;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  for (const poly of polys) for (const ring of poly) {
    for (let i = 1; i < ring.length; i++) {
      const d = ring[i][0] - ring[i - 1][0];
      if (d > 180) ring[i][0] -= 360; else if (d < -180) ring[i][0] += 360;
    }
  }
}

function countryAgg(D) {
  const agg = {};
  for (const d of D.dives) {
    if (!d.country) continue;
    const a = agg[d.country] ??= { dives: [], sites: new Set(), species: new Set() };
    a.dives.push(d); if (d.site) a.sites.add(d.site);
    (d.species || []).forEach(s => a.species.add(s));
  }
  return agg;
}

function updateMap(D) {
  if (!map || !pinLayer) return;
  const agg = countryAgg(D);
  geoLayer?.eachLayer(l => {
    const on = !!agg[NUM2A2[l.feature.id]];
    l.setStyle(on ? { fillColor: '#ff7a59', fillOpacity: .92, color: '#ffd9c9', weight: 1.2 }
      : { fillColor: '#16405f', fillOpacity: 1, color: '#2a5d80', weight: .6 });
    l.getElement?.()?.classList.toggle('visited', on);
    if (on) l.bringToFront();
  });
  pinLayer.clearLayers();
  for (const [a2, a] of Object.entries(agg)) {
    const c = COUNTRY[a2]; if (!c || c.lat == null) continue;
    L.marker([c.lat, c.lng], { icon: L.divIcon({ className: '', html: `<div class="pin"><b>${a.dives.length}</b></div>`, iconSize: [22, 22], iconAnchor: [11, 31], popupAnchor: [0, -30] }) })
      .on('click', () => countryPopup(a2, [c.lat, c.lng]))
      .addTo(pinLayer);
  }
}

function countryPopup(a2, latlng, fallbackName) {
  const D = derive();
  const a = countryAgg(D)[a2];
  const div = document.createElement('div');
  if (!a) {
    div.innerHTML = `<h3>${flag(a2)} ${esc(a2 ? cName(a2) : fallbackName || '')}</h3><div class="muted">Encara no hi heu bussejat. 🌊</div>`;
  } else {
    const emos = [...a.species].map(s => D.spMap[s]?.e).filter(Boolean);
    div.innerHTML = `<h3>${flag(a2)} ${esc(cName(a2))}</h3>
      <div><b>${a.dives.length}</b> ${a.dives.length === 1 ? 'immersió' : 'immersions'} · <b>${a.sites.size}</b> ${a.sites.size === 1 ? 'punt' : 'punts'}</div>
      <div class="muted small">${[...a.sites].slice(0, 4).map(esc).join(' · ')}${a.sites.size > 4 ? '…' : ''}</div>
      ${emos.length ? `<div class="pop-emos">${emos.slice(0, 14).join('')}</div><div class="muted small">${a.species.size} ${a.species.size === 1 ? 'animal descobert' : 'animals descoberts'}</div>` : ''}
      <a href="#" class="pop-btn">Veure immersions →</a>`;
    div.querySelector('.pop-btn').addEventListener('click', ev => { ev.preventDefault(); countryDivesSheet(a2); });
  }
  L.popup({ maxWidth: 260 }).setLatLng(latlng).setContent(div).openOn(map);
}

function countryDivesSheet(a2) {
  const D = derive();
  const ds = D.dives.filter(d => d.country === a2).reverse();
  const spIds = [...new Set(ds.flatMap(d => d.species || []))].filter(id => D.spMap[id]);
  openSheet(`<h2>${flag(a2)} ${esc(cName(a2))}</h2>
    <p class="muted" style="margin-top:-6px">${ds.length} immersions · ${spIds.length} animals</p>
    ${spIds.length ? `<div class="hscroll" style="margin-bottom:14px">${spIds.map(id => spCard(D.spMap[id], D, { compact: true })).join('')}</div>` : ''}
    ${ds.map(d => diveRow(d, D)).join('')}`);
}

function renderMapBelow(D) {
  const st = computeStats(D);
  const earned = new Set(earnedBadges(st).map(b => b.id));
  const agg = countryAgg(D);
  const entries = Object.entries(agg).sort((a, b) => b[1].dives.length - a[1].dives.length);
  $('#map-below').innerHTML = `
    <div class="section-title"><h2>Països bussejats <span class="muted small">${entries.length}</span></h2></div>
    ${entries.length ? `<div class="country-chips">${entries.map(([a2, a]) => `<button class="cchip" data-country="${a2}" type="button">${flag(a2)} ${esc(cName(a2))}<b>${a.dives.length}</b></button>`).join('')}</div>`
      : '<div class="empty"><span class="big">🗺️</span>Cada país on registreu una immersió s\'il·luminarà al mapa.</div>'}
    <div class="section-title" id="badges-anchor"><h2>Insígnies <span class="muted small">${earned.size}/${BADGES.length}</span></h2></div>
    <div class="badges">${BADGES.map(b => medal(b, earned.has(b.id))).join('')}</div>
  `;
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-country]'); if (!c || !map) return;
  const k = COUNTRY[c.dataset.country]; if (!k || k.lat == null) return;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  map.flyTo([k.lat, k.lng], 4, { duration: .8 });
  setTimeout(() => countryPopup(k.a2, [k.lat, k.lng]), 850);
});

// ═══════════════ AJUSTOS ═══════════════
let installPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; });

function parseFirebaseConfig(text) {
  const out = {};
  for (const m of String(text).matchAll(/["']?(\w+)["']?\s*:\s*["']([^"']*)["']/g)) out[m[1]] = m[2];
  return out.projectId && out.apiKey ? out : null;
}

function settingsSheet() {
  const cfg = store.getConfig();
  const st = store.status;
  const color = { online: 'var(--ok)', offline: 'var(--warn)', connecting: 'var(--warn)', error: 'var(--danger)', local: 'var(--faint)' }[st];
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  openSheet(`
    <h2>Ajustos</h2>
    <div class="status-box"><span class="dotbig" style="background:${color}"></span><div>
      <b>${syncLabel()}</b><br>
      <span class="muted small">${cfg ? `Projecte: <span class="mono">${esc(cfg.firebase.projectId)}</span> · Quadern: <span class="mono">${esc(cfg.book)}</span>` : 'Les dades només es guarden en aquest mòbil.'}
      ${store.pending ? `<br>${store.pending} canvis ${cfg ? 'pendents de pujar.' : 'es pujaran quan activis la sincronització.'}` : ''}${store.error ? `<br><span style="color:var(--danger)">${esc(store.error)}</span>` : ''}</span>
    </div></div>

    <hr class="sep">
    <h3 style="margin-bottom:8px">☁️ Sincronització entre mòbils</h3>
    <p class="help">Enganxa aquí l'objecte <code>firebaseConfig</code> del teu projecte Firebase i un codi de quadern (el mateix als dos mòbils). Si ja l'has posat a <code>js/config.js</code>, no cal.</p>
    <form class="form" id="cfgF">
      <div class="field"><label>firebaseConfig</label><textarea name="fb" class="mono" placeholder='apiKey: "AIza…", projectId: "…", appId: "…"'>${cfg ? esc(Object.entries(cfg.firebase).map(([k, v]) => `${k}: "${v}"`).join(',\n')) : ''}</textarea></div>
      <div class="field"><label>Codi del quadern (secret compartit)</label><input name="book" value="${esc(cfg?.book || '')}" placeholder="ex: blau-coral-7f3k9q2x" autocomplete="off"></div>
      <div class="form-err" id="cfgErr"></div>
      <div class="btn-row"><button class="btn aqua" type="submit">Guardar i connectar</button>${cfg ? '<button class="btn ghost" type="button" id="cfgOff">Desconnectar</button>' : ''}</div>
    </form>

    <hr class="sep">
    <h3 style="margin-bottom:8px">💾 Còpia de seguretat</h3>
    <p class="help">Descarrega totes les dades en un fitxer JSON o recupera'n una còpia.</p>
    <div class="btn-row"><button class="btn" id="expBtn">⬇️ Exportar</button><label class="btn" style="cursor:pointer">⬆️ Importar<input type="file" accept="application/json,.json" id="impIn" hidden></label></div>

    <hr class="sep">
    <h3 style="margin-bottom:8px">📲 Instal·lar com a app</h3>
    ${standalone ? '<p class="help">✅ Ja l\'estàs fent servir com a app.</p>' : `
      ${installPrompt ? '<button class="btn primary block" id="instBtn">Instal·lar Marine-Dex</button>' : ''}
      <div class="help"><ol>
        <li><b>iPhone (Safari):</b> botó Compartir ⬆️ → «Afegeix a la pantalla d'inici».</li>
        <li><b>Android (Chrome):</b> menú ⋮ → «Instal·lar aplicació» o «Afegeix a la pantalla d'inici».</li>
      </ol>Obre-la un cop amb connexió perquè es guardi per funcionar offline.</div>`}
    <p class="help" style="text-align:center;margin-top:24px">Marine-Dex v${APP_VERSION} · ${navigator.onLine ? 'amb connexió' : 'sense connexió'}</p>
  `, el => {
    $('#cfgF', el).addEventListener('submit', e => {
      e.preventDefault();
      const fbc = parseFirebaseConfig(e.target.fb.value);
      const book = e.target.book.value.trim().replace(/[^\w-]/g, '');
      if (!fbc) { $('#cfgErr').textContent = 'No reconec la configuració: ha d\'incloure com a mínim apiKey i projectId.'; return; }
      if (book.length < 6) { $('#cfgErr').textContent = 'El codi del quadern ha de tenir com a mínim 6 caràcters (lletres, números o guions).'; return; }
      store.setConfig({ firebase: fbc, book });
      toast('Connectant amb Firebase…');
      setTimeout(settingsSheet, 1500);
    });
    $('#cfgOff', el)?.addEventListener('click', () => { store.setConfig(null); settingsSheet(); toast('Mode local'); });
    $('#expBtn', el).addEventListener('click', () => {
      const blob = new Blob([store.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `marine-dex-${today()}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
    $('#impIn', el).addEventListener('change', async e => {
      const file = e.target.files[0]; if (!file) return;
      try { const n = store.importJSON(await file.text()); toast(`Importats ${n} registres ✅`); }
      catch { toast('⚠️ El fitxer no és vàlid'); }
    });
    $('#instBtn', el)?.addEventListener('click', async () => { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; settingsSheet(); });
  });
}
$('#settingsBtn').addEventListener('click', settingsSheet);
$('#syncPill').addEventListener('click', settingsSheet);

function syncLabel() {
  const p = store.pending;
  switch (store.status) {
    case 'online': return p ? `Sincronitzant · ${p}` : 'Sincronitzat';
    case 'connecting': return p ? `Connectant · ${p} pendents` : 'Connectant…';
    case 'offline': return p ? `Offline · ${p} pendents` : 'Offline';
    case 'error': return 'Error de sync';
    default: return 'Mode local';
  }
}
function renderSyncPill() {
  const el = $('#syncPill');
  el.className = 'sync-pill ' + store.status;
  el.innerHTML = `<i></i>${esc(syncLabel())}`;
}

// ═══════════════ ROUTER ═══════════════
const VIEWS = ['home', 'dex', 'map', 'log'];
let current = 'home';
function route() {
  const h = location.hash.slice(1);
  current = VIEWS.includes(h) ? h : 'home';
  VIEWS.forEach(v => { $(`#v-${v}`).hidden = v !== current; });
  $$('.tabbar [data-tab]').forEach(a => a.classList.toggle('on', a.dataset.tab === current));
  render();
  if (current === 'map') initMap();
  window.scrollTo(0, 0);
}

function render() {
  const D = derive();
  if (current === 'home') renderHome(D);
  if (current === 'dex') renderDex(D);
  if (current === 'log') renderLog(D);
  if (current === 'map') { renderMapBelow(D); updateMap(D); }
  renderSyncPill();
}

$('#fab').addEventListener('click', () => diveForm());
window.addEventListener('hashchange', route);
store.subscribe(render);
route();
startSync();
