/**
 * Dragging papers and folders around the app.
 *
 * Two mechanisms make cross-tab organisation work without the user thinking about it:
 *
 *  1. Spring-loaded tabs — hold a drag over a tab for a moment and it switches, the
 *     way a macOS Finder folder springs open. The HTML5 drag survives the re-render,
 *     so you can pick papers up in the Stream and drop them in the Explorer in one
 *     gesture.
 *  2. The shelf — a tray that appears while dragging. Drop papers there to hold them,
 *     change tabs at your own pace, then drag them out into a folder. Forgiving for
 *     anyone who does not want a single continuous gesture.
 */

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

export const PAPER_MIME = 'application/x-paper-ids';
export const FOLDER_MIME = 'application/x-folder-id';

const DragContext = createContext(null);
export const useDrag = () => useContext(DragContext);

export function DragProvider({ children, onTabHover }) {
    const [dragging, setDragging] = useState(null);   // { kind, ids } | null
    const [shelf, setShelf] = useState([]);           // paper ids parked by the user
    const springTimer = useRef(null);

    const startPaperDrag = useCallback((event, ids) => {
        const list = Array.from(new Set(ids)).filter(Boolean);
        if (!list.length) return;
        event.dataTransfer.setData(PAPER_MIME, list.join(','));
        event.dataTransfer.setData('text/plain', list.join(','));
        event.dataTransfer.effectAllowed = 'copyMove';
        setDragging({ kind: 'paper', ids: list });
    }, []);

    const startFolderDrag = useCallback((event, id) => {
        event.dataTransfer.setData(FOLDER_MIME, id);
        event.dataTransfer.effectAllowed = 'move';
        setDragging({ kind: 'folder', ids: [id] });
    }, []);

    const endDrag = useCallback(() => {
        clearTimeout(springTimer.current);
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

    const addToShelf = useCallback((ids) => {
        setShelf((s) => Array.from(new Set([...s, ...ids])));
    }, []);
    const clearShelf = useCallback(() => setShelf([]), []);
    const removeFromShelf = useCallback((ids) => {
        const gone = new Set(ids);
        setShelf((s) => s.filter((id) => !gone.has(id)));
    }, []);

    const value = useMemo(() => ({
        dragging, startPaperDrag, startFolderDrag, endDrag, springProps,
        shelf, addToShelf, clearShelf, removeFromShelf,
    }), [dragging, startPaperDrag, startFolderDrag, endDrag, springProps, shelf, addToShelf, clearShelf, removeFromShelf]);

    return <DragContext.Provider value={value}>{children}</DragContext.Provider>;
}

/** Read dropped paper ids out of a drop event, whichever flavour was set. */
export function readPaperIds(event) {
    const raw = event.dataTransfer.getData(PAPER_MIME) || event.dataTransfer.getData('text/plain') || '';
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export const readFolderId = (event) => event.dataTransfer.getData(FOLDER_MIME) || null;

/**
 * Wire an element as a drop target.
 * `onDropPapers` / `onDropFolder` are called with the parsed payload; the hook keeps
 * the hover state so the caller can style itself.
 */
export function useDropTarget({ onDropPapers, onDropFolder, accept = 'papers' }) {
    const [over, setOver] = useState(false);
    const depth = useRef(0);

    const props = {
        onDragEnter: (e) => { e.preventDefault(); depth.current += 1; setOver(true); },
        onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; },
        onDragLeave: () => { depth.current -= 1; if (depth.current <= 0) { depth.current = 0; setOver(false); } },
        onDrop: (e) => {
            e.preventDefault();
            e.stopPropagation();
            depth.current = 0;
            setOver(false);
            const folderId = readFolderId(e);
            if (folderId && onDropFolder && accept !== 'papers') { onDropFolder(folderId); return; }
            const ids = readPaperIds(e);
            if (ids.length && onDropPapers) onDropPapers(ids);
        },
    };
    return [over, props];
}
