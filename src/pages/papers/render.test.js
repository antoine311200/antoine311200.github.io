import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import PaperSearch from './index';
import { STORAGE_KEY, emptyStore, makeTopic, makeFolder } from './storage';
import * as idb from './idb';

beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn(() => Promise.reject(new Error('offline in tests')));
    // jsdom has no IndexedDB, so the store hydrates from the localStorage seed —
    // which is exactly the v1 -> v2 migration path a real user takes.
    jest.spyOn(idb, 'idbAvailable').mockReturnValue(false);
});

afterEach(() => jest.restoreAllMocks());

function seeded() {
    const store = emptyStore();
    store.settings.autoFetchOnOpen = false;
    store.topics = [makeTopic({ id: 't_ot', name: 'Optimal Transport', terms: ['optimal transport'], color: '#fb923c' })];
    const day = new Date().toISOString();
    store.papers = {
        '2608.11111': {
            id: '2608.11111',
            version: 1,
            title: 'Entropic Optimal Transport at Scale',
            summary: 'We prove a bound and run experiments.',
            authors: [{ name: 'Ada Lovelace' }, { name: 'Alan Turing' }],
            categories: [],
            primary: null,
            published: day,
            updated: day,
            firstSeen: day,
            topicIds: ['t_ot'],
            score: 72,
            citations: 3,
            reasons: [{ kind: 'terms', label: 'matches optimal transport' }],
        },
    };
    store.states = {
        '2608.11111': {
            status: 'unread', starred: false, tags: [], note: '',
            rating: 0, readAt: null, queuedAt: null, updatedAt: Date.now(),
        },
    };
    return store;
}

const draw = async (store) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    const utils = render(<MemoryRouter><PaperSearch /></MemoryRouter>);
    // Hydration is async; let the loadStore() promise resolve and HYDRATE commit.
    await act(async () => { await Promise.resolve(); });
    return utils;
};

test('opens on the Stream tab with three sections and no sidebar', async () => {
    await draw(seeded());
    expect(screen.getByText('Paper Radar')).toBeInTheDocument();
    ['topics', 'stream', 'explorer'].forEach((id) => {
        expect(screen.getByTestId(`tab-${id}`)).toBeInTheDocument();
    });
    expect(screen.getByTestId('tab-stream')).toHaveAttribute('aria-selected', 'true');
    // One tablist in the top bar is the whole chrome — there is no sidebar nav.
    expect(screen.getAllByRole('tablist')).toHaveLength(1);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
});

test('the stream nests papers under month, week and day', async () => {
    await draw(seeded());
    expect(screen.getByTestId('month-group')).toBeInTheDocument();
    expect(screen.getByTestId('week-group')).toBeInTheDocument();
    expect(screen.getByTestId('day-heading')).toHaveTextContent('Today');
    expect(screen.getByText('Entropic Optimal Transport at Scale')).toBeInTheDocument();
});

test('clicking a paper opens the detail panel beside the list', async () => {
    await draw(seeded());
    fireEvent.click(screen.getByText('Entropic Optimal Transport at Scale'));
    const panel = screen.getByTestId('paper-panel');
    expect(within(panel).getByText('Abstract')).toBeInTheDocument();
    expect(within(panel).getByText('matches optimal transport')).toBeInTheDocument();
    // The list is still there — the panel does not take over the tab.
    expect(screen.getByTestId('month-group')).toBeInTheDocument();
});

test('the Topics tab shows a card per topic plus the create affordance', async () => {
    await draw(seeded());
    fireEvent.click(screen.getByTestId('tab-topics'));
    expect(screen.getByTestId('topic-card-t_ot')).toHaveTextContent('Optimal Transport');
    expect(screen.getByTestId('new-topic-card')).toBeInTheDocument();
});

test('right-clicking a topic opens a context menu', async () => {
    await draw(seeded());
    fireEvent.click(screen.getByTestId('tab-topics'));
    fireEvent.contextMenu(screen.getByTestId('topic-card-t_ot'));
    const menu = screen.getByTestId('context-menu');
    ['Edit', 'Duplicate', 'Delete'].forEach((label) => {
        expect(within(menu).getByText(label)).toBeInTheDocument();
    });
});

test('the Explorer opens a column per level, Finder style', async () => {
    const store = seeded();
    store.folders = [
        makeFolder({ id: 'f_root', name: 'Thesis' }),
        makeFolder({ id: 'f_kid', name: 'Chapter 1', parentId: 'f_root', paperIds: ['2608.11111'] }),
    ];
    await draw(store);
    fireEvent.click(screen.getByTestId('tab-explorer'));

    // One column to start: the Stream root plus the user's root folders.
    expect(screen.getByTestId('explorer-column-0')).toBeInTheDocument();
    expect(screen.queryByTestId('explorer-column-1')).not.toBeInTheDocument();
    // The parent holds nothing directly but reports its subtree's one paper.
    expect(screen.getByTestId('folder-node-f_root')).toHaveTextContent('1');

    // Selecting it opens its children in a second column.
    fireEvent.click(screen.getByTestId('folder-node-f_root'));
    expect(screen.getByTestId('explorer-column-1')).toBeInTheDocument();
    expect(screen.getByTestId('folder-node-f_kid')).toHaveTextContent('Chapter 1');
});

test('the Stream appears in the Explorer as a read-only date tree', async () => {
    await draw(seeded());
    fireEvent.click(screen.getByTestId('tab-explorer'));

    const stream = screen.getByTestId('folder-node-stream:root');
    expect(stream).toHaveTextContent('Stream');
    fireEvent.click(stream);

    // Drilling in gives months, and the contents pane says it cannot be edited.
    expect(screen.getByTestId('explorer-column-1')).toBeInTheDocument();
    expect(screen.getByText('read-only')).toBeInTheDocument();
});

test('every column offers a way to add a folder at that level', async () => {
    const store = seeded();
    store.folders = [makeFolder({ id: 'f_root', name: 'Thesis' })];
    await draw(store);
    fireEvent.click(screen.getByTestId('tab-explorer'));

    expect(screen.getByTestId('new-folder-col-0')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('folder-node-f_root'));
    // The second column can create a subfolder of Thesis — no right-click needed.
    expect(screen.getByTestId('new-folder-col-1')).toBeInTheDocument();
});

test('the detail panel has a PDF tab', async () => {
    await draw(seeded());
    fireEvent.click(screen.getByText('Entropic Optimal Transport at Scale'));
    const panel = screen.getByTestId('paper-panel');
    // Both the header shortcut and the tab say "PDF"; the tab is the second.
    fireEvent.click(within(panel).getAllByRole('button', { name: 'PDF' })[1]);
    expect(screen.getByTestId('pdf-pane')).toBeInTheDocument();
    expect(screen.getByTitle(/PDF of Entropic/)).toHaveAttribute('src', expect.stringContaining('arxiv.org/pdf'));
});

test('settings live in a modal, not a tab', async () => {
    await draw(seeded());
    expect(screen.queryByTestId('tab-settings')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('open-settings'));
    expect(screen.getByRole('dialog')).toHaveTextContent('Settings');
});
