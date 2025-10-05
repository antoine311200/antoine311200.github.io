import React, { useEffect } from 'react';

import '../App.css';

import Template from '../components/template';
import ProjectItem from '../components/item';

const school_projects = [
  {
    title: 'MADDPG for Prey-predator food-chain simulation',
    description: 'Reinforcement learning based environment for food-chain like prey-predator behaviours with hunting, co-operation and so on.',
    github: 'https://github.com/antoine311200/prey-predator-rl',
    image: '/images/misc/extreme_value.png',
    file: ''
  },
  {
    title: 'Graph-cut Style Transfer',
    description: 'Implementation of a graph-cut style transfer method for image processing from the paper "Multimodal Style Transfer via Graph Cuts" by Zhang & al.',
    github: 'https://github.com/antoine311200/graph-cut-style-transfer',
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
    github: 'https://github.com/clementw168/mixture-density-net',
    image: '/images/misc/mixture_network.png',
    file: ''
  },
  {
    title: 'Low-rank autoregressive tensor completion',
    description: 'Implementation of the paper "Low-rank autoregressive tensor completion for multivariate time series forecasting" from X. Chen and L. Sun in the frameword of the MVA 2023-2024 course "Time Series Learning"',
    github: 'https://github.com/antoine311200/low-rank-tensor-completion',
    image: '/images/misc/low_rank.png',
    file: ''
  },
  {
    title: 'FuseCensor - Obscene Content Detection & Censorship',
    description: 'Fuse Censor emerged in the context of the Coding Weeks as as project using machine learning and more explicitly Natural Language Processing with Sentiment Analysis. After being through some brainstorming we have come up with the basic idea of a multi-browser extension analysing the body of a page replacing or censoring all explicitly negative contents.',
    github: 'https://github.com/antoine311200/FuseCensor',
    image: '/images/misc/fuse_censor.png',
    file: './files/FuseCensor.pdf'
  },
]

const personal_projects = [
  {
    title: 'Torchcolor',
    description: 'Torchcolor is a lightweight Python package to enhance readability of printing and logging information into the terminal with Pytorch module coloring support.',
    github: 'https://github.com/antoine311200/torchcolor',
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
            {research_projects.map(project => <ProjectItem title={project.title} description={project.description} link={project.link} image={project.image} file={project.file} github={project.github} arxiv={project.arxiv} authors={project.authors} />)}
          </div>

          <div className='flex flex-col items-left pl-5 md:pl-20 mt-5'>
            <h1 className='font-normal text-xl text-transparent text-white'>Personal Projects</h1>
            <div className='w-[25%] h-[1px] my-2 bg-white'></div>
          </div>

          <div className='flex flex-col items-center mb-8'>
            {personal_projects.map(project => <ProjectItem title={project.title} description={project.description} link={project.link} image={project.image} file={project.file} github={project.github} arxiv={project.arxiv} authors={project.authors} />)}
          </div>

          <div className='flex flex-col items-left pl-5 md:pl-20 mt-5'>
            <h1 className='font-normal text-xl text-transparent text-white'>School Projects</h1>
            <div className='w-[25%] h-[1px] my-2 bg-white'></div>
          </div>

          <div className='flex flex-col items-center mb-8'>
            {school_projects.map(project => <ProjectItem title={project.title} description={project.description} link={project.link} image={project.image} file={project.file} github={project.github} arxiv={project.arxiv} authors={project.authors} />)}
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