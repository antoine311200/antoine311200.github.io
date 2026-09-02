import React, { useEffect, useMemo, useState } from 'react';

import { usePapers } from '../context';
import { applyFilters, DEFAULT_FILTERS } from '../filters';
import { buildTimeTree } from '../timeTree';
import { STREAM_SOURCE } from '../dnd';
import PaperRow from '../components/PaperRow';
import {
    Button, Chip, ContextMenu, Count, Empty, Progress, Spinner, useContextMenu,
} from '../ui';

const QUICK = [
    { id: 'all', label: 'Everything' },
    { id: 'unread', label: 'Unread' },
    { id: 'starred', label: 'Starred' },
    { id: 'queued', label: 'Queue' },
];

/** "31 Aug – 6 Sep", the way a person says a week. */
function weekRange(weekKey) {
    const start = new Date(weekKey.split('|').pop());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const opts = { day: 'numeric', month: 'short' };
    return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
}

export default function StreamView({ onFetchAll, selection, setSelection, openId, setOpenId }) {
    const {
        paperList, states, topics, dispatch, folders, followedIds, fetchState, cancelFetch, notify, counts,
    } = usePapers();

    const [quick, setQuick] = useState('all');
    const [topicId, setTopicId] = useState(null);
    const [query, setQuery] = useState('');
    const [collapsed, setCollapsed] = useState(() => new Set());
    const { menu, open, close } = useContextMenu();

    const filters = useMemo(() => ({
        ...DEFAULT_FILTERS,
        query,
        sort: 'relevance',
        topicIds: topicId ? [topicId] : [],
        unreadOnly: quick === 'unread',
        starredOnly: quick === 'starred',
        statuses: quick === 'queued' ? ['queued', 'reading'] : [],
    }), [query, topicId, quick]);

    const results = useMemo(
        () => applyFilters(paperList, states, filters, { folders, followedIds }),
        [paperList, states, filters, folders, followedIds],
    );

    const tree = useMemo(() => buildTimeTree(results), [results]);
    const filtering = quick !== 'all' || !!topicId || !!query.trim();

    // Unfiltered, open the newest month/week/day and fold the rest. Filtered, open
    // everything: the user asked a question and a folded section would swallow answers.
    useEffect(() => {
        if (!tree.length) return;
        if (filtering) { setCollapsed(new Set()); return; }
        const next = new Set();
        tree.forEach((m, mi) => {
            if (mi > 0) next.add(m.key);
            m.weeks.forEach((w, wi) => {
                if (mi > 0 || wi > 0) next.add(w.key);
                w.days.forEach((d, di) => { if (mi > 0 || wi > 0 || di > 0) next.add(d.key); });
            });
        });
        setCollapsed(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tree.length, results.length, filtering]);

    const toggle = (key) => setCollapsed((s) => {
        const n = new Set(s);
        if (n.has(key)) n.delete(key); else n.add(key);
        return n;
    });

    const bulk = (patch) => {
        dispatch({ type: 'PAPER_STATE_BULK', ids: Array.from(selection), patch });
        notify(`${selection.size} paper${selection.size === 1 ? '' : 's'} updated`);
        setSelection(new Set());
    };

    const shown = useMemo(() => tree.reduce((n, m) => (collapsed.has(m.key) ? n : n + m.weeks.reduce(
        (k, w) => (collapsed.has(w.key) ? k : k + w.days.reduce(
            (j, d) => (collapsed.has(d.key) ? j : j + d.papers.length), 0,
        )), 0,
    )), 0), [tree, collapsed]);

    const progressPct = fetchState.total ? ((fetchState.done + 0.35) / fetchState.total) * 100 : 0;

    const toggleSelect = (id) => setSelection((s) => {
        const n = new Set(s);
        if (n.has(id)) n.delete(id); else n.add(id);
        return n;
    });

    return (
        <div className="flex h-full min-h-0 flex-col">
            {/* ------------------------------------------------- fetch banner */}
            {fetchState.running && (
                <div data-testid="fetch-banner" className="pr-rise flex-none border-b border-orange-400/25 bg-orange-400/[0.07] px-6 py-3">
                    <div className="mx-auto flex max-w-4xl items-center gap-3">
                        <Spinner className="h-4 w-4" />
                        <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-medium text-orange-100">
                                Fetching <span className="text-orange-300">{fetchState.topic}</span>
                                <Count className="ml-2 !text-orange-200/60">{fetchState.done + 1} of {fetchState.total}</Count>
                            </p>
                            <Progress className="mt-1.5" value={progressPct} />
                        </div>
                        <Button size="sm" variant="quiet" onClick={cancelFetch}>Cancel</Button>
                    </div>
                </div>
            )}

            {!fetchState.running && fetchState.log.length > 0 && (
                <div className="pr-rise flex-none border-b border-slate-800/70 px-6 py-2">
                    <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-slate-600">Last fetch</span>
                        {fetchState.log.map((l, i) => (
                            <span key={i} className="flex items-center gap-1 text-[11px]">
                                <span className={l.ok ? 'text-emerald-400' : 'text-rose-400'}>{l.ok ? '✓' : '✕'}</span>
                                <span className="text-slate-400">{l.topic}</span>
                                <Count>{l.ok ? `+${l.fresh}` : l.message}</Count>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* ------------------------------------------------------ filters */}
            <div className="flex-none border-b border-slate-800 px-6 py-2.5">
                <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-1.5">
                    {QUICK.map((q) => (
                        <Chip key={q.id} data-testid={`filter-quick-${q.id}`} active={quick === q.id} onClick={() => setQuick(q.id)}>
                            {q.label}
                            {q.id === 'unread' && counts.unread > 0 && <span className="opacity-60"> {counts.unread}</span>}
                            {q.id === 'queued' && counts.queued > 0 && <span className="opacity-60"> {counts.queued}</span>}
                        </Chip>
                    ))}
                    {topics.length > 0 && <span className="mx-1 h-4 w-px bg-slate-800" />}
                    {topics.map((t) => (
                        <Chip
                            key={t.id}
                            data-testid={`filter-topic-${t.id}`}
                            color={topicId === t.id ? t.color : undefined}
                            active={topicId === t.id}
                            onClick={() => setTopicId(topicId === t.id ? null : t.id)}
                        >
                            {t.name}
                        </Chip>
                    ))}
                    <div className="flex-1" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Filter…  au: ti: tag:"
                        aria-label="Filter papers"
                        className="w-40 rounded-lg border border-slate-700 bg-slate-950/60 px-2.5 py-1 text-[11.5px] text-slate-100 placeholder:text-slate-600 outline-none transition focus:w-52 focus:border-orange-400/60"
                    />
                </div>
            </div>

            {/* -------------------------------------------------- bulk actions */}
            {selection.size > 0 && (
                <div className="pr-rise flex-none border-b border-orange-400/25 bg-orange-400/[0.07] px-6 py-2">
                    <div className="mx-auto flex max-w-4xl items-center gap-1.5">
                        <span className="text-[11.5px] font-medium text-orange-200">{selection.size} selected</span>
                        <Count className="ml-1 !text-orange-200/50">drag onto the Explorer tab to file them</Count>
                        <div className="flex-1" />
                        <Button size="sm" onClick={() => bulk({ status: 'read' })}>Mark read</Button>
                        <Button size="sm" onClick={() => bulk({ starred: true })}>Star</Button>
                        <Button size="sm" variant="danger" onClick={() => bulk({ status: 'dismissed' })}>Dismiss</Button>
                        <Button size="sm" variant="quiet" onClick={() => setSelection(new Set())}>Clear</Button>
                    </div>
                </div>
            )}

            {/* ------------------------------------------------------ the list */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <div className="mx-auto max-w-4xl">
                    {!results.length ? (
                        <Empty
                            icon="◈"
                            title={paperList.length ? 'Nothing matches these filters' : 'Nothing fetched yet'}
                            action={paperList.length
                                ? <Button onClick={() => { setQuick('all'); setTopicId(null); setQuery(''); }}>Clear filters</Button>
                                : <Button variant="primary" size="lg" onClick={onFetchAll}>Fetch papers</Button>}
                        >
                            {paperList.length
                                ? 'Loosen the filters above to see more.'
                                : 'Run a fetch and your topics fill this stream, newest first. Nothing is ever fetched twice.'}
                        </Empty>
                    ) : (
                        <div className="space-y-8">
                            {tree.map((month) => {
                                const mClosed = collapsed.has(month.key);
                                return (
                                    <section key={month.key} data-testid="month-group">
                                        {/* Month reads as a chapter break: a title and a rule, nothing heavier. */}
                                        <button
                                            type="button"
                                            onClick={() => toggle(month.key)}
                                            className="group mb-3 flex w-full items-baseline gap-3 text-left"
                                        >
                                            <h2 className="text-[15px] font-semibold tracking-tight text-slate-100">{month.label}</h2>
                                            <span className="h-px flex-1 bg-gradient-to-r from-slate-700 to-transparent" />
                                            <Count className="transition group-hover:text-orange-300">
                                                {month.count} {mClosed ? '▸' : '▾'}
                                            </Count>
                                        </button>

                                        {!mClosed && (
                                            <div className="space-y-5">
                                                {month.weeks.map((week) => {
                                                    const wClosed = collapsed.has(week.key);
                                                    return (
                                                        <div key={week.key} data-testid="week-group">
                                                            {/* Week is a small label, not another header. */}
                                                            <button
                                                                type="button"
                                                                onClick={() => toggle(week.key)}
                                                                className="group mb-2 flex w-full items-center gap-2 text-left"
                                                            >
                                                                <span className="rounded-full border border-slate-800 bg-slate-900/60 px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.1em] text-slate-500 transition group-hover:border-slate-700 group-hover:text-slate-300">
                                                                    {weekRange(week.key)}
                                                                </span>
                                                                <Count>{week.count}</Count>
                                                                <span className="text-[8px] text-slate-700">{wClosed ? '▸' : '▾'}</span>
                                                            </button>

                                                            {!wClosed && (
                                                                <div className="space-y-4">
                                                                    {week.days.map((day) => {
                                                                        const dClosed = collapsed.has(day.key);
                                                                        const unread = day.papers.filter(
                                                                            (p) => !(states[p.id] && states[p.id].status !== 'unread'),
                                                                        ).length;
                                                                        const d = new Date(day.iso);
                                                                        return (
                                                                            <div key={day.key} data-testid="day-group">
                                                                                {/* Day is the scroll anchor: a sticky bar with a date tile. */}
                                                                                <div className="sticky top-0 z-10 -mx-2 mb-2 flex items-center gap-2.5 bg-slate-950/80 px-2 py-1.5 backdrop-blur-md">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => toggle(day.key)}
                                                                                        className="group flex flex-1 items-center gap-2.5 text-left"
                                                                                    >
                                                                                        <span className="flex h-8 w-8 flex-none flex-col items-center justify-center rounded-lg border border-slate-800 bg-slate-900/70 leading-none transition group-hover:border-orange-400/40">
                                                                                            <span className="text-[11px] font-semibold text-slate-200">{d.getDate()}</span>
                                                                                            <span className="text-[7.5px] uppercase tracking-wide text-slate-500">
                                                                                                {d.toLocaleDateString(undefined, { month: 'short' })}
                                                                                            </span>
                                                                                        </span>
                                                                                        <span className="min-w-0">
                                                                                            <span data-testid="day-heading" className="block text-[12.5px] font-medium text-slate-200">
                                                                                                {day.label}
                                                                                            </span>
                                                                                            <Count className="block">
                                                                                                {day.count} paper{day.count === 1 ? '' : 's'}
                                                                                                {unread ? ` · ${unread} unread` : ''}
                                                                                            </Count>
                                                                                        </span>
                                                                                        <span className="text-[8px] text-slate-700">{dClosed ? '▸' : '▾'}</span>
                                                                                    </button>
                                                                                    {unread > 0 && (
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => dispatch({
                                                                                                type: 'PAPER_STATE_BULK',
                                                                                                ids: day.papers.map((p) => p.id),
                                                                                                patch: { status: 'read' },
                                                                                            })}
                                                                                            className="rounded-full border border-slate-800 px-2 py-0.5 text-[10px] text-slate-600 transition hover:border-orange-400/40 hover:text-orange-300"
                                                                                        >
                                                                                            mark read
                                                                                        </button>
                                                                                    )}
                                                                                </div>

                                                                                {!dClosed && (
                                                                                    <div className="pr-stagger space-y-1.5">
                                                                                        {day.papers.map((p) => (
                                                                                            <PaperRow
                                                                                                key={p.id}
                                                                                                paper={p}
                                                                                                dragSource={STREAM_SOURCE}
                                                                                                selected={selection.has(p.id)}
                                                                                                focused={openId === p.id}
                                                                                                selectionIds={Array.from(selection)}
                                                                                                onToggleSelect={() => toggleSelect(p.id)}
                                                                                                onOpen={() => setOpenId(openId === p.id ? null : p.id)}
                                                                                                onContextMenu={(e) => open(e, p)}
                                                                                            />
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </section>
                                );
                            })}

                            <p className="pb-4 pt-2 text-center text-[10px] text-slate-700">
                                {shown} shown · {results.length} match · {paperList.length} in your library
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <ContextMenu
                menu={menu}
                onClose={close}
                items={(paper) => {
                    const st = states[paper.id] || {};
                    return [
                        { label: 'Open details', icon: '◉', onSelect: () => setOpenId(paper.id) },
                        { label: 'Open on arXiv', icon: '↗', onSelect: () => window.open(`https://arxiv.org/abs/${paper.id}`, '_blank', 'noreferrer') },
                        { label: 'Open PDF', icon: '▤', onSelect: () => window.open(`https://arxiv.org/pdf/${paper.id}`, '_blank', 'noreferrer') },
                        { separator: true },
                        {
                            label: st.starred ? 'Unstar' : 'Star',
                            icon: '★',
                            onSelect: () => dispatch({ type: 'PAPER_STATE', id: paper.id, patch: { starred: !st.starred } }),
                        },
                        {
                            label: st.status === 'read' ? 'Mark unread' : 'Mark read',
                            icon: '✓',
                            onSelect: () => dispatch({ type: 'PAPER_STATE', id: paper.id, patch: { status: st.status === 'read' ? 'unread' : 'read' } }),
                        },
                        {
                            label: st.status === 'queued' ? 'Remove from queue' : 'Add to queue',
                            icon: '≡',
                            onSelect: () => dispatch({ type: 'PAPER_STATE', id: paper.id, patch: { status: st.status === 'queued' ? 'unread' : 'queued' } }),
                        },
                        { separator: true },
                        {
                            label: 'Not interested',
                            icon: '⊘',
                            danger: true,
                            onSelect: () => {
                                dispatch({ type: 'PAPER_STATE', id: paper.id, patch: { status: 'dismissed' } });
                                dispatch({ type: 'LEARN', paper, direction: -1 });
                            },
                        },
                    ];
                }}
            />
        </div>
    );
}
