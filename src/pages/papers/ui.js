/**
 * The design system for Paper Radar.
 *
 * Slate surfaces on the site's radial-gradient ground, slate-700/800 hairlines,
 * orange as the single accent. Semantics stay out of the accent's way: emerald is
 * "done", sky is "queued", rose is destructive.
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export const cx = (...parts) => parts.filter(Boolean).join(' ');

export const PAGE_BACKGROUND = {
    background: '#0f172a',
    backgroundImage:
        'radial-gradient(circle at 10% 90%, #203157, transparent 520px), '
        + 'radial-gradient(circle at 95% 15%, #192745, transparent 520px)',
};

export const ACCENT = '#fb923c';

/* --------------------------------------------------------------------- button */

const VARIANTS = {
    primary: 'bg-orange-400 text-slate-950 hover:bg-orange-300 border-orange-300/50 font-semibold shadow-lg shadow-orange-500/10',
    ghost: 'bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white border-slate-700',
    quiet: 'bg-transparent text-slate-400 hover:text-white hover:bg-white/5 border-transparent',
    danger: 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border-rose-500/40',
    active: 'bg-orange-400/[0.12] text-orange-200 border-orange-400/40',
};

const SIZES = {
    xs: 'px-2 py-0.5 text-[11px] gap-1',
    sm: 'px-2.5 py-1 text-[11.5px] gap-1.5',
    md: 'px-3 py-1.5 text-xs gap-1.5',
    lg: 'px-4 py-2 text-sm gap-2',
};

export function Button({ variant = 'ghost', size = 'md', className, as: As = 'button', ...props }) {
    return (
        <As
            {...props}
            className={cx(
                'inline-flex items-center justify-center rounded-lg border font-medium',
                'transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50',
                VARIANTS[variant], SIZES[size], className,
            )}
        />
    );
}

/** Square icon button — the hover-revealed actions on cards and rows. */
export function IconButton({ label, active, tone, className, ...props }) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            {...props}
            className={cx(
                'inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors',
                active ? (tone || 'bg-orange-400/[0.12] text-orange-300') : 'text-slate-500 hover:bg-white/[0.08] hover:text-slate-100',
                className,
            )}
        />
    );
}

/* ---------------------------------------------------------------------- chips */

export function Chip({ color, children, onClick, active, title, className, ...rest }) {
    const style = color ? { backgroundColor: `${color}1a`, color, borderColor: `${color}55` } : undefined;
    return (
        <span
            title={title}
            onClick={onClick}
            style={style}
            {...rest}
            className={cx(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium leading-4',
                !color && (active
                    ? 'border-orange-400/40 bg-orange-400/[0.12] text-orange-200'
                    : 'border-slate-700 bg-slate-800/50 text-slate-400'),
                onClick && 'cursor-pointer transition hover:brightness-125',
                className,
            )}
        >
            {children}
        </span>
    );
}

/** A count that reads as a quiet annotation, not a badge demanding attention. */
export const Count = ({ children, className, ...rest }) => (
    <span {...rest} className={cx('font-mono text-[10px] tabular-nums text-slate-500', className)}>
        {children}
    </span>
);

/* -------------------------------------------------------------------- surface */

export function Card({ className, interactive, children, ...rest }) {
    return (
        <div
            {...rest}
            className={cx(
                'rounded-2xl border border-slate-800 bg-slate-900/40',
                interactive && 'transition-all duration-150 hover:border-slate-700 hover:bg-slate-900/70 hover:shadow-xl hover:shadow-black/20',
                className,
            )}
        >
            {children}
        </div>
    );
}

export function Empty({ icon = '◦', title, children, action, className }) {
    return (
        <div className={cx(
            'flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed',
            'border-slate-700/60 bg-slate-900/20 px-6 py-16 text-center',
            className,
        )}>
            <div className="text-3xl opacity-60">{icon}</div>
            <p className="text-sm font-medium text-slate-200">{title}</p>
            {children && <p className="max-w-md text-xs leading-relaxed text-slate-500">{children}</p>}
            {action && <div className="mt-3">{action}</div>}
        </div>
    );
}

/* --------------------------------------------------------------------- inputs */

export const inputClass =
    'w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 '
    + 'placeholder:text-slate-600 outline-none transition focus:border-orange-400/60 focus:bg-slate-950';

export const Input = React.forwardRef((props, ref) => (
    <input ref={ref} {...props} className={cx(inputClass, props.className)} />
));
Input.displayName = 'Input';

export function Field({ label, hint, children }) {
    return (
        <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-slate-400">{label}</span>
            {children}
            {hint && <span className="mt-1 block text-[10px] leading-relaxed text-slate-500">{hint}</span>}
        </label>
    );
}

export function Toggle({ checked, onChange, label, hint }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={!!checked}
            onClick={() => onChange(!checked)}
            className="flex w-full items-start gap-3 rounded-lg px-1 py-1.5 text-left transition hover:bg-white/5"
        >
            <span className={cx(
                'mt-0.5 h-4 w-7 flex-none rounded-full border transition-colors',
                checked ? 'border-orange-300/60 bg-orange-400/80' : 'border-slate-600 bg-slate-800',
            )}>
                <span className={cx(
                    'block h-3 w-3 translate-y-[1.5px] rounded-full bg-white transition-transform',
                    checked ? 'translate-x-[15px]' : 'translate-x-[2px]',
                )} />
            </span>
            <span className="min-w-0">
                <span className="block text-xs font-medium text-slate-200">{label}</span>
                {hint && <span className="block text-[10px] leading-relaxed text-slate-500">{hint}</span>}
            </span>
        </button>
    );
}

/** Comma / Enter separated token editor. */
export function TokenInput({ value = [], onChange, placeholder, color, autoFocus }) {
    const [draft, setDraft] = useState('');

    const commit = (raw) => {
        const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
        if (!parts.length) return;
        onChange(Array.from(new Set([...value, ...parts])));
        setDraft('');
    };

    return (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/60 p-1.5 transition focus-within:border-orange-400/60">
            {value.map((token) => (
                <span
                    key={token}
                    style={color ? { backgroundColor: `${color}1a`, color, borderColor: `${color}55` } : undefined}
                    className={cx(
                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]',
                        !color && 'border-slate-700 bg-slate-800/60 text-slate-300',
                    )}
                >
                    {token}
                    <button
                        type="button"
                        onClick={() => onChange(value.filter((v) => v !== token))}
                        className="opacity-50 transition hover:opacity-100"
                        aria-label={`Remove ${token}`}
                    >
                        ×
                    </button>
                </span>
            ))}
            <input
                value={draft}
                autoFocus={autoFocus}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(draft); }
                    if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
                }}
                onBlur={() => commit(draft)}
                placeholder={value.length ? '' : placeholder}
                className="min-w-[7rem] flex-1 bg-transparent px-1 py-0.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none"
            />
        </div>
    );
}

/* --------------------------------------------------------------------- modals */

export function Modal({ open, onClose, title, subtitle, children, footer, width = 'max-w-lg' }) {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;
    return (
        <div
            className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm"
            onMouseDown={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                onMouseDown={(e) => e.stopPropagation()}
                style={{ background: 'rgba(13,22,40,0.97)' }}
                className={cx('pr-pop mt-[7vh] w-full rounded-2xl border border-slate-700/60 shadow-2xl shadow-black/60', width)}
            >
                <header className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-3.5">
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
                        {subtitle && <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>}
                    </div>
                    <Button variant="quiet" size="sm" onClick={onClose} aria-label="Close">Esc</Button>
                </header>
                <div className="px-5 py-4">{children}</div>
                {footer && (
                    <footer className="flex justify-end gap-2 border-t border-slate-800 px-5 py-3">{footer}</footer>
                )}
            </div>
        </div>
    );
}

/* -------------------------------------------------------------- context menu */

/**
 * Right-click menus. `useContextMenu()` returns the props to spread on a target
 * and the element to render; the menu flips itself to stay on screen.
 */
export function useContextMenu() {
    const [menu, setMenu] = useState(null);   // { x, y, payload }

    const open = useCallback((event, payload) => {
        event.preventDefault();
        event.stopPropagation();
        // `at` lets the dismiss handler ignore the very event that opened this menu,
        // so right-clicking a second item replaces the menu instead of closing it.
        setMenu({ x: event.clientX, y: event.clientY, payload, at: Date.now() });
    }, []);

    const close = useCallback(() => setMenu(null), []);
    return { menu, open, close, targetProps: (payload) => ({ onContextMenu: (e) => open(e, payload) }) };
}

export function ContextMenu({ menu, onClose, items }) {
    const ref = useRef(null);
    const [pos, setPos] = useState({ x: 0, y: 0 });

    useLayoutEffect(() => {
        if (!menu || !ref.current) return;
        const { offsetWidth: w, offsetHeight: h } = ref.current;
        setPos({
            x: Math.min(menu.x, window.innerWidth - w - 8),
            y: Math.min(menu.y, window.innerHeight - h - 8),
        });
    }, [menu]);

    useEffect(() => {
        if (!menu) return undefined;
        const dismiss = () => { if (Date.now() - menu.at > 120) onClose(); };
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('click', dismiss);
        window.addEventListener('contextmenu', dismiss);
        window.addEventListener('scroll', dismiss, true);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('click', dismiss);
            window.removeEventListener('contextmenu', dismiss);
            window.removeEventListener('scroll', dismiss, true);
            window.removeEventListener('keydown', onKey);
        };
    }, [menu, onClose]);

    if (!menu) return null;
    const resolved = typeof items === 'function' ? items(menu.payload) : items;

    return (
        <div
            ref={ref}
            role="menu"
            data-testid="context-menu"
            style={{ left: pos.x, top: pos.y, background: 'rgba(13,22,40,0.98)' }}
            onClick={(e) => e.stopPropagation()}
            className="pr-fade fixed z-[80] min-w-[11rem] overflow-hidden rounded-xl border border-slate-700/70 py-1 shadow-2xl shadow-black/60 backdrop-blur-xl"
        >
            {resolved.filter(Boolean).map((item, i) => (
                item.separator ? (
                    <div key={`sep-${i}`} className="my-1 h-px bg-slate-800" />
                ) : (
                    <button
                        key={item.label}
                        type="button"
                        role="menuitem"
                        disabled={item.disabled}
                        onClick={() => { onClose(); item.onSelect(menu.payload); }}
                        className={cx(
                            'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[12px] transition-colors',
                            item.disabled
                                ? 'cursor-default text-slate-600'
                                : item.danger
                                    ? 'text-rose-300 hover:bg-rose-500/[0.12]'
                                    : 'text-slate-300 hover:bg-white/[0.06] hover:text-white',
                        )}
                    >
                        <span className="w-4 flex-none text-center text-[11px] opacity-70">{item.icon}</span>
                        <span className="flex-1">{item.label}</span>
                        {item.hint && <span className="font-mono text-[9.5px] text-slate-600">{item.hint}</span>}
                    </button>
                )
            ))}
        </div>
    );
}

/* ------------------------------------------------------------------- feedback */

export function Spinner({ className }) {
    return (
        <span className={cx('pr-spin inline-block h-3 w-3 rounded-full border-[1.5px] border-slate-600 border-t-orange-400', className)} />
    );
}

/** Slim progress bar; `indeterminate` shows the sweeping highlight. */
export function Progress({ value, indeterminate, className }) {
    return (
        <div className={cx('relative h-1 overflow-hidden rounded-full bg-slate-800', indeterminate && 'pr-sweep', className)}>
            {!indeterminate && (
                <div
                    className="h-full rounded-full bg-orange-400 transition-all duration-500"
                    style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
                />
            )}
        </div>
    );
}

export function Sparkline({ data = [], height = 26, color = ACCENT, className }) {
    if (!data.length) return <div style={{ height }} className={className} />;
    const max = Math.max(1, ...data);
    const w = 100 / data.length;
    return (
        <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ height }} className={cx('w-full', className)}>
            {data.map((v, i) => {
                const h = Math.max(v ? 2 : 0.8, (v / max) * (height - 2));
                return (
                    <rect
                        key={i}
                        x={i * w + w * 0.18}
                        y={height - h}
                        width={w * 0.64}
                        height={h}
                        rx={Math.min(1, w * 0.3)}
                        fill={v ? color : 'rgba(100,116,139,0.22)'}
                    />
                );
            })}
        </svg>
    );
}

/* -------------------------------------------------------------------- helpers */

export function useCopy() {
    const [copied, setCopied] = useState(null);
    const timer = useRef(null);
    const copy = (text, key = 'default') => {
        const done = () => {
            setCopied(key);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => setCopied(null), 1500);
        };
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done);
        else done();
    };
    useEffect(() => () => clearTimeout(timer.current), []);
    return [copied, copy];
}

export const shortDate = (iso) => (iso
    ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' })
    : '—');

export function relativeDay(iso) {
    if (!iso) return '';
    const day = String(iso).slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    if (day === today) return 'Today';
    if (day === yesterday) return 'Yesterday';
    return new Date(day).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}


/* ------------------------------------------------------------------ popover */

/**
 * A small panel anchored to its trigger. Used to collapse a long list of options
 * (topics, say) into one control instead of a row of competing chips.
 */
export function Popover({ trigger, children, align = 'left', width = 'w-60' }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [open]);

    return (
        <div ref={ref} className="relative">
            {trigger({ open, toggle: () => setOpen((o) => !o) })}
            {open && (
                <div
                    style={{ background: 'rgba(13,22,40,0.98)' }}
                    className={cx(
                        'pr-fade absolute z-50 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-slate-700/70 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl',
                        align === 'right' ? 'right-0' : 'left-0',
                        width,
                    )}
                >
                    {children({ close: () => setOpen(false) })}
                </div>
            )}
        </div>
    );
}

/* ---------------------------------------------------------------- segmented */

/**
 * A run of related toggles in one container, so a group of filters reads as a single
 * control rather than as loose pills competing with everything around them.
 */
export function Segmented({ options, isActive, onToggle, className }) {
    return (
        <div className={cx('flex items-center gap-0.5 rounded-lg border border-slate-700 bg-slate-900/50 p-0.5', className)}>
            {options.map((o) => (
                <button
                    key={o.id}
                    type="button"
                    title={o.title || o.label}
                    data-testid={o.testId}
                    onClick={() => onToggle(o)}
                    className={cx(
                        'rounded-md px-2 py-[3px] text-[11px] font-medium transition-colors',
                        isActive(o)
                            ? 'bg-orange-400/[0.15] text-orange-200'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
                    )}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}


/* ------------------------------------------------------------ scroll anchor */

/**
 * Keep the reader's place across a layout change.
 *
 * Opening the detail panel narrows the list, so every card re-wraps and the scroll
 * offset — a pixel count — no longer points at the same paper. Capture the row at the
 * top edge before the change, then put it back where it was afterwards.
 *
 * Restoring happens in a layout effect, so it lands before the browser paints and the
 * list never appears to jump.
 *
 * @param dep the value whose change triggers the reflow (the open paper's id).
 * @returns [ref for the scroll container, capture() to call just before the change]
 */
/* ------------------------------------------------------------- layout prefs */

/* Pane widths and collapsed panels are per-device habits, not part of the
   library, so they stay in localStorage and never travel with an export. */
const PREFS_KEY = 'paper-radar:layout';

function readPrefs() {
    try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; }
}

function writePref(key, value) {
    try {
        const all = readPrefs();
        all[key] = value;
        localStorage.setItem(PREFS_KEY, JSON.stringify(all));
    } catch { /* private mode, or a full disk: the layout simply will not stick */ }
}

/** A remembered piece of layout state — a collapsed sidebar, say. */
export function usePref(key, initial) {
    const [value, setValue] = useState(() => {
        const stored = readPrefs()[key];
        return stored === undefined ? initial : stored;
    });
    useEffect(() => { writePref(key, value); }, [key, value]);
    return [value, setValue];
}

const clampWidth = (px, min, max) => Math.min(Math.max(px, min), typeof max === 'function' ? max() : max);

/**
 * A pane the reader sizes by dragging its edge. `edge` says which side the
 * handle sits on, so dragging always moves the border under the cursor. The
 * width is written once on release rather than on every frame of the drag.
 */
export function useResizable({ key, initial, min, max, edge = 'right' }) {
    const [width, setWidth] = useState(() => clampWidth(readPrefs()[key] ?? initial, min, max));
    const [dragging, setDragging] = useState(false);
    const latest = useRef(width);
    latest.current = width;

    const set = useCallback((px) => setWidth(clampWidth(px, min, max)), [min, max]);

    // A window narrow enough to swallow the list wins over a remembered width.
    useEffect(() => {
        const onResize = () => set(latest.current);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [set]);

    const onPointerDown = useCallback((e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = latest.current;
        const direction = edge === 'left' ? -1 : 1;
        const handle = e.currentTarget;
        const { pointerId } = e;
        setDragging(true);

        // Once the pane hits its limit the cursor runs on ahead of the border
        // and ends up over whatever is beside it — the PDF iframe included,
        // which would otherwise eat the rest of the gesture and leave the
        // handle dead. Capture keeps every move addressed here, and the
        // overlay ResizeHandle draws while dragging keeps hit-testing out of
        // frames entirely.
        try { handle.setPointerCapture(pointerId); } catch { /* older engines cope without */ }
        const previousCursor = document.body.style.cursor;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const move = (ev) => set(startWidth + direction * (ev.clientX - startX));
        const up = () => {
            handle.removeEventListener('pointermove', move);
            handle.removeEventListener('pointerup', up);
            handle.removeEventListener('pointercancel', up);
            try { handle.releasePointerCapture(pointerId); } catch { /* already released */ }
            document.body.style.cursor = previousCursor;
            document.body.style.userSelect = '';
            setDragging(false);
            writePref(key, latest.current);
        };
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', up);
        handle.addEventListener('pointercancel', up);
    }, [edge, key, set]);

    const onKeyDown = useCallback((e) => {
        const step = e.shiftKey ? 64 : 16;
        const direction = edge === 'left' ? -1 : 1;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            const next = latest.current + direction * step * (e.key === 'ArrowRight' ? 1 : -1);
            set(next);
            writePref(key, clampWidth(next, min, max));
        }
    }, [edge, key, max, min, set]);

    const reset = useCallback(() => { set(initial); writePref(key, clampWidth(initial, min, max)); }, [initial, key, max, min, set]);

    return {
        width,
        dragging,
        reset,
        handleProps: {
            onPointerDown,
            onKeyDown,
            onDoubleClick: reset,
            role: 'separator',
            'aria-orientation': 'vertical',
            'aria-label': 'Resize pane',
            tabIndex: 0,
        },
    };
}

/** The grab strip itself: a wide hit area, a hairline that only shows on approach. */
export function ResizeHandle({ side = 'right', dragging, className, ...props }) {
    return (
        <>
            <div
                {...props}
                data-testid="resize-handle"
                className={cx(
                    'group absolute inset-y-0 z-20 w-2 cursor-col-resize touch-none outline-none',
                    side === 'right' ? '-right-1' : '-left-1',
                    className,
                )}
            >
                <span
                    aria-hidden
                    className={cx(
                        'pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors',
                        dragging ? 'bg-orange-400' : 'bg-transparent group-hover:bg-orange-400/60 group-focus:bg-orange-400/60',
                    )}
                />
            </div>
            {/* Covers the page for the length of the drag so nothing underneath
                — an iframe, a draggable card — can steal the gesture. */}
            {dragging && <div aria-hidden className="fixed inset-0 z-[95] cursor-col-resize" />}
        </>
    );
}

export function useScrollAnchor(dep) {
    const scrollRef = useRef(null);
    const anchor = useRef(null);

    // Offsets are measured against the container's own top edge, never the
    // viewport: the header above it can change height too, and that movement
    // must not be mistaken for the list having scrolled.
    const offsetOf = (el, node) => node.getBoundingClientRect().top - el.getBoundingClientRect().top;

    const capture = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const rows = el.querySelectorAll('[data-paper-id]');
        anchor.current = null;
        for (let i = 0; i < rows.length; i += 1) {
            // The first row still showing below the top edge is what the eye is on.
            if (rows[i].getBoundingClientRect().bottom > el.getBoundingClientRect().top + 4) {
                anchor.current = { id: rows[i].dataset.paperId, offset: offsetOf(el, rows[i]) };
                return;
            }
        }
    }, []);

    useLayoutEffect(() => {
        const el = scrollRef.current;
        const held = anchor.current;
        anchor.current = null;
        if (!el || !held) return undefined;

        const apply = () => {
            const node = el.querySelector(`[data-paper-id="${held.id}"]`);
            if (!node) return;
            const drift = offsetOf(el, node) - held.offset;
            if (Math.abs(drift) > 0.5) el.scrollTop += drift;
        };
        apply();

        // Opening the panel halves the column, and the titles rewrap over the
        // next few frames rather than all at once, so one correction is not
        // enough: keep the row pinned until the reflow settles, and step aside
        // the moment the reader scrolls for themselves.
        const inner = el.firstElementChild;
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(apply);
        let timer = null;
        const stop = () => {
            if (observer) observer.disconnect();
            if (timer) clearTimeout(timer);
            timer = null;
            el.removeEventListener('wheel', stop);
            el.removeEventListener('touchstart', stop);
        };
        if (observer && inner) observer.observe(inner);
        el.addEventListener('wheel', stop, { passive: true });
        el.addEventListener('touchstart', stop, { passive: true });
        timer = setTimeout(stop, 700);
        return stop;
    }, [dep]);

    return [scrollRef, capture];
}
