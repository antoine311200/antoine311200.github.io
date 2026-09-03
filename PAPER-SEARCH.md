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

### 3.2 Stream — what arrived today

The fetch and the reading surface are the same place, because they are the same act.

- Pressing **Fetch** shows a live banner: which topic is being queried, progress
  through the list, and a cancel. New papers animate in as they land.
- A **day strip** runs across the top: one small column per day, its bar height the
  number of papers, orange while any are unread. It is a month of activity you can
  read at a glance *and* the navigation — click a day to focus it, click **All** to
  come back.
- Underneath is **one flat list**, grouped only by day with a light sticky header.
  There is deliberately no month/week/day tree here: hierarchy is something you browse,
  and browsing is the Explorer's job. This is the thing you open every morning.
- **Quick filters** (All / Unread / Starred / Queue) and topic chips replace what used
  to be five separate nav entries.
- **Right-click** a paper for open, PDF, star, read, queue and dismiss.
- A **+ Added** chip appears once anything has been added by hand, because those
  papers answer to no topic and would otherwise be the one thing in the stream you
  could not filter down to. They also carry a **+ added** chip on the card in place of
  the relevance meter — a meter there would be scoring the paper against a question
  nobody asked. They enter under the day you added them, which is what the stream is
  a record of: not when a paper was written, but when it reached you.

### 3.2.0 Where the papers come from

arXiv answers every request happily and sends no `Access-Control-Allow-Origin`
header on any of them — not the API, not the RSS, not the listing pages. Checked
from both sides of the wall:

| | server (node) | browser (this app) |
|---|---|---|
| `export.arxiv.org/api/query` | 200, Atom | blocked |
| `rss.arxiv.org/rss/math.OC` | 200, RSS | blocked |
| `arxiv.org/list/math.OC/recent` | 200, HTML | blocked |

So the difficulty was never arXiv. It is that the app runs *in a browser*, on a
static site with no server of its own, and the browser will not hand the page a
cross-origin response the server has not consented to share. The three sources
are three answers to that one problem:

- **arXiv, prefetched daily** (default). `scripts/fetch-arxiv.mjs`, run by
  `.github/workflows/arxiv.yml`, fetches arXiv on a GitHub runner — no browser, no
  rule — and commits the result to `public/arxiv/`, which the site then reads
  same-origin. No relay, no key, no allowance, and real arXiv categories, which
  OpenAlex cannot filter on at all. The cost is freshness: the Stream is as current
  as the last run of the workflow. The job decides only what is *downloaded*;
  which topic a paper belongs to is decided in the browser against your topics as
  they are now, so editing a topic re-sorts the corpus already on disk without a CI
  run or a network call. Export `arxiv.feed.json` from Settings when your topics
  change, commit it, and the next run follows.
- **OpenAlex.** Live and reachable from the browser, and it adds citation counts —
  at the price of a daily allowance (§3.2.1) and no categories.
- **arXiv direct.** Needs a public CORS relay. They are free, and they are down
  about as often as they are up: of the four the app knows, three now time out and
  one answers 401.

When a source dies in a way the app cannot work around — every relay refusing, or
the allowance gone until midnight — the banner does not explain the fix and leave
you to Settings. It offers **Use the daily feed instead**, switches the source, and
refetches, because the feed is the one route that depends on nobody's permission.

### 3.2.1 Adding a paper by hand

Topics sweep on a schedule; **+ Add** in the top bar is the other half — the paper a
colleague just mentioned, the one in a bibliography, the one you half-remember. Search
by title, abstract or author, or paste an arXiv id, an abs/pdf URL or a DOI; tick what
you want and it joins the corpus with everything else.

It asks three places, cheapest first, and stops at the first that answers
(`lookup.js`): **your own library**, which costs nothing and is right more often than
it sounds; then **DataCite**, where arXiv registers every DOI — CORS, no key, no
allowance, real arXiv categories, and ids that are arXiv's by construction; and only
then **OpenAlex**, which ranks better and reaches wider but is rationed. So the button
keeps working on a day the allowance is gone. Crossref, worth checking before ruling
out: it holds none of arXiv's preprints at all, because arXiv registers with DataCite.
Semantic Scholar's search is unusable without a key — six queries with backoff, six
failures.

DataCite's own ranking buries an exact title under everything that echoes it — "Attention
Is All You Need" does not appear in its first page of results for that phrase — so the
ordering is redone in the browser: exact title, then prefix, then containment, then word
coverage across title and abstract. That lifts the real paper to first in every case
tried.

Three things this had to get right, each found by running it against the live index:

- **A published paper is still a preprint.** OpenAlex files a paper that made it into a
  journal under the journal, with the arXiv copy further down its `locations`. Reading
  only the primary location hid exactly the famous papers people search for by name, so
  every location is now read before a work is dismissed as not-on-arXiv.
- **One question is not enough.** A text query is asked three ways at once — against the
  whole index, against arXiv alone, and as an author name — and merged in that order. The
  open index ranks a well-known title first; the arXiv-only pass rescues queries like
  "Yang Song diffusion", where the open index answers with fifty papers that have no
  preprint; the author pass is there because a name is as likely a way in as a title.
- **Requests are a budget.** OpenAlex bills per call against a free allowance of
  ~1000 a day per IP, reset at midnight UTC and reported on every response in
  `x-ratelimit-*`. Spend it and everything 429s for the rest of the day with a
  `retry-after` measured in hours, which is why the old "rate-limited, wait a minute"
  advice was wrong twice over. So: a short wait is a burst limit and is retried; a
  long one is the day's allowance, and the app stops, says when it comes back, and
  answers every later call from that knowledge instead of the network — three
  searches against a spent allowance now cost one request rather than twelve. The
  fallback passes above only run when the first comes back thin, repeat searches are
  cached for ten minutes, and Settings shows what is left. Identifying yourself with
  an email buys a steadier queue, not a bigger allowance.
- **arXiv ids do not resolve by DOI.** Only newer preprints carry a `10.48550` DOI, so an
  id is looked up through its landing page (`http://`, not `https://` — that is how they
  are stored), with the DOI as fallback.

Titles and names arrive carrying arXiv's LaTeX — `Sinkhorn\n Divergences`,
`S\'ejourn\'e`, `Fran\c{c}ois` — so they are put back into readable text on the way
in, for topic fetches as much as for this.

### 3.3 Explorer — the organiser

A **source-tree sidebar and a file list**, the way an editor does it. The tree carries
only folders — each with a count chip rather than its papers — so the list gets the
screen. Drag its right edge to set how much — the drag holds the pointer for its whole
length, so running past the limit and coming back still works even across the PDF
frame — and `«` folds it down to a rail when you want the list alone; the rail springs back open while a drag is in flight, because you
cannot file a paper into folders you cannot see. Width and folded state are remembered
per device (localStorage, not the store, so they never travel with an export).

The tree runs saved views, then the archive, then your folders — the two things you
cannot edit sit together above everything that is yours, with rules between the groups:

- **✦ Recently added** — everything that reached the library in the last fortnight,
  newest first. It exists because the tree below answers "what just arrived" worst of
  all: the archive files by *publication* date, so a paper written in 2017 and added
  this morning lands nine years down, and a morning's fetch scatters across the month
  it was written in rather than the day it turned up. This is the one click that
  gathers them.
- **★ Starred** and **🕓 Read later** — smart folders, first because they are the two
  views you check constantly. They are a *view of reading state*, not a second place a
  paper lives, so they cannot drift out of sync with the stars and queue you set
  elsewhere. Dropping a paper on one *sets* that state and leaves it where it was filed.
  The Stream root carries a small **written / arrived** switch for the same reason: the
  archive is filed by publication date by default, and one click refiles the whole tree
  by when papers reached you. The choice is remembered per device.
- **📡 Stream** — bracketed by rules, because it is unlike everything around it:
  read-only, and organised by date rather than by you. It mirrors everything fetched,
  nested Month › Week › Day on **publication date**. This is the archive you come back
  to months later, and you remember when a paper was *written*; bucketing it by arrival
  would file a fortnight of literature under one day just because you were away. (The
  Stream *tab* still buckets on arrival — a different question, "what came in today" —
  and the row is labelled so the difference is visible rather than silent.)
- **Your folders** — last, the part you actually maintain. Nest as deep as you like,
  rename by double-click, reorder by drag.

Every row carries its paper count, and an orange **unread** chip beside it when there
is anything left to do — so a folder you have finished reads as quiet. The tooltip
gives the full breakdown: total, read, unread, starred.

**Filtering** runs the same engine as the Stream, so `au:`, `ti:`, `cat:`, `tag:` and
`is:starred` mean the same thing in both places. One row, read left to right: what you
are looking for, which slice, how it is ordered, how much there is.

The three kinds of filter are deliberately not interchangeable pills. Reading state is
one **segmented control** (Unread / Queue / Read / ★ / Followed) so it reads as a single
thing; **topics** collapse into a popover with colour dots and a count badge, because
four names like "Diffusion & Generative Models" would otherwise eat the row; and
**Subfolders**, the sort and a running `n of total` sit apart on the right. Filtering
everything out says so, rather than claiming the folder is empty.

### 3.3.1 Dragging

Where a paper came from decides what a drop means:

| Dragged from | Dropped on a folder | Why |
|---|---|---|
| Stream (any level) | **copies** | the Stream is a record of what arrived; filing must not empty it |
| One of your folders | **moves**, out of that folder only | a paper can sit in both "Chapter 2" and "Reading group", so a move must not evict it from everywhere |
| Anywhere, holding **Ctrl / Cmd / Alt** | **copies** | the usual convention |

Three things make the gesture forgiving:

- The **drag image is a small pill** ("3 papers"), not a snapshot of the row — a
  full-width card following the cursor hides the very target you are aiming at.
- Where a drag started is tracked in memory, not in `dataTransfer`. Custom MIME types
  are not carried reliably across browsers, and when one is dropped `getData` returns
  an empty string — which silently turned every move into a copy.
- Highlights clear when the drag *ends*, not only on `dragleave`: a drop handled by a
  nested target never reaches its parent, and a cancelled drag fires no leave at all,
  so either would otherwise leave an outline stuck on.
- Every valid folder carries a faint dashed outline for the whole drag, and the one
  under the pointer fills and brightens.
- Holding over a folder for a beat **springs it open**, revealing its subfolders, and
  raises a **＋ New folder** bubble on it. Drop on that and the folder is created with
  those papers already inside, in rename mode — so you can file into a folder that did
  not exist when you started dragging.

### 3.4 Moving things between tabs

Two mechanisms, so nobody has to learn one particular gesture:

- **Spring-loaded tabs.** Hold a drag over the Explorer tab and it opens, the way a
  Finder folder springs. Pick papers up in the Stream and drop them in a folder in one
  continuous motion.
- **The shelf.** A tray that appears only while dragging or while it holds something.
  Drop papers on it, change tabs at your own pace, then drag them out — or file them
  straight into a folder from its dropdown.

### 3.5 The paper card

Four actions on every card — **star**, **read later**, **read**, **not interested** —
each with its own icon. An action you have used stays lit; the rest appear on hover.

**Not interested** does not remove a paper. It fades it in place, strikes the title
through, and teaches the ranker to down-weight that vocabulary — so you can still see
what you passed on, and the same button takes it back.

Reading state shows as a **coloured edge** on the card — sky for read later, green for
read, grey for dismissed — and starred tints the whole border amber. There is no dot
inside the title: state belongs to the card, not to the sentence.

The **relevance score** reads as a small three-bar meter at the head of the metadata
line — `▂▄▆ 78 match`, next to the date and the authors, where the rest of the card's
facts are — rather than floating alone on the right where it looked like a count of
something. Keyword matches weighted by title over abstract, plus boosts for followed
authors and for vocabulary you have starred before, decayed by age. It is why the list
is in the order it is, and hovering it lists the specific reasons.

### 3.5.1 The reading panel

Slides in beside whatever list you are in rather than taking the tab over, and you set
how wide by dragging its left edge — double-click that edge to go back to the default.
It will not eat the list: the ceiling always leaves the cards readable, and a narrowed
window pulls the panel back in. So you keep your place — literally: the panel halves the width of the list, which rewraps every
title over the following few frames, so both lists anchor on the paper at their top
edge and re-pin it as the reflow settles (`useScrollAnchor`). Clicking a card now
leaves the list exactly where it was, and the anchor lets go the moment you scroll. Four tabs: **Overview** (TL;DR, abstract, authors with a follow switch, why
it surfaced, every outbound link, BibTeX), **PDF** (the arXiv PDF filling the panel,
with an escape hatch to a real tab for browsers that refuse to frame it), **Notes**
(tags, markdown notes, folder membership) and **Related** (TF-IDF neighbours).

It opens on Overview; *Settings → Open papers on the PDF* makes it land on the PDF
instead.

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
  timeTree.js             Month > Week > Day bucketing, shared by Stream and Explorer
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
