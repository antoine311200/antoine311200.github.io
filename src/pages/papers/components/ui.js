/**
 * Small presentational primitives shared across every Paper Radar screen.
 *
 * These follow the rest of the site: slate surfaces over the radial-gradient
 * background, `slate-700/800` hairlines, `rounded-xl`/`rounded-full` geometry, and
 * orange as the single accent. Semantic colours stay distinct from the accent —
 * emerald reads "done", sky reads "queued", rose reads "destructive".
 */

import React, { useEffect, useRef, useState } from 'react';

export const cx = (...parts) => parts.filter(Boolean).join(' ');

/** The page background used by the app shell, matching `components/template.js`. */
export const PAGE_BACKGROUND = {
    background: '#0f172a',
    backgroundImage:
        'radial-gradient(circle at 10% 90%, #203157, transparent 500px), '
        + 'radial-gradient(circle at 95% 20%, #192745, transparent 500px)',
};

/* --------------------------------------------------------------------- button */

const VARIANTS = {
    primary: 'bg-orange-400/90 text-slate-950 hover:bg-orange-300 border-orange-300/50 font-semibold',
    ghost: 'bg-slate-800/40 text-slate-300 hover:bg-slate-800 hover:text-white border-slate-700',
    subtle: 'bg-transparent text-slate-500 hover:text-white hover:bg-white/5 border-transparent',
    danger: 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border-rose-500/40',
    active: 'bg-orange-400/10 text-orange-200 border-orange-400/40',
};

export function Button({ variant = 'ghost', size = 'md', className, as: As = 'button', ...props }) {
    const sizes = { sm: 'px-2.5 py-1 text-[11px]', md: 'px-3 py-1.5 text-xs', lg: 'px-4 py-2 text-sm' };
    return (
        <As
            {...props}
            className={cx(
                'inline-flex items-center gap-1.5 rounded-lg border font-medium transition-colors duration-150',
                'disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap',
                VARIANTS[variant], sizes[size], className,
            )}
        />
    );
}

/* ---------------------------------------------------------------------- chips */

export function Chip({ color, children, onClick, active, title, className }) {
    const style = color
        ? { backgroundColor: `${color}1a`, color, borderColor: `${color}59` }
        : undefined;
    return (
        <span
            title={title}
            onClick={onClick}
            style={style}
            className={cx(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-4',
                !color && (active
                    ? 'border-orange-400/40 bg-orange-400/10 text-orange-200'
                    : 'border-slate-700 bg-slate-800/40 text-slate-400'),
                onClick && 'cursor-pointer hover:brightness-125',
                className,
            )}
        >
            {children}
        </span>
    );
}

/** Relevance score badge — the accent marks what is worth your morning. */
export function ScoreBadge({ score, reasons = [] }) {
    const tone = score >= 60 ? 'text-orange-200 border-orange-400/40 bg-orange-400/10'
        : score >= 30 ? 'text-slate-300 border-slate-700 bg-slate-800/60'
            : score > 0 ? 'text-slate-500 border-slate-800 bg-slate-900/60'
                : 'text-slate-600 border-slate-800/60 bg-transparent';
    return (
        <span
            title={reasons.map((r) => r.label).join('\n') || 'No matching signal'}
            className={cx('rounded-full border px-2 py-0.5 font-mono text-[10px] tabular-nums', tone)}
        >
            {score}
        </span>
    );
}

/* --------------------------------------------------------------------- layout */

export function Panel({ title, action, children, className, bodyClass }) {
    return (
        <section className={cx('rounded-xl border border-slate-800 bg-slate-900/40 shadow-lg shadow-black/10', className)}>
            {(title || action) && (
                <header className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</h3>
                    {action}
                </header>
            )}
            {/* bodyClass replaces the default padding rather than fighting it in the cascade. */}
            <div className={bodyClass || 'p-4'}>{children}</div>
        </section>
    );
}

export function Empty({ icon = '◦', title, children, action }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700/70 bg-slate-900/20 px-6 py-14 text-center">
            <div className="text-2xl text-slate-600">{icon}</div>
            <p className="text-sm font-medium text-slate-200">{title}</p>
            {children && <p className="max-w-md text-xs leading-relaxed text-slate-500">{children}</p>}
            {action && <div className="mt-2">{action}</div>}
        </div>
    );
}

export function StatTile({ label, value, hint, tone = 'default' }) {
    const tones = {
        default: 'text-slate-100',
        good: 'text-emerald-300',
        warn: 'text-amber-300',
        accent: 'text-orange-300',
    };
    return (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
            <div className={cx('mt-1 text-2xl font-semibold tabular-nums', tones[tone])}>{value}</div>
            {hint && <div className="mt-0.5 text-[11px] text-slate-500">{hint}</div>}
        </div>
    );
}

/* --------------------------------------------------------------------- inputs */

export function Field({ label, hint, children }) {
    return (
        <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-slate-400">{label}</span>
            {children}
            {hint && <span className="mt-1 block text-[10px] text-slate-500">{hint}</span>}
        </label>
    );
}

export const inputClass =
    'w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 '
    + 'placeholder:text-slate-600 outline-none transition focus:border-orange-400/60 focus:bg-slate-950';

export function Input(props) {
    return <input {...props} className={cx(inputClass, props.className)} />;
}

export function Toggle({ checked, onChange, label, hint }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className="flex w-full items-start gap-3 rounded-lg px-1 py-1.5 text-left transition hover:bg-white/5"
        >
            <span
                className={cx(
                    'mt-0.5 h-4 w-7 flex-none rounded-full border transition-colors',
                    checked ? 'border-orange-300/60 bg-orange-400/80' : 'border-slate-600 bg-slate-800',
                )}
            >
                <span
                    className={cx(
                        'block h-3 w-3 translate-y-[1.5px] rounded-full bg-white transition-transform',
                        checked ? 'translate-x-[15px]' : 'translate-x-[2px]',
                    )}
                />
            </span>
            <span className="min-w-0">
                <span className="block text-xs font-medium text-slate-200">{label}</span>
                {hint && <span className="block text-[10px] leading-relaxed text-slate-500">{hint}</span>}
            </span>
        </button>
    );
}

/** Comma / Enter separated token editor used for keywords, categories, tags. */
export function TokenInput({ value = [], onChange, placeholder, color }) {
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
                    style={color ? { backgroundColor: `${color}1a`, color, borderColor: `${color}59` } : undefined}
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
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(draft); }
                    if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
                }}
                onBlur={() => commit(draft)}
                placeholder={value.length ? '' : placeholder}
                className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none"
            />
        </div>
    );
}

/* --------------------------------------------------------------------- modals */

export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm"
            onMouseDown={onClose}
        >
            <div
                onMouseDown={(e) => e.stopPropagation()}
                style={{ background: 'rgba(13,22,40,0.97)' }}
                className={cx(
                    'mt-[8vh] w-full rounded-2xl border border-slate-700/60 shadow-2xl shadow-black/60 backdrop-blur-xl',
                    width,
                )}
            >
                <header className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
                    <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
                    <Button variant="subtle" size="sm" onClick={onClose}>Esc</Button>
                </header>
                <div className="px-5 py-4">{children}</div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ sparkline */

export function Sparkline({ data = [], height = 34, color = '#fb923c' }) {
    if (!data.length) return <div style={{ height }} />;
    const max = Math.max(1, ...data);
    const w = 100 / Math.max(1, data.length);
    return (
        <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ height }} className="w-full">
            {data.map((v, i) => {
                const h = Math.max(v ? 2 : 0.6, (v / max) * (height - 4));
                return (
                    <rect
                        key={i}
                        x={i * w + w * 0.15}
                        y={height - h}
                        width={w * 0.7}
                        height={h}
                        rx={Math.min(1.2, w * 0.3)}
                        fill={v ? color : 'rgba(100,116,139,0.25)'}
                    />
                );
            })}
        </svg>
    );
}

/** Horizontal proportion bar used in the stats screen. */
export function BarRow({ label, value, max, color = '#fb923c', suffix }) {
    const pct = max ? Math.max(2, (value / max) * 100) : 0;
    return (
        <div className="flex items-center gap-3 py-1">
            <div className="w-40 flex-none truncate text-xs text-slate-400" title={label}>{label}</div>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <div className="w-12 flex-none text-right font-mono text-[11px] tabular-nums text-slate-400">
                {value}{suffix}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------- helpers */

export function useCopy() {
    const [copied, setCopied] = useState(null);
    const timer = useRef(null);
    const copy = (text, key = 'default') => {
        const done = () => {
            setCopied(key);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => setCopied(null), 1600);
        };
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done);
        else done();
    };
    useEffect(() => () => clearTimeout(timer.current), []);
    return [copied, copy];
}

export function relativeDay(iso) {
    if (!iso) return '';
    const day = String(iso).slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    if (day === today) return 'Today';
    if (day === yesterday) return 'Yesterday';
    const diff = Math.round((Date.now() - new Date(day).getTime()) / 864e5);
    if (diff < 7) return `${diff} days ago`;
    return new Date(day).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function shortDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' });
}
