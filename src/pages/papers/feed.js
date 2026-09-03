/**
 * The prefetched arXiv feed.
 *
 * arXiv sends no CORS header on any endpoint, so the browser cannot read it —
 * not the API, not the RSS, not the listing pages. What the browser *can* read
 * without asking anyone's permission is a file served from this same site, so a
 * scheduled job (scripts/fetch-arxiv.mjs, run by .github/workflows/arxiv.yml)
 * does the fetching where no browser is in the way and commits the result to
 * public/arxiv/.
 *
 * The job only decides what gets *downloaded*. Which topic a paper belongs to is
 * decided here, against the topics as they are right now — so editing a topic in
 * the app re-sorts the corpus already on disk, with no CI run and no network.
 */

const ROOT = '/arxiv';

async function readJson(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    if (res.status === 404) {
        const err = new Error('No prefetched feed found on this site yet.');
        err.code = 'NO_FEED';
        throw err;
    }
    if (!res.ok) throw new Error(`The feed returned HTTP ${res.status}`);
    return res.json();
}

/** What the last CI run left behind: which files exist, and when they were made. */
export async function loadManifest({ signal } = {}) {
    void signal;
    const manifest = await readJson(`${ROOT}/index.json`);
    return {
        generatedAt: manifest.generatedAt || null,
        runs: Array.isArray(manifest.runs) ? manifest.runs : [],
        topics: manifest.topics || [],
        report: manifest.report || [],
    };
}

/** One run's papers, exactly in the shape a fetch would have produced. */
export async function loadRun(file) {
    const body = await readJson(`${ROOT}/${file}`);
    return Array.isArray(body.entries) ? body.entries : [];
}

/* arXiv's own search tokenises, so a query for "gromov-wasserstein" finds a
   title reading "Gromov Wasserstein". Flattening punctuation on both sides
   keeps the app's answer the same as the query's. */
const flatten = (s) => String(s || '')
    .toLowerCase()
    .replace(/[\u2010-\u2015_/,.:;()[\]{}'"-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const haystack = (entry, fields) => {
    const title = entry.title || '';
    const abstract = entry.summary || '';
    if (fields === 'title') return flatten(title);
    if (fields === 'all') return flatten(`${title} ${abstract} ${(entry.authors || []).map((a) => a.name).join(' ')}`);
    return flatten(`${title} ${abstract}`);
};

/**
 * Does this paper answer this topic? The same three questions the arXiv query
 * asks — words, categories, authors — evaluated locally so the answer follows
 * the topic as you edit it.
 */
export function matchesTopic(entry, topic) {
    if (!topic || topic.enabled === false) return false;

    const terms = (topic.terms || []).map(flatten).filter(Boolean);
    const cats = (topic.categories || []).map((c) => c.trim()).filter(Boolean);
    const authors = (topic.authors || []).map(flatten).filter(Boolean);
    if (!terms.length && !cats.length && !authors.length) return false;

    const text = haystack(entry, topic.fields);

    const excludes = (topic.exclude || []).map(flatten).filter(Boolean);
    if (excludes.some((e) => text.includes(e))) return false;

    // An arXiv query ANDs its clauses, and so does this: a category list narrows
    // the words rather than widening the net.
    if (terms.length && !terms.some((t) => text.includes(t))) return false;
    if (cats.length && !(entry.categories || []).some((c) => cats.includes(c))) return false;
    if (authors.length) {
        const names = (entry.authors || []).map((a) => flatten(a.name));
        if (!authors.some((a) => names.some((n) => n.includes(a)))) return false;
    }
    return true;
}

/** Split one run's papers across the topics they answer; drop the rest. */
export function sortIntoTopics(entries, topics) {
    const byTopic = new Map(topics.map((t) => [t.id, []]));
    let matched = 0;
    entries.forEach((entry) => {
        let hit = false;
        topics.forEach((topic) => {
            if (matchesTopic(entry, topic)) { byTopic.get(topic.id).push(entry); hit = true; }
        });
        if (hit) matched += 1;
    });
    return { byTopic, matched, seen: entries.length };
}

/** The config the CI job reads, written from the topics you actually have. */
export function feedConfig(topics, { days = 7, maxPerTopic = 200 } = {}) {
    return {
        days,
        maxPerTopic,
        topics: topics.map((t) => ({
            id: t.id,
            name: t.name,
            color: t.color,
            terms: t.terms || [],
            exclude: t.exclude || [],
            categories: t.categories || [],
            authors: t.authors || [],
            fields: t.fields || 'title_abstract',
            enabled: t.enabled !== false,
        })),
    };
}
