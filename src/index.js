import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter, Routes, Route, HashRouter, Switch } from 'react-router-dom';

import BlogPage from './pages/blog';
import Article from './components/article';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* <BrowserRouter> */}
      <HashRouter basename="/">
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/resume" element={<App />} />
          <Route path="/project" element={<App />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/contact" element={<App />} />
        </Routes>
      </HashRouter>
    {/* </BrowserRouter> */}
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
