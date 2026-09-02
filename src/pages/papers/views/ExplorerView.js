import React, { useEffect, useMemo, useRef, useState } from 'react';

import { usePapers } from '../context';
import { folderPath, folderSubtree, papersInFolder, download, makeFolder } from '../storage';
import { toBibtexAll, toCsv, toMarkdown } from '../bibtex';
import { useDrag, useDropTarget, STREAM_SOURCE } from '../dnd';
import { buildTimeTree, papersUnder, dayShort } from '../timeTree';
import PaperRow from '../components/PaperRow';
import {
    Button, ContextMenu, Count, Empty, Input, Modal, cx, shortDate, useContextMenu,
} from '../ui';

const STREAM_ROOT = 'stream:root';
const isStream = (id) => typeof id === 'string' && id.startsWith('stream:');

// Time-tree keys ("2026-09", "2026-09|2026-08-31") carry no namespace of their own, so
// the Explorer prefixes them. Without this a month id looks exactly like a folder id
// and the column browser treats it as one.
const streamId = (key) => `stream:${key}`;
const streamKey = (id) => String(id).slice('stream:'.length);

/**
 * A Finder-style column browser.
 *
 * The left-most column holds two roots: **Stream**, a read-only mirror of everything
 * fetched, bucketed Month › Week › Day, and **My folders**, which you own. Selecting
 * a folder opens its children in the next column, so nesting is something you can see
 * and walk rather than a tree you have to unfold in place.
 *
 * Dragging out of the Stream copies; dragging between your own folders moves.
 */
export default function ExplorerView({ selection, setSelection, openId, setOpenId }) {
    const { folders, papers, paperList, dispatch, notify, states } = usePapers();
    const { startFolderDrag, endDrag, draggingPapers, draggingFolder } = useDrag();

    // The path of selected nodes, one per column. `[]` means only the roots show.
    const [path, setPath] = useState([]);
    const [renaming, setRenaming] = useState(null);
    const [query, setQuery] = useState('');
    const [importOpen, setImportOpen] = useState(false);
    const columnsRef = useRef(null);
    const folderMenu = useContextMenu();
    const paperMenu = useContextMenu();

    const tree = useMemo(() => buildTimeTree(paperList), [paperList]);

    /* --------------------------------------------------------- the model --- */

    const streamChildren = useMemo(() => {
        const byKey = new Map();
        byKey.set(STREAM_ROOT, tree.map((m) => ({
            id: streamId(m.key), name: m.label, count: m.count, kind: 'stream', hasChildren: true,
        })));
        tree.forEach((m) => {
            byKey.set(streamId(m.key), m.weeks.map((w) => ({
                id: streamId(w.key), name: w.label, count: w.count, kind: 'stream', hasChildren: true,
            })));
            m.weeks.forEach((w) => {
                byKey.set(streamId(w.key), w.days.map((d) => ({
                    id: streamId(d.key), name: dayShort(d.iso), count: d.count, kind: 'stream', hasChildren: false,
                })));
            });
        });
        return byKey;
    }, [tree]);

    const userChildren = useMemo(() => {
        const map = new Map();
        folders.forEach((f) => {
            const key = f.parentId || '__root__';
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(f);
        });
        map.forEach((l) => l.sort((a, b) => a.name.localeCompare(b.name)));
        return map;
    }, [folders]);

    const folderCounts = useMemo(() => {
        const m = new Map();
        folders.forEach((f) => m.set(f.id, papersInFolder(folders, f.id).size));
        return m;
    }, [folders]);

    /** Entries for a column, given the node selected in the column before it. */
    const childrenOf = (nodeId) => {
        if (nodeId === null) {
            return [
                { id: STREAM_ROOT, name: 'Stream', count: paperList.length, kind: 'stream', hasChildren: tree.length > 0, root: true },
                ...(userChildren.get('__root__') || []).map((f) => ({
                    id: f.id, name: f.name, count: folderCounts.get(f.id) || 0, kind: 'folder',
                    hasChildren: (userChildren.get(f.id) || []).length > 0,
                })),
            ];
        }
        if (isStream(nodeId)) return streamChildren.get(nodeId) || [];
        return (userChildren.get(nodeId) || []).map((f) => ({
            id: f.id, name: f.name, count: folderCounts.get(f.id) || 0, kind: 'folder',
            hasChildren: (userChildren.get(f.id) || []).length > 0,
        }));
    };

    // One column per level, plus a trailing column for the current selection's children.
    const columns = useMemo(() => {
        const cols = [{ parent: null, items: childrenOf(null) }];
        path.forEach((nodeId) => {
            const items = childrenOf(nodeId);
            // A folder of your own always gets a column even when empty — that column
            // is where its "＋ new subfolder" lives. Stream leaves (days) do not.
            const ownFolder = !isStream(nodeId);
            if (items.length || ownFolder) cols.push({ parent: nodeId, items });
        });
        return cols;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path, userChildren, streamChildren, folderCounts, paperList.length, tree.length]);

    useEffect(() => {
        // Keep the newest column in view as the user drills down.
        const el = columnsRef.current;
        if (el) el.scrollLeft = el.scrollWidth;
    }, [columns.length]);

    const selectedId = path.length ? path[path.length - 1] : null;
    const selectedFolder = selectedId && !isStream(selectedId)
        ? folders.find((f) => f.id === selectedId)
        : null;

    const select = (depth, nodeId) => setPath([...path.slice(0, depth), nodeId]);

    /* ---------------------------------------------------------- contents --- */

    const visible = useMemo(() => {
        if (!selectedId) return [];
        const list = isStream(selectedId)
            ? (selectedId === STREAM_ROOT ? paperList : papersUnder(tree, streamKey(selectedId)))
            : Array.from(papersInFolder(folders, selectedId)).map((id) => papers[id]).filter(Boolean);

        const needle = query.trim().toLowerCase();
        return list
            .filter((p) => !needle || p.title.toLowerCase().includes(needle)
                || (p.authors || []).some((a) => a.name.toLowerCase().includes(needle)))
            .sort((a, b) => String(b.published || '').localeCompare(String(a.published || '')));
    }, [selectedId, tree, folders, papers, paperList, query]);

    const crumbs = selectedFolder ? folderPath(folders, selectedFolder.id) : [];

    /* ----------------------------------------------------------- actions --- */

    const newFolder = (parentId = null) => {
        const taken = new Set(folders.map((f) => f.name));
        let name = 'New folder';
        let n = 2;
        while (taken.has(name)) { name = `New folder ${n}`; n += 1; }
        const folder = makeFolder({ name, parentId });
        dispatch({ type: 'FOLDER_ADD', topicless: true, folder });
        setRenaming(folder.id);
        if (parentId) setPath((p) => (p.includes(parentId) ? p : [...p, parentId]));
    };

    const fileInto = (folderId, ids, { source, copy }) => {
        dispatch({
            type: 'FOLDER_FILE_PAPERS',
            id: folderId,
            paperIds: ids,
            from: copy || source === STREAM_SOURCE ? null : source,
        });
        const name = (folders.find((f) => f.id === folderId) || {}).name;
        notify(`${ids.length} paper${ids.length === 1 ? '' : 's'} ${copy ? 'copied' : 'moved'} → ${name}`);
        setSelection(new Set());
    };

    const exportAs = (fmt, list = visible, label = 'papers') => {
        if (!list.length) { notify('Nothing to export'); return; }
        const stamp = label.replace(/[^\w-]+/g, '-').toLowerCase();
        if (fmt === 'bib') download(`${stamp}.bib`, toBibtexAll(list), 'text/plain');
        if (fmt === 'csv') download(`${stamp}.csv`, toCsv(list, states), 'text/csv');
        if (fmt === 'md') download(`${stamp}.md`, toMarkdown(list, states), 'text/markdown');
    };

    /* ------------------------------------------------------------ render --- */

    return (
        <div className="flex h-full min-h-0">
            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex flex-none flex-wrap items-center gap-2 border-b border-slate-800 px-5 py-2.5">
                    <h1 className="text-[13px] font-semibold text-slate-100">Explorer</h1>
                    <Count>{folders.length} folder{folders.length === 1 ? '' : 's'}</Count>
                    <div className="flex-1" />
                    {draggingPapers && (
                        <span className="pr-pulse text-[10.5px] text-orange-300">
                            drop on a folder · hold ⌥ to copy
                        </span>
                    )}
                    <Button size="sm" onClick={() => newFolder(null)} data-testid="new-folder">+ Folder</Button>
                </header>

                {/* ------------------------------------------------- columns */}
                <div
                    ref={columnsRef}
                    data-testid="explorer-columns"
                    className="flex flex-none overflow-x-auto border-b border-slate-800"
                    style={{ height: '42%' }}
                >
                    {columns.map((col, depth) => (
                        <Column
                            key={depth}
                            depth={depth}
                            parent={col.parent}
                            items={col.items}
                            activeId={path[depth]}
                            onSelect={(id) => select(depth, id)}
                            onOpenMenu={folderMenu.open}
                            renaming={renaming}
                            setRenaming={setRenaming}
                            dispatch={dispatch}
                            onNewFolder={newFolder}
                            onFilePapers={fileInto}
                            draggingPapers={draggingPapers}
                            draggingFolder={draggingFolder}
                            startFolderDrag={startFolderDrag}
                            endDrag={endDrag}
                        />
                    ))}
                </div>

                {/* ------------------------------------------------ contents */}
                <ContentsPane
                    selectedId={selectedId}
                    selectedFolder={selectedFolder}
                    crumbs={crumbs}
                    visible={visible}
                    query={query}
                    setQuery={setQuery}
                    selection={selection}
                    setSelection={setSelection}
                    openId={openId}
                    setOpenId={setOpenId}
                    onFilePapers={fileInto}
                    onPaperMenu={paperMenu.open}
                    onExport={exportAs}
                    onImport={() => setImportOpen(true)}
                    onPickFolder={() => setPath([])}
                />
            </div>

            {/* --------------------------------------------------------- menus */}
            <ContextMenu
                menu={folderMenu.menu}
                onClose={folderMenu.close}
                items={(node) => {
                    if (!node) return [{ label: 'New folder', icon: '＋', onSelect: () => newFolder(null) }];
                    if (node.kind === 'stream') {
                        const list = node.id === STREAM_ROOT ? paperList : papersUnder(tree, streamKey(node.id));
                        return [
                            { label: `Export ${list.length} as BibTeX`, icon: '⇩', onSelect: () => exportAs('bib', list, node.name) },
                            { label: 'Export as CSV', icon: '⇩', onSelect: () => exportAs('csv', list, node.name) },
                            { separator: true },
                            { label: 'Stream folders are read-only', icon: '🔒', disabled: true, onSelect: () => {} },
                        ];
                    }
                    return [
                        { label: 'New subfolder', icon: '＋', onSelect: () => newFolder(node.id) },
                        { label: 'Rename', icon: '✎', hint: 'dbl-click', onSelect: () => setRenaming(node.id) },
                        { separator: true },
                        { label: 'Export BibTeX', icon: '⇩', onSelect: () => exportAs('bib', Array.from(papersInFolder(folders, node.id)).map((i) => papers[i]).filter(Boolean), node.name) },
                        { separator: true },
                        {
                            label: 'Delete folder',
                            icon: '🗑',
                            danger: true,
                            onSelect: () => {
                                const kids = folderSubtree(folders, node.id).length - 1;
                                // eslint-disable-next-line no-alert
                                if (window.confirm(`Delete "${node.name}"${kids ? ` and its ${kids} subfolder(s)` : ''}? Papers stay in your library.`)) {
                                    dispatch({ type: 'FOLDER_REMOVE', id: node.id });
                                    setPath((p) => p.slice(0, p.indexOf(node.id)));
                                }
                            },
                        },
                    ];
                }}
            />

            <ContextMenu
                menu={paperMenu.menu}
                onClose={paperMenu.close}
                items={(paper) => [
                    { label: 'Open details', icon: '◉', onSelect: () => setOpenId(paper.id) },
                    { label: 'Open on arXiv', icon: '↗', onSelect: () => window.open(`https://arxiv.org/abs/${paper.id}`, '_blank', 'noreferrer') },
                    ...(selectedFolder ? [
                        { separator: true },
                        {
                            label: 'Remove from folder',
                            icon: '⊘',
                            danger: true,
                            onSelect: () => dispatch({ type: 'FOLDER_REMOVE_PAPERS', id: selectedFolder.id, paperIds: [paper.id] }),
                        },
                    ] : []),
                ]}
            />

            <ImportModal
                open={importOpen}
                onClose={() => setImportOpen(false)}
                folder={selectedFolder}
                paperList={paperList}
                onFile={(ids) => {
                    if (selectedFolder) fileInto(selectedFolder.id, ids, { copy: true });
                    setImportOpen(false);
                }}
            />
        </div>
    );
}

/* -------------------------------------------------------------------- column */

function Column({
    depth, parent, items, activeId, onSelect, onOpenMenu, renaming, setRenaming,
    dispatch, onNewFolder, onFilePapers, draggingPapers, draggingFolder, startFolderDrag, endDrag,
}) {
    const canAdd = parent === null || !isStream(parent);
    const title = depth === 0 ? 'Locations' : null;

    return (
        <div
            data-testid={`explorer-column-${depth}`}
            className="flex h-full w-56 flex-none flex-col border-r border-slate-800"
        >
            <div className="flex flex-none items-center gap-1 px-2 py-1.5">
                <span className="flex-1 truncate text-[9.5px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                    {title || ''}
                </span>
                {canAdd && (
                    <button
                        type="button"
                        title={parent ? 'New subfolder here' : 'New folder'}
                        data-testid={`new-folder-col-${depth}`}
                        onClick={() => onNewFolder(parent)}
                        className="rounded px-1 text-[12px] leading-none text-slate-600 transition hover:bg-white/5 hover:text-orange-300"
                    >
                        ＋
                    </button>
                )}
            </div>

            <ul
                className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2"
                onContextMenu={(e) => { if (e.target === e.currentTarget) onOpenMenu(e, null); }}
            >
                {items.map((node) => (
                    <ColumnRow
                        key={node.id}
                        node={node}
                        active={activeId === node.id}
                        onSelect={() => onSelect(node.id)}
                        onOpenMenu={onOpenMenu}
                        renaming={renaming === node.id}
                        setRenaming={setRenaming}
                        dispatch={dispatch}
                        onFilePapers={onFilePapers}
                        draggingPapers={draggingPapers}
                        draggingFolder={draggingFolder}
                        startFolderDrag={startFolderDrag}
                        endDrag={endDrag}
                    />
                ))}
                {!items.length && (
                    <li className="px-2 py-6 text-center text-[10.5px] leading-relaxed text-slate-700">
                        {canAdd ? 'Empty — use ＋ above' : 'Nothing here'}
                    </li>
                )}
            </ul>
        </div>
    );
}

function ColumnRow({
    node, active, onSelect, onOpenMenu, renaming, setRenaming, dispatch,
    onFilePapers, draggingPapers, draggingFolder, startFolderDrag, endDrag,
}) {
    const readOnly = node.kind === 'stream';

    const [over, dropProps] = useDropTarget({
        accept: 'all',
        disabled: readOnly,
        onDropPapers: (ids, meta) => onFilePapers(node.id, ids, meta),
        onDropFolder: (id) => dispatch({ type: 'FOLDER_MOVE', id, parentId: node.id }),
    });

    // Every valid target is outlined for the whole drag, not only under the pointer,
    // so you can see where a paper *could* go before you go there.
    const droppable = !readOnly && (draggingPapers || draggingFolder);

    return (
        <li>
            <div
                {...dropProps}
                data-testid={`folder-node-${node.id}`}
                draggable={!readOnly}
                onDragStart={(e) => !readOnly && startFolderDrag(e, node.id)}
                onDragEnd={endDrag}
                onClick={onSelect}
                onDoubleClick={() => !readOnly && setRenaming(node.id)}
                onContextMenu={(e) => onOpenMenu(e, node)}
                className={cx(
                    'group flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] transition',
                    active ? 'bg-orange-400/15 text-orange-100' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
                    droppable && !over && 'pr-droppable',
                    over && 'pr-drop-target',
                )}
            >
                <span className="flex-none text-[12px]">
                    {node.root ? '📡' : readOnly ? '🗓' : active ? '📂' : '📁'}
                </span>

                {renaming ? (
                    <input
                        autoFocus
                        defaultValue={node.name}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v) dispatch({ type: 'FOLDER_UPDATE', id: node.id, patch: { name: v } });
                            setRenaming(null);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setRenaming(null); }}
                        className="min-w-0 flex-1 rounded border border-orange-400/60 bg-slate-950 px-1 text-[12px] text-slate-100 outline-none"
                    />
                ) : (
                    <span className="min-w-0 flex-1 truncate">{node.name}</span>
                )}

                <Count>{node.count}</Count>
                {node.hasChildren && <span className="flex-none text-[8px] text-slate-600">▸</span>}
            </div>
        </li>
    );
}

/* ------------------------------------------------------------------ contents */

function ContentsPane({
    selectedId, selectedFolder, crumbs, visible, query, setQuery, selection, setSelection,
    openId, setOpenId, onFilePapers, onPaperMenu, onExport, onImport, onPickFolder,
}) {
    const { draggingPapers } = useDrag();
    const readOnly = !selectedFolder;

    const [over, dropProps] = useDropTarget({
        disabled: readOnly,
        onDropPapers: (ids, meta) => onFilePapers(selectedFolder.id, ids, meta),
    });

    if (!selectedId) {
        return (
            <div className="min-h-0 flex-1 overflow-y-auto p-8">
                <Empty icon="🗂" title="Pick a location">
                    <b className="text-slate-300">Stream</b> mirrors everything fetched, by month, week and
                    day — drag papers out of it to copy them into your own folders. Anything under it is
                    read-only; your folders are yours to rearrange.
                </Empty>
            </div>
        );
    }

    const name = selectedFolder ? selectedFolder.name : 'Stream';

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <header className="flex flex-none flex-wrap items-center gap-3 border-b border-slate-800 px-5 py-2.5">
                <div className="min-w-0">
                    {crumbs.length > 0 && (
                        <nav className="flex items-center gap-1 text-[10px] text-slate-600">
                            <button type="button" onClick={onPickFolder} className="transition hover:text-orange-300">home</button>
                            {crumbs.map((b) => (
                                <React.Fragment key={b.id}><span>/</span><span>{b.name}</span></React.Fragment>
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
                    <p className="text-[11px] text-slate-500">
                        {visible.length} paper{visible.length === 1 ? '' : 's'}
                        {selectedFolder ? ` · created ${shortDate(selectedFolder.createdAt)}` : ''}
                    </p>
                </div>
                <div className="flex-1" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter…" className="!w-36 !py-1 !text-[11.5px]" />
                {selectedFolder && <Button size="sm" onClick={onImport}>Import</Button>}
                <Button size="sm" onClick={() => onExport('bib', visible, name)}>BibTeX</Button>
            </header>

            {selection.size > 0 && selectedFolder && (
                <div className="flex flex-none items-center gap-2 border-b border-orange-400/25 bg-orange-400/[0.07] px-5 py-1.5">
                    <span className="text-[11px] text-orange-200">{selection.size} selected</span>
                    <div className="flex-1" />
                    <Button size="sm" variant="quiet" onClick={() => setSelection(new Set())}>Clear</Button>
                </div>
            )}

            <div
                {...dropProps}
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
                                dense
                                dragSource={selectedFolder ? selectedFolder.id : STREAM_SOURCE}
                                selected={selection.has(p.id)}
                                focused={openId === p.id}
                                selectionIds={Array.from(selection)}
                                onToggleSelect={() => setSelection((s) => {
                                    const n = new Set(s);
                                    if (n.has(p.id)) n.delete(p.id); else n.add(p.id);
                                    return n;
                                })}
                                onOpen={() => setOpenId(openId === p.id ? null : p.id)}
                                onContextMenu={(e) => onPaperMenu(e, p)}
                            />
                        ))}
                    </div>
                ) : (
                    <Empty icon="◦" title={readOnly ? 'Nothing here yet' : 'This folder is empty'} className="border-slate-800 !py-10">
                        {readOnly ? 'Fetch some papers and they will appear here by date.'
                            : 'Drag papers in from the Stream columns above, or from the Stream tab.'}
                    </Empty>
                )}
            </div>
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
                    <p className="text-emerald-300">{known.length} already in your library — these will be filed.</p>
                    {unknown.length > 0 && (
                        <p className="text-slate-500">
                            {unknown.length} not in your library yet ({unknown.slice(0, 3).join(', ')}
                            {unknown.length > 3 ? '…' : ''}). Fetch a topic that covers them first.
                        </p>
                    )}
                </div>
            )}
        </Modal>
    );
}
