import React, { useMemo, useRef, useState } from 'react';

import { usePapers } from '../context';
import { folderPath, folderSubtree, papersInFolder, download, makeFolder } from '../storage';
import { toBibtexAll, toCsv, toMarkdown } from '../bibtex';
import { useDrag, useDropTarget, STREAM_SOURCE } from '../dnd';
import { buildTimeTree, papersUnder, dayShort } from '../timeTree';
import PaperRow from '../components/PaperRow';
import {
    Button, ContextMenu, Empty, Input, Modal, cx, shortDate, useContextMenu,
} from '../ui';

const STREAM_ROOT = 'stream:root';
const isStream = (id) => typeof id === 'string' && id.startsWith('stream:');

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
    const { folders, papers, paperList, dispatch, notify, states } = usePapers();
    const { startFolderDrag, endDrag, draggingPapers, draggingFolder } = useDrag();

    const [selectedId, setSelectedId] = useState(STREAM_ROOT);
    const [expanded, setExpanded] = useState(() => new Set([STREAM_ROOT]));
    const [renaming, setRenaming] = useState(null);
    const [query, setQuery] = useState('');
    const [importOpen, setImportOpen] = useState(false);
    const folderMenu = useContextMenu();
    const paperMenu = useContextMenu();

    const tree = useMemo(() => buildTimeTree(paperList), [paperList]);

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

    const folderCounts = useMemo(() => {
        const m = new Map();
        folders.forEach((f) => m.set(f.id, papersInFolder(folders, f.id).size));
        return m;
    }, [folders]);

    const selectedFolder = !isStream(selectedId) ? folders.find((f) => f.id === selectedId) : null;
    const crumbs = selectedFolder ? folderPath(folders, selectedFolder.id) : [];

    const visible = useMemo(() => {
        const list = isStream(selectedId)
            ? (selectedId === STREAM_ROOT ? paperList : papersUnder(tree, streamKey(selectedId)))
            : Array.from(papersInFolder(folders, selectedId)).map((id) => papers[id]).filter(Boolean);
        const needle = query.trim().toLowerCase();
        return list
            .filter((p) => !needle || p.title.toLowerCase().includes(needle)
                || (p.authors || []).some((a) => a.name.toLowerCase().includes(needle)))
            .sort((a, b) => String(b.published || '').localeCompare(String(a.published || '')));
    }, [selectedId, tree, folders, papers, paperList, query]);

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
        count: m.count,
        readOnly: true,
        children: () => m.weeks.map((w) => ({
            id: streamId(w.key),
            name: w.label,
            count: w.count,
            readOnly: true,
            children: () => w.days.map((d) => ({
                id: streamId(d.key), name: dayShort(d.iso), count: d.count, readOnly: true, children: null,
            })),
        })),
    }));

    const folderNodes = (parentId) => (childrenOfFolder.get(parentId || '__root__') || []).map((f) => ({
        id: f.id,
        name: f.name,
        count: folderCounts.get(f.id) || 0,
        readOnly: false,
        children: () => folderNodes(f.id),
    }));

    const rootNodes = [
        { id: STREAM_ROOT, name: 'Stream', count: paperList.length, readOnly: true, icon: '\u{1F4E1}', children: streamNodes },
        ...folderNodes(null),
    ];

    const [rootOver, rootDropProps] = useDropTarget({
        accept: 'all',
        onDropFolder: (id) => dispatch({ type: 'FOLDER_MOVE', id, parentId: null }),
    });

    return (
        <div className="flex h-full min-h-0">
            {/* ---------------------------------------------------- sidebar */}
            <aside className="flex w-64 flex-none flex-col border-r border-slate-800 bg-slate-950/30">
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
                </div>

                <div
                    {...rootDropProps}
                    className={cx('min-h-0 flex-1 overflow-y-auto px-1.5 pb-3', rootOver && 'pr-drop-target')}
                    onContextMenu={(e) => { if (e.target === e.currentTarget) folderMenu.open(e, null); }}
                >
                    {rootNodes.map((node) => (
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
                            draggingPapers={draggingPapers}
                            draggingFolder={draggingFolder}
                            startFolderDrag={startFolderDrag}
                            endDrag={endDrag}
                        />
                    ))}
                </div>

                {(draggingPapers || draggingFolder) && (
                    <div className="flex-none border-t border-slate-800 px-3 py-2 text-[10px] leading-relaxed text-orange-300/80">
                        Hold over a folder to open it &middot; <kbd className="font-mono">Ctrl</kbd> to copy
                    </div>
                )}
            </aside>

            {/* ------------------------------------------------------- files */}
            <FileList
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
                onSelectFolder={setSelectedId}
            />

            {/* ------------------------------------------------------- menus */}
            <ContextMenu
                menu={folderMenu.menu}
                onClose={folderMenu.close}
                items={(node) => {
                    if (!node) return [{ label: 'New folder', icon: '+', onSelect: () => newFolder(null) }];
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
                onFile={(ids) => { if (selectedFolder) fileInto(selectedFolder.id, ids, { copy: true }); setImportOpen(false); }}
            />
        </div>
    );
}

/* ----------------------------------------------------------------- tree node */

function TreeNode({
    node, depth, expanded, onToggle, onExpand, selectedId, onSelect, onOpenMenu,
    renaming, setRenaming, dispatch, onFilePapers, onFileIntoNew,
    draggingPapers, draggingFolder, startFolderDrag, endDrag,
}) {
    const isOpen = expanded.has(node.id);
    const isSel = selectedId === node.id;
    const kids = node.children ? node.children() : null;
    const hasKids = !!(kids && kids.length);
    const springTimer = useRef(null);
    const [sprung, setSprung] = useState(false);

    const [over, dropProps] = useDropTarget({
        accept: 'all',
        disabled: node.readOnly,
        onDropPapers: (ids, meta) => onFilePapers(node.id, ids, meta),
        onDropFolder: (id) => dispatch({ type: 'FOLDER_MOVE', id, parentId: node.id }),
    });

    // Hovering a folder mid-drag opens it after a beat, and reveals a target for
    // filing into a folder that does not exist yet.
    const armSpring = () => {
        if (springTimer.current || node.readOnly) return;
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

    const droppable = !node.readOnly && (draggingPapers || draggingFolder);

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
                onDoubleClick={() => !node.readOnly && setRenaming(node.id)}
                onContextMenu={(e) => onOpenMenu(e, node)}
                style={{ paddingLeft: `${depth * 12 + 6}px` }}
                className={cx(
                    'group relative flex cursor-pointer items-center gap-1 rounded-md py-[5px] pr-1.5 text-[12.5px] transition',
                    isSel ? 'bg-orange-400/15 text-orange-100' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
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
                    <span className="min-w-0 flex-1 truncate">{node.name}</span>
                )}

                {/* The chip is the count of papers, never the papers themselves. */}
                <span className={cx(
                    'flex-none rounded-full px-1.5 py-px font-mono text-[9.5px] tabular-nums',
                    isSel ? 'bg-orange-400/20 text-orange-100' : 'bg-slate-800/80 text-slate-500',
                )}>
                    {node.count}
                </span>

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
    selectedId, selectedFolder, crumbs, visible, query, setQuery, selection, setSelection,
    openId, setOpenId, onFilePapers, onPaperMenu, onExport, onImport, onSelectFolder,
}) {
    const { draggingPapers } = useDrag();
    const readOnly = !selectedFolder;

    const [over, dropProps] = useDropTarget({
        disabled: readOnly,
        onDropPapers: (ids, meta) => onFilePapers(selectedFolder.id, ids, meta),
    });

    const name = selectedFolder ? selectedFolder.name : 'Stream';

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
                    <p className="text-[11px] text-slate-500">
                        {visible.length} paper{visible.length === 1 ? '' : 's'}
                        {selectedFolder ? ` · created ${shortDate(selectedFolder.createdAt)}` : ''}
                    </p>
                </div>
                <div className="flex-1" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter..." className="!w-40 !py-1 !text-[11.5px]" />
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
                    <Empty icon="◦" title={readOnly ? 'Nothing here yet' : 'This folder is empty'} className="border-slate-800 !py-12">
                        {readOnly
                            ? 'Fetch some papers and they appear here by date.'
                            : 'Drag papers in from the Stream, or from anywhere in this list.'}
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
