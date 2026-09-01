import React, { useMemo } from 'react';

import { usePapers } from '../context';
import { trendingTerms } from '../scoring';
import { BarRow, Panel, Sparkline, StatTile, Chip, cx } from '../components/ui';

/** Where your reading time is actually going, and what is heating up in your field. */
export default function Stats({ onGo }) {
    const { paperList, states, topics, counts, authorsIndex, history, feedback } = usePapers();

    const daily = useMemo(() => {
        const days = [];
        for (let i = 59; i >= 0; i -= 1) {
            const day = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
            days.push({
                day,
                added: paperList.filter((p) => String(p.firstSeen || '').slice(0, 10) === day).length,
                read: Object.values(states).filter((s) => String(s.readAt || '').slice(0, 10) === day).length,
            });
        }
        return days;
    }, [paperList, states]);

    const byTopic = useMemo(() => {
        const map = new Map();
        paperList.forEach((p) => (p.topicIds || []).forEach((t) => map.set(t, (map.get(t) || 0) + 1)));
        return topics
            .map((t) => ({ ...t, count: map.get(t.id) || 0 }))
            .sort((a, b) => b.count - a.count);
    }, [paperList, topics]);

    const byCategory = useMemo(() => {
        const map = new Map();
        paperList.forEach((p) => { if (p.primary) map.set(p.primary, (map.get(p.primary) || 0) + 1); });
        return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12);
    }, [paperList]);

    const trends = useMemo(() => trendingTerms(paperList, { windowDays: 14, limit: 18 }), [paperList]);

    const streak = useMemo(() => {
        let n = 0;
        for (let i = 0; i < 365; i += 1) {
            const day = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
            const readThatDay = Object.values(states).some((s) => String(s.readAt || '').slice(0, 10) === day);
            if (readThatDay) n += 1;
            else if (i > 0) break;                 // today not yet counted does not break the streak
        }
        return n;
    }, [states]);

    const timeToRead = useMemo(() => {
        const deltas = [];
        Object.entries(states).forEach(([id, s]) => {
            const p = paperList.find((x) => x.id === id);
            if (!p || !s.readAt || !p.firstSeen) return;
            deltas.push((new Date(s.readAt) - new Date(p.firstSeen)) / 864e5);
        });
        if (!deltas.length) return null;
        deltas.sort((a, b) => a - b);
        return deltas[Math.floor(deltas.length / 2)];
    }, [states, paperList]);

    const learned = useMemo(() => {
        const entries = Object.entries(feedback.terms || {});
        return {
            liked: entries.filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]).slice(0, 14),
            disliked: entries.filter(([, w]) => w < 0).sort((a, b) => a[1] - b[1]).slice(0, 10),
        };
    }, [feedback]);

    const totalFetched = history.reduce((n, h) => n + h.fetched, 0);
    const totalKept = history.reduce((n, h) => n + h.kept, 0);
    const maxTopic = Math.max(1, ...byTopic.map((t) => t.count));
    const maxCat = Math.max(1, ...byCategory.map(([, n]) => n));

    return (
        <div className="mx-auto max-w-6xl space-y-4 px-5 py-6">
            <header>
                <h1 className="text-base font-semibold text-slate-100">Statistics</h1>
                <p className="text-[11px] text-slate-500">Everything computed locally over your stored library.</p>
            </header>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile label="In library" value={counts.total.toLocaleString()} hint={`${counts.unread} unread`} />
                <StatTile label="Read" value={counts.read} tone="good" hint={counts.total ? `${Math.round((counts.read / counts.total) * 100)}% of library` : ''} />
                <StatTile label="Queue" value={counts.queued} tone={counts.queued > 20 ? 'warn' : 'default'} hint="waiting for you" />
                <StatTile label="Reading streak" value={streak ? `${streak}d` : '—'} tone="accent" hint="consecutive days with a read" />
            </div>

            <Panel title="Papers in vs. papers read — last 60 days">
                <div className="space-y-3">
                    <div>
                        <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                            <span>New into library</span>
                            <span>{daily.reduce((n, d) => n + d.added, 0)} total</span>
                        </div>
                        <Sparkline data={daily.map((d) => d.added)} height={40} color="#38bdf8" />
                    </div>
                    <div>
                        <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                            <span>Marked read</span>
                            <span>{daily.reduce((n, d) => n + d.read, 0)} total</span>
                        </div>
                        <Sparkline data={daily.map((d) => d.read)} height={40} color="#34d399" />
                    </div>
                    <p className="text-[10.5px] text-slate-600">
                        {totalFetched > 0 && `${totalKept} of ${totalFetched} results fetched were new to you — the rest were deduplicated. `}
                        {timeToRead != null && `Median time from arriving to being read: ${timeToRead.toFixed(1)} days.`}
                    </p>
                </div>
            </Panel>

            <div className="grid gap-3 lg:grid-cols-2">
                <Panel title="Volume by topic">
                    {byTopic.length ? byTopic.map((t) => (
                        <BarRow key={t.id} label={t.name} value={t.count} max={maxTopic} color={t.color} />
                    )) : <p className="text-[11px] text-slate-600">No topics yet.</p>}
                </Panel>

                <Panel title="Primary categories">
                    {byCategory.length ? byCategory.map(([c, n]) => (
                        <BarRow key={c} label={c} value={n} max={maxCat} color="#a78bfa" />
                    )) : <p className="text-[11px] text-slate-600">Nothing fetched yet.</p>}
                </Panel>
            </div>

            <Panel
                title="Trending in the last two weeks"
                action={<span className="text-[10px] text-slate-600">lift vs. your library baseline</span>}
            >
                {trends.length ? (
                    <div className="flex flex-wrap gap-1.5">
                        {trends.map((t) => (
                            <span
                                key={t.term}
                                title={`${t.count} papers · ${t.lift}× more frequent than usual`}
                                className={cx(
                                    'rounded-md border px-2 py-1 text-[11px]',
                                    t.lift > 2.5
                                        ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                                        : 'border-white/10 bg-white/[0.04] text-slate-300',
                                )}
                            >
                                {t.term}
                                <span className="ml-1.5 font-mono text-[9.5px] opacity-60">{t.lift}×</span>
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="text-[11px] text-slate-600">
                        Needs a couple of weeks of history before a trend means anything.
                    </p>
                )}
            </Panel>

            <div className="grid gap-3 lg:grid-cols-2">
                <Panel
                    title="Most frequent authors"
                    action={
                        <button type="button" onClick={() => onGo('authors')} className="text-[10px] text-slate-500 hover:text-sky-300">
                            all authors →
                        </button>
                    }
                >
                    {authorsIndex.slice(0, 12).map((a) => (
                        <BarRow
                            key={a.key}
                            label={a.followed ? `● ${a.name}` : a.name}
                            value={a.count}
                            max={Math.max(1, authorsIndex[0].count)}
                            color={a.followed ? '#38bdf8' : '#64748b'}
                        />
                    ))}
                    {!authorsIndex.length && <p className="text-[11px] text-slate-600">Nothing fetched yet.</p>}
                </Panel>

                <Panel
                    title="What the ranker has learned"
                    action={<span className="text-[10px] text-slate-600">from your stars and dismissals</span>}
                >
                    {learned.liked.length || learned.disliked.length ? (
                        <div className="space-y-3">
                            <div>
                                <h4 className="mb-1.5 text-[10px] uppercase tracking-[0.12em] text-emerald-400/70">Pulls papers up</h4>
                                <div className="flex flex-wrap gap-1">
                                    {learned.liked.map(([term, w]) => (
                                        <Chip key={term} className="!border-emerald-400/30 !bg-emerald-500/10 !text-emerald-200">
                                            {term} <span className="opacity-60">+{w.toFixed(2)}</span>
                                        </Chip>
                                    ))}
                                </div>
                            </div>
                            {learned.disliked.length > 0 && (
                                <div>
                                    <h4 className="mb-1.5 text-[10px] uppercase tracking-[0.12em] text-rose-400/70">Pushes papers down</h4>
                                    <div className="flex flex-wrap gap-1">
                                        {learned.disliked.map(([term, w]) => (
                                            <Chip key={term} className="!border-rose-400/30 !bg-rose-500/10 !text-rose-200">
                                                {term} <span className="opacity-60">{w.toFixed(2)}</span>
                                            </Chip>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-[11px] text-slate-600">
                            Star what you like and dismiss what you do not; the ranker picks up the vocabulary
                            of each and reorders tomorrow&apos;s digest accordingly.
                        </p>
                    )}
                </Panel>
            </div>
        </div>
    );
}
