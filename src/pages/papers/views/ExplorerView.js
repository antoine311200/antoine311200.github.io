import React, { useMemo, useState } from 'react';

import { usePapers } from '../context';
import { folderPath, folderSubtree, papersInFolder, download } from '../storage';
import { toBibtexAll, toCsv, toMarkdown } from '../bibtex';
import { useDrag, useDropTarget } from '../dnd';
import PaperRow from '../components/PaperRow';
import {
    Button, ContextMenu, Count, Empty, Input, Modal, cx, shortDate, useContextMenu,
} from '../ui';

/**
 * The organiser. A folder tree you can drag anything onto, and a contents pane that
 * is itself a drop target — so a paper dragged from the Stream lands wherever the
 * pointer is, not wherever a modal decided.
 */
export default function ExplorerView({ selection, setSelection, openId, setOpenId }) {
    const { folders, papers, dispatch, notify, states, paperList } = usePapers();
    const { startFolderDrag, endDrag } = useDrag();

    const [selectedId, setSelectedId] = useState(() => (folders.find((f) => !f.parentId) || {}).id || null);
    const [expanded, setExpanded] = useState(() => new Set(folders.filter((f) => !f.parentId).map((f) => f.id)));
    const [renaming, setRenaming] = useState(null);
    const [query, setQuery] = useState('');
    const [recursive, setRecursive] = useState(true);
    const [importOpen, setImportOpen] = useState(false);
    const folderMenu = useContextMenu();
    const paperMenu = useContextMenu();

    const childrenOf = useMemo(() => {
        const map = new Map();
        folders.forEach((f) => {
            const key = f.parentId || '__root__';
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(f);
        });
        map.forEach((l) => l.sort((a, b) => a.name.localeCompare(b.name)));
        return map;
    }, [folders]);

    const counts = useMemo(() => {
        const m = new Map();
        folders.forEach((f) => m.set(f.id, papersInFolder(folders, f.id).size));
        return m;
    }, [folders]);

    const selected = folders.find((f) => f.id === selectedId) || null;
    const crumbs = selected ? folderPath(folders, selected.id) : [];

    const visible = useMemo(() => {
        if (!selected) return [];
        const ids = papersInFolder(folders, selected.id, { recursive });
        const needle = query.trim().toLowerCase();
        return Array.from(ids).map((id) => papers[id]).filter(Boolean)
            .filter((p) => !needle || p.title.toLowerCase().includes(needle)
                || (p.authors || []).some((a) => a.name.toLowerCase().includes(needle)))
            .sort((a, b) => String(b.published || '').localeCompare(String(a.published || '')));
    }, [selected, folders, papers, recursive, query]);

    const newFolder = (parentId = null) => {
        const base = 'New folder';
        let name = base;
        let n = 2;
        const taken = new Set(folders.map((f) => f.name));
        while (taken.has(name)) { name = `${base} ${n}`; n += 1; }
        dispatch({ type: 'FOLDER_ADD', name, parentId });
        if (parentId) setExpanded((e) => new Set(e).add(parentId));
        // The new folder is the last one added; rename it immediately, Finder-style.
        setTimeout(() => {
            const created = (JSON.parse(JSON.stringify(folders)), null);
            void created;
        }, 0);
        notify('Folder created — double-click its name to rename');
    };

    const fileInto = (folderId, ids) => {
        dispatch({ type: 'FOLDER_MOVE_PAPERS', id: folderId, paperIds: ids });
        const name = (folders.find((f) => f.id === folderId) || {}).name;
        notify(`${ids.length} paper${ids.length === 1 ? '' : 's'} → ${name}`);
        setSelection(new Set());
    };

    /* ------------------------------------------------------------ tree node */

    function Node({ folder, depth }) {
        const kids = childrenOf.get(folder.id) || [];
        const isOpen = expanded.has(folder.id);
        const isSel = selectedId === folder.id;

        const [over, dropProps] = useDropTarget({
            accept: 'all',
            onDropPapers: (ids) => fileInto(folder.id, ids),
            onDropFolder: (id) => dispatch({ type: 'FOLDER_MOVE', id, parentId: folder.id }),
        });

        return (
            <li>
                <div
                    {...dropProps}
                    data-testid={`folder-node-${folder.id}`}
                    draggable
                    onDragStart={(e) => startFolderDrag(e, folder.id)}
                    onDragEnd={endDrag}
                    onClick={() => setSelectedId(folder.id)}
                    onContextMenu={(e) => folderMenu.open(e, folder)}
                    style={{ paddingLeft: `${depth * 14 + 8}px` }}
                    className={cx(
                        'group flex cursor-pointer items-center gap-1.5 rounded-lg py-1.5 pr-2 text-[12.5px] transition',
                        isSel ? 'bg-orange-400/12 text-orange-100' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
                        over && 'pr-drop-target',
                    )}
                >
                    <button
                        type="button"
                        aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${folder.name}`}
                        data-testid={`folder-toggle-${folder.id}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            setExpanded((s) => { const n = new Set(s); if (n.has(folder.id)) n.delete(folder.id); else n.add(folder.id); return n; });
                        }}
                        className={cx('w-3 flex-none text-[9px] text-slate-600 transition hover:text-orange-300', !kids.length && 'invisible')}
                    >
                        {isOpen ? '▾' : '▸'}
                    </button>
                    <span className="flex-none text-[12px]">{isOpen && kids.length ? '📂' : '📁'}</span>

                    {renaming === folder.id ? (
                        <input
                            autoFocus
                            defaultValue={folder.name}
                            onClick={(e) => e.stopPropagation()}
                            onBlur={(e) => {
                                const v = e.target.value.trim();
                                if (v) dispatch({ type: 'FOLDER_UPDATE', id: folder.id, patch: { name: v } });
                                setRenaming(null);
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setRenaming(null); }}
                            className="min-w-0 flex-1 rounded border border-orange-400/60 bg-slate-950 px-1 text-[12.5px] text-slate-100 outline-none"
                        />
                    ) : (
                        <span className="min-w-0 flex-1 truncate" onDoubleClick={(e) => { e.stopPropagation(); setRenaming(folder.id); }}>
                            {folder.name}
                        </span>
                    )}

                    <Count>{counts.get(folder.id) || 0}</Count>
                </div>
                {isOpen && kids.length > 0 && (
                    <ul>{kids.map((k) => <Node key={k.id} folder={k} depth={depth + 1} />)}</ul>
                )}
            </li>
        );
    }

    const roots = childrenOf.get('__root__') || [];
    const [rootOver, rootDropProps] = useDropTarget({
        accept: 'all',
        onDropFolder: (id) => dispatch({ type: 'FOLDER_MOVE', id, parentId: null }),
    });

    const [paneOver, paneDropProps] = useDropTarget({
        onDropPapers: (ids) => { if (selected) fileInto(selected.id, ids); },
    });

    const exportAs = (fmt) => {
        if (!visible.length) { notify('Nothing to export'); return; }
        const stamp = selected.name.replace(/[^\w-]+/g, '-').toLowerCase();
        if (fmt === 'bib') download(`${stamp}.bib`, toBibtexAll(visible), 'text/plain');
        if (fmt === 'csv') download(`${stamp}.csv`, toCsv(visible, states), 'text/csv');
        if (fmt === 'md') download(`${stamp}.md`, toMarkdown(visible, states), 'text/markdown');
    };

    return (
        <div className="flex h-full min-h-0">
            {/* --------------------------------------------------------- tree */}
            <div className="flex w-64 flex-none flex-col border-r border-slate-800">
                <div className="flex flex-none items-center gap-2 border-b border-slate-800 px-3 py-2.5">
                    <h2 className="flex-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Folders</h2>
                    <Button size="sm" onClick={() => newFolder(null)} data-testid="new-folder">+ Folder</Button>
                </div>

                <div
                    {...rootDropProps}
                    className={cx('min-h-0 flex-1 overflow-y-auto p-1.5', rootOver && 'pr-drop-target')}
                    onContextMenu={(e) => { if (e.target === e.currentTarget) folderMenu.open(e, null); }}
                >
                    {roots.length ? (
                        <ul>{roots.map((f) => <Node key={f.id} folder={f} depth={0} />)}</ul>
                    ) : (
                        <div className="px-3 py-8 text-center">
                            <p className="text-[11px] leading-relaxed text-slate-600">
                                No folders yet.
                            </p>
                            <Button className="mt-3" size="sm" variant="primary" onClick={() => newFolder(null)}>
                                Create the first
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* ----------------------------------------------------- contents */}
            <div className="flex min-w-0 flex-1 flex-col">
                {!selected ? (
                    <div className="p-8">
                        <Empty icon="🗂" title="Pick a folder">
                            Folders are bibliography drawers. Drag papers in from the Stream — hold them over the
                            Explorer tab and it opens for you — then export the whole folder as BibTeX.
                        </Empty>
                    </div>
                ) : (
                    <>
                        <header className="flex-none border-b border-slate-800 px-5 py-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="min-w-0">
                                    <nav className="flex items-center gap-1 text-[10px] text-slate-600">
                                        {crumbs.map((b, i) => (
                                            <React.Fragment key={b.id}>
                                                {i > 0 && <span>/</span>}
                                                <button type="button" onClick={() => setSelectedId(b.id)} className="transition hover:text-orange-300">
                                                    {b.name}
                                                </button>
                                            </React.Fragment>
                                        ))}
                                    </nav>
                                    <h1 className="text-[15px] font-semibold text-slate-100">{selected.name}</h1>
                                    <p className="text-[11px] text-slate-500">
                                        {visible.length} paper{visible.length === 1 ? '' : 's'}
                                        {' · created '}{shortDate(selected.createdAt)}
                                    </p>
                                </div>
                                <div className="flex-1" />
                                <Input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Filter in folder…"
                                    className="!w-40 !py-1 !text-[11.5px]"
                                />
                                <Button size="sm" variant={recursive ? 'active' : 'ghost'} onClick={() => setRecursive(!recursive)}>
                                    Subfolders
                                </Button>
                                <Button size="sm" onClick={() => setImportOpen(true)}>Import</Button>
                                <Button size="sm" onClick={() => exportAs('bib')}>BibTeX</Button>
                            </div>

                            {selection.size > 0 && (
                                <div className="mt-2 flex items-center gap-2 rounded-lg border border-orange-400/25 bg-orange-400/[0.07] px-3 py-1.5">
                                    <span className="text-[11px] text-orange-200">{selection.size} selected</span>
                                    <div className="flex-1" />
                                    <Button size="sm" variant="danger"
                                            onClick={() => {
                                                dispatch({ type: 'FOLDER_REMOVE_PAPERS', id: selected.id, paperIds: Array.from(selection) });
                                                setSelection(new Set());
                                            }}>
                                        Remove from folder
                                    </Button>
                                    <Button size="sm" variant="quiet" onClick={() => setSelection(new Set())}>Clear</Button>
                                </div>
                            )}
                        </header>

                        <div
                            {...paneDropProps}
                            data-testid="folder-drop-pane"
                            className={cx('min-h-0 flex-1 overflow-y-auto px-5 py-4', paneOver && 'pr-drop-target')}
                        >
                            {visible.length ? (
                                <div className="space-y-1.5">
                                    {visible.map((p) => (
                                        <PaperRow
                                            key={p.id}
                                            paper={p}
                                            selected={selection.has(p.id)}
                                            focused={openId === p.id}
                                            selectionIds={Array.from(selection)}
                                            onToggleSelect={() => setSelection((s) => {
                                                const n = new Set(s);
                                                if (n.has(p.id)) n.delete(p.id); else n.add(p.id);
                                                return n;
                                            })}
                                            onOpen={() => setOpenId(openId === p.id ? null : p.id)}
                                            onContextMenu={(e) => paperMenu.open(e, p)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <Empty icon="◦" title="This folder is empty" className="border-slate-800">
                                    Drop papers here, or drag them from the Stream tab.
                                </Empty>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* ------------------------------------------------------- menus */}
            <ContextMenu
                menu={folderMenu.menu}
                onClose={folderMenu.close}
                items={(folder) => (folder ? [
                    { label: 'New subfolder', icon: '＋', onSelect: () => newFolder(folder.id) },
                    { label: 'Rename', icon: '✎', hint: 'dbl-click', onSelect: () => setRenaming(folder.id) },
                    { separator: true },
                    { label: 'Export BibTeX', icon: '⇩', onSelect: () => { setSelectedId(folder.id); setTimeout(() => exportAs('bib'), 0); } },
                    { label: 'Export CSV', icon: '⇩', onSelect: () => { setSelectedId(folder.id); setTimeout(() => exportAs('csv'), 0); } },
                    { label: 'Export Markdown', icon: '⇩', onSelect: () => { setSelectedId(folder.id); setTimeout(() => exportAs('md'), 0); } },
                    { separator: true },
                    {
                        label: 'Delete folder',
                        icon: '🗑',
                        danger: true,
                        onSelect: () => {
                            const kids = folderSubtree(folders, folder.id).length - 1;
                            // eslint-disable-next-line no-alert
                            if (window.confirm(`Delete "${folder.name}"${kids ? ` and its ${kids} subfolder(s)` : ''}? Papers stay in your library.`)) {
                                dispatch({ type: 'FOLDER_REMOVE', id: folder.id });
                                if (selectedId === folder.id) setSelectedId(null);
                            }
                        },
                    },
                ] : [
                    { label: 'New folder', icon: '＋', onSelect: () => newFolder(null) },
                ])}
            />

            <ContextMenu
                menu={paperMenu.menu}
                onClose={paperMenu.close}
                items={(paper) => [
                    { label: 'Open details', icon: '◉', onSelect: () => setOpenId(paper.id) },
                    { label: 'Open on arXiv', icon: '↗', onSelect: () => window.open(`https://arxiv.org/abs/${paper.id}`, '_blank', 'noreferrer') },
                    { separator: true },
                    {
                        label: 'Remove from folder',
                        icon: '⊘',
                        danger: true,
                        onSelect: () => dispatch({ type: 'FOLDER_REMOVE_PAPERS', id: selected.id, paperIds: [paper.id] }),
                    },
                ]}
            />

            <ImportModal
                open={importOpen}
                onClose={() => setImportOpen(false)}
                folder={selected}
                paperList={paperList}
                onFile={(ids) => { if (selected) fileInto(selected.id, ids); setImportOpen(false); }}
            />
        </div>
    );
}

/* -------------------------------------------------------------------- import */

function ImportModal({ open, onClose, folder, paperList, onFile }) {
    const [text, setText] = useState('');

    // arXiv ids out of anything pasted: bare ids, abs/pdf URLs, a .bib file's eprint keys.
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
