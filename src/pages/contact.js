import React, { useEffect } from 'react';

import '../App.css';

import Template from '../components/template';


export default function App() {

  useEffect(() => {
    document.title = `Contact | Antoine Debouchage`;
  }, []);

  return (
    <Template>

    </Template>
  );
}