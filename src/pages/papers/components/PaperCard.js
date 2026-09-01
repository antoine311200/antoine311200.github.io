import React from 'react';

import { usePapers } from '../context';
import { authorKey } from '../storage';
import { Chip, ScoreBadge, cx, shortDate } from './ui';

const STATUS_STYLE = {
    unread: '',
    queued: 'text-sky-300',
    reading: 'text-orange-300',
    read: 'text-emerald-400',
    archived: 'text-slate-600',
    dismissed: 'text-slate-700',
};

const ICONS = {
    star: (filled) => (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3.5l2.6 5.3 5.9.86-4.25 4.14 1 5.87L12 16.9l-5.25 2.77 1-5.87L3.5 9.66l5.9-.86z" strokeLinejoin="round" />
        </svg>
    ),
    queue: (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 7h11M4 12h11M4 17h7M18 12v7M14.5 15.5h7" strokeLinecap="round" />
        </svg>
    ),
    check: (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    hide: (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M5 12h14" strokeLinecap="round" />
        </svg>
    ),
};

function IconButton({ title, onClick, active, tone, children }) {
    return (
        <button
            type="button"
            title={title}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={cx(
                'rounded-md p-1.5 transition-colors',
                active ? tone || 'text-orange-300 bg-orange-400/10' : 'text-slate-500 hover:bg-white/5 hover:text-slate-200',
            )}
        >
            {children}
        </button>
    );
}

export default function PaperCard({ paper, selected, focused, onOpen, onSelectToggle, showDay }) {
    const { dispatch, stateOf, topics, authors, settings } = usePapers();
    const st = stateOf(paper.id);
    const compact = settings.density === 'compact';

    const patch = (p) => dispatch({ type: 'PAPER_STATE', id: paper.id, patch: p });

    const topicChips = (paper.topicIds || [])
        .map((id) => topics.find((t) => t.id === id))
        .filter(Boolean);

    const followedAuthors = new Set(
        (paper.authors || [])
            .filter((a) => { const rec = authors[authorKey(a.name)]; return rec && rec.followedAt; })
            .map((a) => a.name),
    );

    const authorLine = (paper.authors || []).slice(0, 6);
    const overflow = (paper.authors || []).length - authorLine.length;
    const enriched = paper.enriched && !paper.enriched.miss ? paper.enriched : null;

    return (
        <article
            onClick={onOpen}
            className={cx(
                'group relative cursor-pointer rounded-xl border px-4 transition-colors duration-150',
                compact ? 'py-2.5' : 'py-3.5',
                focused
                    ? 'border-orange-400/50 bg-orange-400/[0.06] shadow-lg shadow-black/20'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-white/5',
                st.status === 'dismissed' && 'opacity-40',
                st.status === 'archived' && 'opacity-60',
            )}
        >
            {/* Unread marker */}
            {st.status === 'unread' && (
                <span className="absolute left-1.5 top-4 h-1.5 w-1.5 rounded-full bg-orange-400/80" aria-hidden />
            )}

            <div className="flex items-start gap-3">
                <input
                    type="checkbox"
                    checked={!!selected}
                    onClick={(e) => e.stopPropagation()}
                    onChange={onSelectToggle}
                    className="mt-1 h-3.5 w-3.5 flex-none cursor-pointer accent-orange-400 opacity-0 transition group-hover:opacity-100 checked:opacity-100"
                    aria-label="Select paper"
                />

                <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                        <h3 className={cx(
                            'min-w-0 flex-1 font-medium leading-snug text-slate-100',
                            compact ? 'text-[13px] line-clamp-1' : 'text-sm line-clamp-2',
                            st.status === 'read' && 'text-slate-400',
                        )}>
                            {paper.title}
                        </h3>
                        <ScoreBadge score={paper.score || 0} reasons={paper.reasons} />
                    </div>

                    <p className="mt-1 truncate text-[11px] text-slate-500">
                        {authorLine.map((a, i) => (
                            <React.Fragment key={a.name + i}>
                                {i > 0 && ', '}
                                <span className={followedAuthors.has(a.name) ? 'font-medium text-orange-300' : undefined}>
                                    {a.name}
                                </span>
                            </React.Fragment>
                        ))}
                        {overflow > 0 && <span className="text-slate-600"> +{overflow}</span>}
                    </p>

                    {!compact && (
                        <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-relaxed text-slate-500">
                            {enriched && enriched.tldr ? <span className="text-slate-400">TL;DR — {enriched.tldr}</span> : paper.summary}
                        </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {showDay && (
                            <span className="font-mono text-[10px] text-slate-600">{shortDate(paper.firstSeen || paper.published)}</span>
                        )}
                        {paper.primary && <Chip title="Primary arXiv category">{paper.primary}</Chip>}
                        {topicChips.map((t) => <Chip key={t.id} color={t.color}>{t.name}</Chip>)}
                        {paper.version > 1 && <Chip title="Revised on arXiv">v{paper.version}</Chip>}
                        {enriched && enriched.citations > 0 && (
                            <Chip title="Semantic Scholar citations">{enriched.citations} cites</Chip>
                        )}
                        {paper.journalRef && <Chip title={paper.journalRef}>published</Chip>}
                        {st.tags.map((tag) => (
                            <Chip key={tag} className="!border-violet-400/30 !bg-violet-500/10 !text-violet-300">#{tag}</Chip>
                        ))}
                        {st.note && <Chip title={st.note}>note</Chip>}
                        {st.status !== 'unread' && (
                            <span className={cx('text-[10px] font-medium capitalize', STATUS_STYLE[st.status])}>
                                {st.status}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex flex-none items-center gap-0.5 self-start opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    <IconButton
                        title="Star"
                        active={st.starred}
                        tone="text-amber-300 bg-amber-500/10"
                        onClick={() => {
                            patch({ starred: !st.starred });
                            if (!st.starred) dispatch({ type: 'LEARN', paper, direction: 1 });
                        }}
                    >
                        {ICONS.star(st.starred)}
                    </IconButton>
                    <IconButton
                        title="Add to reading queue"
                        active={st.status === 'queued'}
                        tone="text-sky-300 bg-sky-500/10"
                        onClick={() => patch({ status: st.status === 'queued' ? 'unread' : 'queued' })}
                    >
                        {ICONS.queue}
                    </IconButton>
                    <IconButton
                        title="Mark read"
                        active={st.status === 'read'}
                        tone="text-emerald-300 bg-emerald-500/10"
                        onClick={() => patch({ status: st.status === 'read' ? 'unread' : 'read' })}
                    >
                        {ICONS.check}
                    </IconButton>
                    <IconButton
                        title="Not interested — teaches the ranker"
                        onClick={() => {
                            patch({ status: 'dismissed' });
                            dispatch({ type: 'LEARN', paper, direction: -1 });
                        }}
                    >
                        {ICONS.hide}
                    </IconButton>
                </div>
            </div>
        </article>
    );
}
