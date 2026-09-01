/**
 * Every outbound destination a researcher wants from a paper or an author,
 * generated from what arXiv already gives us — no lookups required.
 */

const enc = encodeURIComponent;

export function paperLinks(paper) {
    const id = paper.id;
    const versioned = paper.version > 1 ? `${id}v${paper.version}` : id;
    const links = [
        { key: 'abs', label: 'arXiv', href: `https://arxiv.org/abs/${versioned}`, primary: true },
        { key: 'pdf', label: 'PDF', href: `https://arxiv.org/pdf/${versioned}`, primary: true },
        { key: 'html', label: 'HTML (ar5iv)', href: `https://ar5iv.labs.arxiv.org/html/${id}` },
        { key: 'alphaxiv', label: 'alphaXiv', href: `https://www.alphaxiv.org/abs/${id}` },
        { key: 'hf', label: 'HF Papers', href: `https://huggingface.co/papers/${id}` },
        { key: 's2', label: 'Semantic Scholar', href: `https://www.semanticscholar.org/arxiv/${id}` },
        { key: 'connected', label: 'Connected Papers', href: `https://www.connectedpapers.com/search?q=${enc(paper.title)}` },
        { key: 'pwc', label: 'Papers with Code', href: `https://paperswithcode.com/search?q=${enc(paper.title)}` },
        { key: 'scholar', label: 'Google Scholar', href: `https://scholar.google.com/scholar?q=${enc(paper.title)}` },
    ];
    if (paper.doi) {
        const doi = String(paper.doi).replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
        links.push({ key: 'doi', label: 'DOI', href: `https://doi.org/${doi}` });
    }
    return links;
}

export const pdfEmbedUrl = (paper) =>
    `https://arxiv.org/pdf/${paper.version > 1 ? `${paper.id}v${paper.version}` : paper.id}`;

export function authorLinks(name, extra = {}) {
    const links = [
        {
            key: 'scholar',
            label: 'Google Scholar',
            href: extra.scholar
                ? `https://scholar.google.com/citations?user=${enc(extra.scholar)}`
                : `https://scholar.google.com/citations?hl=en&view_op=search_authors&mauthors=${enc(name)}`,
        },
        { key: 'arxiv', label: 'arXiv listing', href: `https://arxiv.org/a/${slugForArxiv(name)}` },
        {
            key: 'arxiv-search',
            label: 'arXiv search',
            href: `https://arxiv.org/search/?searchtype=author&query=${enc(name)}`,
        },
        {
            key: 's2',
            label: 'Semantic Scholar',
            href: extra.s2id
                ? `https://www.semanticscholar.org/author/${extra.s2id}`
                : `https://www.semanticscholar.org/search?q=${enc(name)}&sort=relevance`,
        },
        { key: 'openalex', label: 'OpenAlex', href: `https://openalex.org/authors?search=${enc(name)}` },
        { key: 'dblp', label: 'DBLP', href: `https://dblp.org/search?q=${enc(name)}` },
        { key: 'orcid', label: 'ORCID', href: `https://orcid.org/orcid-search/search?searchQuery=${enc(name)}` },
    ];
    return links;
}

/** arXiv's /a/ author pages use a "lastname_f_1" style slug. Best-effort only. */
function slugForArxiv(name) {
    const parts = String(name).trim().split(/\s+/);
    if (parts.length < 2) return enc(name.toLowerCase());
    const last = parts[parts.length - 1].toLowerCase().replace(/[^a-z]/g, '');
    const first = parts[0][0].toLowerCase();
    return `${last}_${first}_1`;
}
