import React, { useEffect, useMemo, useRef, useState } from 'react';

import { usePapers } from '../context';
import { exportStore, download, prune as pruneStore, storeBytes, storageEstimate } from '../storage';
import { STRATEGIES } from '../arxiv';
import { toBibtexAll, toCsv } from '../bibtex';
import { getBudget, humanWait } from '../openalex';
import { feedConfig } from '../feed';
import { PROVIDERS, forgetKey, keyIsRemembered, loadKey, maskKey, saveKey, testKey } from '../llm';
import { Button, Count, Field, Input, Modal, Toggle, cx } from '../ui';

const fmt = (n) => {
    if (n == null) return '—';
    if (n < 1024) return `${n} B`;
    if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
    if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`;
    return `${(n / 1073741824).toFixed(2)} GB`;
};

/** Everything you set once and forget, kept out of the way until asked for. */
const SOURCE_HINTS = {
    feed: 'A scheduled job fetches arXiv where no browser is in the way and commits the '
        + 'result to this site, so the app reads it same-origin: no relay, no allowance, and real '
        + 'arXiv categories. It is as fresh as the last run of the workflow.',
    openalex: 'OpenAlex indexes arXiv and is reachable straight from the browser, and adds citation '
        + 'counts — but it bills per request against a daily allowance, and cannot filter by arXiv category.',
    arxiv: 'arXiv carries categories and versions but sends no CORS headers, so it needs a public relay — '
        + 'and those are often down.',
};

/**
 * Connecting a model.
 *
 * The security story is told here rather than buried in a tooltip, because the
 * reader is the one carrying the risk: on a static site there is no server to
 * hide a secret in, so a key in this box is a key in this browser. What the app
 * can promise is narrow and worth stating exactly — it is kept out of the
 * library, so no export, no BibTeX file and no shared note can carry it — and
 * the way to promise more is a proxy the reader controls.
 */
function AiSettings({ settings, set }) {
    const [key, setKey] = useState(() => loadKey());
    const [remember, setRemember] = useState(() => keyIsRemembered() || !loadKey());
    const [probe, setProbe] = useState(null);
    const provider = PROVIDERS[settings.llmProvider] || PROVIDERS.anthropic;
    const viaProxy = !!settings.llmProxyUrl;

    const store = (next, keep) => {
        setKey(next);
        saveKey(next, { remember: keep });
    };

    const check = async () => {
        setProbe({ state: 'running' });
        try {
            const reply = await testKey({
                provider: settings.llmProvider,
                model: settings.llmModel,
                endpoint: settings.llmEndpoint,
                proxyUrl: settings.llmProxyUrl,
            });
            setProbe({ state: 'ok', message: reply || 'ready' });
        } catch (err) {
            setProbe({ state: 'bad', message: err.message });
        }
    };

    return (
        <section className="space-y-3 border-t border-slate-800 pt-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">AI explanations</h3>

            <Field label="Provider" hint={viaProxy ? 'Your proxy decides what it forwards to.' : undefined}>
                <select
                    value={settings.llmProvider}
                    onChange={(e) => set({ llmProvider: e.target.value, llmModel: '' })}
                    data-testid="llm-provider"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-orange-400/60"
                >
                    {Object.values(PROVIDERS).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
            </Field>

            {provider.models.length > 0 ? (
                <Field label="Model">
                    <select
                        value={settings.llmModel || provider.defaultModel}
                        onChange={(e) => set({ llmModel: e.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-orange-400/60"
                    >
                        {provider.models.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                </Field>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Model">
                        <Input
                            placeholder={provider.defaultModel}
                            value={settings.llmModel}
                            onChange={(e) => set({ llmModel: e.target.value.trim() })}
                        />
                    </Field>
                    <Field label="Endpoint" hint="Anything speaking the OpenAI shape.">
                        <Input
                            placeholder={provider.endpoint}
                            value={settings.llmEndpoint}
                            onChange={(e) => set({ llmEndpoint: e.target.value.trim() })}
                        />
                    </Field>
                </div>
            )}

            {!viaProxy && (
                <Field
                    label="API key"
                    hint={(
                        <>
                            Held on this device only, in its own store — never inside an export, a
                            BibTeX file or a shared note. It is still readable by anything running
                            in this page, so use a key with a spend cap. <a
                                href={provider.console}
                                target="_blank"
                                rel="noreferrer"
                                className="text-orange-300/80 underline decoration-dotted"
                            >Create one</a>.
                        </>
                    )}
                >
                    <div className="flex gap-2">
                        <Input
                            type="password"
                            autoComplete="off"
                            spellCheck="false"
                            data-testid="llm-key"
                            placeholder={provider.keyHint}
                            value={key}
                            onChange={(e) => store(e.target.value.trim(), remember)}
                        />
                        <Button size="sm" onClick={check} disabled={!key || probe?.state === 'running'}>
                            {probe?.state === 'running' ? 'Testing…' : 'Test'}
                        </Button>
                    </div>
                </Field>
            )}

            {!viaProxy && key && (
                <div className="flex flex-wrap items-center gap-3">
                    <Toggle
                        checked={remember}
                        onChange={(v) => { setRemember(v); saveKey(key, { remember: v }); }}
                        label="Remember on this device"
                        hint={remember
                            ? `Stored as ${maskKey(key)}. Anyone with this browser profile can use it.`
                            : 'Kept in memory only — asked again next time this tab is opened.'}
                    />
                    <Button size="sm" variant="danger" onClick={() => { forgetKey(); setKey(''); setProbe(null); }}>
                        Forget key
                    </Button>
                </div>
            )}

            {probe && probe.state !== 'running' && (
                <p className={cx(
                    'rounded-lg border px-3 py-2 text-[11.5px]',
                    probe.state === 'ok'
                        ? 'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-200'
                        : 'border-rose-500/25 bg-rose-500/[0.08] text-rose-200',
                )}>
                    {probe.state === 'ok' ? `The model answered: "${probe.message}"` : probe.message}
                </p>
            )}

            <Field
                label="Or a proxy you control"
                hint="Set this and no key is stored in the browser at all: a Cloudflare Worker or
                      small function holds the real key server-side and forwards the call. It is the
                      only arrangement where the secret is genuinely not on this machine."
            >
                <Input
                    placeholder="https://llm.you.workers.dev"
                    data-testid="llm-proxy"
                    value={settings.llmProxyUrl}
                    onChange={(e) => set({ llmProxyUrl: e.target.value.trim() })}
                />
            </Field>
        </section>
    );
}

/**
 * OpenAlex bills per request against a daily allowance, and the only place that
 * number exists is the last response's headers — so this is blank until
 * something has been fetched, which is honest about what we actually know.
 */
function BudgetNote() {
    const { limit, remaining, resetAt, blocked } = getBudget();
    if (remaining == null || !limit) return null;

    const left = resetAt ? Math.max(0, resetAt - Date.now()) : null;
    const low = remaining < limit * 0.1;
    return (
        <div className={cx(
            'rounded-lg border px-3 py-2 text-[11.5px] leading-relaxed',
            blocked || low
                ? 'border-orange-400/40 bg-orange-400/[0.07] text-orange-100'
                : 'border-slate-800 bg-slate-900/40 text-slate-400',
        )}>
            {blocked
                ? <>Today&rsquo;s OpenAlex allowance is spent.</>
                : <><span className="font-mono">{remaining}</span> of {limit} OpenAlex requests left today.</>}
            {left != null && <Count className="ml-1.5">resets in {humanWait(left)}</Count>}
        </div>
    );
}

export default function SettingsModal({ open, onClose }) {
    const store = usePapers();
    const { dispatch, settings, counts, paperList, states, notify, raw, resetAll, topics } = store;
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
                            hint={SOURCE_HINTS[settings.source] || SOURCE_HINTS.openalex}
                        >
                            <select
                                value={settings.source}
                                onChange={(e) => set({ source: e.target.value })}
                                data-testid="source-select"
                                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-orange-400/60"
                            >
                                <option value="feed">arXiv, prefetched daily — no limits (recommended)</option>
                                <option value="openalex">OpenAlex — live, but on a daily allowance</option>
                                <option value="arxiv">arXiv Atom API — needs a relay</option>
                            </select>
                        </Field>

                        {settings.source === 'feed' && (
                            <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2.5 text-[11.5px] leading-relaxed text-slate-400">
                                The workflow fetches whatever <span className="font-mono text-slate-300">arxiv.feed.json</span> asks
                                for. Export it whenever you change your topics, commit it, and the next run follows.
                                <div className="mt-2">
                                    <Button
                                        size="sm"
                                        data-testid="export-feed-config"
                                        onClick={() => download('arxiv.feed.json', JSON.stringify(feedConfig(topics), null, 2))}
                                    >
                                        Feed config for CI
                                    </Button>
                                </div>
                            </div>
                        )}

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

                        {settings.source === 'openalex' && <BudgetNote />}

                        {settings.source === 'openalex' && (
                            <Field
                                label="Email for OpenAlex"
                                hint="Optional. OpenAlex asks callers to identify themselves for its
                                      “polite pool”, which buys a steadier queue — not a larger daily
                                      allowance."
                            >
                                <Input
                                    type="email"
                                    placeholder="you@example.com"
                                    data-testid="openalex-mailto"
                                    value={settings.openAlexMailto || ''}
                                    onChange={(e) => set({ openAlexMailto: e.target.value.trim() })}
                                />
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

                    <AiSettings settings={settings} set={set} />

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
