import React from 'react';
import ReactDOM from 'react-dom/client';
import reportWebVitals from './reportWebVitals';
import { Routes, Route, HashRouter } from 'react-router-dom';

import App from './App';
import Blog from './pages/blog';
import Paper from './pages/paper';
import PaperSearch from './pages/papers';
import Project from './pages/project';
import Publication from './pages/publication';
import Resume from './pages/resume';
import Article from './components/article';
import Contact from './pages/contact';
import Hobbies from './pages/hobbies';

import './index.css';
import JapaneseApp from './pages/japanese/secret';
import DootApp from './pages/doot/doot';
import ReilApp from './pages/reil/reil';
import JapaneseReader from './pages/japanese/reader/reader';
import Test from './pages/test';
import Test2 from './pages/test2';
import IshedApp from './pages/ished/ished';
import EditorApp from './pages/editor/editor';
import TonePracticeApp from './pages/toner/toner';
import MandallApp from './pages/mandall/mandall';

import { parseFrontMatter } from './utils/articleUtils';

// ─── Load JS articles (synchronous) ──────────────────────────────────────────

const jsArticles = [];
const requireArticle = require.context('./data/articles', false, /.js$/);
requireArticle.keys().forEach((filename) => {
  const article = requireArticle(filename).default;
  if (article) jsArticles.push({ ...article, isMd: false });
});

// ─── Load MD article file URLs ─────────────────────────────────────────────────

const mdFileUrls = {};
const requireMd = require.context('./data/articles', false, /.md$/);
requireMd.keys().forEach((key) => {
  const filename = key.replace('./', '');
  mdFileUrls[filename] = requireMd(key);
});

// ─── Fetch MD front matter for blog listing ────────────────────────────────────

async function loadMdArticles() {
  const entries = Object.entries(mdFileUrls);
  const results = await Promise.all(
    entries.map(async ([filename, url]) => {
      try {
        const text = await fetch(url).then(r => r.text());
        const { meta } = parseFrontMatter(text);
        if (!meta.title) return null;
        return {
          title: meta.title,
          date: meta.date || '',
          description: meta.description || '',
          imagePath: meta.imagepath || '',
          keywords: meta.tags
            ? meta.tags.split(',').map(t => t.trim()).filter(Boolean)
            : [],
          isMd: true,
          fileUrl: url,
          filename,
        };
      } catch (err) {
        console.error(`Failed to load article metadata for ${filename}:`, err);
        return null;
      }
    })
  );
  return results.filter(Boolean);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

function renderApp(allArticles) {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <HashRouter basename="/">
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/resume" element={<Resume />} />
        <Route path="/projects" element={<Project />} />
        <Route path="/publications" element={<Publication />} />
        <Route path="/papers" element={<Paper />} />
        <Route path="/paper-search" element={<PaperSearch />} />
        <Route path="/blog" element={<Blog dataArticles={allArticles} />} />
        <Route path="/blog/:title" element={<Article data={allArticles} />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/hobbies" element={<Hobbies />} />
        <Route path="/doot" element={<DootApp />} />
        <Route path="/reil" element={<ReilApp />} />
        <Route path="/secret" element={<JapaneseApp />} />
        <Route path="/secret/reader" element={<JapaneseReader />} />
        <Route path="/test" element={<Test />} />
        <Route path="/test2" element={<Test2 />} />
        <Route path="/ished" element={<IshedApp />} />
        <Route path="/editor" element={<EditorApp />} />
        <Route path="/toner" element={<TonePracticeApp />} />
        <Route path="/mandall" element={<MandallApp />} />
      </Routes>
    </HashRouter>
  );
}

loadMdArticles()
  .then(mdArticles => {
    renderApp([...jsArticles, ...mdArticles]);
  })
  .catch(err => {
    console.error('Failed to load MD articles, falling back to JS articles only:', err);
    renderApp(jsArticles);
  });

reportWebVitals();
