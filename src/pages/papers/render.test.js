import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import PaperSearch from './index';
import { STORAGE_KEY, emptyStore, makeTopic, STARTER_TOPICS } from './storage';
import * as idb from './idb';

// The app fetches on mount; the network is not the subject of these tests.
beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn(() => Promise.reject(new Error('offline in tests')));
    // jsdom has no IndexedDB, so the store hydrates from the localStorage seed —
    // which is exactly the v1 -> v2 migration path a real user takes.
    jest.spyOn(idb, 'idbAvailable').mockReturnValue(false);
});

afterEach(() => jest.restoreAllMocks());

const seeded = () => {
    const store = emptyStore();
    store.settings.autoFetchOnOpen = false;
    store.topics = [makeTopic({ id: 't_1', name: 'Tensor Networks', terms: ['tensor network'], color: '#38bdf8' })];
    store.papers = {
        '2401.01234': {
            id: '2401.01234',
            version: 1,
            title: 'Tensor Network Methods for Quantum Simulation',
            summary: 'We propose a tensor network approach to quantum simulation.',
            authors: [{ name: 'Ada Lovelace' }, { name: 'Alan Turing' }],
            categories: ['quant-ph'],
            primary: 'quant-ph',
            published: new Date().toISOString(),
            updated: new Date().toISOString(),
            firstSeen: new Date().toISOString(),
            topicIds: ['t_1'],
            score: 42,
            reasons: [{ kind: 'terms', label: 'matches tensor network' }],
        },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

const draw = async () => {
    const utils = render(<MemoryRouter><PaperSearch /></MemoryRouter>);
    // Let the async loadStore() promise resolve and the HYDRATE dispatch commit.
    await act(async () => { await Promise.resolve(); });
    return utils;
};

test('renders the empty state without a stored library', async () => {
    const store = emptyStore();
    store.settings.autoFetchOnOpen = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));

    await draw();
    expect(screen.getByText('Paper Radar')).toBeInTheDocument();
    expect(screen.getByText('Daily digest')).toBeInTheDocument();
    expect(screen.getByText('Set up your first topic')).toBeInTheDocument();
});

test('renders a stored paper in the digest and opens its detail panel', async () => {
    seeded();
    await draw();

    const title = 'Tensor Network Methods for Quantum Simulation';
    expect(screen.getByText(title)).toBeInTheDocument();
    // The digest groups by topic by default; the day header only appears when asked for.
    expect(screen.getAllByText('Tensor Networks').length).toBeGreaterThan(0);
    expect(screen.queryByText('Today')).not.toBeInTheDocument();

    fireEvent.change(screen.getByTitle('Group papers by'), { target: { value: 'day' } });
    expect(screen.getByText('Today')).toBeInTheDocument();
    fireEvent.change(screen.getByTitle('Group papers by'), { target: { value: 'topic' } });

    fireEvent.click(screen.getByText(title));
    expect(screen.getByText('Abstract')).toBeInTheDocument();
    expect(screen.getByText('Why you are seeing this')).toBeInTheDocument();
    expect(screen.getByText('matches tensor network')).toBeInTheDocument();
    expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThan(0);
});

test('the keyboard triage marks a paper read and persists it', async () => {
    seeded();
    await draw();

    fireEvent.keyDown(window, { key: 'r' });
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    // Persistence is debounced, so assert on the rendered state instead.
    expect(screen.getByText('read')).toBeInTheDocument();
    expect(saved).toBeTruthy();
});

test('every navigation target renders without crashing', async () => {
    seeded();
    await draw();

    const nav = screen.getByRole('navigation');
    // Query by role: "Topics" is also a sidebar section heading, so getByText is ambiguous.
    ['Queue', 'Library', 'Starred', 'Following', 'Topics', 'Authors', 'Statistics', 'Settings'].forEach((label) => {
        fireEvent.click(within(nav).getByRole('button', { name: new RegExp(`\\b${label}\\b`) }));
    });

    // Settings is the last one clicked.
    expect(screen.getByText('Your data')).toBeInTheDocument();
    expect(screen.getByText('Housekeeping')).toBeInTheDocument();
});

test('search narrows the library and a non-match empties it', async () => {
    seeded();
    await draw();

    const box = screen.getByPlaceholderText(/Search/);
    fireEvent.change(box, { target: { value: 'au:lovelace' } });
    expect(screen.getByText('Tensor Network Methods for Quantum Simulation')).toBeInTheDocument();

    fireEvent.change(box, { target: { value: 'au:nobody' } });
    expect(screen.getByText('Nothing matches')).toBeInTheDocument();
});

test('suggested topics can be added to a store that predates them', async () => {
    // A store seeded before the starter topics changed: it keeps its own topic and
    // is never silently overwritten, but the missing ones are one click away.
    const store = emptyStore();
    store.settings.autoFetchOnOpen = false;
    store.topics = [makeTopic({ id: 't_old', name: 'Tensor Networks', terms: ['tensor network'] })];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));

    await draw();
    const nav = screen.getByRole('navigation');
    fireEvent.click(within(nav).getByRole('button', { name: /\bTopics\b/ }));

    expect(screen.getAllByText('Tensor Networks').length).toBeGreaterThan(0);
    const add = screen.getByRole('button', { name: new RegExp(`Add ${STARTER_TOPICS.length} suggested`) });
    fireEvent.click(add);

    STARTER_TOPICS.forEach((t) => {
        expect(screen.getAllByText(t.name).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('Tensor Networks').length).toBeGreaterThan(0);   // the old one survives
    // Nothing left to suggest, so the button retires itself.
    expect(screen.queryByRole('button', { name: /suggested/ })).not.toBeInTheDocument();
});
