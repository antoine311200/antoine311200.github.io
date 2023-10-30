import React, { useEffect } from 'react';

import Template from '../components/template';

const experiences = [
    {
        title: 'Natural Language Processing / Data Scientist Intern',
        company: 'Banque de France',
        location: 'Paris, France',
        date: '03/2023 - 08/2023',
        description: [
            'Improved a document analysis tool with topic modeling (BERTopic), question/answering (zero-shot, T0pp).',
            'Built the basis of an internal application for general NLP at the bank (topic analysis and LLMs).',
            'Scrapped billions of tokens to create financial datasets.',
            'Created a fine-tuning framework of transformers & LLM models with SOTA method (LoRA, quantization)'
        ]
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
        ]
    },
    {
        title: 'Quantum Inspired & Tensor Network Intern',
        company: 'Multiverse Computing',
        location: 'San Sebastián, Spain',
        date: '04/2022 - 08/2022',
        description: [
            'Tensor Network Intern. Developed a new optimization algorithm based on specific tensor networks with imaginary-time evolution tested on dozens of problems.',
            'Resulted in constraint-satisfied quasi-optimal solutions on Quadratic Portfolio Optimisation problems.'
        ]
    },
    {
        title: 'Natural Language Processing Student Manager',
        company: 'Automatants',
        location: 'Gif-sur-Yvette, France',
        date: '09/2021 - 01/2022',
        description: [
            'Managed two Machine Learning projects (Text Summarization & Machine Translation) of 5 students each in the club of Artificial Intelligence of CentraleSupélec : Automatants.',
            'Used Tensorflow, Keras, PyTorch, Numpy, Pandas, NLTK, Spacy, HuggingFace.'
        ]
    },
    {
        title: 'Trainee',
        company: 'S.I.D.E',
        location: 'Sucy-en-Brie, France',
        date: '06/2021 - 07/2021',
        description: [
            'Collaborated as a trainee for order picking during 5 weeks for the engineering mandatory operational internship in a company specialized on importation & exportation of books in France and abroad.'
        ]
    }
];

const educations = [
    {
        title: 'Ecole Normale Supérieure - Paris Saclay',
        company: 'MVA - Master of Science in Applied Mathematics',
        location: 'Gif-sur-Yvette, France',
        date: '09/2023 - Present',
        description: [
            'Master : Mathematics - Vision - Learning',
            'Master of Science in applied mathematics, machine learning and deep learning'
        ]
    },
    {
        title: 'CentraleSupélec',
        company: 'Master of Science in Engineering & Data Science',
        location: 'Gif-sur-Yvette, France',
        date: '09/2020 - Present',
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
        title: "Resolution of high-dimensional PDEs using tensor networks",
        company: 'Crédit Agricole CIB - CentraleSupélec',
        location: "Montrouge / Gif-sur-Yvette, France",
        date: '10/2023 - Present',
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
            'Paper in progress',
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

const Experience = () => {
    return (
        <div className="py-6 px-4">
            <h2 className="text-2xl text-black underline font-semibold mb-6">Experience</h2>
            {experiences.map((experience) => (
                <div>
                    <div className="relative">
                        <div className="pl-3">
                            <p className="text-lg text-gray-950 font-semibold">{experience.title}</p>
                            <p className="text-gray-800 text-sm">{experience.company}</p>
                            <p className="text-gray-700 text-xs italic">{experience.location}  {experience.date}</p>
                            <ul className="list-disc list-inside text-gray-900 ml-2 text-xs mt-2">
                                {experience.description.map((desc) => (
                                    <li>{desc}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className="h-6"></div>
                </div>
            ))}
        </div>
    );
};

const Education = () => {
    return (
        <div className="py-6 px-4">
            <h2 className="text-2xl font-semibold mb-4 text-black underline">Education</h2>

            {educations.map((education) => (
                <div>
                    <div className="relative">
                        <div className="pl-3">
                            <p className="text-lg text-gray-950 font-semibold">{education.title}</p>
                            <p className="text-gray-800 text-sm">{education.company}</p>
                            <p className="text-gray-700 text-xs italic">{education.location}  {education.date}</p>
                            <ul className="list-disc list-inside text-gray-900 ml-2 text-xs mt-2">
                                {education.description.map((desc) => (
                                    <li>{desc}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className="h-6"></div>
                </div>
            ))}
        </div>
    );
};

const Research = () => {
    return (
        <div className="py-6 px-4">
        <h2 className="text-2xl font-semibold mb-4 text-black underline">Research</h2>
            {researches.map((research) => (
                <div>
                    <div className="relative">
                        <div className="pl-3">
                            <p className="text-lg text-gray-950 font-semibold">{research.title}</p>
                            <p className="text-gray-800 text-sm">{research.company}</p>
                            <p className="text-gray-700 text-xs italic">{research.location}  {research.date}</p>
                            <ul className="list-disc list-inside text-gray-900 ml-2 text-xs mt-2">
                                {research.description.map((desc) => (
                                    <li>{desc}</li>
                                ))}
                            </ul>
                            {/* <div className="h-6"></div> */}
                            {/* {research.link && (
                                <div>
                                    <a
                                        className="text-gray-800 text-sm"
                                        href={research.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Link
                                    </a>
                                </div>
                            )} */}
                        </div>
                    </div>
                    <div className="h-6"></div>
                </div>
            ))
            }
        </div>
    );
};

const Projects = () => {
    return (
        <div className="py-6">
            <h2 className="text-2xl font-semibold mb-4">Projects</h2>
            {/* Similar structure as Experience and Education */}
        </div>
    );
};

const Resume = () => {

    useEffect(() => {
        document.title = `Resume | Antoine Debouchage`;
    }, []);

    return (
        <Template iconColor="black">
            {/* Title Resume */}
            <div className="flex flex-col items-center justify-center text-white px-4 sm:px-6 lg:px-8">
                <h1 className="text-4xl font-bold">Resume</h1>
            </div>

            <div className="px-8 py-8 mb-8 grid grid-cols-1 lg:grid-cols-2 gap-8 text-white">
                <div className='container bg-white rounded-lg'>
                    <Experience />
                </div>
                <div className='container bg-white rounded-lg'>
                    <Research />
                </div>
                <div className='container bg-white rounded-lg'>
                    <Education />
                </div>
            </div>
        </Template>
    );
};

export default Resume;
