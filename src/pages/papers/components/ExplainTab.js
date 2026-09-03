/**
 * The explanation tab.
 *
 * Ask for a paper at the depth you need it, watch it arrive, keep it. A note is
 * saved against the paper, so the second time you open it the explanation is
 * already there and costs nothing — and it leaves the app the way anything else
 * would: copied, saved as markdown, mailed, or handed to WhatsApp.
 *
 * Nothing is generated without being asked for. A model costs money and gets
 * things wrong, so it never runs on its own.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import { usePapers } from '../context';
import { LEVELS, buildPrompt, levelById, shareTargets } from '../explain';
import { complete, loadKey } from '../llm';
import { download } from '../storage';
import { Button, Count, Empty, Spinner, cx, relativeDay, useCopy } from '../ui';

/** Markdown with the mathematics set, which is the whole point of the deep level. */
function Rendered({ text }) {
    return (
        <div className={cx(
            'prose prose-invert max-w-none text-[12.5px] leading-relaxed',
            // The panel is narrow, so the defaults are dialled down to fit it.
            'prose-headings:text-[12.5px] prose-headings:font-semibold prose-headings:text-orange-200/90',
            'prose-p:my-2 prose-li:my-0.5 prose-ul:my-2 prose-strong:text-slate-100',
            'prose-code:text-[11.5px] prose-code:text-sky-200 prose-pre:bg-slate-950/70',
        )}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
            >
                {text}
            </ReactMarkdown>
        </div>
    );
}

export default function ExplainTab({ paper }) {
    const { settings, states, dispatch, notify } = usePapers();
    const st = states[paper.id] || {};
    const saved = st.explanations || {};

    const [level, setLevel] = useState('brief');
    const [streaming, setStreaming] = useState('');
    const [running, setRunning] = useState(false);
    const [error, setError] = useState(null);
    const abort = useRef(null);
    const [copied, copy] = useCopy();

    const note = saved[level];
    const configured = !!settings.llmProxyUrl || !!loadKey();

    useEffect(() => () => { if (abort.current) abort.current.abort(); }, []);
    useEffect(() => { setStreaming(''); setError(null); }, [level, paper.id]);

    const run = useCallback(async () => {
        const chosen = levelById(level);
        const { system, prompt } = buildPrompt(paper, chosen);
        abort.current = new AbortController();
        setRunning(true);
        setError(null);
        setStreaming('');
        try {
            const { text, model } = await complete({
                config: {
                    provider: settings.llmProvider,
                    model: settings.llmModel,
                    endpoint: settings.llmEndpoint,
                    proxyUrl: settings.llmProxyUrl,
                },
                system,
                prompt,
                maxTokens: chosen.maxTokens,
                onToken: setStreaming,
                signal: abort.current.signal,
            });
            if (!text.trim()) throw new Error('The model returned nothing.');
            dispatch({
                type: 'EXPLANATION',
                id: paper.id,
                level,
                note: { text, model, at: new Date().toISOString(), level },
            });
            setStreaming('');
        } catch (err) {
            if (err.name !== 'AbortError') setError(err.message);
        } finally {
            setRunning(false);
        }
    }, [level, paper, settings, dispatch]);

    const share = note ? shareTargets(paper, note) : null;

    return (
        <div className="space-y-3 px-4 py-4" data-testid="explain-tab">
            {/* Depth first: what you want decides what it costs and how long it takes. */}
            <div className="flex flex-wrap items-center gap-1.5">
                {LEVELS.map((l) => (
                    <button
                        key={l.id}
                        type="button"
                        data-testid={`level-${l.id}`}
                        title={l.blurb}
                        onClick={() => setLevel(l.id)}
                        className={cx(
                            'rounded-lg border px-2.5 py-1 text-[11.5px] font-medium transition',
                            level === l.id
                                ? 'border-orange-400/50 bg-orange-400/[0.12] text-orange-200'
                                : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200',
                        )}
                    >
                        {l.label}
                        {saved[l.id] && <span className="ml-1.5 text-[9px] text-emerald-300/70">✓</span>}
                    </button>
                ))}
                <div className="flex-1" />
                {running ? (
                    <Button size="sm" variant="quiet" onClick={() => abort.current && abort.current.abort()}>
                        Stop
                    </Button>
                ) : (
                    <Button
                        size="sm"
                        variant={note ? 'ghost' : 'primary'}
                        onClick={run}
                        disabled={!configured}
                        data-testid="explain-run"
                    >
                        {note ? 'Regenerate' : 'Explain'}
                    </Button>
                )}
            </div>

            <p className="text-[11px] leading-relaxed text-slate-500">{levelById(level).blurb}</p>

            {!configured && (
                <Empty icon="◌" title="No model connected" className="!py-8">
                    Settings → AI explanations. The key stays on this device and never travels
                    with an export — or point the app at a proxy you control and store no key
                    here at all.
                </Empty>
            )}

            {error && (
                <p className="rounded-lg border border-rose-500/25 bg-rose-500/[0.08] px-3 py-2 text-[11.5px] text-rose-200">
                    {error}
                </p>
            )}

            {running && (
                <div className="flex items-center gap-2 text-[11px] text-orange-200/80">
                    <Spinner className="h-3.5 w-3.5" />
                    {streaming ? 'writing…' : 'thinking…'}
                </div>
            )}

            {/* What is on screen: the answer arriving, or the one kept from last time. */}
            {streaming ? <Rendered text={streaming} /> : note && <Rendered text={note.text} />}

            {note && !running && (
                <div className="space-y-2 border-t border-slate-800 pt-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <Button size="sm" data-testid="explain-copy" onClick={() => { copy(share.markdown); notify('Note copied'); }}>
                            {copied ? 'Copied' : 'Copy'}
                        </Button>
                        <Button size="sm" onClick={() => download(share.filename, share.markdown, 'text/markdown')}>
                            Save .md
                        </Button>
                        <Button size="sm" as="a" href={share.mailto}>Email</Button>
                        <Button size="sm" as="a" href={share.whatsapp} target="_blank" rel="noreferrer">WhatsApp</Button>
                        <div className="flex-1" />
                        <Button
                            size="sm"
                            variant="quiet"
                            onClick={() => dispatch({ type: 'EXPLANATION_REMOVE', id: paper.id, level })}
                        >
                            Discard
                        </Button>
                    </div>
                    <Count>
                        {note.model} · {relativeDay(note.at)} · written from the abstract, so check it
                        against the paper before citing it
                    </Count>
                </div>
            )}
        </div>
    );
}
