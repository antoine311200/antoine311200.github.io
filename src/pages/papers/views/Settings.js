import React, { useMemo, useRef, useState } from 'react';

import { usePapers } from '../context';
import { exportStore, download, prune as pruneStore, storeBytes } from '../storage';
import { STRATEGIES, getPreferredStrategy } from '../arxiv';
import { toBibtexAll, toCsv } from '../bibtex';
import { Button, Field, Input, Panel, Toggle, Modal, cx } from '../components/ui';

const QUOTA = 5 * 1024 * 1024;   // the practical localStorage budget in most browsers

export default function Settings() {
    const store = usePapers();
    const { dispatch, settings, counts, paperList, states, notify, raw } = store;
    const fileRef = useRef(null);
    const [pending, setPending] = useState(null);      // parsed import awaiting a mode choice
    const [confirmReset, setConfirmReset] = useState(false);
    const [pruneDays, setPruneDays] = useState(90);

    const set = (patch) => dispatch({ type: 'SETTINGS', patch });

    const onFile = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(reader.result);
                if (!parsed || typeof parsed !== 'object' || !parsed.papers) {
                    throw new Error('That file does not look like a Paper Radar export.');
                }
                setPending({
                    store: parsed,
                    papers: Object.keys(parsed.papers).length,
                    topics: (parsed.topics || []).length,
                    exportedAt: parsed.exportedAt,
                });
            } catch (err) {
                notify(err.message);
            }
        };
        reader.readAsText(file);
    };

    const bytes = useMemo(() => storeBytes(raw), [raw]);
    const pruneable = useMemo(() => pruneStore(raw, { days: pruneDays }).removed, [raw, pruneDays]);
    const usage = Math.min(100, (bytes / QUOTA) * 100);

    return (
        <div className="mx-auto max-w-3xl space-y-4 px-5 py-6">
            <header>
                <h1 className="text-base font-semibold text-slate-100">Settings</h1>
                <p className="text-[11px] text-slate-500">
                    Everything lives in this browser&apos;s localStorage. Export regularly if it matters to you.
                </p>
            </header>

            {/* ------------------------------------------------------------ data */}
            <Panel title="Your data">
                <div className="space-y-4">
                    <div>
                        <div className="mb-1 flex items-baseline justify-between text-[11px]">
                            <span className="text-slate-400">
                                {counts.total.toLocaleString()} papers · {(bytes / 1024).toFixed(0)} KB stored
                            </span>
                            <span className={cx(usage > 80 ? 'text-amber-300' : 'text-slate-600')}>
                                {usage.toFixed(1)}% of the ~5 MB browser budget
                            </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                            <div
                                className={cx('h-full rounded-full transition-all', usage > 80 ? 'bg-amber-400' : 'bg-orange-400')}
                                style={{ width: `${Math.max(1, usage)}%` }}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button variant="primary" onClick={() => exportStore(raw)}>
                            Export everything (.json)
                        </Button>
                        <Button onClick={() => fileRef.current.click()}>Import…</Button>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="application/json,.json"
                            className="hidden"
                            onChange={(e) => { onFile(e.target.files[0]); e.target.value = ''; }}
                        />
                        <Button onClick={() => download(
                            `paper-radar-library-${new Date().toISOString().slice(0, 10)}.bib`,
                            toBibtexAll(paperList), 'text/plain',
                        )}>
                            Whole library as BibTeX
                        </Button>
                        <Button onClick={() => download(
                            `paper-radar-library-${new Date().toISOString().slice(0, 10)}.csv`,
                            toCsv(paperList, states), 'text/csv',
                        )}>
                            Whole library as CSV
                        </Button>
                    </div>

                    <p className="text-[10.5px] leading-relaxed text-slate-600">
                        The JSON export is the complete store — papers, reading states, notes, tags, topics,
                        collections, followed authors and what the ranker has learned. Import it on another
                        machine to carry your whole radar across.
                    </p>
                </div>
            </Panel>

            {/* -------------------------------------------------------- fetching */}
            <Panel title="Fetching">
                <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Results per topic per fetch" hint="Higher means fewer misses, slower fetches.">
                            <Input
                                type="number"
                                min="10"
                                max="200"
                                value={settings.maxResultsPerTopic}
                                onChange={(e) => set({ maxResultsPerTopic: Number(e.target.value) })}
                            />
                        </Field>
                        <Field label="Recency half-life (days)" hint="How fast a paper's score decays with age.">
                            <Input
                                type="number"
                                min="1"
                                max="90"
                                value={settings.recencyHalfLife}
                                onChange={(e) => set({ recencyHalfLife: Number(e.target.value) })}
                            />
                        </Field>
                    </div>

                    <Field
                        label="Network route"
                        hint={
                            'arXiv does not send CORS headers to browsers, so a relay is usually needed. '
                            + `Auto tries each in turn and sticks with the first that works${getPreferredStrategy() ? ` (currently: ${getPreferredStrategy()})` : ''}.`
                        }
                    >
                        <select
                            value={settings.proxy}
                            onChange={(e) => set({ proxy: e.target.value })}
                            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-orange-400/50"
                        >
                            <option value="auto">Auto — try every route</option>
                            {STRATEGIES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                    </Field>

                    <Toggle
                        checked={settings.autoFetchOnOpen}
                        onChange={(v) => set({ autoFetchOnOpen: v })}
                        label="Fetch automatically once a day"
                        hint="On the first visit of a calendar day, pull every enabled topic in the background."
                    />
                    <Toggle
                        checked={settings.enrich}
                        onChange={(v) => set({ enrich: v })}
                        label="Enrich with Semantic Scholar"
                        hint="Adds citation counts and TL;DR summaries. One extra request per batch of 100 papers, no key needed."
                    />
                </div>
            </Panel>

            {/* --------------------------------------------------------- reading */}
            <Panel title="Reading">
                <div className="space-y-1">
                    <Toggle
                        checked={settings.pdfInline}
                        onChange={(v) => set({ pdfInline: v })}
                        label="Open the PDF preview automatically"
                        hint="Shows the arXiv PDF inside the detail panel as soon as you open a paper."
                    />
                    <Toggle
                        checked={settings.density === 'compact'}
                        onChange={(v) => set({ density: v ? 'compact' : 'comfortable' })}
                        label="Compact list density"
                        hint="Hides abstracts in the list so more papers fit on screen."
                    />
                </div>
            </Panel>

            {/* ------------------------------------------------------- housekeeping */}
            <Panel title="Housekeeping">
                <div className="space-y-4">
                    <div className="flex flex-wrap items-end gap-3">
                        <Field label="Prune papers older than (days)" hint="Only untouched, unread ones — starred, noted, tagged and queued papers are always kept.">
                            <Input
                                type="number"
                                min="7"
                                max="3650"
                                value={pruneDays}
                                onChange={(e) => setPruneDays(Number(e.target.value))}
                                className="!w-32"
                            />
                        </Field>
                        <Button
                            variant={pruneable ? 'ghost' : 'subtle'}
                            disabled={!pruneable}
                            onClick={() => {
                                dispatch({ type: 'PRUNE', options: { days: pruneDays } });
                                notify(`Pruned ${pruneable} papers`);
                            }}
                        >
                            Prune {pruneable || 0} papers
                        </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-3">
                        <Button
                            variant="danger"
                            onClick={() => {
                                dispatch({ type: 'FEEDBACK_RESET' });
                                notify('Learned preferences cleared');
                            }}
                        >
                            Reset learned preferences
                        </Button>
                        <Button variant="danger" onClick={() => setConfirmReset(true)}>
                            Delete all papers
                        </Button>
                    </div>
                </div>
            </Panel>

            {/* --------------------------------------------------------- modals */}
            <Modal open={!!pending} onClose={() => setPending(null)} title="Import">
                {pending && (
                    <div className="space-y-4">
                        <p className="text-xs text-slate-400">
                            This file holds <b className="text-slate-200">{pending.papers.toLocaleString()} papers</b> and{' '}
                            <b className="text-slate-200">{pending.topics} topics</b>
                            {pending.exportedAt && `, exported ${new Date(pending.exportedAt).toLocaleDateString()}`}.
                        </p>
                        <div className="space-y-2">
                            <Button
                                variant="primary"
                                size="lg"
                                className="w-full justify-start"
                                onClick={() => {
                                    dispatch({ type: 'IMPORT', store: pending.store, mode: 'merge' });
                                    setPending(null);
                                    notify('Merged');
                                }}
                            >
                                Merge — add what is missing, keep my reading state
                            </Button>
                            <Button
                                variant="danger"
                                size="lg"
                                className="w-full justify-start"
                                onClick={() => {
                                    dispatch({ type: 'IMPORT', store: pending.store, mode: 'replace' });
                                    setPending(null);
                                    notify('Replaced');
                                }}
                            >
                                Replace — discard everything currently here
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Delete all papers?">
                <p className="text-xs leading-relaxed text-slate-400">
                    This clears every paper, note, tag and followed author. Your topics are kept so you can
                    start fetching again. There is no undo — export first if you are not sure.
                </p>
                <div className="mt-4 flex justify-end gap-2">
                    <Button onClick={() => setConfirmReset(false)}>Cancel</Button>
                    <Button
                        variant="danger"
                        onClick={() => { dispatch({ type: 'RESET' }); setConfirmReset(false); notify('Library cleared'); }}
                    >
                        Delete everything
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
