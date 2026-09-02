import React from 'react';

import { usePapers } from '../context';
import { useDrag, STREAM_SOURCE } from '../dnd';
import { authorKey } from '../storage';
import { Chip, IconButton, cx, shortDate } from '../ui';

const Icon = {
    star: (filled) => (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.8L12 16.9l-5.2 2.75 1-5.8-4.2-4.1 5.8-.85z" strokeLinejoin="round" />
        </svg>
    ),
    check: (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    clock: (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    dismiss: (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M6.5 6.5l11 11" strokeLinecap="round" />
        </svg>
    ),
    grip: (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
            <circle cx="9" cy="6" r="1.4" /><circle cx="15" cy="6" r="1.4" />
            <circle cx="9" cy="12" r="1.4" /><circle cx="15" cy="12" r="1.4" />
            <circle cx="9" cy="18" r="1.4" /><circle cx="15" cy="18" r="1.4" />
        </svg>
    ),
};

/** Reading status shows as a coloured edge on the card, never as a dot in the text. */
const EDGE = {
    queued: 'bg-sky-400',
    reading: 'bg-sky-400',
    read: 'bg-emerald-400/70',
    archived: 'bg-slate-600',
    dismissed: 'bg-slate-700',
};

/**
 * One paper in a list. Draggable everywhere, so the same row works in the Stream,
 * in a folder, and on the shelf.
 */
export default function PaperRow({
    paper, selected, focused, onOpen, onToggleSelect, onContextMenu, selectionIds, dense,
    dragSource = STREAM_SOURCE,
}) {
    const { dispatch, stateOf, topics, authors } = usePapers();
    const { startPaperDrag, endDrag, dragging } = useDrag();
    const st = stateOf(paper.id);

    const patch = (p) => dispatch({ type: 'PAPER_STATE', id: paper.id, patch: p });
    const topicChips = (paper.topicIds || []).map((id) => topics.find((t) => t.id === id)).filter(Boolean);
    const followed = new Set(
        (paper.authors || [])
            .filter((a) => { const r = authors[authorKey(a.name)]; return r && r.followedAt; })
            .map((a) => a.name),
    );
    const shown = (paper.authors || []).slice(0, 4);
    const extra = (paper.authors || []).length - shown.length;
    const citations = paper.enriched && paper.enriched.citations != null
        ? paper.enriched.citations : paper.citations;
    const isDragged = dragging && dragging.kind === 'paper' && dragging.ids.includes(paper.id);
    const queued = st.status === 'queued' || st.status === 'reading';
    const dismissed = st.status === 'dismissed';

    // The score is meaningless as a bare number, so it carries its own explanation.
    const scoreTitle = [
        `Relevance ${paper.score || 0} — why this ranked here`,
        ...(paper.reasons || []).map((r) => `· ${r.label}`),
    ].join('\n');

    /** Active actions stay visible; the rest appear on hover. */
    const action = (active) => cx(active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100');

    return (
        <article
            data-testid="paper-row"
            data-paper-id={paper.id}
            draggable
            onDragStart={(e) => startPaperDrag(
                e,
                selected && selectionIds && selectionIds.length ? selectionIds : [paper.id],
                dragSource,
            )}
            onDragEnd={endDrag}
            onClick={onOpen}
            onContextMenu={onContextMenu}
            className={cx(
                'group relative cursor-pointer overflow-hidden rounded-xl border pl-4 pr-3.5 transition-all duration-150',
                dense ? 'py-2' : 'py-2.5',
                focused
                    ? 'border-orange-400/50 bg-orange-400/[0.06]'
                    : selected
                        ? 'border-orange-400/30 bg-orange-400/[0.04]'
                        : st.starred
                            ? 'border-amber-400/30 bg-slate-900/50 hover:border-amber-400/50 hover:bg-slate-900/70'
                            : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70',
                isDragged && 'pr-dragging',
                // Not interested: kept in place, faded out of the way rather than removed.
                dismissed && 'opacity-45 hover:opacity-80',
            )}
        >
            {/* Status lives on the card's edge, not as a dot inside the sentence. */}
            {EDGE[st.status] && (
                <span
                    aria-hidden
                    title={st.status}
                    className={cx('absolute inset-y-0 left-0 w-[3px]', EDGE[st.status])}
                />
            )}

            <div className="flex items-start gap-2.5">
                <span
                    className="mt-0.5 flex-none cursor-grab text-slate-700 opacity-0 transition group-hover:opacity-100 active:cursor-grabbing"
                    title="Drag to a folder"
                >
                    {Icon.grip}
                </span>

                <input
                    type="checkbox"
                    checked={!!selected}
                    onClick={(e) => e.stopPropagation()}
                    onChange={onToggleSelect}
                    aria-label={`Select ${paper.title}`}
                    className={cx(
                        'mt-1 h-3.5 w-3.5 flex-none cursor-pointer accent-orange-400 transition',
                        selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                    )}
                />

                <div className="min-w-0 flex-1">
                    <h3 className={cx(
                        'text-[13px] font-medium leading-snug',
                        dense ? 'truncate' : 'line-clamp-2',
                        st.status === 'read' || dismissed ? 'text-slate-400' : 'text-slate-100',
                        dismissed && 'line-through decoration-slate-600',
                    )}>
                        {paper.title}
                    </h3>

                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {shown.map((a, i) => (
                            <React.Fragment key={a.name + i}>
                                {i > 0 && ', '}
                                <span className={followed.has(a.name) ? 'font-medium text-orange-300' : undefined}>{a.name}</span>
                            </React.Fragment>
                        ))}
                        {extra > 0 && <span className="text-slate-600"> +{extra}</span>}
                    </p>

                    {!dense && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[10px] text-slate-600">{shortDate(paper.published)}</span>
                            {topicChips.map((t) => <Chip key={t.id} color={t.color}>{t.name}</Chip>)}
                            {citations > 0 && <Chip title="Citations, via OpenAlex">{citations} cites</Chip>}
                            {st.tags.map((tag) => (
                                <Chip key={tag} className="!border-violet-400/30 !bg-violet-500/10 !text-violet-300">#{tag}</Chip>
                            ))}
                            {st.note && <Chip title={st.note}>note</Chip>}
                        </div>
                    )}
                </div>

                <div className="flex flex-none items-center gap-0.5 self-start">
                    <span
                        title={scoreTitle}
                        data-testid="score-chip"
                        className={cx(
                            'mr-1 cursor-help rounded-full border px-1.5 py-0.5 font-mono text-[10px] tabular-nums',
                            (paper.score || 0) >= 60
                                ? 'border-orange-400/40 bg-orange-400/10 text-orange-200'
                                : 'border-slate-800 bg-slate-900/60 text-slate-500',
                        )}
                    >
                        {paper.score || 0}
                    </span>

                    <IconButton
                        label={st.starred ? 'Unstar' : 'Star'}
                        active={st.starred}
                        tone="bg-amber-400/[0.12] text-amber-300"
                        className={action(st.starred)}
                        onClick={(e) => {
                            e.stopPropagation();
                            patch({ starred: !st.starred });
                            if (!st.starred) dispatch({ type: 'LEARN', paper, direction: 1 });
                        }}
                    >
                        {Icon.star(st.starred)}
                    </IconButton>

                    <IconButton
                        label={queued ? 'Remove from read later' : 'Read later'}
                        active={queued}
                        tone="bg-sky-400/[0.12] text-sky-300"
                        className={action(queued)}
                        onClick={(e) => {
                            e.stopPropagation();
                            patch({ status: queued ? 'unread' : 'queued' });
                        }}
                    >
                        {Icon.clock}
                    </IconButton>

                    <IconButton
                        label={st.status === 'read' ? 'Mark unread' : 'Mark read'}
                        active={st.status === 'read'}
                        tone="bg-emerald-400/[0.12] text-emerald-300"
                        className={action(st.status === 'read')}
                        onClick={(e) => {
                            e.stopPropagation();
                            patch({ status: st.status === 'read' ? 'unread' : 'read' });
                        }}
                    >
                        {Icon.check}
                    </IconButton>

                    <IconButton
                        label={dismissed ? 'Interested after all' : 'Not interested'}
                        active={dismissed}
                        tone="bg-slate-700/60 text-slate-300"
                        className={action(dismissed)}
                        onClick={(e) => {
                            e.stopPropagation();
                            patch({ status: dismissed ? 'unread' : 'dismissed' });
                            if (!dismissed) dispatch({ type: 'LEARN', paper, direction: -1 });
                        }}
                    >
                        {Icon.dismiss}
                    </IconButton>
                </div>
            </div>
        </article>
    );
}
