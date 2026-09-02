/**
 * The Paper Radar store.
 *
 * One reducer owns everything; the provider persists it to localStorage on a debounce
 * and exposes the derived values (TF-IDF index, counts) that several screens need
 * but nobody should recompute per render.
 */

import React, {
    createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, useCallback,
} from 'react';

import {
    loadStore, saveStore, clearStore, emptyStore, makeTopic, makeFolder, emptyState, authorKey,
    STARTER_TOPICS, mergeStores, prune as pruneStore, DEFAULT_SETTINGS,
    folderSubtree, canMoveFolder,
} from './storage';
import { searchTopic as searchArxiv, setPreferredStrategy } from './arxiv';
import { searchTopic as searchOpenAlex } from './openalex';
import { loadManifest, loadRun, sortIntoTopics } from './feed';
import { rescoreAll, learnFrom, buildIndex } from './scoring';
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
                    papers[entry.id] = {
                        ...entry,
                        firstSeen: at,
                        topicIds: [action.topicId].filter(Boolean),
                        // How it first arrived: swept up by a topic, or looked up
                        // by hand. A paper a topic later matches keeps this, but
                        // gains the topic's chips, which is the honest account.
                        origin: action.origin || 'topic',
                    };
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

        case 'FEED_SEEN':
            return {
                ...state,
                feedSeen: Array.from(new Set([...(state.feedSeen || []), ...action.files])).slice(-120),
            };

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

        case 'FOLDER_ADD':
            return {
                ...state,
                folders: [...state.folders, action.folder ? makeFolder(action.folder) : makeFolder({
                    name: action.name,
                    parentId: action.parentId || null,
                    paperIds: action.paperIds || [],
                })],
            };

        case 'FOLDER_UPDATE':
            return {
                ...state,
                folders: state.folders.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)),
            };

        /** Deleting a folder deletes its descendants; papers themselves are untouched. */
        case 'FOLDER_REMOVE': {
            const doomed = new Set(folderSubtree(state.folders, action.id));
            return { ...state, folders: state.folders.filter((c) => !doomed.has(c.id)) };
        }

        case 'FOLDER_MOVE':
            if (!canMoveFolder(state.folders, action.id, action.parentId)) return state;
            return {
                ...state,
                folders: state.folders.map((c) => (
                    c.id === action.id ? { ...c, parentId: action.parentId || null } : c
                )),
            };

        case 'FOLDER_TOGGLE_PAPERS':
            return {
                ...state,
                folders: state.folders.map((c) => {
                    if (c.id !== action.id) return c;
                    const set = new Set(c.paperIds);
                    const allIn = action.paperIds.every((p) => set.has(p));
                    action.paperIds.forEach((p) => (allIn ? set.delete(p) : set.add(p)));
                    return { ...c, paperIds: Array.from(set) };
                }),
            };

        /**
         * File papers into a folder.
         *
         * `from` names the folder they were dragged out of, and only that folder loses
         * them — a paper can legitimately sit in both "Chapter 2" and "Reading group",
         * so a move must not evict it from everywhere. Omit `from` (a copy, or a drag
         * out of the read-only Stream) and nothing is removed.
         */
        case 'FOLDER_FILE_PAPERS': {
            const moving = new Set(action.paperIds);
            return {
                ...state,
                folders: state.folders.map((c) => {
                    if (c.id === action.id) {
                        return { ...c, paperIds: Array.from(new Set([...c.paperIds, ...action.paperIds])) };
                    }
                    if (action.from && c.id === action.from) {
                        return { ...c, paperIds: c.paperIds.filter((p) => !moving.has(p)) };
                    }
                    return c;
                }),
            };
        }

        case 'FOLDER_REMOVE_PAPERS':
            return {
                ...state,
                folders: state.folders.map((c) => (
                    c.id === action.id
                        ? { ...c, paperIds: c.paperIds.filter((p) => !action.paperIds.includes(p)) }
                        : c
                )),
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

function freshStore() {
    const fresh = emptyStore();
    fresh.topics = STARTER_TOPICS.map((t) => makeTopic(t));
    return fresh;
}

export function PaperProvider({ children }) {
    // IndexedDB reads are async, so the store hydrates one tick after mount. Until it
    // lands we hold an empty store and render a placeholder rather than a wrong one —
    // saving before hydration would otherwise clobber the real library with defaults.
    const [state, dispatch] = useReducer(reducer, undefined, emptyStore);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        let alive = true;
        loadStore()
            .then((saved) => {
                if (!alive) return;
                dispatch({ type: 'HYDRATE', store: saved || freshStore() });
                setHydrated(true);
            })
            .catch(() => { if (alive) { dispatch({ type: 'HYDRATE', store: freshStore() }); setHydrated(true); } });
        return () => { alive = false; };
    }, []);

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
        if (!hydrated) return undefined;
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
            saveStore(state).then((res) => {
                if (!res.ok) {
                    setError(`Could not save your library (${res.error}). Export it from Settings before adding more.`);
                }
            });
        }, 400);
        return () => clearTimeout(saveTimer.current);
    }, [hydrated, state]);

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

    /**
     * Take in whatever the scheduled job has left in public/arxiv since last
     * time. There is no network cost worth speaking of and no allowance to
     * spend, so the only thing being tracked is which runs have already been
     * read — the app's oldest promise is that a day is never fetched twice.
     */
    const fetchFromFeed = useCallback(async (topicIds) => {
        const targets = state.topics.filter((t) => (topicIds ? topicIds.includes(t.id) : t.enabled));
        if (!targets.length) {
            setError('No enabled topic to sort the feed into. Add one in Topics.');
            return;
        }

        setError(null);
        setFetchState({ running: true, topic: 'the daily feed', done: 0, total: 1, log: [] });
        const startedAt = Date.now();

        try {
            const manifest = await loadManifest();
            const seen = new Set(state.feedSeen || []);
            const fresh = manifest.runs.filter((r) => !seen.has(r.file));

            if (!fresh.length) {
                setFetchState({ running: false, topic: null, done: 1, total: 1, log: [] });
                notify(manifest.runs.length
                    ? 'Nothing new since the last run of the feed'
                    : 'The feed is empty — has the workflow run yet?');
                return;
            }

            const log = [];
            let added = 0;
            for (let i = 0; i < fresh.length; i += 1) {
                const run = fresh[i];
                setFetchState((f) => ({ ...f, topic: `feed · ${run.date}`, done: i, total: fresh.length }));
                try {
                    const entries = await loadRun(run.file);
                    const { byTopic, matched, seen: total } = sortIntoTopics(entries, targets);
                    targets.forEach((topic) => {
                        const mine = byTopic.get(topic.id) || [];
                        if (mine.length) dispatch({ type: 'INGEST', entries: mine, topicId: topic.id });
                    });
                    added += matched;
                    log.push({ topic: run.date, ok: true, fetched: total, fresh: matched });
                } catch (err) {
                    log.push({ topic: run.date, ok: false, message: err.message });
                }
                setFetchState((f) => ({ ...f, log: [...log] }));
            }

            dispatch({ type: 'FEED_SEEN', files: fresh.map((r) => r.file) });

            const elapsed = Date.now() - startedAt;
            if (elapsed < 900) await new Promise((r) => setTimeout(r, 900 - elapsed));
            setFetchState({ running: false, topic: null, done: fresh.length, total: fresh.length, log });
            notify(added
                ? `${added} paper${added === 1 ? '' : 's'} from ${fresh.length} feed run${fresh.length === 1 ? '' : 's'}`
                : 'Nothing in the feed matched your topics');
        } catch (err) {
            setFetchState({ running: false, topic: null, done: 0, total: 0, log: [] });
            setError(err.code === 'NO_FEED'
                ? 'No prefetched feed on this site yet. It appears once .github/workflows/arxiv.yml has run — '
                  + 'trigger it by hand from the Actions tab, or switch the source back to OpenAlex in Settings.'
                : err.message);
        }
    }, [state.topics, state.feedSeen, notify]);

    const fetchLive = useCallback(async (topicIds) => {
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
        // A cached or stubbed source can answer in tens of milliseconds; without a
        // floor the progress banner flashes past and the fetch looks like it did not
        // happen at all.
        const startedAt = Date.now();
        const MIN_VISIBLE_MS = 900;

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

        const elapsed = Date.now() - startedAt;
        if (elapsed < MIN_VISIBLE_MS) await new Promise((r) => setTimeout(r, MIN_VISIBLE_MS - elapsed));

        const fresh = log.reduce((n, l) => n + (l.fresh || 0), 0);
        const failed = log.filter((l) => !l.ok);
        setFetchState({ running: false, topic: null, done: targets.length, total: targets.length, log });
        if (failed.length === targets.length) {
            const first = String(failed[0].message || '').replace(/\.$/, '');
            // A spent allowance already explains itself and says when it comes
            // back; telling someone to check their connection on top of that
            // sends them looking for a fault that is not there.
            const explained = /allowance|resets at midnight/i.test(first);
            const hint = explained
                ? ''
                : useOpenAlex
                    ? ' Check your connection, or switch the source in Settings.'
                    : ' arXiv sends no CORS headers to browsers and the public relays are unreliable — '
                      + 'switch the source back to OpenAlex in Settings.';
            setError(`${explained ? '' : 'Every topic failed. '}${first}.${hint}`);
        } else {
            notify(fresh ? `${fresh} new paper${fresh === 1 ? '' : 's'}` : 'No new papers — you are up to date');
        }
    }, [state.topics, state.settings, state.papers, notify]);

    /* One entry point: which source answers is a setting, not the caller's problem. */
    const fetchTopics = useCallback(
        (topicIds) => (state.settings.source === 'feed' ? fetchFromFeed(topicIds) : fetchLive(topicIds)),
        [state.settings.source, fetchFromFeed, fetchLive],
    );

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
            filed: new Set(state.folders.flatMap((f) => f.paperIds)).size,
            following: Object.values(state.authors).filter((a) => a.followedAt).length,
        };
    }, [paperList, state.states, state.folders, state.authors, followedIds]);

    const resetAll = useCallback(async () => {
        await clearStore();
        dispatch({ type: 'RESET' });
    }, []);

    const value = useMemo(() => ({
        ...state,
        raw: state,
        hydrated,
        dispatch,
        resetAll,
        paperList,
        index,
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
        state, hydrated, paperList, index, followedIds, counts,
        fetchState, fetchTopics, cancelFetch, enrich, error, toast, notify, resetAll,
    ]);

    return <PaperContext.Provider value={value}>{children}</PaperContext.Provider>;
}
