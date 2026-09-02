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
    active: 'bg-orange-400/12 text-orange-200 border-orange-400/40',
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
                active ? (tone || 'bg-orange-400/12 text-orange-300') : 'text-slate-500 hover:bg-white/8 hover:text-slate-100',
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
                    ? 'border-orange-400/40 bg-orange-400/12 text-orange-200'
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
export const Count = ({ children, className }) => (
    <span className={cx('font-mono text-[10px] tabular-nums text-slate-500', className)}>{children}</span>
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
                                    ? 'text-rose-300 hover:bg-rose-500/12'
                                    : 'text-slate-300 hover:bg-white/6 hover:text-white',
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
