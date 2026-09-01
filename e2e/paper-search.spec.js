const { test, expect } = require('@playwright/test');
const {
    makeTopic, makePaper, makeStore, seed, readStore, clearStorage, stubOpenAlex, onQuietPage,
} = require('./fixtures');

const nav = (page) => page.getByRole('navigation');
const goTo = (page, label) => nav(page).getByRole('button', { name: new RegExp(`\\b${label}\\b`) }).click();

/** A library with 3 topics and 12 papers spread across them. */
function seededStore() {
    const topics = [
        makeTopic({ id: 't_ot', name: 'Optimal Transport', color: '#fb923c' }),
        makeTopic({ id: 't_dif', name: 'Diffusion', color: '#a78bfa' }),
        makeTopic({ id: 't_sde', name: 'SDEs', color: '#34d399' }),
    ];
    const papers = {};
    const states = {};
    for (let i = 0; i < 12; i += 1) {
        const p = makePaper(i, { topicIds: [topics[i % 3].id] });
        papers[p.id] = p;
        states[p.id] = {
            status: 'unread', starred: false, tags: [], note: '',
            rating: 0, readAt: null, queuedAt: null, updatedAt: Date.now(),
        };
    }
    return makeStore({ topics, papers, states });
}

test.beforeEach(async ({ page }) => {
    await clearStorage(page);
});

/* ------------------------------------------------------------------ fetching */

test.describe('fetching', () => {
    test('a fetch ingests papers, and fetching again adds nothing new', async ({ page }) => {
        const works = [
            { arxivId: '2608.11111', title: 'First optimal transport paper' },
            { arxivId: '2608.22222', title: 'Second optimal transport paper' },
        ];
        const calls = await stubOpenAlex(page, works);
        await seed(page, makeStore({ topics: [makeTopic({ id: 't_ot', name: 'Optimal Transport' })] }));

        await page.getByRole('button', { name: 'Fetch new papers' }).click();
        await expect(page.getByText('First optimal transport paper')).toBeVisible();
        await expect(page.getByText('Second optimal transport paper')).toBeVisible();
        expect(calls.count).toBe(1);

        const afterFirst = await readStore(page);
        expect(Object.keys(afterFirst.papers).sort()).toEqual(['2608.11111', '2608.22222']);
        const firstSeen = afterFirst.papers['2608.11111'].firstSeen;

        // Second run returns the same works: the API is hit, nothing new is stored,
        // and firstSeen must not move — that is what keeps past days stable.
        await page.getByRole('button', { name: 'Fetch new papers' }).click();
        await expect(page.getByText('No new papers')).toBeVisible();
        expect(calls.count).toBe(2);

        const afterSecond = await readStore(page);
        expect(Object.keys(afterSecond.papers)).toHaveLength(2);
        expect(afterSecond.papers['2608.11111'].firstSeen).toBe(firstSeen);
    });

    test('a paper matching two topics is stored once but listed under both', async ({ page }) => {
        await stubOpenAlex(page, [{ arxivId: '2608.33333', title: 'Shared across topics' }]);
        await seed(page, makeStore({
            topics: [makeTopic({ id: 't_a', name: 'Alpha' }), makeTopic({ id: 't_b', name: 'Beta' })],
        }));

        await page.getByRole('button', { name: 'Fetch new papers' }).click();
        await expect(page.getByText('1 new paper', { exact: true })).toBeVisible();

        const store = await readStore(page);
        expect(Object.keys(store.papers)).toHaveLength(1);
        expect(store.papers['2608.33333'].topicIds.sort()).toEqual(['t_a', 't_b']);

        // Grouped by topic, it renders under each heading.
        await expect(page.getByTestId('group-heading')).toHaveText(['Alpha', 'Beta']);
        await expect(page.getByText('Shared across topics')).toHaveCount(2);
    });

    test('a failing source surfaces an actionable error', async ({ page }) => {
        await page.route('**/api.openalex.org/**', (r) => r.abort('failed'));
        await seed(page, makeStore({ topics: [makeTopic({ name: 'Optimal Transport' })] }));

        await page.getByRole('button', { name: 'Fetch new papers' }).click();
        await expect(page.getByText(/Every topic failed/)).toBeVisible();
        await expect(page.getByText(/switch the source in Settings/)).toBeVisible();
    });
});

/* ------------------------------------------------------------------ grouping */

test.describe('grouping', () => {
    test('defaults to topic and switches to day and back', async ({ page }) => {
        await seed(page, seededStore());

        const grouper = page.getByTitle('Group papers by');
        await expect(grouper).toHaveValue('topic');
        await expect(page.getByTestId('group-heading')).toHaveText(['Optimal Transport', 'Diffusion', 'SDEs']);

        await grouper.selectOption('day');
        await expect(page.getByTestId('group-heading').first()).toHaveText('Today');

        await grouper.selectOption('none');
        await expect(page.getByTestId('group-heading')).toHaveCount(0);
    });

    test('"mark all read" applies to that group only', async ({ page }) => {
        await seed(page, seededStore());

        const otHeading = page.getByTestId('group-heading').filter({ hasText: 'Optimal Transport' });
        await expect(otHeading).toBeVisible();
        await otHeading.locator('..').getByText('mark all read').click();

        const store = await readStore(page);
        const otIds = Object.values(store.papers).filter((p) => p.topicIds.includes('t_ot')).map((p) => p.id);
        const otherIds = Object.values(store.papers).filter((p) => !p.topicIds.includes('t_ot')).map((p) => p.id);
        expect(otIds.length).toBeGreaterThan(0);
        otIds.forEach((id) => expect(store.states[id].status).toBe('read'));
        otherIds.forEach((id) => expect(store.states[id].status).toBe('unread'));
    });
});

/* ------------------------------------------------------------------- folders */

test.describe('folders', () => {
    test('creating a folder from a selection files those papers and survives a reload', async ({ page }) => {
        await seed(page, seededStore());

        // Select the first two cards via their checkboxes.
        const boxes = page.getByRole('checkbox', { name: 'Select paper' });
        await boxes.nth(0).check();
        await boxes.nth(1).check();
        await expect(page.getByText('2 selected')).toBeVisible();

        await page.getByRole('button', { name: 'Add to folder…' }).click();
        await page.getByPlaceholder('…or type a new folder name').fill('Chapter 2');
        await page.getByRole('button', { name: 'Create', exact: true }).click();

        const store = await readStore(page);
        expect(store.folders).toHaveLength(1);
        expect(store.folders[0].name).toBe('Chapter 2');
        expect(store.folders[0].paperIds).toHaveLength(2);

        // The folder is still there after a reload — it came back from IndexedDB.
        await page.reload({ waitUntil: 'domcontentloaded' });
        await goTo(page, 'Folders');
        await expect(page.getByTestId(`folder-node-${store.folders[0].id}`)).toContainText('Chapter 2');
        await page.getByTestId(`folder-node-${store.folders[0].id}`).click();
        await expect(page.getByRole('heading', { name: 'Chapter 2' })).toBeVisible();
        await expect(page.locator('article')).toHaveCount(2);
    });

    test('subfolder counts roll up into the parent', async ({ page }) => {
        const store = seededStore();
        const ids = Object.keys(store.papers);
        store.folders = [
            { id: 'f_root', name: 'Thesis', parentId: null, paperIds: [], description: '', color: null, createdAt: new Date().toISOString() },
            { id: 'f_kid', name: 'Chapter 1', parentId: 'f_root', paperIds: ids.slice(0, 3), description: '', color: null, createdAt: new Date().toISOString() },
        ];
        await seed(page, store);
        await goTo(page, 'Folders');

        // The parent holds no papers directly but must report its subtree's three.
        await expect(page.getByTestId('folder-node-f_root')).toContainText('3');
        await page.getByTestId('folder-node-f_root').click();
        await expect(page.locator('article')).toHaveCount(3);

        // Turning off the subtree roll-up empties it again.
        await page.getByRole('button', { name: 'Include subfolders' }).click();
        await expect(page.getByText('This folder is empty')).toBeVisible();
    });

    test('deleting a parent folder removes its children but keeps the papers', async ({ page }) => {
        const store = seededStore();
        const ids = Object.keys(store.papers);
        store.folders = [
            { id: 'f_root', name: 'Thesis', parentId: null, paperIds: [], description: '', color: null, createdAt: new Date().toISOString() },
            { id: 'f_kid', name: 'Chapter 1', parentId: 'f_root', paperIds: ids.slice(0, 3), description: '', color: null, createdAt: new Date().toISOString() },
        ];
        await seed(page, store);
        await goTo(page, 'Folders');

        page.once('dialog', (d) => d.accept());
        await page.getByTestId('folder-node-f_root').click();
        await page.getByRole('button', { name: 'Delete folder' }).click();

        const after = await readStore(page);
        expect(after.folders).toHaveLength(0);
        expect(Object.keys(after.papers)).toHaveLength(12);   // papers untouched
    });
});

/* ------------------------------------------------------------------- triage */

test.describe('reading workflow', () => {
    test('keyboard triage persists to IndexedDB', async ({ page }) => {
        await seed(page, seededStore());
        await page.locator('body').click({ position: { x: 400, y: 400 } });

        await page.keyboard.press('s');     // star the focused paper
        await page.keyboard.press('q');     // queue it
        await expect(page.getByText('Queued').first()).toBeVisible();

        const store = await readStore(page);
        const starred = Object.values(store.states).filter((s) => s.starred);
        const queued = Object.values(store.states).filter((s) => s.status === 'queued');
        expect(starred).toHaveLength(1);
        expect(queued).toHaveLength(1);
    });

    test('the queue view shows exactly the queued papers', async ({ page }) => {
        const store = seededStore();
        const ids = Object.keys(store.papers);
        ids.slice(0, 3).forEach((id) => { store.states[id].status = 'queued'; });
        await seed(page, store);

        await goTo(page, 'Queue');
        await expect(page.locator('article')).toHaveCount(3);
    });

    test('dismissing a paper hides it and teaches the ranker', async ({ page }) => {
        await seed(page, seededStore());
        const before = await readStore(page);
        expect(Object.keys(before.feedback.terms)).toHaveLength(0);

        await page.locator('body').click({ position: { x: 400, y: 400 } });
        await page.keyboard.press('x');

        const after = await readStore(page);
        const dismissed = Object.values(after.states).filter((s) => s.status === 'dismissed');
        expect(dismissed).toHaveLength(1);
        // Its vocabulary now carries negative weight.
        expect(Object.keys(after.feedback.terms).length).toBeGreaterThan(0);
    });
});

/* -------------------------------------------------------------------- search */

test.describe('search', () => {
    test('field-prefixed queries narrow the library', async ({ page }) => {
        await seed(page, seededStore());
        await goTo(page, 'Library');

        const box = page.getByPlaceholder(/Search/);
        await box.fill('au:lovelace');
        const withAda = await page.locator('article').count();
        expect(withAda).toBeGreaterThan(0);
        expect(withAda).toBeLessThan(12);

        await box.fill('au:nobody-at-all');
        await expect(page.getByText('Nothing matches')).toBeVisible();

        await box.fill('');
        await expect(page.locator('article')).toHaveCount(12);
    });
});

/* ------------------------------------------------------------------ settings */

test.describe('settings', () => {
    test('the storage meter reports a real quota, not a 5 MB guess', async ({ page }) => {
        await seed(page, seededStore());
        await goTo(page, 'Settings');

        await expect(page.getByText(/available to this site/)).toBeVisible();
        await expect(page.getByText(/IndexedDB/).first()).toBeVisible();
        await expect(page.getByText(/5 MB browser budget/)).toHaveCount(0);
    });

    test('switching the source swaps the fetch back-end', async ({ page }) => {
        await seed(page, seededStore());
        await goTo(page, 'Settings');

        const source = page.locator('select').filter({ hasText: 'OpenAlex' }).first();
        await source.selectOption('arxiv');
        await expect(page.getByText(/Network route/)).toBeVisible();

        const store = await readStore(page);
        expect(store.settings.source).toBe('arxiv');
    });
});

/* ------------------------------------------------------------------- topics */

test.describe('topics', () => {
    test('a new topic is saved and appears in the sidebar', async ({ page }) => {
        await seed(page, makeStore({ topics: [] }));
        await goTo(page, 'Topics');

        await page.getByRole('button', { name: '+ New topic' }).click();
        await page.getByLabel('Name').fill('Rough Volatility');
        await page.getByPlaceholder('tensor network, matrix product state…').fill('rough volatility');
        await page.keyboard.press('Enter');
        await page.getByRole('button', { name: 'Save topic' }).click();

        const store = await readStore(page);
        expect(store.topics).toHaveLength(1);
        expect(store.topics[0].name).toBe('Rough Volatility');
        expect(store.topics[0].terms).toEqual(['rough volatility']);
    });

    test('deleting a topic keeps its papers in the library', async ({ page }) => {
        await seed(page, seededStore());
        await goTo(page, 'Topics');

        page.once('dialog', (d) => d.accept());
        await page.getByTestId('topic-card-t_ot').getByRole('button', { name: 'Delete' }).click();

        const store = await readStore(page);
        expect(store.topics).toHaveLength(2);
        expect(Object.keys(store.papers)).toHaveLength(12);
        Object.values(store.papers).forEach((p) => expect(p.topicIds).not.toContain('t_ot'));
    });
});

/* -------------------------------------------------------------- persistence */

test('a v1 localStorage store migrates into IndexedDB on first load', async ({ page }) => {
    await onQuietPage(page);
    await page.evaluate(() => {
        localStorage.setItem('paper-radar:v1', JSON.stringify({
            version: 1,
            settings: { autoFetchOnOpen: false },
            topics: [{ id: 't_old', name: 'Legacy topic', terms: ['x'], categories: [], authors: [], exclude: [] }],
            papers: {}, states: {}, authors: {},
            collections: [{ id: 'c1', name: 'Old collection', paperIds: [] }],
            feedback: { terms: {} }, history: [],
        }));
    });
    await page.goto('/#/paper-search', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Paper Radar');
    // Give the debounced save a moment to land in IndexedDB.
    await page.waitForTimeout(900);

    const store = await readStore(page);
    expect(store).not.toBeNull();
    expect(store.version).toBe(2);
    expect(store.topics[0].name).toBe('Legacy topic');
    // v1 collections become root-level folders.
    expect(store.folders).toHaveLength(1);
    expect(store.folders[0].name).toBe('Old collection');
    expect(store.folders[0].parentId).toBeNull();
    // The v1 key is cleared so it cannot shadow the newer store.
    expect(await page.evaluate(() => localStorage.getItem('paper-radar:v1'))).toBeNull();
});
