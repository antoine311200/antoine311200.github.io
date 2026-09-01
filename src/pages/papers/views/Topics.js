import React, { useMemo, useState } from 'react';

import { usePapers } from '../context';
import { buildQuery, CATEGORIES, searchRaw } from '../arxiv';
import { makeTopic } from '../storage';
import {
    Button, Chip, Empty, Field, Input, Modal, Panel, TokenInput, cx, shortDate, useCopy,
} from '../components/ui';

const PALETTE = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#fb7185', '#22d3ee', '#c084fc'];

/** Topic management: create, tune and test the saved queries that feed the digest. */
export default function Topics() {
    const { topics, dispatch, paperList, fetchTopics, fetchState, settings } = usePapers();
    const [editing, setEditing] = useState(null);
    const [probe, setProbe] = useState(null);

    const countsByTopic = useMemo(() => {
        const map = {};
        paperList.forEach((p) => (p.topicIds || []).forEach((t) => { map[t] = (map[t] || 0) + 1; }));
        return map;
    }, [paperList]);

    return (
        <div className="mx-auto max-w-5xl space-y-4 px-5 py-6">
            <header className="flex flex-wrap items-center gap-3">
                <div>
                    <h1 className="text-base font-semibold text-slate-100">Topics</h1>
                    <p className="text-[11px] text-slate-500">
                        Saved arXiv queries. Every fetch runs each enabled topic and keeps only what you have not seen.
                    </p>
                </div>
                <div className="flex-1" />
                <Button onClick={() => fetchTopics()} disabled={fetchState.running}>
                    {fetchState.running ? 'Fetching…' : 'Fetch all'}
                </Button>
                <Button variant="primary" onClick={() => setEditing(makeTopic({ color: PALETTE[topics.length % PALETTE.length] }))}>
                    + New topic
                </Button>
            </header>

            {!topics.length && (
                <Empty icon="◈" title="No topics yet">
                    Add one topic per research thread you track. Narrow beats broad: three or four precise
                    keywords plus a category will surface far more of what you actually want to read.
                </Empty>
            )}

            <div className="grid gap-3 md:grid-cols-2">
                {topics.map((topic) => (
                    <article
                        key={topic.id}
                        className={cx(
                            'rounded-xl border bg-white/[0.02] p-4 transition',
                            topic.enabled ? 'border-white/[0.07]' : 'border-white/[0.04] opacity-55',
                        )}
                    >
                        <div className="flex items-start gap-2">
                            <span className="mt-1.5 h-2.5 w-2.5 flex-none rounded-full" style={{ backgroundColor: topic.color }} />
                            <div className="min-w-0 flex-1">
                                <h3 className="truncate text-sm font-semibold text-slate-100">{topic.name}</h3>
                                <p className="mt-0.5 text-[10px] text-slate-500">
                                    {countsByTopic[topic.id] || 0} papers ·{' '}
                                    {topic.lastFetch ? `last fetched ${shortDate(topic.lastFetch)}` : 'never fetched'}
                                    {topic.newCount ? ` · +${topic.newCount} last run` : ''}
                                </p>
                            </div>
                            <button
                                type="button"
                                title={topic.enabled ? 'Disable' : 'Enable'}
                                onClick={() => dispatch({ type: 'TOPIC_UPDATE', id: topic.id, patch: { enabled: !topic.enabled } })}
                                className={cx(
                                    'flex-none rounded-md border px-1.5 py-0.5 text-[10px] transition',
                                    topic.enabled
                                        ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                                        : 'border-white/10 text-slate-500',
                                )}
                            >
                                {topic.enabled ? 'on' : 'off'}
                            </button>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1">
                            {topic.terms.map((t) => <Chip key={t} color={topic.color}>{t}</Chip>)}
                            {topic.categories.map((c) => <Chip key={c}>{c}</Chip>)}
                            {topic.authors.map((a) => <Chip key={a}>au: {a}</Chip>)}
                            {topic.exclude.map((e) => (
                                <Chip key={e} className="!border-rose-400/30 !bg-rose-500/10 !text-rose-300">−{e}</Chip>
                            ))}
                            {!topic.terms.length && !topic.categories.length && !topic.authors.length && (
                                <span className="text-[11px] text-slate-600">No criteria — this topic will not fetch.</span>
                            )}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                            <Button size="sm" onClick={() => setEditing(topic)}>Edit</Button>
                            <Button size="sm" onClick={() => fetchTopics([topic.id])} disabled={fetchState.running}>
                                Fetch
                            </Button>
                            <Button size="sm" onClick={() => setProbe(topic)}>Preview</Button>
                            <div className="flex-1" />
                            <Button
                                size="sm"
                                variant="danger"
                                onClick={() => {
                                    // eslint-disable-next-line no-alert
                                    if (window.confirm(`Delete "${topic.name}"? Papers stay in your library.`)) {
                                        dispatch({ type: 'TOPIC_REMOVE', id: topic.id });
                                    }
                                }}
                            >
                                Delete
                            </Button>
                        </div>
                    </article>
                ))}
            </div>

            {fetchState.log.length > 0 && (
                <Panel title="Last fetch">
                    <ul className="space-y-1 text-[11px]">
                        {fetchState.log.map((l, i) => (
                            <li key={i} className="flex items-center gap-2">
                                <span className={l.ok ? 'text-emerald-400' : 'text-rose-400'}>{l.ok ? '✓' : '✕'}</span>
                                <span className="text-slate-300">{l.topic}</span>
                                <span className="text-slate-500">
                                    {l.ok
                                        ? `${l.fresh} new of ${l.fetched} returned${l.total ? ` (${l.total} match in total)` : ''} · via ${l.strategy}`
                                        : l.message}
                                </span>
                            </li>
                        ))}
                    </ul>
                </Panel>
            )}

            <TopicEditor
                topic={editing}
                onClose={() => setEditing(null)}
                onSave={(t) => {
                    if (topics.some((x) => x.id === t.id)) dispatch({ type: 'TOPIC_UPDATE', id: t.id, patch: t });
                    else dispatch({ type: 'TOPIC_ADD', topic: t });
                    setEditing(null);
                }}
            />
            <PreviewModal topic={probe} onClose={() => setProbe(null)} settings={settings} />
        </div>
    );
}

/* ---------------------------------------------------------------- the editor */

function TopicEditor({ topic, onClose, onSave }) {
    const [draft, setDraft] = useState(topic);
    const [copied, copy] = useCopy();

    React.useEffect(() => setDraft(topic), [topic]);
    if (!draft) return null;

    const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
    const query = buildQuery(draft);

    return (
        <Modal open onClose={onClose} title={topic.name === 'New topic' ? 'New topic' : `Edit “${topic.name}”`} width="max-w-2xl">
            <div className="space-y-4">
                <div className="flex gap-3">
                    <div className="flex-1">
                        <Field label="Name">
                            <Input value={draft.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
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
                                    className={cx(
                                        'h-6 w-6 rounded-md transition',
                                        draft.color === c ? 'ring-2 ring-white/70 ring-offset-2 ring-offset-slate-900' : 'opacity-60 hover:opacity-100',
                                    )}
                                    aria-label={`Colour ${c}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <Field label="Keywords" hint="Quoted phrases are matched exactly. Any one of them is enough to match.">
                    <TokenInput
                        value={draft.terms}
                        onChange={(terms) => set({ terms })}
                        color={draft.color}
                        placeholder="tensor network, matrix product state…"
                    />
                </Field>

                <Field label="Exclude" hint="Papers containing any of these are dropped before they reach you.">
                    <TokenInput value={draft.exclude} onChange={(exclude) => set({ exclude })} placeholder="survey, review…" />
                </Field>

                <Field label="Categories" hint="Restrict to these arXiv categories. Leave empty to search everywhere.">
                    <TokenInput value={draft.categories} onChange={(categories) => set({ categories })} placeholder="cs.LG, quant-ph…" />
                    <div className="mt-2 flex max-h-24 flex-wrap gap-1 overflow-y-auto">
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

                <Field label="Authors" hint="Only papers by one of these authors. Usually left empty — follow authors instead.">
                    <TokenInput value={draft.authors} onChange={(authors) => set({ authors })} placeholder="Hinton, LeCun…" />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                    <Field label="Search in">
                        <select
                            value={draft.fields}
                            onChange={(e) => set({ fields: e.target.value })}
                            className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/50"
                        >
                            <option value="title">Title only (precise)</option>
                            <option value="title_abstract">Title and abstract</option>
                            <option value="all">All fields (broad)</option>
                        </select>
                    </Field>
                    <Field label="Max results per fetch" hint="Leave empty to use the global setting.">
                        <Input
                            type="number"
                            min="10"
                            max="200"
                            value={draft.maxResults || ''}
                            onChange={(e) => set({ maxResults: e.target.value ? Number(e.target.value) : null })}
                            placeholder="default"
                        />
                    </Field>
                </div>

                <div>
                    <span className="mb-1 block text-[11px] font-medium text-slate-400">Generated arXiv query</span>
                    <pre className="max-h-24 overflow-auto rounded-lg border border-white/10 bg-slate-950/60 p-2.5 font-mono text-[10.5px] leading-relaxed text-slate-400">
                        {query || 'Add a keyword, category or author to build a query.'}
                    </pre>
                    {query && (
                        <div className="mt-1.5 flex gap-1.5">
                            <Button size="sm" onClick={() => copy(query, 'q')}>{copied === 'q' ? 'Copied' : 'Copy query'}</Button>
                            <Button
                                size="sm"
                                as="a"
                                href={`https://arxiv.org/list/${(draft.categories[0] || 'cs.LG')}/recent`}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Browse category on arXiv
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 border-t border-white/10 pt-3">
                    <Button onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={() => onSave(draft)} disabled={!query}>Save topic</Button>
                </div>
            </div>
        </Modal>
    );
}

/* --------------------------------------------------------------- dry-run test */

function PreviewModal({ topic, onClose, settings }) {
    const [state, setState] = useState({ loading: false, entries: [], error: null, total: null });

    React.useEffect(() => {
        if (!topic) return undefined;
        let cancelled = false;
        const controller = new AbortController();
        setState({ loading: true, entries: [], error: null, total: null });
        searchRaw(buildQuery(topic), { max: 15, strategy: settings.proxy, signal: controller.signal })
            .then(({ entries, total }) => { if (!cancelled) setState({ loading: false, entries, error: null, total }); })
            .catch((err) => { if (!cancelled) setState({ loading: false, entries: [], error: err.message, total: null }); });
        return () => { cancelled = true; controller.abort(); };
    }, [topic, settings.proxy]);

    if (!topic) return null;
    return (
        <Modal open onClose={onClose} title={`Preview — ${topic.name}`} width="max-w-2xl">
            <p className="mb-3 text-[11px] text-slate-500">
                A dry run. Nothing here is saved to your library — it just shows what this query returns right now.
            </p>
            {state.loading && <p className="py-8 text-center text-xs text-slate-500">Querying arXiv…</p>}
            {state.error && <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">{state.error}</p>}
            {state.total != null && (
                <p className="mb-2 text-[11px] text-slate-400">{state.total.toLocaleString()} papers match this query in total.</p>
            )}
            <ul className="max-h-[50vh] space-y-1.5 overflow-y-auto">
                {state.entries.map((e) => (
                    <li key={e.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                        <a
                            href={`https://arxiv.org/abs/${e.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="line-clamp-2 text-[12px] text-slate-200 hover:text-sky-300"
                        >
                            {e.title}
                        </a>
                        <p className="mt-0.5 truncate text-[10px] text-slate-500">
                            {e.authors.slice(0, 4).map((a) => a.name).join(', ')} · {e.primary} · {shortDate(e.published)}
                        </p>
                    </li>
                ))}
            </ul>
        </Modal>
    );
}
