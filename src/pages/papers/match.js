/**
 * How well a paper answers a search box.
 *
 * Shared by every source behind "+ Add" so that results from different places
 * can be ranked against each other in one list. Without it each source is
 * ordered by its own idea of relevance and merging them buries the obvious
 * answer: type a title you know and it lands halfway down, under whatever the
 * library happened to match loosely.
 */

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Higher is better. The exact shapes of "I know what this paper is called" score
 * far above word overlap, so a known title always wins; among the rest, coverage
 * of the query decides, and a shorter title breaks ties, since a paper whose
 * whole title is the query beats one that merely contains it.
 */
export function matchScore(entry, query) {
    const title = norm(entry.title);
    const wanted = norm(query);
    if (!wanted || !title) return 0;

    if (title === wanted) return 1000;
    if (title.startsWith(wanted)) return 900;
    if (title.includes(wanted)) return 800;

    const words = wanted.split(' ').filter((w) => w.length > 2);
    if (!words.length) return 0;

    const body = norm(`${entry.summary || ''} ${(entry.authors || []).map((a) => a.name).join(' ')}`);
    const inTitle = words.filter((w) => title.includes(w)).length;
    const inBody = words.filter((w) => body.includes(w)).length;
    if (!inTitle && !inBody) return 0;

    return Math.round((600 * inTitle + 150 * inBody) / words.length) - Math.min(60, title.split(' ').length * 2);
}
