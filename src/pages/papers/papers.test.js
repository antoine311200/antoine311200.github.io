import { buildQuery, parseFeed, splitArxivId } from './arxiv';
import { scorePaper, learnFrom, buildIndex, similarTo, coauthorGraph, authorStats } from './scoring';
import { parseQuery, applyFilters, groupByDay, DEFAULT_FILTERS } from './filters';
import { toBibtex, citeKey, toCsv } from './bibtex';
import {
    mergeStores, emptyStore, authorKey, prune, makeTopic, makeFolder,
    folderPath, folderSubtree, papersInFolder, canMoveFolder,
} from './storage';
import { buildFilter, reconstructAbstract, arxivIdFromWork } from './openalex';

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
