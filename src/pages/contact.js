import React, { useEffect } from 'react';

import '../App.css';

import Template from '../components/template';
import { FaGithub, FaTwitter, FaLinkedin, FaKaggle, FaEnvelope } from 'react-icons/fa';


const LinkComponent = ({ href, text, icon }) => {
  return (
    <div className="skeleton-black flex items-left space-x-4">
      {icon}
      <a
        className="text-gray-800 text-left"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {text}
      </a>
    </div>
  );
}

export default function App() {

  useEffect(() => {
    document.title = `Contact | Antoine Debouchage`;
  }, []);

  return (
    <Template>
      <div className="skeleton flex flex-col justify-center mx-4 md:mx-10 mt-10 text-center bg-white rounded-lg p-4 md:p-10">
      {/* <div> */}
        <h1 className="text-3xl font-bold text-gray-800 mb-12">Contact Me</h1>

        <div className="skeleton-black justify-center flex flex-col md:flex-row items-center space-x-12">
          <div className="skeleton-black flex flex-col items-left space-y-4 text-sm md:text-base">
            <LinkComponent href="https://github.com/antoine311200" text="Github @antoine311200" icon={<FaGithub size={24} className='text-grey-500' />} />
            <LinkComponent href="https://twitter.com/antoine311200" text="Twitter @antoine311200" icon={<FaTwitter size={24} className='text-grey-500' />} />
            <LinkComponent href="https://www.kaggle.com/antoinedebouchage" text="Kaggle @antoinedebouchage" icon={<FaKaggle size={24} className='text-grey-500' />} />
            <LinkComponent href="https://www.linkedin.com/in/antoine-debouchage/" text="LinkedIn Antoine Debouchage" icon={<FaLinkedin size={24} className='text-grey-500' />} />
          </div>

          <div className="h-10"></div>

          {/* Center */}
          <div className="skeleton-black flex flex-col items-left space-y-4 text-sm md:text-base">
            <LinkComponent href="mailto:antoine311200@gmail.com" text="antoine311200@gmail.com" icon={<FaEnvelope size={24} className='text-grey-500' />} />
            <LinkComponent href="mailto:antoine.debouchage@student-cs.fr" text="antoine.debouchage@student-cs.fr" icon={<FaEnvelope size={24} className='text-grey-500' />} />
            <LinkComponent href="mailto:antoine.debouchage@ens-paris-saclay.fr" text="antoine.debouchage@ens-paris-saclay.fr" icon={<FaEnvelope size={24} className='text-grey-500' />} />
          </div>
        </div>
      </div>
    </Template>
  );
}