import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * KaTeX labels painted over the canvas.
 *
 * Canvas has no way to draw KaTeX — it is HTML and web fonts — and rasterising
 * it through an SVG foreignObject is unreliable (the KaTeX faces do not load
 * inside a data-URL document, and Safari refuses outright). So labels live in
 * an absolutely-positioned overlay instead. That is also the better answer:
 * real fonts, MathML alongside for assistive tech, and crisp at any pixel
 * ratio without re-rendering on zoom.
 *
 * Work is split by rate. The *content* of a label re-renders through React,
 * throttled by useFigure, because a value ticking sixty times a second is
 * unreadable anyway. The *position* is written straight to the DOM every frame
 * by the engine's label callback, so a label pinned to a moving point tracks it
 * exactly, without React in the loop.
 */

// renderToString is not cheap and live labels repeat strings constantly
// ("\\omega = 1.60" for as long as the slider does not move).
const cache = new Map();

export function texToHtml(tex) {
  if (cache.has(tex)) return cache.get(tex);
  let html;
  try {
    html = katex.renderToString(tex, { throwOnError: false, displayMode: false });
  } catch (err) {
    html = null;
  }
  if (cache.size > 400) cache.clear();
  cache.set(tex, html);
  return html;
}

export const ANCHOR_OFFSET = {
  'center':       '-50%, -50%',
  'top':          '-50%, 0',
  'bottom':       '-50%, -100%',
  'left':         '0, -50%',
  'right':        '-100%, -50%',
  'top-left':     '0, 0',
  'top-right':    '-100%, 0',
  'bottom-left':  '0, -100%',
  'bottom-right': '-100%, -100%',
};

/** Applied every frame, outside React. */
export function positionLabel(el, l) {
  const off = ANCHOR_OFFSET[l.anchor] || ANCHOR_OFFSET.center;
  el.style.transform = `translate(${l.x}px, ${l.y}px) translate(${off})`;
  el.style.opacity = l.opacity == null ? 1 : String(l.opacity);
}

export default function LabelLayer({ labels, registry }) {
  if (!labels || labels.length === 0) return null;

  return (
    <div className="figx__texlayer" aria-hidden={false}>
      {labels.map(l => {
        const html = texToHtml(l.tex);
        return (
          <span
            key={l.id}
            ref={el => {
              if (el) { registry.set(l.id, el); positionLabel(el, l); }
              else registry.delete(l.id);
            }}
            className={l.chip ? 'figx__tex figx__tex--chip' : 'figx__tex'}
            style={{
              color: l.color || undefined,
              fontSize: l.size || undefined,
            }}
            {...(html
              ? { dangerouslySetInnerHTML: { __html: html } }
              : { children: l.tex })}
          />
        );
      })}
    </div>
  );
}
