import React from 'react';

import Header from './header';
import Footer from './footer';
import '../App.css';

export default function Template({ children }) {
  return (
    <div className='min-h-screen h-screen'>
      <div
        className="fixed top-0 left-0 w-screen h-screen bg-cover bg-no-repeat bg-center bg-slate-800"
        style={{
          backgroundImage: `url('/waves.svg')`,
          zIndex: -1
        }}
      ></div>

      <Header/>

      {children}

      <Footer />
    </div >
  );
}