import React from 'react';

import Header from './header';
import Footer from './footer';
import '../App.css';

export default function Template({ children, iconColor }) {
  return (
    <div className='min-h-screen text-gray-500' style={{
      'background': '#0f172a',
      'backgroundImage': 'radial-gradient(circle at 10% 90%, #203157, transparent 500px), radial-gradient(circle at 95% 20%, #192745, transparent 500px)',
    }}>
      <Header />

      {children}

      <Footer iconColor={iconColor} />
    </div >
  );
}