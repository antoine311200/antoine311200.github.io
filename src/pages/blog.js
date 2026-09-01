import React, { useState, useEffect, useMemo } from 'react';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import { Link } from 'react-router-dom';

import Template from '../components/template';
import SelectMenu from '../components/dropdown';
import title2uri from '../utils';

import '../style/blog.css';

// ─── Tag colors ───────────────────────────────────────────────────────────────

const TAG_PALETTE = {
  mathematics:           { border: 'border-blue-500/70',    text: 'text-blue-300',    bg: 'bg-blue-950/30' },
  'machine learning':    { border: 'border-violet-500/70',  text: 'text-violet-300',  bg: 'bg-violet-950/30' },
  physics:               { border: 'border-cyan-500/70',    text: 'text-cyan-300',    bg: 'bg-cyan-950/30' },
  'tensor networks':     { border: 'border-sky-500/70',     text: 'text-sky-300',     bg: 'bg-sky-950/30' },
  'quantum computing':   { border: 'border-indigo-500/70',  text: 'text-indigo-300',  bg: 'bg-indigo-950/30' },
  chemistry:             { border: 'border-emerald-500/70', text: 'text-emerald-300', bg: 'bg-emerald-950/30' },
  finance:               { border: 'border-amber-500/70',   text: 'text-amber-300',   bg: 'bg-amber-950/30' },
  probability:           { border: 'border-orange-500/70',  text: 'text-orange-300',  bg: 'bg-orange-950/30' },
  'stochastic calculus': { border: 'border-rose-500/70',    text: 'text-rose-300',    bg: 'bg-rose-950/30' },
  analysis:              { border: 'border-purple-500/70',  text: 'text-purple-300',  bg: 'bg-purple-950/30' },
  'reinforcement learning': { border: 'border-fuchsia-500/70', text: 'text-fuchsia-300', bg: 'bg-fuchsia-950/30' },
  'neural networks':     { border: 'border-pink-500/70',    text: 'text-pink-300',    bg: 'bg-pink-950/30' },
  optimization:          { border: 'border-teal-500/70',    text: 'text-teal-300',    bg: 'bg-teal-950/30' },
};

const FALLBACK = { border: 'border-slate-600/70', text: 'text-slate-300', bg: 'bg-slate-800/30' };

function getTag(tag) {
  return TAG_PALETTE[tag?.toLowerCase()] || FALLBACK;
}

// ─── Search input ─────────────────────────────────────────────────────────────

function SearchInput({ value, onChange }) {
  return (
    <div className="relative flex-1 min-w-0">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
      >
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search articles…"
        className="w-full pl-9 pr-3 py-2 rounded-lg text-sm
          bg-slate-800/70 border border-slate-700 text-slate-200
          placeholder-slate-500 focus:outline-none focus:border-slate-500
          hover:border-slate-600 transition-colors duration-150"
      />
    </div>
  );
}

// ─── Tag pill ─────────────────────────────────────────────────────────────────

function TagPill({ tag, active, onClick }) {
  const cfg = getTag(tag);
  return (
    <button
      onClick={() => onClick(tag)}
      className={`text-xs px-2.5 py-1 rounded-full border font-medium
        transition-all duration-150 leading-none
        ${active
          ? `${cfg.border} ${cfg.text} ${cfg.bg}`
          : 'border-slate-700 text-slate-500 bg-transparent hover:border-slate-600 hover:text-slate-400'
        }`}
    >
      {tag}
    </button>
  );
}

// ─── Article card ─────────────────────────────────────────────────────────────

function ArticleCard({ title, date, description, keywords = [], imagePath }) {
  return (
    <Link
      to={`/blog/${encodeURIComponent(title2uri(title))}`}
      className="group block focus:outline-none"
    >
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 p-4 rounded-xl
        border border-slate-700/50 hover:border-slate-600
        bg-slate-800/10 hover:bg-slate-800/30
        transition-all duration-200">

        {/* Thumbnail */}
        {imagePath && (
          <div className="flex-shrink-0">
            <img
              src={imagePath}
              alt={title}
              className="w-full sm:w-44 h-28 object-cover rounded-lg
                border border-slate-700/40 group-hover:border-slate-600/60
                transition-colors duration-200"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
          <div>
            <h2 className="text-slate-100 text-sm font-semibold leading-snug mb-1
              group-hover:text-white transition-colors duration-150">
              {title}
            </h2>
            <p className="text-orange-300 text-xs font-medium mb-2">{date}</p>
            {description && (
              <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">{description}</p>
            )}
          </div>

          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {keywords.slice(0, 5).map((kw, i) => {
                const c = getTag(kw);
                return (
                  <span key={i}
                    className={`text-[10px] px-2 py-0.5 rounded-full border ${c.border} ${c.text} ${c.bg}`}>
                    {kw}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Arrow */}
        <div className="hidden sm:flex items-center flex-shrink-0">
          <span className="text-slate-600 group-hover:text-slate-400 transition-colors text-base">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Blog page ────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'date-recent', label: 'Newest first' },
  { value: 'date-old',    label: 'Oldest first' },
  { value: 'alpha',       label: 'Alphabetical' },
];

const Blog = ({ dataArticles = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [sortType, setSortType] = useState('date-recent');

  useEffect(() => { document.title = 'Blog | Antoine Debouchage'; }, []);

  const allTags = useMemo(() => {
    const s = new Set();
    dataArticles.forEach(a => (a.keywords || []).forEach(k => s.add(k.toLowerCase())));
    return Array.from(s).sort();
  }, [dataArticles]);

  const filteredArticles = useMemo(() => {
    return dataArticles
      .filter(a => {
        const q = searchTerm.toLowerCase();
        return !q ||
          a.title?.toLowerCase().includes(q) ||
          (a.keywords || []).some(k => k.toLowerCase().includes(q)) ||
          a.description?.toLowerCase().includes(q);
      })
      .filter(a =>
        !selectedTag || (a.keywords || []).some(k => k.toLowerCase() === selectedTag)
      )
      .sort((a, b) => {
        if (sortType === 'date-recent') return new Date(b.date) - new Date(a.date);
        if (sortType === 'date-old')    return new Date(a.date) - new Date(b.date);
        return (a.title || '').localeCompare(b.title || '');
      });
  }, [dataArticles, searchTerm, selectedTag, sortType]);

  const toggleTag = (tag) => setSelectedTag(p => (p === tag ? '' : tag));

  return (
    <Template iconColor="black">
      <div className="max-w-5xl mx-auto px-6 sm:px-12 py-10">

        {/* ── Header ── */}
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 mb-1">Blog</h1>
            {/* <p className="text-slate-500 text-sm">
              Notes on mathematics, machine learning, physics, and research.
            </p> */}
          </div>
          <span className="text-slate-600 text-sm flex-shrink-0">
            {dataArticles.length} article{dataArticles.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Controls row ── */}
        <div className="flex items-center gap-2 mb-3">
          <SearchInput value={searchTerm} onChange={setSearchTerm} />
          <SelectMenu
            name="sort"
            selected={sortType}
            setSelected={setSortType}
            options={SORT_OPTIONS}
          />
        </div>

        {/* ── Tag row ── */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            <TagPill tag="All" active={selectedTag === ''} onClick={() => setSelectedTag('')} />
            {allTags.map(tag => (
              <TagPill key={tag} tag={tag} active={selectedTag === tag} onClick={toggleTag} />
            ))}
          </div>
        )}

        <div className="border-t border-slate-800 mb-4" />

        {/* ── Status line ── */}
        {(searchTerm || selectedTag) && (
          <p className="text-slate-600 text-xs mb-3">
            {filteredArticles.length} result{filteredArticles.length !== 1 ? 's' : ''}
            {selectedTag ? ` · tag: "${selectedTag}"` : ''}
            {searchTerm ? ` · "${searchTerm}"` : ''}
          </p>
        )}

        {/* ── Article list ── */}
        <TransitionGroup className="flex flex-col gap-3">
          {filteredArticles.map((item, i) => (
            <CSSTransition key={item.title + i} timeout={250} classNames="fade">
              <ArticleCard {...item} />
            </CSSTransition>
          ))}
        </TransitionGroup>

        {filteredArticles.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-500 mb-1">No articles found</p>
            <p className="text-slate-600 text-sm">
              {searchTerm || selectedTag ? 'Try clearing the filters' : 'Check back soon'}
            </p>
          </div>
        )}
      </div>
      <div className="h-12" />
    </Template>
  );
};

export default Blog;
