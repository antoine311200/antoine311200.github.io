/**
 * OpenAlex source for arXiv preprints.
 *
 * arXiv's own Atom API sends no `Access-Control-Allow-Origin` header, so a browser
 * on a static site can never call it directly, and the free CORS relays it used to
 * be routed through are unreliable (401s, timeouts, Cloudflare 522s).
 *
 * OpenAlex serves `Access-Control-Allow-Origin: *`, needs no key, indexes arXiv as a
 * source, and is current to the same day — so it works from the browser with no
 * relay at all. It also hands us citation counts for free.
 *
 * The one thing it cannot do is filter by arXiv category (cs.LG, q-fin.MF, …); it
 * does not carry them. Category constraints are reported back to the caller as
 * ignored rather than silently dropped.
 */

/** OpenAlex's source record for "arXiv (Cornell University)". */
const ARXIV_SOURCE = 's4306400194';
const API = 'https://api.openalex.org/works';

const FIELDS = [
    'id', 'doi', 'title', 'publication_date', 'abstract_inverted_index',
    'authorships', 'cited_by_count', 'primary_location', 'locations', 'type',
].join(',');

/* ------------------------------------------------------------- the wire */

/*
 * OpenAlex bills by the request: a free allowance of ~1000 a day per IP, reset
 * at midnight UTC, reported on every response in `x-ratelimit-*`. Spend it and
 * every call 429s for the rest of the day, with a `retry-after` measured in
 * hours — so retrying a 429 blindly is not resilience, it is a nine-hour loop
 * against a wall. Two rules follow:
 *
 *   - a short wait is a burst limit and is worth retrying;
 *   - a long one is the daily allowance, and the only honest thing to do is
 *     stop, say so, and say when it comes back.
 *
 * The queue is here for the same reason: requests are a budget to be spent
 * sparingly, not a resource to be hammered.
 */
const MAX_IN_FLIGHT = 2;
const MIN_GAP_MS = 120;
const BACKOFF_MS = [400, 1200, 3000];
const WORTH_RETRYING_MS = 20000;

let inFlight = 0;
let lastStart = 0;
const waiting = [];

/** What OpenAlex last told us about the day's allowance. */
const budget = { limit: null, remaining: null, resetAt: null, blockedUntil: 0 };

export function getBudget() {
    return { ...budget, blocked: Date.now() < budget.blockedUntil };
}

/** "8h 56m", "45s" — how long until it is worth asking again. */
export function humanWait(ms) {
    const total = Math.max(0, Math.round(ms / 1000));
    if (total < 90) return `${total}s`;
    const hours = Math.floor(total / 3600);
    const minutes = Math.round((total % 3600) / 60);
    return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

const sleep = (ms, signal) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
        if (signal) signal.removeEventListener('abort', onAbort);
        resolve();
    }, ms);
    function onAbort() {
        clearTimeout(timer);
        const err = new Error('aborted');
        err.name = 'AbortError';
        reject(err);
    }
    if (signal) {
        if (signal.aborted) { onAbort(); return; }
        signal.addEventListener('abort', onAbort, { once: true });
    }
});

function pump() {
    if (!waiting.length || inFlight >= MAX_IN_FLIGHT) return;
    const gap = Math.max(0, MIN_GAP_MS - (Date.now() - lastStart));
    setTimeout(() => {
        const next = waiting.shift();
        if (!next) return;
        inFlight += 1;
        lastStart = Date.now();
        next();
    }, gap);
}

/** Wait for a slot in the queue; resolves with the function that frees it. */
function slot() {
    return new Promise((resolve) => {
        waiting.push(() => resolve(() => { inFlight -= 1; pump(); }));
        pump();
    });
}

function readBudget(res) {
    const num = (name) => {
        const value = Number(res.headers.get(name));
        return Number.isFinite(value) && res.headers.get(name) !== null ? value : null;
    };
    const limit = num('x-ratelimit-limit');
    const remaining = num('x-ratelimit-remaining');
    const reset = num('x-ratelimit-reset');
    if (limit != null) budget.limit = limit;
    if (remaining != null) budget.remaining = remaining;
    if (reset != null) budget.resetAt = Date.now() + reset * 1000;
}

function spentError() {
    const left = budget.blockedUntil - Date.now();
    const when = budget.limit
        ? `OpenAlex's free allowance of ${budget.limit} requests a day is spent.`
        : 'OpenAlex has cut this connection off for the day.';
    return new Error(`${when} It resets at midnight UTC — in ${humanWait(left)}.`);
}

/** Milliseconds OpenAlex asked us to wait, from its own headers. */
function waitFrom(res, attempt) {
    const header = Number(res.headers.get('retry-after'));
    if (Number.isFinite(header) && header > 0) return header * 1000;
    const reset = Number(res.headers.get('x-ratelimit-reset'));
    if (Number.isFinite(reset) && reset > 0) return reset * 1000;
    return BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
}

/* Repeating a search should not cost a second request. */
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map();

/** One OpenAlex call: paced, cached, and honest about the day's allowance. */
async function apiFetch(params, { signal, mailto, cacheable = false } = {}) {
    // OpenAlex asks callers to identify themselves for its "polite pool". It
    // buys a steadier queue, not a bigger allowance, so it stays opt-in.
    if (mailto) params.set('mailto', mailto);
    const url = `${API}?${params.toString()}`;

    if (cacheable) {
        const hit = cache.get(url);
        if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.json;
    }

    for (let attempt = 0; ; attempt += 1) {
        // Nothing is gained by asking again before the allowance comes back.
        if (Date.now() < budget.blockedUntil) throw spentError();

        const release = await slot();
        let res;
        try {
            res = await fetch(url, { signal });
        } finally {
            release();
        }
        readBudget(res);

        if (res.status === 429 || res.status === 503) {
            const wait = waitFrom(res, attempt);
            if (wait > WORTH_RETRYING_MS || attempt >= BACKOFF_MS.length) {
                budget.blockedUntil = Date.now() + wait;
                throw spentError();
            }
            await sleep(wait, signal);
            continue;
        }

        if (!res.ok) throw new Error(`OpenAlex returned HTTP ${res.status}`);
        budget.blockedUntil = 0;
        const json = await res.json();
        if (cacheable) cache.set(url, { at: Date.now(), json });
        return json;
    }
}

/** OpenAlex stores abstracts as {word: [positions]}; put them back in order. */
export function reconstructAbstract(index) {
    if (!index) return '';
    const words = [];
    Object.entries(index).forEach(([word, positions]) => {
        (positions || []).forEach((p) => { words[p] = word; });
    });
    return words.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * "https://doi.org/10.48550/arxiv.2608.28262" -> "2608.28262".
 *
 * A paper that went on to be published has the journal as its primary location
 * and the preprint further down the `locations` list, so every location is
 * worth reading before giving up — otherwise the best-known papers in a field
 * are exactly the ones that look like they are not on arXiv.
 */
export function arxivIdFromWork(work) {
    const places = [
        work.doi,
        ...[work.primary_location, ...(work.locations || [])].filter(Boolean)
            .flatMap((l) => [l.landing_page_url, l.pdf_url]),
    ].filter(Boolean);

    for (let i = 0; i < places.length; i += 1) {
        const url = String(places[i]);
        const doi = url.match(/10\.48550\/arxiv\.(.+?)(?:v\d+)?$/i);
        if (doi) return doi[1];
        const abs = url.match(/arxiv\.org\/(?:abs|pdf)\/(.+?)(?:v\d+)?$/i);
        if (abs) return abs[1];
    }
    return null;
}

const phrase = (s) => `"${String(s).replace(/"/g, ' ').trim()}"`;

/**
 * Build the OpenAlex `filter` expression for a topic.
 * @returns {{ filter: string|null, ignoredCategories: string[] }}
 */
export function buildFilter(topic, { sinceDays = 30 } = {}) {
    const clauses = [`primary_location.source.id:${ARXIV_SOURCE}`];

    const terms = (topic.terms || []).map((t) => t.trim()).filter(Boolean);
    const excludes = (topic.exclude || []).map((t) => t.trim()).filter(Boolean);
    if (terms.length) {
        let search = terms.map(phrase).join(' OR ');
        excludes.forEach((e) => { search += ` NOT ${phrase(e)}`; });
        clauses.push(`title_and_abstract.search:${search}`);
    }

    const authors = (topic.authors || []).map((a) => a.trim()).filter(Boolean);
    if (authors.length) clauses.push(`raw_author_name.search:${authors.map(phrase).join(' OR ')}`);

    if (!terms.length && !authors.length) {
        return { filter: null, ignoredCategories: topic.categories || [] };
    }

    if (sinceDays) {
        const from = new Date(Date.now() - sinceDays * 864e5).toISOString().slice(0, 10);
        clauses.push(`from_publication_date:${from}`);
    }

    return { filter: clauses.join(','), ignoredCategories: topic.categories || [] };
}

/* ------------------------------------------------------------------- LaTeX */

/* OpenAlex passes arXiv's LaTeX straight through, so titles arrive carrying
   "Sinkhorn\n Divergences" and authors as "S\'ejourn\'e" or "Fran\c{c}ois". */
const ACCENTS = {
    "'": { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', y: 'ý', c: 'ć', n: 'ń', s: 'ś', z: 'ź', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú' },
    '`': { a: 'à', e: 'è', i: 'ì', o: 'ò', u: 'ù', A: 'À', E: 'È', I: 'Ì', O: 'Ò', U: 'Ù' },
    '"': { a: 'ä', e: 'ë', i: 'ï', o: 'ö', u: 'ü', y: 'ÿ', A: 'Ä', E: 'Ë', O: 'Ö', U: 'Ü' },
    '^': { a: 'â', e: 'ê', i: 'î', o: 'ô', u: 'û', A: 'Â', E: 'Ê', I: 'Î', O: 'Ô', U: 'Û' },
    '~': { a: 'ã', n: 'ñ', o: 'õ', A: 'Ã', N: 'Ñ', O: 'Õ' },
    c: { c: 'ç', s: 'ş', C: 'Ç', S: 'Ş' },
    v: { c: 'č', s: 'š', z: 'ž', r: 'ř', e: 'ě', C: 'Č', S: 'Š', Z: 'Ž' },
    '.': { z: 'ż', Z: 'Ż' },
};

/** Turn a TeX-flavoured string back into something a person can read. */
export function deTex(raw) {
    let out = String(raw || '').replace(/\\n/g, ' ');   // a literal backslash-n, not a newline
    out = out.replace(/\\([`'"^~vc.])\s*\{?([A-Za-z])\}?/g, (m, mark, ch) => (ACCENTS[mark] || {})[ch] || ch);
    out = out.replace(/\\ss/g, 'ß').replace(/\\o\b/g, 'ø').replace(/\\aa\b/g, 'å').replace(/\\&/g, '&');
    // Anything left keeps its name rather than vanishing: \alpha reads better as
    // "alpha" than as the hole it would leave in "$\alpha$-divergence".
    out = out.replace(/\\([a-zA-Z]+)/g, '$1');
    return out.replace(/[{}$\\]/g, '').replace(/\s+/g, ' ').trim();
}

/** Map an OpenAlex work onto the same entry shape the arXiv parser produces. */
function toEntry(work) {
    const id = arxivIdFromWork(work);
    if (!id) return null;

    const authors = (work.authorships || []).map((a) => ({
        name: deTex((a.author && a.author.display_name) || ''),
        affiliation: (a.institutions && a.institutions[0] && a.institutions[0].display_name) || null,
    })).filter((a) => a.name);

    const date = work.publication_date ? `${work.publication_date}T00:00:00Z` : null;

    return {
        id,
        version: 1,                       // OpenAlex does not track arXiv versions
        title: deTex(work.title),
        summary: deTex(reconstructAbstract(work.abstract_inverted_index)),
        authors,
        categories: [],                   // not carried by OpenAlex
        primary: null,
        published: date,
        updated: date,
        comment: null,
        journalRef: null,
        doi: work.doi || null,
        pdfUrl: `https://arxiv.org/pdf/${id}`,
        citations: work.cited_by_count ?? null,
        source: 'openalex',
    };
}

/**
 * Run one topic against OpenAlex.
 * @returns {Promise<{entries, total, query, strategy, ignoredCategories}>}
 */
export async function searchTopic(topic, { max = 60, sinceDays = 30, signal, mailto } = {}) {
    const { filter, ignoredCategories } = buildFilter(topic, { sinceDays });
    if (!filter) {
        throw new Error(
            `"${topic.name}" needs at least one keyword or author — OpenAlex cannot search by arXiv category alone.`,
        );
    }

    const params = new URLSearchParams({
        filter,
        sort: 'publication_date:desc',
        'per-page': String(Math.min(max, 200)),
        select: FIELDS,
    });
    const json = await apiFetch(params, { signal, mailto });
    const entries = (json.results || []).map(toEntry).filter(Boolean);
    return {
        entries,
        total: json.meta ? json.meta.count : null,
        query: filter,
        strategy: 'openalex',
        ignoredCategories,
    };
}

/* ------------------------------------------------------------ direct lookup */

const NEW_ID = /(?:^|arxiv[:/]|abs\/|pdf\/)(\d{4}\.\d{4,5})(?:v\d+)?/i;
const OLD_ID = /(?:^|arxiv[:/]|abs\/|pdf\/)([a-z-]+(?:\.[A-Z]{2})?\/\d{7})(?:v\d+)?/i;
const DOI = /\b(10\.\d{4,9}\/[^\s"'<>]+)/i;

/** Pull an arXiv id out of an id, an abs/pdf URL, or an `arXiv:` citation string. */
export function arxivIdFromInput(raw) {
    const text = String(raw || '').trim();
    const hit = text.match(NEW_ID) || text.match(OLD_ID);
    return hit ? hit[1] : null;
}

/* A comma or a colon would be read as filter syntax rather than as words. */
const searchable = (s) => String(s).replace(/[,:|]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * One-off lookup behind "add a paper": free text, an arXiv id, a DOI, or a
 * pasted arXiv URL. Unlike a topic fetch there is no date window — you are
 * usually after one specific thing, and it is usually not from this week.
 *
 * Text search is deliberately *not* pinned to the arXiv source: a paper that
 * was later published lists the journal as its primary source, and pinning
 * would hide the very papers most likely to be asked for by name. Anything
 * with no arXiv copy at all is dropped, and counted, so the modal can say so.
 */
export async function searchFreeText(input, { max = 25, mailto, signal } = {}) {
    const raw = String(input || '').trim();
    if (!raw) return { entries: [], total: 0, exact: false, skipped: 0 };

    const run = async (filter, perPage) => {
        const params = new URLSearchParams({ filter, select: FIELDS });
        params.set('per-page', String(Math.min(perPage, 50)));

        const json = await apiFetch(params, { signal, mailto, cacheable: true });
        const works = json.results || [];

        // OpenAlex sometimes holds two records for one preprint; the first is
        // the better-ranked, so later duplicates only top up the citations.
        const byId = new Map();
        works.forEach((w) => {
            const entry = toEntry(w);
            if (!entry) return;
            const prev = byId.get(entry.id);
            if (!prev) byId.set(entry.id, entry);
            else if ((entry.citations || 0) > (prev.citations || 0)) prev.citations = entry.citations;
        });
        return {
            entries: Array.from(byId.values()).slice(0, max),
            total: json.meta ? json.meta.count : null,
            skipped: works.length - byId.size,
        };
    };

    const arxivId = arxivIdFromInput(raw);
    const doi = arxivId ? null : (raw.match(DOI) || [])[1];

    /* OpenAlex cannot OR across fields in one filter, so there are three ways to
       ask a text question, in descending order of how often they are the right
       one:
         1. the whole index — where a famous paper ranks first, preprint or not;
         2. the same words pinned to arXiv — which is all that is left when the
            open index answers with fifty chemistry papers and no preprints;
         3. the words as an author name — because a name is as likely a way in
            as a title.
       Asking all three every time costs three of the day's requests to answer
       one question, so the fallbacks only run when the first pass came back
       thin — which, for an ordinary title search, it does not. */
    const ENOUGH = 5;
    const byText = async () => {
        const words = searchable(raw);
        const wide = await run(`title_and_abstract.search:${words}`, 50);
        if (wide.entries.length >= ENOUGH) return { ...wide, skipped: 0 };

        const spare = { entries: [], skipped: 0 };
        const [onArxiv, byAuthor] = await Promise.all([
            run(`primary_location.source.id:${ARXIV_SOURCE},title_and_abstract.search:${words}`, 25).catch(() => spare),
            run(`raw_author_name.search:${words}`, 25).catch(() => spare),
        ]);
        const seen = new Set();
        const merged = [];
        [wide, onArxiv, byAuthor].forEach(({ entries }) => entries.forEach((e) => {
            if (seen.has(e.id)) return;
            seen.add(e.id);
            merged.push(e);
        }));
        return {
            entries: merged.slice(0, max),
            total: wide.total,
            // Only worth mentioning what was dropped if nothing replaced it.
            skipped: merged.length ? 0 : wide.skipped,
        };
    };

    if (arxivId) {
        // The preprint is listed under http, not https, in OpenAlex's locations.
        const hit = await run(`locations.landing_page_url:http://arxiv.org/abs/${arxivId}`, 5);
        if (hit.entries.length) return { ...hit, exact: true };
        const viaDoi = await run(`doi:10.48550/arxiv.${arxivId.toLowerCase()}`, 5);
        if (viaDoi.entries.length) return { ...viaDoi, exact: true };
        return { ...(await byText()), exact: false };
    }

    if (doi) {
        const hit = await run(`doi:${doi.replace(/[.,;]+$/, '')}`, 5);
        if (hit.entries.length) return { ...hit, exact: true };
    }

    return { ...(await byText()), exact: false };
}

/** Free-form probe used by the topic preview. */
export async function searchRaw(topic, opts) {
    return searchTopic(topic, opts);
}
