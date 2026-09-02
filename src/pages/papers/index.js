import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import './animations.css';
import { PaperProvider, usePapers } from './context';
import { DragProvider, useDrag, useDropTarget } from './dnd';
import TopicsView from './views/TopicsView';
import StreamView from './views/StreamView';
import ExplorerView from './views/ExplorerView';
import SettingsModal from './views/SettingsModal';
import PaperPanel from './components/PaperPanel';
import { Button, Count, PAGE_BACKGROUND, Spinner, cx } from './ui';

const TABS = [
    { id: 'topics', label: 'Topics' },
    { id: 'stream', label: 'Stream' },
    { id: 'explorer', label: 'Explorer' },
];

/* ------------------------------------------------------------------- shell -- */

function Shell({ tab, setTab }) {
    const {
        counts, topics, fetchTopics, fetchState, error, setError, toast, hydrated,
        papers, settings, enrich, folders, dispatch, notify,
    } = usePapers();

    const [openId, setOpenId] = useState(null);
    const [selection, setSelection] = useState(() => new Set());
    const [settingsOpen, setSettingsOpen] = useState(false);

    /* Once-a-day background fetch, if enabled. */
    useEffect(() => {
        if (!hydrated || !settings.autoFetchOnOpen) return undefined;
        const today = new Date().toISOString().slice(0, 10);
        const stale = topics.filter((t) => t.enabled && String(t.lastFetch || '').slice(0, 10) !== today);
        if (!stale.length || fetchState.running) return undefined;
        const timer = setTimeout(() => fetchTopics(stale.map((t) => t.id)), 900);
        return () => clearTimeout(timer);
        // Deliberately mount-only: this is the "first visit of the day" pull.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hydrated]);

    /* Progressive enrichment when it is switched on. */
    useEffect(() => {
        if (!settings.enrich || fetchState.running) return undefined;
        const pending = Object.values(papers).filter((p) => !p.enriched).map((p) => p.id);
        if (!pending.length) return undefined;
        const timer = setTimeout(() => enrich(pending.slice(0, 100)), 2500);
        return () => clearTimeout(timer);
    }, [settings.enrich, fetchState.running, papers, enrich]);

    const fetchAll = useCallback(() => { setTab('stream'); fetchTopics(); }, [fetchTopics, setTab]);
    const fetchOne = useCallback((id) => { setTab('stream'); fetchTopics([id]); }, [fetchTopics, setTab]);

    const openPaper = openId ? papers[openId] : null;

    // Escape closes the panel first, then clears a selection.
    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== 'Escape') return;
            const t = (e.target.tagName || '').toLowerCase();
            if (t === 'input' || t === 'textarea') return;
            if (openId) setOpenId(null);
            else if (selection.size) setSelection(new Set());
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [openId, selection.size]);

    if (!hydrated) {
        return (
            <div className="flex h-screen w-screen items-center justify-center text-slate-500" style={PAGE_BACKGROUND}>
                <span className="flex items-center gap-2 text-xs"><Spinner /> opening your library…</span>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-screen flex-col overflow-hidden text-slate-300" style={PAGE_BACKGROUND}>
            <TopBar
                tab={tab}
                setTab={setTab}
                counts={counts}
                onFetchAll={fetchAll}
                running={fetchState.running}
                onSettings={() => setSettingsOpen(true)}
            />

            {error && (
                <div className="flex flex-none items-start gap-3 border-b border-rose-500/25 bg-rose-500/[0.08] px-6 py-2.5">
                    <span className="text-rose-400">!</span>
                    <p className="flex-1 text-[11.5px] leading-relaxed text-rose-200">{error}</p>
                    <button type="button" onClick={() => setError(null)} className="text-rose-300/60 hover:text-rose-200">✕</button>
                </div>
            )}

            <main className="flex min-h-0 flex-1">
                <div className="min-w-0 flex-1">
                    {tab === 'topics' && <TopicsView onFetchTopic={fetchOne} />}
                    {tab === 'stream' && (
                        <StreamView
                            onFetchAll={fetchAll}
                            selection={selection}
                            setSelection={setSelection}
                            openId={openId}
                            setOpenId={setOpenId}
                        />
                    )}
                    {tab === 'explorer' && (
                        <ExplorerView
                            selection={selection}
                            setSelection={setSelection}
                            openId={openId}
                            setOpenId={setOpenId}
                        />
                    )}
                </div>

                {openPaper && (
                    <div className="w-[40%] min-w-[23rem] max-w-[44rem] flex-none max-lg:fixed max-lg:inset-0 max-lg:z-50 max-lg:w-full max-lg:max-w-none">
                        <PaperPanel paper={openPaper} onClose={() => setOpenId(null)} onOpenPaper={setOpenId} />
                    </div>
                )}
            </main>

            <Shelf
                folders={folders}
                dispatch={dispatch}
                notify={notify}
                papers={papers}
                onGoExplorer={() => setTab('explorer')}
            />

            {toast && (
                <div className="pr-rise pointer-events-none fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-full border border-slate-700 bg-slate-900/95 px-4 py-2 text-xs text-slate-200 shadow-xl shadow-black/40 backdrop-blur">
                    {toast.message}
                </div>
            )}

            <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </div>
    );
}

/* ------------------------------------------------------------------ top bar */

function TopBar({ tab, setTab, counts, onFetchAll, running, onSettings }) {
    const { springProps, dragging } = useDrag();

    return (
        <header className="flex flex-none items-center gap-4 border-b border-slate-800 bg-slate-950/50 px-5 py-2.5 backdrop-blur">
            <Link to="/" className="group flex items-center gap-2" title="Back to the site">
                <span className="text-base leading-none text-orange-400">◈</span>
                <span className="text-[13px] font-semibold text-slate-100 transition group-hover:text-orange-300">Paper Radar</span>
            </Link>

            <nav
                role="tablist"
                aria-label="Sections"
                className="ml-2 flex items-center gap-0.5 rounded-xl border border-slate-800 bg-slate-900/50 p-0.5"
            >
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        role="tab"
                        aria-selected={tab === t.id}
                        data-testid={`tab-${t.id}`}
                        onClick={() => setTab(t.id)}
                        {...springProps(t.id)}
                        className={cx(
                            'relative rounded-lg px-3.5 py-1.5 text-[12.5px] font-medium transition-all duration-150',
                            tab === t.id ? 'bg-orange-400/12 text-orange-200' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
                            dragging && tab !== t.id && 'ring-1 ring-inset ring-orange-400/25',
                        )}
                    >
                        {t.label}
                        {t.id === 'stream' && counts.unread > 0 && (
                            <span className="ml-1.5 font-mono text-[9.5px] opacity-60">{counts.unread}</span>
                        )}
                    </button>
                ))}
            </nav>

            {dragging && <span className="pr-pulse text-[10.5px] text-orange-300/80">hold over a tab to switch</span>}

            <div className="flex-1" />

            <Count className="hidden sm:block">{counts.total.toLocaleString()} papers</Count>

            <Button variant="primary" size="md" onClick={onFetchAll} disabled={running} data-testid="fetch-all">
                {running ? <><Spinner className="!border-slate-800 !border-t-slate-950" /> Fetching</> : 'Fetch'}
            </Button>

            <button
                type="button"
                onClick={onSettings}
                aria-label="Settings"
                data-testid="open-settings"
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-slate-200"
            >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.9 13.5a8 8 0 000-3l2-1.5-2-3.4-2.3 1a8 8 0 00-2.6-1.5L14.6 2h-4l-.4 2.6a8 8 0 00-2.6 1.5l-2.3-1-2 3.4 2 1.5a8 8 0 000 3l-2 1.5 2 3.4 2.3-1a8 8 0 002.6 1.5l.4 2.6h4l.4-2.6a8 8 0 002.6-1.5l2.3 1 2-3.4z" strokeLinejoin="round" />
                </svg>
            </button>
        </header>
    );
}

/* -------------------------------------------------------------------- shelf */

/**
 * A holding tray. It exists only while you are dragging or while it holds something,
 * so it never competes for attention — but it means you can pick papers up in one
 * tab and put them down in another without one continuous gesture.
 */
function Shelf({ folders, dispatch, notify, papers, onGoExplorer }) {
    const { dragging, shelf, addToShelf, clearShelf, startPaperDrag, endDrag } = useDrag();
    const [over, dropProps] = useDropTarget({ onDropPapers: (ids) => addToShelf(ids) });

    const titles = useMemo(
        () => shelf.map((id) => (papers[id] || {}).title).filter(Boolean),
        [shelf, papers],
    );

    if (!dragging && !shelf.length) return null;

    return (
        <div
            {...dropProps}
            data-testid="shelf"
            className={cx(
                'pr-rise fixed bottom-5 right-5 z-[60] w-64 rounded-2xl border p-3 shadow-2xl shadow-black/50 backdrop-blur-xl',
                over ? 'border-orange-400/60 bg-orange-400/10' : 'border-slate-700 bg-slate-900/95',
            )}
        >
            <div className="flex items-center gap-2">
                <span className="text-sm">🗃</span>
                <span className="flex-1 text-[11.5px] font-medium text-slate-200">
                    {shelf.length ? `${shelf.length} on the shelf` : 'Drop to hold'}
                </span>
                {shelf.length > 0 && (
                    <button type="button" onClick={clearShelf} className="text-[10px] text-slate-500 hover:text-slate-200">
                        clear
                    </button>
                )}
            </div>

            {shelf.length > 0 ? (
                <>
                    <ul className="mt-2 max-h-24 space-y-0.5 overflow-y-auto">
                        {titles.slice(0, 4).map((t, i) => (
                            <li key={i} className="truncate text-[10.5px] text-slate-500">{t}</li>
                        ))}
                        {titles.length > 4 && <li className="text-[10px] text-slate-600">+{titles.length - 4} more</li>}
                    </ul>
                    <div
                        draggable
                        onDragStart={(e) => startPaperDrag(e, shelf)}
                        onDragEnd={endDrag}
                        className="mt-2 cursor-grab rounded-lg border border-dashed border-slate-600 py-1.5 text-center text-[10.5px] text-slate-400 transition hover:border-orange-400/60 hover:text-orange-300 active:cursor-grabbing"
                    >
                        drag these into a folder
                    </div>
                    {folders.length > 0 && (
                        <select
                            aria-label="File shelf into folder"
                            defaultValue=""
                            onChange={(e) => {
                                if (!e.target.value) return;
                                // Shelf papers came from the read-only Stream, so filing them is a copy.
                                dispatch({ type: 'FOLDER_FILE_PAPERS', id: e.target.value, paperIds: shelf });
                                notify(`${shelf.length} filed`);
                                clearShelf();
                                onGoExplorer();
                            }}
                            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1 text-[11px] text-slate-300 outline-none focus:border-orange-400/60"
                        >
                            <option value="">…or file straight into</option>
                            {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                    )}
                </>
            ) : (
                <p className="mt-1 text-[10.5px] leading-relaxed text-slate-500">
                    Park papers here, switch tabs, then drag them into a folder.
                </p>
            )}
        </div>
    );
}

/* --------------------------------------------------------------------- root */

/** Tab state lives above the drag layer so a spring-loaded tab can switch it. */
function Workspace() {
    const [tab, setTab] = useState('stream');
    return (
        <DragProvider onTabHover={setTab}>
            <Shell tab={tab} setTab={setTab} />
        </DragProvider>
    );
}

export default function PaperSearch() {
    useEffect(() => { document.title = 'Paper Radar | Antoine Debouchage'; }, []);
    return (
        <PaperProvider>
            <Workspace />
        </PaperProvider>
    );
}
