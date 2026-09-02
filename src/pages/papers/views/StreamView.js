import React, { useEffect, useMemo, useState } from 'react';

import { usePapers } from '../context';
import { applyFilters, DEFAULT_FILTERS } from '../filters';
import PaperRow from '../components/PaperRow';
import { Button, Chip, ContextMenu, Count, Empty, Progress, Spinner, relativeDay, useContextMenu } from '../ui';

/* ------------------------------------------------------- time hierarchy ---- */

const startOfWeek = (d) => {
    const x = new Date(d);
    const day = (x.getDay() + 6) % 7;            // Monday-based
    x.setDate(x.getDate() - day);
    x.setHours(0, 0, 0, 0);
    return x;
};

const monthLabel = (d) => d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
const weekLabel = (d) => `Week of ${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;

/**
 * Bucket papers into Month › Week › Day by the day they entered the library.
 * Ordering is newest-first at every level so today is always the first thing you see.
 */
function buildTimeTree(papers) {
    const months = new Map();
    papers.forEach((p) => {
        const iso = String(p.firstSeen || p.published || '');
        if (!iso) return;
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return;

        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const wStart = startOfWeek(d);
        // A week that straddles a month boundary appears under both months, so its
        // key must be scoped by month — otherwise collapsing one collapses the other.
        const wKey = `${mKey}|${wStart.toISOString().slice(0, 10)}`;
        const dKey = `${wKey}|${iso.slice(0, 10)}`;

        if (!months.has(mKey)) months.set(mKey, { key: mKey, label: monthLabel(d), count: 0, weeks: new Map() });
        const month = months.get(mKey);
        month.count += 1;

        if (!month.weeks.has(wKey)) month.weeks.set(wKey, { key: wKey, label: weekLabel(wStart), count: 0, days: new Map() });
        const week = month.weeks.get(wKey);
        week.count += 1;

        if (!week.days.has(dKey)) week.days.set(dKey, { key: dKey, label: relativeDay(iso.slice(0, 10)), count: 0, papers: [] });
        const day = week.days.get(dKey);
        day.count += 1;
        day.papers.push(p);
    });

    const tail = (k) => String(k).split('|').pop();
    const desc = (a, b) => tail(b.key).localeCompare(tail(a.key));
    return Array.from(months.values()).sort(desc).map((m) => ({
        ...m,
        weeks: Array.from(m.weeks.values()).sort(desc).map((w) => ({
            ...w,
            days: Array.from(w.days.values()).sort(desc),
        })),
    }));
}

/* --------------------------------------------------------------- the view --- */

const QUICK = [
    { id: 'all', label: 'Everything' },
    { id: 'unread', label: 'Unread' },
    { id: 'starred', label: 'Starred' },
    { id: 'queued', label: 'Queue' },
];

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

    // Unfiltered, open the newest month/week/day and fold the rest — the page opens on
    // "what just arrived" without hiding the archive. Filtered, open everything: the
    // user asked a question and a collapsed section would silently swallow answers.
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
        // Reacts to the shape of the tree and to whether a filter is on, not to keystrokes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tree.length, results.length, filtering]);

    const toggle = (key) => setCollapsed((s) => {
        const n = new Set(s);
        if (n.has(key)) n.delete(key); else n.add(key);
        return n;
    });

    const flat = useMemo(
        () => tree.flatMap((m) => m.weeks.flatMap((w) => w.days.flatMap((d) => (collapsed.has(d.key) || collapsed.has(w.key) || collapsed.has(m.key) ? [] : d.papers)))),
        [tree, collapsed],
    );

    const toggleSelect = (id) => setSelection((s) => {
        const n = new Set(s);
        if (n.has(id)) n.delete(id); else n.add(id);
        return n;
    });

    const bulk = (patch) => {
        dispatch({ type: 'PAPER_STATE_BULK', ids: Array.from(selection), patch });
        notify(`${selection.size} paper${selection.size === 1 ? '' : 's'} updated`);
        setSelection(new Set());
    };

    const progressPct = fetchState.total ? ((fetchState.done + 0.35) / fetchState.total) * 100 : 0;

    return (
        <div className="flex h-full min-h-0 flex-col">
            {/* ------------------------------------------------ fetch banner */}
            {fetchState.running && (
                <div data-testid="fetch-banner" className="pr-rise flex-none border-b border-orange-400/20 bg-orange-400/[0.06] px-6 py-3">
                    <div className="mx-auto flex max-w-5xl items-center gap-3">
                        <Spinner className="h-4 w-4" />
                        <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-medium text-orange-100">
                                Fetching <span className="text-orange-300">{fetchState.topic}</span>
                                <Count className="ml-2">{fetchState.done + 1}/{fetchState.total}</Count>
                            </p>
                            <Progress className="mt-1.5" value={progressPct} />
                        </div>
                        <Button size="sm" variant="quiet" onClick={cancelFetch}>Cancel</Button>
                    </div>
                </div>
            )}

            {!fetchState.running && fetchState.log.length > 0 && (
                <div className="pr-rise flex-none border-b border-slate-800 px-6 py-2">
                    <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Last fetch</span>
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
                <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-1.5">
                    {QUICK.map((q) => (
                        <Chip key={q.id} data-testid={`filter-quick-${q.id}`} active={quick === q.id} onClick={() => setQuick(q.id)}>
                            {q.label}
                            {q.id === 'unread' && counts.unread > 0 && <span className="opacity-60"> {counts.unread}</span>}
                            {q.id === 'queued' && counts.queued > 0 && <span className="opacity-60"> {counts.queued}</span>}
                        </Chip>
                    ))}
                    <span className="mx-1 h-4 w-px bg-slate-800" />
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
                        className="w-44 rounded-lg border border-slate-700 bg-slate-950/60 px-2.5 py-1 text-[11.5px] text-slate-100 placeholder:text-slate-600 outline-none transition focus:w-56 focus:border-orange-400/60"
                    />
                </div>
            </div>

            {/* -------------------------------------------------- bulk actions */}
            {selection.size > 0 && (
                <div className="pr-rise flex-none border-b border-orange-400/25 bg-orange-400/[0.07] px-6 py-2">
                    <div className="mx-auto flex max-w-5xl items-center gap-1.5">
                        <span className="text-[11.5px] font-medium text-orange-200">{selection.size} selected</span>
                        <Count className="ml-1">drag them onto the Explorer tab to file them</Count>
                        <div className="flex-1" />
                        <Button size="sm" onClick={() => bulk({ status: 'read' })}>Mark read</Button>
                        <Button size="sm" onClick={() => bulk({ starred: true })}>Star</Button>
                        <Button size="sm" variant="danger" onClick={() => bulk({ status: 'dismissed' })}>Dismiss</Button>
                        <Button size="sm" variant="quiet" onClick={() => setSelection(new Set())}>Clear</Button>
                    </div>
                </div>
            )}

            {/* ----------------------------------------------------- the tree */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                <div className="mx-auto max-w-5xl">
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
                                : 'Run a fetch and your topics will fill this stream, newest first. Nothing is ever fetched twice.'}
                        </Empty>
                    ) : (
                        <div className="space-y-5">
                            {tree.map((month) => {
                                const mClosed = collapsed.has(month.key);
                                return (
                                    <section key={month.key} data-testid="month-group">
                                        <button
                                            type="button"
                                            onClick={() => toggle(month.key)}
                                            className="group flex w-full items-center gap-2 py-1 text-left"
                                        >
                                            <span className="w-3 flex-none text-[9px] text-slate-600 transition group-hover:text-orange-300">
                                                {mClosed ? '▸' : '▾'}
                                            </span>
                                            <h2 className="text-[13px] font-semibold text-slate-200">{month.label}</h2>
                                            <Count>{month.count}</Count>
                                            <span className="h-px flex-1 bg-slate-800" />
                                        </button>

                                        {!mClosed && (
                                            <div className="ml-3 space-y-3 border-l border-slate-800/70 pl-3">
                                                {month.weeks.map((week) => {
                                                    const wClosed = collapsed.has(week.key);
                                                    return (
                                                        <div key={week.key} data-testid="week-group">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggle(week.key)}
                                                                className="group flex w-full items-center gap-2 py-0.5 text-left"
                                                            >
                                                                <span className="w-3 flex-none text-[9px] text-slate-700 transition group-hover:text-orange-300">
                                                                    {wClosed ? '▸' : '▾'}
                                                                </span>
                                                                <h3 className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">
                                                                    {week.label}
                                                                </h3>
                                                                <Count>{week.count}</Count>
                                                            </button>

                                                            {!wClosed && (
                                                                <div className="ml-3 space-y-2.5 pl-3">
                                                                    {week.days.map((day) => {
                                                                        const dClosed = collapsed.has(day.key);
                                                                        const unread = day.papers.filter(
                                                                            (p) => !(states[p.id] && states[p.id].status !== 'unread'),
                                                                        ).length;
                                                                        return (
                                                                            <div key={day.key} data-testid="day-group">
                                                                                <div className="sticky top-0 z-10 -mx-1 flex items-center gap-2 bg-slate-950/70 px-1 py-1 backdrop-blur-md">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => toggle(day.key)}
                                                                                        className="group flex flex-1 items-center gap-2 text-left"
                                                                                    >
                                                                                        <span className="w-3 flex-none text-[9px] text-slate-700 transition group-hover:text-orange-300">
                                                                                            {dClosed ? '▸' : '▾'}
                                                                                        </span>
                                                                                        <h4 data-testid="day-heading" className="text-[12px] font-medium text-slate-300">
                                                                                            {day.label}
                                                                                        </h4>
                                                                                        <Count>
                                                                                            {day.count}
                                                                                            {unread ? ` · ${unread} unread` : ''}
                                                                                        </Count>
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => dispatch({
                                                                                            type: 'PAPER_STATE_BULK',
                                                                                            ids: day.papers.map((p) => p.id),
                                                                                            patch: { status: 'read' },
                                                                                        })}
                                                                                        className="text-[10px] text-slate-600 opacity-0 transition hover:text-orange-300 group-hover:opacity-100"
                                                                                    >
                                                                                        mark read
                                                                                    </button>
                                                                                </div>

                                                                                {!dClosed && (
                                                                                    <div className="pr-stagger mt-1 space-y-1.5">
                                                                                        {day.papers.map((p) => (
                                                                                            <PaperRow
                                                                                                key={p.id}
                                                                                                paper={p}
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
                            <p className="py-6 text-center text-[10px] text-slate-700">
                                {flat.length} shown of {paperList.length} in your library
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
                        ...(folders.length ? [{
                            label: 'File in…',
                            icon: '🗂',
                            onSelect: () => { setSelection(new Set([paper.id])); notify('Drag the selection onto the Explorer tab, or use the shelf'); },
                        }] : []),
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
