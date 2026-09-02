import React, { useEffect, useMemo, useRef, useState } from 'react';

import { usePapers } from '../context';
import { exportStore, download, prune as pruneStore, storeBytes, storageEstimate } from '../storage';
import { STRATEGIES } from '../arxiv';
import { toBibtexAll, toCsv } from '../bibtex';
import { Button, Field, Input, Modal, Toggle, cx } from '../ui';

const fmt = (n) => {
    if (n == null) return '—';
    if (n < 1024) return `${n} B`;
    if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
    if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`;
    return `${(n / 1073741824).toFixed(2)} GB`;
};

/** Everything you set once and forget, kept out of the way until asked for. */
export default function SettingsModal({ open, onClose }) {
    const store = usePapers();
    const { dispatch, settings, counts, paperList, states, notify, raw, resetAll } = store;
    const fileRef = useRef(null);
    const [pending, setPending] = useState(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [estimate, setEstimate] = useState(null);

    const bytes = useMemo(() => storeBytes(raw), [raw]);
    const pruneable = useMemo(() => pruneStore(raw, { days: 90 }).removed, [raw]);
    useEffect(() => { if (open) storageEstimate().then(setEstimate); }, [open, bytes]);

    const set = (patch) => dispatch({ type: 'SETTINGS', patch });
    const usage = estimate ? Math.min(100, (estimate.usage / estimate.quota) * 100) : null;

    const onFile = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(reader.result);
                if (!parsed || typeof parsed !== 'object' || !parsed.papers) {
                    throw new Error('That file is not a Paper Radar export.');
                }
                setPending({ store: parsed, papers: Object.keys(parsed.papers).length, topics: (parsed.topics || []).length });
            } catch (err) { notify(err.message); }
        };
        reader.readAsText(file);
    };

    return (
        <>
            <Modal open={open && !pending && !confirmReset} onClose={onClose} title="Settings" width="max-w-lg">
                <div className="space-y-5">
                    <section>
                        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Your data</h3>
                        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-[11px]">
                            <span className="text-slate-400">{counts.total.toLocaleString()} papers · {fmt(bytes)}</span>
                            <span className={cx(usage != null && usage > 80 ? 'text-amber-300' : 'text-slate-600')}>
                                {estimate ? `${fmt(estimate.usage)} of ${fmt(estimate.quota)} available` : 'stored in IndexedDB'}
                            </span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-slate-800">
                            <div className="h-full rounded-full bg-orange-400 transition-all"
                                 style={{ width: `${Math.max(0.6, usage == null ? 0.6 : usage)}%` }} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Button variant="primary" size="sm" onClick={() => exportStore(raw)}>Export everything</Button>
                            <Button size="sm" onClick={() => fileRef.current.click()}>Import…</Button>
                            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden"
                                   onChange={(e) => { onFile(e.target.files[0]); e.target.value = ''; }} />
                            <Button size="sm" onClick={() => download(`library-${new Date().toISOString().slice(0, 10)}.bib`, toBibtexAll(paperList), 'text/plain')}>
                                Library as BibTeX
                            </Button>
                            <Button size="sm" onClick={() => download(`library-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(paperList, states), 'text/csv')}>
                                CSV
                            </Button>
                        </div>
                    </section>

                    <section className="space-y-3 border-t border-slate-800 pt-4">
                        <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Fetching</h3>
                        <Field
                            label="Source"
                            hint={settings.source === 'arxiv'
                                ? 'arXiv carries categories and versions but sends no CORS headers, so it needs a public relay — and those are often down.'
                                : 'OpenAlex indexes arXiv, is reachable straight from the browser, and adds citation counts. It cannot filter by arXiv category.'}
                        >
                            <select
                                value={settings.source}
                                onChange={(e) => set({ source: e.target.value })}
                                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-orange-400/60"
                            >
                                <option value="openalex">OpenAlex — no relay needed (recommended)</option>
                                <option value="arxiv">arXiv Atom API — needs a relay</option>
                            </select>
                        </Field>

                        {settings.source === 'arxiv' && (
                            <Field label="Relay">
                                <select
                                    value={settings.proxy}
                                    onChange={(e) => set({ proxy: e.target.value })}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-orange-400/60"
                                >
                                    <option value="auto">Auto — try each in turn</option>
                                    {STRATEGIES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                                </select>
                            </Field>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Results per topic">
                                <Input type="number" min="10" max="200" value={settings.maxResultsPerTopic}
                                       onChange={(e) => set({ maxResultsPerTopic: Number(e.target.value) })} />
                            </Field>
                            <Field label="Look back (days)">
                                <Input type="number" min="1" max="365" value={settings.lookbackDays}
                                       onChange={(e) => set({ lookbackDays: Number(e.target.value) })} />
                            </Field>
                        </div>

                        <Toggle checked={settings.autoFetchOnOpen} onChange={(v) => set({ autoFetchOnOpen: v })}
                                label="Fetch automatically once a day"
                                hint="On the first visit of a calendar day, pull every enabled topic." />
                        <Toggle checked={settings.pdfInline} onChange={(v) => set({ pdfInline: v })}
                                label="Open papers on the PDF"
                                hint="Jump straight to the PDF tab instead of the overview when a paper is opened." />
                        <Toggle checked={settings.enrich} onChange={(v) => set({ enrich: v })}
                                label="Enrich with Semantic Scholar"
                                hint="Adds citation counts and TL;DR summaries. No key needed." />
                    </section>

                    <section className="flex flex-wrap gap-2 border-t border-slate-800 pt-4">
                        <Button size="sm" variant="danger" disabled={!pruneable}
                                onClick={() => { dispatch({ type: 'PRUNE', options: { days: 90 } }); notify(`Pruned ${pruneable}`); }}>
                            Prune {pruneable || 0} stale papers
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => dispatch({ type: 'FEEDBACK_RESET' })}>
                            Reset learned ranking
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setConfirmReset(true)}>Delete all papers</Button>
                    </section>
                </div>
            </Modal>

            <Modal open={!!pending} onClose={() => setPending(null)} title="Import">
                {pending && (
                    <div className="space-y-3">
                        <p className="text-xs text-slate-400">
                            This file holds <b className="text-slate-200">{pending.papers.toLocaleString()} papers</b> and{' '}
                            <b className="text-slate-200">{pending.topics} topics</b>.
                        </p>
                        <Button variant="primary" size="lg" className="w-full justify-start"
                                onClick={() => { dispatch({ type: 'IMPORT', store: pending.store, mode: 'merge' }); setPending(null); notify('Merged'); }}>
                            Merge — add what is missing, keep my reading state
                        </Button>
                        <Button variant="danger" size="lg" className="w-full justify-start"
                                onClick={() => { dispatch({ type: 'IMPORT', store: pending.store, mode: 'replace' }); setPending(null); notify('Replaced'); }}>
                            Replace — discard everything here
                        </Button>
                    </div>
                )}
            </Modal>

            <Modal
                open={confirmReset}
                onClose={() => setConfirmReset(false)}
                title="Delete all papers?"
                footer={
                    <>
                        <Button onClick={() => setConfirmReset(false)}>Cancel</Button>
                        <Button variant="danger" onClick={() => { resetAll(); setConfirmReset(false); notify('Library cleared'); }}>
                            Delete everything
                        </Button>
                    </>
                }
            >
                <p className="text-xs leading-relaxed text-slate-400">
                    This clears every paper, note, folder and followed author. Your topics are kept.
                    There is no undo — export first if you are unsure.
                </p>
            </Modal>
        </>
    );
}
