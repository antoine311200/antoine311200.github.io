/**
 * Dragging papers and folders around the app.
 *
 * Three things make organisation feel direct:
 *
 *  1. Spring-loaded tabs — hold a drag over a tab for a moment and it switches, the
 *     way a macOS Finder folder springs open.
 *  2. The shelf — a tray that appears while dragging, to park papers across a tab
 *     change for anyone who does not want one continuous gesture.
 *  3. Source-aware drops — a paper dragged out of the read-only Stream is *copied*
 *     into your folder; one dragged between your own folders is *moved*. Holding
 *     Ctrl (or Cmd, or Alt) forces a copy either way.
 *
 * The drag image is a small pill rather than a snapshot of the row, because a
 * full-width card following the cursor obscures the very targets you are aiming at.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export const PAPER_MIME = 'application/x-paper-ids';
export const SOURCE_MIME = 'application/x-paper-source';
export const FOLDER_MIME = 'application/x-folder-id';

/** Where a paper drag started. `null` means "nowhere that owns it" (e.g. the Stream). */
export const STREAM_SOURCE = 'stream';

const DragContext = createContext(null);
export const useDrag = () => useContext(DragContext);

/**
 * Replace the browser's snapshot-of-the-element drag image with a small pill.
 * The node has to be in the document when `setDragImage` runs, then thrown away.
 */
function setDragImage(event, label) {
    if (!event.dataTransfer.setDragImage) return;
    const el = document.createElement('div');
    el.textContent = label;
    el.style.cssText = [
        'position:fixed', 'top:-1000px', 'left:-1000px', 'padding:5px 11px',
        'border-radius:9999px', 'background:#fb923c', 'color:#0f172a',
        'font:600 11.5px system-ui,sans-serif', 'white-space:nowrap',
        'box-shadow:0 8px 24px rgba(0,0,0,.45)', 'pointer-events:none',
    ].join(';');
    document.body.appendChild(el);
    event.dataTransfer.setDragImage(el, 14, 14);
    setTimeout(() => el.remove(), 0);
}

/** Ctrl, Cmd or Alt all mean "copy, do not move". */
export const wantsCopy = (event) => !!(event.ctrlKey || event.metaKey || event.altKey);

export function DragProvider({ children, onTabHover }) {
    const [dragging, setDragging] = useState(null);   // { kind, ids, source } | null
    const [shelf, setShelf] = useState([]);
    const springTimer = useRef(null);

    // The same payload in a ref as well as state. State drives what the UI shows;
    // the ref is what a drop reads, because it is correct immediately — a drop can
    // land before React has re-rendered from the dragstart.
    const payload = useRef(null);

    /** @param source `STREAM_SOURCE`, a folder id, or undefined. */
    const startPaperDrag = useCallback((event, ids, source = STREAM_SOURCE) => {
        const list = Array.from(new Set(ids)).filter(Boolean);
        if (!list.length) return;
        event.dataTransfer.setData(PAPER_MIME, list.join(','));
        event.dataTransfer.setData(SOURCE_MIME, source);
        event.dataTransfer.setData('text/plain', list.join(','));
        event.dataTransfer.effectAllowed = 'copyMove';
        setDragImage(event, list.length === 1 ? '1 paper' : `${list.length} papers`);
        payload.current = { kind: 'paper', ids: list, source };
        setDragging(payload.current);
    }, []);

    const startFolderDrag = useCallback((event, id, name = 'folder') => {
        event.dataTransfer.setData(FOLDER_MIME, id);
        event.dataTransfer.effectAllowed = 'move';
        setDragImage(event, `📁 ${name}`);
        payload.current = { kind: 'folder', ids: [id] };
        setDragging(payload.current);
    }, []);

    const endDrag = useCallback(() => {
        clearTimeout(springTimer.current);
        springTimer.current = null;
        payload.current = null;
        setDragging(null);
    }, []);

    /** Props for a tab button so it springs open when a drag hovers it. */
    const springProps = useCallback((tabId) => ({
        onDragOver: (e) => {
            e.preventDefault();
            if (springTimer.current) return;
            springTimer.current = setTimeout(() => {
                springTimer.current = null;
                onTabHover(tabId);
            }, 550);
        },
        onDragLeave: () => { clearTimeout(springTimer.current); springTimer.current = null; },
        onDrop: () => { clearTimeout(springTimer.current); springTimer.current = null; },
    }), [onTabHover]);

    // dragend fires on the source even after a successful drop, and after a cancelled
    // one. Listening globally means a drag can never leave the app in a dragging state
    // just because the source element unmounted mid-gesture.
    useEffect(() => {
        if (!dragging) return undefined;
        const done = () => endDrag();
        window.addEventListener('dragend', done);
        window.addEventListener('drop', done);
        return () => {
            window.removeEventListener('dragend', done);
            window.removeEventListener('drop', done);
        };
    }, [dragging, endDrag]);

    const addToShelf = useCallback((ids) => setShelf((s) => Array.from(new Set([...s, ...ids]))), []);
    const clearShelf = useCallback(() => setShelf([]), []);

    const value = useMemo(() => ({
        dragging, payload, startPaperDrag, startFolderDrag, endDrag, springProps,
        shelf, addToShelf, clearShelf,
        draggingPapers: !!(dragging && dragging.kind === 'paper'),
        draggingFolder: !!(dragging && dragging.kind === 'folder'),
    }), [dragging, startPaperDrag, startFolderDrag, endDrag, springProps, shelf, addToShelf, clearShelf]);

    return <DragContext.Provider value={value}>{children}</DragContext.Provider>;
}

/* ------------------------------------------------------------------- reading */

export function readPaperIds(event) {
    const raw = event.dataTransfer.getData(PAPER_MIME) || event.dataTransfer.getData('text/plain') || '';
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export const readPaperSource = (event) => event.dataTransfer.getData(SOURCE_MIME) || STREAM_SOURCE;
export const readFolderId = (event) => event.dataTransfer.getData(FOLDER_MIME) || null;

/**
 * Wire an element as a drop target.
 *
 * `onDropPapers(ids, { source, copy })` — `copy` is true when the papers came from
 * the Stream or the user held Alt, meaning they should be added without being taken
 * out of wherever they already live.
 */
export function useDropTarget({ onDropPapers, onDropFolder, accept = 'papers', disabled }) {
    const drag = useContext(DragContext);
    const dragging = drag ? drag.dragging : null;
    const live = () => (drag && drag.payload ? drag.payload.current : null);
    const [over, setOver] = useState(false);
    const depth = useRef(0);

    // A drop handled by a nested target never reaches this one, and a cancelled drag
    // fires no dragleave — either way the highlight would stick on. The drag ending is
    // the one signal that is always true, so clear on that.
    useEffect(() => {
        if (!dragging) { depth.current = 0; setOver(false); }
    }, [dragging]);

    if (disabled) return [false, {}];

    const props = {
        onDragEnter: (e) => { e.preventDefault(); depth.current += 1; setOver(true); },
        onDragOver: (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = wantsCopy(e) ? 'copy' : 'move';
        },
        onDragLeave: () => { depth.current -= 1; if (depth.current <= 0) { depth.current = 0; setOver(false); } },
        onDrop: (e) => {
            e.preventDefault();
            e.stopPropagation();
            depth.current = 0;
            setOver(false);

            // Where the drag started is read from our own state, not from dataTransfer.
            // Custom MIME types are not carried reliably across browsers — when one is
            // dropped, getData returns "" and every move would silently become a copy.
            const held = live();
            const folderId = (held && held.kind === 'folder' && held.ids[0]) || readFolderId(e);
            if (folderId && onDropFolder && accept !== 'papers') { onDropFolder(folderId); return; }

            const ids = readPaperIds(e);
            if (!ids.length || !onDropPapers) return;
            const source = (held && held.kind === 'paper' && held.source) || readPaperSource(e);
            onDropPapers(ids, { source, copy: wantsCopy(e) || source === STREAM_SOURCE });
        },
    };
    return [over, props];
}
