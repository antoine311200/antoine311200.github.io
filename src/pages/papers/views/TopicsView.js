import React, { useMemo, useState } from 'react';

import { usePapers } from '../context';
import { buildQuery, CATEGORIES, searchRaw } from '../arxiv';
import { buildFilter, searchTopic as previewOpenAlex } from '../openalex';
import { makeTopic, STARTER_TOPICS } from '../storage';
import {
    Button, Card, Chip, ContextMenu, Empty, Field, Input, Modal, Sparkline, TokenInput,
    cx, shortDate, useContextMenu, useCopy, Spinner,
} from '../ui';

const PALETTE = ['#fb923c', '#a78bfa', '#34d399', '#38bdf8', '#f472b6', '#fbbf24', '#22d3ee', '#c084fc'];

/**
 * Topics as a card wall. Everything you do often is on the card; everything you do
 * rarely is behind a right-click. Creating one is a single card-shaped affordance
 * rather than a form hidden behind a button.
 */
export default function TopicsView({ onFetchTopic }) {
    const { topics, dispatch, paperList, fetchState, settings, notify } = usePapers();
    const [editing, setEditing] = useState(null);
    const [preview, setPreview] = useState(null);
    const { menu, open, close } = useContextMenu();

    const stats = useMemo(() => {
        const map = new Map();
        const days = 21;
        topics.forEach((t) => map.set(t.id, { count: 0, spark: new Array(days).fill(0) }));
        paperList.forEach((p) => {
            const when = new Date(p.firstSeen || p.published).getTime();
            const bucket = days - 1 - Math.floor((Date.now() - when) / 864e5);
            (p.topicIds || []).forEach((id) => {
                const rec = map.get(id);
                if (!rec) return;
                rec.count += 1;
                if (bucket >= 0 && bucket < days) rec.spark[bucket] += 1;
            });
        });
        return map;
    }, [topics, paperList]);

    const missingStarters = useMemo(() => {
        const have = new Set(topics.map((t) => t.name.toLowerCase()));
        return STARTER_TOPICS.filter((t) => !have.has(t.name.toLowerCase()));
    }, [topics]);

    const save = (t) => {
        if (topics.some((x) => x.id === t.id)) dispatch({ type: 'TOPIC_UPDATE', id: t.id, patch: t });
        else dispatch({ type: 'TOPIC_ADD', topic: t });
        setEditing(null);
    };

    return (
        <div className="mx-auto h-full max-w-6xl overflow-y-auto px-6 py-6">
            <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-lg font-semibold text-slate-100">Topics</h1>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                        Each topic is a standing question. Fetching runs them all and keeps only what you have not seen.
                    </p>
                </div>
                {missingStarters.length > 0 && topics.length > 0 && (
                    <Button
                        size="sm"
                        onClick={() => { missingStarters.forEach((t) => dispatch({ type: 'TOPIC_ADD', topic: t })); notify('Suggested topics added'); }}
                    >
                        + Add {missingStarters.length} suggested
                    </Button>
                )}
            </header>

            {!topics.length ? (
                <Empty
                    icon="◈"
                    title="No topics yet"
                    action={
                        <div className="flex flex-wrap justify-center gap-2">
                            <Button variant="primary" size="lg" onClick={() => setEditing(makeTopic({ color: PALETTE[0] }))}>
                                Create a topic
                            </Button>
                            <Button
                                size="lg"
                                onClick={() => { STARTER_TOPICS.forEach((t) => dispatch({ type: 'TOPIC_ADD', topic: t })); }}
                            >
                                Start from {STARTER_TOPICS.length} suggestions
                            </Button>
                        </div>
                    }
                >
                    A topic is a few keywords you want watched. Narrow beats broad — three precise phrases
                    will surface far more of what you actually want to read than one vague one.
                </Empty>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {topics.map((topic) => {
                        const s = stats.get(topic.id) || { count: 0, spark: [] };
                        const busy = fetchState.running && fetchState.topic === topic.name;
                        return (
                            <Card
                                key={topic.id}
                                interactive
                                data-testid={`topic-card-${topic.id}`}
                                onContextMenu={(e) => open(e, topic)}
                                onDoubleClick={() => setEditing(topic)}
                                className={cx('group relative overflow-hidden p-4', !topic.enabled && 'opacity-55')}
                            >
                                <span
                                    className="absolute inset-x-0 top-0 h-[3px]"
                                    style={{ background: `linear-gradient(90deg, ${topic.color}, transparent)` }}
                                />

                                <div className="flex items-start gap-2">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="truncate text-[14px] font-semibold text-slate-100">{topic.name}</h3>
                                        <p className="mt-0.5 text-[10.5px] text-slate-500">
                                            {s.count} paper{s.count === 1 ? '' : 's'}
                                            {topic.lastFetch ? ` · ${shortDate(topic.lastFetch)}` : ' · never fetched'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        title={topic.enabled ? 'Included in fetches' : 'Skipped when fetching'}
                                        onClick={() => dispatch({ type: 'TOPIC_UPDATE', id: topic.id, patch: { enabled: !topic.enabled } })}
                                        className={cx(
                                            'flex-none rounded-full border px-2 py-0.5 text-[9.5px] font-medium transition',
                                            topic.enabled
                                                ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                                                : 'border-slate-700 text-slate-500 hover:text-slate-300',
                                        )}
                                    >
                                        {topic.enabled ? 'on' : 'off'}
                                    </button>
                                </div>

                                <div className="mt-2.5 flex min-h-[1.5rem] flex-wrap gap-1">
                                    {topic.terms.slice(0, 4).map((t) => <Chip key={t} color={topic.color}>{t}</Chip>)}
                                    {topic.terms.length > 4 && <Chip>+{topic.terms.length - 4}</Chip>}
                                    {!topic.terms.length && (
                                        <span className="text-[11px] text-slate-600">No keywords — this topic will not fetch.</span>
                                    )}
                                </div>

                                <div className="mt-3 h-6">
                                    {busy ? (
                                        <div className="flex h-full items-center gap-2 text-[11px] text-orange-300">
                                            <Spinner /> fetching…
                                        </div>
                                    ) : (
                                        <Sparkline data={s.spark} height={24} color={topic.color} />
                                    )}
                                </div>

                                <div className="mt-3 flex gap-1.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                                    <Button size="sm" onClick={() => setEditing(topic)}>Edit</Button>
                                    <Button size="sm" onClick={() => setPreview(topic)}>Preview</Button>
                                    <div className="flex-1" />
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        disabled={fetchState.running}
                                        onClick={() => onFetchTopic(topic.id)}
                                    >
                                        Fetch
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}

                    <button
                        type="button"
                        data-testid="new-topic-card"
                        onClick={() => setEditing(makeTopic({ color: PALETTE[topics.length % PALETTE.length] }))}
                        className="flex min-h-[11rem] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700 text-slate-500 transition hover:border-orange-400/50 hover:bg-orange-400/[0.04] hover:text-orange-300"
                    >
                        <span className="text-2xl leading-none">+</span>
                        <span className="text-[12px] font-medium">New topic</span>
                    </button>
                </div>
            )}

            <ContextMenu
                menu={menu}
                onClose={close}
                items={(topic) => [
                    { label: 'Edit', icon: '✎', onSelect: () => setEditing(topic) },
                    { label: 'Fetch now', icon: '↻', disabled: fetchState.running, onSelect: () => onFetchTopic(topic.id) },
                    { label: 'Preview results', icon: '◉', onSelect: () => setPreview(topic) },
                    { separator: true },
                    {
                        label: 'Duplicate',
                        icon: '⧉',
                        onSelect: () => dispatch({
                            type: 'TOPIC_ADD',
                            topic: makeTopic({ ...topic, id: undefined, name: `${topic.name} copy`, lastFetch: null }),
                        }),
                    },
                    {
                        label: topic.enabled ? 'Disable' : 'Enable',
                        icon: topic.enabled ? '◌' : '●',
                        onSelect: () => dispatch({ type: 'TOPIC_UPDATE', id: topic.id, patch: { enabled: !topic.enabled } }),
                    },
                    { separator: true },
                    {
                        label: 'Delete',
                        icon: '🗑',
                        danger: true,
                        onSelect: () => {
                            // eslint-disable-next-line no-alert
                            if (window.confirm(`Delete "${topic.name}"? Papers stay in your library.`)) {
                                dispatch({ type: 'TOPIC_REMOVE', id: topic.id });
                            }
                        },
                    },
                ]}
            />

            <TopicEditor topic={editing} source={settings.source} onClose={() => setEditing(null)} onSave={save} />
            <PreviewModal topic={preview} settings={settings} onClose={() => setPreview(null)} />
        </div>
    );
}

/* -------------------------------------------------------------------- editor */

function TopicEditor({ topic, onClose, onSave, source }) {
    const [draft, setDraft] = useState(topic);
    const [advanced, setAdvanced] = useState(false);
    const [copied, copy] = useCopy();

    React.useEffect(() => { setDraft(topic); setAdvanced(false); }, [topic]);

    // Closing sets `topic` to null while `draft` lags one render behind, so both
    // have to be checked before either is read.
    if (!topic || !draft) return null;

    const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
    const usingOpenAlex = source !== 'arxiv';
    const query = usingOpenAlex ? buildFilter(draft).filter : buildQuery(draft);
    const isNew = topic.name === 'New topic';

    return (
        <Modal
            open
            onClose={onClose}
            width="max-w-xl"
            title={isNew ? 'New topic' : `Edit ${topic.name}`}
            subtitle="Keywords are matched as phrases in the title and abstract."
            footer={
                <>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={() => onSave(draft)} disabled={!query}>
                        {isNew ? 'Create topic' : 'Save'}
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <div className="flex gap-3">
                    <div className="flex-1">
                        <Field label="Name">
                            <Input value={draft.name === 'New topic' ? '' : draft.name} placeholder="Optimal transport"
                                   onChange={(e) => set({ name: e.target.value })} autoFocus />
                        </Field>
                    </div>
                    <div>
                        <span className="mb-1 block text-[11px] font-medium text-slate-400">Colour</span>
                        <div className="flex gap-1">
                            {PALETTE.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => set({ color: c })}
                                    style={{ backgroundColor: c }}
                                    aria-label={`Colour ${c}`}
                                    className={cx(
                                        'h-6 w-6 rounded-full transition',
                                        draft.color === c ? 'ring-2 ring-white/70 ring-offset-2 ring-offset-slate-900' : 'opacity-55 hover:opacity-100',
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <Field label="Keywords" hint="Any one of them is enough to match. Press Enter after each.">
                    <TokenInput
                        value={draft.terms}
                        onChange={(terms) => set({ terms })}
                        color={draft.color}
                        placeholder="optimal transport, wasserstein…"
                    />
                </Field>

                <button
                    type="button"
                    onClick={() => setAdvanced(!advanced)}
                    className="flex items-center gap-1.5 text-[11px] text-slate-500 transition hover:text-orange-300"
                >
                    <span className="text-[9px]">{advanced ? '▾' : '▸'}</span>
                    {advanced ? 'Fewer options' : 'More options — exclusions, categories, authors'}
                </button>

                {advanced && (
                    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                        <Field label="Exclude" hint="Papers containing any of these never reach you.">
                            <TokenInput value={draft.exclude} onChange={(exclude) => set({ exclude })} placeholder="survey, review…" />
                        </Field>

                        <Field
                            label="arXiv categories"
                            hint={usingOpenAlex
                                ? 'Not applied by the OpenAlex source — it does not carry arXiv categories. Kept in case you switch source.'
                                : 'Restrict to these categories.'}
                        >
                            <TokenInput value={draft.categories} onChange={(categories) => set({ categories })} placeholder="q-fin.MF, math.OC…" />
                            <div className="mt-2 flex max-h-20 flex-wrap gap-1 overflow-y-auto">
                                {CATEGORIES.map(([code, label]) => (
                                    <Chip
                                        key={code}
                                        title={label}
                                        active={draft.categories.includes(code)}
                                        onClick={() => set({
                                            categories: draft.categories.includes(code)
                                                ? draft.categories.filter((c) => c !== code)
                                                : [...draft.categories, code],
                                        })}
                                    >
                                        {code}
                                    </Chip>
                                ))}
                            </div>
                        </Field>

                        <Field label="Authors" hint="Only papers by one of these. Usually left empty — follow authors instead.">
                            <TokenInput value={draft.authors} onChange={(authors) => set({ authors })} placeholder="Peyré, Villani…" />
                        </Field>

                        <div>
                            <span className="mb-1 block text-[11px] font-medium text-slate-400">
                                Generated {usingOpenAlex ? 'OpenAlex filter' : 'arXiv query'}
                            </span>
                            <pre className="max-h-20 overflow-auto rounded-lg border border-slate-800 bg-slate-950/60 p-2 font-mono text-[10px] leading-relaxed text-slate-400">
                                {query || 'Add a keyword to build a query.'}
                            </pre>
                            {query && (
                                <Button className="mt-1.5" size="sm" onClick={() => copy(query, 'q')}>
                                    {copied === 'q' ? 'Copied' : 'Copy query'}
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

/* ------------------------------------------------------------------- preview */

function PreviewModal({ topic, onClose, settings }) {
    const [state, setState] = useState({ loading: false, entries: [], error: null, total: null });

    React.useEffect(() => {
        if (!topic) return undefined;
        let cancelled = false;
        const controller = new AbortController();
        setState({ loading: true, entries: [], error: null, total: null });
        const run = settings.source !== 'arxiv'
            ? previewOpenAlex(topic, { max: 12, sinceDays: settings.lookbackDays, mailto: settings.openAlexMailto, signal: controller.signal })
            : searchRaw(buildQuery(topic), { max: 12, strategy: settings.proxy, signal: controller.signal });
        run
            .then(({ entries, total }) => { if (!cancelled) setState({ loading: false, entries, error: null, total }); })
            .catch((err) => { if (!cancelled) setState({ loading: false, entries: [], error: err.message, total: null }); });
        return () => { cancelled = true; controller.abort(); };
    }, [topic, settings]);

    if (!topic) return null;
    return (
        <Modal
            open
            onClose={onClose}
            width="max-w-2xl"
            title={`Preview — ${topic.name}`}
            subtitle="A dry run against the live source. Nothing here is saved."
        >
            {state.loading && (
                <p className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
                    <Spinner /> querying…
                </p>
            )}
            {state.error && (
                <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">{state.error}</p>
            )}
            {state.total != null && (
                <p className="mb-2 text-[11px] text-slate-400">{state.total.toLocaleString()} papers match in total.</p>
            )}
            <ul className="max-h-[52vh] space-y-1.5 overflow-y-auto">
                {state.entries.map((e) => (
                    <li key={e.id} className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
                        <a href={`https://arxiv.org/abs/${e.id}`} target="_blank" rel="noreferrer"
                           className="line-clamp-2 text-[12px] text-slate-200 transition hover:text-orange-300">
                            {e.title}
                        </a>
                        <p className="mt-0.5 truncate text-[10px] text-slate-500">
                            {e.authors.slice(0, 4).map((a) => a.name).join(', ')} · {shortDate(e.published)}
                        </p>
                    </li>
                ))}
            </ul>
        </Modal>
    );
}
