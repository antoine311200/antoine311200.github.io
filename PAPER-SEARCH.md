# Paper Radar — `/#/paper-search`

A local-first arXiv reading assistant for PhD students. It pulls new preprints every
day for the topics you care about, keeps everything you have already seen so nothing
is fetched twice, scores what is worth reading, and lets you read, annotate and
explore the relations between papers and authors — all in the browser, with no
backend and no account.

---

## 1. Design constraints

| Constraint | Consequence |
|---|---|
| The site is a static CRA app on GitHub Pages | No server. Everything runs client-side. |
| arXiv's Atom API does not reliably send CORS headers | A fetch **strategy chain**: direct → public CORS relays, with the winning strategy remembered in settings. |
| Data must survive reloads and be portable | `localStorage` under a single versioned key + full JSON **export/import** (merge or replace), BibTeX and CSV export. |
| A daily tool must be fast | Fetching is incremental (per-topic watermarks), papers are deduped by arXiv id, and all search/scoring/graphs run over the in-memory store. |

**Never re-fetch what you have seen.** Every topic stores a `lastFetch` timestamp and
the store is keyed by bare arXiv id. A fetch pulls the newest submissions, drops ids
already present (only recording the extra topic hit), and marks the genuinely new ones
as belonging to today's digest. Re-running a fetch on the same day is idempotent.

---

## 2. Data model

Single `localStorage` key `paper-radar:v1`:

```
{
  version, settings,
  topics:   [ { id, name, color, terms[], exclude[], categories[], authors[],
                fields, enabled, lastFetch, newCount } ],
  papers:   { [arxivId]: { id, version, title, summary, authors[], categories[],
                           primary, published, updated, doi, journalRef, comment,
                           firstSeen, topicIds[], score, matches[], enriched } },
  states:   { [arxivId]: { status, starred, tags[], note, rating, readAt, queuedAt } },
  authors:  { [key]: { name, followedAt, note, s2id, scholar } },
  collections: [ { id, name, description, paperIds[] } ],
  feedback: { terms: { [term]: weight } },      // learned from likes/dismissals
  history:  [ { date, fetched, kept } ]
}
```

---

## 3. Feature set

### 3.1 Topics — saved queries that run every day
- Named topic with a **colour**, free-text **keywords** (phrases supported), **exclude**
  terms, **arXiv categories**, and **author** filters.
- Field targeting: title only / title+abstract / all fields.
- Boolean composition is generated for the arXiv `search_query` grammar
  (`(ti:"tensor network" OR abs:"tensor network") AND cat:quant-ph ANDNOT abs:"survey"`).
- Enable/disable a topic without deleting it; per-topic result cap.
- **Fetch all** runs every enabled topic sequentially with polite throttling.

### 3.2 Daily digest
- Papers grouped by the day they *entered your library* (`firstSeen`), so a day's list
  is stable and never re-shuffles.
- Today / Yesterday / Last 7 days / month archive, with counts.
- "New since last visit" marker and an unread badge per day.
- Empty-day states tell you whether the day was quiet or simply never fetched.

### 3.3 Relevance scoring — why this paper is here
- Weighted term matching: title hits count more than abstract hits, exact phrases more
  than single terms, primary-category match adds a bonus.
- **Followed-author boost**: a paper by someone you follow is pushed to the top.
- **Learned feedback**: starring/reading a paper up-weights its distinctive terms,
  dismissing down-weights them (a lightweight naive term model in `feedback.terms`).
- Every score is **explainable** — the card shows the matched terms and the reasons.
- Recency decay so week-old items sink beneath fresh ones at equal relevance.

### 3.4 Reading workflow
- Statuses: **unread → queued → reading → read**, plus **archived** and **dismissed**.
- Star, 0–5 rating, free tags, and a per-paper markdown **note**.
- Reading queue with counts and a "next up" pick.
- Bulk actions on multi-select: queue, archive, tag, star, export, add to collection.
- **Collections** (reading lists) for a seminar, a survey, a chapter.

### 3.5 Reading the paper
- Inline **PDF viewer** in a side panel (arXiv PDF in an embedded frame), toggleable to
  full width, with a one-click "open in new tab".
- Every outbound link a researcher wants, generated per paper:
  abs page · PDF · **ar5iv HTML** · alphaXiv · Hugging Face Papers · Semantic Scholar ·
  Connected Papers · Papers with Code · DOI · Google Scholar lookup.
- **BibTeX** generated locally, copy or download; also CSV/JSON for the whole library.

### 3.6 Authors — the follow graph
- Every author seen becomes a node in the library with their paper count, first/last
  seen date, topics they publish in, and co-authors.
- **Follow** an author: their new papers are boosted and collected in a Following feed.
- "**How many papers came from people you follow**" — per author and in aggregate, per
  day and over the last 30 days.
- Per-author outbound links: **Google Scholar author search**, arXiv author listing,
  Semantic Scholar, OpenAlex, DBLP, ORCID search.
- Rising authors: who is appearing more often in your digests lately.

### 3.7 Relations
- **Co-authorship graph** (react-graph-vis) over the library or a filtered slice,
  coloured by topic, sized by paper count, followed authors highlighted.
- **Similar papers**: TF-IDF cosine similarity over abstracts → "more like this" on
  every paper, and a similarity-linked paper graph.
- **Topic overlap**: which topics keep returning the same papers (a hint to merge or
  tighten queries).

### 3.8 Analytics
- Papers per day sparkline, per-topic volume, category mix, top authors.
- Reading stats: read vs. backlog, reading streak, mean time-to-read.
- **Trending terms**: TF-IDF of the last two weeks against the library baseline —
  what is heating up in your field.

### 3.9 Search & filtering
- Instant full-text search over the whole local library (title, abstract, author,
  comment, note, tag) with field prefixes (`au:`, `ti:`, `cat:`, `tag:`).
- Facets: topic, status, starred, tag, category, author, date range.
- Sorts: relevance, newest, updated, title, citations (when enriched).

### 3.10 Enrichment (optional, cached)
- Semantic Scholar batch lookup adds **citation counts**, **TL;DR summaries** and
  stable author ids. Cached per paper, rate-limit aware, entirely opt-in.

### 3.11 Portability & safety
- **Export** the full store as JSON (timestamped filename); **import** with a choice of
  *merge* (keeps your states, adds new papers) or *replace*.
- BibTeX / CSV export of the current selection or the whole library.
- Storage meter with a prune tool (drop dismissed/old unread papers) so you never hit
  the ~5 MB quota silently.

### 3.12 Keyboard-first
`j`/`k` move · `o` open · `Enter` detail · `s` star · `q` queue · `r` read ·
`e` archive · `x` dismiss · `/` search · `g d` digest · `g l` library · `g a` authors ·
`g g` graph · `g s` stats · `?` shortcut help.

---

## 4. Module map

```
src/pages/papers/
  index.js                app shell, tabs, keyboard router
  context.js              store provider (reducer + persistence)
  storage.js              load/save/migrate/export/import/prune
  arxiv.js                query builder, fetch strategy chain, Atom parser
  enrich.js               Semantic Scholar batch enrichment
  scoring.js              relevance, TF-IDF, similarity, trends, co-author graph
  filters.js              local query language, faceting, sorting, day grouping
  links.js                per-paper and per-author outbound link builders
  bibtex.js               BibTeX / CSV / Markdown serialisation
  views/                  Digest, Library, Topics, Authors, Graph, Stats, Settings
  components/             Workspace, PaperCard, PaperDetail, ui primitives
```

The route is registered in `src/index.js` as `/paper-search` (hash router, so the
live URL is `…/#/paper-search`).
