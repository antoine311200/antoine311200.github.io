import React, { useEffect } from 'react';

import Template from '../components/template';

import { FaCalendarAlt, FaMapMarkerAlt, FaDownload, FaPaperclip } from "react-icons/fa";
import { LuTestTube2 } from "react-icons/lu";

const experiences = [
    {
        title: 'Research Intern',
        company: 'Riken AIP - Tensor Learning Team',
        location: 'Tokyo, Japan',
        date: '07/2024 - 12/2024',
        description: [
            "Researched a novel method for pretraining LLMs using accumulation of low-rank matrices.",
            "Proved theoretical properties on rank evolution of LoRA and sums of matrices.",
            "Paper \"AccLoRT: Pretraining and tuning of Large Language Models from accumulation of low-rank weights\"."
        ],
        image: '/images/riken.jpg'
    },
    {
        title: 'Data Scientist Intern',
        company: 'Banque de France',
        location: 'Paris, France',
        date: '03/2023 - 08/2023',
        description: [
            'Improved a document analysis tool with topic modeling (BERTopic), question/answering (zero-shot, T0pp).',
            'Built the basis of an internal application for general NLP at the bank (topic analysis and LLMs).',
            'Scrapped billions of tokens to create financial datasets.',
            'Created a fine-tuning framework of transformers & LLM models with SOTA method (LoRA, quantization)'
        ],
        image: '/images/bdf.svg'
    },
    {
        title: 'Natural Language Processing Intern',
        company: 'Reverso',
        location: 'Neuilly-sur-Seine, France',
        date: '09/2022 - 02/2023',
        description: [
            'Investigated paraphrasing with fast inference using CTranslate2.',
            'Realized novel strategies for ensuring diversity and quality of rephrasing.',
            'Creation of a complete paraphrasing dataset'
        ],
        image: '/images/reverso.png'
    },
    {
        title: 'Quantum Inspired & Tensor Network Intern',
        company: 'Multiverse Computing',
        location: 'San Sebastián, Spain',
        date: '04/2022 - 08/2022',
        description: [
            'Tensor Network Intern. Developed a new optimization algorithm based on specific tensor networks with imaginary-time evolution tested on dozens of problems.',
            'Resulted in constraint-satisfied quasi-optimal solutions on Quadratic Portfolio Optimisation problems.'
        ],
        image: '/images/multiverse.png'
    },
    {
        title: 'Member of Automatants - CentraleSupélec AI Club',
        company: 'Automatants',
        location: 'Gif-sur-Yvette, France',
        date: '09/2021 - 01/2022',
        description: [
            'Managed two Machine Learning projects (Text Summarization & Machine Translation) of 5 students each in the club of Artificial Intelligence of CentraleSupélec : Automatants.',
            'Used Tensorflow, Keras, PyTorch, Numpy, Pandas, NLTK, Spacy, HuggingFace.'
        ]
    },
    // {
    //     title: 'Trainee',
    //     company: 'S.I.D.E',
    //     location: 'Sucy-en-Brie, France',
    //     date: '06/2021 - 07/2021',
    //     description: [
    //         'Collaborated as a trainee for order picking during 5 weeks for the engineering mandatory operational internship in a company specialized on importation & exportation of books in France and abroad.'
    //     ]
    // }
];

const educations = [
    {
        title: 'Ecole Normale Supérieure - Paris Saclay',
        company: 'MVA - Master of Science in Applied Mathematics',
        location: 'Gif-sur-Yvette, France',
        date: '09/2023 - 12/2024',
        description: [
            'Master : Mathematics - Vision - Learning',
            'Master of Science in applied mathematics, machine learning and deep learning'
        ]
    },
    {
        title: 'CentraleSupélec',
        company: 'Master of Science in Engineering & Data Science',
        location: 'Gif-sur-Yvette, France',
        date: '09/2020 - 12/2024',
        description: [
            'Student in engineering, mathematics and data science.',
            'Studied measure theory, probability, PDE, signal processing, statistics and machine learning'
        ]
    },
    {
        title: 'Lycée Condorcet',
        company: 'Preparatory Classes for Grandes Ecoles',
        location: 'Paris, France',
        date: '09/2018 - 06/2020',
        description: [
            'Preparatory classes student in Mathematics (Calculus, Algebra, Probabilities, Group theory...), Physics (Mechanic, Quantum Physics, Thermodynamics), Chemistry, Computer Science'
        ]
    }
];

const researches = [
    {
        title: "Paper : AccLoRT - Pretraining and tuning of Large Language Models from accumulation of low-rank weights",
        company: 'Antoine Debouchage, Yuning Qiu, Qibin Zhao',
        location: "Under review",
        date: '',
        description: [
            'Novel method for memory efficient pretraining of large language models using accumulation of low-rank weights.',
            'Derived theoretical properties on rank evolution of LoRA as well as inequalities on the rank of sums of matrices.',
        ],
    },
    {
        title: "Resolution of high-dimensional PDEs using tensor networks",
        company: 'Crédit Agricole CIB - CentraleSupélec',
        location: "Montrouge / Gif-sur-Yvette, France",
        date: '10/2023 - 04/2024',
        description: [
            'Research on the resolution of high-dimensional PDEs using tensor networks.',
            'Application in finance on Black-Scholes PDEs with high dimensionality.'
        ],
    },
    {
        title: "Paper : Leveraging Multi-Temporal Sentinel 1 and 2 Satellite Data for Leaf Area Index Estimation with Deep Learning",
        company: 'Clement Wang, Antoine Debouchage, Valentin Goldité, Aurélien Wery, Jules Salzinger',
        location: "Big Data From Space 2023 Conference",
        date: '11/2023',
        description: [
            'Proposed novel deep learning architectures for estimating Leaf Area Index (LAI) from multi-temporal Sentinel 1 and 2 satellite data.',
            "Achieved declouding as a byproduct, improving LAI estimation accuracy.",
        ],
        link: 'https://github.com/valentingol/LeafNothingBehind'
    },
    {
        title: 'Black-Scholes resolution with Quantum-Inspired Deep Learning',
        company: 'Crédit Agricole CIB - CentraleSupélec',
        location: 'Gif-sur-Yvette, France',
        date: '09/2021 - 03/2022',
        description: [
            'Investigated the use of tensor train decomposition of neural networks.',
            'Application in options forecasts with the Black-Scholes model for Crédit Agricole BIB (French bank)',
            'Designed a Quantum Inspired Python library called Syngular.'
        ],
        link: 'https://github.com/antoine311200/Syngular'
    },
    {
        title: 'Simulation of Quantum Circuits with Tensor Networks',
        company: 'CentraleSupélec',
        location: 'Gif-sur-Yvette, France',
        date: '10/2020 - 06/2021',
        description: [
            'Mastered the basics of Quantum Computing, most classical quantum algorithm (Shor, QAOA, VQE, FFT...)',
            'Implemented a quantum circuit simulator using tensor networks (Matrix Product States) for efficient simulation on classical computers.',
        ],
        link: 'https://github.com/micronoyau/Quantum-Computing-Lab'
    },
];


function SectionTitle({ children, icon }) {
    return (
        <h3 className="text-slate-200/90 text-xl font-semibold tracking-wide mb-3 flex items-center gap-3">
            {icon}
            {children}
        </h3>
    );
}

function Item({ item }) {
    return (
        <div className="mb-6 last:mb-0">
            <div className="flex items-start justify-between">
                <div>
                    <h4 className="text-slate-100 font-semibold text-lg leading-tight">{item.title}</h4>
                    <div className="text-sky-200/80 text-sm mt-1">{item.company} • <span className="text-slate-300">{item.location}</span></div>
                </div>
                <div className="text-slate-400 text-sm ml-4 whitespace-nowrap">{item.date}</div>
            </div>
            <ul className="mt-3 ml-4 list-disc text-slate-300 text-sm space-y-1">
                {item.description.map((d, i) => (
                    <li key={i}>{d}</li>
                ))}
            </ul>
            {item.link && (
                <div className="mt-2">
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-sky-300 text-sm underline">View repository</a>
                </div>
            )}
        </div>
    );
}

export default function ResumeMain() {
    return (
        <Template>
            <main className={`max-w-6xl mx-auto px-6 py-10`}>
                <div className="grid grid-cols-1 gap-8">
                    <aside className="lg:col-span-4">
                        <div className="sticky top-24 space-y-6">
                            <div className="rounded-2xl p-6 bg-gradient-to-br from-white/2 to-white/3 border border-white/5 shadow-inner backdrop-blur-sm">
                                <SectionTitle icon={<FaPaperclip className="w-5 h-5 text-white" />}>
                                    Experiences
                                </SectionTitle>

                                <div className="mt-4 space-y-6">
                                    {experiences.map((experience, i) => (
                                        <div
                                            key={i}
                                            className="pl-6 flex items-start gap-4 hover:bg-white/5 rounded-xl p-3 transition-all duration-100"
                                        >
                                            <div className="flex-1">
                                                <p className="text-slate-200 text-base md:text-lg font-semibold leading-tight">
                                                    {experience.title}
                                                </p>
                                                <p className="text-orange-300 text-sm">{experience.company}</p>
                                                <p className="text-slate-300 text-xs italic">
                                                    {experience.location} • {experience.date}
                                                </p>

                                                <ul className="text-slate-400 list-disc list-inside ml-1 md:ml-2 text-xs mt-2 space-y-1">
                                                    {experience.description.map((desc, index) => (
                                                        <li key={index}>{desc}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-2xl p-6 bg-gradient-to-br from-white/2 to-white/3 border border-white/5 shadow-inner backdrop-blur-sm">
                                <SectionTitle icon={<FaPaperclip className="w-5 h-5 text-white" />}>
                                    Education
                                </SectionTitle>

                                <div className="mt-4 space-y-6">
                                    {educations.map((education, i) => (
                                        <div
                                            key={i}
                                            className="pl-6 flex items-start gap-4 hover:bg-white/5 rounded-xl p-3 transition-all duration-100"
                                        >
                                            <div className="flex-1">
                                                <p className="text-slate-200 text-base md:text-lg font-semibold leading-tight">
                                                    {education.title}
                                                </p>
                                                <p className="text-violet-300 text-sm">{education.company}</p>
                                                <p className="text-slate-300 text-xs italic">
                                                    {education.location} • {education.date}
                                                </p>

                                                <ul className="text-slate-400 list-disc list-inside ml-1 md:ml-2 text-xs mt-2 space-y-1">
                                                    {education.description.map((desc, index) => (
                                                        <li key={index}>{desc}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-2xl p-6 bg-gradient-to-br from-white/2 to-white/3 border border-white/5 shadow-inner backdrop-blur-sm">
                                <SectionTitle icon={<FaPaperclip className="w-5 h-5 text-white" />}>
                                    Research & Selected Publications
                                </SectionTitle>

                                <div className="mt-4 space-y-6">
                                    {researches.map((research, i) => (
                                        <div
                                            key={i}
                                            className="pl-6 flex items-start gap-4 hover:bg-white/5 rounded-xl p-3 transition-all duration-100"
                                        >
                                            <div className="flex-1">
                                                <p className="text-slate-200 text-base md:text-lg font-semibold leading-tight">
                                                    {research.title}
                                                </p>
                                                <p className="text-amber-400 text-sm">{research.company}</p>
                                                <p className="text-slate-300 text-xs italic">
                                                    {research.location} {research.date && `• ${research.date}`}
                                                </p>

                                                <ul className="text-slate-400 list-disc list-inside ml-1 md:ml-2 text-xs mt-2 space-y-1">
                                                    {research.description.map((desc, index) => (
                                                        <li key={index}>{desc}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>
        </Template>
    );
};

// const Experience = () => {
//     return (
//         <div className="py-3 md:py-6 px-3 md:px-4">
//             <h2 className="text-xl md:text-2xl text-black underline font-semibold mb-2 md:mb-6">Experience</h2>
//             {experiences.map((experience) => (
//                 <div>
//                     <div className="relative">
//                         <div className="pl-1 md:pl-3">
//                             <p className="text-base md:text-lg text-gray-950 font-semibold leading-tight">{experience.title}</p>
//                             <p className="text-gray-800 text-sm">{experience.company}</p>
//                             <p className="text-gray-700 text-xs italic">{experience.location}  {experience.date}</p>
//                             <ul className="list-disc list-inside text-gray-900 ml-1 md:ml-2 text-xxs md:text-xs mt-2">
//                                 {experience.description.map((desc, index) => (
//                                     <li key={index}>{desc}</li>
//                                 ))}
//                             </ul>
//                         </div>
//                     </div>
//                     <div className="h-6"></div>
//                 </div>
//             ))}
//         </div>
//     );
// };

// const Education = () => {
//     return (
//         <div className="py-3 md:py-6 px-3 md:px-4">
//             <h2 className="text-xl md:text-2xl text-black underline font-semibold mb-2 md:mb-6">Education</h2>
//             {educations.map((education) => (
//                 <div>
//                     <div className="relative">
//                         <div className="pl-1 md:pl-3">
//                             <p className="text-base md:text-lg text-gray-950 font-semibold leading-tight">{education.title}</p>
//                             <p className="text-gray-800 text-sm">{education.company}</p>
//                             <p className="text-gray-700 text-xs italic">{education.location}  {education.date}</p>
//                             <ul className="list-disc list-inside text-gray-900 ml-1 md:ml-2 text-xxs md:text-xs mt-2">
//                                 {education.description.map((desc, index) => (
//                                     <li key={index}>{desc}</li>
//                                 ))}
//                             </ul>
//                         </div>
//                     </div>
//                     <div className="h-6"></div>
//                 </div>
//             ))}
//         </div>
//     );
// };

// const Research = () => {
//     return (
//         <div className="py-3 md:py-6 px-3 md:px-4">
//             <h2 className="text-xl md:text-2xl text-black underline font-semibold mb-2 md:mb-6">Researches</h2>
//             {researches.map((research) => (
//                 <div>
//                     <div className="relative">
//                         <div className="pl-1 md:pl-3">
//                             <p className="text-base md:text-lg text-gray-950 font-semibold leading-tight">{research.title}</p>
//                             <p className="text-gray-800 text-sm">{research.company}</p>
//                             <p className="text-gray-700 text-xs italic">{research.location}  {research.date}</p>
//                             <ul className="list-disc list-inside text-gray-900 ml-1 md:ml-2 text-xxs md:text-xs mt-2">
//                                 {research.description.map((desc, index) => (
//                                     <li key={index}>{desc}</li>
//                                 ))}
//                             </ul>
//                         </div>
//                     </div>
//                     <div className="h-6"></div>
//                 </div>
//             ))}
//         </div>
//     );
// };

// const Projects = () => {
//     return (
//         <div className="py-6">
//             <h2 className="text-2xl font-semibold mb-4">Projects</h2>
//             {/* Similar structure as Experience and Education */}
//         </div>
//     );
// };

// const Resume = () => {

//     useEffect(() => {
//         document.title = `Resume | Antoine Debouchage`;
//     }, []);

//     return (
//         <Template iconColor="grey">
//             {/* Title Resume */}
//             <div className="flex flex-col items-center justify-center text-white px-3 sm:px-6 lg:px-8">
//                 <h1 className="text-4xl font-bold">Resume</h1>
//             </div>

//             <div className="px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8 text-white min-w-screen">
//                 <div className='container bg-white rounded-lg'>
//                     <Experience />
//                 </div>
//                 <div className='container bg-white rounded-lg'>
//                     <Research />
//                 </div>
//                 <div className='container bg-white rounded-lg'>
//                     <Education />
//                 </div>
//             </div>
//         </Template>
//     );
// };

// export default Resume;
