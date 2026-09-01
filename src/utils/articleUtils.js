/**
 * Shared utilities for article parsing and processing.
 */

/**
 * Parse the @KEY value front matter from a markdown source string.
 * Front matter lines start with @KEY and are terminated by the first blank line.
 */
export function parseFrontMatter(source) {
  const lines = source.split('\n');
  const meta = {};
  let i = 0;
  for (; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l === '') { i++; break; }
    const m = l.match(/^@([A-Z]+)\s+(.*)$/);
    if (m) meta[m[1].toLowerCase()] = m[2].trim();
    else break;
  }
  const body = lines.slice(i).join('\n');
  return { meta, body };
}

/**
 * Convert a heading text to a URL-safe slug for anchor links.
 */
export function slugify(text) {
  return String(text)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Strip markdown inline formatting from a heading line so the resulting
 * slug matches what the React heading component produces (which only sees
 * plain text from string React children, not rendered math/code spans).
 */
function stripInlineMarkdown(text) {
  return text
    .replace(/\$\$[^$]*\$\$/g, '')          // display math $$...$$
    .replace(/\$[^$\n]*\$/g, '')             // inline math $...$
    .replace(/`[^`]*`/g, '')                 // inline code `...`
    .replace(/\*\*([^*]*)\*\*/g, '$1')       // **bold**
    .replace(/__([^_]*)__/g, '$1')           // __bold__
    .replace(/\*([^*]*)\*/g, '$1')           // *italic*
    .replace(/_([^_\s][^_]*)_/g, '$1')      // _italic_
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // [link text](url)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')    // images
    .trim();
}

/**
 * Build a nested TOC tree from a markdown string.
 * Heading text is stripped of inline markdown before slugifying so IDs
 * match what the heading React components generate (they only see string children).
 */
export function buildToc(markdown) {
  const lines = markdown.split('\n');
  const headings = [];
  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.*)$/);
    if (m) {
      const rawTitle = m[2].trim();
      const cleanTitle = stripInlineMarkdown(rawTitle);
      headings.push({
        level: m[1].length,
        title: rawTitle,       // display title (with original formatting)
        id: slugify(cleanTitle), // anchor id (from stripped text)
      });
    }
  }
  const root = [];
  const stack = [{ level: 0, children: root }];
  for (const h of headings) {
    while (stack.length > 1 && h.level <= stack[stack.length - 1].level) stack.pop();
    const node = { ...h, children: [] };
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  return root;
}

/**
 * Estimate reading time in minutes from plain text.
 */
export function readingTime(text) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}
