/**
 * DataCite — live arXiv lookup that nobody rations.
 *
 * arXiv registers a DOI for every submission, and it registers them with
 * DataCite rather than Crossref (Crossref has none of them at all). DataCite's
 * public API sends CORS headers, needs no key, and has no daily allowance, so
 * it can answer straight from the browser — which is what "+ Add" needs and
 * what OpenAlex, on a thousand requests a day, stops being able to do by
 * mid-afternoon.
 *
 * Two things it does better than OpenAlex: it carries real arXiv categories
 * (math.OC, q-fin.MF…), and its ids are the arXiv ones by construction, so
 * nothing has to be reverse-engineered out of a landing page.
 *
 * One thing it does worse: ranking. A search for a famous title buries it under
 * every paper that echoes it, so the ordering is redone here — see rank().
 */

import { deTex } from './openalex';

const API = 'https://api.datacite.org/dois';
const ARXIV_PREFIX = '10.48550';

const NEW_ID = /(?:^|arxiv[:/]|abs\/|pdf\/)(\d{4}\.\d{4,5})(?:v\d+)?/i;
const OLD_ID = /(?:^|arxiv[:/]|abs\/|pdf\/)([a-z-]+(?:\.[A-Z]{2})?\/\d{7})(?:v\d+)?/i;
const DOI_RE = /\b(10\.\d{4,9}\/[^\s"'<>]+)/i;

export function arxivIdFromInput(raw) {
    const text = String(raw || '').trim();
    const hit = text.match(NEW_ID) || text.match(OLD_ID);
    return hit ? hit[1] : null;
}

const idFromDoi = (doi) => (String(doi || '').match(/10\.48550\/arxiv\.(.+?)(?:v\d+)?$/i) || [])[1] || null;

/* Lucene syntax, so the query has to survive being read as syntax. */
const clean = (s) => String(s || '').replace(/[+\-!(){}[\]^"~*?:\\/]+/g, ' ').replace(/\s+/g, ' ').trim();

/** "Goldfeld, Ziv" is how DataCite files a name; people read it the other way. */
function personName(creator) {
    if (creator.givenName && creator.familyName) return `${creator.givenName} ${creator.familyName}`;
    const raw = String(creator.name || '').trim();
    const comma = raw.indexOf(',');
    return comma > 0 ? `${raw.slice(comma + 1).trim()} ${raw.slice(0, comma).trim()}`.trim() : raw;
}

/** "Statistics Theory (math.ST)" -> "math.ST" */
function categoriesOf(subjects) {
    const out = [];
    (subjects || []).forEach((s) => {
        if (s.subjectScheme !== 'arXiv') return;
        const m = String(s.subject || '').match(/\(([a-z-]+(?:\.[A-Za-z-]+)?)\)\s*$/);
        if (m) out.push(m[1]);
    });
    return Array.from(new Set(out));
}

function publishedAt(attributes) {
    const dates = attributes.dates || [];
    // The first submission is the paper's birthday; later ones are revisions.
    const submitted = dates
        .filter((d) => d.dateType === 'Submitted')
        .map((d) => d.date)
        .sort();
    if (submitted.length) return new Date(submitted[0]).toISOString();
    const issued = dates.find((d) => d.dateType === 'Issued');
    if (issued) return new Date(issued.date).toISOString();
    return attributes.publicationYear ? new Date(`${attributes.publicationYear}-01-01`).toISOString() : null;
}

/** One DataCite record in the shape every other source here produces. */
function toEntry(record) {
    const attributes = (record && record.attributes) || {};
    const id = idFromDoi(attributes.doi);
    if (!id) return null;

    const abstract = (attributes.descriptions || []).find((d) => d.descriptionType === 'Abstract');
    const note = (attributes.descriptions || []).find((d) => d.descriptionType === 'Other');
    const published = publishedAt(attributes);
    const categories = categoriesOf(attributes.subjects);

    return {
        id,
        version: Number(attributes.version) || 1,
        title: deTex((attributes.titles || [])[0] && attributes.titles[0].title),
        summary: deTex(abstract && abstract.description),
        authors: (attributes.creators || [])
            .map((c) => ({ name: deTex(personName(c)), affiliation: (c.affiliation || [])[0] || null }))
            .filter((a) => a.name),
        categories,
        primary: categories[0] || null,
        published,
        updated: published,
        comment: note ? deTex(note.description) : null,
        journalRef: null,
        doi: attributes.doi ? `https://doi.org/${attributes.doi}` : null,
        pdfUrl: `https://arxiv.org/pdf/${id}`,
        citations: Number.isFinite(attributes.citationCount) ? attributes.citationCount : null,
        source: 'datacite',
    };
}

/* ------------------------------------------------------------------ ranking */

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * DataCite hands back everything that shares a word with the query, in an order
 * of its own. Someone searching a title they half-remember wants that title
 * first, so score the exact shapes highest and let word coverage decide the
 * rest.
 */
function rank(entry, query) {
    const title = norm(entry.title);
    const wanted = norm(query);
    if (!wanted) return 0;

    if (title === wanted) return 1000;
    if (title.startsWith(wanted)) return 900;
    if (title.includes(wanted)) return 800;

    const words = wanted.split(' ').filter((w) => w.length > 2);
    if (!words.length) return 0;
    const inTitle = words.filter((w) => title.includes(w)).length;
    const body = norm(`${entry.summary} ${(entry.authors || []).map((a) => a.name).join(' ')}`);
    const inBody = words.filter((w) => body.includes(w)).length;

    // A short title covering every word beats a long one that merely mentions them.
    return Math.round((600 * inTitle + 150 * inBody) / words.length) - Math.min(60, title.split(' ').length * 2);
}

/* ----------------------------------------------------------------- requests */

async function ask(params, { signal }) {
    const url = `${API}?${params.toString()}`;
    for (let attempt = 0; ; attempt += 1) {
        const res = await fetch(url, { signal, headers: { Accept: 'application/vnd.api+json' } });
        if (res.status === 429 && attempt < 2) {
            await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
            continue;
        }
        if (res.status === 404) return { data: [] };
        if (!res.ok) throw new Error(`DataCite returned HTTP ${res.status}`);
        return res.json();
    }
}

const page = (query, size) => new URLSearchParams({
    query,
    prefix: ARXIV_PREFIX,
    'page[size]': String(size),
});

const collect = (json) => {
    const rows = Array.isArray(json.data) ? json.data : [json.data].filter(Boolean);
    return rows.map(toEntry).filter(Boolean);
};

/**
 * Free text, an arXiv id, a URL or a DOI — the same contract as the OpenAlex
 * lookup, so the two are interchangeable behind the search box.
 */
export async function searchFreeText(input, { max = 25, signal } = {}) {
    const raw = String(input || '').trim();
    if (!raw) return { entries: [], total: 0, exact: false, skipped: 0 };

    const arxivId = arxivIdFromInput(raw);
    const doi = arxivId ? `${ARXIV_PREFIX}/arxiv.${arxivId}` : (raw.match(DOI_RE) || [])[1];

    if (doi) {
        // Old ids carry a slash (math/0211159), which cannot go in the path.
        const hit = collect(await ask(page(`doi:"${doi.toLowerCase()}"`, 5), { signal }));
        if (hit.length) return { entries: hit, total: hit.length, exact: true, skipped: 0 };
        if (arxivId) return { entries: [], total: 0, exact: false, skipped: 0 };
    }

    const words = clean(raw);
    if (!words) return { entries: [], total: 0, exact: false, skipped: 0 };

    // A quoted title is the precise question and usually the one being asked;
    // the broad one is only worth a second request when it came back thin.
    const byTitle = await ask(page(`titles.title:"${words}"`, 100), { signal });
    let entries = collect(byTitle);
    let total = (byTitle.meta && byTitle.meta.total) || entries.length;

    if (entries.length < 8) {
        const broad = await ask(
            page(`titles.title:(${words}) OR descriptions.description:(${words}) OR creators.name:(${words})`, 100),
            { signal },
        );
        const seen = new Set(entries.map((e) => e.id));
        entries = [...entries, ...collect(broad).filter((e) => !seen.has(e.id))];
        total = Math.max(total, (broad.meta && broad.meta.total) || 0);
    }

    entries.sort((a, b) => rank(b, raw) - rank(a, raw));
    return { entries: entries.slice(0, max), total, exact: false, skipped: 0 };
}
