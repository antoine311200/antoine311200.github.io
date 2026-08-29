/**
 * Parsing a figure block into <Figure> props.
 *
 * Markdown articles embed figures as a fenced code block:
 *
 *     ```figure
 *     model: boids
 *     height: 430
 *     caption: Reynolds flocking on a torus.
 *     param.count: 420
 *     ```
 *
 * A code fence rather than raw HTML or a custom directive, because it needs no
 * extra remark plugin and it degrades gracefully: GitHub, Obsidian and any
 * other markdown viewer render it as a readable config block instead of as
 * broken markup.
 *
 * A whole-block JSON object is accepted too, for anything generated.
 */

const PROP_KEYS = new Set([
  'model', 'height', 'aspect', 'caption', 'controls',
  'stats', 'speeds', 'autoplay', 'className',
]);

const OVERRIDE_PREFIX = /^(param|params|override|overrides)\./;

/** Numbers, booleans, null and JSON literals become values; anything else stays a string. */
function coerce(raw) {
  const s = raw.trim();
  if (s === '') return '';
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null') return null;
  if (/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(s)) return Number(s);
  if (s[0] === '{' || s[0] === '[' || s[0] === '"') {
    try { return JSON.parse(s); } catch (err) { /* fall through to string */ }
  }
  return s;
}

function assign(props, overrides, unknown, key, value) {
  const k = key.trim();

  if (OVERRIDE_PREFIX.test(k)) {
    overrides[k.replace(OVERRIDE_PREFIX, '')] = value;
    return;
  }
  if (k === 'params' || k === 'overrides') {
    if (value && typeof value === 'object') Object.assign(overrides, value);
    return;
  }
  if (k === 'id') { props.model = value; return; }        // friendly alias
  if (PROP_KEYS.has(k)) { props[k] = value; return; }

  unknown.push(k);
}

/**
 * @returns {{ props: object, overrides: object, errors: string[], unknown: string[] }}
 */
export function parseFigureSpec(source) {
  const props = {};
  const overrides = {};
  const errors = [];
  const unknown = [];
  const text = String(source == null ? '' : source).trim();

  if (!text) {
    return { props, overrides, errors: ['The figure block is empty.'], unknown };
  }

  // Whole-block JSON.
  if (text[0] === '{') {
    try {
      const obj = JSON.parse(text);
      for (const [k, v] of Object.entries(obj)) assign(props, overrides, unknown, k, v);
      return { props, overrides, errors, unknown };
    } catch (err) {
      errors.push(`The block starts with "{" but is not valid JSON: ${err.message}`);
      return { props, overrides, errors, unknown };
    }
  }

  // key: value lines.
  for (const line of text.split('\n')) {
    const l = line.trim();
    if (!l || l.startsWith('#') || l.startsWith('//')) continue;

    const at = l.indexOf(':');
    if (at === -1) {
      errors.push(`Cannot read "${l}" — every line must be "key: value".`);
      continue;
    }
    assign(props, overrides, unknown, l.slice(0, at), coerce(l.slice(at + 1)));
  }

  if (!props.model) errors.push('No "model:" given.');

  return { props, overrides, errors, unknown };
}

export default parseFigureSpec;
