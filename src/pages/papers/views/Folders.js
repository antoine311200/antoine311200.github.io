import React, { useEffect, useMemo, useState } from 'react';

import { usePapers } from '../context';
import { folderPath, folderSubtree, papersInFolder, download } from '../storage';
import { toBibtexAll, toCsv, toMarkdown } from '../bibtex';
import PaperCard from '../components/PaperCard';
import PaperDetail from '../components/PaperDetail';
import { Button, Empty, Input, cx, shortDate } from '../components/ui';

/**
 * A file explorer for the library: a folder tree on the left, its papers on the
 * right. Folders nest, papers can be dragged between them, and any folder exports
 * straight to BibTeX — which is what makes it a bibliography drawer rather than
 * just another tag.
 */
export default function Folders({ initialFolderId = null }) {
    const { folders, papers, dispatch, notify, states } = usePapers();
    const [selectedId, setSelectedId] = useState(initialFolderId);
    const [expanded, setExpanded] = useState(() => new Set(initialFolderId ? [initialFolderId] : []));
    const [selection, setSelection] = useState(() => new Set());
    const [openId, setOpenId] = useState(null);
    const [renaming, setRenaming] = useState(null);
    const [dragOver, setDragOver] = useState(null);
    const [recursive, setRecursive] = useState(true);
    const [query, setQuery] = useState('');

    // Deep-linked from the sidebar: select it and open the path down to it.
    useEffect(() => {
        if (!initialFolderId) return;
        setSelectedId(initialFolderId);
        setExpanded((e) => {
            const n = new Set(e);
            folderPath(folders, initialFolderId).forEach((f) => n.add(f.id));
            return n;
        });
        // `folders` is deliberately not a dependency: this reacts to the deep link only.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialFolderId]);

    const roots = useMemo(() => folders.filter((f) => !f.parentId), [folders]);
    const childrenOf = useMemo(() => {
        const map = new Map();
        folders.forEach((f) => {
            const key = f.parentId || '__root__';
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(f);
        });
        map.forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name)));
        return map;
    }, [folders]);

    const selected = folders.find((f) => f.id === selectedId) || null;
    const breadcrumbs = selected ? folderPath(folders, selected.id) : [];

    const visiblePapers = useMemo(() => {
        if (!selected) return [];
        const ids = papersInFolder(folders, selected.id, { recursive });
        const needle = query.trim().toLowerCase();
        return Array.from(ids)
            .map((id) => papers[id])
            .filter(Boolean)
            .filter((p) => !needle
                || p.title.toLowerCase().includes(needle)
                || (p.authors || []).some((a) => a.name.toLowerCase().includes(needle)))
            .sort((a, b) => String(b.published || '').localeCompare(String(a.published || '')));
    }, [selected, folders, papers, recursive, query]);

    const counts = useMemo(() => {
        const map = new Map();
        folders.forEach((f) => map.set(f.id, papersInFolder(folders, f.id, { recursive: true }).size));
        return map;
    }, [folders]);

    const addFolder = (parentId = null) => {
        // eslint-disable-next-line no-alert
        const name = window.prompt(parentId ? 'Name the subfolder' : 'Name the folder');
        if (!name || !name.trim()) return;
        dispatch({ type: 'FOLDER_ADD', name: name.trim(), parentId });
        if (parentId) setExpanded((e) => new Set(e).add(parentId));
    };

    const drop = (folderId, e) => {
        e.preventDefault();
        setDragOver(null);
        const raw = e.dataTransfer.getData('application/x-paper-ids') || e.dataTransfer.getData('text/plain');
        if (raw) {
            const ids = raw.split(',').filter(Boolean);
            if (ids.length) {
                dispatch({ type: 'FOLDER_MOVE_PAPERS', id: folderId, paperIds: ids });
                notify(`Moved ${ids.length} paper${ids.length === 1 ? '' : 's'}`);
                setSelection(new Set());
                return;
            }
        }
        const movedFolder = e.dataTransfer.getData('application/x-folder-id');
        if (movedFolder && movedFolder !== folderId) {
            dispatch({ type: 'FOLDER_MOVE', id: movedFolder, parentId: folderId });
        }
    };

    const renderNode = (folder, depth = 0) => {
        const kids = childrenOf.get(folder.id) || [];
        const isOpen = expanded.has(folder.id);
        const isSelected = selectedId === folder.id;
        return (
            <li key={folder.id}>
                <div
                    data-testid={`folder-node-${folder.id}`}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('application/x-folder-id', folder.id)}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(folder.id); }}
                    onDragLeave={() => setDragOver((d) => (d === folder.id ? null : d))}
                    onDrop={(e) => drop(folder.id, e)}
                    onClick={() => setSelectedId(folder.id)}
                    style={{ paddingLeft: `${depth * 12 + 8}px` }}
                    className={cx(
                        'group flex cursor-pointer items-center gap-1 rounded-lg py-1 pr-2 text-[12px] transition',
                        isSelected ? 'bg-orange-400/[0.12] text-orange-200' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
                        dragOver === folder.id && 'ring-1 ring-orange-400/60',
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
                        className={cx(
                            'w-3.5 flex-none text-[10px] leading-none text-slate-500 transition hover:text-slate-200',
                            !kids.length && 'invisible',
                        )}
                    >
                        {isOpen ? '▾' : '▸'}
                    </button>
                    <span className="flex-none text-[11px]">{isOpen && kids.length ? '📂' : '📁'}</span>

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
                            className="min-w-0 flex-1 rounded border border-orange-400/50 bg-slate-950 px-1 text-[12px] text-slate-100 outline-none"
                        />
                    ) : (
                        <span className="min-w-0 flex-1 truncate" onDoubleClick={() => setRenaming(folder.id)}>
                            {folder.name}
                        </span>
                    )}

                    <span className="flex-none font-mono text-[9.5px] text-slate-600">{counts.get(folder.id) || 0}</span>
                    <button
                        type="button"
                        title="New subfolder"
                        onClick={(e) => { e.stopPropagation(); addFolder(folder.id); }}
                        className="flex-none px-1 text-slate-600 opacity-0 transition hover:text-orange-300 group-hover:opacity-100"
                    >
                        +
                    </button>
                </div>
                {isOpen && kids.length > 0 && <ul>{kids.map((k) => renderNode(k, depth + 1))}</ul>}
            </li>
        );
    };

    const exportFolder = (fmt) => {
        const list = visiblePapers;
        if (!list.length) { notify('Nothing to export'); return; }
        const stamp = selected.name.replace(/[^\w-]+/g, '-').toLowerCase();
        if (fmt === 'bib') download(`${stamp}.bib`, toBibtexAll(list), 'text/plain');
        if (fmt === 'csv') download(`${stamp}.csv`, toCsv(list, states), 'text/csv');
        if (fmt === 'md') download(`${stamp}.md`, toMarkdown(list, states), 'text/markdown');
    };

    const toggleSelect = (id) => setSelection((s) => {
        const n = new Set(s);
        if (n.has(id)) n.delete(id); else n.add(id);
        return n;
    });

    const dragPayload = (id) => {
        const ids = selection.has(id) ? Array.from(selection) : [id];
        return ids.join(',');
    };

    return (
        <div className="flex h-full min-h-0">
            {/* ------------------------------------------------------- tree */}
            <div className="flex w-60 flex-none flex-col border-r border-slate-800">
                <div className="flex items-center gap-2 border-b border-slate-800 py-2.5 pl-3 pr-3 max-lg:pl-14">
                    <h2 className="flex-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Folders
                    </h2>
                    <Button size="sm" onClick={() => addFolder(null)}>+ New</Button>
                </div>

                <div
                    className={cx(
                        'min-h-0 flex-1 overflow-y-auto p-1.5',
                        dragOver === '__root__' && 'ring-1 ring-inset ring-orange-400/40',
                    )}
                    onDragOver={(e) => { e.preventDefault(); setDragOver('__root__'); }}
                    onDragLeave={() => setDragOver((d) => (d === '__root__' ? null : d))}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(null);
                        const moved = e.dataTransfer.getData('application/x-folder-id');
                        if (moved) dispatch({ type: 'FOLDER_MOVE', id: moved, parentId: null });
                    }}
                >
                    {roots.length ? (
                        <ul>{roots.map((f) => renderNode(f))}</ul>
                    ) : (
                        <p className="px-2 py-6 text-center text-[11px] leading-relaxed text-slate-600">
                            No folders yet. Create one, then drag papers in from any list.
                        </p>
                    )}
                </div>

                {selected && (
                    <div className="border-t border-slate-800 p-2">
                        <Button
                            size="sm"
                            variant="danger"
                            className="w-full justify-center"
                            onClick={() => {
                                const kids = folderSubtree(folders, selected.id).length - 1;
                                // eslint-disable-next-line no-alert
                                if (window.confirm(
                                    `Delete "${selected.name}"${kids ? ` and its ${kids} subfolder(s)` : ''}? Papers stay in your library.`,
                                )) {
                                    dispatch({ type: 'FOLDER_REMOVE', id: selected.id });
                                    setSelectedId(null);
                                }
                            }}
                        >
                            Delete folder
                        </Button>
                    </div>
                )}
            </div>

            {/* ------------------------------------------------------ papers */}
            <div className="flex min-w-0 flex-1 flex-col">
                {!selected ? (
                    <div className="p-6">
                        <Empty icon="🗂" title="Pick a folder">
                            Folders are your bibliography drawers — group what you have read for a chapter,
                            a seminar or a paper, then export the whole folder as BibTeX in one click.
                        </Empty>
                    </div>
                ) : (
                    <>
                        <header className="flex-none border-b border-slate-800 px-5 py-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="min-w-0">
                                    <nav className="flex items-center gap-1 text-[10px] text-slate-600">
                                        {breadcrumbs.map((b, i) => (
                                            <React.Fragment key={b.id}>
                                                {i > 0 && <span>/</span>}
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedId(b.id)}
                                                    className="transition hover:text-orange-300"
                                                >
                                                    {b.name}
                                                </button>
                                            </React.Fragment>
                                        ))}
                                    </nav>
                                    <h1 className="text-base font-semibold text-slate-100">{selected.name}</h1>
                                    <p className="text-[11px] text-slate-500">
                                        {visiblePapers.length} paper{visiblePapers.length === 1 ? '' : 's'}
                                        {recursive && counts.get(selected.id) !== selected.paperIds.length
                                            ? ' · including subfolders' : ''}
                                        {' · created '}{shortDate(selected.createdAt)}
                                    </p>
                                </div>
                                <div className="flex-1" />
                                <Input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Filter in folder…"
                                    className="!w-44 !py-1.5 !text-xs"
                                />
                                <Button
                                    variant={recursive ? 'active' : 'ghost'}
                                    onClick={() => setRecursive(!recursive)}
                                    title="Include papers filed in subfolders"
                                >
                                    Include subfolders
                                </Button>
                                <Button onClick={() => exportFolder('bib')}>BibTeX</Button>
                                <Button onClick={() => exportFolder('csv')}>CSV</Button>
                                <Button onClick={() => exportFolder('md')}>Markdown</Button>
                            </div>

                            {selection.size > 0 && (
                                <div className="mt-2 flex items-center gap-2 rounded-lg border border-orange-400/25 bg-orange-400/[0.07] px-3 py-1.5">
                                    <span className="text-[11px] text-orange-200">{selection.size} selected</span>
                                    <div className="flex-1" />
                                    <Button
                                        size="sm"
                                        variant="danger"
                                        onClick={() => {
                                            dispatch({
                                                type: 'FOLDER_REMOVE_PAPERS',
                                                id: selected.id,
                                                paperIds: Array.from(selection),
                                            });
                                            setSelection(new Set());
                                        }}
                                    >
                                        Remove from folder
                                    </Button>
                                    <Button size="sm" variant="subtle" onClick={() => setSelection(new Set())}>Clear</Button>
                                </div>
                            )}
                        </header>

                        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                            {visiblePapers.length ? (
                                <div className="space-y-2">
                                    {visiblePapers.map((p) => (
                                        <div
                                            key={p.id}
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData('application/x-paper-ids', dragPayload(p.id));
                                                e.dataTransfer.effectAllowed = 'move';
                                            }}
                                        >
                                            <PaperCard
                                                paper={p}
                                                selected={selection.has(p.id)}
                                                onSelectToggle={() => toggleSelect(p.id)}
                                                onOpen={() => setOpenId(openId === p.id ? null : p.id)}
                                                showDay
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <Empty icon="◦" title="This folder is empty">
                                    Select papers anywhere in the app and use “Add to folder”, or drag them
                                    onto a folder in the tree.
                                </Empty>
                            )}
                        </div>
                    </>
                )}
            </div>

            {openId && papers[openId] && (
                <div className="hidden w-[38%] min-w-[24rem] max-w-[42rem] flex-none xl:block">
                    <PaperDetail paper={papers[openId]} onClose={() => setOpenId(null)} />
                </div>
            )}
        </div>
    );
}
