/**
 * A three-call IndexedDB wrapper — no dependency, no schema beyond one key.
 *
 * localStorage caps out around 5 MB, which a single fetch of a few topics can eat a
 * tenth of. IndexedDB's budget is a share of free disk (hundreds of MB or more), so
 * the library can grow to tens of thousands of papers without the app policing it.
 */

const DB_NAME = 'paper-radar';
const STORE = 'store';
const KEY = 'main';

export const idbAvailable = () => {
    try { return typeof indexedDB !== 'undefined' && indexedDB !== null; } catch { return false; }
};

let dbPromise = null;

function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('could not open IndexedDB'));
        req.onblocked = () => reject(new Error('IndexedDB is blocked by another tab'));
    }).catch((err) => { dbPromise = null; throw err; });
    return dbPromise;
}

function run(mode, fn) {
    return open().then((db) => new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
        tx.onerror = () => reject(tx.error);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    }));
}

export const idbGet = () => run('readonly', (s) => s.get(KEY));
export const idbSet = (value) => run('readwrite', (s) => s.put(value, KEY));
export const idbClear = () => run('readwrite', (s) => s.delete(KEY));

/**
 * Real usage and quota from the Storage API, when the browser offers it.
 * Falls back to `null` so callers can hide the meter rather than invent a number.
 */
export async function storageEstimate() {
    try {
        if (navigator.storage && navigator.storage.estimate) {
            const { usage, quota } = await navigator.storage.estimate();
            if (typeof quota === 'number' && quota > 0) return { usage: usage || 0, quota };
        }
    } catch {
        /* Safari private mode and some embedded webviews throw here. */
    }
    return null;
}
