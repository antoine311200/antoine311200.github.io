import React, { useMemo, useState } from 'react';

import { usePapers } from '../context';
import { authorKey, download } from '../storage';
import { similarTo } from '../scoring';
import { paperLinks, pdfEmbedUrl, authorLinks } from '../links';
import { toBibtex } from '../bibtex';
import { Button, Chip, TokenInput, cx, useCopy, shortDate } from '../ui';
// Markdown + KaTeX is a few hundred kilobytes that most sessions never open, so
// the tab is fetched the first time someone asks for an explanation.
const ExplainTab = React.lazy(() => import('./ExplainTab'));

const STATUSES = ['unread', 'queued', 'reading', 'read', 'archived'];

const Section = ({ title, action, children }) => (
    <section>
        <div className="mb-1.5 flex items-center justify-between">
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</h4>
            {action}
        </div>
        {children}
    </section>
);

/**
 * The reading panel. It slides in beside whatever list you are in rather than
 * taking over a tab, so you keep your place while you look at something.
 */
export default function PaperPanel({ paper, onClose, onOpenPaper }) {
    const { dispatch, stateOf, authors, index, papers, folders, notify } = usePapers();
    const { settings } = usePapers();
    const [tab, setTab] = useState(settings.pdfInline ? 'pdf' : 'overview');
    const [copied, copy] = useCopy();

    const st = stateOf(paper.id);
    const patch = (p) => dispatch({ type: 'PAPER_STATE', id: paper.id, patch: p });
    const similar = useMemo(() => similarTo(index, paper.id, papers, 6), [index, paper.id, papers]);
    const enriched = paper.enriched && !paper.enriched.miss ? paper.enriched : null;
    const citations = enriched && enriched.citations != null ? enriched.citations : paper.citations;
    const inFolders = folders.filter((f) => f.paperIds.includes(paper.id));

    return (
        <aside
            data-testid="paper-panel"
            className="pr-rise flex h-full min-h-0 w-full flex-col border-l border-slate-800 bg-slate-950/70 backdrop-blur-sm"
        >
            <header className="flex-none border-b border-slate-800 px-4 py-3">
                <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span className="font-mono">arXiv:{paper.id}</span>
                            <span>{shortDate(paper.published)}</span>
                            {citations > 0 && <span>{citations} cites</span>}
                        </div>
                        <h2 className="mt-1 text-[15px] font-semibold leading-snug text-slate-50">{paper.title}</h2>
                    </div>
                    <Button variant="quiet" size="sm" onClick={onClose} aria-label="Close panel">✕</Button>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <select
                        value={st.status}
                        onChange={(e) => patch({ status: e.target.value })}
                        aria-label="Reading status"
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
                    <div className="flex-1" />
                    <Button size="sm" as="a" href={`https://arxiv.org/abs/${paper.id}`} target="_blank" rel="noreferrer">arXiv</Button>
                    <Button
                        size="sm"
                        variant={tab === 'pdf' ? 'active' : 'ghost'}
                        onClick={() => setTab(tab === 'pdf' ? 'overview' : 'pdf')}
                    >
                        PDF
                    </Button>
                </div>
            </header>

            <nav className="flex flex-none gap-1 border-b border-slate-800 px-3 pt-2">
                {[['overview', 'Overview'], ['explain', Object.keys(st.explanations || {}).length ? 'Explain •' : 'Explain'],
                  ['pdf', 'PDF'], ['notes', st.note || st.tags.length ? 'Notes •' : 'Notes'],
                  ['related', `Related${similar.length ? ` (${similar.length})` : ''}`]].map(([id, label]) => (
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

            <div className={cx('min-h-0 flex-1', tab === 'pdf' ? 'overflow-hidden' : 'overflow-y-auto')}>
                {tab === 'overview' && (
                    <div className="space-y-5 px-4 py-4">
                        {enriched && enriched.tldr && (
                            <Section title="TL;DR">
                                <p className="text-[12.5px] leading-relaxed text-slate-300">{enriched.tldr}</p>
                            </Section>
                        )}

                        <Section title="Abstract">
                            <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-slate-400">{paper.summary}</p>
                        </Section>

                        <Section title={`Authors (${(paper.authors || []).length})`}>
                            <div className="space-y-0.5">
                                {(paper.authors || []).map((a) => {
                                    const key = authorKey(a.name);
                                    const rec = authors[key];
                                    const isFollowed = !!(rec && rec.followedAt);
                                    return (
                                        <div key={key} className="group flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-white/5">
                                            <button
                                                type="button"
                                                onClick={() => dispatch({ type: 'AUTHOR_TOGGLE', name: a.name })}
                                                title={isFollowed ? 'Unfollow' : 'Follow — boosts their future papers'}
                                                className={cx('flex-none text-xs transition', isFollowed ? 'text-orange-300' : 'text-slate-700 hover:text-slate-400')}
                                            >
                                                {isFollowed ? '●' : '○'}
                                            </button>
                                            <span className={cx('min-w-0 flex-1 truncate text-[12px]', isFollowed ? 'text-orange-200' : 'text-slate-300')}>
                                                {a.name}
                                            </span>
                                            <span className="flex flex-none gap-1 opacity-0 transition group-hover:opacity-100">
                                                {authorLinks(a.name, rec || {}).slice(0, 2).map((l) => (
                                                    <a
                                                        key={l.key}
                                                        href={l.href}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="rounded-full border border-slate-700 px-1.5 py-0.5 text-[9px] text-slate-400 transition hover:border-orange-400/50 hover:text-orange-300"
                                                    >
                                                        {l.key === 'scholar' ? 'Scholar' : 'arXiv'}
                                                    </a>
                                                ))}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </Section>

                        {(paper.reasons || []).length > 0 && (
                            <Section title="Why this surfaced">
                                <ul className="space-y-1">
                                    {paper.reasons.map((r, i) => (
                                        <li key={i} className="flex gap-2 text-[11.5px] text-slate-400">
                                            <span className="text-orange-400">·</span>{r.label}
                                        </li>
                                    ))}
                                </ul>
                            </Section>
                        )}

                        {inFolders.length > 0 && (
                            <Section title="Filed in">
                                <div className="flex flex-wrap gap-1.5">
                                    {inFolders.map((f) => <Chip key={f.id}>📁 {f.name}</Chip>)}
                                </div>
                            </Section>
                        )}

                        <Section title="Open elsewhere">
                            <div className="flex flex-wrap gap-1.5">
                                {paperLinks(paper).map((l) => (
                                    <a
                                        key={l.key}
                                        href={l.href}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={cx(
                                            'rounded-full border px-2.5 py-1 text-[11px] transition',
                                            l.primary
                                                ? 'border-orange-400/40 bg-orange-400/10 text-orange-200 hover:bg-orange-400/20'
                                                : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600 hover:text-slate-200',
                                        )}
                                    >
                                        {l.label}
                                    </a>
                                ))}
                            </div>
                        </Section>

                        <Section title="Cite">
                            <div className="flex flex-wrap gap-1.5">
                                <Button size="sm" onClick={() => copy(toBibtex(paper), 'bib')}>
                                    {copied === 'bib' ? 'Copied' : 'Copy BibTeX'}
                                </Button>
                                <Button size="sm" onClick={() => download(`${paper.id}.bib`, toBibtex(paper), 'text/plain')}>
                                    Download .bib
                                </Button>
                                <Button size="sm" onClick={() => copy(`https://arxiv.org/abs/${paper.id}`, 'url')}>
                                    {copied === 'url' ? 'Copied' : 'Copy link'}
                                </Button>
                            </div>
                        </Section>
                    </div>
                )}

                {tab === 'explain' && (
                    <React.Suspense
                        fallback={<div className="px-4 py-6 text-[11px] text-slate-500">Loading…</div>}
                    >
                        <ExplainTab paper={paper} />
                    </React.Suspense>
                )}

                {tab === 'notes' && (
                    <div className="space-y-4 px-4 py-4">
                        <Section title="Tags">
                            <TokenInput value={st.tags} onChange={(tags) => patch({ tags })} placeholder="to-cite, baseline…" />
                        </Section>
                        <Section title="Notes">
                            <textarea
                                value={st.note}
                                onChange={(e) => patch({ note: e.target.value })}
                                rows={16}
                                placeholder={'What is the claim? What is the trick? Why does it matter for you?'}
                                className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950/60 p-3 font-mono text-[12px] leading-relaxed text-slate-200 placeholder:text-slate-600 outline-none focus:border-orange-400/60"
                            />
                        </Section>
                        {folders.length > 0 && (
                            <Section title="Folders">
                                <div className="flex flex-wrap gap-1.5">
                                    {folders.map((f) => {
                                        const inIt = f.paperIds.includes(paper.id);
                                        return (
                                            <Button
                                                key={f.id}
                                                size="sm"
                                                variant={inIt ? 'active' : 'ghost'}
                                                onClick={() => {
                                                    dispatch({ type: 'FOLDER_TOGGLE_PAPERS', id: f.id, paperIds: [paper.id] });
                                                    notify(inIt ? `Removed from ${f.name}` : `Filed in ${f.name}`);
                                                }}
                                            >
                                                {inIt ? '✓ ' : '+ '}{f.name}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </Section>
                        )}
                    </div>
                )}

                {tab === 'pdf' && (
                    <div data-testid="pdf-pane" className="flex h-full flex-col">
                        <div className="flex flex-none items-center gap-2 border-b border-slate-800 px-3 py-1.5">
                            <span className="flex-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                                arXiv PDF
                            </span>
                            <a
                                href={pdfEmbedUrl(paper)}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400 transition hover:border-orange-400/50 hover:text-orange-300"
                            >
                                Open in a tab
                            </a>
                        </div>
                        {/* Some browsers refuse to frame arxiv.org; the link above is the way out. */}
                        <iframe
                            title={`PDF of ${paper.title}`}
                            src={pdfEmbedUrl(paper)}
                            className="min-h-0 w-full flex-1 bg-slate-800"
                        />
                    </div>
                )}

                {tab === 'related' && (
                    <div className="space-y-1 px-3 py-3">
                        {similar.length ? similar.map(({ paper: other, similarity }) => (
                            <button
                                key={other.id}
                                type="button"
                                onClick={() => onOpenPaper && onOpenPaper(other.id)}
                                className="block w-full rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-left transition hover:border-slate-700 hover:bg-white/5"
                            >
                                <div className="flex items-start gap-2">
                                    <span className="mt-0.5 flex-none rounded-full bg-slate-800 px-1.5 font-mono text-[10px] text-slate-400">
                                        {(similarity * 100).toFixed(0)}%
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="line-clamp-2 text-[12px] text-slate-200">{other.title}</span>
                                        <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                                            {(other.authors || []).slice(0, 3).map((a) => a.name).join(', ')}
                                        </span>
                                    </span>
                                </div>
                            </button>
                        )) : (
                            <p className="px-2 py-10 text-center text-[11.5px] text-slate-600">
                                Nothing close enough in your library yet.
                            </p>
                        )}
                    </div>
                )}
            </div>


        </aside>
    );
}
