import React, { useRouteMatch } from 'react';
import ReactDOM from 'react-dom/client';
import reportWebVitals from './reportWebVitals';
import { Routes, Route, HashRouter, useMatch } from 'react-router-dom';

import App from './App';
import Blog from './pages/blog';
import Paper from './pages/paper';
import Resume from './pages/resume';
import Article from './components/article';

import title2uri from './utils';

import './index.css';
import Template from './components/template';
import JapaneseApp from './pages/secret';


const articleModules = [];
const requireArticle = require.context('./data/articles', false, /.js$/);

requireArticle.keys().forEach((filename) => {
  const article = requireArticle(filename).default; // Assuming you're exporting as default

  articleModules.push(article);
});

const dataArticles = [...articleModules];


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HashRouter basename="/">
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/resume" element={<Resume />} />
        <Route path="/project" element={<App />} />
        <Route path="/papers" element={<Paper />} />
        <Route path="/blog" element={<Blog dataArticles={dataArticles} />} />
        <Route
          path="/blog/:title"
          element={<Article data={dataArticles}/>}
        />
        <Route path="/contact" element={<App />} />
        <Route path="/secret" element={<JapaneseApp />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
