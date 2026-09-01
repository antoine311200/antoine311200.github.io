/**
 * UI smoke-drive for Paper Radar (/#/paper-search).
 *
 * Seeds IndexedDB with a realistic library, walks every screen, writes screenshots
 * to /tmp/pr-shots and reports any console error. It is a look-at-it harness, not an
 * assertion suite — the assertions live in src/pages/papers/*.test.js.
 *
 *   npm start                 # in one terminal
 *   node scripts/ui-drive.mjs # in another
 */

import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const OUT = '/tmp/pr-shots';

// A realistic library so screens are not empty: 3 topics, 40 papers, folders, follows.
function fixture() {
  const topics = [
    { id: 't_ot',  name: 'Optimal Transport',            color: '#fb923c' },
    { id: 't_dif', name: 'Diffusion & Generative Models', color: '#a78bfa' },
    { id: 't_sde', name: 'Stochastic Analysis & SDEs',    color: '#34d399' },
  ].map(t => ({ ...t, terms: ['x'], exclude: [], categories: [], authors: [], fields: 'title_abstract',
                enabled: true, maxResults: null, lastFetch: new Date().toISOString(), newCount: 4 }));

  const names = ['Ada Lovelace','Alan Turing','Emmy Noether','Henri Poincaré','Sofia Kovalevskaya',
                 'Andrey Kolmogorov','Cédric Villani','Yann Brenier','Filippo Santambrogio','Gabriel Peyré'];
  const titles = [
    'Entropic Optimal Transport with Sinkhorn Acceleration on Sparse Graphs',
    'Flow Matching for Conditional Generative Modelling of Volatility Surfaces',
    'A Neural SDE Approach to Deep Hedging under Rough Volatility',
    'Schrodinger Bridges and Score-Based Generative Models: a Unified View',
    'Gromov-Wasserstein Distances for Comparing Limit Order Book Dynamics',
    'McKean-Vlasov Control with Signature Kernels',
    'Denoising Diffusion Probabilistic Models for Path-Dependent Options',
    'Backward Stochastic Differential Equations and Deep Solvers at Scale',
    'Rough Path Signatures for Market Microstructure Prediction',
    'Stochastic Interpolants Between Measures on Wasserstein Space',
  ];
  const papers = {}, states = {};
  for (let i = 0; i < 40; i++) {
    const id = `26${String(8 - Math.floor(i / 14)).padStart(2,'0')}.${String(10000 + i * 137).slice(0,5)}`;
    const day = new Date(Date.now() - (i % 5) * 864e5).toISOString();
    const topicIds = [topics[i % 3].id];
    if (i % 7 === 0) topicIds.push(topics[(i + 1) % 3].id);
    papers[id] = {
      id, version: i % 9 === 0 ? 2 : 1,
      title: titles[i % titles.length] + (i >= titles.length ? ` (part ${1 + Math.floor(i / titles.length)})` : ''),
      summary: 'We study a family of estimators and prove convergence under mild assumptions. '
             + 'Experiments on synthetic and market data show the approach is competitive with strong baselines, '
             + 'while remaining tractable in high dimension. We further relate the construction to entropic regularisation.',
      authors: Array.from({ length: 2 + (i % 4) }, (_, k) => ({ name: names[(i + k * 3) % names.length], affiliation: null })),
      categories: [], primary: null, published: day, updated: day, firstSeen: day,
      topicIds, score: 90 - i * 2, citations: (i * 7) % 40,
      reasons: [{ kind: 'terms', label: 'matches optimal transport, wasserstein' }],
      doi: null, comment: null, journalRef: null, pdfUrl: `https://arxiv.org/pdf/${id}`,
    };
    states[id] = { status: i % 6 === 0 ? 'read' : i % 5 === 0 ? 'queued' : 'unread',
                   starred: i % 4 === 0, tags: i % 8 === 0 ? ['to-cite'] : [], note: i % 9 === 0 ? 'Key lemma 3.2.' : '',
                   rating: 0, readAt: null, queuedAt: null, updatedAt: Date.now() };
  }
  const ids = Object.keys(papers);
  return {
    version: 2,
    settings: { maxResultsPerTopic: 60, lookbackDays: 7, source: 'openalex', openAlexMailto: '', proxy: 'auto',
                autoFetchOnOpen: false, enrich: false, pdfInline: false, density: 'comfortable',
                scoreThreshold: 0, recencyHalfLife: 10 },
    topics, papers, states,
    authors: { 'ada lovelace': { name: 'Ada Lovelace', followedAt: new Date().toISOString(), note: '' },
               'gabriel peyre': { name: 'Gabriel Peyré', followedAt: new Date().toISOString(), note: '' } },
    folders: [
      { id: 'f_thesis', name: 'Thesis', parentId: null, paperIds: [], description: '', color: null, createdAt: new Date().toISOString() },
      { id: 'f_ch2', name: 'Chapter 2 — OT', parentId: 'f_thesis', paperIds: ids.slice(0, 5), description: '', color: null, createdAt: new Date().toISOString() },
      { id: 'f_ch3', name: 'Chapter 3 — Hedging', parentId: 'f_thesis', paperIds: ids.slice(5, 9), description: '', color: null, createdAt: new Date().toISOString() },
      { id: 'f_sem', name: 'Reading group', parentId: null, paperIds: ids.slice(9, 12), description: '', color: null, createdAt: new Date().toISOString() },
    ],
    feedback: { terms: { transport: 0.4, wasserstein: 0.36, hedging: 0.24, survey: -0.3 } },
    history: Array.from({ length: 30 }, (_, k) => ({
      date: new Date(Date.now() - k * 864e5).toISOString().slice(0, 10),
      fetched: 40 + (k * 7) % 30, kept: (k * 3) % 9, revised: 0,
    })),
    lastVisit: null,
  };
}

const shots = [];
async function shot(page, name) {
  await page.waitForTimeout(450);
  const file = `${OUT}/${name}.png`;
  await page.screenshot({ path: file });
  shots.push(name);
  console.log('  shot:', name);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1560, height: 950 }, deviceScaleFactor: 1 });

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message.slice(0, 300)));

await page.goto(`${BASE}/#/paper-search`, { waitUntil: 'domcontentloaded' });
// Seed IndexedDB the same way the app writes it, then reload so it hydrates from there.
await page.evaluate(async (store) => {
  await new Promise((res, rej) => {
    const req = indexedDB.open('paper-radar', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('store');
    req.onsuccess = () => {
      const tx = req.result.transaction('store', 'readwrite');
      tx.objectStore('store').put(store, 'main');
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    };
    req.onerror = () => rej(req.error);
  });
}, fixture());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

await shot(page, '01-digest-by-topic');

// Group by day
await page.selectOption('select[title="Group papers by"]', 'day');
await shot(page, '02-digest-by-day');
await page.selectOption('select[title="Group papers by"]', 'topic');

// Open a paper detail
await page.locator('article h3').first().click();
await shot(page, '03-detail');
await page.keyboard.press('Escape');

// Folders explorer
await page.getByRole('button', { name: /Folders/ }).first().click();
await page.waitForTimeout(400);
await page.getByTestId('folder-node-f_thesis').click();
await shot(page, '04-folders');
await page.getByTestId('folder-toggle-f_thesis').click();
await page.waitForTimeout(300);
await page.getByTestId('folder-node-f_ch2').click();
await shot(page, '05-folder-selected');

// Remaining screens
for (const [label, name] of [['Topics','06-topics'], ['Authors','07-authors'], ['Relations','08-relations'],
                             ['Statistics','09-stats'], ['Settings','10-settings']]) {
  await page.getByRole('navigation').getByRole('button', { name: new RegExp(`\\b${label}\\b`) }).click();
  await page.waitForTimeout(label === 'Relations' ? 3500 : 600);
  await shot(page, name);
}

// Narrow viewport
await page.setViewportSize({ width: 900, height: 900 });
await page.waitForTimeout(400);
await shot(page, '11-narrow-collapsed');
// Below lg the sidebar is off-canvas; open it with the hamburger.
await page.getByRole('button', { name: '☰' }).click();
await page.waitForTimeout(350);
await page.getByRole('navigation').getByRole('button', { name: /\bLibrary\b/ }).click();
await page.waitForTimeout(500);
await shot(page, '12-narrow-library');

console.log('\n=== console errors ===');
console.log(errors.length ? errors.slice(0, 12).join('\n') : '(none)');
await browser.close();
