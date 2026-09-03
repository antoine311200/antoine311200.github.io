import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * A control label that may carry maths.
 *
 * Specs give a plain `label` (always) and optionally `tex`. The plain label is
 * what assistive tech and tooltips use; the TeX is decoration on top of it, so
 * a broken expression degrades to readable text rather than to nothing.
 */
export default function TexLabel({ tex, label, className }) {
  const html = useMemo(() => {
    if (!tex) return null;
    try {
      return katex.renderToString(tex, { throwOnError: false, displayMode: false });
    } catch (err) {
      return null;
    }
  }, [tex]);

  if (!html) return <span className={className}>{label}</span>;

  return (
    <span className={className} title={label}>
      <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
      <span className="figx__sr">{label}</span>
    </span>
  );
}

/**
 * Text with inline `$…$` maths — used for captions written in a markdown
 * figure block. KaTeX's own output carries MathML alongside the visual HTML,
 * so this stays readable to assistive tech without extra markup.
 */
export function RichText({ text }) {
  const parts = useMemo(() => {
    const src = String(text == null ? '' : text);
    const out = [];
    const re = /\$([^$]+)\$/g;
    let last = 0;
    let m;
    while ((m = re.exec(src)) !== null) {
      if (m.index > last) out.push({ type: 'text', value: src.slice(last, m.index) });
      let html = null;
      try {
        html = katex.renderToString(m[1], { throwOnError: false, displayMode: false });
      } catch (err) {
        html = null;
      }
      out.push(html ? { type: 'tex', value: html } : { type: 'text', value: m[0] });
      last = m.index + m[0].length;
    }
    if (last < src.length) out.push({ type: 'text', value: src.slice(last) });
    return out;
  }, [text]);

  return (
    <>
      {parts.map((p, i) => (p.type === 'tex'
        ? <span key={i} dangerouslySetInnerHTML={{ __html: p.value }} />
        : <span key={i}>{p.value}</span>))}
    </>
  );
}
