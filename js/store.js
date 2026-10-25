// ─────────────────────────────────────────────────────────────
//  STORE OFFLINE-FIRST + SINCRONITZACIÓ AMB FIREBASE
//  · Tot es guarda primer al mòbil (localStorage) → funciona sense cobertura.
//  · Cada canvi entra a una cua de pendents.
//  · Quan hi ha connexió, la cua es puja a Firestore i es reben els canvis
//    de l'altre mòbil en temps real (l'última edició guanya).
// ─────────────────────────────────────────────────────────────
import { FIREBASE_CONFIG, LOGBOOK_ID, FIREBASE_VERSION } from './config.js';

const DATA_KEY = 'marinedex:data:v1';
const QUEUE_KEY = 'marinedex:queue:v1';
const CFG_KEY = 'marinedex:cfg:v1';
const DEVICE_KEY = 'marinedex:device';

export const COLLECTIONS = ['dives', 'unlocks', 'bucket', 'species'];

const read = (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn('No es pot guardar', e); } };

let data = read(DATA_KEY, {});
for (const c of COLLECTIONS) data[c] ??= {};
let queue = read(QUEUE_KEY, []);
const device = read(DEVICE_KEY, null) || (() => { const d = uid(); write(DEVICE_KEY, d); return d; })();

const listeners = new Set();
let fb = null;           // { db, doc, setDoc, collection, onSnapshot, book }
let unsubs = [];
let status = 'local';    // local | connecting | online | offline | error
let lastError = '';
let emitTimer = null;

export function uid() {
  if (crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

function persist() { write(DATA_KEY, data); write(QUEUE_KEY, queue); }
function emit() {
  clearTimeout(emitTimer);
  emitTimer = setTimeout(() => listeners.forEach(fn => fn()), 30);
}

// ── API pública ──────────────────────────────────────────────
export const store = {
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  list(col) { return Object.values(data[col] || {}).filter(r => !r._d); },
  get(col, id) { const r = data[col]?.[id]; return r && !r._d ? r : null; },
  put(col, id, obj) {
    const rec = clean({ ...obj, id, _u: Date.now(), _by: device });
    data[col][id] = rec;
    enqueue(col, id, rec);
    return rec;
  },
  remove(col, id) {
    const rec = { id, _d: true, _u: Date.now(), _by: device };
    data[col][id] = rec;
    enqueue(col, id, rec);
  },
  get pending() { return queue.length; },
  get status() { return status; },
  get error() { return lastError; },
  get syncConfigured() { return !!getConfig(); },
  getConfig,
  setConfig(cfg) { if (cfg) write(CFG_KEY, cfg); else localStorage.removeItem(CFG_KEY); restartSync(); },
  exportJSON() { return JSON.stringify({ app: 'marine-dex', version: 1, exportedAt: new Date().toISOString(), data }, null, 2); },
  importJSON(text) {
    const parsed = JSON.parse(text);
    const incoming = parsed.data || parsed;
    let n = 0;
    for (const c of COLLECTIONS) {
      for (const [id, rec] of Object.entries(incoming[c] || {})) {
        const local = data[c][id];
        if (!local || (rec._u || 0) > (local._u || 0)) { data[c][id] = rec; enqueue(c, id, rec, true); n++; }
      }
    }
    persist(); emit(); flush();
    return n;
  },
};

function clean(o) { return JSON.parse(JSON.stringify(o)); } // Firestore no accepta undefined

function enqueue(col, id, rec, silent) {
  queue = queue.filter(q => !(q.col === col && q.id === id));
  queue.push({ col, id, rec });
  if (!silent) { persist(); emit(); flush(); }
}

function getConfig() {
  const local = read(CFG_KEY, null);
  if (local?.firebase?.projectId) return local;
  if (FIREBASE_CONFIG?.projectId) return { firebase: FIREBASE_CONFIG, book: LOGBOOK_ID };
  return null;
}

function setStatus(s, err = '') { status = s; lastError = err; emit(); }

// ── Sincronització ───────────────────────────────────────────
let starting = false;
export async function startSync() {
  const cfg = getConfig();
  if (!cfg) { setStatus('local'); return; }
  if (fb || starting) { flush(); return; }
  if (!navigator.onLine) { setStatus('offline'); return; }
  starting = true;
  setStatus('connecting');
  try {
    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
    const appMod = await import(`${base}/firebase-app.js`);
    const fs = await import(`${base}/firebase-firestore.js`);
    const name = 'marinedex-' + cfg.firebase.projectId;
    const app = appMod.getApps().find(a => a.name === name) || appMod.initializeApp(cfg.firebase, name);
    const db = fs.getFirestore(app);
    if (cfg.emulator) { try { const [h, port] = cfg.emulator.split(':'); fs.connectFirestoreEmulator(db, h, +port); } catch {} } // només per proves
    fb = { db, doc: fs.doc, setDoc: fs.setDoc, collection: fs.collection, onSnapshot: fs.onSnapshot, book: cfg.book || 'default' };

    for (const col of COLLECTIONS) {
      const ref = fs.collection(db, 'books', fb.book, col);
      unsubs.push(fs.onSnapshot(ref, { includeMetadataChanges: true }, snap => {
        let changed = false;
        snap.docChanges().forEach(ch => {
          if (ch.type === 'removed') return;
          const r = ch.doc.data();
          const l = data[col][ch.doc.id];
          if (!l || (r._u || 0) > (l._u || 0)) { data[col][ch.doc.id] = r; changed = true; }
        });
        if (changed) persist();
        updateOnlineStatus(snap.metadata.fromCache);
        emit();
      }, err => { console.warn(err); setStatus('error', err.code === 'permission-denied' ? 'Permís denegat: revisa les regles i el codi secret.' : err.message); }));
    }
    flush();
  } catch (e) {
    console.warn('Sync no disponible', e);
    fb = null;
    setStatus(navigator.onLine ? 'error' : 'offline', navigator.onLine ? 'No s\'ha pogut connectar amb Firebase.' : '');
  } finally { starting = false; }
}

function updateOnlineStatus(fromCache) {
  if (status === 'error' && lastError.startsWith('Permís')) return;
  if (!navigator.onLine) status = 'offline';
  else status = fromCache ? 'connecting' : 'online';
}

const inflight = new Set();
function flush() {
  if (!fb || !navigator.onLine) return;
  for (const item of [...queue]) {
    const key = `${item.col}/${item.id}@${item.rec._u}`;
    if (inflight.has(key)) continue;
    inflight.add(key);
    fb.setDoc(fb.doc(fb.db, 'books', fb.book, item.col, item.id), item.rec)
      .then(() => {
        queue = queue.filter(q => !(q.col === item.col && q.id === item.id && q.rec._u === item.rec._u));
        persist(); emit();
      })
      .catch(err => {
        console.warn('Error pujant', err);
        if (err.code === 'permission-denied') setStatus('error', 'Permís denegat: revisa les regles i el codi secret.');
      })
      .finally(() => inflight.delete(key));
  }
}

function restartSync() {
  unsubs.forEach(u => u()); unsubs = []; fb = null;
  startSync();
}

window.addEventListener('online', () => { if (fb) { status = 'connecting'; emit(); flush(); } else startSync(); });
window.addEventListener('offline', () => { if (getConfig()) setStatus('offline'); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') flush(); });

// Demana al navegador que no esborri les dades locals
navigator.storage?.persist?.().catch(() => {});
