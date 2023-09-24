import React, { useEffect } from 'react';

import Template from '../components/template';

const Experience = () => {
    return (
        <div className="py-6">
            <h2 className="text-2xl font-semibold mb-4">Experience</h2>
            <div className="relative">
                <div className="pl-6">
                    <p className="text-lg font-semibold">Natural Language Processing / Data Scientist Intern</p>
                    <p className="text-gray-300 text-sm">Banque de France</p>
                    <p className="text-gray-400 text-xs">Paris, France  03/2023 - 08/2023</p>
                    <ul className="list-disc list-inside text-gray-200 ml-2 text-xs mt-2">
                        <li>Improved a document analysis tool with topic modeling (BERTopic), question/answering (zero-shot, T0pp).</li>
                        <li>Built the basis of an internal application for general NLP at the bank (topic analysis and LLMs).</li>
                        <li>Scrapped billions of tokens to create financial datasets.</li>
                        <li>Created a fine-tuning framework of transformers & LLM models with SOTA method (LoRA, quantization)</li>
                    </ul>
                </div>
            </div>
            <div className="h-6"></div>
            <div className="relative">
                <div className="pl-6">
                    <p className="text-lg font-semibold">Natural Language Processing Intern</p>
                    <p className="text-gray-300 text-sm">Reverso</p>
                    <p className="text-gray-400 text-xs">Neuilly-sur-Seine, France  09/2022 - 02/2023</p>
                    <ul className="list-disc list-inside text-gray-200 ml-2 text-xs mt-2">
                        <li>Investigated paraphrasing with fast inference using CTranslate2.</li>
                        <li>Realized novel strategies for ensuring diversity and quality of rephrasing.</li>
                        <li>Creation of a complete paraphrasing dataset</li>
                    </ul>
                </div>
            </div>
            <div className="h-6"></div>
            <div className="relative">
                <div className="pl-6">
                    <p className="text-lg font-semibold">Quantum Inspired & Tensor Network Intern</p>
                    <p className="text-gray-300 text-sm">Multiverse Computing</p>
                    <p className="text-gray-400 text-xs">San Sebastián, Spain  04/2022 - 08/2022</p>
                    <ul className="list-disc list-inside text-gray-200 ml-2 text-xs mt-2">
                        <li>Tensor Network Intern. Developed a new optimization algorithm based on specific tensor networks with
                            imaginary-time evolution tested on dozens of problems.</li>
                        <li>Resulted in constraint-satisfied quasi-optimal solutions on Quadratic Portfolio Optimisation problems.</li>
                    </ul>
                </div>
            </div>
            <div className="h-6"></div>
            <div className="relative">
                <div className="pl-6">
                    <p className="text-lg font-semibold">Natural Language Processing Student Manager</p>
                    <p className="text-gray-300 text-sm">Automatants</p>
                    <p className="text-gray-400 text-xs">Gif-sur-Yvette, France  09/2021 - 01/2022</p>
                    <ul className="list-disc list-inside text-gray-200 ml-2 text-xs mt-2">
                        <li>Managed two Machine Learning projects (Text Summarization & Machine Translation) of 5 students each
                            in the club of Artificial Intelligence of CentraleSupélec : Automatants.</li>
                        <li>Used Tensorflow, Keras, PyTorch, Numpy, Pandas, NLTK, Spacy, HuggingFace.</li>
                    </ul>
                </div>
            </div>
            <div className="h-6"></div>
            <div className="relative">
                <div className="pl-6">
                    <p className="text-lg font-semibold">Trainee</p>
                    <p className="text-gray-300 text-sm">S.I.D.E</p>
                    <p className="text-gray-400 text-xs">Sucy-en-Brie, France  06/2021 - 07/2021</p>
                    <ul className="list-disc list-inside text-gray-200 ml-2 text-xs mt-2">
                        <li>Collaborated as a trainee for order picking during 5 weeks for the engineering mandatory operational
                            internship in a company specialized on importation & exportation of books in France and abroad.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

const Education = () => {
    return (
        <div className="py-6">
            <h2 className="text-2xl font-semibold mb-4">Education</h2>

            <div className="relative">
                <div className="pl-6">
                    <p className="text-lg font-semibold">Ecole Normale Supérieure - Paris Saclay</p>
                    <p className="text-gray-300 text-sm">MVA - Master of Science in Applied Mathematics</p>
                    <p className="text-gray-400 text-xs">Gif-sur-Yvette, France  09/2023 - Present</p>
                    <ul className="list-disc list-inside text-gray-200 ml-2 text-xs mt-2">
                        <li>Master : Mathematics - Vision - Learning</li>
                        <li>Master of Science in applied mathematics, machine learning and deep learning</li>
                    </ul>
                </div>
            </div>
            <div className="h-6"></div>

            <div className="relative">
                <div className="pl-6">
                    <p className="text-lg font-semibold">CentraleSupélec</p>
                    <p className="text-gray-300 text-sm">Master of Science in Engineering & Data Science</p>
                    <p className="text-gray-400 text-xs">Gif-sur-Yvette, France  09/2020 - Present</p>
                    <ul className="list-disc list-inside text-gray-200 ml-2 text-xs mt-2">
                        <li>MStudent in engineering, mathematics and data science.</li>
                        <li>Studied measure theory, probability, PDE, signal processing, statistics and machine learning</li>
                    </ul>
                </div>
            </div>
            <div className="h-6"></div>

            <div className="relative">
                <div className="pl-6">
                    <p className="text-lg font-semibold">Lycée Condorcet</p>
                    <p className="text-gray-300 text-sm">Preparatory Classes for Grandes Ecoles</p>
                    <p className="text-gray-400 text-xs">Paris, France  09/2018 - 06/2020</p>
                    <ul className="list-disc list-inside text-gray-200 ml-2 text-xs mt-2">
                        <li>Preparatory classes student in Mathematics (Calculus, Algebra, Probabilities, Group theory...),
                            Physics (Mechanic, Quantum Physics, Thermodynamics), Chemistry, Computer Science</li>
                    </ul>
                </div>
            </div>
            <div className="h-6"></div>
        </div>
    );
};

const Research = () => {
    return (
        <div className="py-6">
            <h2 className="text-2xl font-semibold mb-4">Research</h2>
            {/* Similar structure as Experience and Education */}
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
        <Template>
            <div className="px-16 py-8 grid grid-cols-1 md:grid-cols-2 gap-12 text-white">
                <div>
                    <Experience />
                    {/* <hr className="my-6" /> */}
                </div>
                <div>
                    <Education />
                    {/* <hr className="my-6" />
                    <Projects />
                    <hr className="my-6" />
                    <Research /> */}
                </div>
            </div>
        </Template>
    );
};

export default Resume;
