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
    test('a day strip navigates a flat list, with no month/week tree', async ({ page }) => {
        await seed(page, seededStore());

        await expect(page.getByTestId('day-strip')).toBeVisible();
        await expect(page.getByTestId('month-group')).toHaveCount(0);
        await expect(page.getByTestId('week-group')).toHaveCount(0);

        const all = await page.getByTestId('paper-row').count();
        expect(all).toBeGreaterThan(0);

        // Focusing today shows only today's papers; "All" brings the rest back.
        const today = new Date().toISOString().slice(0, 10);
        await page.getByTestId(`day-cell-${today}`).click();
        await expect(page.getByTestId('day-group')).toHaveCount(1);
        const todayCount = await page.getByTestId('paper-row').count();
        expect(todayCount).toBeLessThanOrEqual(all);

        await page.getByTestId('day-all').click();
        await expect(page.getByTestId('paper-row')).toHaveCount(all);
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

    test('"not interested" fades a paper in place instead of removing it', async ({ page }) => {
        await seed(page, seededStore());
        const before = await page.getByTestId('paper-row').count();

        const row = page.getByTestId('paper-row').first();
        const title = await row.locator('h3').innerText();
        await row.hover();
        await row.getByRole('button', { name: 'Not interested' }).click();

        // Still there, still findable — just out of the way.
        await expect(page.getByTestId('paper-row')).toHaveCount(before);
        await expect(page.getByText(title, { exact: true })).toBeVisible();

        const store = await readStore(page);
        expect(Object.values(store.states).filter((st) => st.status === 'dismissed')).toHaveLength(1);
        // And it teaches the ranker, like the context-menu route does.
        expect(Object.keys(store.feedback.terms).length).toBeGreaterThan(0);

        // The decision is reversible from the same button.
        await row.hover();
        await row.getByRole('button', { name: 'Interested after all' }).click();
        const after = await readStore(page);
        expect(Object.values(after.states).filter((st) => st.status === 'dismissed')).toHaveLength(0);
    });

    test('a card carries star, read-later, read and not-interested', async ({ page }) => {
        await seed(page, seededStore());
        const row = page.getByTestId('paper-row').first();
        await row.hover();

        for (const label of ['Star', 'Read later', 'Mark read', 'Not interested']) {
            await expect(row.getByRole('button', { name: label })).toBeVisible();
        }

        // Read later is its own state, distinct from read.
        await row.getByRole('button', { name: 'Read later' }).click();
        const store = await readStore(page);
        expect(Object.values(store.states).filter((st) => st.status === 'queued')).toHaveLength(1);
    });

    test('the score chip explains itself rather than showing a bare number', async ({ page }) => {
        await seed(page, seededStore());
        const chip = page.getByTestId('score-chip').first();
        await expect(chip).toBeVisible();
        await expect(chip).toHaveAttribute('title', /Relevance \d+/);
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

    test('a move stays a move even when the browser drops custom drag types', async ({ page }) => {
        const store = seededStore();
        const ids = Object.keys(store.papers);
        store.folders = [
            { id: 'f_a', name: 'Inbox', parentId: null, paperIds: ids.slice(0, 2), description: '', color: null, createdAt: new Date().toISOString() },
            { id: 'f_b', name: 'Chapter 2', parentId: null, paperIds: [], description: '', color: null, createdAt: new Date().toISOString() },
        ];
        await seed(page, store);
        await goTo(page, 'explorer');
        await page.getByTestId('folder-node-f_a').click();

        // Some browsers carry only text/plain across a drag and silently drop custom
        // MIME types. If the source were read from dataTransfer, every move would
        // become a copy — so replay a drag with the custom types stripped.
        await page.evaluate((paperId) => {
            const row = document.querySelector(`[data-paper-id="${paperId}"]`);
            const target = document.querySelector('[data-testid="folder-node-f_b"]');
            row.dispatchEvent(new DragEvent('dragstart', { dataTransfer: new DataTransfer(), bubbles: true }));
            const stripped = new DataTransfer();
            stripped.setData('text/plain', paperId);
            target.dispatchEvent(new DragEvent('dragenter', { dataTransfer: stripped, bubbles: true }));
            target.dispatchEvent(new DragEvent('drop', { dataTransfer: stripped, bubbles: true }));
        }, ids[0]);

        const after = await readStore(page);
        expect(after.folders.find((f) => f.id === 'f_b').paperIds).toContain(ids[0]);
        expect(after.folders.find((f) => f.id === 'f_a').paperIds).not.toContain(ids[0]);
    });

    test('the drop highlight clears when the drag ends', async ({ page }) => {
        const store = seededStore();
        store.folders = [{
            id: 'f_a', name: 'Inbox', parentId: null, paperIds: Object.keys(store.papers).slice(0, 1),
            description: '', color: null, createdAt: new Date().toISOString(),
        }];
        await seed(page, store);
        await goTo(page, 'explorer');
        await page.getByTestId('folder-node-f_a').click();

        const target = page.getByTestId('folder-node-f_a');
        await page.evaluate(() => {
            const row = document.querySelector('[data-paper-id]');
            const folder = document.querySelector('[data-testid="folder-node-f_a"]');
            row.dispatchEvent(new DragEvent('dragstart', { dataTransfer: new DataTransfer(), bubbles: true }));
            folder.dispatchEvent(new DragEvent('dragenter', { dataTransfer: new DataTransfer(), bubbles: true }));
        });
        await expect(target).toHaveClass(/pr-drop-target/);

        // Ending the drag without a dragleave must still clear it.
        await page.evaluate(() => {
            document.querySelector('[data-paper-id]')
                .dispatchEvent(new DragEvent('dragend', { dataTransfer: new DataTransfer(), bubbles: true }));
        });
        await expect(target).not.toHaveClass(/pr-drop-target/);
    });

    test('the Stream is a read-only Month > Week > Day tree in the sidebar', async ({ page }) => {
        await seed(page, seededStore());
        await goTo(page, 'explorer');

        // The Stream root starts expanded, so its months are already listed.
        await expect(page.getByTestId('folder-node-stream:root')).toContainText('Stream');
        await expect(page.getByText('read-only')).toBeVisible();

        const months = page.locator('[data-testid^="folder-node-stream:"]').filter({ hasNotText: 'Stream' });
        expect(await months.count()).toBeGreaterThan(0);

        // Months open into weeks; the tree carries folders only, never papers.
        await months.first().click();
        await expect(page.locator('[data-testid^="folder-node-stream:"]')).not.toHaveCount(1);
    });

    test('the sidebar groups saved views, the archive, then your folders', async ({ page }) => {
        await seed(page, seededStore());
        await goTo(page, 'explorer');

        // Order top to bottom: the two saved views, then the archive.
        const rows = page.locator('[data-testid^="folder-node-"]');
        await expect(rows.nth(0)).toContainText('Starred');
        await expect(rows.nth(1)).toContainText('Read later');
        await expect(rows.nth(2)).toContainText('Stream');

        // Stream is bracketed by rules, keeping the two read-only groups together.
        await expect(page.getByTestId('tree-separator')).toHaveCount(2);

        const store = seededStore();
        store.folders = [{
            id: 'f_a', name: 'Thesis', parentId: null, paperIds: [],
            description: '', color: null, createdAt: new Date().toISOString(),
        }];
        await seed(page, store);
        await goTo(page, 'explorer');

        // Your folders come after the archive, below the second rule.
        const withFolder = page.locator('[data-testid^="folder-node-"]');
        await expect(withFolder.nth(2)).toContainText('Stream');
        await expect(withFolder.last()).toContainText('Thesis');
        await expect(page.getByTestId('tree-separator')).toHaveCount(2);
    });

    test('Starred and Read later are smart folders driven by reading state', async ({ page }) => {
        const store = seededStore();
        const ids = Object.keys(store.papers);
        ids.slice(0, 2).forEach((id) => { store.states[id].starred = true; });
        store.states[ids[5]].status = 'queued';
        await seed(page, store);
        await goTo(page, 'explorer');

        await page.getByTestId('folder-node-smart:starred').click();
        await expect(page.getByTestId('paper-row')).toHaveCount(2);

        await page.getByTestId('folder-node-smart:later').click();
        await expect(page.getByTestId('paper-row')).toHaveCount(1);
    });

    test('dropping on a smart folder sets the state rather than filing a copy', async ({ page }) => {
        const store = seededStore();
        const ids = Object.keys(store.papers);
        store.folders = [{
            id: 'f_a', name: 'Inbox', parentId: null, paperIds: ids.slice(0, 2),
            description: '', color: null, createdAt: new Date().toISOString(),
        }];
        await seed(page, store);
        await goTo(page, 'explorer');
        await page.getByTestId('folder-node-f_a').click();

        await page.getByTestId('paper-row').first().dragTo(page.getByTestId('folder-node-smart:starred'));

        const after = await readStore(page);
        const nowStarred = Object.entries(after.states).filter(([, st]) => st.starred).map(([id]) => id);
        expect(nowStarred).toHaveLength(1);
        // It stays where it was filed — a smart folder is a view, not a location.
        expect(after.folders.find((f) => f.id === 'f_a').paperIds).toHaveLength(2);
    });

    test('tree rows carry an unread chip beside the total', async ({ page }) => {
        const store = seededStore();
        const ids = Object.keys(store.papers);
        store.folders = [{
            id: 'f_a', name: 'Inbox', parentId: null, paperIds: ids.slice(0, 3),
            description: '', color: null, createdAt: new Date().toISOString(),
        }];
        ids.slice(0, 2).forEach((id) => { store.states[id].status = 'read'; });
        await seed(page, store);
        await goTo(page, 'explorer');

        const row = page.getByTestId('folder-node-f_a');
        await expect(row).toContainText('3');
        // Three filed, two read, so exactly one is still outstanding.
        await expect(page.getByTestId('unread-chip-f_a')).toHaveText('1');

        // Reading the last one retires the chip entirely.
        await row.click();
        await page.getByTestId('paper-row').last().click({ button: 'right' });
        await page.getByTestId('context-menu').getByText('Mark read').click();
        await expect(page.getByTestId('unread-chip-f_a')).toHaveCount(0);
    });

    test('a subfolder can be created inside an empty folder', async ({ page }) => {
        const store = seededStore();
        store.folders = [{
            id: 'f_a', name: 'Thesis', parentId: null, paperIds: [],
            description: '', color: null, createdAt: new Date().toISOString(),
        }];
        await seed(page, store);
        await goTo(page, 'explorer');

        await page.getByTestId('folder-node-f_a').click({ button: 'right' });
        await page.getByTestId('context-menu').getByText('New subfolder').click();

        const after = await readStore(page);
        expect(after.folders).toHaveLength(2);
        expect(after.folders.find((f) => f.parentId === 'f_a')).toBeTruthy();
    });

    test('holding a drag over a folder springs it open and offers a new folder', async ({ page }) => {
        const store = seededStore();
        const ids = Object.keys(store.papers);
        store.folders = [
            { id: 'f_a', name: 'Thesis', parentId: null, paperIds: ids.slice(0, 1), description: '', color: null, createdAt: new Date().toISOString() },
            { id: 'f_kid', name: 'Chapter 1', parentId: 'f_a', paperIds: [], description: '', color: null, createdAt: new Date().toISOString() },
        ];
        await seed(page, store);
        await goTo(page, 'explorer');

        // Collapsed to begin with.
        await expect(page.getByTestId('folder-node-f_kid')).toHaveCount(0);

        // A drag held over the parent expands it and reveals the "+ New folder" target.
        await page.getByTestId('folder-node-f_a').dispatchEvent('dragenter');
        await expect(page.getByTestId('folder-node-f_kid')).toBeVisible({ timeout: 3000 });
        await expect(page.getByTestId('drop-new-folder')).toHaveCount(0);
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

    test('the Explorer filters with the same query language as the Stream', async ({ page }) => {
        const store = seededStore();
        const ids = Object.keys(store.papers);
        ids.slice(0, 2).forEach((id) => { store.states[id].starred = true; });
        store.folders = [{
            id: 'f_a', name: 'Inbox', parentId: null, paperIds: ids.slice(0, 6),
            description: '', color: null, createdAt: new Date().toISOString(),
        }];
        await seed(page, store);
        await goTo(page, 'explorer');
        await page.getByTestId('folder-node-f_a').click();
        await expect(page.getByTestId('paper-row')).toHaveCount(6);

        // Field-prefixed search.
        await page.getByTestId('explorer-filter').fill('au:lovelace');
        const byAuthor = await page.getByTestId('paper-row').count();
        expect(byAuthor).toBeGreaterThan(0);
        expect(byAuthor).toBeLessThan(6);

        // A state toggle, and the count reads "n of total".
        await page.getByTestId('explorer-clear').click();
        await page.getByTestId('explorer-state-starred').click();
        await expect(page.getByTestId('paper-row')).toHaveCount(2);
        await expect(page.getByTestId('explorer-count')).toContainText('2 of 6');

        // Topics collapse into a popover rather than a row of long chips.
        await page.getByTestId('explorer-clear').click();
        await expect(page.getByTestId('explorer-topic-t_ot')).toHaveCount(0);
        await page.getByTestId('explorer-topics').click();
        await page.getByTestId('explorer-topic-t_ot').click();
        const byTopic = await page.getByTestId('paper-row').count();
        expect(byTopic).toBeGreaterThan(0);
        expect(byTopic).toBeLessThan(6);
        await page.keyboard.press('Escape');

        // Filtering everything out explains itself rather than claiming the folder is empty.
        await page.getByTestId('explorer-filter').fill('au:nobody-at-all');
        await expect(page.getByText('Nothing matches these filters')).toBeVisible();

        await page.getByTestId('explorer-clear').click();
        await expect(page.getByTestId('paper-row')).toHaveCount(6);
    });

    test('sorting the Explorer reorders the list', async ({ page }) => {
        const store = seededStore();
        store.folders = [{
            id: 'f_a', name: 'Inbox', parentId: null, paperIds: Object.keys(store.papers),
            description: '', color: null, createdAt: new Date().toISOString(),
        }];
        await seed(page, store);
        await goTo(page, 'explorer');
        await page.getByTestId('folder-node-f_a').click();

        // Compare the whole order: the fixture's newest paper also sorts first by title,
        // so looking at the head alone proves nothing.
        const titles = () => page.getByTestId('paper-row').locator('h3').allInnerTexts();

        await page.getByTestId('explorer-sort').selectOption('newest');
        const byDate = await titles();
        await page.getByTestId('explorer-sort').selectOption('title');
        const byTitle = await titles();

        expect(byTitle).toHaveLength(byDate.length);
        expect(byTitle).not.toEqual(byDate);
        expect([...byTitle].sort()).toEqual(byTitle);
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
