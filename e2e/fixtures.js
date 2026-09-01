/** Shared helpers: a seeded store, and a stubbed OpenAlex so fetches are deterministic. */

const STORE_DB = 'paper-radar';

function makeTopic(over = {}) {
    return {
        id: `t_${Math.random().toString(36).slice(2, 8)}`,
        name: 'Topic', color: '#fb923c', terms: ['optimal transport'], exclude: [],
        categories: [], authors: [], fields: 'title_abstract', enabled: true,
        maxResults: null, lastFetch: null, newCount: 0, ...over,
    };
}

function makePaper(i, over = {}) {
    const id = `2608.${String(10000 + i).slice(0, 5)}`;
    const day = new Date(Date.now() - (i % 4) * 864e5).toISOString();
    return {
        id, version: 1,
        title: `Paper number ${i} on optimal transport`,
        summary: `Abstract for paper ${i}. We prove a bound and run experiments on market data.`,
        authors: [{ name: i % 2 ? 'Ada Lovelace' : 'Alan Turing', affiliation: null },
                  { name: 'Emmy Noether', affiliation: null }],
        categories: [], primary: null, published: day, updated: day, firstSeen: day,
        topicIds: [], score: 50 - i, citations: i, reasons: [],
        doi: null, comment: null, journalRef: null, pdfUrl: `https://arxiv.org/pdf/${id}`,
        ...over,
    };
}

/** A complete v2 store. `papers` / `topics` / `folders` can be overridden. */
function makeStore(over = {}) {
    return {
        version: 2,
        settings: {
            maxResultsPerTopic: 60, lookbackDays: 7, source: 'openalex', openAlexMailto: '',
            proxy: 'auto', autoFetchOnOpen: false, enrich: false, pdfInline: false,
            density: 'comfortable', scoreThreshold: 0, recencyHalfLife: 10,
        },
        topics: [], papers: {}, states: {}, authors: {}, folders: [],
        feedback: { terms: {} }, history: [], lastVisit: null,
        ...over,
    };
}

/**
 * IndexedDB work has to happen on a page that is NOT running the app: the provider
 * holds its connection open for the page's lifetime (which blocks deleteDatabase)
 * and its debounced save would race whatever we write. The site root renders the
 * portfolio home, so PaperProvider never mounts there — that is our staging page.
 */
async function onQuietPage(page) {
    await page.goto('/#/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(150);
}

const putRecord = async (page, value) => page.evaluate(async (v) => {
    await new Promise((resolve, reject) => {
        const req = indexedDB.open('paper-radar', 1);
        req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains('store')) req.result.createObjectStore('store');
        };
        req.onsuccess = () => {
            const tx = req.result.transaction('store', 'readwrite');
            const os = tx.objectStore('store');
            if (v === null) os.delete('main'); else os.put(v, 'main');
            tx.oncomplete = () => { req.result.close(); resolve(); };
            tx.onerror = () => reject(tx.error);
        };
        req.onerror = () => reject(req.error);
    });
}, value);

/** Write a store into IndexedDB, then open the app so it hydrates from it. */
async function seed(page, store) {
    await onQuietPage(page);
    await putRecord(page, store);
    await page.goto('/#/paper-search', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Paper Radar');
    await page.waitForTimeout(250);      // let the async hydrate commit
}

/** Read the persisted store back, so tests can assert on what was actually saved. */
async function readStore(page) {
    // The app debounces saves by 400ms; give the last interaction time to land.
    await page.waitForTimeout(700);
    return page.evaluate(async () => new Promise((resolve, reject) => {
        const req = indexedDB.open('paper-radar', 1);
        req.onsuccess = () => {
            const tx = req.result.transaction('store', 'readonly');
            const get = tx.objectStore('store').get('main');
            get.onsuccess = () => { const r = get.result || null; req.result.close(); resolve(r); };
            get.onerror = () => reject(get.error);
        };
        req.onerror = () => reject(req.error);
    }));
}

/** Wipe both storage backends without deleting the database (which would block). */
async function clearStorage(page) {
    await onQuietPage(page);
    await page.evaluate(() => localStorage.clear());
    await putRecord(page, null);
}


/**
 * Serve a fixed OpenAlex payload. `works` is a list of {arxivId, title}.
 * Records how many times the API was called, so dedupe can be tested for real.
 */
async function stubOpenAlex(page, works) {
    const calls = { count: 0, urls: [] };
    await page.route('**/api.openalex.org/**', async (route) => {
        calls.count += 1;
        calls.urls.push(route.request().url());
        const results = works.map((w) => ({
            id: `https://openalex.org/W${w.arxivId.replace('.', '')}`,
            doi: `https://doi.org/10.48550/arxiv.${w.arxivId}`,
            title: w.title,
            publication_date: w.date || new Date().toISOString().slice(0, 10),
            abstract_inverted_index: { We: [0], study: [1], optimal: [2], transport: [3] },
            authorships: (w.authors || ['Ada Lovelace']).map((n) => ({
                author: { display_name: n }, institutions: [],
            })),
            cited_by_count: w.citations ?? 0,
            primary_location: { landing_page_url: `https://arxiv.org/abs/${w.arxivId}` },
            type: 'preprint',
        }));
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ meta: { count: results.length }, results }),
        });
    });
    return calls;
}

module.exports = {
    makeTopic, makePaper, makeStore, seed, readStore, clearStorage, stubOpenAlex, onQuietPage, putRecord,
};
