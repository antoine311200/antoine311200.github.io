/**
 * arXiv Atom API client.
 *
 * The public export.arxiv.org endpoint does not reliably send CORS headers, and this
 * site is a static page with no backend. So every request walks a chain of strategies
 * — a direct call first, then public read-only relays — and the first one that works
 * is remembered for the rest of the session.
 */

const API = 'https://export.arxiv.org/api/query';

export const STRATEGIES = [
    { id: 'direct', label: 'Direct (export.arxiv.org)', build: (u) => u },
    {
        id: 'allorigins',
        label: 'allorigins.win relay',
        build: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    },
    {
        id: 'corsproxy',
        label: 'corsproxy.io relay',
        build: (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
    },
    {
        id: 'codetabs',
        label: 'codetabs.com relay',
        build: (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
    },
];

let preferred = null;   // session memory of the last strategy that worked

export function setPreferredStrategy(id) {
    preferred = id && id !== 'auto' ? id : null;
}

export function getPreferredStrategy() {
    return preferred;
}

/* ------------------------------------------------------------ query building */

const escapePhrase = (s) => `"${String(s).replace(/"/g, '').trim()}"`;

const FIELD_SETS = {
    title: ['ti'],
    title_abstract: ['ti', 'abs'],
    all: ['all'],
};

/**
 * Turn a topic into an arXiv `search_query` expression.
 *
 *   (ti:"tensor network" OR abs:"tensor network") AND (cat:quant-ph OR cat:cs.LG)
 *   ANDNOT (abs:"survey")
 */
export function buildQuery(topic) {
    const fields = FIELD_SETS[topic.fields] || FIELD_SETS.title_abstract;
    const clauses = [];

    const terms = (topic.terms || []).map((t) => t.trim()).filter(Boolean);
    if (terms.length) {
        const parts = [];
        terms.forEach((term) => {
            fields.forEach((f) => parts.push(`${f}:${escapePhrase(term)}`));
        });
        clauses.push(`(${parts.join(' OR ')})`);
    }

    const cats = (topic.categories || []).map((c) => c.trim()).filter(Boolean);
    if (cats.length) clauses.push(`(${cats.map((c) => `cat:${c}`).join(' OR ')})`);

    const authors = (topic.authors || []).map((a) => a.trim()).filter(Boolean);
    if (authors.length) clauses.push(`(${authors.map((a) => `au:${escapePhrase(a)}`).join(' OR ')})`);

    if (!clauses.length) return null;

    let q = clauses.join(' AND ');

    const excludes = (topic.exclude || []).map((t) => t.trim()).filter(Boolean);
    if (excludes.length) {
        const parts = [];
        excludes.forEach((term) => fields.forEach((f) => parts.push(`${f}:${escapePhrase(term)}`)));
        q += ` ANDNOT (${parts.join(' OR ')})`;
    }
    return q;
}

export function queryUrl(searchQuery, { start = 0, max = 60, sortBy = 'submittedDate' } = {}) {
    const params = new URLSearchParams({
        search_query: searchQuery,
        start: String(start),
        max_results: String(Math.min(max, 200)),
        sortBy,
        sortOrder: 'descending',
    });
    return `${API}?${params.toString()}`;
}

/* ------------------------------------------------------------------ fetching */

async function attempt(strategy, url, signal) {
    const res = await fetch(strategy.build(url), {
        signal,
        headers: { Accept: 'application/atom+xml, text/xml, */*' },
    });
    if (!res.ok) throw new Error(`${strategy.id}: HTTP ${res.status}`);
    const body = await res.text();
    if (!body || body.indexOf('<feed') === -1) throw new Error(`${strategy.id}: not an Atom feed`);
    return body;
}

/** Fetch a raw Atom feed, walking the strategy chain until one succeeds. */
export async function fetchFeed(url, { signal, strategy = 'auto' } = {}) {
    const forced = strategy && strategy !== 'auto' ? STRATEGIES.filter((s) => s.id === strategy) : null;
    const ordered = forced && forced.length
        ? forced
        : [...STRATEGIES].sort((a, b) => (b.id === preferred ? 1 : 0) - (a.id === preferred ? 1 : 0));

    const errors = [];
    for (const s of ordered) {
        try {
            const body = await attempt(s, url, signal);
            preferred = s.id;
            return { text: body, strategy: s.id };
        } catch (err) {
            if (err.name === 'AbortError') throw err;
            errors.push(err.message || String(err));
        }
    }
    throw new Error(`Every fetch route failed - ${errors.join(' | ')}`);
}

/* ------------------------------------------------------------------- parsing */

const text = (node, tag) => {
    const el = node.getElementsByTagName(tag)[0];
    return el ? el.textContent.trim().replace(/\s+/g, ' ') : '';
};

/** "http://arxiv.org/abs/2401.01234v2" -> { id: "2401.01234", version: 2 } */
export function splitArxivId(raw) {
    const tail = String(raw).split('/abs/').pop();
    const m = tail.match(/^(.*?)(?:v(\d+))?$/);
    return { id: m ? m[1] : tail, version: m && m[2] ? Number(m[2]) : 1 };
}

export function parseFeed(xml) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('arXiv returned malformed XML');

    const totalEl = doc.getElementsByTagName('opensearch:totalResults')[0];
    const total = totalEl ? Number(totalEl.textContent) : null;

    const entries = Array.from(doc.getElementsByTagName('entry')).map((entry) => {
        const { id, version } = splitArxivId(text(entry, 'id'));

        const authors = Array.from(entry.getElementsByTagName('author')).map((a) => ({
            name: text(a, 'name'),
            affiliation: text(a, 'arxiv:affiliation') || null,
        })).filter((a) => a.name);

        const categories = Array.from(entry.getElementsByTagName('category'))
            .map((c) => c.getAttribute('term')).filter(Boolean);

        const primaryEl = entry.getElementsByTagName('arxiv:primary_category')[0];
        const primary = primaryEl ? primaryEl.getAttribute('term') : categories[0] || null;

        const links = Array.from(entry.getElementsByTagName('link'));
        const pdf = links.find((l) => l.getAttribute('title') === 'pdf');
        const doiLink = links.find((l) => l.getAttribute('title') === 'doi');

        return {
            id,
            version,
            title: text(entry, 'title'),
            summary: text(entry, 'summary'),
            authors,
            categories: Array.from(new Set(categories)),
            primary,
            published: text(entry, 'published'),
            updated: text(entry, 'updated'),
            comment: text(entry, 'arxiv:comment') || null,
            journalRef: text(entry, 'arxiv:journal_ref') || null,
            doi: text(entry, 'arxiv:doi') || (doiLink ? doiLink.getAttribute('href') : null),
            pdfUrl: pdf ? pdf.getAttribute('href') : `https://arxiv.org/pdf/${id}`,
        };
    });

    return { entries, total };
}

/** One topic -> parsed entries. Throws with a readable message on failure. */
export async function searchTopic(topic, { max, strategy, signal } = {}) {
    const q = buildQuery(topic);
    if (!q) throw new Error(`"${topic.name}" has no keywords, categories or authors to search on`);
    const { text: xml, strategy: used } = await fetchFeed(
        queryUrl(q, { max: max || 60 }), { signal, strategy },
    );
    const { entries, total } = parseFeed(xml);
    return { entries, total, query: q, strategy: used };
}

/** Free-form one-off search (the "search arXiv directly" box). */
export async function searchRaw(expression, { max = 50, strategy, signal, sortBy } = {}) {
    const { text: xml, strategy: used } = await fetchFeed(
        queryUrl(expression, { max, sortBy }), { signal, strategy },
    );
    const { entries, total } = parseFeed(xml);
    return { entries, total, query: expression, strategy: used };
}

/** Common arXiv categories, for the topic editor's picker. */
export const CATEGORIES = [
    ['cs.LG', 'Machine Learning'], ['cs.AI', 'Artificial Intelligence'],
    ['cs.CL', 'Computation and Language'], ['cs.CV', 'Computer Vision'],
    ['cs.NE', 'Neural and Evolutionary Computing'], ['cs.DS', 'Data Structures & Algorithms'],
    ['cs.IT', 'Information Theory'], ['cs.CC', 'Computational Complexity'],
    ['cs.CR', 'Cryptography and Security'], ['cs.DC', 'Distributed Computing'],
    ['stat.ML', 'Statistics - ML'], ['stat.ME', 'Statistics - Methodology'],
    ['math.OC', 'Optimization and Control'], ['math.PR', 'Probability'],
    ['math.ST', 'Statistics Theory'], ['math.NA', 'Numerical Analysis'],
    ['math.AP', 'Analysis of PDEs'], ['math.FA', 'Functional Analysis'],
    ['math-ph', 'Mathematical Physics'],
    ['q-fin.MF', 'Mathematical Finance'], ['q-fin.PR', 'Pricing of Securities'],
    ['q-fin.CP', 'Computational Finance'], ['q-fin.TR', 'Trading & Market Microstructure'],
    ['q-fin.RM', 'Risk Management'], ['q-fin.PM', 'Portfolio Management'],
    ['q-fin.ST', 'Statistical Finance'], ['q-fin.GN', 'General Finance'],
    ['quant-ph', 'Quantum Physics'], ['cond-mat.str-el', 'Strongly Correlated Electrons'],
    ['cond-mat.stat-mech', 'Statistical Mechanics'], ['cond-mat.dis-nn', 'Disordered Systems & NN'],
    ['physics.comp-ph', 'Computational Physics'], ['hep-th', 'High Energy Physics - Theory'],
    ['eess.SP', 'Signal Processing'], ['eess.IV', 'Image and Video Processing'],
    ['q-bio.NC', 'Neurons and Cognition'], ['econ.EM', 'Econometrics'],
];
