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
| arXiv's Atom API sends **no** CORS header at all | The default source is **OpenAlex**, which serves `Access-Control-Allow-Origin: *`, indexes arXiv, needs no key and no relay, and is current to the same day. The arXiv Atom API stays selectable behind a relay chain for anyone who can reach it. |
| Data must survive reloads and be portable | **IndexedDB** under a single versioned key — localStorage's ~5 MB cap was a tenth spent per fetch — plus full JSON **export/import** (merge or replace), BibTeX, CSV and Markdown export. The v1 localStorage store migrates forward automatically. |
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

## 3. The app

Three tabs and a top bar. That is the whole chrome. Everything else is discovered in
place — right-click menus, panels that slide in beside a list, modals for the rare
things — so a first-time user sees three words, and a daily user can reach everything.

### 3.1 Topics — the standing questions

A wall of cards, one per topic. The card carries what you look at (name, keywords,
paper count, last fetch, a 21-day sparkline) and what you do often (Edit, Preview,
Fetch) on hover. A dashed card at the end creates a new one.

- The editor asks for **two things**: a name and some keywords. Exclusions, arXiv
  categories and author filters are folded behind *More options*, along with the
  generated query, so the common case is two fields and Enter.
- **Right-click** a card for Edit, Fetch now, Preview, Duplicate, Enable/Disable and
  Delete. Double-click opens the editor.
- **Preview** dry-runs the query against the live source without saving anything.

### 3.2 Stream — what arrived, in time order

The fetch and the reading surface are the same place, because they are the same act.

- Pressing **Fetch** shows a live banner: which topic is being queried, progress
  through the list, and a cancel. New papers animate in as they land. When it
  finishes, a one-line report per topic says what was actually new.
- Papers nest **Month › Week › Day**, newest first, every level collapsible with
  counts. The newest month, week and day open automatically; everything older stays
  folded, so the page opens on "what just arrived" without hiding the archive.
- A week straddling a month boundary appears under both months and keeps independent
  collapse state in each.
- **Quick filters** (Everything / Unread / Starred / Queue) and topic chips replace
  what used to be five separate nav entries.
- **Right-click** a paper for open, PDF, star, read, queue, file and dismiss.

### 3.3 Explorer — the organiser

A folder tree and a contents pane, both drop targets.

- Drag papers onto a **folder in the tree** or into the **contents pane**; drag folders
  onto each other to reparent (cycles refused). Double-click a name to rename.
- **Right-click** for New subfolder, Rename, Export (BibTeX/CSV/Markdown) and Delete.
  Deleting a folder deletes its subfolders and never the papers.
- Counts roll up through subfolders; a toggle switches between the folder alone and
  its whole subtree.
- **Import** takes pasted arXiv ids, links, or a whole `.bib` file, tells you how many
  are already in your library, and files those.

### 3.4 Moving things between tabs

Two mechanisms, so nobody has to learn one particular gesture:

- **Spring-loaded tabs.** Hold a drag over the Explorer tab and it opens, the way a
  Finder folder springs. Pick papers up in the Stream and drop them in a folder in one
  continuous motion.
- **The shelf.** A tray that appears only while dragging or while it holds something.
  Drop papers on it, change tabs at your own pace, then drag them out — or file them
  straight into a folder from its dropdown.

### 3.5 The reading panel

Slides in beside whatever list you are in rather than taking the tab over, so you keep
your place. Overview (TL;DR, abstract, authors with a follow switch, why it surfaced,
every outbound link, BibTeX), Notes (tags, markdown notes, folder membership) and
Related (TF-IDF neighbours). An inline PDF is one click away.

### 3.6 Everything else

Settings live in a modal behind the gear: source, relay, result caps, auto-fetch,
enrichment, export/import, prune and reset. Relevance scoring, the learned ranking
from stars and dismissals, followed-author boosts, and the local query language
(`au:` `ti:` `cat:` `tag:` `is:`) all still work — they are just no longer tabs.

**Removed in the rebuild:** the Relations graph, the Authors tab, the Statistics tab,
and the Digest/Library/Starred/Following/Queue split. Five nav entries became four
filter chips; two visualisation tabs went entirely. The app is smaller and does the
same work.

## 4. Module map

```
src/pages/papers/
  index.js                app shell, tabs, keyboard router
  context.js              store provider (reducer + persistence)
  storage.js              load/save/migrate/export/import/prune
  idb.js                  IndexedDB wrapper + real quota via the Storage API
  openalex.js             default source: CORS-native arXiv index, no relay needed
  arxiv.js                optional source: query builder, relay chain, Atom parser
  enrich.js               Semantic Scholar batch enrichment
  scoring.js              relevance, TF-IDF, similarity, trends, co-author graph
  filters.js              local query language, faceting, sorting, day grouping
  links.js                per-paper and per-author outbound link builders
  bibtex.js               BibTeX / CSV / Markdown serialisation
  ui.js                   the design system: buttons, cards, menus, modals, motion
  dnd.js                  drag payloads, spring-loaded tabs, the shelf
  animations.css          the motion vocabulary
  views/                  TopicsView, StreamView, ExplorerView, SettingsModal
  components/             PaperRow, PaperPanel
```

The route is registered in `src/index.js` as `/paper-search` (hash router, so the
live URL is `…/#/paper-search`).

---

## 5. Looking at it

`scripts/ui-drive.mjs` drives the real app in Chromium via Playwright: it seeds
IndexedDB with a realistic library, walks every screen, and writes screenshots to
`/tmp/pr-shots` while reporting console errors.

```
npm start              # one terminal
npm run ui:drive       # another
```

It is a look-at-it harness. The assertions live in two places:

| | |
|---|---|
| `src/pages/papers/*.test.js` | Jest — pure logic and component rendering (35 tests) |
| `e2e/paper-search.spec.js` | Playwright — real browser flows (17 tests), `npm run e2e` |

The end-to-end suite drives Chromium against the dev server with the OpenAlex API
stubbed, so it can assert on things unit tests cannot reach: that a second fetch of
the same works stores nothing new and leaves `firstSeen` untouched, that a paper in
two topics is stored once but listed under both, that folders and reading state
survive a reload because they came back out of IndexedDB, and that a v1 localStorage
store migrates into IndexedDB and its `collections` become root folders.
