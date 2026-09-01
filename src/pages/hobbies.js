import React, { useEffect } from 'react';

import '../App.css';

import Template from '../components/template';
import { FaGithub, FaTwitter, FaLinkedin, FaKaggle, FaEnvelope, FaCode } from 'react-icons/fa';

function HobbyCard({ title, description, imagePath }) {
    return (
        <div className="pl-6 py-6 flex items-start gap-4 hover:bg-white/5 rounded-xl p-3 transition-all duration-100 grow border border-slate-700 hover:border-slate-600 border-opacity-60 max-w-4xl max-h-48">
            <div className="flex-1">
                <p className="text-slate-200 text-base md:text-3xl font-semibold leading-tight mb-4">{title}</p>
                <div className="text-slate-400 ml-1 md:ml-2 text-sm mt-2 space-y-1 w-4/5">{description}</div>
            </div>
            <div className="w-32 h-32 flex-shrink-0 text-orange-400 text-4xl flex items-center justify-center mx-12">
                <img src={imagePath} alt={title} className="object-contain" />
            </div>
        </div>
    )
};

export default function Hobbies() {

    return (
        <Template>
            <div className="flex flex-col items-center px-6 pt-12 pb-6">
                <h1 className="text-4xl sm:text-5xl font-extrabold mb-6 text-orange-400">Hobbies</h1>
            </div>

            <div className="sm:flex-row flex-wrap justify-center gap-2 md:gap-4 px-24 pb-24 grid sm:grid-cols-2 grid-cols-1">
                <HobbyCard
                    title="🥑 Avocado Army 🥑"
                    description="I am an avid avocado planting enthusiast. I collect avocado pits, sprout them, and nurture them in the hope of growing my own avocado forest one day."
                    imagePath="/images/reverso.png"
                />
                <HobbyCard
                    title="Fencing 🤺"
                    description="I have been practicing fencing for more than 16 years, specializing in the foil discipline."
                    imagePath="/images/fencing.png"
                />
                <HobbyCard
                    title="Design & Art 🎨"
                    description="With Illustrator, I create icons, logos, and various designs. I learned it at CentraleSupélec when I was a member of the Design Club. This has proven useful for my projects and researches to create appealing visuals."
                    imagePath="/images/design.png"
                />
            </div>
        </Template>
    );
}