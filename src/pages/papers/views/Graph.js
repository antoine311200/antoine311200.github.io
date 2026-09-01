import React, { useMemo, useState } from 'react';
import VisGraph from 'react-graph-vis';

import { usePapers } from '../context';
import { coauthorGraph, buildIndex, cosine } from '../scoring';
import { authorKey } from '../storage';
import { Button, Chip, Empty, Panel, cx, shortDate } from '../components/ui';

const BASE_OPTIONS = {
    autoResize: true,
    height: '100%',
    physics: {
        enabled: true,
        stabilization: { iterations: 180 },
        barnesHut: { gravitationalConstant: -6000, springLength: 120, springConstant: 0.03, damping: 0.4 },
    },
    interaction: { hover: true, tooltipDelay: 120, navigationButtons: false, keyboard: false },
    layout: { improvedLayout: false },
    nodes: {
        shape: 'dot',
        borderWidth: 1.5,
        font: { color: '#cbd5e1', size: 12, face: 'system-ui' },
        color: { border: 'rgba(255,255,255,0.25)' },
    },
    edges: {
        color: { color: 'rgba(148,163,184,0.22)', highlight: '#38bdf8' },
        smooth: { type: 'continuous' },
        width: 0.6,
    },
};

/**
 * Two ways of seeing the shape of your field:
 *  - the co-authorship network of everyone in your library
 *  - the similarity network between the papers themselves
 */
export default function Graph({ onOpenAuthor }) {
    const { paperList, authors, topics, states, followedIds } = usePapers();
    const [mode, setMode] = useState('coauthors');
    const [minPapers, setMinPapers] = useState(2);
    const [scope, setScope] = useState('all');       // all | followed | starred | topic id
    const [picked, setPicked] = useState(null);

    const scoped = useMemo(() => {
        if (scope === 'followed') return paperList.filter((p) => followedIds.has(p.id));
        if (scope === 'starred') return paperList.filter((p) => states[p.id] && states[p.id].starred);
        if (scope.startsWith('t_')) return paperList.filter((p) => (p.topicIds || []).includes(scope));
        return paperList;
    }, [paperList, scope, followedIds, states]);

    const coauthors = useMemo(
        () => coauthorGraph(scoped, authors, { minPapers, maxNodes: 220 }),
        [scoped, authors, minPapers],
    );

    const similarity = useMemo(() => {
        if (mode !== 'papers') return { nodes: [], edges: [] };
        const subset = scoped.slice(0, 220);
        const map = {};
        subset.forEach((p) => { map[p.id] = p; });
        const idx = buildIndex(map);
        const edges = [];
        for (let i = 0; i < subset.length; i += 1) {
            const scores = [];
            for (let j = 0; j < subset.length; j += 1) {
                if (i === j) continue;
                const s = cosine(idx.vectors.get(subset[i].id), idx.vectors.get(subset[j].id));
                if (s > 0.12) scores.push({ to: subset[j].id, s });
            }
            // Keep only each paper's three nearest neighbours — a full graph is unreadable.
            scores.sort((a, b) => b.s - a.s).slice(0, 3).forEach(({ to, s }) => {
                edges.push({ from: subset[i].id, to, weight: s });
            });
        }
        return { nodes: subset, edges };
    }, [mode, scoped]);

    const graph = useMemo(() => {
        if (mode === 'coauthors') {
            return {
                nodes: coauthors.nodes.map((n) => {
                    const topic = topics.find((t) => n.topics.includes(t.id));
                    const color = n.followed ? '#38bdf8' : (topic ? topic.color : '#64748b');
                    return {
                        id: n.key,
                        label: n.papers >= 3 || n.followed ? n.name : '',
                        title: `${n.name} — ${n.papers} paper${n.papers === 1 ? '' : 's'}${n.followed ? ' · following' : ''}`,
                        value: n.papers,
                        color: {
                            background: n.followed ? color : `${color}66`,
                            border: n.followed ? '#e0f2fe' : `${color}aa`,
                            highlight: { background: color, border: '#fff' },
                        },
                        borderWidth: n.followed ? 2.5 : 1,
                    };
                }),
                edges: coauthors.edges.map((e) => ({ ...e, value: e.weight })),
            };
        }
        return {
            nodes: similarity.nodes.map((p) => {
                const topic = topics.find((t) => (p.topicIds || []).includes(t.id));
                const color = topic ? topic.color : '#64748b';
                const st = states[p.id] || {};
                return {
                    id: p.id,
                    label: '',
                    title: `${p.title}\n${(p.authors || []).slice(0, 3).map((a) => a.name).join(', ')} · ${shortDate(p.published)}`,
                    value: 4 + (p.score || 0) / 12,
                    color: {
                        background: st.starred ? '#fbbf24' : `${color}88`,
                        border: st.status === 'read' ? '#34d399' : `${color}cc`,
                    },
                };
            }),
            edges: similarity.edges.map((e) => ({ from: e.from, to: e.to, value: e.weight })),
        };
    }, [mode, coauthors, similarity, topics, states]);

    const events = {
        selectNode: ({ nodes }) => setPicked(nodes[0] || null),
        deselectNode: () => setPicked(null),
    };

    const pickedAuthor = mode === 'coauthors' && picked
        ? coauthors.nodes.find((n) => n.key === picked)
        : null;
    const pickedPaper = mode === 'papers' && picked ? paperList.find((p) => p.id === picked) : null;

    return (
        <div className="flex h-full min-h-0 flex-col">
            <header className="flex flex-none flex-wrap items-center gap-2 border-b border-white/[0.07] px-5 py-3">
                <div>
                    <h1 className="text-base font-semibold text-slate-100">Relations</h1>
                    <p className="text-[11px] text-slate-500">
                        {mode === 'coauthors'
                            ? `${coauthors.nodes.length} researchers · ${coauthors.edges.length} collaborations`
                            : `${similarity.nodes.length} papers linked by abstract similarity`}
                    </p>
                </div>
                <div className="flex-1" />
                <Button variant={mode === 'coauthors' ? 'active' : 'ghost'} onClick={() => { setMode('coauthors'); setPicked(null); }}>
                    Co-authorship
                </Button>
                <Button variant={mode === 'papers' ? 'active' : 'ghost'} onClick={() => { setMode('papers'); setPicked(null); }}>
                    Paper similarity
                </Button>
                <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    className="rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1.5 text-[11px] text-slate-300 outline-none focus:border-sky-400/50"
                >
                    <option value="all">Whole library</option>
                    <option value="followed">Followed authors only</option>
                    <option value="starred">Starred only</option>
                    {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {mode === 'coauthors' && (
                    <label className="flex items-center gap-2 text-[11px] text-slate-400">
                        min papers
                        <input
                            type="range"
                            min="1"
                            max="6"
                            value={minPapers}
                            onChange={(e) => setMinPapers(Number(e.target.value))}
                            className="w-20 accent-sky-400"
                        />
                        <span className="w-3 font-mono">{minPapers}</span>
                    </label>
                )}
            </header>

            <div className="relative min-h-0 flex-1">
                {graph.nodes.length < 2 ? (
                    <div className="p-6">
                        <Empty icon="◍" title="Not enough data to draw a network">
                            Fetch a few more days of papers — or lower the “min papers” threshold — and the
                            structure of your field starts to show.
                        </Empty>
                    </div>
                ) : (
                    <VisGraph
                        key={`${mode}-${scope}-${minPapers}-${graph.nodes.length}`}
                        graph={graph}
                        options={BASE_OPTIONS}
                        events={events}
                        style={{ height: '100%', width: '100%' }}
                    />
                )}

                {/* legend */}
                <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-1.5">
                    {mode === 'coauthors'
                        ? <>
                            <Chip className="!bg-sky-500/20 !text-sky-200 !border-sky-400/40">followed</Chip>
                            {topics.slice(0, 5).map((t) => <Chip key={t.id} color={t.color}>{t.name}</Chip>)}
                        </>
                        : <>
                            <Chip className="!bg-amber-500/20 !text-amber-200 !border-amber-400/40">starred</Chip>
                            <Chip>size = relevance score</Chip>
                        </>}
                </div>

                {(pickedAuthor || pickedPaper) && (
                    <div className="absolute bottom-4 left-4 w-80">
                        <Panel bodyClass="p-3">
                            {pickedAuthor && (
                                <>
                                    <h3 className={cx('text-sm font-semibold', pickedAuthor.followed ? 'text-sky-300' : 'text-slate-100')}>
                                        {pickedAuthor.name}
                                    </h3>
                                    <p className="mt-0.5 text-[11px] text-slate-500">
                                        {pickedAuthor.papers} paper{pickedAuthor.papers === 1 ? '' : 's'} in your library
                                    </p>
                                    <div className="mt-2 flex gap-1.5">
                                        <Button size="sm" onClick={() => onOpenAuthor(authorKey(pickedAuthor.name))}>
                                            Open papers
                                        </Button>
                                        <Button
                                            size="sm"
                                            as="a"
                                            target="_blank"
                                            rel="noreferrer"
                                            href={`https://scholar.google.com/citations?hl=en&view_op=search_authors&mauthors=${encodeURIComponent(pickedAuthor.name)}`}
                                        >
                                            Scholar
                                        </Button>
                                    </div>
                                </>
                            )}
                            {pickedPaper && (
                                <>
                                    <h3 className="line-clamp-3 text-[12.5px] font-medium leading-snug text-slate-100">
                                        {pickedPaper.title}
                                    </h3>
                                    <p className="mt-1 truncate text-[10.5px] text-slate-500">
                                        {(pickedPaper.authors || []).slice(0, 3).map((a) => a.name).join(', ')}
                                    </p>
                                    <div className="mt-2 flex gap-1.5">
                                        <Button size="sm" as="a" target="_blank" rel="noreferrer" href={`https://arxiv.org/abs/${pickedPaper.id}`}>
                                            arXiv
                                        </Button>
                                        <Button size="sm" as="a" target="_blank" rel="noreferrer" href={`https://arxiv.org/pdf/${pickedPaper.id}`}>
                                            PDF
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Panel>
                    </div>
                )}
            </div>
        </div>
    );
}
