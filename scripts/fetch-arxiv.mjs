#!/usr/bin/env node
/**
 * Fetch arXiv for Paper Radar, on a machine that is allowed to.
 *
 * arXiv serves every one of its endpoints without an `Access-Control-Allow-Origin`
 * header, so a browser on a static site can never read them: the request succeeds
 * and the browser then refuses to hand over the bytes. That is a rule about where
 * code runs, not about how hard the fetching is — and this file runs on a GitHub
 * runner, where there is no browser and no such rule.
 *
 * It writes plain JSON into public/arxiv/, which the site then reads same-origin:
 * no CORS, no API keys, no daily allowance, and — unlike OpenAlex — real arXiv
 * categories to filter on.
 *
 *   node scripts/fetch-arxiv.mjs [--days 7] [--config arxiv.feed.json] [--dry]
 *
 * The queries come from arxiv.feed.json, which Paper Radar can write for you:
 * Settings → Fetching → "Feed config for CI".
 */

import { mkdir, readFile, readdir, writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const API = 'https://export.arxiv.org/api/query';
const OUT_DIR = 'public/arxiv';
const KEEP_DAYS = 60;              // bound how much of this the repo carries
const COURTESY_MS = 3000;          // arXiv asks for ~3s between programmatic calls

const args = process.argv.slice(2);
const flag = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ----------------------------------------------------------------- queries */

const escapePhrase = (term) => (/\s/.test(term) ? `"${term}"` : term);
const FIELD_SETS = {
    title: ['ti'],
    title_abstract: ['ti', 'abs'],
    all: ['all'],
};

/**
 * A topic in the app's own shape becomes one arXiv search_query. Kept in step
 * with buildQuery() in src/pages/papers/arxiv.js — the app writes the config
 * this reads, so the two have to agree on what a topic means.
 */
function buildQuery(topic) {
    const fields = FIELD_SETS[topic.fields] || FIELD_SETS.title_abstract;
    const clauses = [];

    const terms = (topic.terms || []).map((t) => t.trim()).filter(Boolean);
    if (terms.length) {
        const parts = [];
        terms.forEach((term) => fields.forEach((f) => parts.push(`${f}:${escapePhrase(term)}`)));
        clauses.push(`(${parts.join(' OR ')})`);
    }

    const cats = (topic.categories || []).map((c) => c.trim()).filter(Boolean);
    if (cats.length) clauses.push(`(${cats.map((c) => `cat:${c}`).join(' OR ')})`);

    const authors = (topic.authors || []).map((a) => a.trim()).filter(Boolean);
    if (authors.length) clauses.push(`(${authors.map((a) => `au:${escapePhrase(a)}`).join(' OR ')})`);

    if (!clauses.length) return null;
    let query = clauses.join(' AND ');

    const excludes = (topic.exclude || []).map((t) => t.trim()).filter(Boolean);
    if (excludes.length) {
        const parts = [];
        excludes.forEach((term) => fields.forEach((f) => parts.push(`${f}:${escapePhrase(term)}`)));
        query += ` ANDNOT (${parts.join(' OR ')})`;
    }
    return query;
}

/* ------------------------------------------------------------------ parsing */

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };
const decode = (s) => String(s || '')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, code) => {
        if (ENTITIES[code.toLowerCase()]) return ENTITIES[code.toLowerCase()];
        if (code[0] === '#') {
            const n = code[1] === 'x' || code[1] === 'X'
                ? parseInt(code.slice(2), 16)
                : parseInt(code.slice(1), 10);
            return Number.isFinite(n) ? String.fromCodePoint(n) : m;
        }
        return m;
    })
    .replace(/\s+/g, ' ')
    .trim();

const tag = (xml, name) => {
    const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
    return m ? decode(m[1]) : '';
};

const attrs = (xml, name, attr) => {
    const out = [];
    const re = new RegExp(`<${name}\\b[^>]*\\b${attr}="([^"]*)"[^>]*/?>`, 'gi');
    let m = re.exec(xml);
    while (m) { out.push(decode(m[1])); m = re.exec(xml); }
    return out;
};

/** "http://arxiv.org/abs/2401.00001v2" -> { id: "2401.00001", version: 2 } */
function splitArxivId(raw) {
    const bare = String(raw || '').replace(/^https?:\/\/arxiv\.org\/abs\//i, '');
    const m = bare.match(/^(.*?)v(\d+)$/);
    return m ? { id: m[1], version: Number(m[2]) } : { id: bare, version: 1 };
}

/** The Atom feed arXiv returns, in the entry shape the app already ingests. */
function parseFeed(xml) {
    const totalMatch = xml.match(/<opensearch:totalResults[^>]*>(\d+)</i);
    const total = totalMatch ? Number(totalMatch[1]) : null;

    const entries = [];
    const re = /<entry>([\s\S]*?)<\/entry>/g;
    let match = re.exec(xml);
    while (match) {
        const block = match[1];
        const { id, version } = splitArxivId(tag(block, 'id'));

        const authors = [];
        const authorRe = /<author>([\s\S]*?)<\/author>/g;
        let a = authorRe.exec(block);
        while (a) {
            const name = tag(a[1], 'name');
            if (name) authors.push({ name, affiliation: tag(a[1], 'arxiv:affiliation') || null });
            a = authorRe.exec(block);
        }

        const categories = Array.from(new Set(attrs(block, 'category', 'term')));
        const primary = attrs(block, 'arxiv:primary_category', 'term')[0] || categories[0] || null;

        const pdfLink = (block.match(/<link[^>]*title="pdf"[^>]*href="([^"]*)"/i)
            || block.match(/<link[^>]*href="([^"]*)"[^>]*title="pdf"/i) || [])[1];

        if (id) {
            entries.push({
                id,
                version,
                title: tag(block, 'title'),
                summary: tag(block, 'summary'),
                authors,
                categories,
                primary,
                published: tag(block, 'published'),
                updated: tag(block, 'updated'),
                comment: tag(block, 'arxiv:comment') || null,
                journalRef: tag(block, 'arxiv:journal_ref') || null,
                doi: tag(block, 'arxiv:doi') || null,
                pdfUrl: pdfLink ? decode(pdfLink) : `https://arxiv.org/pdf/${id}`,
                citations: null,          // arXiv does not count citations
                source: 'arxiv',
            });
        }
        match = re.exec(xml);
    }
    return { entries, total };
}

/* ----------------------------------------------------------------- fetching */

async function fetchPage(query, start, max) {
    const params = new URLSearchParams({
        search_query: query,
        start: String(start),
        max_results: String(max),
        sortBy: 'submittedDate',
        sortOrder: 'descending',
    });
    const res = await fetch(`${API}?${params}`, {
        headers: { Accept: 'application/atom+xml', 'User-Agent': 'paper-radar-feed (+github actions)' },
    });
    if (!res.ok) throw new Error(`arXiv returned HTTP ${res.status}`);
    const body = await res.text();
    if (!body.includes('<feed')) throw new Error('arXiv returned something that is not an Atom feed');
    return parseFeed(body);
}

/** One topic, newest first, stopping once we are past the window. */
async function fetchTopic(topic, { since, maxResults }) {
    const query = buildQuery(topic);
    if (!query) return { entries: [], query: null };

    const page = 100;
    const entries = [];
    for (let start = 0; start < maxResults; start += page) {
        const { entries: batch } = await fetchPage(query, start, Math.min(page, maxResults - start));
        if (!batch.length) break;

        for (const entry of batch) {
            if (new Date(entry.published) >= since) entries.push(entry);
        }
        // Sorted newest first, so the first page ending before the window ends it.
        const oldest = batch[batch.length - 1];
        if (!oldest || new Date(oldest.published) < since) break;
        if (batch.length < page) break;
        await sleep(COURTESY_MS);
    }
    return { entries, query };
}

/* -------------------------------------------------------------------- main */

async function main() {
    const configPath = flag('config', 'arxiv.feed.json');
    if (!existsSync(configPath)) {
        console.error(`No ${configPath}. Paper Radar writes one: Settings → Fetching → "Feed config for CI".`);
        process.exit(1);
    }
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    const days = Number(flag('days', config.days || 7));
    const maxResults = Number(config.maxPerTopic || 200);
    const since = new Date(Date.now() - days * 864e5);
    const topics = (config.topics || []).filter((t) => t.enabled !== false);

    if (!topics.length) {
        console.error('The config has no enabled topics.');
        process.exit(1);
    }

    console.log(`Fetching ${topics.length} topic(s) back to ${since.toISOString().slice(0, 10)}`);

    const byId = new Map();
    const report = [];
    for (const [i, topic] of topics.entries()) {
        if (i) await sleep(COURTESY_MS);
        try {
            const { entries, query } = await fetchTopic(topic, { since, maxResults });
            entries.forEach((entry) => {
                const prev = byId.get(entry.id);
                // One paper can answer two topics; remember every topic it answers.
                if (prev) prev.topicIds = Array.from(new Set([...(prev.topicIds || []), topic.id]));
                else byId.set(entry.id, { ...entry, topicIds: [topic.id] });
            });
            report.push({ topic: topic.name, ok: true, count: entries.length, query });
            console.log(`  ${topic.name}: ${entries.length}`);
        } catch (err) {
            report.push({ topic: topic.name, ok: false, message: err.message });
            console.error(`  ${topic.name}: FAILED — ${err.message}`);
        }
    }

    const entries = Array.from(byId.values())
        .sort((a, b) => String(b.published).localeCompare(String(a.published)));
    if (!entries.length) {
        console.error('Nothing came back; leaving the existing feed alone.');
        process.exit(report.every((r) => r.ok) ? 0 : 1);
    }

    if (has('dry')) {
        console.log(`\n[dry run] ${entries.length} entries, newest ${entries[0].published}`);
        console.log(entries.slice(0, 5).map((e) => `  ${e.id}  ${e.title.slice(0, 70)}`).join('\n'));
        return;
    }

    const stamp = new Date().toISOString();
    const date = stamp.slice(0, 10);
    await mkdir(OUT_DIR, { recursive: true });
    await writeFile(
        path.join(OUT_DIR, `${date}.json`),
        `${JSON.stringify({ generatedAt: stamp, days, entries }, null, 0)}\n`,
    );

    // Prune, then describe what is on disk: the app reads this manifest first.
    const files = (await readdir(OUT_DIR)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
    for (const stale of files.slice(0, Math.max(0, files.length - KEEP_DAYS))) {
        await unlink(path.join(OUT_DIR, stale));
    }
    const kept = files.slice(Math.max(0, files.length - KEEP_DAYS));

    const runs = [];
    for (const file of kept) {
        const body = JSON.parse(await readFile(path.join(OUT_DIR, file), 'utf8'));
        runs.push({ file, date: file.replace('.json', ''), count: (body.entries || []).length });
    }

    await writeFile(
        path.join(OUT_DIR, 'index.json'),
        `${JSON.stringify({
            generatedAt: stamp,
            source: 'arxiv',
            topics: topics.map(({ id, name, color }) => ({ id, name, color: color || null })),
            runs: runs.reverse(),
            report,
        }, null, 2)}\n`,
    );

    console.log(`\nWrote ${OUT_DIR}/${date}.json — ${entries.length} entries across ${runs.length} run(s) on disk.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
