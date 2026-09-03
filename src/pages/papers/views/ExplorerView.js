import React, { useMemo, useRef, useState } from 'react';

import { usePapers } from '../context';
import { folderPath, folderSubtree, papersInFolder, download, makeFolder } from '../storage';
import { toBibtexAll, toCsv, toMarkdown } from '../bibtex';
import { useDrag, useDropTarget, STREAM_SOURCE } from '../dnd';
import { applyFilters, DEFAULT_FILTERS, SORTS } from '../filters';
import { buildTimeTree, papersUnder, dayShort } from '../timeTree';
import PaperRow from '../components/PaperRow';
import {
    Button, ContextMenu, Count, Empty, IconButton, Modal, Popover, ResizeHandle, Segmented, cx, shortDate,
    useContextMenu, usePref, useResizable, useScrollAnchor,
} from '../ui';

const STREAM_ROOT = 'stream:root';
const NEW_ROOT = 'smart:new';
const NEW_WINDOW_DAYS = 14;
const STARRED_ROOT = 'smart:starred';
const LATER_ROOT = 'smart:later';
const isStream = (id) => typeof id === 'string' && id.startsWith('stream:');
const isSmart = (id) => typeof id === 'string' && id.startsWith('smart:');
const isVirtual = (id) => isStream(id) || isSmart(id);

/** Read/unread/starred for a set of papers, for the chips on a tree row. */
function statsFor(list, states) {
    let unread = 0;
    let queued = 0;
    let read = 0;
    let starred = 0;
    list.forEach((p) => {
        const st = states[p.id] || {};
        const status = st.status || 'unread';
        if (status === 'unread') unread += 1;
        if (status === 'queued' || status === 'reading') queued += 1;
        if (status === 'read') read += 1;
        if (st.starred) starred += 1;
    });
    return { total: list.length, unread, queued, read, starred };
}

/** "12 papers · 5 unread · 3 to read · 4 read" — the long form, for tooltips. */
function describeStats(stats) {
    const parts = [`${stats.total} paper${stats.total === 1 ? '' : 's'}`];
    if (stats.unread) parts.push(`${stats.unread} unread`);
    if (stats.queued) parts.push(`${stats.queued} to read`);
    if (stats.read) parts.push(`${stats.read} read`);
    if (stats.starred) parts.push(`${stats.starred} starred`);
    return parts.join(' · ');
}

/**
 * One chip, not three.
 *
 * A folder's counts are one fact about it — how much is in there and how much
 * of it is still owed — so they read as a single object: cells divided by
 * hairlines inside a shared border, each keyed by a colour that means the same
 * thing here as it does on a card's edge. Cells that would say "0" are absent,
 * so a folder you have finished quietens down to a single number instead of
 * carrying two zeroes around.
 */
function StatChip({ stats, id, selected }) {
    if (!stats.total) {
        return (
            <span className="flex-none rounded-md px-1.5 py-px font-mono text-[9.5px] tabular-nums text-slate-700">0</span>
        );
    }
    const cell = 'flex items-center gap-1 px-1.5 py-px font-mono text-[9.5px] tabular-nums';
    const divide = 'border-l border-slate-700/60';
    return (
        <span
            title={describeStats(stats)}
            className={cx(
                'flex flex-none items-stretch overflow-hidden rounded-md border',
                selected ? 'border-orange-400/40 bg-orange-400/[0.08]' : 'border-slate-700/60 bg-slate-950/50',
            )}
        >
            {stats.unread > 0 && (
                <span data-testid={`unread-chip-${id}`} className={cx(cell, 'text-orange-200')}>
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                    {stats.unread}
                </span>
            )}
            {stats.queued > 0 && (
                <span data-testid={`queued-chip-${id}`} className={cx(cell, 'text-sky-200', stats.unread > 0 && divide)}>
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                    {stats.queued}
                </span>
            )}
            <span className={cx(
                cell,
                (stats.unread > 0 || stats.queued > 0) && divide,
                selected ? 'text-orange-100' : 'text-slate-400',
            )}>
                {stats.total}
            </span>
        </span>
    );
}

// Time-tree keys ("2026-09") carry no namespace of their own, so the Explorer adds
// one — otherwise a month id is indistinguishable from a folder id.
const streamId = (key) => `stream:${key}`;
const streamKey = (id) => String(id).slice('stream:'.length);

const SPRING_MS = 300;

/**
 * A source-tree sidebar and a file list, the way an editor does it: the tree carries
 * only folders — each with a count chip rather than its papers — so the list gets the
 * screen.
 *
 * Dragging is where the work happens. Hold a drag over a folder and it springs open
 * after a moment, revealing its subfolders, and a "+ New folder" target appears on it
 * so you can file into a folder that does not exist yet. Ctrl (or Cmd, or Alt) copies
 * instead of moving; papers dragged out of the read-only Stream always copy.
 */
export default function ExplorerView({ selection, setSelection, openId, setOpenId }) {
    const { folders, papers, paperList, dispatch, notify, states, topics, followedIds } = usePapers();
    const { startFolderDrag, endDrag, draggingPapers, draggingFolder } = useDrag();

    const [selectedId, setSelectedId] = useState(STREAM_ROOT);
    const [collapsed, setCollapsed] = usePref('explorerSidebarCollapsed', false);
    // Room to breathe on a wide screen; on a small one the list still wins.
    const sidebar = useResizable({
        key: 'explorerSidebarWidth',
        initial: 256,
        min: 160,
        max: () => Math.max(240, Math.min(720, window.innerWidth - 480)),
        edge: 'right',
    });
    const [expanded, setExpanded] = useState(() => new Set([STREAM_ROOT]));
    // Filed by arrival, so a fetch always lands under Today and the tree agrees
    // with the Stream about what just happened. Publication date is one click
    // away and remembered — it is the better order for looking something up
    // months later, and the worse one for finding what you pulled this morning.
    const [streamBy, setStreamBy] = usePref('explorerStreamBy', 'firstSeen');
    const [renaming, setRenaming] = useState(null);
    const [importOpen, setImportOpen] = useState(false);
    const [recursive, setRecursive] = useState(true);
    const [filters, setFilters] = useState({
        ...DEFAULT_FILTERS,
        // "Newest" means newest *written*, which buries a paper fetched today
        // under one published last week. Arrival order is what a file list
        // should open on.
        sort: 'seen',
        // A file manager shows what is filed; nothing is hidden behind a status here.
        hideDismissed: false,
        hideArchived: false,
    });
    const folderMenu = useContextMenu();
    const paperMenu = useContextMenu();

    // The archive is bucketed by when papers were written, not when they arrived.
    const tree = useMemo(() => buildTimeTree(paperList, streamBy), [paperList, streamBy]);

    /* Everything that reached the library in the last fortnight, newest first. */
    const arrivals = useMemo(() => {
        const cutoff = Date.now() - NEW_WINDOW_DAYS * 864e5;
        return paperList
            .filter((p) => new Date(p.firstSeen || p.published || 0).getTime() >= cutoff)
            .sort((a, b) => String(b.firstSeen || '').localeCompare(String(a.firstSeen || '')));
    }, [paperList]);

    const childrenOfFolder = useMemo(() => {
        const map = new Map();
        folders.forEach((f) => {
            const key = f.parentId || '__root__';
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(f);
        });
        map.forEach((l) => l.sort((a, b) => a.name.localeCompare(b.name)));
        return map;
    }, [folders]);

    const selectedFolder = !isVirtual(selectedId) ? folders.find((f) => f.id === selectedId) : null;
    const crumbs = selectedFolder ? folderPath(folders, selectedFolder.id) : [];

    /** The papers the selected node owns, before any filtering. */
    const scoped = useMemo(() => {
        if (selectedId === NEW_ROOT) return arrivals;
        if (selectedId === STARRED_ROOT) return paperList.filter((p) => (states[p.id] || {}).starred);
        if (selectedId === LATER_ROOT) {
            return paperList.filter((p) => ['queued', 'reading'].includes((states[p.id] || {}).status));
        }
        if (isStream(selectedId)) {
            return selectedId === STREAM_ROOT ? paperList : papersUnder(tree, streamKey(selectedId));
        }
        return Array.from(papersInFolder(folders, selectedId, { recursive }))
            .map((id) => papers[id])
            .filter(Boolean);
    }, [selectedId, tree, folders, papers, paperList, states, recursive, arrivals]);

    // The Explorer runs the same filter engine as the Stream, so `au:`, `ti:`, `tag:`
    // and `is:` mean the same thing in both places.
    const visible = useMemo(
        () => applyFilters(scoped, states, filters, { folders, followedIds }),
        [scoped, states, filters, folders, followedIds],
    );

    /* ----------------------------------------------------------- actions --- */

    const expand = (id) => setExpanded((s) => new Set(s).add(id));
    const toggle = (id) => setExpanded((s) => {
        const n = new Set(s);
        if (n.has(id)) n.delete(id); else n.add(id);
        return n;
    });

    const newFolder = (parentId = null, paperIds = []) => {
        const taken = new Set(folders.map((f) => f.name));
        let name = 'New folder';
        let n = 2;
        while (taken.has(name)) { name = `New folder ${n}`; n += 1; }
        const folder = makeFolder({ name, parentId, paperIds });
        dispatch({ type: 'FOLDER_ADD', folder });
        if (parentId) expand(parentId);
        setSelectedId(folder.id);
        setRenaming(folder.id);
        return folder;
    };

    const fileInto = (folderId, ids, { source, copy }) => {
        dispatch({
            type: 'FOLDER_FILE_PAPERS',
            id: folderId,
            paperIds: ids,
            from: copy || source === STREAM_SOURCE ? null : source,
        });
        const name = (folders.find((f) => f.id === folderId) || {}).name;
        notify(`${ids.length} paper${ids.length === 1 ? '' : 's'} ${copy ? 'copied' : 'moved'} to ${name}`);
        setSelection(new Set());
    };

    /** Drop onto the "+ New folder" affordance: create it, then put them straight in. */
    const fileIntoNew = (parentId, ids) => {
        const folder = newFolder(parentId, ids);
        notify(`${ids.length} paper${ids.length === 1 ? '' : 's'} filed in ${folder.name}`);
        setSelection(new Set());
    };

    const exportAs = (fmt, list = visible, label = 'papers') => {
        if (!list.length) { notify('Nothing to export'); return; }
        const stamp = label.replace(/[^\w-]+/g, '-').toLowerCase();
        if (fmt === 'bib') download(`${stamp}.bib`, toBibtexAll(list), 'text/plain');
        if (fmt === 'csv') download(`${stamp}.csv`, toCsv(list, states), 'text/csv');
        if (fmt === 'md') download(`${stamp}.md`, toMarkdown(list, states), 'text/markdown');
    };

    /* ---------------------------------------------------------- the tree --- */

    const streamNodes = () => tree.map((m) => ({
        id: streamId(m.key),
        name: m.label,
        stats: statsFor(m.weeks.flatMap((w) => w.days.flatMap((d) => d.papers)), states),
        readOnly: true,
        children: () => m.weeks.map((w) => ({
            id: streamId(w.key),
            name: w.label,
            stats: statsFor(w.days.flatMap((d) => d.papers), states),
            readOnly: true,
            children: () => w.days.map((d) => ({
                id: streamId(d.key),
                name: dayShort(d.iso),
                stats: statsFor(d.papers, states),
                readOnly: true,
                children: null,
            })),
        })),
    }));

    const folderNodes = (parentId) => (childrenOfFolder.get(parentId || '__root__') || []).map((f) => ({
        id: f.id,
        name: f.name,
        stats: statsFor(
            Array.from(papersInFolder(folders, f.id)).map((id) => papers[id]).filter(Boolean),
            states,
        ),
        readOnly: false,
        children: () => folderNodes(f.id),
    }));

    const starred = paperList.filter((p) => (states[p.id] || {}).starred);
    const later = paperList.filter((p) => ['queued', 'reading'].includes((states[p.id] || {}).status));

    // Saved views, then the read-only archive, then the folders you maintain — the
    // two things you cannot edit sit together, above everything that is yours.
    const smartRoots = [
        // First, because "what just came in" is the question asked most often and
        // the one the date tree below answers worst: a paper written in 2017 and
        // added this morning files nine years down.
        {
            id: NEW_ROOT,
            name: 'Recently added',
            hint: `${NEW_WINDOW_DAYS}d`,
            stats: statsFor(arrivals, states),
            readOnly: true,
            icon: '\u2726',
        },
        { id: STARRED_ROOT, name: 'Starred', stats: statsFor(starred, states), readOnly: true, smart: true, icon: '★' },
        { id: LATER_ROOT, name: 'Read later', stats: statsFor(later, states), readOnly: true, smart: true, icon: '\u{1F553}' },
    ];

    const userRoots = folderNodes(null);

    const streamRoot = {
        id: STREAM_ROOT,
        name: 'Stream',
        toggleLabel: streamBy === 'published' ? 'written' : 'arrived',
        toggleTitle: streamBy === 'published'
            ? 'Filed by publication date — click to file by when papers arrived'
            : 'Filed by arrival — click to file by publication date',
        onToggleHint: () => setStreamBy(streamBy === 'published' ? 'firstSeen' : 'published'),
        stats: statsFor(paperList, states),
        readOnly: true,
        icon: '\u{1F4E1}',
        children: streamNodes,
    };

    /** Dropping on a smart folder applies its meaning to the papers. */
    const applySmart = (nodeId, ids) => {
        const patch = nodeId === STARRED_ROOT ? { starred: true } : { status: 'queued' };
        dispatch({ type: 'PAPER_STATE_BULK', ids, patch });
        notify(`${ids.length} paper${ids.length === 1 ? '' : 's'} ${nodeId === STARRED_ROOT ? 'starred' : 'queued'}`);
        setSelection(new Set());
    };

    const [rootOver, rootDropProps] = useDropTarget({
        accept: 'all',
        onDropFolder: (id) => dispatch({ type: 'FOLDER_MOVE', id, parentId: null }),
    });

    const renderRoot = (node) => (
        <TreeNode
            key={node.id}
            node={node}
            depth={0}
            expanded={expanded}
            onToggle={toggle}
            onExpand={expand}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpenMenu={folderMenu.open}
            renaming={renaming}
            setRenaming={setRenaming}
            dispatch={dispatch}
            onFilePapers={fileInto}
            onFileIntoNew={fileIntoNew}
            onApplySmart={applySmart}
            draggingPapers={draggingPapers}
            draggingFolder={draggingFolder}
            startFolderDrag={startFolderDrag}
            endDrag={endDrag}
        />
    );

    const dragInFlight = !!(draggingPapers || draggingFolder);
    const hideTree = collapsed && !dragInFlight;

    return (
        <div className="flex h-full min-h-0">
            {/* ---------------------------------------------------- sidebar */}
            {/* Collapsed, the tree keeps a rail so the tab still looks like a
                file explorer — and a drag springs it open, because you cannot
                file a paper into folders you cannot see. */}
            {hideTree ? (
                <aside
                    data-testid="folder-rail"
                    className="flex w-9 flex-none flex-col items-center gap-2 border-r border-slate-800 bg-slate-950/30 py-2"
                >
                    <IconButton
                        label="Show folders"
                        data-testid="show-sidebar"
                        onClick={() => setCollapsed(false)}
                        className="text-[13px] leading-none"
                    >
                        »
                    </IconButton>
                    <IconButton
                        label="New folder"
                        onClick={() => { setCollapsed(false); newFolder(null); }}
                        className="text-[13px] leading-none"
                    >
                        +
                    </IconButton>
                    <button
                        type="button"
                        onClick={() => setCollapsed(false)}
                        className="mt-1 rotate-180 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-600 transition-colors hover:text-slate-300 [writing-mode:vertical-rl]"
                    >
                        Folders
                    </button>
                </aside>
            ) : (
            <aside
                style={{ '--tree-w': `${sidebar.width}px` }}
                className="relative flex w-[var(--tree-w)] flex-none flex-col border-r border-slate-800 bg-slate-950/30"
            >
                <ResizeHandle
                    side="right"
                    dragging={sidebar.dragging}
                    title="Drag to resize · double-click to reset"
                    {...sidebar.handleProps}
                />
                <div className="flex flex-none items-center gap-1 px-3 py-2">
                    <h2 className="flex-1 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Folders
                    </h2>
                    <button
                        type="button"
                        title="New folder"
                        data-testid="new-folder"
                        onClick={() => newFolder(null)}
                        className="rounded px-1 text-[13px] leading-none text-slate-500 transition hover:bg-white/5 hover:text-orange-300"
                    >
                        +
                    </button>
                    <button
                        type="button"
                        title="Hide folders"
                        data-testid="hide-sidebar"
                        onClick={() => setCollapsed(true)}
                        className="rounded px-1 text-[13px] leading-none text-slate-500 transition hover:bg-white/5 hover:text-orange-300"
                    >
                        «
                    </button>
                </div>

                <div
                    {...rootDropProps}
                    className={cx('min-h-0 flex-1 overflow-y-auto px-1.5 pb-3', rootOver && 'pr-drop-target')}
                    onContextMenu={(e) => { if (e.target === e.currentTarget) folderMenu.open(e, null); }}
                >
                    {smartRoots.map(renderRoot)}

                    {/* The archive sits between the saved views and your own folders,
                        bracketed by rules because it behaves unlike either: read-only,
                        and organised by date rather than by you. */}
                    <Separator />
                    {renderRoot(streamRoot)}
                    <Separator />

                    {userRoots.map(renderRoot)}
                </div>

                {dragInFlight && (
                    <div className="flex-none border-t border-slate-800 px-3 py-2 text-[10px] leading-relaxed text-orange-300/80">
                        Hold over a folder to open it &middot; <kbd className="font-mono">Ctrl</kbd> to copy
                    </div>
                )}
            </aside>
            )}

            {/* ------------------------------------------------------- files */}
            <FileList
                selectedId={selectedId}
                selectedFolder={selectedFolder}
                crumbs={crumbs}
                visible={visible}
                stats={statsFor(visible, states)}
                filters={filters}
                setFilters={setFilters}
                topics={topics}
                scopedCount={scoped.length}
                recursive={recursive}
                setRecursive={setRecursive}
                selection={selection}
                setSelection={setSelection}
                openId={openId}
                setOpenId={setOpenId}
                onFilePapers={fileInto}
                onPaperMenu={paperMenu.open}
                onExport={exportAs}
                onImport={() => setImportOpen(true)}
                onSelectFolder={setSelectedId}
            />

            {/* ------------------------------------------------------- menus */}
            <ContextMenu
                menu={folderMenu.menu}
                onClose={folderMenu.close}
                items={(node) => {
                    if (!node) return [{ label: 'New folder', icon: '+', onSelect: () => newFolder(null) }];
                    if (node.smart) {
                        const list = node.id === STARRED_ROOT
                            ? paperList.filter((p) => (states[p.id] || {}).starred)
                            : paperList.filter((p) => ['queued', 'reading'].includes((states[p.id] || {}).status));
                        return [
                            { label: `Export ${list.length} as BibTeX`, icon: '⇩', onSelect: () => exportAs('bib', list, node.name) },
                            { separator: true },
                            { label: 'Updates itself from your reading', icon: '★', disabled: true, onSelect: () => {} },
                        ];
                    }
                    if (node.readOnly) {
                        const list = node.id === STREAM_ROOT ? paperList : papersUnder(tree, streamKey(node.id));
                        return [
                            { label: `Export ${list.length} as BibTeX`, icon: '⇩', onSelect: () => exportAs('bib', list, node.name) },
                            { label: 'Export as CSV', icon: '⇩', onSelect: () => exportAs('csv', list, node.name) },
                            { separator: true },
                            { label: 'Stream folders are read-only', icon: '\u{1F512}', disabled: true, onSelect: () => {} },
                        ];
                    }
                    return [
                        { label: 'New subfolder', icon: '+', onSelect: () => newFolder(node.id) },
                        { label: 'Rename', icon: '✎', hint: 'dbl-click', onSelect: () => setRenaming(node.id) },
                        { separator: true },
                        {
                            label: 'Export BibTeX',
                            icon: '⇩',
                            onSelect: () => exportAs('bib', Array.from(papersInFolder(folders, node.id)).map((i) => papers[i]).filter(Boolean), node.name),
                        },
                        { separator: true },
                        {
                            label: 'Delete folder',
                            icon: '\u{1F5D1}',
                            danger: true,
                            onSelect: () => {
                                const kids = folderSubtree(folders, node.id).length - 1;
                                // eslint-disable-next-line no-alert
                                if (window.confirm(`Delete "${node.name}"${kids ? ` and its ${kids} subfolder(s)` : ''}? Papers stay in your library.`)) {
                                    dispatch({ type: 'FOLDER_REMOVE', id: node.id });
                                    if (selectedId === node.id) setSelectedId(STREAM_ROOT);
                                }
                            },
                        },
                    ];
                }}
            />

            <ContextMenu
                menu={paperMenu.menu}
                onClose={paperMenu.close}
                items={(paper) => {
                    // The same reading actions as the Stream — triage should not depend
                    // on which tab you happen to be looking at the paper from.
                    const st = states[paper.id] || {};
                    return [
                        { label: 'Open details', icon: '◉', onSelect: () => setOpenId(paper.id) },
                        { label: 'Open on arXiv', icon: '↗', onSelect: () => window.open(`https://arxiv.org/abs/${paper.id}`, '_blank', 'noreferrer') },
                        { label: 'Open PDF', icon: '▤', onSelect: () => window.open(`https://arxiv.org/pdf/${paper.id}`, '_blank', 'noreferrer') },
                        { separator: true },
                        {
                            label: st.starred ? 'Unstar' : 'Star',
                            icon: '★',
                            onSelect: () => dispatch({ type: 'PAPER_STATE', id: paper.id, patch: { starred: !st.starred } }),
                        },
                        {
                            label: st.status === 'read' ? 'Mark unread' : 'Mark read',
                            icon: '✓',
                            onSelect: () => dispatch({ type: 'PAPER_STATE', id: paper.id, patch: { status: st.status === 'read' ? 'unread' : 'read' } }),
                        },
                        {
                            label: st.status === 'queued' ? 'Remove from queue' : 'Read later',
                            icon: '🕓',
                            onSelect: () => dispatch({ type: 'PAPER_STATE', id: paper.id, patch: { status: st.status === 'queued' ? 'unread' : 'queued' } }),
                        },
                        ...(selectedFolder ? [
                            { separator: true },
                            {
                                label: 'Remove from folder',
                                icon: '⊘',
                                danger: true,
                                onSelect: () => dispatch({ type: 'FOLDER_REMOVE_PAPERS', id: selectedFolder.id, paperIds: [paper.id] }),
                            },
                        ] : []),
                    ];
                }}
            />

            <ImportModal
                open={importOpen}
                onClose={() => setImportOpen(false)}
                folder={selectedFolder}
                paperList={paperList}
                onFile={(ids) => { if (selectedFolder) fileInto(selectedFolder.id, ids, { copy: true }); setImportOpen(false); }}
            />
        </div>
    );
}

const Separator = () => <div data-testid="tree-separator" className="my-1.5 h-px bg-slate-800" />;

/* ----------------------------------------------------------------- tree node */

function TreeNode({
    node, depth, expanded, onToggle, onExpand, selectedId, onSelect, onOpenMenu,
    renaming, setRenaming, dispatch, onFilePapers, onFileIntoNew, onApplySmart,
    draggingPapers, draggingFolder, startFolderDrag, endDrag,
}) {
    const isOpen = expanded.has(node.id);
    const isSel = selectedId === node.id;
    const stats = node.stats || { total: 0, unread: 0, read: 0, starred: 0 };
    const kids = node.children ? node.children() : null;
    const hasKids = !!(kids && kids.length);
    const springTimer = useRef(null);
    const [sprung, setSprung] = useState(false);

    // Smart folders accept papers even though they are read-only in every other sense:
    // the drop sets state rather than filing.
    const [over, dropProps] = useDropTarget({
        accept: node.smart ? 'papers' : 'all',
        disabled: node.readOnly && !node.smart,
        onDropPapers: (ids, meta) => (node.smart ? onApplySmart(node.id, ids) : onFilePapers(node.id, ids, meta)),
        onDropFolder: (id) => dispatch({ type: 'FOLDER_MOVE', id, parentId: node.id }),
    });

    // Hovering a folder mid-drag opens it after a beat, and reveals a target for
    // filing into a folder that does not exist yet.
    const armSpring = () => {
        if (springTimer.current || node.readOnly || node.smart) return;
        springTimer.current = setTimeout(() => {
            springTimer.current = null;
            if (hasKids) onExpand(node.id);
            setSprung(true);
        }, SPRING_MS);
    };
    const disarmSpring = () => {
        clearTimeout(springTimer.current);
        springTimer.current = null;
        setSprung(false);
    };

    const droppable = (node.smart && draggingPapers) || (!node.readOnly && (draggingPapers || draggingFolder));

    return (
        <div>
            <div
                {...dropProps}
                data-testid={`folder-node-${node.id}`}
                draggable={!node.readOnly}
                onDragStart={(e) => !node.readOnly && startFolderDrag(e, node.id, node.name)}
                onDragEnd={() => { endDrag(); disarmSpring(); }}
                onDragEnter={(e) => { if (dropProps.onDragEnter) dropProps.onDragEnter(e); armSpring(); }}
                onDragLeave={(e) => { if (dropProps.onDragLeave) dropProps.onDragLeave(e); disarmSpring(); }}
                onDrop={(e) => { if (dropProps.onDrop) dropProps.onDrop(e); disarmSpring(); }}
                onClick={() => { onSelect(node.id); if (hasKids) onToggle(node.id); }}
                onDoubleClick={() => !node.readOnly && !node.smart && setRenaming(node.id)}
                onContextMenu={(e) => onOpenMenu(e, node)}
                style={{ paddingLeft: `${depth * 12 + 6}px` }}
                className={cx(
                    'group relative flex cursor-pointer items-center gap-1 rounded-md py-[5px] pr-1.5 text-[12.5px] transition',
                    isSel ? 'bg-orange-400/[0.15] text-orange-100' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
                    droppable && !over && 'pr-droppable',
                    over && 'pr-drop-target',
                )}
            >
                <span
                    onClick={(e) => { e.stopPropagation(); if (hasKids) onToggle(node.id); }}
                    className={cx(
                        'w-3 flex-none text-center text-[8px] text-slate-600 transition',
                        !hasKids && 'invisible',
                    )}
                >
                    {isOpen ? '▼' : '▶'}
                </span>

                <span className="flex-none text-[11px]">
                    {node.icon || (node.readOnly ? '\u{1F5D3}' : (isOpen && hasKids ? '\u{1F4C2}' : '\u{1F4C1}'))}
                </span>

                {renaming === node.id ? (
                    <input
                        autoFocus
                        defaultValue={node.name}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v) dispatch({ type: 'FOLDER_UPDATE', id: node.id, patch: { name: v } });
                            setRenaming(null);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') e.target.blur();
                            if (e.key === 'Escape') setRenaming(null);
                        }}
                        className="min-w-0 flex-1 rounded border border-orange-400/60 bg-slate-950 px-1 text-[12.5px] text-slate-100 outline-none"
                    />
                ) : (
                    <span className="min-w-0 flex-1 truncate">
                        {node.name}
                        {node.hint && <span className="ml-1.5 text-[9px] text-slate-600">{node.hint}</span>}
                    </span>
                )}

                {/* Outside the truncating name, or a narrow sidebar clips it out of
                    reach — a control you cannot click is worse than no control. */}
                {node.onToggleHint && (
                    <button
                        type="button"
                        data-testid="stream-by"
                        title={node.toggleTitle}
                        onClick={(e) => { e.stopPropagation(); node.onToggleHint(); }}
                        className="flex-none rounded px-1 py-0.5 text-[9px] text-slate-500 underline decoration-dotted underline-offset-2 transition-colors hover:bg-white/5 hover:text-orange-300"
                    >
                        {node.toggleLabel}
                    </button>
                )}

                {/* Counts a folder, never lists it. */}
                <StatChip stats={stats} id={node.id} selected={isSel} />

                {sprung && draggingPapers && (
                    <NewFolderDropTarget onDrop={(ids) => onFileIntoNew(node.id, ids)} />
                )}
            </div>

            {isOpen && hasKids && (
                <div>
                    {kids.map((child) => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            expanded={expanded}
                            onToggle={onToggle}
                            onExpand={onExpand}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            onOpenMenu={onOpenMenu}
                            renaming={renaming}
                            setRenaming={setRenaming}
                            dispatch={dispatch}
                            onFilePapers={onFilePapers}
                            onFileIntoNew={onFileIntoNew}
                            onApplySmart={onApplySmart}
                            draggingPapers={draggingPapers}
                            draggingFolder={draggingFolder}
                            startFolderDrag={startFolderDrag}
                            endDrag={endDrag}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/** The "+ New folder" bubble that appears on a folder you have hovered mid-drag. */
function NewFolderDropTarget({ onDrop }) {
    const [over, dropProps] = useDropTarget({ onDropPapers: (ids) => onDrop(ids) });
    return (
        <span
            {...dropProps}
            data-testid="drop-new-folder"
            className={cx(
                'pr-pop absolute right-1 top-1/2 z-20 -translate-y-1/2 whitespace-nowrap rounded-full border px-2 py-0.5 text-[9.5px] font-medium',
                over
                    ? 'border-orange-300 bg-orange-400 text-slate-950'
                    : 'border-orange-400/60 bg-slate-900 text-orange-300',
            )}
        >
            + New folder
        </span>
    );
}

/* ------------------------------------------------------------------ file list */

function FileList({
    selectedId, selectedFolder, crumbs, visible, stats, filters, setFilters, topics, scopedCount,
    recursive, setRecursive, selection, setSelection,
    openId, setOpenId, onFilePapers, onPaperMenu, onExport, onImport, onSelectFolder,
}) {
    const { draggingPapers } = useDrag();
    const readOnly = !selectedFolder;
    // Same reflow as the Stream when the detail panel opens beside this list.
    const [listRef, holdScroll] = useScrollAnchor(openId);

    const [over, dropProps] = useDropTarget({
        disabled: readOnly,
        onDropPapers: (ids, meta) => onFilePapers(selectedFolder.id, ids, meta),
    });

    const name = selectedFolder ? selectedFolder.name
        : selectedId === STARRED_ROOT ? 'Starred'
            : selectedId === LATER_ROOT ? 'Read later'
                : 'Stream';

    return (
        <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex flex-none flex-wrap items-center gap-3 border-b border-slate-800 px-5 py-2.5">
                <div className="min-w-0">
                    {crumbs.length > 1 && (
                        <nav className="flex items-center gap-1 text-[10px] text-slate-600">
                            {crumbs.slice(0, -1).map((b) => (
                                <React.Fragment key={b.id}>
                                    <button type="button" onClick={() => onSelectFolder(b.id)} className="transition hover:text-orange-300">
                                        {b.name}
                                    </button>
                                    <span>/</span>
                                </React.Fragment>
                            ))}
                        </nav>
                    )}
                    <h2 className="flex items-center gap-2 text-[14px] font-semibold text-slate-100">
                        {name}
                        {readOnly && (
                            <span className="rounded-full border border-slate-700 px-1.5 py-0.5 text-[9px] font-normal text-slate-500">
                                read-only
                            </span>
                        )}
                    </h2>
                    {/* The sidebar chip is a glance; here there is room to say it in
                        words, so the same three numbers are readable without hovering. */}
                    <p
                        data-testid="folder-summary"
                        className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500"
                    >
                        <span>{visible.length} paper{visible.length === 1 ? '' : 's'}</span>
                        {stats && stats.unread > 0 && (
                            <span className="flex items-center gap-1 text-orange-200/80">
                                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                                {stats.unread} unread
                            </span>
                        )}
                        {stats && stats.queued > 0 && (
                            <span className="flex items-center gap-1 text-sky-200/80">
                                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                                {stats.queued} to read
                            </span>
                        )}
                        {stats && stats.read > 0 && <span>{stats.read} read</span>}
                        {selectedFolder && <span>created {shortDate(selectedFolder.createdAt)}</span>}
                    </p>
                </div>
                <div className="flex-1" />
                {selectedFolder && <Button size="sm" onClick={onImport}>Import</Button>}
                <Button size="sm" onClick={() => onExport('bib', visible, name)}>BibTeX</Button>
            </header>

            <FilterBar
                filters={filters}
                setFilters={setFilters}
                topics={topics}
                total={scopedCount}
                shown={visible.length}
                recursive={recursive}
                setRecursive={setRecursive}
                showRecursive={!!selectedFolder}
            />

            {selection.size > 0 && selectedFolder && (
                <div className="flex flex-none items-center gap-2 border-b border-orange-400/25 bg-orange-400/[0.07] px-5 py-1.5">
                    <span className="text-[11px] text-orange-200">{selection.size} selected</span>
                    <div className="flex-1" />
                    <Button size="sm" variant="quiet" onClick={() => setSelection(new Set())}>Clear</Button>
                </div>
            )}

            <div
                {...dropProps}
                ref={listRef}
                data-testid="folder-drop-pane"
                className={cx(
                    'min-h-0 flex-1 overflow-y-auto px-5 py-3',
                    !readOnly && draggingPapers && !over && 'pr-droppable',
                    over && 'pr-drop-target',
                )}
            >
                {visible.length ? (
                    <div className="space-y-1.5">
                        {visible.map((p) => (
                            <PaperRow
                                key={p.id}
                                paper={p}
                                dragSource={selectedFolder ? selectedFolder.id : STREAM_SOURCE}
                                selected={selection.has(p.id)}
                                focused={openId === p.id}
                                selectionIds={Array.from(selection)}
                                onToggleSelect={() => setSelection((s) => {
                                    const n = new Set(s);
                                    if (n.has(p.id)) n.delete(p.id); else n.add(p.id);
                                    return n;
                                })}
                                onOpen={() => { holdScroll(); setOpenId(openId === p.id ? null : p.id); }}
                                onContextMenu={(e) => onPaperMenu(e, p)}
                            />
                        ))}
                    </div>
                ) : (
                    <Empty
                        icon="◦"
                        title={scopedCount ? 'Nothing matches these filters' : readOnly ? 'Nothing here yet' : 'This folder is empty'}
                        className="border-slate-800 !py-12"
                    >
                        {scopedCount
                            ? `${scopedCount} paper${scopedCount === 1 ? '' : 's'} here — loosen the filters above to see them.`
                            : readOnly
                                ? 'Fetch some papers and they appear here by date.'
                                : 'Drag papers in from the Stream, or from anywhere in this list.'}
                    </Empty>
                )}
            </div>
        </div>
    );
}


/* ----------------------------------------------------------------- filter bar */

const STATES = [
    { id: 'unread', label: 'Unread', statuses: ['unread'] },
    { id: 'queued', label: 'Queue', statuses: ['queued', 'reading'] },
    { id: 'read', label: 'Read', statuses: ['read'] },
];

/**
 * One row, read left to right: what you are looking for, then which slice, then how
 * it is ordered, then how much of it there is.
 *
 * The three kinds of filter are visually distinct rather than an undifferentiated run
 * of pills — reading state is a segmented group, and topics collapse into a popover so
 * four long names do not eat the row.
 */
function FilterBar({ filters, setFilters, topics, total, shown, recursive, setRecursive, showRecursive }) {
    const patch = (p) => setFilters((f) => ({ ...f, ...p }));

    const stateActive = (o) => filters.statuses.length === o.statuses.length
        && o.statuses.every((x) => filters.statuses.includes(x));

    const toggleTopic = (id) => patch({
        topicIds: filters.topicIds.includes(id)
            ? filters.topicIds.filter((t) => t !== id)
            : [...filters.topicIds, id],
    });

    const dirty = filters.query.trim() || filters.statuses.length || filters.starredOnly
        || filters.topicIds.length || filters.followedOnly;

    return (
        <div className="flex flex-none flex-wrap items-center gap-2 border-b border-slate-800 px-5 py-2">
            <div className="relative">
                <input
                    value={filters.query}
                    onChange={(e) => patch({ query: e.target.value })}
                    placeholder="Filter by title, author, tag..."
                    aria-label="Filter papers"
                    data-testid="explorer-filter"
                    className="w-60 rounded-lg border border-slate-700 bg-slate-950/60 py-1 pl-7 pr-2 text-[11.5px] text-slate-100 placeholder:text-slate-600 outline-none transition-colors focus:border-orange-400/60"
                />
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] leading-none text-slate-600">⌕</span>
            </div>

            <Segmented
                options={[
                    ...STATES.map((o) => ({ ...o, testId: `explorer-state-${o.id}` })),
                    { id: 'starred', label: '★', title: 'Starred only', testId: 'explorer-state-starred' },
                    { id: 'followed', label: 'Followed', title: 'By authors you follow', testId: 'explorer-state-followed' },
                ]}
                isActive={(o) => (o.id === 'starred' ? filters.starredOnly
                    : o.id === 'followed' ? filters.followedOnly
                        : stateActive(o))}
                onToggle={(o) => {
                    if (o.id === 'starred') { patch({ starredOnly: !filters.starredOnly }); return; }
                    if (o.id === 'followed') { patch({ followedOnly: !filters.followedOnly }); return; }
                    patch({ statuses: stateActive(o) ? [] : o.statuses });
                }}
            />

            {topics.length > 0 && (
                <Popover
                    width="w-64"
                    trigger={({ open, toggle }) => (
                        <button
                            type="button"
                            onClick={toggle}
                            data-testid="explorer-topics"
                            className={cx(
                                'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition',
                                filters.topicIds.length || open
                                    ? 'border-orange-400/40 bg-orange-400/[0.12] text-orange-200'
                                    : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:text-slate-200',
                            )}
                        >
                            Topics
                            {filters.topicIds.length > 0 && (
                                <span className="rounded-full bg-orange-400/25 px-1.5 font-mono text-[9px]">
                                    {filters.topicIds.length}
                                </span>
                            )}
                            <span className="text-[8px] opacity-60">▾</span>
                        </button>
                    )}
                >
                    {() => (
                        <>
                            {topics.map((t) => {
                                const on = filters.topicIds.includes(t.id);
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        data-testid={`explorer-topic-${t.id}`}
                                        onClick={() => toggleTopic(t.id)}
                                        className={cx(
                                            'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11.5px] transition',
                                            on ? 'bg-orange-400/[0.12] text-orange-100' : 'text-slate-300 hover:bg-white/5',
                                        )}
                                    >
                                        <span className="h-2 w-2 flex-none rounded-full" style={{ backgroundColor: t.color }} />
                                        <span className="min-w-0 flex-1 truncate">{t.name}</span>
                                        {on && <span className="flex-none text-[10px] text-orange-300">✓</span>}
                                    </button>
                                );
                            })}
                            {filters.topicIds.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => patch({ topicIds: [] })}
                                    className="mt-1 w-full border-t border-slate-800 pt-1.5 text-[10.5px] text-slate-500 transition hover:text-orange-300"
                                >
                                    clear topics
                                </button>
                            )}
                        </>
                    )}
                </Popover>
            )}

            {showRecursive && (
                <button
                    type="button"
                    data-testid="explorer-recursive"
                    onClick={() => setRecursive(!recursive)}
                    title="Include papers filed in subfolders"
                    className={cx(
                        'rounded-lg border px-2.5 py-1 text-[11px] font-medium transition',
                        recursive
                            ? 'border-orange-400/40 bg-orange-400/[0.12] text-orange-200'
                            : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:text-slate-200',
                    )}
                >
                    Subfolders
                </button>
            )}

            <div className="flex-1" />

            <label className="flex items-center gap-1.5 text-[10px] text-slate-600">
                Sort
                <select
                    value={filters.sort}
                    onChange={(e) => patch({ sort: e.target.value })}
                    aria-label="Sort papers"
                    data-testid="explorer-sort"
                    className="rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1 text-[11px] text-slate-300 outline-none focus:border-orange-400/60"
                >
                    {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
            </label>

            <Count data-testid="explorer-count" className="tabular-nums">
                {shown === total ? `${total} paper${total === 1 ? '' : 's'}` : `${shown} of ${total}`}
            </Count>

            {dirty && (
                <button
                    type="button"
                    data-testid="explorer-clear"
                    onClick={() => setFilters((f) => ({
                        ...f, query: '', statuses: [], topicIds: [], tags: [], starredOnly: false, followedOnly: false,
                    }))}
                    className="rounded-lg border border-slate-700 px-2 py-1 text-[10.5px] text-slate-500 transition hover:border-orange-400/40 hover:text-orange-300"
                >
                    Clear
                </button>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------- import */

function ImportModal({ open, onClose, folder, paperList, onFile }) {
    const [text, setText] = useState('');

    const ids = useMemo(() => {
        const found = new Set();
        const re = /(\d{4}\.\d{4,5})(?:v\d+)?/g;
        let m;
        while ((m = re.exec(text)) !== null) found.add(m[1]);
        return Array.from(found);
    }, [text]);

    const known = ids.filter((id) => paperList.some((p) => p.id === id));
    const unknown = ids.filter((id) => !known.includes(id));

    return (
        <Modal
            open={open}
            onClose={onClose}
            width="max-w-lg"
            title={`Import into ${folder ? folder.name : 'folder'}`}
            subtitle="Paste arXiv ids, links, or the contents of a .bib file."
            footer={
                <>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button variant="primary" disabled={!known.length} onClick={() => onFile(known)}>
                        File {known.length || ''} paper{known.length === 1 ? '' : 's'}
                    </Button>
                </>
            }
        >
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={7}
                placeholder={'2608.11111\nhttps://arxiv.org/abs/2601.04242\n@article{...eprint = {2512.09876}...}'}
                className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950/60 p-3 font-mono text-[12px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-orange-400/60"
            />
            {ids.length > 0 && (
                <div className="mt-3 space-y-1 text-[11.5px]">
                    <p className="text-emerald-300">{known.length} already in your library &mdash; these will be filed.</p>
                    {unknown.length > 0 && (
                        <p className="text-slate-500">
                            {unknown.length} not in your library yet ({unknown.slice(0, 3).join(', ')}
                            {unknown.length > 3 ? '...' : ''}). Fetch a topic that covers them first.
                        </p>
                    )}
                </div>
            )}
        </Modal>
    );
}
