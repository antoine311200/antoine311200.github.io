import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { PaperProvider, usePapers } from './context';
import { authorKey } from './storage';
import Digest from './views/Digest';
import Library from './views/Library';
import Topics from './views/Topics';
import Authors from './views/Authors';
import Graph from './views/Graph';
import Stats from './views/Stats';
import Settings from './views/Settings';
import Workspace from './components/Workspace';
import { Button, Modal, cx, PAGE_BACKGROUND } from './components/ui';

/* ---------------------------------------------------------------- navigation */

const NAV = [
    { id: 'digest', label: 'Digest', key: 'd', badge: (c) => c.today || null, icon: '◈' },
    { id: 'queue', label: 'Queue', key: 'u', badge: (c) => c.queued || null, icon: '≡' },
    { id: 'library', label: 'Library', key: 'l', badge: (c) => c.total || null, icon: '▤' },
    { id: 'starred', label: 'Starred', key: 'b', badge: (c) => c.starred || null, icon: '★' },
    { id: 'following', label: 'Following', key: 'f', badge: (c) => c.followed || null, icon: '◉' },
    { id: 'topics', label: 'Topics', key: 't', icon: '◇' },
    { id: 'authors', label: 'Authors', key: 'a', icon: '◎' },
    { id: 'graph', label: 'Relations', key: 'g', icon: '◍' },
    { id: 'stats', label: 'Statistics', key: 's', icon: '◫' },
    { id: 'settings', label: 'Settings', key: ',', icon: '⚙' },
];

const PAGE_VIEWS = new Set(['topics', 'authors', 'stats', 'settings']);

const SHORTCUTS = [
    ['Navigation', [
        ['j / ↓', 'next paper'], ['k / ↑', 'previous paper'], ['o / Enter', 'open detail panel'],
        ['O', 'open on arXiv'], ['p', 'open the PDF'], ['Esc', 'close panel / clear selection'],
    ]],
    ['Triage', [
        ['s', 'star (teaches the ranker)'], ['q', 'add to reading queue'], ['r', 'mark read'],
        ['e', 'archive'], ['x', 'dismiss (teaches the ranker)'], ['Space', 'select for bulk action'],
    ]],
    ['Going places', [
        ['/', 'focus search'], ['g then d', 'digest'], ['g then l', 'library'], ['g then u', 'queue'],
        ['g then a', 'authors'], ['g then g', 'relations'], ['g then s', 'statistics'],
        ['R', 'fetch all topics'], ['?', 'this help'],
    ]],
];

/* --------------------------------------------------------------------- shell */

function Shell() {
    const {
        counts, topics, collections, dispatch, fetchTopics, fetchState, cancelFetch,
        error, setError, toast, settings, enrich, papers,
    } = usePapers();

    const [view, setView] = useState('digest');
    const [authorFilter, setAuthorFilter] = useState(null);
    const [help, setHelp] = useState(false);
    const [navOpen, setNavOpen] = useState(false);
    const [gPending, setGPending] = useState(false);

    const go = useCallback((id) => {
        setAuthorFilter(null);
        setView(id);
        setNavOpen(false);
    }, []);

    const openAuthor = useCallback((key) => {
        setAuthorFilter(key);
        setView('author');
    }, []);

    /* --------------------------------------------- once-a-day auto fetch */
    useEffect(() => {
        if (!settings.autoFetchOnOpen) return;
        const today = new Date().toISOString().slice(0, 10);
        const stale = topics.filter((t) => t.enabled && String(t.lastFetch || '').slice(0, 10) !== today);
        if (!stale.length || fetchState.running) return;
        const timer = setTimeout(() => fetchTopics(stale.map((t) => t.id)), 900);
        return () => clearTimeout(timer);
        // Intentionally runs only on mount: this is the "first visit of the day" pull.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ---------------------------------------- enrichment of newly arrived */
    useEffect(() => {
        if (!settings.enrich || fetchState.running) return;
        const pending = Object.values(papers).filter((p) => !p.enriched).map((p) => p.id);
        if (pending.length < 1) return;
        const timer = setTimeout(() => enrich(pending.slice(0, 100)), 2500);
        return () => clearTimeout(timer);
    }, [settings.enrich, fetchState.running, papers, enrich]);

    /* ------------------------------------------------ global shortcuts */
    useEffect(() => {
        const onKey = (e) => {
            const tag = (e.target.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;

            if (e.key === '?') { setHelp((h) => !h); return; }
            if (e.key === 'R') { fetchTopics(); return; }
            if (e.key === 'g') { setGPending(true); setTimeout(() => setGPending(false), 1200); return; }
            if (gPending) {
                const target = NAV.find((n) => n.key === e.key);
                setGPending(false);
                if (target) { e.preventDefault(); go(target.id); }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [gPending, go, fetchTopics]);

    // Recover the display spelling of a followed author from any paper they appear on.
    const authorName = useMemo(() => {
        if (!authorFilter) return '';
        for (const p of Object.values(papers)) {
            const hit = (p.authors || []).find((a) => authorKey(a.name) === authorFilter);
            if (hit) return hit.name;
        }
        return authorFilter;
    }, [authorFilter, papers]);

    // Memoised so the author workspace does not refilter on every store change.
    const authorLock = useMemo(() => ({ authorKey: authorFilter }), [authorFilter]);

    const body = () => {
        switch (view) {
            case 'digest': return <Digest onGo={go} />;
            case 'queue': return <Library preset="queue" />;
            case 'library': return <Library preset="all" />;
            case 'starred': return <Library preset="starred" />;
            case 'following': return <Library preset="following" />;
            case 'topics': return <Topics />;
            case 'authors': return <Authors onOpenAuthor={openAuthor} />;
            case 'graph': return <Graph onOpenAuthor={openAuthor} />;
            case 'stats': return <Stats onGo={go} />;
            case 'settings': return <Settings />;
            case 'author': return (
                <Workspace
                    key={authorFilter}
                    title={authorName}
                    subtitle="Everything by this author in your library"
                    lockedFilters={authorLock}
                    initialFilters={{ sort: 'newest', hideArchived: false, hideDismissed: false }}
                    headerExtra={<Button onClick={() => go('authors')}>← All authors</Button>}
                />
            );
            default: return <Digest onGo={go} />;
        }
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden text-slate-300" style={PAGE_BACKGROUND}>
            {/* ------------------------------------------------------ sidebar */}
            <nav className={cx(
                'z-30 flex w-56 flex-none flex-col border-r border-slate-800 bg-slate-950/60 backdrop-blur-sm',
                'max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:shadow-2xl max-lg:transition-transform',
                !navOpen && 'max-lg:-translate-x-full',
            )}>
                <div className="flex items-center gap-2 px-4 py-4">
                    <span className="text-lg leading-none text-orange-400">◈</span>
                    <div className="min-w-0">
                        <h1 className="truncate text-sm font-semibold text-slate-100">Paper Radar</h1>
                        <Link to="/" className="text-[10px] text-slate-500 transition hover:text-orange-300">
                            ← antoine debouchage
                        </Link>
                    </div>
                </div>

                <div className="px-3">
                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full justify-center"
                        onClick={() => (fetchState.running ? cancelFetch() : fetchTopics())}
                    >
                        {fetchState.running ? 'Cancel fetch' : 'Fetch new papers'}
                    </Button>
                    {fetchState.running && (
                        <div className="mt-2">
                            <div className="h-0.5 overflow-hidden rounded-full bg-slate-800">
                                <div
                                    className="h-full bg-orange-400 transition-all duration-500"
                                    style={{ width: `${((fetchState.done + 0.5) / Math.max(1, fetchState.total)) * 100}%` }}
                                />
                            </div>
                            <p className="mt-1 truncate text-[10px] text-slate-500">
                                {fetchState.topic} · {fetchState.done + 1}/{fetchState.total}
                            </p>
                        </div>
                    )}
                </div>

                <ul className="mt-4 space-y-0.5 px-2">
                    {NAV.map((item) => {
                        const badge = item.badge ? item.badge(counts) : null;
                        const active = view === item.id || (view === 'author' && item.id === 'authors');
                        return (
                            <li key={item.id}>
                                <button
                                    type="button"
                                    onClick={() => go(item.id)}
                                    className={cx(
                                        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] transition',
                                        active
                                            ? 'bg-orange-400/[0.12] text-orange-200'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
                                    )}
                                >
                                    <span className={cx('w-3.5 text-center text-[11px]', active ? 'text-orange-300' : 'text-slate-600')}>
                                        {item.icon}
                                    </span>
                                    <span className="flex-1 truncate">{item.label}</span>
                                    {badge != null && (
                                        <span className={cx(
                                            'rounded px-1 font-mono text-[9.5px] tabular-nums',
                                            active ? 'bg-orange-400/20 text-orange-100' : 'bg-slate-800 text-slate-500',
                                        )}>
                                            {badge > 999 ? `${(badge / 1000).toFixed(1)}k` : badge}
                                        </span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>

                {topics.length > 0 && (
                    <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-2">
                        <h2 className="px-2.5 pb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                            Topics
                        </h2>
                        <ul className="space-y-0.5">
                            {topics.map((t) => (
                                <li key={t.id}>
                                    <button
                                        type="button"
                                        onClick={() => go('topics')}
                                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1 text-left text-[11.5px] text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
                                    >
                                        <span
                                            className={cx('h-1.5 w-1.5 flex-none rounded-full', !t.enabled && 'opacity-30')}
                                            style={{ backgroundColor: t.color }}
                                        />
                                        <span className="truncate">{t.name}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-4 flex items-center justify-between px-2.5 pb-1.5">
                            <h2 className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                                Collections
                            </h2>
                            <button
                                type="button"
                                title="New collection"
                                onClick={() => {
                                    // eslint-disable-next-line no-alert
                                    const name = window.prompt('Name this collection');
                                    if (name) dispatch({ type: 'COLLECTION_ADD', name: name.trim() });
                                }}
                                className="text-slate-600 transition hover:text-orange-300"
                            >
                                +
                            </button>
                        </div>
                        <ul className="space-y-0.5 pb-4">
                            {collections.map((c) => (
                                <li key={c.id}>
                                    <button
                                        type="button"
                                        onClick={() => go('library')}
                                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1 text-left text-[11.5px] text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
                                    >
                                        <span className="truncate">{c.name}</span>
                                        <span className="ml-auto font-mono text-[9.5px] text-slate-700">{c.paperIds.length}</span>
                                    </button>
                                </li>
                            ))}
                            {!collections.length && (
                                <li className="px-2.5 text-[10px] leading-relaxed text-slate-700">
                                    Group papers for a seminar or a chapter.
                                </li>
                            )}
                        </ul>
                    </div>
                )}

                <div className="mt-auto border-t border-slate-800 px-3 py-2.5">
                    <button
                        type="button"
                        onClick={() => setHelp(true)}
                        className="text-[10.5px] text-slate-600 transition hover:text-orange-300"
                    >
                        ? keyboard shortcuts
                    </button>
                </div>
            </nav>

            {navOpen && (
                <div className="fixed inset-0 z-20 bg-slate-950/70 lg:hidden" onClick={() => setNavOpen(false)} />
            )}

            {/* --------------------------------------------------------- main */}
            <main className="flex min-w-0 flex-1 flex-col">
                <button
                    type="button"
                    onClick={() => setNavOpen(true)}
                    className="absolute left-3 top-3 z-10 rounded-lg border border-slate-700 bg-slate-900/90 px-2 py-1 text-xs text-slate-300 backdrop-blur lg:hidden"
                >
                    ☰
                </button>

                {error && (
                    <div className="flex flex-none items-start gap-3 border-b border-rose-500/25 bg-rose-500/[0.08] px-5 py-2.5">
                        <span className="text-rose-400">!</span>
                        <p className="flex-1 text-[11.5px] leading-relaxed text-rose-200">{error}</p>
                        <button type="button" onClick={() => setError(null)} className="text-rose-300/60 hover:text-rose-200">✕</button>
                    </div>
                )}

                <div className={cx(
                    'min-h-0 flex-1',
                    PAGE_VIEWS.has(view) ? 'overflow-y-auto' : 'overflow-hidden',
                )}>
                    {body()}
                </div>
            </main>

            {toast && (
                <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-slate-700 bg-slate-900/95 px-4 py-2 text-xs text-slate-200 shadow-xl shadow-black/40 backdrop-blur">
                    {toast.message}
                </div>
            )}

            <Modal open={help} onClose={() => setHelp(false)} title="Keyboard shortcuts" width="max-w-2xl">
                <div className="grid gap-5 sm:grid-cols-3">
                    {SHORTCUTS.map(([group, rows]) => (
                        <div key={group}>
                            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{group}</h3>
                            <dl className="space-y-1.5">
                                {rows.map(([keys, what]) => (
                                    <div key={keys} className="flex items-baseline gap-2">
                                        <dt className="flex-none rounded border border-slate-700 bg-slate-800/60 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                                            {keys}
                                        </dt>
                                        <dd className="text-[11px] text-slate-500">{what}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    );
}

export default function PaperSearch() {
    useEffect(() => {
        document.title = 'Paper Radar | Antoine Debouchage';
    }, []);

    return (
        <PaperProvider>
            <Shell />
        </PaperProvider>
    );
}
