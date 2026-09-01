import React, { useMemo, useState } from 'react';

import { usePapers } from '../context';
import { authorLinks } from '../links';
import { Button, Chip, Empty, Input, Panel, StatTile, cx, shortDate } from '../components/ui';

/**
 * The people view. Every author in your library rolled up with their output, the
 * topics they publish in, their co-authors, and one click to every profile service
 * that matters — plus the follow switch that boosts their future work.
 */
export default function Authors({ onOpenAuthor }) {
    const { authorsIndex, dispatch, topics, counts, authors } = usePapers();
    const [q, setQ] = useState('');
    const [mode, setMode] = useState('all');   // all | following | rising
    const [expanded, setExpanded] = useState(null);

    const rows = useMemo(() => {
        const needle = q.trim().toLowerCase();
        let list = authorsIndex;
        if (mode === 'following') list = list.filter((a) => a.followed);
        if (mode === 'rising') {
            list = list
                .filter((a) => a.recentCount >= 2)
                .slice()
                .sort((a, b) => b.recentCount - a.recentCount || b.count - a.count);
        }
        if (needle) list = list.filter((a) => a.name.toLowerCase().includes(needle));
        return list.slice(0, 400);
    }, [authorsIndex, q, mode]);

    const followedPapersLast30 = useMemo(() => {
        const cutoff = Date.now() - 30 * 864e5;
        const ids = new Set();
        authorsIndex.filter((a) => a.followed).forEach((a) => {
            a.papers.forEach((p) => {
                if (new Date(p.firstSeen || p.published).getTime() >= cutoff) ids.add(p.id);
            });
        });
        return ids.size;
    }, [authorsIndex]);

    const topFollowed = useMemo(
        () => authorsIndex.filter((a) => a.followed).slice(0, 8),
        [authorsIndex],
    );

    return (
        <div className="mx-auto max-w-6xl space-y-4 px-5 py-6">
            <header className="flex flex-wrap items-center gap-3">
                <div>
                    <h1 className="text-base font-semibold text-slate-100">Authors</h1>
                    <p className="text-[11px] text-slate-500">
                        {counts.authors.toLocaleString()} researchers across your library · following {counts.following}
                    </p>
                </div>
                <div className="flex-1" />
                <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Find an author…"
                    className="!w-56 !py-1.5 !text-xs"
                />
                {[['all', 'All'], ['following', `Following (${counts.following})`], ['rising', 'Rising']].map(([k, label]) => (
                    <Button key={k} variant={mode === k ? 'active' : 'ghost'} onClick={() => setMode(k)}>{label}</Button>
                ))}
            </header>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile label="Following" value={counts.following} hint="researchers" tone="accent" />
                <StatTile label="From followed" value={counts.followed} hint="papers in library" tone="good" />
                <StatTile label="Last 30 days" value={followedPapersLast30} hint="papers by people you follow" />
                <StatTile
                    label="Share of digest"
                    value={counts.total ? `${Math.round((counts.followed / counts.total) * 100)}%` : '—'}
                    hint="of everything pulled"
                />
            </div>

            {topFollowed.length > 0 && (
                <Panel title="Who you are reading most" bodyClass="p-3">
                    <div className="flex flex-wrap gap-1.5">
                        {topFollowed.map((a) => (
                            <Chip key={a.key} onClick={() => onOpenAuthor(a.key)} className="!px-2 !py-1 !text-[11px]">
                                {a.name}
                                <span className="ml-1 rounded bg-slate-700 px-1 font-mono text-[9px]">{a.count}</span>
                            </Chip>
                        ))}
                    </div>
                </Panel>
            )}

            {!rows.length ? (
                <Empty
                    icon="◎"
                    title={mode === 'following' ? 'You are not following anyone yet' : 'No authors match'}
                >
                    {mode === 'following'
                        ? 'Open any paper and click the dot next to an author to follow them. Their future papers get a large ranking boost and collect in this tab.'
                        : 'Fetch a few topics to populate the author index.'}
                </Empty>
            ) : (
                <div className="overflow-hidden rounded-xl border border-slate-800">
                    <table className="w-full text-left text-[12px]">
                        <thead className="bg-slate-800/40 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                            <tr>
                                <th className="px-3 py-2 font-semibold">Author</th>
                                <th className="w-16 px-2 py-2 text-right font-semibold">Papers</th>
                                <th className="w-16 px-2 py-2 text-right font-semibold">30d</th>
                                <th className="hidden px-3 py-2 font-semibold md:table-cell">Topics</th>
                                <th className="hidden w-24 px-3 py-2 font-semibold lg:table-cell">Last seen</th>
                                <th className="w-24 px-3 py-2 text-right font-semibold">Follow</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((a) => {
                                const open = expanded === a.key;
                                return (
                                    <React.Fragment key={a.key}>
                                        <tr
                                            onClick={() => setExpanded(open ? null : a.key)}
                                            className={cx(
                                                'cursor-pointer border-t border-slate-800 transition',
                                                open ? 'bg-white/5' : 'hover:bg-slate-800/40',
                                            )}
                                        >
                                            <td className="px-3 py-2">
                                                <span className={cx('font-medium', a.followed ? 'text-orange-300' : 'text-slate-200')}>
                                                    {a.name}
                                                </span>
                                                {a.affiliation && (
                                                    <span className="ml-2 text-[10px] text-slate-600">{a.affiliation}</span>
                                                )}
                                            </td>
                                            <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-400">{a.count}</td>
                                            <td className={cx(
                                                'px-2 py-2 text-right font-mono tabular-nums',
                                                a.recentCount ? 'text-emerald-400' : 'text-slate-700',
                                            )}>
                                                {a.recentCount || '—'}
                                            </td>
                                            <td className="hidden px-3 py-2 md:table-cell">
                                                <span className="flex flex-wrap gap-1">
                                                    {a.topicIds.slice(0, 3).map((id) => {
                                                        const t = topics.find((x) => x.id === id);
                                                        return t ? <Chip key={id} color={t.color}>{t.name}</Chip> : null;
                                                    })}
                                                    {!a.topicIds.length && a.categories.slice(0, 2).map((c) => <Chip key={c}>{c}</Chip>)}
                                                </span>
                                            </td>
                                            <td className="hidden px-3 py-2 text-[11px] text-slate-500 lg:table-cell">
                                                {shortDate(a.last)}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <Button
                                                    size="sm"
                                                    variant={a.followed ? 'active' : 'ghost'}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        dispatch({ type: 'AUTHOR_TOGGLE', name: a.name });
                                                    }}
                                                >
                                                    {a.followed ? '● Following' : '○ Follow'}
                                                </Button>
                                            </td>
                                        </tr>
                                        {open && (
                                            <tr className="border-t border-slate-800 bg-slate-950/40">
                                                <td colSpan={6} className="px-4 py-3">
                                                    <AuthorDetail author={a} onOpenAuthor={onOpenAuthor} record={authors[a.key]} dispatch={dispatch} />
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function AuthorDetail({ author, onOpenAuthor, record, dispatch }) {
    const recent = [...author.papers]
        .sort((a, b) => String(b.published).localeCompare(String(a.published)))
        .slice(0, 6);

    return (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div>
                <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Recent papers in your library
                </h4>
                <ul className="space-y-1">
                    {recent.map((p) => (
                        <li key={p.id} className="flex gap-2">
                            <span className="flex-none font-mono text-[10px] text-slate-600">{shortDate(p.published)}</span>
                            <a
                                href={`https://arxiv.org/abs/${p.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="line-clamp-1 text-[11.5px] text-slate-300 hover:text-orange-300"
                            >
                                {p.title}
                            </a>
                        </li>
                    ))}
                </ul>
                <Button className="mt-2" size="sm" onClick={() => onOpenAuthor(author.key)}>
                    See all {author.count} in the library
                </Button>
            </div>

            <div className="space-y-3">
                <div>
                    <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Profiles</h4>
                    <div className="flex flex-wrap gap-1.5">
                        {authorLinks(author.name, record || {}).map((l) => (
                            <a
                                key={l.key}
                                href={l.href}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg border border-slate-700 bg-slate-800/40 px-2 py-1 text-[10.5px] text-slate-400 transition hover:border-orange-400/40 hover:text-orange-300"
                            >
                                {l.label}
                            </a>
                        ))}
                    </div>
                    <input
                        defaultValue={(record && record.scholar) || ''}
                        onBlur={(e) => dispatch({ type: 'AUTHOR_PATCH', name: author.name, patch: { scholar: e.target.value.trim() } })}
                        placeholder="Google Scholar user id (optional) — links straight to their profile"
                        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1 text-[10.5px] text-slate-300 placeholder:text-slate-600 outline-none focus:border-orange-400/50"
                    />
                </div>

                {author.coauthors.length > 0 && (
                    <div>
                        <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Co-authors ({author.coauthors.length})
                        </h4>
                        <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                            {author.coauthors.slice(0, 30).map((name) => (
                                <Chip key={name}>{name}</Chip>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
