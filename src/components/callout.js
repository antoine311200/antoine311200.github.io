import React, { useState } from 'react';

const CALLOUT_CONFIG = {
  theorem: {
    icon: '∎',
    label: 'Theorem',
    border: 'border-blue-500',
    bg: 'bg-blue-950/40',
    header: 'bg-blue-900/30',
    title: 'text-blue-300',
  },
  definition: {
    icon: '△',
    label: 'Definition',
    border: 'border-violet-500',
    bg: 'bg-violet-950/40',
    header: 'bg-violet-900/30',
    title: 'text-violet-300',
  },
  lemma: {
    icon: '◇',
    label: 'Lemma',
    border: 'border-cyan-500',
    bg: 'bg-cyan-950/40',
    header: 'bg-cyan-900/30',
    title: 'text-cyan-300',
  },
  corollary: {
    icon: '⊢',
    label: 'Corollary',
    border: 'border-sky-500',
    bg: 'bg-sky-950/40',
    header: 'bg-sky-900/30',
    title: 'text-sky-300',
  },
  proof: {
    icon: '□',
    label: 'Proof',
    border: 'border-slate-500',
    bg: 'bg-slate-800/40',
    header: 'bg-slate-700/30',
    title: 'text-slate-300',
  },
  remark: {
    icon: '◎',
    label: 'Remark',
    border: 'border-amber-500',
    bg: 'bg-amber-950/40',
    header: 'bg-amber-900/30',
    title: 'text-amber-300',
  },
  example: {
    icon: '▷',
    label: 'Example',
    border: 'border-emerald-500',
    bg: 'bg-emerald-950/40',
    header: 'bg-emerald-900/30',
    title: 'text-emerald-300',
  },
  note: {
    icon: '✎',
    label: 'Note',
    border: 'border-indigo-500',
    bg: 'bg-indigo-950/40',
    header: 'bg-indigo-900/30',
    title: 'text-indigo-300',
  },
  warning: {
    icon: '⚠',
    label: 'Warning',
    border: 'border-orange-500',
    bg: 'bg-orange-950/40',
    header: 'bg-orange-900/30',
    title: 'text-orange-300',
  },
  danger: {
    icon: '✕',
    label: 'Danger',
    border: 'border-red-500',
    bg: 'bg-red-950/40',
    header: 'bg-red-900/30',
    title: 'text-red-300',
  },
  tip: {
    icon: '→',
    label: 'Tip',
    border: 'border-green-500',
    bg: 'bg-green-950/40',
    header: 'bg-green-900/30',
    title: 'text-green-300',
  },
  intuition: {
    icon: '✦',
    label: 'Intuition',
    border: 'border-yellow-500',
    bg: 'bg-yellow-950/40',
    header: 'bg-yellow-900/30',
    title: 'text-yellow-300',
  },
  property: {
    icon: '∝',
    label: 'Property',
    border: 'border-pink-500',
    bg: 'bg-pink-950/40',
    header: 'bg-pink-900/30',
    title: 'text-pink-300',
  },
  abstract: {
    icon: '◈',
    label: 'Abstract',
    border: 'border-purple-500',
    bg: 'bg-purple-950/40',
    header: 'bg-purple-900/30',
    title: 'text-purple-300',
  },
};

export default function Callout({ type = 'note', title = '', children, collapsible = false }) {
  const [open, setOpen] = useState(!collapsible);
  const cfg = CALLOUT_CONFIG[type.toLowerCase()] || CALLOUT_CONFIG.note;
  const displayTitle = title || cfg.label;

  return (
    <div className={`my-5 rounded-lg border-l-4 ${cfg.border} ${cfg.bg} overflow-hidden`}>
      {/* Header */}
      <div
        className={`flex items-center gap-2.5 px-4 py-2.5 ${cfg.header} ${collapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={collapsible ? () => setOpen(s => !s) : undefined}
      >
        <span className={`font-mono text-base leading-none ${cfg.title}`}>{cfg.icon}</span>
        <span className={`font-semibold text-sm tracking-wide ${cfg.title} flex-1`}>{displayTitle}</span>
        {collapsible && (
          <span
            className={`text-xs ${cfg.title} transition-transform duration-200 inline-block`}
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            ▾
          </span>
        )}
      </div>

      {/* Content */}
      {open && (
        <div className="px-4 py-3 text-slate-200 text-sm leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}
