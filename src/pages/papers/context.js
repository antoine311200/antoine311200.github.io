/**
 * The Paper Radar store.
 *
 * One reducer owns everything; the provider persists it to localStorage on a debounce
 * and exposes the derived views (TF-IDF index, author roll-up) that several screens
 * need but nobody should recompute per render.
 */

import React, {
    createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, useCallback,
} from 'react';

import {
    loadStore, saveStore, emptyStore, makeTopic, emptyState, authorKey,
    STARTER_TOPICS, mergeStores, prune as pruneStore, DEFAULT_SETTINGS,
} from './storage';
import { searchTopic as searchArxiv, setPreferredStrategy } from './arxiv';
import { searchTopic as searchOpenAlex } from './openalex';
import { rescoreAll, learnFrom, buildIndex, authorStats } from './scoring';
import { enrichPapers } from './enrich';

const PaperContext = createContext(null);
export const usePapers = () => useContext(PaperContext);

const todayKey = () => new Date().toISOString().slice(0, 10);

/** Everything scoring depends on, in one object. */
const scoringCtx = (s) => ({
    topics: s.topics,
    authors: s.authors,
    feedback: s.feedback,
    halfLife: s.settings.recencyHalfLife,
});

const rescore = (s) => ({ ...s, papers: rescoreAll(s.papers, scoringCtx(s)) });

function reducer(state, action) {
    switch (action.type) {
        case 'HYDRATE':
            return action.store;

        case 'SETTINGS': {
            const next = { ...state, settings: { ...state.settings, ...action.patch } };
            return action.patch.recencyHalfLife !== undefined ? rescore(next) : next;
        }

        /* ------------------------------------------------------------- topics */

        case 'TOPIC_ADD':
            return rescore({ ...state, topics: [...state.topics, makeTopic(action.topic)] });

        case 'TOPIC_UPDATE':
            return rescore({
                ...state,
                topics: state.topics.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t)),
            });

        case 'TOPIC_REMOVE': {
            const papers = {};
            Object.entries(state.papers).forEach(([id, p]) => {
                papers[id] = { ...p, topicIds: (p.topicIds || []).filter((t) => t !== action.id) };
            });
            return rescore({ ...state, topics: state.topics.filter((t) => t.id !== action.id), papers });
        }

        case 'TOPIC_REORDER': {
            const topics = [...state.topics];
            const [moved] = topics.splice(action.from, 1);
            topics.splice(action.to, 0, moved);
            return { ...state, topics };
        }

        /* ------------------------------------------------------------ ingestion */

        /**
         * The heart of "never fetch the same paper twice": entries already in the
         * store keep their original `firstSeen` (so the day they landed in never
         * changes) and only gain the new topic association. A bumped arXiv version
         * is recorded as a revision rather than a new paper.
         */
        case 'INGEST': {
            const at = action.at || new Date().toISOString();
            const papers = { ...state.papers };
            let added = 0;
            let revised = 0;

            action.entries.forEach((entry) => {
                const prev = papers[entry.id];
                if (prev) {
                    const topicIds = Array.from(new Set([...(prev.topicIds || []), action.topicId].filter(Boolean)));
                    const isNewer = entry.version > (prev.version || 1);
                    if (isNewer) revised += 1;
                    papers[entry.id] = {
                        ...prev,
                        ...(isNewer ? { ...entry, version: entry.version, revisedAt: at } : {}),
                        firstSeen: prev.firstSeen,
                        topicIds,
                    };
                } else {
                    added += 1;
                    papers[entry.id] = { ...entry, firstSeen: at, topicIds: [action.topicId].filter(Boolean) };
                }
            });

            const topics = state.topics.map((t) => (
                t.id === action.topicId ? { ...t, lastFetch: at, newCount: added } : t
            ));

            const day = at.slice(0, 10);
            const history = [...state.history];
            const idx = history.findIndex((h) => h.date === day);
            const entryHist = idx >= 0 ? history[idx] : { date: day, fetched: 0, kept: 0, revised: 0 };
            const merged = {
                ...entryHist,
                fetched: entryHist.fetched + action.entries.length,
                kept: entryHist.kept + added,
                revised: (entryHist.revised || 0) + revised,
            };
            if (idx >= 0) history[idx] = merged; else history.push(merged);

            return rescore({ ...state, papers, topics, history });
        }

        /* ------------------------------------------------------- reading state */

        case 'PAPER_STATE': {
            const prev = state.states[action.id] || emptyState();
            const next = { ...prev, ...action.patch, updatedAt: Date.now() };
            if (action.patch.status === 'read' && prev.status !== 'read') next.readAt = new Date().toISOString();
            if (action.patch.status === 'queued' && prev.status !== 'queued') next.queuedAt = new Date().toISOString();
            return { ...state, states: { ...state.states, [action.id]: next } };
        }

        case 'PAPER_STATE_BULK': {
            const states = { ...state.states };
            action.ids.forEach((id) => {
                const prev = states[id] || emptyState();
                states[id] = { ...prev, ...action.patch, updatedAt: Date.now() };
            });
            return { ...state, states };
        }

        case 'LEARN':
            return rescore({
                ...state,
                feedback: learnFrom(state.feedback, action.paper, action.direction),
            });

        case 'FEEDBACK_RESET':
            return rescore({ ...state, feedback: { terms: {} } });

        /* -------------------------------------------------------------- authors */

        case 'AUTHOR_TOGGLE': {
            const key = authorKey(action.name);
            const authors = { ...state.authors };
            if (authors[key] && authors[key].followedAt) delete authors[key];
            else authors[key] = { name: action.name, followedAt: new Date().toISOString(), note: '' };
            return rescore({ ...state, authors });
        }

        case 'AUTHOR_PATCH': {
            const key = authorKey(action.name);
            const prev = state.authors[key] || { name: action.name, followedAt: null, note: '' };
            return { ...state, authors: { ...state.authors, [key]: { ...prev, ...action.patch } } };
        }

        /* ---------------------------------------------------------- collections */

        case 'COLLECTION_ADD':
            return {
                ...state,
                collections: [...state.collections, {
                    id: `c_${Math.random().toString(36).slice(2, 10)}`,
                    name: action.name,
                    description: '',
                    paperIds: action.paperIds || [],
                    createdAt: new Date().toISOString(),
                }],
            };

        case 'COLLECTION_UPDATE':
            return {
                ...state,
                collections: state.collections.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)),
            };

        case 'COLLECTION_REMOVE':
            return { ...state, collections: state.collections.filter((c) => c.id !== action.id) };

        case 'COLLECTION_TOGGLE_PAPERS':
            return {
                ...state,
                collections: state.collections.map((c) => {
                    if (c.id !== action.id) return c;
                    const set = new Set(c.paperIds);
                    const allIn = action.paperIds.every((p) => set.has(p));
                    action.paperIds.forEach((p) => (allIn ? set.delete(p) : set.add(p)));
                    return { ...c, paperIds: Array.from(set) };
                }),
            };

        /* ------------------------------------------------------------ wholesale */

        case 'ENRICHED': {
            const papers = { ...state.papers };
            Object.entries(action.data).forEach(([id, payload]) => {
                if (papers[id]) papers[id] = { ...papers[id], enriched: payload };
            });
            action.attempted.forEach((id) => {
                if (papers[id] && !papers[id].enriched) {
                    papers[id] = { ...papers[id], enriched: { at: new Date().toISOString(), miss: true } };
                }
            });
            return { ...state, papers };
        }

        case 'IMPORT':
            return rescore(mergeStores(state, action.store, action.mode));

        case 'PRUNE':
            return { ...state, ...pruneStore(state, action.options).store };

        case 'RESET':
            return { ...emptyStore(), topics: state.topics };

        case 'VISIT':
            return { ...state, lastVisit: action.at };

        default:
            return state;
    }
}

function bootstrap() {
    const saved = loadStore();
    if (saved) return saved;
    const fresh = emptyStore();
    fresh.topics = STARTER_TOPICS.map((t) => makeTopic(t));
    return fresh;
}

export function PaperProvider({ children }) {
    const [state, dispatch] = useReducer(reducer, undefined, bootstrap);

    // Fetch progress / errors live outside the persisted store.
    const [fetchState, setFetchState] = useState({ running: false, topic: null, done: 0, total: 0, log: [] });
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);
    const abortRef = useRef(null);
    const saveTimer = useRef(null);
    const previousVisit = useRef(state.lastVisit);

    useEffect(() => setPreferredStrategy(state.settings.proxy), [state.settings.proxy]);

    // Debounced persistence — a burst of keyboard triage writes once.
    useEffect(() => {
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
            const res = saveStore(state);
            if (!res.ok) {
                setError(`Could not save to localStorage (${res.error}). Export your data, then prune the library in Settings.`);
            }
        }, 400);
        return () => clearTimeout(saveTimer.current);
    }, [state]);

    // Record this visit once, so "new since last visit" has something to compare to.
    useEffect(() => {
        const t = setTimeout(() => dispatch({ type: 'VISIT', at: new Date().toISOString() }), 4000);
        return () => clearTimeout(t);
    }, []);

    const notify = useCallback((message) => {
        setToast({ message, at: Date.now() });
        setTimeout(() => setToast((t) => (t && Date.now() - t.at >= 2400 ? null : t)), 2600);
    }, []);

    /* ------------------------------------------------------------- fetching */

    const fetchTopics = useCallback(async (topicIds) => {
        const targets = state.topics.filter(
            (t) => (topicIds ? topicIds.includes(t.id) : t.enabled),
        );
        if (!targets.length) {
            setError('No enabled topic to fetch. Add one in Topics.');
            return;
        }

        abortRef.current = new AbortController();
        setError(null);
        setFetchState({ running: true, topic: targets[0].name, done: 0, total: targets.length, log: [] });

        const useOpenAlex = state.settings.source !== 'arxiv';
        const log = [];
        // `state.papers` is a stale closure across the loop, so track what we have
        // seen ourselves — otherwise topic 2 would re-count topic 1's arrivals as new.
        const seen = new Set(Object.keys(state.papers));

        for (let i = 0; i < targets.length; i += 1) {
            const topic = targets[i];
            setFetchState((f) => ({ ...f, topic: topic.name, done: i }));
            try {
                const max = topic.maxResults || state.settings.maxResultsPerTopic;
                const { entries, total, strategy, ignoredCategories } = useOpenAlex
                    ? await searchOpenAlex(topic, {
                        max,
                        sinceDays: state.settings.lookbackDays,
                        mailto: state.settings.openAlexMailto,
                        signal: abortRef.current.signal,
                    })
                    : await searchArxiv(topic, {
                        max,
                        strategy: state.settings.proxy,
                        signal: abortRef.current.signal,
                    });
                const known = entries.filter((e) => seen.has(e.id)).length;
                entries.forEach((e) => seen.add(e.id));
                dispatch({ type: 'INGEST', entries, topicId: topic.id });
                log.push({
                    topic: topic.name,
                    ok: true,
                    fetched: entries.length,
                    fresh: entries.length - known,
                    total,
                    strategy,
                    ignoredCategories,
                });
            } catch (err) {
                if (err.name === 'AbortError') { log.push({ topic: topic.name, ok: false, message: 'cancelled' }); break; }
                log.push({ topic: topic.name, ok: false, message: err.message });
            }
            setFetchState((f) => ({ ...f, log: [...log] }));
            // arXiv asks for ~3s between programmatic calls; OpenAlex does not.
            if (i < targets.length - 1) await new Promise((r) => setTimeout(r, useOpenAlex ? 350 : 3000));
        }

        const fresh = log.reduce((n, l) => n + (l.fresh || 0), 0);
        const failed = log.filter((l) => !l.ok);
        setFetchState({ running: false, topic: null, done: targets.length, total: targets.length, log });
        if (failed.length === targets.length) {
            const hint = useOpenAlex
                ? 'Check your connection, or switch the source in Settings.'
                : 'arXiv sends no CORS headers to browsers and the public relays are unreliable — '
                  + 'switch the source back to OpenAlex in Settings.';
            setError(`Every topic failed. ${failed[0].message}. ${hint}`);
        } else {
            notify(fresh ? `${fresh} new paper${fresh === 1 ? '' : 's'}` : 'No new papers — you are up to date');
        }
    }, [state.topics, state.settings, state.papers, notify]);

    const cancelFetch = useCallback(() => {
        if (abortRef.current) abortRef.current.abort();
        setFetchState((f) => ({ ...f, running: false }));
    }, []);

    /* ----------------------------------------------------------- enrichment */

    const enrich = useCallback(async (ids) => {
        const pending = (ids || Object.keys(state.papers)).filter((id) => {
            const p = state.papers[id];
            return p && !p.enriched;
        }).slice(0, 300);
        if (!pending.length) { notify('Nothing left to enrich'); return; }
        try {
            notify(`Looking up ${pending.length} paper${pending.length === 1 ? '' : 's'}…`);
            const data = await enrichPapers(pending);
            dispatch({ type: 'ENRICHED', data, attempted: pending });
            notify(`Enriched ${Object.keys(data).length} of ${pending.length}`);
        } catch (err) {
            setError(err.message);
        }
    }, [state.papers, notify]);

    /* ------------------------------------------------------- derived values */

    const paperList = useMemo(() => Object.values(state.papers), [state.papers]);

    const index = useMemo(() => buildIndex(state.papers), [state.papers]);

    const authorsIndex = useMemo(
        () => authorStats(state.papers, state.authors),
        [state.papers, state.authors],
    );

    const followedIds = useMemo(() => {
        const keys = new Set(Object.keys(state.authors).filter((k) => state.authors[k].followedAt));
        if (!keys.size) return new Set();
        const ids = new Set();
        paperList.forEach((p) => {
            if ((p.authors || []).some((a) => keys.has(authorKey(a.name)))) ids.add(p.id);
        });
        return ids;
    }, [state.authors, paperList]);

    const counts = useMemo(() => {
        const today = todayKey();
        const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
        let unread = 0;
        let queued = 0;
        let starred = 0;
        let readCount = 0;
        let todayCount = 0;
        let yesterdayCount = 0;
        paperList.forEach((p) => {
            const st = state.states[p.id];
            const status = (st && st.status) || 'unread';
            if (status === 'unread') unread += 1;
            if (status === 'queued') queued += 1;
            if (status === 'read') readCount += 1;
            if (st && st.starred) starred += 1;
            const day = (p.firstSeen || p.published || '').slice(0, 10);
            if (day === today) todayCount += 1;
            if (day === yesterday) yesterdayCount += 1;
        });
        return {
            total: paperList.length,
            unread,
            queued,
            starred,
            read: readCount,
            today: todayCount,
            yesterday: yesterdayCount,
            followed: followedIds.size,
            authors: authorsIndex.length,
            following: authorsIndex.filter((a) => a.followed).length,
        };
    }, [paperList, state.states, followedIds, authorsIndex]);

    const value = useMemo(() => ({
        ...state,
        raw: state,
        dispatch,
        paperList,
        index,
        authorsIndex,
        followedIds,
        counts,
        fetchState,
        fetchTopics,
        cancelFetch,
        enrich,
        error,
        setError,
        toast,
        notify,
        previousVisit: previousVisit.current,
        stateOf: (id) => state.states[id] || emptyState(),
        topicById: (id) => state.topics.find((t) => t.id === id),
        defaults: DEFAULT_SETTINGS,
    }), [
        state, paperList, index, authorsIndex, followedIds, counts,
        fetchState, fetchTopics, cancelFetch, enrich, error, toast, notify,
    ]);

    return <PaperContext.Provider value={value}>{children}</PaperContext.Provider>;
}
