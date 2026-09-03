/** BibTeX / CSV / Markdown serialisation of the library. All generated locally. */

const DIACRITICS = /[\u0300-\u036f]/g;

function asciiFold(s) {
    return String(s || '').normalize('NFD').replace(DIACRITICS, '');
}

/** "Doe2024tensor" style citation keys, stable across exports. */
export function citeKey(paper) {
    const first = (paper.authors && paper.authors[0] && paper.authors[0].name) || 'anon';
    const last = asciiFold(first).trim().split(/\s+/).pop().replace(/[^A-Za-z]/g, '') || 'anon';
    const year = (paper.published || '').slice(0, 4) || 'nd';
    const word = asciiFold(paper.title || '')
        .toLowerCase()
        .split(/\s+/)
        .find((w) => w.length > 4 && /^[a-z]+$/.test(w)) || 'paper';
    return `${last.toLowerCase()}${year}${word}`;
}

const escapeTex = (s) => String(s || '')
    .replace(/[\\]/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');

export function toBibtex(paper) {
    const authors = (paper.authors || []).map((a) => escapeTex(a.name)).join(' and ');
    const year = (paper.published || '').slice(0, 4);
    const fields = [
        ['title', escapeTex(paper.title)],
        ['author', authors],
        ['year', year],
        ['eprint', paper.id],
        ['archivePrefix', 'arXiv'],
        ['primaryClass', paper.primary],
        ['url', `https://arxiv.org/abs/${paper.id}`],
    ];
    if (paper.doi) fields.push(['doi', String(paper.doi).replace(/^https?:\/\/(dx\.)?doi\.org\//, '')]);
    if (paper.journalRef) fields.push(['journal', escapeTex(paper.journalRef)]);
    if (paper.comment) fields.push(['note', escapeTex(paper.comment)]);

    const body = fields
        .filter(([, v]) => v)
        .map(([k, v]) => `  ${k} = {${v}}`)
        .join(',\n');
    return `@article{${citeKey(paper)},\n${body}\n}`;
}

export const toBibtexAll = (papers) => papers.map(toBibtex).join('\n\n');

const csvCell = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(papers, states = {}) {
    const header = [
        'id', 'title', 'authors', 'primary_category', 'categories', 'published',
        'updated', 'score', 'status', 'starred', 'rating', 'tags', 'url', 'note',
    ];
    const rows = papers.map((p) => {
        const st = states[p.id] || {};
        return [
            p.id,
            p.title,
            (p.authors || []).map((a) => a.name).join('; '),
            p.primary,
            (p.categories || []).join(' '),
            (p.published || '').slice(0, 10),
            (p.updated || '').slice(0, 10),
            p.score,
            st.status || 'unread',
            st.starred ? 'yes' : 'no',
            st.rating || 0,
            (st.tags || []).join(' '),
            `https://arxiv.org/abs/${p.id}`,
            st.note || '',
        ].map(csvCell).join(',');
    });
    return [header.join(','), ...rows].join('\n');
}

/** A digest you can paste into a lab notebook or a Slack message. */
export function toMarkdown(papers, states = {}) {
    const lines = [`# Reading list — ${new Date().toISOString().slice(0, 10)}`, ''];
    papers.forEach((p) => {
        const st = states[p.id] || {};
        const authors = (p.authors || []).slice(0, 4).map((a) => a.name).join(', ')
            + ((p.authors || []).length > 4 ? ' et al.' : '');
        lines.push(`### [${p.title}](https://arxiv.org/abs/${p.id})`);
        lines.push(`*${authors}* — ${p.primary} — ${(p.published || '').slice(0, 10)}`);
        if (st.note) lines.push('', `> ${st.note.replace(/\n/g, '\n> ')}`);
        lines.push('');
    });
    return lines.join('\n');
}
