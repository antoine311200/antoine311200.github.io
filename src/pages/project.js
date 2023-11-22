import React, { useEffect } from 'react';

import '../App.css';

import Template from '../components/template';


export default function Project() {

  useEffect(() => {
    document.title = `Projects | Antoine Debouchage`;
  }, []);

  return (
    <Template>
        <div className='fixed h-32 top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center'>
            <img src="/underconstruction.svg" alt="Under construction" className='w-32'/>
            <h1 className="font-semibold text-2xl bg-gradient-to-r from-[#F7971E] to-[#FFD200] bg-clip-text text-transparent">Page under construction</h1>

        </div>
    </Template>
  );
}