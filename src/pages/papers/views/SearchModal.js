/**
 * Add a paper by hand.
 *
 * Topics sweep; this is the other half — the paper a colleague mentioned, the
 * one in a bibliography, the one you half-remember. Search once, tick what you
 * want, and it joins the corpus alongside everything the topics brought in.
 *
 * Lookups go through lookup.js — your own library first, then DataCite, and
 * only then OpenAlex — so an ordinary search costs nothing rationed and works
 * on a day OpenAlex has already been spent. Whatever answers, the paper arrives
 * in the same shape as a fetched one: id, abstract, authors, categories, a PDF
 * link. Only papers with an arXiv copy can be added; everything here is
 * ultimately something to read.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePapers } from '../context';
import { getBudget, humanWait } from '../openalex';
import { lookup } from '../lookup';
import { Button, Chip, Count, Empty, Modal, Spinner, cx, shortDate } from '../ui';

const MAX = 25;

export default function SearchModal({ open, onClose }) {
    const { papers, settings, dispatch, notify } = usePapers();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);   // null = nothing run yet
    const [chosen, setChosen] = useState(() => new Set());
    const [running, setRunning] = useState(false);
    const [error, setError] = useState(null);
    const [budget, setBudget] = useState(null);
    const abort = useRef(null);
    const inputRef = useRef(null);

    /* Reopening should not show the last search's results. */
    useEffect(() => {
        if (!open) return;
        setQuery('');
        setResults(null);
        setChosen(new Set());
        setError(null);
        const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 30);
        return () => clearTimeout(t);
    }, [open]);

    useEffect(() => () => { if (abort.current) abort.current.abort(); }, []);

    const run = useCallback(async (e) => {
        if (e) e.preventDefault();
        const text = query.trim();
        if (!text) return;
        if (abort.current) abort.current.abort();
        abort.current = new AbortController();
        setRunning(true);
        setError(null);
        setChosen(new Set());
        try {
            const { entries, exact, skipped, source } = await lookup(text, {
                papers,
                mailto: settings.openAlexMailto,
                signal: abort.current.signal,
            });
            setResults({ entries: entries.slice(0, MAX), exact, skipped, source });
            // A lookup by id or DOI has one obvious answer: tick it for them.
            if (exact && entries.length === 1 && !papers[entries[0].id]) {
                setChosen(new Set([entries[0].id]));
            }
        } catch (err) {
            if (err.name !== 'AbortError') setError(err.message);
        } finally {
            setRunning(false);
            setBudget(getBudget());
        }
    }, [query, settings.openAlexMailto, papers]);

    const fresh = results ? results.entries.filter((p) => !papers[p.id]) : [];
    const toggle = (id) => setChosen((s) => {
        const n = new Set(s);
        if (n.has(id)) n.delete(id); else n.add(id);
        return n;
    });

    const add = () => {
        const entries = results.entries.filter((p) => chosen.has(p.id));
        if (!entries.length) return;
        dispatch({ type: 'INGEST', entries, topicId: null, origin: 'search' });
        notify(`${entries.length} paper${entries.length === 1 ? '' : 's'} added — find them in the Stream under “Added”`);
        onClose();
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Add a paper"
            subtitle="Search by title, abstract or author — or paste an arXiv id, a URL or a DOI"
            width="max-w-3xl"
            footer={(
                <>
                    <Count className="mr-auto">
                        {results
                            ? `${results.entries.length} found${results.source ? ` via ${results.source}` : ''} · ${chosen.size} selected`
                            : 'Nothing searched yet'}
                    </Count>
                    <Button variant="quiet" size="sm" onClick={onClose}>Cancel</Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={add}
                        disabled={!chosen.size}
                        data-testid="add-selected"
                    >
                        Add {chosen.size || ''} to corpus
                    </Button>
                </>
            )}
        >
            <form onSubmit={run} className="flex items-center gap-2">
                <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="entropic optimal transport   ·   2301.12345   ·   arxiv.org/abs/…"
                    aria-label="Search arXiv"
                    data-testid="search-input"
                    className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-[12.5px] text-slate-100 placeholder:text-slate-600 outline-none transition-colors focus:border-orange-400/60"
                />
                <Button type="submit" variant="primary" size="md" disabled={running || !query.trim()} data-testid="run-search">
                    {running ? <><Spinner className="!border-slate-800 !border-t-slate-950" /> Searching</> : 'Search'}
                </Button>
            </form>

            {error && (
                <p className="mt-3 rounded-lg border border-rose-500/25 bg-rose-500/[0.08] px-3 py-2 text-[11.5px] text-rose-200">
                    {error}
                </p>
            )}

            {/* Every search spends from a daily allowance, so it is worth saying
                when there is little of it left — before it runs out mid-thought. */}
            {budget && budget.limit && budget.remaining != null
                && !budget.blocked && budget.remaining < budget.limit * 0.1 && (
                <p className="mt-2 text-[10.5px] text-orange-300/70">
                    {budget.remaining} OpenAlex request{budget.remaining === 1 ? '' : 's'} left today
                    {budget.resetAt && <> · resets in {humanWait(budget.resetAt - Date.now())}</>}
                </p>
            )}

            <div className="mt-3 max-h-[46vh] min-h-[8rem] overflow-y-auto" data-testid="search-results">
                {!results && !running && (
                    <Empty
                        icon="⌕"
                        title="Look something up"
                        className="!py-8"
                    >
                        Your own library first, then DataCite — where arXiv registers every DOI, with
                        no key and no daily allowance. Anything you add arrives with its abstract,
                        authors and arXiv categories.
                    </Empty>
                )}

                {results && !results.entries.length && (
                    <Empty icon="∅" title="Nothing on arXiv matched" className="!py-8">
                        {results.skipped > 0
                            ? `${results.skipped} paper${results.skipped === 1 ? '' : 's'} matched but ${results.skipped === 1 ? 'has' : 'have'} no arXiv copy, so there is nothing to read here. Try different words, or paste the arXiv id.`
                            : 'Try fewer words, or paste the arXiv id if you have it.'}
                    </Empty>
                )}

                {results && results.entries.length > 0 && (
                    <>
                        {fresh.length > 1 && (
                            <div className="mb-2 flex items-center gap-2">
                                <Button
                                    size="xs"
                                    variant="quiet"
                                    onClick={() => setChosen(new Set(fresh.map((p) => p.id)))}
                                >
                                    Select all {fresh.length} new
                                </Button>
                                {chosen.size > 0 && (
                                    <Button size="xs" variant="quiet" onClick={() => setChosen(new Set())}>Clear</Button>
                                )}
                            </div>
                        )}
                        <ul className="space-y-1">
                            {results.entries.map((p) => {
                                const held = !!papers[p.id];
                                const picked = chosen.has(p.id);
                                const authors = (p.authors || []).slice(0, 4).map((a) => a.name).join(', ');
                                const more = Math.max(0, (p.authors || []).length - 4);
                                return (
                                    <li key={p.id}>
                                        <button
                                            type="button"
                                            data-testid="search-result"
                                            data-paper-id={p.id}
                                            disabled={held}
                                            onClick={() => toggle(p.id)}
                                            className={cx(
                                                'flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left transition',
                                                held
                                                    ? 'cursor-default border-slate-800/60 bg-slate-900/20 opacity-60'
                                                    : picked
                                                        ? 'border-orange-400/50 bg-orange-400/[0.08]'
                                                        : 'border-slate-800 hover:border-slate-700 hover:bg-white/[0.03]',
                                            )}
                                        >
                                            <span
                                                aria-hidden
                                                className={cx(
                                                    'mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded border text-[10px] font-bold',
                                                    held ? 'border-slate-700 text-slate-600'
                                                        : picked ? 'border-orange-400 bg-orange-400 text-slate-950'
                                                            : 'border-slate-600 text-transparent',
                                                )}
                                            >
                                                ✓
                                            </span>

                                            <span className="min-w-0 flex-1">
                                                <span className="block text-[12.5px] font-medium leading-snug text-slate-100 line-clamp-2">
                                                    {p.title}
                                                </span>
                                                {authors && (
                                                    <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                                                        {authors}{more > 0 && <span className="text-slate-600"> +{more}</span>}
                                                    </span>
                                                )}
                                                <span className="mt-1 flex flex-wrap items-center gap-1.5">
                                                    <span className="font-mono text-[10px] text-slate-600">
                                                        {shortDate(p.published)} · {p.id}
                                                    </span>
                                                    {p.citations > 0 && <Chip title="Citations, via OpenAlex">{p.citations} cites</Chip>}
                                                    {held && <Chip title="Already in your corpus">in library</Chip>}
                                                </span>
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                )}
            </div>
        </Modal>
    );
}
