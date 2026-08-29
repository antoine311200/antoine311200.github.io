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
