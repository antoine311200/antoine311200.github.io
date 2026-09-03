/**
 * What to ask for, and what to do with the answer.
 *
 * Three depths, because the question "what is this paper" has three different
 * shapes depending on why you are asking: deciding whether to read it at all,
 * knowing enough to talk about it, or actually working through the maths.
 *
 * The answers are markdown with `$…$` and `$$…$$`, rendered with KaTeX, so a
 * derivation reads as a derivation rather than as backslashes.
 */

export const LEVELS = [
    {
        id: 'gist',
        label: 'Gist',
        blurb: 'Three lines: the claim, the trick, and whether it is worth your afternoon.',
        maxTokens: 400,
        instruction: `Answer in at most three short sentences, no headings, no lists.
Sentence 1: the claim, in plain words.
Sentence 2: the one idea that makes it work.
Sentence 3: who should read it and who should not.
Do not restate the title. Do not pad.`,
    },
    {
        id: 'brief',
        label: 'Brief',
        blurb: 'A page: the problem, the contribution, the method, and what it costs.',
        maxTokens: 1200,
        instruction: `Write about 300 words under these headings, in this order:
**The problem** — what was open or unsatisfying before this.
**The contribution** — what is new, stated precisely enough to be wrong.
**How it works** — the mechanism, with the key equation inline in $…$ where one clarifies.
**What it costs** — assumptions, limitations, and what the authors do not claim.
Be concrete. Prefer the paper's own notation. No preamble.`,
    },
    {
        id: 'deep',
        label: 'Deep',
        blurb: 'A worked walkthrough, with the mathematics set out properly.',
        maxTokens: 4000,
        instruction: `Write a thorough technical walkthrough for a PhD student in this field.
Set out the mathematics properly: display the central objects and results in $$…$$ blocks,
define every symbol you introduce, and show the step that does the real work rather than
asserting it. Structure it as:
**Setting** — the objects, spaces and assumptions, with notation fixed.
**The result** — the main theorem or method, stated formally.
**Why it is true** — the argument's spine: which step carries the weight and why.
**Reading it** — what to check first, and what to be sceptical of.
Where the abstract is too thin to support a claim, say so rather than inventing detail.`,
    },
];

export const levelById = (id) => LEVELS.find((l) => l.id === id) || LEVELS[0];

const SYSTEM = `You explain research papers to a PhD student in mathematics and machine
learning, whose fields are optimal transport, diffusion models, stochastic analysis and
mathematical finance. You are precise, you use the field's own vocabulary without
diluting it, and you never pad.

You are given a paper's metadata and abstract — not its full text. Everything you say
must be supported by what you were given: where the abstract does not settle something,
say what is unclear rather than inventing a result, a number or a citation.

Write GitHub-flavoured markdown. Set mathematics in KaTeX: $…$ inline, $$…$$ displayed.`;

/** Everything the model is told about the paper. Metadata only — no full text. */
export function buildPrompt(paper, level) {
    const authors = (paper.authors || []).map((a) => a.name).join(', ');
    const categories = (paper.categories || []).join(', ');
    const facts = [
        `Title: ${paper.title}`,
        authors && `Authors: ${authors}`,
        paper.published && `Published: ${String(paper.published).slice(0, 10)}`,
        categories && `arXiv categories: ${categories}`,
        paper.comment && `Author comment: ${paper.comment}`,
        paper.journalRef && `Journal reference: ${paper.journalRef}`,
        `arXiv id: ${paper.id}`,
        '',
        'Abstract:',
        paper.summary || '(no abstract was available)',
    ].filter(Boolean).join('\n');

    return { system: SYSTEM, prompt: `${facts}\n\n---\n\n${level.instruction}` };
}

/* --------------------------------------------------------------- the note */

/** The shareable form: a note that still makes sense pasted somewhere else. */
export function noteMarkdown(paper, note) {
    const authors = (paper.authors || []).map((a) => a.name).join(', ');
    const level = levelById(note.level);
    return [
        `# ${paper.title}`,
        '',
        authors && `*${authors}*`,
        `arXiv:${paper.id} — https://arxiv.org/abs/${paper.id}`,
        '',
        `## ${level.label} explanation`,
        '',
        note.text.trim(),
        '',
        '---',
        `Generated with ${note.model || 'an LLM'} from the paper's abstract, via Paper Radar.`,
    ].filter((line) => line !== false && line !== undefined).join('\n');
}

/* Long notes do not survive a URL; these are the limits worth respecting. */
const MAIL_LIMIT = 1800;
const WHATSAPP_LIMIT = 1500;

const trim = (text, limit) => (text.length <= limit
    ? text
    : `${text.slice(0, limit)}\n\n…truncated — the full note is in Paper Radar.`);

/**
 * Ways out of the app. Mail and WhatsApp go through the reader's own client, so
 * nothing is sent anywhere by us and no service sees the note in passing.
 */
export function shareTargets(paper, note) {
    const body = noteMarkdown(paper, note);
    const subject = `${paper.title} — ${levelById(note.level).label} explanation`;
    return {
        markdown: body,
        filename: `${paper.id}-${note.level}.md`,
        mailto: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(trim(body, MAIL_LIMIT))}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(trim(body, WHATSAPP_LIMIT))}`,
    };
}
