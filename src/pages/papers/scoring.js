/**
 * Relevance, similarity and trend analysis.
 *
 * Everything here is deterministic and runs over the local store — there is no model
 * to download and no request to make. Scores are *explainable*: `scorePaper` returns
 * the reasons alongside the number so a card can show why it is at the top.
 */

import { authorKey } from './storage';

const STOP = new Set(`a an the and or of for to in on with without by from as at is are be
was were this that these those we our their its it can may using use used via new novel
show shows shown propose proposed present presents paper study results method methods
approach approaches based both between during into over under such than then there here
also more most much many other others which while within when where what how why not no
do does did have has had but if all any each few own same so only very just about above
across after against`.split(/\s+/));

export function tokenize(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && w.length < 32 && !STOP.has(w) && !/^\d+$/.test(w));
}

const norm = (s) => String(s || '').toLowerCase();

/** Count non-overlapping occurrences of a phrase in a haystack. */
function countOccurrences(haystack, needle) {
    if (!needle) return 0;
    let count = 0;
    let i = haystack.indexOf(needle);
    while (i !== -1) { count += 1; i = haystack.indexOf(needle, i + needle.length); }
    return count;
}

/* ------------------------------------------------------------------- scoring */

const W = {
    titleTerm: 12,
    abstractTerm: 4,
    categoryHit: 6,
    primaryCategoryHit: 4,
    followedAuthor: 25,
    feedbackScale: 6,
    crossTopic: 5,        // a paper several topics agree on is a good sign
};

/**
 * Score one paper against the user's topics, followed authors and learned feedback.
 * Returns `{ score, reasons, matches }` — `reasons` is display-ready so a card can
 * explain itself instead of showing a bare number.
 */
export function scorePaper(paper, { topics = [], authors = {}, feedback = {}, halfLife = 10 } = {}) {
    const title = norm(paper.title);
    const abs = norm(paper.summary);
    const reasons = [];
    const matches = new Set();
    let raw = 0;

    const relevantTopics = topics.filter((t) => (paper.topicIds || []).includes(t.id));
    const pool = relevantTopics.length ? relevantTopics : topics;

    pool.forEach((topic) => {
        (topic.terms || []).forEach((term) => {
            const t = norm(term).trim();
            if (!t) return;
            const inTitle = countOccurrences(title, t);
            const inAbs = countOccurrences(abs, t);
            if (!inTitle && !inAbs) return;
            matches.add(term);
            // Diminishing returns: the second mention of a term says much less than the first.
            raw += W.titleTerm * Math.min(inTitle, 2) + W.abstractTerm * Math.min(inAbs, 3);
        });
        (topic.categories || []).forEach((cat) => {
            if (paper.primary === cat) raw += W.primaryCategoryHit;
            else if ((paper.categories || []).includes(cat)) raw += W.categoryHit;
        });
    });

    if (matches.size) {
        reasons.push({ kind: 'terms', label: `matches ${Array.from(matches).slice(0, 4).join(', ')}` });
    }

    if ((paper.topicIds || []).length > 1) {
        raw += W.crossTopic * (paper.topicIds.length - 1);
        reasons.push({ kind: 'topics', label: `in ${paper.topicIds.length} of your topics` });
    }

    const followed = (paper.authors || [])
        .map((a) => authors[authorKey(a.name)])
        .filter((a) => a && a.followedAt);
    if (followed.length) {
        raw += W.followedAuthor + (followed.length - 1) * 8;
        reasons.push({ kind: 'author', label: `by ${followed.map((a) => a.name).join(', ')} (followed)` });
    }

    // Learned term weights from what you starred / dismissed.
    const fb = feedback.terms || {};
    if (Object.keys(fb).length) {
        const tokens = new Set(tokenize(`${paper.title} ${paper.summary}`));
        let delta = 0;
        tokens.forEach((tok) => { if (fb[tok]) delta += fb[tok]; });
        if (delta) {
            raw += Math.max(-20, Math.min(20, delta * W.feedbackScale));
            reasons.push({
                kind: 'learned',
                label: delta > 0 ? 'reads like papers you starred' : 'reads like papers you dismissed',
            });
        }
    }

    // Recency: exponential decay so a stale item never outranks a fresh equal.
    const ageDays = Math.max(0, (Date.now() - new Date(paper.published || paper.firstSeen).getTime()) / 864e5);
    const recency = Math.pow(0.5, ageDays / Math.max(1, halfLife));

    const score = Math.round(raw * (0.55 + 0.45 * recency));
    return { score: Math.max(0, score), reasons, matches: Array.from(matches) };
}

export function rescoreAll(papers, ctx) {
    const out = {};
    Object.entries(papers).forEach(([id, p]) => {
        const { score, reasons, matches } = scorePaper(p, ctx);
        out[id] = { ...p, score, reasons, matches };
    });
    return out;
}

/* ------------------------------------------------------------------ feedback */

/** Nudge term weights toward (`+1`) or away from (`-1`) a paper's vocabulary. */
export function learnFrom(feedback, paper, direction = 1) {
    const terms = { ...(feedback.terms || {}) };
    const tokens = tokenize(`${paper.title} ${paper.title} ${paper.summary}`);
    const counts = {};
    tokens.forEach((t) => { counts[t] = (counts[t] || 0) + 1; });

    Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 25)                     // only the paper's most characteristic words
        .forEach(([t]) => {
            const next = (terms[t] || 0) + direction * 0.12;
            terms[t] = Math.max(-1.5, Math.min(1.5, Number(next.toFixed(3))));
            if (Math.abs(terms[t]) < 0.02) delete terms[t];
        });

    return { ...feedback, terms };
}

/* ---------------------------------------------------------------- similarity */

/** Build a TF-IDF index over the library. Memoised by the provider, not per render. */
export function buildIndex(papers) {
    const docs = new Map();
    const df = new Map();

    Object.values(papers).forEach((p) => {
        const tf = new Map();
        tokenize(`${p.title} ${p.title} ${p.summary}`).forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
        tf.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1));
        docs.set(p.id, tf);
    });

    const N = docs.size || 1;
    const vectors = new Map();
    docs.forEach((tf, id) => {
        const vec = new Map();
        let sumSq = 0;
        tf.forEach((count, term) => {
            const idf = Math.log(1 + N / (1 + (df.get(term) || 0)));
            const w = (1 + Math.log(count)) * idf;
            vec.set(term, w);
            sumSq += w * w;
        });
        const len = Math.sqrt(sumSq) || 1;
        vec.forEach((w, term) => vec.set(term, w / len));
        vectors.set(id, vec);
    });

    return { vectors, df, N };
}

export function cosine(a, b) {
    if (!a || !b) return 0;
    const [small, large] = a.size < b.size ? [a, b] : [b, a];
    let dot = 0;
    small.forEach((w, t) => { const o = large.get(t); if (o) dot += w * o; });
    return dot;
}

export function similarTo(index, id, papers, limit = 6) {
    const target = index.vectors.get(id);
    if (!target) return [];
    const scored = [];
    index.vectors.forEach((vec, other) => {
        if (other === id) return;
        const s = cosine(target, vec);
        if (s > 0.06) scored.push({ id: other, similarity: s });
    });
    return scored
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map((s) => ({ ...s, paper: papers[s.id] }))
        .filter((s) => s.paper);
}

/* ------------------------------------------------------------------- trends */

/**
 * Terms over-represented in the last `windowDays` compared with the library baseline.
 * A crude but effective "what is heating up in my field" signal.
 */
export function trendingTerms(papers, { windowDays = 14, limit = 20 } = {}) {
    const cutoff = Date.now() - windowDays * 864e5;
    const recent = new Map();
    const base = new Map();
    let nRecent = 0;
    let nBase = 0;

    Object.values(papers).forEach((p) => {
        const when = new Date(p.firstSeen || p.published).getTime();
        const isRecent = when >= cutoff;
        const target = isRecent ? recent : base;
        if (isRecent) nRecent += 1; else nBase += 1;
        new Set(tokenize(`${p.title} ${p.summary}`)).forEach((t) => target.set(t, (target.get(t) || 0) + 1));
    });

    if (!nRecent) return [];
    const out = [];
    recent.forEach((count, term) => {
        if (count < 2) return;
        const pr = count / nRecent;
        const pb = ((base.get(term) || 0) + 0.5) / (nBase + 1);
        const lift = pr / pb;
        if (lift > 1.2) out.push({ term, count, lift: Number(lift.toFixed(2)) });
    });

    return out
        .sort((a, b) => b.lift * Math.log(1 + b.count) - a.lift * Math.log(1 + a.count))
        .slice(0, limit);
}

/* --------------------------------------------------------------- co-authors */

/** Author nodes + co-authorship edges over a set of papers. */
export function coauthorGraph(paperList, followed = {}, { minPapers = 1, maxNodes = 160 } = {}) {
    const nodes = new Map();
    const edges = new Map();

    paperList.forEach((p) => {
        const names = (p.authors || []).map((a) => a.name);
        names.forEach((name) => {
            const key = authorKey(name);
            if (!key) return;
            const node = nodes.get(key) || {
                key,
                name,
                papers: 0,
                topics: new Set(),
                followed: !!(followed[key] && followed[key].followedAt),
            };
            node.papers += 1;
            (p.topicIds || []).forEach((t) => node.topics.add(t));
            nodes.set(key, node);
        });
        for (let i = 0; i < names.length; i += 1) {
            for (let j = i + 1; j < names.length; j += 1) {
                const a = authorKey(names[i]);
                const b = authorKey(names[j]);
                if (!a || !b || a === b) continue;
                const k = a < b ? `${a}|${b}` : `${b}|${a}`;
                edges.set(k, (edges.get(k) || 0) + 1);
            }
        }
    });

    const kept = Array.from(nodes.values())
        .filter((n) => n.papers >= minPapers || n.followed)
        .sort((a, b) => (b.followed ? 1 : 0) - (a.followed ? 1 : 0) || b.papers - a.papers)
        .slice(0, maxNodes);

    const keptKeys = new Set(kept.map((n) => n.key));
    const keptEdges = [];
    edges.forEach((weight, k) => {
        const [a, b] = k.split('|');
        if (keptKeys.has(a) && keptKeys.has(b)) keptEdges.push({ from: a, to: b, weight });
    });

    return { nodes: kept.map((n) => ({ ...n, topics: Array.from(n.topics) })), edges: keptEdges };
}

/** Roll every paper up into per-author statistics. */
export function authorStats(papers, followed = {}) {
    const map = new Map();
    Object.values(papers).forEach((p) => {
        (p.authors || []).forEach((a) => {
            const key = authorKey(a.name);
            if (!key) return;
            const rec = map.get(key) || {
                key,
                name: a.name,
                papers: [],
                categories: new Set(),
                topicIds: new Set(),
                coauthors: new Set(),
                affiliation: a.affiliation || null,
            };
            rec.papers.push(p);
            (p.categories || []).forEach((c) => rec.categories.add(c));
            (p.topicIds || []).forEach((t) => rec.topicIds.add(t));
            (p.authors || []).forEach((o) => { if (authorKey(o.name) !== key) rec.coauthors.add(o.name); });
            if (!rec.affiliation && a.affiliation) rec.affiliation = a.affiliation;
            map.set(key, rec);
        });
    });

    return Array.from(map.values()).map((rec) => {
        const dates = rec.papers
            .map((p) => new Date(p.firstSeen || p.published).getTime())
            .sort((a, b) => a - b);
        const recentCount = rec.papers.filter(
            (p) => new Date(p.firstSeen || p.published).getTime() > Date.now() - 30 * 864e5,
        ).length;
        return {
            ...rec,
            count: rec.papers.length,
            recentCount,
            first: dates.length ? new Date(dates[0]).toISOString() : null,
            last: dates.length ? new Date(dates[dates.length - 1]).toISOString() : null,
            followed: !!(followed[rec.key] && followed[rec.key].followedAt),
            categories: Array.from(rec.categories),
            topicIds: Array.from(rec.topicIds),
            coauthors: Array.from(rec.coauthors),
        };
    }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
