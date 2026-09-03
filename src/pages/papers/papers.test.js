import { buildQuery, parseFeed, splitArxivId } from './arxiv';
import { scorePaper, learnFrom, buildIndex, similarTo, coauthorGraph, authorStats } from './scoring';
import { parseQuery, applyFilters, groupByDay, DEFAULT_FILTERS } from './filters';
import { toBibtex, citeKey, toCsv } from './bibtex';
import { matchesTopic, sortIntoTopics, feedConfig } from './feed';
import { matchScore } from './match';
import { LEVELS, buildPrompt, levelById, noteMarkdown, shareTargets } from './explain';
import {
    mergeStores, emptyStore, authorKey, prune, makeTopic, makeFolder,
    folderPath, folderSubtree, papersInFolder, canMoveFolder,
} from './storage';
import {
    buildFilter, reconstructAbstract, arxivIdFromWork, arxivIdFromInput, deTex, searchFreeText,
} from './openalex';

const ATOM = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom"
      xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">
  <opensearch:totalResults>1234</opensearch:totalResults>
  <entry>
    <id>http://arxiv.org/abs/2401.01234v2</id>
    <title>Tensor Network  Methods for
      Quantum Simulation</title>
    <summary>We propose a tensor network approach to quantum simulation.</summary>
    <published>2024-01-02T10:00:00Z</published>
    <updated>2024-02-03T10:00:00Z</updated>
    <author><name>Ada Lovelace</name></author>
    <author><name>Émile Borel</name><arxiv:affiliation>ENS</arxiv:affiliation></author>
    <arxiv:comment>12 pages, 4 figures</arxiv:comment>
    <arxiv:journal_ref>Phys. Rev. X 14, 011001 (2024)</arxiv:journal_ref>
    <arxiv:primary_category term="quant-ph"/>
    <category term="quant-ph"/>
    <category term="cs.LG"/>
    <link href="http://arxiv.org/abs/2401.01234v2" rel="alternate"/>
    <link title="pdf" href="http://arxiv.org/pdf/2401.01234v2" rel="related"/>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/2401.05555</id>
    <title>Unrelated Work on Beetles</title>
    <summary>A study of beetles in temperate climates.</summary>
    <published>2024-01-05T10:00:00Z</published>
    <updated>2024-01-05T10:00:00Z</updated>
    <author><name>Ada Lovelace</name></author>
    <arxiv:primary_category term="q-bio.PE"/>
    <category term="q-bio.PE"/>
  </entry>
</feed>`;

const topic = makeTopic({
    id: 't_1',
    name: 'Tensor Networks',
    terms: ['tensor network'],
    categories: ['quant-ph'],
    exclude: ['survey'],
});

describe('arxiv', () => {
    test('splitArxivId separates the version suffix', () => {
        expect(splitArxivId('http://arxiv.org/abs/2401.01234v2')).toEqual({ id: '2401.01234', version: 2 });
        expect(splitArxivId('http://arxiv.org/abs/2401.05555')).toEqual({ id: '2401.05555', version: 1 });
    });

    test('buildQuery composes fields, categories and exclusions', () => {
        const q = buildQuery(topic);
        expect(q).toContain('ti:"tensor network"');
        expect(q).toContain('abs:"tensor network"');
        expect(q).toContain('cat:quant-ph');
        expect(q).toContain('ANDNOT');
        expect(q).toContain('abs:"survey"');
    });

    test('buildQuery returns null when a topic has no criteria', () => {
        expect(buildQuery(makeTopic({ terms: [], categories: [], authors: [] }))).toBeNull();
    });

    test('parseFeed extracts the fields the UI depends on', () => {
        const { entries, total } = parseFeed(ATOM);
        expect(total).toBe(1234);
        expect(entries).toHaveLength(2);

        const [first] = entries;
        expect(first.id).toBe('2401.01234');
        expect(first.version).toBe(2);
        expect(first.title).toBe('Tensor Network Methods for Quantum Simulation');   // whitespace collapsed
        expect(first.authors.map((a) => a.name)).toEqual(['Ada Lovelace', 'Émile Borel']);
        expect(first.authors[1].affiliation).toBe('ENS');
        expect(first.categories).toEqual(['quant-ph', 'cs.LG']);
        expect(first.primary).toBe('quant-ph');
        expect(first.journalRef).toContain('Phys. Rev. X');
        expect(first.pdfUrl).toContain('/pdf/2401.01234');
    });
});

describe('scoring', () => {
    const papers = parseFeed(ATOM).entries.map((e) => ({ ...e, topicIds: ['t_1'], firstSeen: e.published }));

    test('a matching paper outscores an unrelated one', () => {
        const ctx = { topics: [topic], authors: {}, feedback: {} };
        const good = scorePaper(papers[0], ctx);
        const bad = scorePaper(papers[1], ctx);
        expect(good.score).toBeGreaterThan(bad.score);
        expect(good.matches).toContain('tensor network');
        expect(good.reasons.some((r) => r.kind === 'terms')).toBe(true);
    });

    test('following an author boosts their paper and says so', () => {
        const authors = { [authorKey('Ada Lovelace')]: { name: 'Ada Lovelace', followedAt: '2024-01-01' } };
        const plain = scorePaper(papers[1], { topics: [topic], authors: {}, feedback: {} });
        const boosted = scorePaper(papers[1], { topics: [topic], authors, feedback: {} });
        expect(boosted.score).toBeGreaterThan(plain.score);
        expect(boosted.reasons.some((r) => r.kind === 'author')).toBe(true);
    });

    test('learnFrom moves weights in the direction it is told', () => {
        const up = learnFrom({ terms: {} }, papers[0], 1);
        expect(up.terms.tensor).toBeGreaterThan(0);
        const down = learnFrom(up, papers[0], -1);
        expect(down.terms.tensor === undefined || down.terms.tensor <= up.terms.tensor).toBe(true);
    });

    test('similarity links the two tensor papers, not the beetles one', () => {
        const map = {
            a: { id: 'a', title: 'Tensor network states', summary: 'matrix product states for quantum systems' },
            b: { id: 'b', title: 'Tensor network algorithms', summary: 'matrix product states and quantum simulation' },
            c: { id: 'c', title: 'Beetle populations', summary: 'temperate climate beetle ecology survey' },
        };
        const index = buildIndex(map);
        const near = similarTo(index, 'a', map, 5);
        expect(near[0].id).toBe('b');
        expect(near.map((n) => n.id)).not.toContain('c');
    });

    test('coauthorGraph and authorStats roll authors up consistently', () => {
        const list = [
            { id: '1', authors: [{ name: 'Ada Lovelace' }, { name: 'Alan Turing' }], topicIds: ['t_1'], categories: ['cs.LG'], published: '2024-01-01' },
            { id: '2', authors: [{ name: 'Ada Lovelace' }], topicIds: ['t_1'], categories: ['cs.LG'], published: '2024-01-02' },
        ];
        const g = coauthorGraph(list, {}, { minPapers: 1 });
        expect(g.nodes).toHaveLength(2);
        expect(g.edges).toHaveLength(1);
        expect(g.edges[0].weight).toBe(1);

        const stats = authorStats(list.reduce((acc, p) => ({ ...acc, [p.id]: p }), {}), {});
        expect(stats[0].name).toBe('Ada Lovelace');
        expect(stats[0].count).toBe(2);
        expect(stats[0].coauthors).toContain('Alan Turing');
    });
});

describe('filters', () => {
    const papers = [
        { id: 'a', title: 'Tensor networks', summary: 'quantum', authors: [{ name: 'Ada Lovelace' }], categories: ['quant-ph'], primary: 'quant-ph', score: 40, published: '2024-01-02', firstSeen: '2024-01-02T00:00:00Z' },
        { id: 'b', title: 'Beetles', summary: 'ecology', authors: [{ name: 'Carl Linnaeus' }], categories: ['q-bio.PE'], primary: 'q-bio.PE', score: 5, published: '2024-01-03', firstSeen: '2024-01-03T00:00:00Z' },
    ];
    const states = { a: { status: 'unread', starred: true, tags: ['to-cite'] }, b: { status: 'unread', starred: false, tags: [] } };

    test('parseQuery understands fields, phrases and negation', () => {
        expect(parseQuery('au:lovelace ti:"tensor networks" -beetles')).toEqual([
            { negate: false, field: 'au', value: 'lovelace' },
            { negate: false, field: 'ti', value: 'tensor networks' },
            { negate: true, field: '', value: 'beetles' },
        ]);
    });

    test('field queries, negation and facets select the right paper', () => {
        const f = (patch) => applyFilters(papers, states, { ...DEFAULT_FILTERS, ...patch }).map((p) => p.id);
        expect(f({ query: 'au:lovelace' })).toEqual(['a']);
        expect(f({ query: '-beetles' })).toEqual(['a']);
        expect(f({ query: 'is:starred' })).toEqual(['a']);
        expect(f({ query: 'tag:to-cite' })).toEqual(['a']);
        expect(f({ categories: ['q-bio.PE'] })).toEqual(['b']);
        expect(f({ starredOnly: true })).toEqual(['a']);
        expect(f({ sort: 'newest' })).toEqual(['b', 'a']);
        expect(f({ sort: 'relevance' })).toEqual(['a', 'b']);
    });

    test('dismissed papers are hidden unless explicitly asked for', () => {
        const withDismissed = { ...states, a: { ...states.a, status: 'dismissed' } };
        expect(applyFilters(papers, withDismissed, DEFAULT_FILTERS).map((p) => p.id)).toEqual(['b']);
        expect(applyFilters(papers, withDismissed, { ...DEFAULT_FILTERS, statuses: ['dismissed'] }).map((p) => p.id))
            .toEqual(['a']);
    });

    test('groupByDay buckets on firstSeen, newest day first', () => {
        const groups = groupByDay(papers);
        expect(groups.map((g) => g.day)).toEqual(['2024-01-03', '2024-01-02']);
        expect(groups[0].papers.map((p) => p.id)).toEqual(['b']);
    });
});

describe('export', () => {
    const paper = parseFeed(ATOM).entries[0];

    test('citeKey is stable and readable', () => {
        expect(citeKey(paper)).toBe('lovelace2024tensor');
    });

    test('BibTeX carries the arXiv identifiers and escapes TeX specials', () => {
        const bib = toBibtex(paper);
        expect(bib).toContain('@article{lovelace2024tensor,');
        expect(bib).toContain('eprint = {2401.01234}');
        expect(bib).toContain('archivePrefix = {arXiv}');
        expect(bib).toContain('author = {Ada Lovelace and Émile Borel}');
        expect(toBibtex({ ...paper, title: 'Cost & Scale_1' })).toContain('Cost \\& Scale\\_1');
    });

    test('CSV quotes fields containing separators', () => {
        const csv = toCsv([paper], { [paper.id]: { status: 'read', starred: true, tags: ['a'], note: 'has, comma' } });
        expect(csv.split('\n')).toHaveLength(2);
        expect(csv).toContain('"has, comma"');
    });
});

describe('storage', () => {
    test('authorKey folds case, accents and punctuation but keeps distinct people apart', () => {
        expect(authorKey('Émile  Borel')).toBe(authorKey('emile borel'));
        expect(authorKey('Y. LeCun')).not.toBe(authorKey('Yann LeCun'));
    });

    test('merge keeps local reading state and unions topic membership', () => {
        const local = {
            ...emptyStore(),
            papers: { a: { id: 'a', title: 'A', topicIds: ['t_1'], firstSeen: '2024-01-01T00:00:00Z' } },
            states: { a: { status: 'read', starred: true, tags: [], note: 'mine', updatedAt: 2000 } },
        };
        const incoming = {
            ...emptyStore(),
            papers: {
                a: { id: 'a', title: 'A', topicIds: ['t_2'], firstSeen: '2023-01-01T00:00:00Z' },
                b: { id: 'b', title: 'B', topicIds: ['t_2'], firstSeen: '2023-01-02T00:00:00Z' },
            },
            states: { a: { status: 'unread', starred: false, tags: [], note: 'theirs', updatedAt: 1000 } },
        };
        const merged = mergeStores(local, incoming, 'merge');
        expect(Object.keys(merged.papers).sort()).toEqual(['a', 'b']);
        expect(merged.papers.a.topicIds.sort()).toEqual(['t_1', 't_2']);
        expect(merged.states.a.note).toBe('mine');          // newer updatedAt wins
    });

    test('replace mode discards the local store', () => {
        const local = { ...emptyStore(), papers: { a: { id: 'a' } } };
        const incoming = { ...emptyStore(), papers: { b: { id: 'b' } } };
        expect(Object.keys(mergeStores(local, incoming, 'replace').papers)).toEqual(['b']);
    });

    test('prune drops stale untouched papers but never annotated ones', () => {
        const old = new Date(Date.now() - 400 * 864e5).toISOString();
        const store = {
            ...emptyStore(),
            papers: {
                stale: { id: 'stale', firstSeen: old },
                kept: { id: 'kept', firstSeen: old },
                fresh: { id: 'fresh', firstSeen: new Date().toISOString() },
            },
            states: { kept: { status: 'unread', starred: true, tags: [], note: '' } },
        };
        const { store: pruned, removed } = prune(store, { days: 90 });
        expect(removed).toBe(1);
        expect(Object.keys(pruned.papers).sort()).toEqual(['fresh', 'kept']);
    });
});

describe('the API key', () => {
    /* Module state (the in-memory key) has to be fresh for each case. */
    const load = () => { jest.resetModules(); return require('./llm'); };
    const config = { provider: 'anthropic', model: 'claude-sonnet-5' };
    const ok = (text) => ({
        ok: true, status: 200,
        json: async () => ({ content: [{ text }] }),
        text: async () => JSON.stringify({ content: [{ text }] }),
    });

    beforeEach(() => { localStorage.clear(); });
    afterEach(() => { delete global.fetch; localStorage.clear(); });

    test('"remember" decides whether anything is written to disk at all', () => {
        const { saveKey, loadKey, keyIsRemembered, forgetKey } = load();

        saveKey('sk-ant-secret', { remember: false });
        expect(loadKey()).toBe('sk-ant-secret');          // usable this session
        expect(keyIsRemembered()).toBe(false);            // but nothing persisted
        expect(localStorage.getItem('paper-radar:llm')).toBeNull();

        saveKey('sk-ant-secret', { remember: true });
        expect(keyIsRemembered()).toBe(true);
        forgetKey();
        expect(localStorage.getItem('paper-radar:llm')).toBeNull();
        expect(loadKey()).toBe('');
    });

    test('it is stored apart from the library, so an export cannot carry it', () => {
        const { saveKey } = load();
        saveKey('sk-ant-secret', { remember: true });

        // The exported store is built from the library alone; the key lives under
        // its own roof and is never merged in.
        const exported = JSON.stringify(emptyStore());
        expect(exported).not.toContain('sk-ant-secret');
        expect(Object.keys(emptyStore())).not.toContain('llmKey');
        expect(localStorage.getItem('paper-radar:llm')).toBe('sk-ant-secret');
    });

    test('an importable store cannot smuggle a key in', () => {
        const { loadKey } = load();
        // Whatever an imported file claims, the key is not read from the store.
        const merged = mergeStores(emptyStore(), { ...emptyStore(), llmKey: 'sk-ant-evil' });
        expect(JSON.stringify(merged)).not.toContain('sk-ant-evil');
        expect(loadKey()).toBe('');
    });

    test('Anthropic is called with the header that makes browser use deliberate', async () => {
        const { saveKey, complete } = load();
        saveKey('sk-ant-secret', { remember: false });
        global.fetch = jest.fn().mockResolvedValue(ok('hello'));

        await complete({ config, system: 's', prompt: 'p' });
        const [url, init] = global.fetch.mock.calls[0];
        expect(url).toBe('https://api.anthropic.com/v1/messages');
        expect(init.headers['x-api-key']).toBe('sk-ant-secret');
        expect(init.headers['anthropic-dangerous-direct-browser-access']).toBe('true');
        // The key belongs in the header, never in the body.
        expect(init.body).not.toContain('sk-ant-secret');
    });

    test('with a proxy set, no key leaves the browser', async () => {
        const { saveKey, complete } = load();
        saveKey('sk-ant-secret', { remember: false });
        global.fetch = jest.fn().mockResolvedValue(ok('hello'));

        await complete({ config: { ...config, proxyUrl: 'https://llm.example.workers.dev' }, system: 's', prompt: 'p' });
        const [url, init] = global.fetch.mock.calls[0];
        expect(url).toBe('https://llm.example.workers.dev');
        expect(JSON.stringify(init.headers)).not.toContain('sk-ant-secret');
        expect(init.body).not.toContain('sk-ant-secret');
    });

    test('a provider that echoes the request back cannot echo the key onto a screen', async () => {
        const { saveKey, complete } = load();
        saveKey('sk-ant-secret', { remember: false });
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 400,
            text: async () => 'Bad request for key sk-ant-secret in header',
        });

        await expect(complete({ config, system: 's', prompt: 'p' }))
            .rejects.toThrow(/«your key»/);
        await expect(complete({ config, system: 's', prompt: 'p' }))
            .rejects.not.toThrow(/sk-ant-secret/);
    });

    test('asking with no key at all says so rather than calling anyone', async () => {
        const { complete } = load();
        global.fetch = jest.fn();
        await expect(complete({ config, system: 's', prompt: 'p' })).rejects.toThrow(/No API key/);
        expect(global.fetch).not.toHaveBeenCalled();
    });
});

describe('explanations', () => {
    const paper = {
        id: '2207.08683',
        title: 'Limit Theorems for Entropic Optimal Transport Maps',
        summary: 'We study limit theorems for EOT maps and the Sinkhorn divergence.',
        authors: [{ name: 'Ziv Goldfeld' }, { name: 'Kengo Kato' }],
        categories: ['math.ST', 'math.PR'],
        published: '2022-07-18T00:00:00Z',
    };

    test('the model is given the paper and told not to go beyond it', () => {
        const { system, prompt } = buildPrompt(paper, levelById('deep'));
        expect(prompt).toContain(paper.title);
        expect(prompt).toContain(paper.summary);
        expect(prompt).toContain('2207.08683');
        expect(prompt).toContain('math.ST');
        // The guard against inventing results it was never shown.
        expect(system).toMatch(/not its full text/);
        expect(system).toMatch(/rather than inventing/);
        // And the maths has to come back as KaTeX, or the deep level is pointless.
        expect(system).toMatch(/\$\$/);
    });

    test('each level asks for something different', () => {
        expect(LEVELS.map((l) => l.id)).toEqual(['gist', 'brief', 'deep']);
        const budgets = LEVELS.map((l) => l.maxTokens);
        expect(budgets).toEqual([...budgets].sort((a, b) => a - b));
        expect(levelById('gist').instruction).toMatch(/three short sentences/);
        expect(levelById('nonsense').id).toBe('gist');
    });

    test('a note carries enough to make sense somewhere else', () => {
        const note = { level: 'brief', text: 'It proves a CLT.', model: 'claude-sonnet-5', at: '2026-09-03' };
        const md = noteMarkdown(paper, note);
        expect(md).toContain(`# ${paper.title}`);
        expect(md).toContain('Ziv Goldfeld, Kengo Kato');
        expect(md).toContain('https://arxiv.org/abs/2207.08683');
        expect(md).toContain('It proves a CLT.');
        // Whoever receives it should know a model wrote it.
        expect(md).toMatch(/Generated with claude-sonnet-5/);
    });

    test('share links carry the note and stay inside what a URL can hold', () => {
        const long = { level: 'deep', text: 'x'.repeat(6000), model: 'm', at: '2026-09-03' };
        const { mailto, whatsapp, filename, markdown } = shareTargets(paper, long);

        expect(filename).toBe('2207.08683-deep.md');
        expect(markdown).toContain('x'.repeat(100));          // the file keeps everything
        expect(mailto.startsWith('mailto:?subject=')).toBe(true);
        expect(whatsapp.startsWith('https://wa.me/?text=')).toBe(true);
        // Both are truncated rather than producing a URL nothing will open.
        expect(decodeURIComponent(mailto)).toMatch(/truncated/);
        expect(decodeURIComponent(whatsapp)).toMatch(/truncated/);
        expect(whatsapp.length).toBeLessThan(8000);
    });
});

describe('ranking search results', () => {
    const paper = (title, over = {}) => ({ title, summary: '', authors: [], ...over });

    test('the title you typed beats everything that merely echoes it', () => {
        const q = 'Attention Is All You Need';
        const exact = matchScore(paper('Attention Is All You Need'), q);
        const echo = matchScore(paper('Attention is All You Need to Defend Against Prompt Injection'), q);
        const loose = matchScore(paper('On the need for attention in all sparse models'), q);
        expect(exact).toBeGreaterThan(echo);
        expect(echo).toBeGreaterThan(loose);
    });

    test('a paper matching in the abstract ranks under one matching in the title', () => {
        const q = 'rough volatility';
        const inTitle = matchScore(paper('Deep Hedging under Rough Volatility'), q);
        const inAbstract = matchScore(paper('A note on hedging', { summary: 'We assume rough volatility.' }), q);
        expect(inTitle).toBeGreaterThan(inAbstract);
        expect(inAbstract).toBeGreaterThan(0);
    });

    test('nothing in common scores nothing, whatever the source', () => {
        expect(matchScore(paper('Ricci flow on surfaces'), 'limit order book')).toBe(0);
        expect(matchScore(paper(''), 'anything')).toBe(0);
    });
});

describe('the lookup chain behind "+ Add"', () => {
    const held = {
        '2207.08683': {
            id: '2207.08683',
            title: 'Limit Theorems for Entropic Optimal Transport Maps',
            authors: [{ name: 'Ziv Goldfeld' }, { name: 'Kengo Kato' }],
        },
    };
    const found = (id, title) => ({ entries: [{ id, title }], total: 1, exact: false, skipped: 0 });
    const empty = { entries: [], total: 0, exact: false, skipped: 0 };

    /** Each case gets the chain with its two live sources stubbed. */
    const load = (dataCite, openAlex) => {
        jest.resetModules();
        jest.doMock('./datacite', () => ({
            ...jest.requireActual('./datacite'),
            searchFreeText: dataCite,
        }));
        jest.doMock('./openalex', () => ({
            ...jest.requireActual('./openalex'),
            searchFreeText: openAlex,
        }));
        // eslint-disable-next-line global-require
        return require('./lookup');
    };

    // doMock outlives resetModules, so the stubs have to be taken back down or
    // every later suite that requires these modules gets them hollowed out.
    afterEach(() => {
        jest.dontMock('./datacite');
        jest.dontMock('./openalex');
        jest.resetModules();
    });

    test('the library answers first, and for free', () => {
        // eslint-disable-next-line global-require
        const { searchLibrary } = require('./lookup');
        expect(searchLibrary(held, 'entropic optimal transport')[0].id).toBe('2207.08683');
        expect(searchLibrary(held, 'goldfeld')[0].id).toBe('2207.08683');
        expect(searchLibrary(held, 'arxiv.org/abs/2207.08683')[0].id).toBe('2207.08683');
        expect(searchLibrary(held, 'rough volatility')).toEqual([]);
    });

    test('DataCite answering means OpenAlex is never asked', async () => {
        const openAlex = jest.fn();
        const { lookup } = load(jest.fn().mockResolvedValue(found('1706.03762', 'Attention Is All You Need')), openAlex);

        const out = await lookup('attention is all you need', { papers: {} });
        expect(out.entries.map((e) => e.id)).toEqual(['1706.03762']);
        expect(out.source).toBe('DataCite');
        expect(openAlex).not.toHaveBeenCalled();
    });

    test('an empty DataCite answer is worth one look at the wider index', async () => {
        const openAlex = jest.fn().mockResolvedValue(found('9901.00001', 'Something older'));
        const { lookup } = load(jest.fn().mockResolvedValue(empty), openAlex);

        const out = await lookup('something older', { papers: {} });
        expect(out.entries.map((e) => e.id)).toEqual(['9901.00001']);
        expect(out.source).toBe('OpenAlex');
        expect(openAlex).toHaveBeenCalledTimes(1);
    });

    test('a spent OpenAlex cannot break a search DataCite can answer', async () => {
        const spent = jest.fn().mockRejectedValue(new Error("OpenAlex's free allowance of 1000 requests a day is spent."));
        const { lookup } = load(jest.fn().mockResolvedValue(found('2609.00001', 'A new preprint')), spent);

        const out = await lookup('a new preprint', { papers: {} });
        expect(out.entries).toHaveLength(1);
        expect(spent).not.toHaveBeenCalled();
    });

    test('when both refuse, the first refusal is the one reported', async () => {
        const { lookup } = load(
            jest.fn().mockRejectedValue(new Error('DataCite returned HTTP 503')),
            jest.fn().mockRejectedValue(new Error('OpenAlex allowance spent')),
        );
        await expect(lookup('anything', { papers: {} })).rejects.toThrow(/DataCite returned HTTP 503/);
    });

    test('what you already have is listed first and never listed twice', async () => {
        const { lookup } = load(
            jest.fn().mockResolvedValue({
                entries: [{ id: '2207.08683', title: 'Limit Theorems' }, { id: '2609.00002', title: 'A different one' }],
                total: 2, exact: false, skipped: 0,
            }),
            jest.fn(),
        );

        const out = await lookup('entropic optimal transport', { papers: held });
        expect(out.entries.map((e) => e.id)).toEqual(['2207.08683', '2609.00002']);
        expect(out.held).toBe(1);
    });
});

describe('the prefetched feed', () => {
    const paper = (over = {}) => ({
        id: '2609.00001',
        title: 'Entropic Optimal Transport on Graphs',
        summary: 'We study Sinkhorn iterations.',
        authors: [{ name: 'Gabriel Peyré' }],
        categories: ['math.OC', 'stat.ML'],
        ...over,
    });
    const topic = (over = {}) => makeTopic({
        id: 't_ot', terms: ['optimal transport'], categories: ['math.OC'], ...over,
    });

    test('a topic claims a paper only if the words and the category both agree', () => {
        expect(matchesTopic(paper(), topic())).toBe(true);
        // Right words, wrong section of arXiv.
        expect(matchesTopic(paper({ categories: ['q-bio.NC'] }), topic())).toBe(false);
        // Right section, nothing to do with the topic.
        expect(matchesTopic(paper({ title: 'A note on lattices', summary: 'Nothing here.' }), topic())).toBe(false);
    });

    test('an exclusion beats a match, and a disabled topic claims nothing', () => {
        expect(matchesTopic(paper(), topic({ exclude: ['sinkhorn'] }))).toBe(false);
        expect(matchesTopic(paper(), topic({ enabled: false }))).toBe(false);
    });

    test('punctuation does not decide whether a paper matches', () => {
        // arXiv's own search tokenises, so these have to agree with each other.
        const gw = topic({ terms: ['gromov-wasserstein'], categories: [] });
        expect(matchesTopic(paper({ title: 'Gromov Wasserstein barycentres' }), gw)).toBe(true);
        expect(matchesTopic(paper({ title: 'On Gromov–Wasserstein distances' }), gw)).toBe(true);
    });

    test('an author topic reads the author list', () => {
        const byName = topic({ terms: [], categories: [], authors: ['peyré'] });
        expect(matchesTopic(paper(), byName)).toBe(true);
        expect(matchesTopic(paper({ authors: [{ name: 'Ada Lovelace' }] }), byName)).toBe(false);
    });

    test('one paper can answer two topics, and unclaimed papers are dropped', () => {
        const topics = [
            topic(),
            makeTopic({ id: 't_ml', terms: ['sinkhorn'], categories: ['stat.ML'] }),
            makeTopic({ id: 't_fin', terms: ['rough volatility'], categories: ['q-fin.MF'] }),
        ];
        const { byTopic, matched, seen } = sortIntoTopics(
            [paper(), paper({ id: '2609.00002', title: 'Unrelated', summary: 'No.', categories: ['cs.CV'] })],
            topics,
        );
        expect(byTopic.get('t_ot')).toHaveLength(1);
        expect(byTopic.get('t_ml')).toHaveLength(1);
        expect(byTopic.get('t_fin')).toHaveLength(0);
        expect({ matched, seen }).toEqual({ matched: 1, seen: 2 });
    });

    test('the CI config carries exactly what a query needs', () => {
        const config = feedConfig([topic({ name: 'Optimal Transport' })]);
        expect(config).toMatchObject({ days: 7, maxPerTopic: 200 });
        expect(config.topics[0]).toMatchObject({
            id: 't_ot', name: 'Optimal Transport', terms: ['optimal transport'],
            categories: ['math.OC'], enabled: true,
        });
    });
});

describe('openalex', () => {
    test('reconstructs an abstract from the inverted index', () => {
        const idx = { We: [0], propose: [1], a: [2], method: [3], 'here.': [4] };
        expect(reconstructAbstract(idx)).toBe('We propose a method here.');
        expect(reconstructAbstract(null)).toBe('');
    });

    test('recovers the arXiv id from the DOI or the landing page', () => {
        expect(arxivIdFromWork({ doi: 'https://doi.org/10.48550/arxiv.2608.28262' })).toBe('2608.28262');
        expect(arxivIdFromWork({ doi: 'https://doi.org/10.48550/arXiv.2501.01234v2' })).toBe('2501.01234');
        expect(arxivIdFromWork({
            doi: null,
            primary_location: { landing_page_url: 'https://arxiv.org/abs/2401.05555' },
        })).toBe('2401.05555');
        // A non-arXiv work has no id we can key on and must be skipped.
        expect(arxivIdFromWork({ doi: 'https://doi.org/10.1000/other' })).toBeNull();
    });

    test('finds the preprint even when the journal is the primary location', () => {
        // The best-known papers are exactly the ones that were later published,
        // so refusing to look past primary_location would hide them.
        expect(arxivIdFromWork({
            doi: 'https://doi.org/10.1109/some.conference',
            primary_location: { landing_page_url: 'https://ieeexplore.ieee.org/x' },
            locations: [
                { landing_page_url: 'https://ieeexplore.ieee.org/x' },
                { landing_page_url: 'http://arxiv.org/abs/1706.03762', pdf_url: null },
            ],
        })).toBe('1706.03762');
    });

    test('reads an arXiv id out of whatever was pasted', () => {
        expect(arxivIdFromInput('2301.12345')).toBe('2301.12345');
        expect(arxivIdFromInput('arXiv:2301.12345v3')).toBe('2301.12345');
        expect(arxivIdFromInput('https://arxiv.org/abs/1706.03762')).toBe('1706.03762');
        expect(arxivIdFromInput('https://arxiv.org/pdf/math/0211159')).toBe('math/0211159');
        expect(arxivIdFromInput('entropic optimal transport')).toBeNull();
    });

    test('puts arXiv LaTeX back into readable text', () => {
        expect(deTex(String.raw`Sinkhorn\n Divergences`)).toBe('Sinkhorn Divergences');
        expect(deTex(String.raw`S\'ejourn\'e`)).toBe('Séjourné');
        expect(deTex(String.raw`Fran\c{c}ois-Xavier`)).toBe('François-Xavier');
        expect(deTex('Harnack and $W$-entropy')).toBe('Harnack and W-entropy');
        // An unknown command keeps its name rather than leaving a hole.
        expect(deTex(String.raw`$\alpha$-divergence`)).toBe('alpha-divergence');
        expect(deTex('An ordinary title')).toBe('An ordinary title');
    });

    describe('the daily allowance', () => {
        /* OpenAlex bills per request against a daily budget, so the module holds
           state about it; each test gets its own copy of the module. */
        const load = () => { jest.resetModules(); return require('./openalex'); };

        const reply = (status, { retryAfter, remaining, limit = 1000, body = {} } = {}) => {
            const headers = {
                'retry-after': retryAfter == null ? null : String(retryAfter),
                'x-ratelimit-limit': String(limit),
                'x-ratelimit-remaining': remaining == null ? null : String(remaining),
                'x-ratelimit-reset': retryAfter == null ? null : String(retryAfter),
            };
            return {
                status,
                ok: status >= 200 && status < 300,
                headers: { get: (h) => headers[h.toLowerCase()] ?? null },
                json: async () => body,
            };
        };
        const found = {
            results: [{
                doi: 'https://doi.org/10.48550/arxiv.2401.00001',
                title: 'A paper',
                publication_date: '2024-01-01',
                authorships: [],
                cited_by_count: 3,
                primary_location: { landing_page_url: 'http://arxiv.org/abs/2401.00001' },
            }],
            meta: { count: 1 },
        };

        afterEach(() => { delete global.fetch; });

        test('a brief throttle is waited out rather than shown to anyone', async () => {
            const { searchFreeText } = load();
            global.fetch = jest.fn()
                .mockResolvedValueOnce(reply(429, { retryAfter: 0.001 }))
                .mockResolvedValue(reply(200, { body: found, remaining: 900 }));

            const { entries } = await searchFreeText('2401.00001');
            expect(entries).toHaveLength(1);
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });

        test('a spent allowance is reported at once, not retried for nine hours', async () => {
            const { searchFreeText } = load();
            // What OpenAlex actually sends: retry at midnight UTC.
            global.fetch = jest.fn().mockResolvedValue(reply(429, { retryAfter: 32206, remaining: 0 }));

            await expect(searchFreeText('2401.00001')).rejects.toThrow(/allowance of 1000 requests a day is spent/);
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        test('once it is spent, later calls cost nothing at all', async () => {
            const { searchFreeText, getBudget } = load();
            global.fetch = jest.fn().mockResolvedValue(reply(429, { retryAfter: 32206, remaining: 0 }));

            await expect(searchFreeText('2401.00001')).rejects.toThrow(/resets at midnight UTC/);
            await expect(searchFreeText('something else')).rejects.toThrow(/resets at midnight UTC/);
            await expect(searchFreeText('a third thing')).rejects.toThrow(/resets at midnight UTC/);
            // Only the first one ever reached the network.
            expect(global.fetch).toHaveBeenCalledTimes(1);
            expect(getBudget().blocked).toBe(true);
        });

        test('what is left of the allowance is read off every response', async () => {
            const { searchFreeText, getBudget, humanWait } = load();
            global.fetch = jest.fn().mockResolvedValue(reply(200, { body: found, remaining: 42, retryAfter: 3600 }));

            await searchFreeText('2401.00001');
            const budget = getBudget();
            expect(budget).toMatchObject({ limit: 1000, remaining: 42, blocked: false });
            expect(humanWait(budget.resetAt - Date.now())).toMatch(/^(59m|1h 0m)$/);
        });

        test('an ordinary search spends one request, not three', async () => {
            const { searchFreeText } = load();
            const many = { results: new Array(8).fill(found.results[0]).map((w, i) => ({
                ...w,
                doi: `https://doi.org/10.48550/arxiv.2401.0000${i}`,
                primary_location: { landing_page_url: `http://arxiv.org/abs/2401.0000${i}` },
            })), meta: { count: 8 } };
            global.fetch = jest.fn().mockResolvedValue(reply(200, { body: many, remaining: 900 }));

            const { entries } = await searchFreeText('optimal transport');
            expect(entries.length).toBeGreaterThanOrEqual(5);
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        test('a thin first pass is worth two more questions', async () => {
            const { searchFreeText } = load();
            global.fetch = jest.fn().mockResolvedValue(reply(200, { body: { results: [], meta: { count: 0 } }, remaining: 900 }));

            await searchFreeText('yang song diffusion');
            expect(global.fetch).toHaveBeenCalledTimes(3);
        });

        test('a real failure is still a failure', async () => {
            const { searchFreeText } = load();
            global.fetch = jest.fn().mockResolvedValue(reply(500));
            await expect(searchFreeText('2401.00001')).rejects.toThrow(/HTTP 500/);
        });
    });

    test('builds a filter scoped to arXiv with OR-ed phrases and exclusions', () => {
        const { filter, ignoredCategories } = buildFilter(makeTopic({
            terms: ['optimal transport', 'wasserstein'],
            exclude: ['survey'],
            categories: ['math.OC'],
        }), { sinceDays: 30 });

        expect(filter).toContain('primary_location.source.id:s4306400194');
        expect(filter).toContain('title_and_abstract.search:"optimal transport" OR "wasserstein"');
        expect(filter).toContain('NOT "survey"');
        expect(filter).toMatch(/from_publication_date:\d{4}-\d{2}-\d{2}/);
        // Categories cannot be expressed against OpenAlex, so they are reported, not dropped silently.
        expect(filter).not.toContain('math.OC');
        expect(ignoredCategories).toEqual(['math.OC']);
    });

    test('a category-only topic yields no filter, so the caller can explain why', () => {
        const { filter, ignoredCategories } = buildFilter(makeTopic({ terms: [], categories: ['q-fin.MF'] }));
        expect(filter).toBeNull();
        expect(ignoredCategories).toEqual(['q-fin.MF']);
    });
});

describe('folders', () => {
    //  research/
    //    ├── optimal-transport/
    //    │     └── sinkhorn/
    //    └── finance/
    const folders = [
        makeFolder({ id: 'f_root', name: 'research' }),
        makeFolder({ id: 'f_ot', name: 'optimal-transport', parentId: 'f_root', paperIds: ['a'] }),
        makeFolder({ id: 'f_sink', name: 'sinkhorn', parentId: 'f_ot', paperIds: ['b', 'c'] }),
        makeFolder({ id: 'f_fin', name: 'finance', parentId: 'f_root', paperIds: ['d'] }),
    ];

    test('folderPath walks from the root down', () => {
        expect(folderPath(folders, 'f_sink').map((f) => f.name))
            .toEqual(['research', 'optimal-transport', 'sinkhorn']);
    });

    test('folderSubtree collects descendants', () => {
        expect(folderSubtree(folders, 'f_ot').sort()).toEqual(['f_ot', 'f_sink']);
        expect(folderSubtree(folders, 'f_sink')).toEqual(['f_sink']);
    });

    test('papersInFolder rolls up subfolders unless told otherwise', () => {
        expect([...papersInFolder(folders, 'f_ot')].sort()).toEqual(['a', 'b', 'c']);
        expect([...papersInFolder(folders, 'f_ot', { recursive: false })]).toEqual(['a']);
        expect([...papersInFolder(folders, 'f_root')].sort()).toEqual(['a', 'b', 'c', 'd']);
    });

    test('a folder cannot be moved inside its own subtree', () => {
        expect(canMoveFolder(folders, 'f_ot', 'f_sink')).toBe(false);   // would cycle
        expect(canMoveFolder(folders, 'f_ot', 'f_ot')).toBe(false);
        expect(canMoveFolder(folders, 'f_ot', 'f_fin')).toBe(true);
        expect(canMoveFolder(folders, 'f_ot', null)).toBe(true);        // to the root
    });

    test('v1 collections migrate into root-level folders', () => {
        const v1 = { ...emptyStore(), collections: [{ id: 'c1', name: 'Seminar', paperIds: ['x'] }] };
        delete v1.folders;
        const merged = mergeStores(emptyStore(), v1, 'replace');
        expect(merged.folders).toHaveLength(1);
        expect(merged.folders[0].name).toBe('Seminar');
        expect(merged.folders[0].parentId).toBeNull();
        expect(merged.folders[0].paperIds).toEqual(['x']);
        expect(merged.collections).toBeUndefined();
    });
});
