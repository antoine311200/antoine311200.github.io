/**
 * Persistence for Paper Radar.
 *
 * Everything lives under one versioned localStorage key so that export / import /
 * reset are a single operation. Writes are debounced by the provider, never here.
 */

import { idbGet, idbSet, idbClear, idbAvailable, storageEstimate } from './idb';

export const STORAGE_KEY = 'paper-radar:v1';
export const SCHEMA_VERSION = 2;

export const DEFAULT_SETTINGS = {
    maxResultsPerTopic: 60,
    lookbackDays: 7,          // how far back a first fetch reaches
    source: 'openalex',       // 'openalex' | 'arxiv' — see openalex.js for why
    openAlexMailto: '',       // optional: OpenAlex "polite pool", never auto-filled
    proxy: 'auto',            // arXiv source only: 'auto' | strategy id | 'direct'
    autoFetchOnOpen: true,
    enrich: false,            // Semantic Scholar lookups
    pdfInline: false,       // open a paper straight on its PDF instead of the overview
    density: 'comfortable',   // 'comfortable' | 'compact'
    scoreThreshold: 0,        // hide digest items scoring below this
    recencyHalfLife: 10,      // days
};

export const emptyStore = () => ({
    version: SCHEMA_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    topics: [],
    papers: {},
    states: {},
    authors: {},
    folders: [],
    feedback: { terms: {} },
    history: [],
    lastVisit: null,
});

/** Topics offered on a fresh install so the app is useful on first click. */
export const STARTER_TOPICS = [
    {
        name: 'Optimal Transport',
        color: '#fb923c',
        terms: [
            'optimal transport', 'wasserstein', 'sinkhorn',
            'schrodinger bridge', 'gromov-wasserstein', 'entropic regularization',
        ],
        categories: ['math.OC', 'math.PR', 'stat.ML', 'cs.LG'],
    },
    {
        name: 'Diffusion & Generative Models',
        color: '#a78bfa',
        terms: [
            'diffusion model', 'score-based generative', 'denoising diffusion',
            'flow matching', 'stochastic interpolant', 'score matching',
        ],
        categories: ['cs.LG', 'stat.ML'],
    },
    {
        name: 'Stochastic Analysis & SDEs',
        color: '#34d399',
        terms: [
            'stochastic differential equation', 'neural sde', 'rough path',
            'signature kernel', 'mckean-vlasov', 'backward stochastic differential',
            'stochastic control',
        ],
        categories: ['math.PR', 'math.OC', 'stat.ML', 'cs.LG'],
    },
    {
        name: 'Mathematical Finance',
        color: '#38bdf8',
        terms: [
            'option pricing', 'stochastic volatility', 'rough volatility',
            'deep hedging', 'limit order book', 'market making',
            'portfolio optimization', 'calibration',
        ],
        categories: ['q-fin.MF', 'q-fin.PR', 'q-fin.CP', 'q-fin.TR', 'q-fin.RM', 'q-fin.PM'],
    },
];

export function makeTopic(partial = {}) {
    return {
        id: `t_${Math.random().toString(36).slice(2, 10)}`,
        name: 'New topic',
        color: '#fb923c',
        terms: [],
        exclude: [],
        categories: [],
        authors: [],
        fields: 'title_abstract',   // 'title' | 'title_abstract' | 'all'
        enabled: true,
        maxResults: null,           // null → fall back to global setting
        lastFetch: null,
        newCount: 0,
        ...partial,
    };
}

export const emptyState = () => ({
    status: 'unread',   // unread | queued | reading | read | archived | dismissed
    starred: false,
    tags: [],
    note: '',
    rating: 0,
    readAt: null,
    queuedAt: null,
    updatedAt: null,
});

/** Authors are keyed on a normalised name so "Y. LeCun" and "Yann LeCun" stay apart
 *  but casing / punctuation / accents do not create duplicates. */
export function authorKey(name) {
    return (name || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

export function makeFolder(partial = {}) {
    return {
        id: `f_${Math.random().toString(36).slice(2, 10)}`,
        name: 'New folder',
        parentId: null,
        paperIds: [],
        description: '',
        color: null,
        createdAt: new Date().toISOString(),
        ...partial,
    };
}

function migrate(raw) {
    const store = { ...emptyStore(), ...raw };
    store.settings = { ...DEFAULT_SETTINGS, ...(raw.settings || {}) };
    store.topics = (raw.topics || []).map((t) => makeTopic(t));
    store.papers = raw.papers || {};
    store.states = raw.states || {};
    store.authors = raw.authors || {};
    // v1 kept a flat `collections` array; v2 turns them into a folder tree.
    const legacy = Array.isArray(raw.collections) ? raw.collections : [];
    store.folders = (raw.folders || legacy).map((f) => makeFolder(f));
    store.feedback = { terms: {}, ...(raw.feedback || {}) };
    store.history = raw.history || [];
    store.version = SCHEMA_VERSION;
    delete store.collections;
    return store;
}

/** Folder ids from the root down to `id`, for breadcrumbs. */
export function folderPath(folders, id) {
    const byId = new Map(folders.map((f) => [f.id, f]));
    const path = [];
    let cursor = byId.get(id);
    const guard = new Set();
    while (cursor && !guard.has(cursor.id)) {
        guard.add(cursor.id);
        path.unshift(cursor);
        cursor = cursor.parentId ? byId.get(cursor.parentId) : null;
    }
    return path;
}

/** `id` plus every folder nested beneath it (breadth-first, cycle-safe). */
export function folderSubtree(folders, id) {
    const childrenOf = new Map();
    folders.forEach((f) => {
        const key = f.parentId || '__root__';
        if (!childrenOf.has(key)) childrenOf.set(key, []);
        childrenOf.get(key).push(f.id);
    });

    const out = [];
    const seen = new Set();
    const queue = [id];
    while (queue.length) {
        const cur = queue.shift();
        if (seen.has(cur)) continue;
        seen.add(cur);
        out.push(cur);
        (childrenOf.get(cur) || []).forEach((c) => queue.push(c));
    }
    return out;
}

/** Papers in a folder, optionally including everything in its descendants. */
export function papersInFolder(folders, id, { recursive = true } = {}) {
    const ids = recursive ? folderSubtree(folders, id) : [id];
    const set = new Set();
    folders.forEach((f) => { if (ids.includes(f.id)) f.paperIds.forEach((p) => set.add(p)); });
    return set;
}

/** Reparenting must not create a cycle. */
export function canMoveFolder(folders, id, newParentId) {
    if (id === newParentId) return false;
    if (!newParentId) return true;
    return !folderSubtree(folders, id).includes(newParentId);
}

/** Synchronous localStorage read — the v1 location, kept for one-way migration. */
function loadLegacy() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

/**
 * Read the store, preferring IndexedDB and falling back to the old localStorage
 * copy (which is then migrated forward on the next save).
 */
export async function loadStore() {
    if (idbAvailable()) {
        try {
            const found = await idbGet();
            if (found) return migrate(found);
        } catch (err) {
            console.warn('[paper-radar] IndexedDB read failed, falling back', err);
        }
    }
    const legacy = loadLegacy();
    return legacy ? migrate(legacy) : null;
}

export async function saveStore(store) {
    if (idbAvailable()) {
        try {
            await idbSet(store);
            // The v1 copy is now redundant; drop it so it cannot shadow newer data.
            try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
            return { ok: true, backend: 'indexeddb' };
        } catch (err) {
            console.warn('[paper-radar] IndexedDB write failed, trying localStorage', err);
        }
    }
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
        return { ok: true, backend: 'localstorage' };
    } catch (err) {
        return { ok: false, error: err.message || String(err) };
    }
}

export async function clearStore() {
    if (idbAvailable()) { try { await idbClear(); } catch { /* ignore */ } }
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export function storeBytes(store) {
    try { return new Blob([JSON.stringify(store)]).size; } catch { return 0; }
}

export { storageEstimate };

/* ------------------------------------------------------------------ export */

export function download(filename, text, mime = 'application/json') {
    const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportStore(store) {
    const stamp = new Date().toISOString().slice(0, 10);
    download(`paper-radar-${stamp}.json`, JSON.stringify(
        { ...store, exportedAt: new Date().toISOString(), app: 'paper-radar' }, null, 2,
    ));
}

/**
 * Merge an imported store into the current one.
 * `mode: 'replace'` swaps everything; `'merge'` keeps local reading state as the
 * winner (it is the part you cannot recover) while adding unseen papers and topics.
 */
export function mergeStores(current, incoming, mode = 'merge') {
    const inc = migrate(incoming);
    if (mode === 'replace') return inc;

    const papers = { ...inc.papers };
    Object.entries(current.papers).forEach(([id, p]) => {
        const other = papers[id];
        papers[id] = other
            ? { ...other, ...p, topicIds: Array.from(new Set([...(other.topicIds || []), ...(p.topicIds || [])])) }
            : p;
    });

    const states = { ...inc.states };
    Object.entries(current.states).forEach(([id, s]) => {
        const other = states[id];
        if (!other) { states[id] = s; return; }
        // Newest write wins per paper; ties go to the local copy.
        states[id] = (other.updatedAt || 0) > (s.updatedAt || 0) ? other : s;
    });

    const topicNames = new Set(current.topics.map((t) => t.name.toLowerCase()));
    const topics = [...current.topics, ...inc.topics.filter((t) => !topicNames.has(t.name.toLowerCase()))];

    const folderNames = new Set(current.folders.map((c) => c.name.toLowerCase()));
    const folders = [
        ...current.folders,
        ...inc.folders.filter((c) => !folderNames.has(c.name.toLowerCase())),
    ];

    return {
        ...current,
        topics,
        papers,
        states,
        folders,
        authors: { ...inc.authors, ...current.authors },
        feedback: { terms: { ...inc.feedback.terms, ...current.feedback.terms } },
        history: [...inc.history, ...current.history],
    };
}

/** Drop dismissed papers and untouched unread papers older than `days`. */
export function prune(store, { days = 90, dropDismissed = true } = {}) {
    const cutoff = Date.now() - days * 864e5;
    const papers = {};
    const states = {};
    let removed = 0;

    Object.entries(store.papers).forEach(([id, p]) => {
        const st = store.states[id];
        const dismissed = st && st.status === 'dismissed';
        const touched = st && (st.starred || st.note || (st.tags || []).length
            || !['unread', 'dismissed'].includes(st.status));
        const stale = new Date(p.firstSeen || p.published).getTime() < cutoff;

        if ((dropDismissed && dismissed) || (stale && !touched)) { removed += 1; return; }
        papers[id] = p;
        if (st) states[id] = st;
    });

    return { store: { ...store, papers, states }, removed };
}
