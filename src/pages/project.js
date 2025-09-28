import React, { useEffect } from 'react';

import '../App.css';

import Template from '../components/template';

const ProjectItem = ({ title, description, link, image, file }) => {
  return (
    <div className="my-4 group relative grid gap-4 pb-1 sm:grid-cols-8 sm:gap-8 md:gap-4 px-4 md:px-32 transition-all hover:!opacity-100 group-hover/list:opacity-50 lg:hover:!opacity-100 lg:group-hover/list:opacity-50">
      <div className="absolute hidden z-0 rounded-md border-2 mx-2 -inset-y-2 inset-0 md:-inset-x-4 md:-inset-y-4 md:mx-32 transition group-hover:block group-hover:border-slate-200/20 lg:group-hover:drop-shadow-lg" />
      <div class="flex flex-col justify-between m-2 p-2 md:p-4 leading-normal z-10 sm:order-2 sm:col-span-6">
        <h6 class="inline-flex items-baseline mb-2 text-xl font-bold tracking-tight text-white">{title}</h6>
        <p class="mb-3 text-sm font-normal text-gray-400">{description}</p>
        {/* Add stylized link button */}
        <div className="flex flex-row space-x-4">
        {link && <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center w-auto px-5 py-2 text-sm font-medium text-center text-white rounded-lg border-2 border-gray-600 focus:ring-4 focus:outline-none focus:ring-cyan-900 hover:bg-gray-800/100 transition hover:border-gray-500">
          See more
          <svg aria-hidden="true" class="w-4 h-4 ml-2 -mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
        </a>}
        {file && <a href={file} target="_blank" rel="noopener noreferrer" className="inline-flex items-center w-auto px-5 py-2 text-sm font-medium text-center text-white rounded-lg border-2 border-gray-600 focus:ring-4 focus:outline-none focus:ring-cyan-900 hover:bg-gray-800/100 transition hover:border-gray-500">
          Presentation
          <svg aria-hidden="true" class="w-4 h-4 ml-2 -mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
        </a>}
        </div>
      </div>
      <img className="rounded border-2 border-slate-200/10 transition group-hover:border-slate-200/30 sm:order-1 sm:col-span-2 sm:translate-y-1 scale-90" src={image} alt={title} />
    </div>
  )
}

const school_projects = [
  {
    title: 'MADDPG for Prey-predator food-chain simulation',
    description: 'Reinforcement learning based environment for food-chain like prey-predator behaviours with hunting, co-operation and so on.',
    link: 'https://github.com/antoine311200/prey-predator-rl',
    image: '/images/misc/extreme_value.png',
    file: ''
  },
  {
    title: 'Graph-cut Style Transfer',
    description: 'Implementation of a graph-cut style transfer method for image processing from the paper "Multimodal Style Transfer via Graph Cuts" by Zhang & al.',
    link: 'https://github.com/antoine311200/graph-cut-style-transfer',
    image: '/images/misc/graph-cut.jpg',
    file: './files/GRM.pdf'
  },
  {
    title: 'Eye fundus processing using Mathematical Morphology',
    description: 'Application of mathematical morphology techniques for the analysis and processing of eye fundus images.',
    link: '',
    image: '/images/misc/fundus.png',
    file: ''
  },
  {
    title: 'Binary Classification on Extreme Regions',
    description: 'Implementation of the paper "On Binary Classification in Extreme Regions" by Hamid Jalalzai, Stephan Clemençon and Anne Sabourin in the frameword of the MVA 2023-2024 course "Statistical Learning with Extreme Values"',
    link: '',
    image: '/images/misc/extreme_value.png',
    file: ''
  },
  {
    title: 'Mixture Density Networks',
    description: 'Implementation of the paper "Mixture Density Nework" by C. Bishop  in the frameword of the MVA 2023-2024 course "Introduction to Probabilistic Graphical Models and Deep Generative Models"',
    link: 'https://github.com/clementw168/mixture-density-net',
    image: '/images/misc/mixture_network.png',
    file: ''
  },
  {
    title: 'Low-rank autoregressive tensor completion',
    description: 'Implementation of the paper "Low-rank autoregressive tensor completion for multivariate time series forecasting" from X. Chen and L. Sun in the frameword of the MVA 2023-2024 course "Time Series Learning"',
    link: 'https://github.com/antoine311200/low-rank-tensor-completion',
    image: '/images/misc/low_rank.png',
    file: ''
  },
  {
    title: 'FuseCensor - Obscene Content Detection & Censorship',
    description: 'Fuse Censor emerged in the context of the Coding Weeks as as project using machine learning and more explicitly Natural Language Processing with Sentiment Analysis. After being through some brainstorming we have come up with the basic idea of a multi-browser extension analysing the body of a page replacing or censoring all explicitly negative contents.',
    link: 'https://github.com/antoine311200/FuseCensor',
    image: '/images/misc/fuse_censor.png',
    file: './files/FuseCensor.pdf'
  },
]

const personal_projects = [
  {
    title: 'Torchcolor',
    description: 'Torchcolor is a lightweight Python package to enhance readability of printing and logging information into the terminal with Pytorch module coloring support.',
    link: 'https://github.com/antoine311200/torchcolor',
    image: '/images/misc/torchcolor.svg',
    file: ''
  },
  {
    title: 'Japanese Training Application',
    description: 'A web application to learn Japanese vocabulary, kanjis and sentences on the fly with selected levels.',
    link: 'https://antoine311200.github.io/#/secret',
    image: '/images/misc/japanese_trainer.jpg',
    file: ''
  },
  {
    title: 'Mandall - Mandarin Character Trainer',
    description: 'A web application to learn Mandarin characters by creating personalized lists to learn from.',
    link: 'https://antoine311200.github.io/#/mandall',
    image: '/images/misc/chinese_trainer.jpg',
    file: ''
  }
]

const research_projects = [
  {
    title: 'Solving High-Dimensional PDEs with Tensor Networks',
    description: 'Final year research project at CentraleSupélec. Project supervised by Crédit Agricole CIB."',
    link: '',
    image: '/images/misc/bsde.png',
    file: ''
  },
  {
    title: 'Simulation of Quantum Circuits with Tensor Networks',
    description: 'First year research project at CentraleSupélec. The goal of this project is to simulate low-entangled quantum circuits with Matrix Product States and Matrix Product Operators qnd to conduct a study on the fidelity of the simulations with respect to the depth of the circuits and the Matrix Product ranks.',
    link: '',
    image: '/images/misc/qcircuit.png',
    file: ''
  }
]

export default function Project() {

  useEffect(() => {
    document.title = `Projects | Antoine Debouchage`;
  }, []);

  return (
    <Template>
      <div className="flex flex-col items-center justify-center p-4">
        <div className='container rounded-md flex flex-col bg-slate-900 shadow-[0px_0px_20px_2px_rgba(15,23,42,0.6)] shadow-gray-500/25'>
          <div className='flex flex-col items-left pl-5 md:pl-20 mt-5'>
            <h1 className='font-normal text-xl text-transparent text-white'>Research Projects</h1>
            <div className='w-[25%] h-[1px] my-2 bg-white'></div>
          </div>

          <div className='flex flex-col items-center mb-8'>
            {research_projects.map(project => <ProjectItem title={project.title} description={project.description} link={project.link} image={project.image} file={project.file} />)}
          </div>

          <div className='flex flex-col items-left pl-5 md:pl-20 mt-5'>
            <h1 className='font-normal text-xl text-transparent text-white'>Personal Projects</h1>
            <div className='w-[25%] h-[1px] my-2 bg-white'></div>
          </div>

          <div className='flex flex-col items-center mb-8'>
            {personal_projects.map(project => <ProjectItem title={project.title} description={project.description} link={project.link} image={project.image} file={project.file} />)}
          </div>

          <div className='flex flex-col items-left pl-5 md:pl-20 mt-5'>
            <h1 className='font-normal text-xl text-transparent text-white'>School Projects</h1>
            <div className='w-[25%] h-[1px] my-2 bg-white'></div>
          </div>

          <div className='flex flex-col items-center mb-8'>
            {school_projects.map(project => <ProjectItem title={project.title} description={project.description} link={project.link} image={project.image} file={project.file} />)}
          </div>

          {/* <div className='mx-auto h-32 transform flex flex-col items-center mb-20'>
            <img src="/underconstruction.svg" alt="Under construction" className='w-32' />
            <h1 className="font-semibold text-2xl bg-gradient-to-r from-[#F7971E] to-[#FFD200] bg-clip-text text-transparent">Page under construction</h1>
          </div> */}
        </div>
      </div>
    </Template>

  );
}