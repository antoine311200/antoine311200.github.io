import React from 'react';
import { FaGithub } from 'react-icons/fa';

const ProjectItem = ({ title, description, link, image, file, github = undefined, arxiv = undefined, authors = undefined }) => {
  return (
    <div className="my-4 group relative grid gap-4 pb-1 sm:grid-cols-8 sm:gap-8 md:gap-4 px-4 md:px-32 transition-all hover:!opacity-100 group-hover/list:opacity-50 lg:hover:!opacity-100 lg:group-hover/list:opacity-50">
      <div className="absolute hidden z-0 rounded-md border-2 mx-2 -inset-y-2 inset-0 md:-inset-x-4 md:-inset-y-4 md:mx-32 transition group-hover:block group-hover:border-slate-200/20 lg:group-hover:drop-shadow-lg" />
      <div class="flex flex-col justify-between m-2 p-2 md:p-4 leading-normal z-10 sm:order-2 sm:col-span-6">
        <h6 class="inline-flex items-baseline mb-2 text-xl font-bold tracking-tight text-white">{title}</h6>
        {authors && <p class="mb-2 text-sm font-light text-gray-400"><span class="font-bold text-slate-400">Authors:</span> {authors}</p>}
        <p class="mb-3 text-sm font-normal text-gray-400">{description}</p>

        <div className="flex flex-row space-x-4">
        {link && <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center w-auto px-5 py-2 text-sm font-medium text-center text-white rounded-lg border-2 border-gray-600 focus:ring-4 focus:outline-none focus:ring-cyan-900 hover:bg-gray-800/100 transition hover:border-gray-500">
          See more
          <svg aria-hidden="true" class="w-4 h-4 ml-2 -mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
        </a>}
        {file && <a href={file} target="_blank" rel="noopener noreferrer" className="inline-flex items-center w-auto px-5 py-2 text-sm font-medium text-center text-white rounded-lg border-2 border-gray-600 focus:ring-4 focus:outline-none focus:ring-cyan-900 hover:bg-gray-800/100 transition hover:border-gray-500">
          Presentation
          <svg aria-hidden="true" class="w-4 h-4 ml-2 -mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
        </a>}
        {arxiv && <a href={arxiv} target="_blank" rel="noopener noreferrer" className="inline-flex items-center w-auto px-5 py-2 text-sm font-medium text-center text-white rounded-lg border-2 border-gray-600 focus:ring-4 focus:outline-none focus:ring-cyan-900 hover:bg-gray-800/100 transition hover:border-gray-500">
          ArXiv
            <img src="/images/arxiv.svg" alt="ArXiv" className="w-4 h-4 ml-2 -mr-1" />
        </a>}
        {github && <a href={github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center w-auto px-5 py-2 text-sm font-medium text-center text-white rounded-lg border-2 border-gray-600 focus:ring-4 focus:outline-none focus:ring-cyan-900 hover:bg-gray-800/100 transition hover:border-gray-500">
          GitHub
          <FaGithub className="w-4 h-4 ml-2 -mr-1" />
        </a>}
        </div>
      </div>
      <img className="rounded border-2 border-slate-200/10 transition group-hover:border-slate-200/30 sm:order-1 sm:col-span-2 sm:translate-y-1 scale-90" src={image} alt={title} />
    </div>
  )
}

export default ProjectItem;