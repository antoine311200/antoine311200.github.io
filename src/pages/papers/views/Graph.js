import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

import { usePapers } from '../context';
import { coauthorGraph, buildIndex, cosine } from '../scoring';
import { authorKey } from '../storage';
import { Button, Chip, Empty, Panel, cx } from '../components/ui';

const MUTED = '#64748b';
const TEXT = '#cbd5e1';

/**
 * Two ways of seeing the shape of your field:
 *  - the co-authorship network of everyone in your library
 *  - the similarity network between the papers themselves
 *
 * Rendered with react-force-graph-2d on canvas, with custom node painting so the
 * graph matches the rest of the site rather than looking like a stock vis dump.
 */
export default function Graph({ onOpenAuthor }) {
    const { paperList, authors, topics, states, followedIds } = usePapers();
    const [mode, setMode] = useState('coauthors');
    const [minPapers, setMinPapers] = useState(2);
    const [scope, setScope] = useState('all');
    const [picked, setPicked] = useState(null);
    const [hovered, setHovered] = useState(null);
    const [size, setSize] = useState({ w: 800, h: 600 });
    const wrapRef = useRef(null);
    const fgRef = useRef(null);

    // The canvas needs explicit pixel dimensions, so follow the container's box.
    useEffect(() => {
        if (!wrapRef.current || typeof ResizeObserver === 'undefined') return undefined;
        const el = wrapRef.current;
        const ro = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) setSize({ w: Math.floor(width), h: Math.floor(height) });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

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
        subset.forEach((a) => {
            const scores = [];
            subset.forEach((b) => {
                if (a.id === b.id) return;
                const s = cosine(idx.vectors.get(a.id), idx.vectors.get(b.id));
                if (s > 0.12) scores.push({ to: b.id, s });
            });
            // Only each paper's three nearest neighbours — a full graph is unreadable.
            scores.sort((x, y) => y.s - x.s).slice(0, 3).forEach(({ to, s }) => {
                edges.push({ source: a.id, target: to, weight: s });
            });
        });
        return { nodes: subset, edges };
    }, [mode, scoped]);

    const data = useMemo(() => {
        if (mode === 'coauthors') {
            return {
                nodes: coauthors.nodes.map((n) => {
                    const topic = topics.find((t) => n.topics.includes(t.id));
                    return {
                        id: n.key,
                        label: n.name,
                        val: Math.max(1, n.papers),
                        // Fill encodes topic; a followed author is marked by the ring, not
                        // the colour, so it cannot be confused with an orange topic.
                        color: topic ? topic.color : MUTED,
                        highlight: n.followed,
                        showLabel: n.followed || n.papers >= 3,
                    };
                }),
                links: coauthors.edges.map((e) => ({ source: e.from, target: e.to, weight: e.weight })),
            };
        }
        return {
            nodes: similarity.nodes.map((p) => {
                const topic = topics.find((t) => (p.topicIds || []).includes(t.id));
                const st = states[p.id] || {};
                return {
                    id: p.id,
                    label: p.title,
                    val: 1 + (p.score || 0) / 25,
                    color: st.starred ? '#fbbf24' : (topic ? topic.color : MUTED),
                    highlight: !!st.starred,
                    showLabel: false,
                };
            }),
            links: similarity.edges,
        };
    }, [mode, coauthors, similarity, topics, states]);

    // Custom paint: a soft halo for followed/starred nodes, the dot, then a label.
    const paintNode = useCallback((node, ctx, scale) => {
        const r = Math.max(3, Math.sqrt(node.val) * 2.6);
        const isActive = hovered === node.id || picked === node.id;

        if (node.highlight || isActive) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, r * 1.7, 0, 2 * Math.PI);
            ctx.fillStyle = `${node.color}33`;
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
        ctx.fillStyle = node.color;
        ctx.fill();
        if (isActive || node.highlight) {
            ctx.lineWidth = 1.6 / scale;
            ctx.strokeStyle = '#f8fafc';
            ctx.stroke();
        }

        if ((node.showLabel && scale > 0.7) || isActive) {
            const label = node.label.length > 34 ? `${node.label.slice(0, 33)}…` : node.label;
            ctx.font = `${isActive ? 600 : 400} ${11 / scale}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = isActive ? '#f8fafc' : TEXT;
            ctx.fillText(label, node.x, node.y + r + 2 / scale);
        }
    }, [hovered, picked]);

    const linkIsActive = (l) => {
        if (!picked) return false;
        const a = typeof l.source === 'object' ? l.source.id : l.source;
        const b = typeof l.target === 'object' ? l.target.id : l.target;
        return a === picked || b === picked;
    };

    const pickedAuthor = mode === 'coauthors' && picked
        ? coauthors.nodes.find((n) => n.key === picked) : null;
    const pickedPaper = mode === 'papers' && picked ? paperList.find((p) => p.id === picked) : null;

    const enoughData = data.nodes.length >= 2;

    // A sparse graph would otherwise collapse into a knot that zoomToFit then magnifies
    // to absurdity. Push the nodes apart, then hold the resulting zoom to something sane.
    useEffect(() => {
        const fg = fgRef.current;
        if (!fg || !enoughData) return;
        fg.d3Force('charge').strength(-320).distanceMax(420);
        const link = fg.d3Force('link');
        if (link) link.distance(70).strength(0.35);
    }, [enoughData, mode, scope, minPapers]);

    const fitAndClamp = useCallback(() => {
        const fg = fgRef.current;
        if (!fg) return;
        fg.zoomToFit(500, 90);
        setTimeout(() => {
            const g = fgRef.current;
            if (g && g.zoom() > 1.8) g.zoom(1.8, 250);   // zoom() keeps the current centre
        }, 550);
    }, []);

    return (
        <div className="flex h-full min-h-0 flex-col">
            <header className="flex flex-none flex-wrap items-center gap-2 border-b border-slate-800 py-3 pl-5 pr-5 max-lg:pl-14">
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
                    className="rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-[11px] text-slate-300 outline-none focus:border-orange-400/60"
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
                            className="w-20 accent-orange-400"
                        />
                        <span className="w-3 font-mono">{minPapers}</span>
                    </label>
                )}
                <Button onClick={fitAndClamp} disabled={!enoughData}>
                    Fit
                </Button>
            </header>

            <div ref={wrapRef} className="relative min-h-0 flex-1 overflow-hidden">
                {!enoughData ? (
                    <div className="p-6">
                        <Empty icon="◍" title="Not enough data to draw a network">
                            Fetch a few more days of papers — or lower the “min papers” threshold — and the
                            structure of your field starts to show.
                        </Empty>
                    </div>
                ) : (
                    <ForceGraph2D
                        ref={fgRef}
                        graphData={data}
                        width={size.w}
                        height={size.h}
                        backgroundColor="rgba(0,0,0,0)"
                        nodeCanvasObject={paintNode}
                        nodePointerAreaPaint={(node, color, ctx) => {
                            ctx.fillStyle = color;
                            ctx.beginPath();
                            ctx.arc(node.x, node.y, Math.max(6, Math.sqrt(node.val) * 3), 0, 2 * Math.PI);
                            ctx.fill();
                        }}
                        linkColor={(l) => (linkIsActive(l) ? 'rgba(251,146,60,0.75)' : 'rgba(100,116,139,0.22)')}
                        linkWidth={(l) => (linkIsActive(l) ? 1.6 : 0.6)}
                        onNodeClick={(n) => setPicked((cur) => (cur === n.id ? null : n.id))}
                        onNodeHover={(n) => setHovered(n ? n.id : null)}
                        onBackgroundClick={() => setPicked(null)}
                        cooldownTicks={120}
                        d3VelocityDecay={0.32}
                        onEngineStop={fitAndClamp}
                    />
                )}

                <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-1.5">
                    {mode === 'coauthors' ? (
                        <>
                            <Chip className="!border-orange-400/40 !bg-orange-400/15 !text-orange-200">followed</Chip>
                            {topics.slice(0, 5).map((t) => <Chip key={t.id} color={t.color}>{t.name}</Chip>)}
                        </>
                    ) : (
                        <>
                            <Chip className="!border-amber-400/40 !bg-amber-400/15 !text-amber-200">starred</Chip>
                            <Chip>size = relevance</Chip>
                        </>
                    )}
                </div>

                {(pickedAuthor || pickedPaper) && (
                    <div className="absolute bottom-4 left-4 w-80">
                        <Panel bodyClass="p-3">
                            {pickedAuthor && (
                                <>
                                    <h3 className={cx('text-sm font-semibold', pickedAuthor.followed ? 'text-orange-300' : 'text-slate-100')}>
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
