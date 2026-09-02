const { test, expect } = require('@playwright/test');
const {
    makeTopic, makePaper, makeStore, seed, readStore, clearStorage, stubOpenAlex, onQuietPage,
} = require('./fixtures');

const tab = (page, id) => page.getByTestId(`tab-${id}`);
const goTo = async (page, id) => { await tab(page, id).click(); await page.waitForTimeout(200); };

/** Three topics, twelve papers, two nested folders. */
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

test.beforeEach(async ({ page }) => { await clearStorage(page); });

/* ------------------------------------------------------------------- shell -- */

test.describe('shell', () => {
    test('three tabs, no sidebar, settings behind a modal', async ({ page }) => {
        await seed(page, seededStore());

        await expect(page.getByRole('tablist')).toHaveCount(1);
        await expect(page.getByRole('tab')).toHaveCount(3);
        await expect(tab(page, 'stream')).toHaveAttribute('aria-selected', 'true');

        await page.getByTestId('open-settings').click();
        await expect(page.getByRole('dialog')).toContainText('Settings');
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toHaveCount(0);
    });

    test('tabs switch without losing the library', async ({ page }) => {
        await seed(page, seededStore());
        for (const id of ['topics', 'explorer', 'stream']) {
            await goTo(page, id);
            await expect(tab(page, id)).toHaveAttribute('aria-selected', 'true');
        }
        await expect(page.getByTestId('paper-row').first()).toBeVisible();
    });
});

/* ------------------------------------------------------------------ topics -- */

test.describe('topics', () => {
    test('creating a topic takes two fields and shows up as a card', async ({ page }) => {
        await seed(page, makeStore({ topics: [] }));
        await goTo(page, 'topics');

        await page.getByRole('button', { name: 'Create a topic' }).click();
        await page.getByLabel('Name').fill('Rough Volatility');
        await page.getByPlaceholder('optimal transport, wasserstein…').fill('rough volatility');
        await page.keyboard.press('Enter');
        await page.getByRole('button', { name: 'Create topic' }).click();

        const store = await readStore(page);
        expect(store.topics).toHaveLength(1);
        expect(store.topics[0].name).toBe('Rough Volatility');
        expect(store.topics[0].terms).toEqual(['rough volatility']);
        await expect(page.getByTestId(`topic-card-${store.topics[0].id}`)).toContainText('Rough Volatility');
    });

    test('advanced options stay folded away until asked for', async ({ page }) => {
        await seed(page, makeStore({ topics: [] }));
        await goTo(page, 'topics');
        await page.getByRole('button', { name: 'Create a topic' }).click();

        await expect(page.getByText('Exclude', { exact: true })).toHaveCount(0);
        await page.getByText(/More options/).click();
        await expect(page.getByText('Exclude', { exact: true })).toBeVisible();
        await expect(page.getByText('arXiv categories', { exact: true })).toBeVisible();
    });

    test('closing the editor does not crash the app', async ({ page }) => {
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await seed(page, seededStore());
        await goTo(page, 'topics');

        await page.getByTestId('topic-card-t_ot').dblclick();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(page.getByRole('dialog')).toHaveCount(0);

        await page.getByTestId('topic-card-t_ot').dblclick();
        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByRole('dialog')).toHaveCount(0);

        expect(errors).toEqual([]);
    });

    test('right-click offers duplicate, disable and delete', async ({ page }) => {
        await seed(page, seededStore());
        await goTo(page, 'topics');

        await page.getByTestId('topic-card-t_ot').click({ button: 'right' });
        const menu = page.getByTestId('context-menu');
        await expect(menu).toBeVisible();
        await menu.getByText('Duplicate').click();

        const store = await readStore(page);
        expect(store.topics).toHaveLength(4);
        expect(store.topics.some((t) => t.name === 'Optimal Transport copy')).toBe(true);
    });
});

/* ------------------------------------------------------------------ stream -- */

test.describe('stream', () => {
    test('papers nest under month, week and day, and the levels collapse', async ({ page }) => {
        await seed(page, seededStore());

        // The fixture spans a month boundary, so both months are present — and a week
        // that straddles them must appear under each without sharing collapse state.
        const months = page.getByTestId('month-group');
        expect(await months.count()).toBeGreaterThanOrEqual(2);
        await expect(page.getByTestId('week-group').first()).toBeVisible();
        await expect(page.getByTestId('day-heading').first()).toContainText('Today');

        const before = await page.getByTestId('paper-row').count();
        expect(before).toBeGreaterThan(0);

        // Collapsing the newest month hides its papers and leaves the others alone.
        await months.first().getByRole('button').first().click();
        const after = await page.getByTestId('paper-row').count();
        expect(after).toBeLessThan(before);

        // Re-opening restores exactly what was there.
        await months.first().getByRole('button').first().click();
        await expect(page.getByTestId('paper-row')).toHaveCount(before);
    });

    test('a fetch animates, then reports what was new; a second adds nothing', async ({ page }) => {
        const works = [
            { arxivId: '2608.90001', title: 'First fetched paper' },
            { arxivId: '2608.90002', title: 'Second fetched paper' },
        ];
        const calls = await stubOpenAlex(page, works);
        await seed(page, makeStore({ topics: [makeTopic({ id: 't_ot', name: 'Optimal Transport' })] }));

        await page.getByTestId('fetch-all').click();
        await expect(page.getByTestId('fetch-banner')).toBeVisible();
        await expect(page.getByText('First fetched paper')).toBeVisible();
        await expect(page.getByText('2 new papers')).toBeVisible();
        expect(calls.count).toBe(1);

        const first = await readStore(page);
        const firstSeen = first.papers['2608.90001'].firstSeen;

        await page.getByTestId('fetch-all').click();
        await expect(page.getByText('No new papers')).toBeVisible();

        const second = await readStore(page);
        expect(Object.keys(second.papers)).toHaveLength(2);
        expect(second.papers['2608.90001'].firstSeen).toBe(firstSeen);
    });

    test('quick filters and topic chips narrow the stream', async ({ page }) => {
        const store = seededStore();
        Object.keys(store.papers).slice(0, 3).forEach((id) => { store.states[id].starred = true; });
        await seed(page, store);

        const all = await page.getByTestId('paper-row').count();
        await page.getByTestId('filter-quick-starred').click();
        await expect(page.getByTestId('paper-row')).toHaveCount(3);

        await page.getByTestId('filter-quick-all').click();
        await expect(page.getByTestId('paper-row')).toHaveCount(all);

        await page.getByTestId('filter-topic-t_dif').click();
        const diffusion = await page.getByTestId('paper-row').count();
        expect(diffusion).toBeGreaterThan(0);
        expect(diffusion).toBeLessThan(all);
    });

    test('right-clicking a paper offers reading actions', async ({ page }) => {
        await seed(page, seededStore());
        await page.getByTestId('paper-row').first().click({ button: 'right' });

        const menu = page.getByTestId('context-menu');
        await expect(menu).toBeVisible();
        await menu.getByText('Add to queue').click();

        const store = await readStore(page);
        expect(Object.values(store.states).filter((s) => s.status === 'queued')).toHaveLength(1);
    });
});

/* ---------------------------------------------------------------- explorer -- */

test.describe('explorer', () => {
    test('a paper dragged between your folders moves; one from the Stream copies', async ({ page }) => {
        const store = seededStore();
        const ids = Object.keys(store.papers);
        store.folders = [
            { id: 'f_a', name: 'Inbox', parentId: null, paperIds: ids.slice(0, 2), description: '', color: null, createdAt: new Date().toISOString() },
            { id: 'f_b', name: 'Chapter 2', parentId: null, paperIds: [], description: '', color: null, createdAt: new Date().toISOString() },
        ];
        await seed(page, store);
        await goTo(page, 'explorer');

        await page.getByTestId('folder-node-f_a').click();
        await expect(page.getByTestId('paper-row')).toHaveCount(2);

        // Between your own folders: a move. dragTo drives real HTML5 drag events.
        await page.getByTestId('paper-row').first().dragTo(page.getByTestId('folder-node-f_b'));
        let after = await readStore(page);
        expect(after.folders.find((f) => f.id === 'f_b').paperIds).toHaveLength(1);
        expect(after.folders.find((f) => f.id === 'f_a').paperIds).toHaveLength(1);

        // Out of the read-only Stream: a copy, so the Stream keeps everything.
        await page.getByTestId('folder-node-stream:root').click();
        const streamCount = await page.getByTestId('paper-row').count();
        await page.getByTestId('paper-row').first().dragTo(page.getByTestId('folder-node-f_b'));

        after = await readStore(page);
        expect(after.folders.find((f) => f.id === 'f_b').paperIds.length).toBeGreaterThanOrEqual(1);
        await page.getByTestId('folder-node-stream:root').click();
        await expect(page.getByTestId('paper-row')).toHaveCount(streamCount);
    });

    test('the Stream shows up as a read-only Month > Week > Day tree', async ({ page }) => {
        await seed(page, seededStore());
        await goTo(page, 'explorer');

        await page.getByTestId('folder-node-stream:root').click();
        await expect(page.getByTestId('explorer-column-1')).toBeVisible();
        await expect(page.getByText('read-only')).toBeVisible();

        // Month -> week -> day, each opening the next column.
        await page.getByTestId('explorer-column-1').getByRole('listitem').first().click();
        await expect(page.getByTestId('explorer-column-2')).toBeVisible();
        await page.getByTestId('explorer-column-2').getByRole('listitem').first().click();
        await expect(page.getByTestId('explorer-column-3')).toBeVisible();
        await expect(page.getByTestId('paper-row').first()).toBeVisible();
    });

    test('a subfolder can be created inside an empty folder', async ({ page }) => {
        const store = seededStore();
        store.folders = [{
            id: 'f_a', name: 'Thesis', parentId: null, paperIds: [],
            description: '', color: null, createdAt: new Date().toISOString(),
        }];
        await seed(page, store);
        await goTo(page, 'explorer');

        // Selecting an empty folder still opens its column, which is where its + lives.
        await page.getByTestId('folder-node-f_a').click();
        await expect(page.getByTestId('explorer-column-1')).toBeVisible();
        await page.getByTestId('new-folder-col-1').click();

        const after = await readStore(page);
        expect(after.folders).toHaveLength(2);
        expect(after.folders.find((f) => f.parentId === 'f_a')).toBeTruthy();
    });

    test('holding a drag over a tab springs it open', async ({ page }) => {
        await seed(page, seededStore());
        await expect(tab(page, 'stream')).toHaveAttribute('aria-selected', 'true');

        // The spring timer is armed by dragover on the tab itself.
        await page.getByTestId('tab-explorer').dispatchEvent('dragover');
        await expect(tab(page, 'explorer')).toHaveAttribute('aria-selected', 'true', { timeout: 3000 });
    });

    test('right-click renames and deletes a folder without touching the papers', async ({ page }) => {
        const store = seededStore();
        store.folders = [{
            id: 'f_a', name: 'Seminar', parentId: null,
            paperIds: Object.keys(store.papers).slice(0, 2),
            description: '', color: null, createdAt: new Date().toISOString(),
        }];
        await seed(page, store);
        await goTo(page, 'explorer');

        await page.getByTestId('folder-node-f_a').click({ button: 'right' });
        await page.getByTestId('context-menu').getByText('Rename').click();
        await page.locator('input[value="Seminar"]').fill('Reading group');
        await page.keyboard.press('Enter');
        await expect(page.getByTestId('folder-node-f_a')).toContainText('Reading group');

        page.once('dialog', (d) => d.accept());
        await page.getByTestId('folder-node-f_a').click({ button: 'right' });
        await page.getByTestId('context-menu').getByText('Delete folder').click();

        const after = await readStore(page);
        expect(after.folders).toHaveLength(0);
        expect(Object.keys(after.papers)).toHaveLength(12);
    });

    test('import files papers already in the library', async ({ page }) => {
        const store = seededStore();
        const ids = Object.keys(store.papers).slice(0, 2);
        store.folders = [{
            id: 'f_a', name: 'Chapter 2', parentId: null, paperIds: [],
            description: '', color: null, createdAt: new Date().toISOString(),
        }];
        await seed(page, store);
        await goTo(page, 'explorer');

        await page.getByTestId('folder-node-f_a').click();
        await page.getByRole('button', { name: 'Import' }).click();
        await page.getByRole('textbox').last().fill(`${ids[0]}\nhttps://arxiv.org/abs/${ids[1]}\n2999.99999`);
        await expect(page.getByText('2 already in your library — these will be filed.')).toBeVisible();
        await page.getByRole('button', { name: /File 2 papers/ }).click();

        const after = await readStore(page);
        expect(after.folders[0].paperIds.sort()).toEqual(ids.sort());
    });
});

/* ------------------------------------------------------------------- shelf -- */

test('the shelf holds papers across a tab change', async ({ page }) => {
    const store = seededStore();
    store.folders = [{
        id: 'f_a', name: 'Later', parentId: null, paperIds: [],
        description: '', color: null, createdAt: new Date().toISOString(),
    }];
    await seed(page, store);

    // The shelf stays hidden until a drag begins.
    await expect(page.getByTestId('shelf')).toHaveCount(0);

    await page.getByTestId('paper-row').first().hover();
    await page.mouse.down();
    await page.mouse.move(400, 400, { steps: 5 });
    await expect(page.getByTestId('shelf')).toBeVisible();
    await page.getByTestId('shelf').hover();
    await page.mouse.up();

    await expect(page.getByTestId('shelf')).toContainText('1 on the shelf');

    await page.getByLabel('File shelf into folder').selectOption('f_a');
    const after = await readStore(page);
    expect(after.folders[0].paperIds).toHaveLength(1);
});

/* ------------------------------------------------------------- persistence -- */

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
    await page.waitForTimeout(900);

    const store = await readStore(page);
    expect(store.version).toBe(2);
    expect(store.topics[0].name).toBe('Legacy topic');
    expect(store.folders).toHaveLength(1);
    expect(store.folders[0].name).toBe('Old collection');
    expect(await page.evaluate(() => localStorage.getItem('paper-radar:v1'))).toBeNull();
});
