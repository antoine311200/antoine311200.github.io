import React, { useEffect } from 'react';

import '../App.css';

import Template from '../components/template';
import { FaGithub, FaTwitter, FaLinkedin, FaKaggle, FaEnvelope, FaCode } from 'react-icons/fa';

export default function App() {
  useEffect(() => {
    document.title = `Contact - Antoine Debouchage`;
  }, []);


  const contacts = [
    { icon: <FaEnvelope />, label: 'Email', link: 'mailto:antoine311200@gmail.com' },
    { icon: <FaLinkedin />, label: 'LinkedIn', link: 'https://www.linkedin.com/in/antoine-debouchage/' },
    { icon: <FaGithub />, label: 'GitHub', link: 'https://github.com/antoine311200' },
    { icon: <FaTwitter />, label: 'Twitter', link: 'https://twitter.com/antoine311200' },
    { icon: <FaKaggle />, label: 'Kaggle', link: 'https://www.kaggle.com/antoinedebouchage' },
    { icon: <FaCode />, label: 'LeetCode', link: 'https://leetcode.com/antoine311200/' },
  ];


  return (
    <Template>
      <div className="flex flex-col items-center px-6 py-12 md:py-24">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-6 text-orange-400">Contact Me</h1>
        <p className="text-center max-w-xl text-gray-300 mb-8 md:mb-16">
          Feel free to reach out via any of the platforms below or send me an email. I'm always open to collaboration, questions, or discussions about research, projects, or tech.
        </p>


        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 md:gap-6">
          {contacts.map((c) => (
            <a
              key={c.label}
              href={c.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full
             bg-white/10 text-gray-100 text-xs md:text-sm
             hover:bg-white/20 hover:shadow-lg
             transition-colors duration-200"
            >
              <span className="text-xl">{c.icon}</span>
              <span className="font-medium text-gray-100">{c.label}</span>
            </a>
          ))}
        </div>
      </div>
    </Template>
  );
}