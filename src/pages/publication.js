import React, { useEffect } from 'react';

import '../App.css';

import Template from '../components/template';
import ProjectItem from '../components/item';


const conf_papers = [
  {
    title: 'Leveraging Multi-Temporal Sentinel 1 and 2 Satellite Data for Leaf Area Index Estimation With Deep Learning',
    description: 'This paper presents a deep learning approach to estimate Leaf Area Index (LAI) using multi-temporal Sentinel 1 and 2 satellite data.',
    github: 'https://github.com/valentingol/LeafNothingBehind',
    arxiv: 'https://arxiv.org/abs/2410.19787',
    image: '/images/misc/lnb.png',
    authors: 'Clement Wang, Antoine Debouchage, Valentin Goldité, Aurélien Wery, Jules Salzinger',
    file: ''
  }
]

const review_papers = [
  {
    title: 'AccLoRT: Efficient Large Language Models Pretraining through Low Rank Accumulation',
    description: 'This paper proposes a novel approach for pretraining large language models using low-rank accumulation techniques. Proved theoretical bounds on the rank of sums of matrices.',
    github: 'https://github.com/antoine311200/sow',
    image: '/images/misc/acclort.jpg',
    authors: 'Antoine Debouchage, Yuning Qiu, Qibin Zhao',
    file: ''
  }
]

export default function Publication() {

  useEffect(() => {
    document.title = `Publications | Antoine Debouchage`;
  }, []);

  return (
    <Template>
      <div className="flex flex-col items-center justify-center p-4">
        <div className='container rounded-md flex flex-col bg-slate-900 shadow-[0px_0px_20px_2px_rgba(15,23,42,0.6)] shadow-gray-500/25'>
          <div className='flex flex-col items-left pl-5 md:pl-20 mt-5'>
            <h1 className='font-normal text-xl text-transparent text-white'>Conference papers</h1>
            <div className='w-[25%] h-[1px] my-2 bg-white'></div>
          </div>

          <div className='flex flex-col items-center mb-8'>
            {conf_papers.map(project => <ProjectItem title={project.title} description={project.description} link={project.link} image={project.image} file={project.file} github={project.github} arxiv={project.arxiv} authors={project.authors} />)}
          </div>

          <div className='flex flex-col items-left pl-5 md:pl-20 mt-5'>
            <h1 className='font-normal text-xl text-transparent text-white'>In review</h1>
            <div className='w-[25%] h-[1px] my-2 bg-white'></div>
          </div>

          <div className='flex flex-col items-center mb-8'>
            {review_papers.map(project => <ProjectItem title={project.title} description={project.description} link={project.link} image={project.image} file={project.file} github={project.github} arxiv={project.arxiv} authors={project.authors} />)}
          </div>
        </div>
      </div>
    </Template>
  );
}