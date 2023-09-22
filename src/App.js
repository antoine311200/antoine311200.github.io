import React from 'react';

import './App.css';

import Template from './components/template';


export default function App() {
  return (
    <Template>
      <div className="text-center pt-20" style={{ zIndex: 10 }}>
        <h1 className="text-5xl py-2 text-white font-medium">Antoine Debouchage</h1>
        <h4 className="text-2xl py-3 text-white">
          <span className="">Machine Learning</span>, Quantum Computing, Mathematics</h4>
      </div>
    </Template>
  );
}