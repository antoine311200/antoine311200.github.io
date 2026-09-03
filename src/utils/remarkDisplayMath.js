/**
 * Treat a `$$…$$` written on its own line as displayed maths.
 *
 * remark-math only produces a *display* math node when the `$$` fences sit on
 * lines of their own:
 *
 *     $$
 *     x = y + 1
 *     $$
 *
 * Written on one line — `$$x = y + 1$$`, which is how almost everyone writes
 * it, and how every article here is written — it is parsed as *inline* maths,
 * stays inside the paragraph, and renders left-aligned at text size with no
 * `katex-display` wrapper. KaTeX never gets the chance to centre it.
 *
 * This plugin promotes those. A `$$…$$` that occupies a whole line becomes a
 * display equation, whether it is a paragraph by itself or sits between two
 * lines of prose:
 *
 *     for a coupling with E|X_t - Y_t| <= c(t)|x-y| one gets immediately
 *     $$|\nabla P_t f(x)| \le \mathrm{Lip}(f)\,c(t),$$
 *     by writing P_tf(x) - P_tf(y) = E[f(X_t) - f(Y_t)].
 *
 * — which is three nodes: a paragraph, an equation, a paragraph.
 *
 * Single-dollar maths is left alone, including a lone `$x$` in its own
 * paragraph: that one was written inline and is meant to stay inline.
 */

/**
 * A display-maths node, shaped exactly as remark-math builds one for fenced
 * `$$`. The `data` is what carries it through mdast → hast: rehype-katex looks
 * for `code.language-math.math-display` and replaces the whole `pre` with the
 * rendered `span.katex-display`.
 */
function displayMath(value, position) {
  return {
    type: 'math',
    meta: null,
    value,
    position,
    data: {
      hName: 'pre',
      hChildren: [{
        type: 'element',
        tagName: 'code',
        properties: { className: ['language-math', 'math-display'] },
        children: [{ type: 'text', value }],
      }],
    },
  };
}

const isBlank = node => node.type === 'text' && !node.value.trim();

/** Is there a line ending between this node and the previous one? */
function startsLine(children, i) {
  if (i === 0) return true;
  const prev = children[i - 1];
  if (prev.type === 'break') return true;
  return prev.type === 'text' && /\n[ \t]*$/.test(prev.value);
}

/** …and between this node and the next one? */
function endsLine(children, i) {
  if (i === children.length - 1) return true;
  const next = children[i + 1];
  if (next.type === 'break') return true;
  return next.type === 'text' && /^[ \t]*\n/.test(next.value);
}

export default function remarkDisplayMath() {
  return (tree, file) => {
    const src = String((file && file.value) || '');

    // Only `$$` is promoted, so the source is consulted: the mdast node itself
    // does not record which delimiter was used.
    const wroteDoubleDollar = (node) => {
      const at = node.position && node.position.start && node.position.start.offset;
      if (at == null) return false;
      return src.slice(at, at + 2) === '$$';
    };

    /** @returns {Array|null} replacement nodes, or null to leave it alone */
    function split(paragraph) {
      const kids = paragraph.children || [];
      const out = [];
      let run = [];

      const flush = () => {
        while (run.length && isBlank(run[0])) run.shift();
        while (run.length && isBlank(run[run.length - 1])) run.pop();
        if (run.length) out.push({ type: 'paragraph', children: run });
        run = [];
      };

      for (let i = 0; i < kids.length; i++) {
        const kid = kids[i];
        if (kid.type === 'inlineMath'
          && wroteDoubleDollar(kid)
          && startsLine(kids, i)
          && endsLine(kids, i)) {
          flush();
          out.push(displayMath(kid.value, kid.position));
        } else {
          run.push(kid);
        }
      }
      flush();

      const changed = out.some(n => n.type === 'math');
      return changed ? out : null;
    }

    const walk = (node) => {
      if (!node || !node.children) return;
      const next = [];
      for (const child of node.children) {
        walk(child);
        const replacement = child.type === 'paragraph' ? split(child) : null;
        if (replacement) next.push(...replacement);
        else next.push(child);
      }
      node.children = next;
    };

    walk(tree);
  };
}
