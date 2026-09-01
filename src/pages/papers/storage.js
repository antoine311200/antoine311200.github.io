/**
 * Persistence for Paper Radar.
 *
 * Everything lives under one versioned localStorage key so that export / import /
 * reset are a single operation. Writes are debounced by the provider, never here.
 */

export const STORAGE_KEY = 'paper-radar:v1';
export const SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS = {
    maxResultsPerTopic: 60,
    lookbackDays: 7,          // how far back a first fetch reaches
    source: 'openalex',       // 'openalex' | 'arxiv' — see openalex.js for why
    openAlexMailto: '',       // optional: OpenAlex "polite pool", never auto-filled
    proxy: 'auto',            // arXiv source only: 'auto' | strategy id | 'direct'
    autoFetchOnOpen: true,
    enrich: false,            // Semantic Scholar lookups
    pdfInline: true,
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
    collections: [],
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

function migrate(raw) {
    const store = { ...emptyStore(), ...raw };
    store.settings = { ...DEFAULT_SETTINGS, ...(raw.settings || {}) };
    store.topics = (raw.topics || []).map((t) => makeTopic(t));
    store.papers = raw.papers || {};
    store.states = raw.states || {};
    store.authors = raw.authors || {};
    store.collections = raw.collections || [];
    store.feedback = { terms: {}, ...(raw.feedback || {}) };
    store.history = raw.history || [];
    store.version = SCHEMA_VERSION;
    return store;
}

export function loadStore() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return migrate(JSON.parse(raw));
    } catch (err) {
        console.error('[paper-radar] could not read store', err);
        return null;
    }
}

export function saveStore(store) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
        return { ok: true };
    } catch (err) {
        // Almost always QuotaExceededError — the caller surfaces this to the user.
        return { ok: false, error: err.message || String(err) };
    }
}

export function storeBytes(store) {
    try { return new Blob([JSON.stringify(store)]).size; } catch { return 0; }
}

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

    const collectionNames = new Set(current.collections.map((c) => c.name.toLowerCase()));
    const collections = [
        ...current.collections,
        ...inc.collections.filter((c) => !collectionNames.has(c.name.toLowerCase())),
    ];

    return {
        ...current,
        topics,
        papers,
        states,
        collections,
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
