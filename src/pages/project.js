import React, { useEffect } from 'react';

import '../App.css';

import Template from '../components/template';

const ProjectItem = ({ title, description, link, image }) => {
  return (
    <div className="my-4 group relative grid gap-4 pb-1 sm:grid-cols-8 sm:gap-8 md:gap-4 px-32 transition-all hover:!opacity-100 group-hover/list:opacity-50 lg:hover:!opacity-100 lg:group-hover/list:opacity-50">
      <div className="absolute hidden z-0 rounded-md border-2 -inset-x-4 -inset-y-4 mx-32 transition group-hover:block group-hover:border-slate-200/20 lg:group-hover:drop-shadow-lg" />
      <div class="flex flex-col justify-between p-4 leading-normal z-10 sm:order-2 sm:col-span-6">
        <h6 class="inline-flex items-baseline mb-2 text-xl font-bold tracking-tight text-white">{title}</h6>
        <p class="mb-3 text-sm font-normal text-gray-400">{description}</p>
      </div>
      <img className="rounded border-2 border-slate-200/10 transition group-hover:border-slate-200/30 sm:order-1 sm:col-span-2 sm:translate-y-1" src={image} alt={title} />
    </div>
  )
}

const school_projects = [
  {
    title: 'Binary Classification on Extreme Regions',
    description: 'Implementation of the paper "On Binary Classification in Extreme Regions" by Hamid Jalalzai, Stephan Clemençon and Anne Sabourin in the frameword of the MVA 2023-2024 course "Statistical Learning with Extreme Values"',
    link: '',
    image: '/images/misc/extreme_value.png'
  },
  {
    title: 'Mixture Density Networks',
    description: 'Implementation of the paper "Mixture Density Nework" by C. Bishop  in the frameword of the MVA 2023-2024 course "Introduction to Probabilistic Graphical Models and Deep Generative Models"',
    link: '',
    image: '/images/misc/mixture_network.png'
  },
  {
    title: 'Low-rank autoregressive tensor completion',
    description: 'Implementation of the paper "Low-rank autoregressive tensor completion for multivariate time series forecasting" from X. Chen and L. Sun in the frameword of the MVA 2023-2024 course "Time Series Learning"',
    link: '',
    image: '/images/misc/low_rank.png'
  },
]

const research_projects = [
  {
    title: 'Solving High-Dimensional PDEs with Tensor Networks',
    description: 'Final year research project at CentraleSupélec. Project supervised by Crédit Agricole CIB."',
    link: '',
    image: '/images/misc/bsde.png'
  }
]

export default function Project() {

  useEffect(() => {
    document.title = `Projects | Antoine Debouchage`;
  }, []);

  return (
    <Template>
      <div className='container rounded-md mx-auto my-10 py-4 flex flex-col bg-slate-900'>
        <div className='flex flex-col items-left pl-20 mt-5'>
          <h1 className='font-normal text-xl mytext text-transparent text-white'>School Projects</h1>
          <div className='w-[25%] h-[1px] my-2 bg-white'></div>
        </div>

        <div className='flex flex-col items-center mb-8'>
          {school_projects.map(project => <ProjectItem title={project.title} description={project.description} link={project.link} image={project.image} />)}
        </div>

        <div className='flex flex-col items-left pl-20 mt-5'>
          <h1 className='font-normal text-xl mytext text-transparent text-white'>Research Projects</h1>
          <div className='w-[25%] h-[1px] my-2 bg-white'></div>
        </div>

        <div className='flex flex-col items-center mb-8'>
          {research_projects.map(project => <ProjectItem title={project.title} description={project.description} link={project.link} image={project.image} />)}
        </div>

        <div className='mx-auto h-32 transform flex flex-col items-center mb-20'>
          <img src="/underconstruction.svg" alt="Under construction" className='w-32' />
          <h1 className="font-semibold text-2xl bg-gradient-to-r from-[#F7971E] to-[#FFD200] bg-clip-text text-transparent">Page under construction</h1>
        </div>
      </div>

    </Template>

  );
}