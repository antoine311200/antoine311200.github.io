import React, { useEffect } from 'react';

import '../App.css';

import Template from '../components/template';


export default function App() {

  useEffect(() => {
    document.title = `Papers | Antoine Debouchage`;
  }, []);

  return (
    <Template>

    </Template>
  );
}