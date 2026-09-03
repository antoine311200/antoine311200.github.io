/**
 * Optional enrichment via the Semantic Scholar graph API, which does send CORS
 * headers and needs no key. It adds the two things arXiv cannot give you: how much
 * a paper is being cited, and a one-sentence TL;DR.
 *
 * Entirely opt-in (Settings → enrichment), cached on the paper record, and batched
 * so a whole digest costs one request.
 */

const BATCH = 'https://api.semanticscholar.org/graph/v1/paper/batch';
const FIELDS = 'externalIds,citationCount,influentialCitationCount,tldr,venue,year,authors.authorId,authors.name';

const chunk = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
};

/**
 * @returns {Promise<Object>} map of arXiv id -> enrichment payload for the ids that
 * resolved. Ids Semantic Scholar does not know are simply absent; the caller marks
 * them as attempted so we do not ask again on every render.
 */
export async function enrichPapers(ids, { signal } = {}) {
    const result = {};
    for (const group of chunk(ids, 100)) {
        const res = await fetch(`${BATCH}?fields=${FIELDS}`, {
            method: 'POST',
            signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: group.map((id) => `ARXIV:${id}`) }),
        });

        if (res.status === 429) throw new Error('Semantic Scholar is rate-limiting — try again in a minute');
        if (!res.ok) throw new Error(`Semantic Scholar returned HTTP ${res.status}`);

        const rows = await res.json();
        rows.forEach((row, i) => {
            if (!row) return;                       // unknown to S2
            result[group[i]] = {
                citations: row.citationCount ?? null,
                influential: row.influentialCitationCount ?? null,
                tldr: (row.tldr && row.tldr.text) || null,
                venue: row.venue || null,
                s2Authors: (row.authors || []).map((a) => ({ id: a.authorId, name: a.name })),
                at: new Date().toISOString(),
            };
        });

        // Be a good citizen on the unauthenticated tier.
        if (ids.length > 100) await new Promise((r) => setTimeout(r, 1200));
    }
    return result;
}
