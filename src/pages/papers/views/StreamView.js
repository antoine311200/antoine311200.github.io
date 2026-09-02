import React, { useMemo, useState } from 'react';

import { usePapers } from '../context';
import { applyFilters, DEFAULT_FILTERS } from '../filters';
import { groupByDayFlat, recentDays, dayLabel } from '../timeTree';
import { STREAM_SOURCE } from '../dnd';
import PaperRow from '../components/PaperRow';
import {
    Button, Chip, ContextMenu, Count, Empty, Progress, Spinner, cx, useContextMenu, useScrollAnchor,
} from '../ui';

const QUICK = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'starred', label: 'Starred' },
    { id: 'queued', label: 'Queue' },
];

/**
 * The daily reading surface.
 *
 * There is no month/week/day tree here on purpose — that is the Explorer's job, where
 * a hierarchy is something you browse. This is the thing you open every morning, so
 * it is a strip of days you can scan at a glance and one flat list underneath. Pick a
 * day to focus it, or leave it on "All" and scroll with light date separators.
 */
export default function StreamView({ onFetchAll, selection, setSelection, openId, setOpenId }) {
    const {
        paperList, states, topics, dispatch, folders, followedIds, fetchState, cancelFetch, notify, counts,
    } = usePapers();

    const [quick, setQuick] = useState('all');
    const [topicId, setTopicId] = useState(null);
    const [addedOnly, setAddedOnly] = useState(false);
    const [query, setQuery] = useState('');
    const [day, setDay] = useState(null);          // null = every day
    const { menu, open, close } = useContextMenu();
    // Opening the panel narrows this column and re-wraps every card; hold the reader's place.
    const [listRef, holdScroll] = useScrollAnchor(openId);

    const filters = useMemo(() => ({
        ...DEFAULT_FILTERS,
        query,
        sort: 'relevance',
        topicIds: topicId ? [topicId] : [],
        origins: addedOnly ? ['search'] : [],
        unreadOnly: quick === 'unread',
        starredOnly: quick === 'starred',
        statuses: quick === 'queued' ? ['queued', 'reading'] : [],
        // "Not interested" fades a paper in place rather than removing it — you can
        // still see what you passed on, and change your mind.
        hideDismissed: false,
        hideArchived: false,
    }), [query, topicId, quick, addedOnly]);

    const results = useMemo(
        () => applyFilters(paperList, states, filters, { folders, followedIds }),
        [paperList, states, filters, folders, followedIds],
    );

    // Papers that came in by hand belong to no topic, so without a chip of their
    // own they would be the only thing in the stream you cannot filter down to.
    const addedCount = useMemo(() => paperList.filter((p) => p.origin === 'search').length, [paperList]);

    const byDay = useMemo(() => groupByDayFlat(results), [results]);
    const dayIndex = useMemo(() => new Map(byDay.map((d) => [d.iso, d])), [byDay]);

    /** The strip covers a fixed recent window plus any older day that has papers. */
    const strip = useMemo(() => {
        const window = recentDays(21);
        const older = byDay.map((d) => d.iso).filter((iso) => !window.includes(iso));
        return [...window, ...older].sort((a, b) => b.localeCompare(a)).map((iso) => {
            const d = dayIndex.get(iso);
            const unread = d ? d.papers.filter((p) => ((states[p.id] || {}).status || 'unread') === 'unread').length : 0;
            return { iso, count: d ? d.count : 0, unread };
        });
    }, [byDay, dayIndex, states]);

    const peak = Math.max(1, ...strip.map((s) => s.count));
    const shownDays = day ? byDay.filter((d) => d.iso === day) : byDay;
    const shownCount = shownDays.reduce((n, d) => n + d.papers.length, 0);

    const bulk = (patch) => {
        dispatch({ type: 'PAPER_STATE_BULK', ids: Array.from(selection), patch });
        notify(`${selection.size} paper${selection.size === 1 ? '' : 's'} updated`);
        setSelection(new Set());
    };

    const toggleSelect = (id) => setSelection((s) => {
        const n = new Set(s);
        if (n.has(id)) n.delete(id); else n.add(id);
        return n;
    });

    const progressPct = fetchState.total ? ((fetchState.done + 0.35) / fetchState.total) * 100 : 0;
    const anyFilter = quick !== 'all' || topicId || query.trim() || day || addedOnly;

    return (
        <div className="flex h-full min-h-0 flex-col">
            {/* ------------------------------------------------- fetch banner */}
            {fetchState.running && (
                <div data-testid="fetch-banner" className="pr-rise flex-none border-b border-orange-400/25 bg-orange-400/[0.07] px-6 py-2.5">
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

            {/* --------------------------------------------------- day strip */}
            <div className="flex-none border-b border-slate-800 px-6 pt-3">
                <div className="mx-auto max-w-4xl">
                    <div className="flex items-end gap-2">
                        <button
                            type="button"
                            data-testid="day-all"
                            onClick={() => setDay(null)}
                            className={cx(
                                'mb-1 flex-none rounded-lg border px-2.5 py-1 text-[11px] font-medium transition',
                                !day
                                    ? 'border-orange-400/50 bg-orange-400/[0.12] text-orange-200'
                                    : 'border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300',
                            )}
                        >
                            All
                            <span className="ml-1.5 font-mono text-[9.5px] opacity-60">{results.length}</span>
                        </button>

                        {/* One column per day: bar height is volume, so a week of activity
                            is readable at a glance and doubles as the navigation. */}
                        <div data-testid="day-strip" className="flex min-w-0 flex-1 items-end gap-[3px] overflow-x-auto pb-1">
                            {strip.map(({ iso, count, unread }) => {
                                const active = day === iso;
                                const d = new Date(iso);
                                const height = count ? Math.max(6, (count / peak) * 34) : 3;
                                return (
                                    <button
                                        key={iso}
                                        type="button"
                                        data-testid={`day-cell-${iso}`}
                                        title={`${dayLabel(iso)} — ${count} paper${count === 1 ? '' : 's'}`}
                                        onClick={() => setDay(active ? null : iso)}
                                        disabled={!count}
                                        className={cx(
                                            'group flex w-7 flex-none flex-col items-center gap-1 rounded-md pb-1 pt-1 transition',
                                            active ? 'bg-orange-400/[0.12]' : count ? 'hover:bg-white/5' : 'opacity-40',
                                        )}
                                    >
                                        <span className="flex h-[34px] w-full items-end justify-center">
                                            <span
                                                style={{ height }}
                                                className={cx(
                                                    'w-2.5 rounded-sm transition-all',
                                                    active ? 'bg-orange-400'
                                                        : unread ? 'bg-orange-400/[0.55] group-hover:bg-orange-400/80'
                                                            : count ? 'bg-slate-600 group-hover:bg-slate-500' : 'bg-slate-800',
                                                )}
                                            />
                                        </span>
                                        <span className={cx(
                                            'text-[9px] leading-none',
                                            active ? 'font-semibold text-orange-200' : 'text-slate-600',
                                        )}>
                                            {d.getDate()}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ------------------------------------------------ filters */}
                    <div className="flex flex-wrap items-center gap-1.5 py-2">
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
                        {addedCount > 0 && (
                            <Chip
                                data-testid="filter-added"
                                active={addedOnly}
                                title="Papers you looked up and added by hand"
                                onClick={() => setAddedOnly((v) => !v)}
                            >
                                + Added<span className="opacity-60"> {addedCount}</span>
                            </Chip>
                        )}
                        <div className="flex-1" />
                        {anyFilter && (
                            <button
                                type="button"
                                onClick={() => { setQuick('all'); setTopicId(null); setQuery(''); setDay(null); setAddedOnly(false); }}
                                className="text-[10.5px] text-slate-600 transition hover:text-orange-300"
                            >
                                reset
                            </button>
                        )}
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Filter...  au: ti: tag:"
                            aria-label="Filter papers"
                            className="w-52 rounded-lg border border-slate-700 bg-slate-950/60 px-2.5 py-1 text-[11.5px] text-slate-100 placeholder:text-slate-600 outline-none transition-colors focus:border-orange-400/60"
                        />
                    </div>
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
            <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                <div className="mx-auto max-w-4xl">
                    {!shownCount ? (
                        <Empty
                            icon="◈"
                            title={paperList.length ? 'Nothing here' : 'Nothing fetched yet'}
                            action={paperList.length
                                ? <Button onClick={() => { setQuick('all'); setTopicId(null); setQuery(''); setDay(null); }}>Clear filters</Button>
                                : <Button variant="primary" size="lg" onClick={onFetchAll}>Fetch papers</Button>}
                        >
                            {paperList.length
                                ? 'No papers match. Pick another day above, or loosen the filters.'
                                : 'Run a fetch and your topics fill this stream, newest first. Nothing is ever fetched twice.'}
                        </Empty>
                    ) : (
                        <div className="space-y-6">
                            {shownDays.map((group) => {
                                const unread = group.papers.filter(
                                    (p) => ((states[p.id] || {}).status || 'unread') === 'unread',
                                ).length;
                                return (
                                    <section key={group.iso} data-testid="day-group">
                                        <div className="sticky top-0 z-10 -mx-2 mb-2 flex items-baseline gap-2 bg-slate-950/[0.85] px-2 py-1.5 backdrop-blur-md">
                                            <h2 data-testid="day-heading" className="text-[12.5px] font-semibold text-slate-200">
                                                {group.label}
                                            </h2>
                                            <Count>
                                                {group.count} paper{group.count === 1 ? '' : 's'}
                                                {unread ? ` · ${unread} unread` : ''}
                                            </Count>
                                            <span className="h-px flex-1 bg-slate-800/80" />
                                            {unread > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => dispatch({
                                                        type: 'PAPER_STATE_BULK',
                                                        ids: group.papers.map((p) => p.id),
                                                        patch: { status: 'read' },
                                                    })}
                                                    className="text-[10px] text-slate-600 transition hover:text-orange-300"
                                                >
                                                    mark read
                                                </button>
                                            )}
                                        </div>

                                        <div className="pr-stagger space-y-1.5">
                                            {group.papers.map((p) => (
                                                <PaperRow
                                                    key={p.id}
                                                    paper={p}
                                                    dragSource={STREAM_SOURCE}
                                                    selected={selection.has(p.id)}
                                                    focused={openId === p.id}
                                                    selectionIds={Array.from(selection)}
                                                    onToggleSelect={() => toggleSelect(p.id)}
                                                    onOpen={() => { holdScroll(); setOpenId(openId === p.id ? null : p.id); }}
                                                    onContextMenu={(e) => open(e, p)}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                );
                            })}

                            <p className="pb-4 text-center text-[10px] text-slate-700">
                                {shownCount} shown · {paperList.length} in your library
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
