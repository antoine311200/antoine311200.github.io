import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Template from './template';
import MarkdownRenderer from './MarkdownRenderer';
import 'katex/dist/katex.min.css';

import title2uri from '../utils';

// ─── JS Article renderer (legacy) ─────────────────────────────────────────────

function JSArticleRenderer({ article }) {
  const [activeSection, setActiveSection] = useState(
    article.content?.[0]?.id || ''
  );

  useEffect(() => {
    document.title = `Blog — ${article.title}`;
  }, [article.title]);

  // Scroll-based active section tracking
  useEffect(() => {
    const sectionIds = [];
    const collect = (sections) => {
      for (const s of sections) {
        sectionIds.push(s.id);
        if (s.subsections) collect(s.subsections);
        if (s.subsubsections) sectionIds.push(...s.subsubsections.map(ss => ss.id));
      }
    };
    collect(article.content);

    const handleScroll = () => {
      const scrollY = window.scrollY;
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el && scrollY >= el.offsetTop - 120) {
          setActiveSection(sectionIds[i]);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [article]);

  const handleSectionClick = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const renderSections = (sections, depth) => {
    const fontSize = Math.max(16, 26 - depth * 4);
    return sections.map((section) => (
      <section key={section.id} id={section.id} className="mb-8">
        <h2
          style={{ fontSize: `${fontSize}px` }}
          className="font-semibold text-slate-100 mb-3 pb-1 border-b border-slate-800"
        >
          {section.title}
        </h2>
        <div className="text-slate-300 leading-relaxed">{section.content}</div>
        {section.subsections && renderSections(section.subsections, depth + 1)}
      </section>
    ));
  };

  const renderTOC = (sections, depth) => {
    const maxLen = 32;
    return (
      <ul className={depth === 0 ? 'ml-1' : 'ml-3'}>
        {sections.map((section) => (
          <li
            key={section.id}
            style={{ fontSize: `${Math.max(12, 16 - depth * 2)}px`, marginTop: '5px' }}
          >
            <button
              className={`cursor-pointer block w-full text-left transition-all duration-100 relative group
                ${activeSection === section.id
                  ? 'text-orange-300 font-medium border-l-2 border-orange-400 pl-2'
                  : 'text-slate-500 hover:text-slate-300'
                }`}
              onClick={() => handleSectionClick(section.id)}
            >
              {section.title.length > maxLen ? section.title.slice(0, maxLen) + '…' : section.title}
              {section.title.length > maxLen && (
                <span className="absolute bg-slate-700 text-slate-200 p-2 text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none top-6 left-0 z-10 w-48 shadow-lg">
                  {section.title}
                </span>
              )}
            </button>
            {section.subsections && renderTOC(section.subsections, depth + 1)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Template iconColor="black">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* Back link */}
        <div className="mb-4">
          <a
            href="/#/blog"
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors text-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Blog
          </a>
        </div>

        <div className="bg-slate-900/40 rounded-xl border border-slate-800 shadow-xl p-6 md:p-10 relative">

          {/* Header */}
          <div className="mb-8 pb-6 border-b border-slate-800">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-100 mb-2">
              {article.title}
            </h1>
            {article.date && (
              <p className="text-orange-300 text-sm font-medium mb-2">{article.date}</p>
            )}
            {article.keywords?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {article.keywords.map((kw, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full border border-slate-700 text-slate-400 bg-slate-800/40">
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* TOC — fixed on desktop */}
          <div className="hidden lg:block lg:fixed lg:right-4 lg:top-28 w-52">
            <div className="sticky top-20 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-4 shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-3">
                Contents
              </p>
              {renderTOC(article.content, 0)}
            </div>
          </div>

          <hr className="mb-6 border-slate-800 lg:hidden" />

          {/* Body */}
          <div
            className="lg:pr-64"
            style={{ fontFamily: 'Georgia, Garamond, "Times New Roman", serif' }}
          >
            {renderSections(article.content, 0)}
          </div>
        </div>
      </main>
    </Template>
  );
}

// ─── Smart router ──────────────────────────────────────────────────────────────

export default function Article({ data = [] }) {
  const { title } = useParams();

  const article = data.find(a =>
    encodeURIComponent(title2uri(a.title)) === encodeURIComponent(title2uri(decodeURIComponent(title)))
  );

  useEffect(() => {
    if (article?.title) document.title = `Blog — ${article.title}`;
  }, [article]);

  if (!article) {
    return (
      <Template iconColor="black">
        <div className="flex flex-col items-center justify-center min-h-64 gap-4 text-slate-500">
          <p className="text-lg">Article not found</p>
          <a href="/#/blog" className="text-orange-300 hover:text-orange-200 text-sm underline">
            ← Back to blog
          </a>
        </div>
      </Template>
    );
  }

  // Markdown article
  if (article.isMd && article.fileUrl) {
    return <MarkdownRenderer fileUrl={article.fileUrl} />;
  }

  // Legacy JS article
  return <JSArticleRenderer article={article} />;
}
