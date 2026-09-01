import React, { useMemo, useState } from 'react';

import { usePapers } from '../context';
import { authorKey, download } from '../storage';
import { similarTo } from '../scoring';
import { paperLinks, pdfEmbedUrl, authorLinks } from '../links';
import { toBibtex } from '../bibtex';
import { Button, Chip, ScoreBadge, TokenInput, cx, useCopy, shortDate } from './ui';

const STATUSES = ['unread', 'queued', 'reading', 'read', 'archived', 'dismissed'];

/**
 * The right-hand reading panel: metadata, every outbound link, your notes, the
 * neighbourhood of similar work, and an inline PDF you can expand to full width.
 */
export default function PaperDetail({ paper, onClose, onNavigate }) {
    const {
        dispatch, stateOf, topics, authors, index, papers, settings, collections, notify,
    } = usePapers();
    const [tab, setTab] = useState('overview');
    const [pdfOpen, setPdfOpen] = useState(settings.pdfInline);
    const [copied, copy] = useCopy();

    const st = stateOf(paper.id);
    const patch = (p) => dispatch({ type: 'PAPER_STATE', id: paper.id, patch: p });

    const similar = useMemo(() => similarTo(index, paper.id, papers, 8), [index, paper.id, papers]);
    const links = paperLinks(paper);
    const enriched = paper.enriched && !paper.enriched.miss ? paper.enriched : null;

    const topicChips = (paper.topicIds || []).map((id) => topics.find((t) => t.id === id)).filter(Boolean);

    return (
        <aside className="flex h-full min-h-0 flex-col border-l border-slate-800 bg-slate-950/70 backdrop-blur-sm">
            {/* ------------------------------------------------------------ header */}
            <header className="flex items-start gap-2 border-b border-slate-800 px-4 py-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <ScoreBadge score={paper.score || 0} reasons={paper.reasons} />
                        <span className="font-mono text-[10px] text-slate-500">
                            arXiv:{paper.id}{paper.version > 1 ? `v${paper.version}` : ''}
                        </span>
                        <span className="text-[10px] text-slate-600">{shortDate(paper.published)}</span>
                    </div>
                    <h2 className="mt-1.5 text-[15px] font-semibold leading-snug text-slate-50">{paper.title}</h2>
                </div>
                <div className="flex flex-none items-center gap-1">
                    {onNavigate && (
                        <>
                            <Button variant="subtle" size="sm" onClick={() => onNavigate(-1)} title="Previous (k)">↑</Button>
                            <Button variant="subtle" size="sm" onClick={() => onNavigate(1)} title="Next (j)">↓</Button>
                        </>
                    )}
                    <Button variant="subtle" size="sm" onClick={onClose} title="Close (Esc)">✕</Button>
                </div>
            </header>

            {/* --------------------------------------------------------- quick bar */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 px-4 py-2">
                <select
                    value={st.status}
                    onChange={(e) => patch({ status: e.target.value })}
                    className="rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1 text-[11px] capitalize text-slate-200 outline-none focus:border-orange-400/60"
                >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <Button
                    variant={st.starred ? 'active' : 'ghost'}
                    size="sm"
                    onClick={() => {
                        patch({ starred: !st.starred });
                        if (!st.starred) dispatch({ type: 'LEARN', paper, direction: 1 });
                    }}
                >
                    {st.starred ? '★ Starred' : '☆ Star'}
                </Button>
                <div className="flex items-center gap-0.5" title="Rating">
                    {[1, 2, 3, 4, 5].map((n) => (
                        <button
                            key={n}
                            type="button"
                            onClick={() => patch({ rating: st.rating === n ? 0 : n })}
                            className={cx('px-0.5 text-xs transition', n <= st.rating ? 'text-amber-300' : 'text-slate-700 hover:text-slate-500')}
                        >
                            ★
                        </button>
                    ))}
                </div>
                <div className="flex-1" />
                <Button size="sm" onClick={() => copy(toBibtex(paper), 'bib')}>
                    {copied === 'bib' ? 'Copied' : 'BibTeX'}
                </Button>
                <Button size="sm" variant={pdfOpen ? 'active' : 'ghost'} onClick={() => setPdfOpen(!pdfOpen)}>
                    PDF
                </Button>
            </div>

            {/* ------------------------------------------------------------- tabs */}
            <nav className="flex gap-1 border-b border-slate-800 px-3 pt-2">
                {[
                    ['overview', 'Overview'],
                    ['notes', st.note ? 'Notes •' : 'Notes'],
                    ['related', `Related${similar.length ? ` (${similar.length})` : ''}`],
                ].map(([id, label]) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setTab(id)}
                        className={cx(
                            'rounded-t-lg px-3 py-1.5 text-[11px] font-medium transition',
                            tab === id ? 'bg-slate-800/60 text-orange-200' : 'text-slate-500 hover:text-slate-300',
                        )}
                    >
                        {label}
                    </button>
                ))}
            </nav>

            <div className="min-h-0 flex-1 overflow-y-auto">
                {tab === 'overview' && (
                    <div className="space-y-5 px-4 py-4">
                        {enriched && (
                            <div className="flex flex-wrap gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-[11px]">
                                {enriched.citations != null && (
                                    <span className="text-slate-400">
                                        <b className="text-slate-100">{enriched.citations}</b> citations
                                    </span>
                                )}
                                {enriched.influential > 0 && (
                                    <span className="text-slate-400">
                                        <b className="text-slate-100">{enriched.influential}</b> influential
                                    </span>
                                )}
                                {enriched.venue && <span className="text-slate-400">{enriched.venue}</span>}
                            </div>
                        )}

                        {enriched && enriched.tldr && (
                            <section>
                                <SectionTitle>TL;DR</SectionTitle>
                                <p className="text-[12.5px] leading-relaxed text-slate-300">{enriched.tldr}</p>
                            </section>
                        )}

                        <section>
                            <SectionTitle>Abstract</SectionTitle>
                            <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-slate-400">
                                {paper.summary}
                            </p>
                        </section>

                        <section>
                            <SectionTitle>Authors</SectionTitle>
                            <div className="space-y-1">
                                {(paper.authors || []).map((a) => {
                                    const key = authorKey(a.name);
                                    const rec = authors[key];
                                    const followed = !!(rec && rec.followedAt);
                                    return (
                                        <div key={key} className="group flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-white/5">
                                            <button
                                                type="button"
                                                onClick={() => dispatch({ type: 'AUTHOR_TOGGLE', name: a.name })}
                                                title={followed ? 'Unfollow' : 'Follow — boosts their future papers'}
                                                className={cx(
                                                    'flex-none rounded px-1 text-xs transition',
                                                    followed ? 'text-orange-300' : 'text-slate-700 hover:text-slate-400',
                                                )}
                                            >
                                                {followed ? '●' : '○'}
                                            </button>
                                            <span className={cx('min-w-0 flex-1 truncate text-[12px]', followed ? 'text-orange-200' : 'text-slate-300')}>
                                                {a.name}
                                                {a.affiliation && <span className="ml-1 text-[10px] text-slate-600">{a.affiliation}</span>}
                                            </span>
                                            <span className="flex flex-none gap-1 opacity-0 transition group-hover:opacity-100">
                                                {authorLinks(a.name, rec || {}).slice(0, 3).map((l) => (
                                                    <a
                                                        key={l.key}
                                                        href={l.href}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="rounded-full border border-slate-700 px-1.5 py-0.5 text-[9px] text-slate-400 transition hover:border-orange-400/50 hover:text-orange-300"
                                                    >
                                                        {l.key === 'scholar' ? 'Scholar' : l.key === 'arxiv' ? 'arXiv' : 'S2'}
                                                    </a>
                                                ))}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <section>
                            <SectionTitle>Why you are seeing this</SectionTitle>
                            {(paper.reasons || []).length ? (
                                <ul className="space-y-1">
                                    {paper.reasons.map((r, i) => (
                                        <li key={i} className="flex gap-2 text-[11.5px] text-slate-400">
                                            <span className="text-orange-400">·</span>{r.label}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-[11.5px] text-slate-600">
                                    Pulled by a topic query but matching no keyword directly.
                                </p>
                            )}
                        </section>

                        <section>
                            <SectionTitle>Metadata</SectionTitle>
                            <dl className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-1 text-[11.5px]">
                                <Meta label="Categories">
                                    <span className="flex flex-wrap gap-1">
                                        {(paper.categories || []).map((c) => (
                                            <Chip key={c} active={c === paper.primary}>{c}</Chip>
                                        ))}
                                    </span>
                                </Meta>
                                <Meta label="Topics">
                                    <span className="flex flex-wrap gap-1">
                                        {topicChips.length
                                            ? topicChips.map((t) => <Chip key={t.id} color={t.color}>{t.name}</Chip>)
                                            : <span className="text-slate-600">—</span>}
                                    </span>
                                </Meta>
                                <Meta label="Submitted">{shortDate(paper.published)}</Meta>
                                <Meta label="Updated">{shortDate(paper.updated)}</Meta>
                                <Meta label="Seen">{shortDate(paper.firstSeen)}</Meta>
                                {paper.comment && <Meta label="Comment"><span className="text-slate-400">{paper.comment}</span></Meta>}
                                {paper.journalRef && <Meta label="Journal"><span className="text-slate-400">{paper.journalRef}</span></Meta>}
                            </dl>
                        </section>

                        <section>
                            <SectionTitle>Open elsewhere</SectionTitle>
                            <div className="flex flex-wrap gap-1.5">
                                {links.map((l) => (
                                    <a
                                        key={l.key}
                                        href={l.href}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={cx(
                                            'rounded-lg border px-2 py-1 text-[11px] transition',
                                            l.primary
                                                ? 'border-orange-400/40 bg-orange-400/10 text-orange-200 hover:bg-orange-400/20'
                                                : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600 hover:text-slate-200',
                                        )}
                                    >
                                        {l.label}
                                    </a>
                                ))}
                            </div>
                        </section>

                        <section>
                            <SectionTitle>Export</SectionTitle>
                            <div className="flex flex-wrap gap-1.5">
                                <Button size="sm" onClick={() => copy(toBibtex(paper), 'bib2')}>
                                    {copied === 'bib2' ? 'Copied' : 'Copy BibTeX'}
                                </Button>
                                <Button size="sm" onClick={() => download(`${paper.id}.bib`, toBibtex(paper), 'text/plain')}>
                                    Download .bib
                                </Button>
                                <Button size="sm" onClick={() => copy(`https://arxiv.org/abs/${paper.id}`, 'url')}>
                                    {copied === 'url' ? 'Copied' : 'Copy link'}
                                </Button>
                            </div>
                        </section>
                    </div>
                )}

                {tab === 'notes' && (
                    <div className="space-y-4 px-4 py-4">
                        <div>
                            <SectionTitle>Tags</SectionTitle>
                            <TokenInput
                                value={st.tags}
                                onChange={(tags) => patch({ tags })}
                                placeholder="to-cite, baseline, related-work…"
                            />
                        </div>
                        <div>
                            <SectionTitle>Notes</SectionTitle>
                            <textarea
                                value={st.note}
                                onChange={(e) => patch({ note: e.target.value })}
                                rows={14}
                                placeholder={'What is the claim? What is the trick? Why does it matter for you?\n\nMarkdown welcome — it is kept verbatim on export.'}
                                className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950/60 p-3 font-mono text-[12px] leading-relaxed text-slate-200 placeholder:text-slate-600 outline-none focus:border-orange-400/60"
                            />
                        </div>
                        {collections.length > 0 && (
                            <div>
                                <SectionTitle>Collections</SectionTitle>
                                <div className="flex flex-wrap gap-1.5">
                                    {collections.map((c) => {
                                        const inIt = c.paperIds.includes(paper.id);
                                        return (
                                            <Button
                                                key={c.id}
                                                size="sm"
                                                variant={inIt ? 'active' : 'ghost'}
                                                onClick={() => {
                                                    dispatch({ type: 'COLLECTION_TOGGLE_PAPERS', id: c.id, paperIds: [paper.id] });
                                                    notify(inIt ? `Removed from ${c.name}` : `Added to ${c.name}`);
                                                }}
                                            >
                                                {inIt ? '✓ ' : '+ '}{c.name}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'related' && (
                    <div className="space-y-1 px-3 py-3">
                        {similar.length ? similar.map(({ paper: other, similarity }) => (
                            <button
                                key={other.id}
                                type="button"
                                onClick={() => onNavigate && onNavigate(0, other.id)}
                                className="block w-full rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-left transition hover:border-slate-700 hover:bg-white/5"
                            >
                                <div className="flex items-start gap-2">
                                    <span className="mt-0.5 flex-none rounded-full bg-slate-800 px-1.5 font-mono text-[10px] text-slate-400">
                                        {(similarity * 100).toFixed(0)}%
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="line-clamp-2 text-[12px] text-slate-200">{other.title}</span>
                                        <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                                            {(other.authors || []).slice(0, 3).map((a) => a.name).join(', ')} · {shortDate(other.published)}
                                        </span>
                                    </span>
                                </div>
                            </button>
                        )) : (
                            <p className="px-2 py-8 text-center text-[11.5px] text-slate-600">
                                Nothing close enough in your library yet — fetch a few more days and this fills in.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* -------------------------------------------------------------- PDF */}
            {pdfOpen && (
                <div className="h-[45%] flex-none border-t border-slate-800">
                    <div className="flex items-center justify-between border-b border-slate-800 px-3 py-1.5">
                        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">PDF preview</span>
                        <span className="flex gap-1">
                            <a
                                href={pdfEmbedUrl(paper)}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400 transition hover:border-orange-400/50 hover:text-orange-300"
                            >
                                Open in tab
                            </a>
                            <button
                                type="button"
                                onClick={() => setPdfOpen(false)}
                                className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400 transition hover:text-slate-200"
                            >
                                Hide
                            </button>
                        </span>
                    </div>
                    <iframe
                        title={`PDF of ${paper.title}`}
                        src={pdfEmbedUrl(paper)}
                        className="h-[calc(100%-1.75rem)] w-full bg-slate-800"
                    />
                </div>
            )}
        </aside>
    );
}

const SectionTitle = ({ children }) => (
    <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{children}</h4>
);

const Meta = ({ label, children }) => (
    <>
        <dt className="text-slate-600">{label}</dt>
        <dd className="text-slate-300">{children}</dd>
    </>
);
