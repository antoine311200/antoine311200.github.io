import React from 'react';
import ReactDOM from 'react-dom/client';
import reportWebVitals from './reportWebVitals';
import { Routes, Route, HashRouter } from 'react-router-dom';

import App from './App';
import Blog from './pages/blog';
import Paper from './pages/paper';
import Project from './pages/project';
import Publication from './pages/publication';
import Resume from './pages/resume';
import Article from './components/article';
import Contact from './pages/contact';


import './index.css';
import JapaneseApp from './pages/japanese/secret';
import DootApp from './pages/doot/doot';
import ReilApp from './pages/reil/reil';
import JapaneseReader from './pages/japanese/reader/reader';
import Test from './pages/test';


const articleModules = [];
const requireArticle = require.context('./data/articles', false, /.js$/);

requireArticle.keys().forEach((filename) => {
  const article = requireArticle(filename).default;

  articleModules.push(article);
});

const dataArticles = [...articleModules];


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // <React.StrictMode>
    <HashRouter basename="/">
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/resume" element={<Resume />} />
        <Route path="/projects" element={<Project />} />
        <Route path="/publications" element={<Publication />} />
        <Route path="/papers" element={<Paper />} />
        <Route path="/blog" element={<Blog dataArticles={dataArticles} />} />
        <Route
          path="/blog/:title"
          element={<Article data={dataArticles}/>}
        />
        <Route path="/contact" element={<Contact />} />
        <Route path="/doot" element={<DootApp />} />
        <Route path="/reil" element={<ReilApp />} />
        <Route path="/secret" element={<JapaneseApp />} />
        <Route path="/secret/reader" element={<JapaneseReader />} />
        <Route path="/test" element={<Test />} />
      </Routes>
    </HashRouter>
  // </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
