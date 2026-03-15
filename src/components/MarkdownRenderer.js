import React, { useMemo, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';

import Template from './template';
import Callout from './callout';
import { parseFrontMatter, slugify, readingTime, buildToc } from '../utils/articleUtils';

// ─── Typography constants ──────────────────────────────────────────────────────

// EB Garamond is loaded via Google Fonts in public/index.html
const ARTICLE_FONT = '"EB Garamond", "Palatino Linotype", Georgia, serif';
const SANS_FONT    = 'system-ui, -apple-system, sans-serif';

// ─── Table of Contents ────────────────────────────────────────────────────────

function TocItem({ node, depth, activeId }) {
  const isActive = activeId === node.id;
  return (
    <li className="list-none">
      <a
        href={`#${node.id}`}
        className={`block py-[3px] leading-snug transition-all duration-150 no-underline
          ${isActive
            ? 'text-orange-300 font-medium'
            : 'text-slate-400 hover:text-slate-200'
          }`}
        style={{
          fontSize: depth === 0 ? '12.5px' : '11.5px',
          paddingLeft: `${depth * 12}px`,
          borderLeft: isActive ? '2px solid rgb(251 146 60)' : '2px solid transparent',
          paddingRight: '4px',
          fontFamily: SANS_FONT,
          textDecoration: 'none',
        }}
      >
        {node.title}
      </a>
      {node.children?.length > 0 && (
        <ul className="p-0 m-0">
          {node.children.map(c => (
            <TocItem key={c.id} node={c} depth={depth + 1} activeId={activeId} />
          ))}
        </ul>
      )}
    </li>
  );
}

function TableOfContents({ toc, activeId }) {
  if (!toc?.length) return null;
  return (
    <nav>
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-3"
        style={{ fontFamily: SANS_FONT }}
      >
        Contents
      </p>
      <ul className="p-0 m-0 space-y-0.5">
        {toc.map(node => (
          <TocItem key={node.id} node={node} depth={0} activeId={activeId} />
        ))}
      </ul>
    </nav>
  );
}

// ─── Mobile TOC (collapsible) ─────────────────────────────────────────────────

function MobileToc({ toc, activeId }) {
  if (!toc?.length) return null;
  return (
    <div className="md:hidden mb-8 rounded-xl border border-slate-700/60 overflow-hidden">
      <details className="group">
        <summary
          className="flex items-center justify-between px-4 py-3 cursor-pointer select-none
            bg-slate-800/50 text-slate-300 list-none [&::-webkit-details-marker]:hidden"
          style={{ fontFamily: SANS_FONT, fontSize: '13px' }}
        >
          <span className="flex items-center gap-2 font-medium">
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
            </svg>
            Table of Contents
          </span>
          <svg
            className="w-3.5 h-3.5 text-slate-500 transition-transform duration-200 group-open:rotate-180"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <div className="px-4 py-4 bg-slate-900/40">
          <TableOfContents toc={toc} activeId={activeId} />
        </div>
      </details>
    </div>
  );
}

// ─── Callout blockquote renderer ─────────────────────────────────────────────

function CalloutBlockquote({ node, children, body }) {
  const plainBlockquote = (
    <blockquote className="border-l-4 border-slate-600 pl-5 my-5 text-slate-400 italic">
      {children}
    </blockquote>
  );

  if (!node?.position || !body) return plainBlockquote;

  const srcLines = body.split('\n');
  const startLine = node.position.start.line - 1;
  const endLine   = node.position.end.line   - 1;
  const blockLines = srcLines.slice(startLine, endLine + 1);
  const innerLines = blockLines.map(ln => ln.replace(/^\s*>\s?/, ''));

  const firstNonEmptyIndex = innerLines.findIndex(l => l.trim() !== '');
  if (firstNonEmptyIndex === -1) return plainBlockquote;

  const firstLine = innerLines[firstNonEmptyIndex].trim();
  const markerRe  = /^\[!([^\]\-]+?)](-?)(?:\s+(.*))?$/;
  const mm = firstLine.match(markerRe);
  if (!mm) return plainBlockquote;

  const type         = mm[1].trim().toLowerCase();
  const collapsible  = mm[2] === '-';
  const title        = (mm[3] || '').trim();
  const innerMarkdown = innerLines.slice(firstNonEmptyIndex + 1).join('\n').trim();

  return (
    <Callout type={type} title={title} collapsible={collapsible}>
      {innerMarkdown ? (
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            p: ({ children: c }) => (
              <p className="mb-2 last:mb-0 text-slate-200" style={{ fontFamily: ARTICLE_FONT, fontSize: 'clamp(14px, 1.8vw, 16px)' }}>{c}</p>
            ),
            blockquote: ({ children: c }) => (
              <blockquote className="border-l-4 border-slate-500 pl-4 italic text-slate-400">{c}</blockquote>
            ),
          }}
        >
          {innerMarkdown}
        </ReactMarkdown>
      ) : null}
    </Callout>
  );
}

// ─── Heading factory ──────────────────────────────────────────────────────────
// Extracts only plain-string children so the slug matches buildToc (which
// strips inline math / code / formatting before slugifying).

function extractStringChildren(children) {
  return React.Children.toArray(children)
    .map(c => (typeof c === 'string' ? c : typeof c === 'number' ? String(c) : ''))
    .join('');
}

function makeHeading(level, style) {
  return function HeadingComp({ children }) {
    const id  = slugify(extractStringChildren(children));
    const Tag = `h${level}`;
    return (
      <Tag id={id} className={style.className} style={style.css}>
        {children}
      </Tag>
    );
  };
}

// ─── Tag colors ───────────────────────────────────────────────────────────────

const TAG_COLORS = {
  mathematics:             'border-blue-600    text-blue-400',
  'machine learning':      'border-violet-600  text-violet-400',
  physics:                 'border-cyan-600    text-cyan-400',
  'tensor networks':       'border-sky-600     text-sky-400',
  'quantum computing':     'border-indigo-600  text-indigo-400',
  chemistry:               'border-emerald-600 text-emerald-400',
  finance:                 'border-amber-600   text-amber-400',
  probability:             'border-orange-600  text-orange-400',
  'stochastic calculus':   'border-rose-600    text-rose-400',
  analysis:                'border-purple-600  text-purple-400',
  'reinforcement learning':'border-fuchsia-600 text-fuchsia-400',
  'neural networks':       'border-pink-600    text-pink-400',
};

function getTagColor(tag) {
  return TAG_COLORS[tag?.toLowerCase()] || 'border-slate-600 text-slate-400';
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MarkdownRenderer({ fileUrl, source: sourceProp }) {
  const [rawSource, setRawSource] = useState(sourceProp || '');

  useEffect(() => {
    if (fileUrl && !sourceProp) {
      fetch(fileUrl)
        .then(r => r.text())
        .then(setRawSource)
        .catch(err => console.error('Failed to load article:', err));
    }
  }, [fileUrl, sourceProp]);

  const { meta, body } = useMemo(() => parseFrontMatter(rawSource), [rawSource]);
  const toc = useMemo(() => buildToc(body), [body]);

  // Track which heading is currently in view
  const [activeId, setActiveId] = useState('');
  useEffect(() => {
    if (!body) return;
    // Small delay so DOM is populated after ReactMarkdown renders
    const timer = setTimeout(() => {
      const headingEls = document.querySelectorAll(
        'article.md-article h1[id], article.md-article h2[id], article.md-article h3[id], article.md-article h4[id]'
      );
      if (!headingEls.length) return;

      const observer = new IntersectionObserver(
        entries => {
          const visible = entries
            .filter(e => e.isIntersecting)
            .sort((a, b) => a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top);
          if (visible.length > 0) setActiveId(visible[0].target.id);
        },
        { rootMargin: '-72px 0px -65% 0px', threshold: 0 }
      );

      headingEls.forEach(el => observer.observe(el));
      return () => observer.disconnect();
    }, 120);

    return () => clearTimeout(timer);
  }, [body]);

  const tags = useMemo(
    () => (meta.tags ? meta.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
    [meta.tags]
  );
  const estReadTime = useMemo(() => readingTime(body), [body]);

  // ── Heading styles ─────────────────────────────────────────────────────────
  // Use EB Garamond for headings too – gives the scholarly feel.
  const headingBase = { fontFamily: ARTICLE_FONT };
  const markdownComponents = {
    h1: makeHeading(1, {
      className: 'text-slate-100 mt-12 mb-5 pb-2 border-b border-slate-700/50 font-semibold',
      css: { ...headingBase, fontSize: '2rem', lineHeight: 1.25 },
    }),
    h2: makeHeading(2, {
      className: 'text-slate-100 mt-10 mb-4 font-semibold',
      css: { ...headingBase, fontSize: '1.6rem', lineHeight: 1.3 },
    }),
    h3: makeHeading(3, {
      className: 'text-slate-200 mt-8 mb-3 font-semibold italic',
      css: { ...headingBase, fontSize: '1.3rem', lineHeight: 1.35 },
    }),
    h4: makeHeading(4, {
      className: 'text-slate-200 mt-6 mb-2 font-semibold',
      css: { ...headingBase, fontSize: '1.1rem', lineHeight: 1.4 },
    }),
    h5: makeHeading(5, {
      className: 'text-slate-300 mt-5 mb-1 font-medium',
      css: { ...headingBase, fontSize: '1rem' },
    }),
    h6: makeHeading(6, {
      className: 'text-slate-400 mt-4 mb-1 font-medium',
      css: { ...headingBase, fontSize: '0.95rem' },
    }),

    p: ({ children }) => (
      <p className="text-slate-200 mb-5 leading-[1.85]" style={{ fontFamily: ARTICLE_FONT, fontSize: 'clamp(15px, 2.2vw, 18px)' }}>
        {children}
      </p>
    ),
    strong: ({ children }) => (
      <strong className="text-slate-100 font-semibold">{children}</strong>
    ),
    em: ({ children }) => (
      <em className="text-slate-200 italic">{children}</em>
    ),
    del: ({ children }) => (
      <del className="text-slate-500 line-through">{children}</del>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
        className="text-orange-300 hover:text-orange-200 underline underline-offset-2 transition-colors"
      >
        {children}
      </a>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-outside ml-7 mb-5 space-y-1.5">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-outside ml-7 mb-5 space-y-1.5">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="text-slate-200 pl-1" style={{ fontFamily: ARTICLE_FONT, fontSize: 'clamp(15px, 2.2vw, 18px)', lineHeight: 1.75 }}>
        {children}
      </li>
    ),

    blockquote: ({ node, children }) => (
      <CalloutBlockquote node={node} children={children} body={body} />
    ),

    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      const lang = match?.[1];
      if (inline) {
        return (
          <code
            className="text-orange-200 px-1.5 py-0.5 rounded border border-slate-700/60"
            style={{ fontFamily: 'monospace', fontSize: '0.82em', background: 'rgba(30,41,59,0.8)' }}
          >
            {children}
          </code>
        );
      }
      return (
        <SyntaxHighlighter
          style={oneDark}
          language={lang || 'text'}
          PreTag="div"
          showLineNumbers={!!lang && lang !== 'text' && lang !== 'math'}
          customStyle={{ margin: '1.5rem 0', borderRadius: '0.5rem', border: '1px solid rgba(71,85,105,0.4)', fontSize: '13px' }}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      );
    },

    hr: () => (
      <div className="flex items-center gap-4 my-10">
        <div className="flex-1 border-t border-slate-800" />
        <span className="text-slate-700 text-xs">✦</span>
        <div className="flex-1 border-t border-slate-800" />
      </div>
    ),

    table: ({ children }) => (
      <div className="overflow-x-auto my-7 rounded-xl border border-slate-700/60">
        <table className="min-w-full border-collapse" style={{ fontFamily: SANS_FONT, fontSize: '14px' }}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-slate-800/70">{children}</thead>,
    th: ({ children }) => (
      <th className="px-4 py-2.5 text-left text-slate-200 font-semibold border-b border-slate-700/60 whitespace-nowrap">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2.5 text-slate-300 border-b border-slate-800/60">{children}</td>
    ),
    tr: ({ children }) => (
      <tr className="hover:bg-slate-800/20 transition-colors">{children}</tr>
    ),

    img: ({ src, alt }) => (
      <figure className="my-8 text-center">
        <img
          src={src}
          alt={alt}
          className="max-w-full rounded-xl mx-auto border border-slate-700/50 shadow-2xl"
        />
        {alt && (
          <figcaption
            className="text-slate-500 mt-3 italic"
            style={{ fontFamily: ARTICLE_FONT, fontSize: '15px' }}
          >
            {alt}
          </figcaption>
        )}
      </figure>
    ),
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (!rawSource) {
    return (
      <Template iconColor="black">
        <div className="flex items-center justify-center min-h-64">
          <div className="flex flex-col items-center gap-3 text-slate-600">
            <div className="w-5 h-5 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin" />
            <span className="text-sm" style={{ fontFamily: SANS_FONT }}>Loading…</span>
          </div>
        </div>
      </Template>
    );
  }

  // ── Article ─────────────────────────────────────────────────────────────────
  return (
    <Template iconColor="black">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10">

        {/* ── Back button ── */}
        <div className="mb-6">
          <a
            href="/#/blog"
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors text-sm"
            style={{ fontFamily: SANS_FONT }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Blog
          </a>
        </div>

        {/* ── Header ── */}
        <header className="mb-10 pb-8 border-b border-slate-800">
          {meta.imagepath && (
            <img
              src={meta.imagepath}
              alt={meta.title}
              className="w-full max-h-64 object-cover rounded-xl mb-8 border border-slate-700/40 shadow-xl"
            />
          )}

          <h1
            className="text-slate-100 mb-4 leading-tight font-semibold"
            style={{ fontFamily: ARTICLE_FONT, fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}
          >
            {meta.title || 'Untitled'}
          </h1>

          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-4"
            style={{ fontFamily: SANS_FONT, fontSize: '13px' }}
          >
            {meta.date && (
              <span className="text-orange-300 font-medium">{meta.date}</span>
            )}
            {meta.date && <span className="text-slate-700">·</span>}
            <span className="text-slate-500">{estReadTime} min read</span>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.map(t => (
                <span
                  key={t}
                  className={`text-xs px-2.5 py-1 rounded-full border bg-slate-900/60 ${getTagColor(t)}`}
                  style={{ fontFamily: SANS_FONT }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {meta.description && (
            <p
              className="text-slate-400 italic leading-relaxed mt-3"
              style={{ fontFamily: ARTICLE_FONT, fontSize: '18px' }}
            >
              {meta.description}
            </p>
          )}
        </header>

        {/* ── Mobile TOC ── */}
        <MobileToc toc={toc} activeId={activeId} />

        {/* ── Desktop TOC — fixed, viewport-relative (same pattern as JSArticleRenderer) ── */}
        {toc.length > 0 && (
          <div className="hidden lg:block lg:fixed lg:right-4 lg:top-28 w-52 z-30">
            <div
              className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl p-4 shadow-2xl overflow-y-auto"
              style={{ maxHeight: 'calc(100vh - 8rem)' }}
            >
              <TableOfContents toc={toc} activeId={activeId} />
            </div>
          </div>
        )}

        {/* ── Article body — right padding reserves space for the fixed TOC on lg+ ── */}
        <article className="md-article lg:pr-64">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={markdownComponents}
          >
            {body}
          </ReactMarkdown>
        </article>
      </div>
    </Template>
  );
}
