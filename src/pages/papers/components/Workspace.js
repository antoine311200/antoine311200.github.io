import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePapers } from '../context';
import { applyFilters, groupByDay, facets, SORTS, DEFAULT_FILTERS } from '../filters';
import { download } from '../storage';
import { toBibtexAll, toCsv, toMarkdown } from '../bibtex';
import PaperCard from './PaperCard';
import PaperDetail from './PaperDetail';
import { Button, Chip, Empty, Modal, cx, relativeDay } from './ui';

const NO_LOCK = {};

/**
 * The reading surface shared by the Digest and the Library.
 *
 * It owns the filter state, the keyboard cursor and the multi-select, so both screens
 * get identical triage ergonomics and only differ in how the list is grouped.
 */
export default function Workspace({
    title,
    subtitle,
    initialFilters,
    grouped = false,
    lockedFilters = NO_LOCK,
    emptyState,
    headerExtra,
}) {
    const {
        paperList, states, dispatch, topics, collections, followedIds, papers, settings,
    } = usePapers();

    const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, ...initialFilters });
    const [selected, setSelected] = useState(() => new Set());
    const [openId, setOpenId] = useState(null);
    const [cursor, setCursor] = useState(0);
    const [showFacets, setShowFacets] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const listRef = useRef(null);
    const searchRef = useRef(null);

    const effective = useMemo(() => ({ ...filters, ...lockedFilters }), [filters, lockedFilters]);

    const results = useMemo(
        () => applyFilters(paperList, states, effective, { collections, followedIds }),
        [paperList, states, effective, collections, followedIds],
    );

    const groups = useMemo(() => (grouped ? groupByDay(results) : null), [grouped, results]);

    // The keyboard cursor walks the list in the order it is *rendered*. When grouped,
    // that is day by day, not the flat relevance order, so flatten the groups instead.
    const flat = useMemo(
        () => (groups ? groups.reduce((acc, g) => acc.concat(g.papers), []) : results),
        [groups, results],
    );
    const indexById = useMemo(() => {
        const m = new Map();
        flat.forEach((p, i) => m.set(p.id, i));
        return m;
    }, [flat]);

    const facetData = useMemo(() => facets(paperList, states), [paperList, states]);

    const patch = (p) => setFilters((f) => ({ ...f, ...p }));
    const toggleIn = (key, value) => setFilters((f) => ({
        ...f,
        [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));

    /* ------------------------------------------------------------- keyboard */

    const move = useCallback((delta) => {
        setCursor((c) => Math.max(0, Math.min(flat.length - 1, c + delta)));
    }, [flat.length]);

    // Keep the cursor in view, and follow it with the detail panel when one is open.
    useEffect(() => {
        const el = listRef.current && listRef.current.querySelector(`[data-idx="${cursor}"]`);
        if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
        setOpenId((open) => (open && flat[cursor] ? flat[cursor].id : open));
        // `flat` is intentionally not a dependency: this reacts to cursor motion only.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cursor]);

    useEffect(() => { setCursor(0); }, [effective.query, effective.sort]);

    useEffect(() => {
        const onKey = (e) => {
            const tag = (e.target.tagName || '').toLowerCase();
            const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;

            if (e.key === '/' && !typing) {
                e.preventDefault();
                if (searchRef.current) searchRef.current.focus();
                return;
            }
            if (e.key === 'Escape') {
                if (typing) { e.target.blur(); return; }
                if (openId) { setOpenId(null); return; }
                if (selected.size) setSelected(new Set());
                return;
            }
            if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

            const paper = flat[cursor];
            const set = (p) => paper && dispatch({ type: 'PAPER_STATE', id: paper.id, patch: p });
            const st = paper ? (states[paper.id] || {}) : {};

            switch (e.key) {
                case 'j': case 'ArrowDown': e.preventDefault(); move(1); break;
                case 'k': case 'ArrowUp': e.preventDefault(); move(-1); break;
                case 'Enter': case 'o':
                    if (paper) { e.preventDefault(); setOpenId(openId === paper.id ? null : paper.id); }
                    break;
                case 'O':
                    if (paper) window.open(`https://arxiv.org/abs/${paper.id}`, '_blank', 'noreferrer');
                    break;
                case 'p':
                    if (paper) window.open(`https://arxiv.org/pdf/${paper.id}`, '_blank', 'noreferrer');
                    break;
                case 's':
                    if (paper) {
                        set({ starred: !st.starred });
                        if (!st.starred) dispatch({ type: 'LEARN', paper, direction: 1 });
                    }
                    break;
                case 'q': set({ status: st.status === 'queued' ? 'unread' : 'queued' }); break;
                case 'r': set({ status: st.status === 'read' ? 'unread' : 'read' }); break;
                case 'e': set({ status: 'archived' }); move(1); break;
                case 'x':
                    if (paper) {
                        set({ status: 'dismissed' });
                        dispatch({ type: 'LEARN', paper, direction: -1 });
                        move(1);
                    }
                    break;
                case ' ':
                    if (paper) {
                        e.preventDefault();
                        setSelected((s) => {
                            const n = new Set(s);
                            if (n.has(paper.id)) n.delete(paper.id); else n.add(paper.id);
                            return n;
                        });
                        move(1);
                    }
                    break;
                default: break;
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [flat, cursor, openId, selected.size, dispatch, move, states]);

    /* ----------------------------------------------------------- selection */

    const toggleSelect = (id) => setSelected((s) => {
        const n = new Set(s);
        if (n.has(id)) n.delete(id); else n.add(id);
        return n;
    });

    const bulk = (p) => {
        dispatch({ type: 'PAPER_STATE_BULK', ids: Array.from(selected), patch: p });
        setSelected(new Set());
    };

    const selectedPapers = useMemo(
        () => (selected.size ? Array.from(selected).map((id) => papers[id]).filter(Boolean) : results),
        [selected, papers, results],
    );

    const openPaper = openId ? papers[openId] : null;

    const navigate = (delta, id) => {
        if (id) { setOpenId(id); setCursor(Math.max(0, flat.findIndex((p) => p.id === id))); return; }
        move(delta);
    };

    /* -------------------------------------------------------------- render */

    const activeFilterCount = [
        effective.topicIds.length, effective.categories.length, effective.tags.length,
        effective.statuses.length, effective.starredOnly ? 1 : 0, effective.followedOnly ? 1 : 0,
        effective.unreadOnly ? 1 : 0, effective.days ? 1 : 0, effective.collectionId ? 1 : 0,
    ].reduce((a, b) => a + b, 0);

    const renderCard = (p) => {
        const idx = indexById.get(p.id);
        return (
        <div key={p.id} data-idx={idx}>
            <PaperCard
                paper={p}
                focused={idx === cursor}
                selected={selected.has(p.id)}
                showDay={!grouped}
                onSelectToggle={() => toggleSelect(p.id)}
                onOpen={() => { setCursor(idx); setOpenId(openId === p.id ? null : p.id); }}
            />
        </div>
        );
    };

    return (
        <div className="flex h-full min-h-0">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                {/* ------------------------------------------------------ toolbar */}
                <header className="flex-none border-b border-white/[0.07] px-5 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="min-w-0">
                            <h1 className="text-base font-semibold text-slate-100">{title}</h1>
                            {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
                        </div>
                        <div className="flex-1" />
                        {headerExtra}
                        <div className="relative">
                            <input
                                ref={searchRef}
                                value={filters.query}
                                onChange={(e) => patch({ query: e.target.value })}
                                placeholder="Search  ·  au:  ti:  cat:  tag:  is:starred"
                                className="w-64 rounded-lg border border-white/10 bg-slate-950/60 py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder:text-slate-600 outline-none transition focus:w-80 focus:border-sky-400/50"
                            />
                            <span className="pointer-events-none absolute left-2.5 top-1.5 text-slate-600">⌕</span>
                        </div>
                        <select
                            value={filters.sort}
                            onChange={(e) => patch({ sort: e.target.value })}
                            className="rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1.5 text-[11px] text-slate-300 outline-none focus:border-sky-400/50"
                        >
                            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <Button
                            variant={showFacets || activeFilterCount ? 'active' : 'ghost'}
                            onClick={() => setShowFacets(!showFacets)}
                        >
                            Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
                        </Button>
                        <Button onClick={() => setExportOpen(true)}>Export</Button>
                    </div>

                    {showFacets && (
                        <div className="mt-3 space-y-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                            <FacetRow label="Topics">
                                {topics.map((t) => (
                                    <Chip
                                        key={t.id}
                                        color={filters.topicIds.includes(t.id) ? t.color : undefined}
                                        active={filters.topicIds.includes(t.id)}
                                        onClick={() => toggleIn('topicIds', t.id)}
                                    >
                                        {t.name}
                                    </Chip>
                                ))}
                                {!topics.length && <span className="text-[11px] text-slate-600">No topics yet</span>}
                            </FacetRow>

                            <FacetRow label="State">
                                {['unread', 'queued', 'reading', 'read', 'archived', 'dismissed'].map((s) => (
                                    <Chip key={s} active={filters.statuses.includes(s)} onClick={() => toggleIn('statuses', s)}>
                                        {s}
                                    </Chip>
                                ))}
                                <Chip active={filters.starredOnly} onClick={() => patch({ starredOnly: !filters.starredOnly })}>★ starred</Chip>
                                <Chip active={filters.followedOnly} onClick={() => patch({ followedOnly: !filters.followedOnly })}>followed authors</Chip>
                            </FacetRow>

                            <FacetRow label="Window">
                                {[[1, 'Today'], [3, '3 days'], [7, 'Week'], [30, 'Month'], [null, 'All']].map(([d, label]) => (
                                    <Chip key={label} active={filters.days === d} onClick={() => patch({ days: d })}>{label}</Chip>
                                ))}
                            </FacetRow>

                            {facetData.categories.length > 0 && (
                                <FacetRow label="Category">
                                    {facetData.categories.slice(0, 18).map(([c, n]) => (
                                        <Chip key={c} active={filters.categories.includes(c)} onClick={() => toggleIn('categories', c)}>
                                            {c} <span className="opacity-50">{n}</span>
                                        </Chip>
                                    ))}
                                </FacetRow>
                            )}

                            {facetData.tags.length > 0 && (
                                <FacetRow label="Tags">
                                    {facetData.tags.slice(0, 18).map(([t, n]) => (
                                        <Chip key={t} active={filters.tags.includes(t)} onClick={() => toggleIn('tags', t)}>
                                            #{t} <span className="opacity-50">{n}</span>
                                        </Chip>
                                    ))}
                                </FacetRow>
                            )}

                            {collections.length > 0 && (
                                <FacetRow label="Collection">
                                    {collections.map((c) => (
                                        <Chip
                                            key={c.id}
                                            active={filters.collectionId === c.id}
                                            onClick={() => patch({ collectionId: filters.collectionId === c.id ? null : c.id })}
                                        >
                                            {c.name} <span className="opacity-50">{c.paperIds.length}</span>
                                        </Chip>
                                    ))}
                                </FacetRow>
                            )}

                            <div className="flex justify-end pt-1">
                                <Button variant="subtle" size="sm" onClick={() => setFilters({ ...DEFAULT_FILTERS, ...initialFilters })}>
                                    Reset filters
                                </Button>
                            </div>
                        </div>
                    )}
                </header>

                {/* ------------------------------------------------- bulk action bar */}
                {selected.size > 0 && (
                    <div className="flex flex-none flex-wrap items-center gap-1.5 border-b border-sky-400/20 bg-sky-500/[0.07] px-5 py-2">
                        <span className="text-[11px] font-medium text-sky-200">{selected.size} selected</span>
                        <div className="flex-1" />
                        <Button size="sm" onClick={() => bulk({ status: 'queued' })}>Queue</Button>
                        <Button size="sm" onClick={() => bulk({ status: 'read' })}>Mark read</Button>
                        <Button size="sm" onClick={() => bulk({ starred: true })}>Star</Button>
                        <Button size="sm" onClick={() => bulk({ status: 'archived' })}>Archive</Button>
                        <Button size="sm" variant="danger" onClick={() => bulk({ status: 'dismissed' })}>Dismiss</Button>
                        <Button size="sm" onClick={() => setExportOpen(true)}>Export selection</Button>
                        <Button size="sm" variant="subtle" onClick={() => setSelected(new Set())}>Clear</Button>
                    </div>
                )}

                {/* --------------------------------------------------------- list */}
                <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    {!results.length ? (
                        emptyState || (
                            <Empty title="Nothing matches" icon="⌕">
                                Loosen the filters, or fetch your topics to bring in new work.
                            </Empty>
                        )
                    ) : grouped ? (
                        <div className="space-y-6">
                            {groups.map(({ day, papers: dayPapers }) => {
                                const unread = dayPapers.filter((p) => !(states[p.id] && states[p.id].status !== 'unread')).length;
                                return (
                                    <section key={day}>
                                        <div className="sticky top-0 z-10 -mx-1 mb-2 flex items-baseline gap-2 bg-slate-950/85 px-1 py-1.5 backdrop-blur">
                                            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                                                {relativeDay(day)}
                                            </h2>
                                            <span className="text-[10px] text-slate-600">
                                                {dayPapers.length} paper{dayPapers.length === 1 ? '' : 's'}
                                                {unread ? ` · ${unread} unread` : ''}
                                            </span>
                                            <div className="h-px flex-1 bg-white/[0.06]" />
                                            <button
                                                type="button"
                                                onClick={() => dispatch({
                                                    type: 'PAPER_STATE_BULK',
                                                    ids: dayPapers.map((p) => p.id),
                                                    patch: { status: 'read' },
                                                })}
                                                className="text-[10px] text-slate-600 transition hover:text-sky-300"
                                            >
                                                mark day read
                                            </button>
                                        </div>
                                        <div className={cx('space-y-2', settings.density === 'compact' && 'space-y-1')}>
                                            {dayPapers.map((p) => renderCard(p))}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={cx('space-y-2', settings.density === 'compact' && 'space-y-1')}>
                            {flat.map((p) => renderCard(p))}
                        </div>
                    )}

                    {results.length > 0 && (
                        <p className="py-6 text-center text-[10px] text-slate-700">
                            {results.length} of {paperList.length} papers · j/k to move · o to open · ? for shortcuts
                        </p>
                    )}
                </div>
            </div>

            {/* ------------------------------------------------------ detail panel */}
            {/* One panel, two layouts: a full-screen sheet on narrow viewports, a
                side-by-side column from lg up. Rendering it twice would mount two
                PDF frames and two copies of the note editor. */}
            {openPaper && (
                <div className={cx(
                    'fixed inset-0 z-40 bg-slate-950',
                    'lg:static lg:z-auto lg:w-[42%] lg:min-w-[26rem] lg:max-w-[46rem] lg:flex-none lg:bg-transparent',
                )}>
                    <PaperDetail paper={openPaper} onClose={() => setOpenId(null)} onNavigate={navigate} />
                </div>
            )}

            <ExportModal
                open={exportOpen}
                onClose={() => setExportOpen(false)}
                papers={selectedPapers}
                states={states}
                scope={selected.size ? `${selected.size} selected` : `${results.length} filtered`}
            />
        </div>
    );
}

const FacetRow = ({ label, children }) => (
    <div className="flex items-start gap-3">
        <span className="w-20 flex-none pt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
            {label}
        </span>
        <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
);

function ExportModal({ open, onClose, papers, states, scope }) {
    const stamp = new Date().toISOString().slice(0, 10);
    const actions = [
        ['BibTeX (.bib)', () => download(`paper-radar-${stamp}.bib`, toBibtexAll(papers), 'text/plain')],
        ['CSV (.csv)', () => download(`paper-radar-${stamp}.csv`, toCsv(papers, states), 'text/csv')],
        ['Markdown digest (.md)', () => download(`paper-radar-${stamp}.md`, toMarkdown(papers, states), 'text/markdown')],
        ['JSON (.json)', () => download(`paper-radar-papers-${stamp}.json`, JSON.stringify(papers, null, 2))],
    ];
    return (
        <Modal open={open} onClose={onClose} title={`Export — ${scope}`}>
            <p className="mb-3 text-xs text-slate-400">
                Exports what is currently in view. Select papers first to narrow it down.
            </p>
            <div className="grid grid-cols-2 gap-2">
                {actions.map(([label, fn]) => (
                    <Button key={label} size="lg" onClick={() => { fn(); onClose(); }}>{label}</Button>
                ))}
            </div>
        </Modal>
    );
}
