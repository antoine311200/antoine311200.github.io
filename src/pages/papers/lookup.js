/**
 * What "+ Add" asks, and in what order.
 *
 * Three sources, cheapest first, because the cheapest is also the fastest and
 * the one most likely to hold what you are looking for:
 *
 *   1. the library you already have — no network at all;
 *   2. DataCite, where arXiv registers its DOIs: CORS, no key, no allowance,
 *      real arXiv categories, and ids that are arXiv's by construction;
 *   3. OpenAlex, which ranks better and reaches further, but bills against a
 *      thousand requests a day and is therefore not something to lean on.
 *
 * A search only falls through to the next source when the one before it comes
 * back empty or refuses, so an ordinary lookup costs nothing rationed.
 */

import { searchFreeText as searchDataCite, arxivIdFromInput } from './datacite';
import { searchFreeText as searchOpenAlex } from './openalex';

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * The papers already here. Free, instant, and the right answer more often than
 * it sounds: half of "what was that paper called" is something you read once.
 */
export function searchLibrary(papers, query, { max = 10 } = {}) {
    const wanted = norm(query);
    const id = arxivIdFromInput(query);
    if (!wanted && !id) return [];

    // A pasted id or URL is a question with one answer. Matching its words as
    // well would drag in every paper whose title contains "abs" or "org".
    if (id) {
        const exact = (papers || {})[id];
        return exact ? [exact] : [];
    }

    const words = wanted.split(' ').filter((w) => w.length > 2);
    const scored = [];

    Object.values(papers || {}).forEach((paper) => {
        const title = norm(paper.title);
        const authors = norm((paper.authors || []).map((a) => a.name).join(' '));
        if (!words.length) return;

        let score = 0;
        if (title === wanted) score = 900;
        else if (title.includes(wanted)) score = 800;
        else {
            const inTitle = words.filter((w) => title.includes(w)).length;
            const inAuthors = words.filter((w) => authors.includes(w)).length;
            if (!inTitle && !inAuthors) return;
            score = Math.round((500 * inTitle + 200 * inAuthors) / words.length);
        }
        scored.push({ paper, score });
    });

    return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, max)
        .map(({ paper }) => paper);
}

/**
 * @returns {Promise<{entries, exact, skipped, source, held}>} where `held` are
 * the matches that are already in the library and `source` names who answered.
 */
export async function lookup(query, { papers = {}, mailto, signal } = {}) {
    const held = searchLibrary(papers, query);

    let live = null;
    let source = null;
    let liveError = null;

    try {
        live = await searchDataCite(query, { signal });
        source = 'DataCite';
    } catch (err) {
        if (err.name === 'AbortError') throw err;
        liveError = err;
    }

    // DataCite indexes arXiv and nothing else, so an empty answer is a real
    // answer — but it is worth one look at the wider index before saying no.
    if (!live || !live.entries.length) {
        try {
            const wider = await searchOpenAlex(query, { mailto, signal });
            if (wider.entries.length || !live) { live = wider; source = 'OpenAlex'; }
        } catch (err) {
            if (err.name === 'AbortError') throw err;
            // Both refused: the first failure is the one worth reporting.
            if (!live) throw liveError || err;
        }
    }

    const seen = new Set(held.map((p) => p.id));
    return {
        entries: [...held, ...(live ? live.entries.filter((e) => !seen.has(e.id)) : [])],
        exact: !!(live && live.exact),
        skipped: (live && live.skipped) || 0,
        source: held.length && !(live && live.entries.length) ? 'your library' : source,
        held: held.length,
    };
}
