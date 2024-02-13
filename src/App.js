import React, { useEffect } from 'react';

import './App.css';

import Template from './components/template';


export default function App() {

  useEffect(() => {
    document.title = `Antoine Debouchage - Machine Learning, Quantum Computing, Mathematics - Personal Website`;
  }, []);

  return (
    <Template>
      <div className="text-center pt-20" style={{ zIndex: 10 }}>
        <h1 className="text-5xl py-2 text-gray-100 font-semibold">Antoine Debouchage</h1>
        <h4 className="text-2xl py-3 text-gray-200">
          <span className="">Machine Learning</span>, Quantum Computing, Mathematics
        </h4>
        <br />
        <br />
        {/* <div className='text-left w-1/2 mx-auto'>
          <p className="text-lg text-gray-300">
            <span className="font-bold">Welcome</span> to my personal website. My name is Antoine Debouchage, I am a Master student at CentraleSupélec & Ecole Normale Supérieure Paris-Saclay. I am passionate about <span className="font-bold">Machine Learning</span>, Quantum Computing and Mathematics.
          </p>
        </div> */}
      </div>
    </Template>
  );
}