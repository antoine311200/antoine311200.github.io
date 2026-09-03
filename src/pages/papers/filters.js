/**
 * Local search + faceting over the stored library.
 *
 * The query language is deliberately small but covers what you actually reach for:
 *   transformer attention        free text over title, abstract, authors, notes
 *   ti:"linear attention"        title only
 *   au:vaswani                   author
 *   cat:cs.LG                    category
 *   tag:to-cite                  your tag
 *   is:starred is:unread         reading state
 *   -survey                      exclude a term
 */

import { authorKey, papersInFolder } from './storage';

const TOKEN_RE = /(-?)(?:(\w+):)?(?:"([^"]*)"|(\S+))/g;

export function parseQuery(input) {
    const clauses = [];
    let m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(input || '')) !== null) {
        const [, neg, field, quoted, bare] = m;
        const value = (quoted !== undefined ? quoted : bare || '').toLowerCase();
        if (!value) continue;
        clauses.push({ negate: neg === '-', field: (field || '').toLowerCase(), value });
    }
    return clauses;
}

function haystack(paper, state) {
    return [
        paper.title,
        paper.summary,
        (paper.authors || []).map((a) => a.name).join(' '),
        (paper.categories || []).join(' '),
        paper.comment,
        paper.journalRef,
        state.note,
        (state.tags || []).join(' '),
    ].join(' ').toLowerCase();
}

function clauseMatches(clause, paper, state) {
    const { field, value } = clause;
    switch (field) {
        case 'ti':
        case 'title':
            return (paper.title || '').toLowerCase().includes(value);
        case 'abs':
            return (paper.summary || '').toLowerCase().includes(value);
        case 'au':
        case 'author':
            return (paper.authors || []).some((a) => a.name.toLowerCase().includes(value));
        case 'cat':
            return (paper.categories || []).some((c) => c.toLowerCase().includes(value));
        case 'tag':
            return (state.tags || []).some((t) => t.toLowerCase() === value || t.toLowerCase().includes(value));
        case 'is':
            if (value === 'starred') return !!state.starred;
            if (value === 'noted') return !!state.note;
            if (value === 'revised') return (paper.version || 1) > 1;
            if (value === 'enriched') return !!(paper.enriched && !paper.enriched.miss);
            return (state.status || 'unread') === value;
        case 'id':
            return paper.id.includes(value);
        default:
            return haystack(paper, state).includes(value);
    }
}

export const SORTS = {
    relevance: { label: 'Relevance', fn: (a, b) => (b.score || 0) - (a.score || 0) || cmpDate(b, a) },
    newest: { label: 'Newest', fn: (a, b) => cmpDate(b, a) },
    seen: { label: 'Recently seen', fn: (a, b) => String(b.firstSeen || '').localeCompare(String(a.firstSeen || '')) },
    updated: { label: 'Last revised', fn: (a, b) => String(b.updated || '').localeCompare(String(a.updated || '')) },
    citations: {
        label: 'Citations',
        fn: (a, b) => ((b.enriched && b.enriched.citations) || 0) - ((a.enriched && a.enriched.citations) || 0),
    },
    title: { label: 'Title', fn: (a, b) => String(a.title).localeCompare(String(b.title)) },
};

const cmpDate = (a, b) => String(a.published || '').localeCompare(String(b.published || ''));

export const DEFAULT_FILTERS = {
    query: '',
    topicIds: [],
    origins: [],         // 'topic' | 'search'
    statuses: [],
    categories: [],
    tags: [],
    authorKey: null,
    folderId: null,
    starredOnly: false,
    followedOnly: false,
    unreadOnly: false,
    days: null,          // last N days by firstSeen
    minScore: null,
    sort: 'relevance',
    hideDismissed: true,
    hideArchived: true,
};

export function applyFilters(paperList, states, filters, { folders = [], followedIds = new Set() } = {}) {
    const clauses = parseQuery(filters.query);
    // A folder filter includes everything filed in its subfolders too.
    const folderSet = filters.folderId ? papersInFolder(folders, filters.folderId) : null;
    const cutoff = filters.days ? Date.now() - filters.days * 864e5 : null;

    const out = paperList.filter((p) => {
        const st = states[p.id] || {};
        const status = st.status || 'unread';

        if (filters.hideDismissed && status === 'dismissed' && !filters.statuses.includes('dismissed')) return false;
        if (filters.hideArchived && status === 'archived' && !filters.statuses.includes('archived')) return false;
        if (filters.statuses.length && !filters.statuses.includes(status)) return false;
        if (filters.starredOnly && !st.starred) return false;
        if (filters.unreadOnly && status !== 'unread') return false;
        if (filters.followedOnly && !followedIds.has(p.id)) return false;
        if (folderSet && !folderSet.has(p.id)) return false;
        if (filters.topicIds.length && !(p.topicIds || []).some((t) => filters.topicIds.includes(t))) return false;
        if (filters.origins.length && !filters.origins.includes(p.origin || 'topic')) return false;
        if (filters.categories.length && !(p.categories || []).some((c) => filters.categories.includes(c))) return false;
        if (filters.tags.length && !(st.tags || []).some((t) => filters.tags.includes(t))) return false;
        if (filters.minScore != null && (p.score || 0) < filters.minScore) return false;
        if (cutoff && new Date(p.firstSeen || p.published).getTime() < cutoff) return false;
        if (filters.authorKey && !(p.authors || []).some((a) => authorKey(a.name) === filters.authorKey)) return false;

        for (const c of clauses) {
            const hit = clauseMatches(c, p, st);
            if (c.negate ? hit : !hit) return false;
        }
        return true;
    });

    const sorter = (SORTS[filters.sort] || SORTS.relevance).fn;
    return out.sort(sorter);
}

/** Group a sorted list by the day it entered the library. */
export function groupByDay(list) {
    const groups = new Map();
    list.forEach((p) => {
        const day = String(p.firstSeen || p.published || '').slice(0, 10) || 'unknown';
        if (!groups.has(day)) groups.set(day, []);
        groups.get(day).push(p);
    });
    return Array.from(groups.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([day, papers]) => ({ key: day, day, papers }));
}

/**
 * Group by topic. A paper matching several topics appears under each of them —
 * duplication is the point: you read a topic's slice, not a deduplicated pile.
 */
export function groupByTopic(list, topics) {
    const byId = new Map(topics.map((t) => [t.id, t]));
    const groups = new Map();
    const loose = [];

    list.forEach((p) => {
        const ids = (p.topicIds || []).filter((id) => byId.has(id));
        if (!ids.length) { loose.push(p); return; }
        ids.forEach((id) => {
            if (!groups.has(id)) groups.set(id, []);
            groups.get(id).push(p);
        });
    });

    // Keep the user's own topic order, so the sidebar and the digest agree.
    const out = topics
        .filter((t) => groups.has(t.id))
        .map((t) => ({ key: t.id, topic: t, papers: groups.get(t.id) }));

    if (loose.length) out.push({ key: '__none__', topic: null, papers: loose });
    return out;
}

/** Facet counts for the sidebar, computed over the *unfiltered* library. */
export function facets(paperList, states) {
    const categories = new Map();
    const tags = new Map();
    paperList.forEach((p) => {
        (p.categories || []).forEach((c) => categories.set(c, (categories.get(c) || 0) + 1));
        const st = states[p.id];
        if (st) (st.tags || []).forEach((t) => tags.set(t, (tags.get(t) || 0) + 1));
    });
    const sortDesc = (m) => Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
    return { categories: sortDesc(categories), tags: sortDesc(tags) };
}
