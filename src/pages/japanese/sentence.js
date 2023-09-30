import React, { useState, useEffect, useRef } from "react";
import { isMobile } from 'react-device-detect';

import { FaChevronLeft, FaChevronRight } from "react-icons/fa";


import all_sentences from "../../data/sentences.json";

let history = [];
let index = 0;


const SentenceTrainer = () => {
    const [sentences, setSentences] = useState(all_sentences);

    const [checkBasic, setCheckBasic] = useState(true);
    const [checkIntermediate, setCheckIntermediate] = useState(true);
    const [checkAdvanced, setCheckAdvanced] = useState(true);

    // Function that extract from all_sentences the sentences that match the level
    const getLevel = (level) => {
        return all_sentences.filter((sentence) => sentence.level === level);
    };

    const onChangeLevelSentence = (level) => {
        if (level === "Basic" && !(!checkIntermediate && !checkAdvanced)) setCheckBasic(!checkBasic);
        else if (level === "Intermediate" && !(!checkBasic && !checkAdvanced)) setCheckIntermediate(!checkIntermediate);
        else if (level === "Advanced" && !(!checkBasic && !checkIntermediate)) setCheckAdvanced(!checkAdvanced);
    };

    useEffect(() => {
        // This code will run after the state has been updated
        let newSentences = [];
        if (checkBasic) newSentences = newSentences.concat(getLevel("Basic"));
        if (checkIntermediate) newSentences = newSentences.concat(getLevel("Intermediate"));
        if (checkAdvanced) newSentences = newSentences.concat(getLevel("Advanced"));

        // Update the sentences state
        setSentences(newSentences);
    }, [checkBasic, checkIntermediate, checkAdvanced]);

    const [sentence, setSentence] = useState('');
    const [meaningSentence, setMeaningSentence] = useState('');
    const [furiganaSentence, setFuriganaSentence] = useState('');
    const [levelSentence, setLevelSentence] = useState('');
    const [isToggledSentence, setIsToggledSentence] = useState(false);

    const [isJP2ENSentence, setIsJP2ENSentence] = useState(true);

    const toggleMode = () => {
        setIsJP2ENSentence(!isJP2ENSentence);
    };

    const setData = (index) => {
        const sent = history[index];
        setSentence(sent.japanese);
        setFuriganaSentence(sent.furigana);
        setMeaningSentence(sent.english);
        setLevelSentence(sent.level);
    };

    const previousSentence = () => {
        if (index === 0) return;
        setData(index - 1);
        index--;
    };

    const nextSentence = () => {
        if (index === history.length - 1) return;
        setData(index + 1);
        index++;
    };

    const randomSentence = () => {
        setIsToggledSentence(false);

        const random = Math.floor(Math.random() * sentences.length);
        const sent = sentences[random];

        history.push(sent);
        index = history.length - 1;

        setData(index);
    };

    const handleScreenClick = (e) => {
        // Not match button inout or element with class toggle-button nor contains toggle-button
        if (!e.target.matches('button') && !e.target.matches('img') && !e.target.matches('input') && !e.target.matches('.toggle-button') && !e.target.closest('.toggle-button')) {
            setIsToggledSentence((prevToggled) => !prevToggled);
        }
    };


    useEffect(() => {
        // Add on start reload
        randomSentence();
        // onChangeLevelSentence("Basic");

        document.title = `Japanese App | Antoine Debouchage`;

        document.addEventListener('load', () => randomSentence());
        if (!isMobile) document.addEventListener('click', handleScreenClick);
        else document.addEventListener('touchstart', handleScreenClick);
        return () => {
            if (!isMobile) document.removeEventListener('click', handleScreenClick);
            else document.removeEventListener('touchstart', handleScreenClick);
        };
    }, []);

    const renderJapanese2EnglishSentence = () => {
        return (
            <div className="flex flex-col items-center gap-10">
                <h1 className="fixed px-10 text-2xl lg:text-4xl text-white text-center">{sentence}</h1>
                {/* {sentence != furiganaSentence && isToggledSentence && <h1 className="fixed text-3xl text-white text-center top-40">{furiganaSentence}</h1>} */}
                {isToggledSentence && <h1 className="fixed text-xl lg:text-3xl text-white text-center bottom-[50%] px-8">{meaningSentence}</h1>}
                {/* Add level badge */}
                <div className="absolute top-[22%]">
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">{levelSentence}</span>
                </div>
            </div >
        )
    };

    const renderEnglish2JapaneseSentence = () => {
        return (
            <div className="flex flex-col items-center gap-10">
                <h1 className="fixed px-10 text-2xl lg:text-4xl text-white text-center">{meaningSentence}</h1>
                    {/* {sentence != furiganaSentence && isToggledSentence && <h1 className=" text-xl lg:text-3xl text-white text-center px-8">{furiganaSentence}</h1>} */}
                {isToggledSentence && <h1 className="fixed bottom-[50%] text-xl lg:text-3xl text-white text-center">{sentence}</h1>}
                <div className="absolute top-[22%]">
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">{levelSentence}</span>
                </div>
            </div>
        )
    };

    return (
        <div>

            {/* Pagination */}
            <button onClick={previousSentence} className={`${history.length > 0 && index > 0 ? 'h-full' : 'hidden'} fixed top-1/3 left-0 text-gray-600 hover:text-gray-800 flex justify-center`}>
                <img src="light_chevron_left.svg" />
            </button>
            <button onClick={nextSentence} className={`${index < history.length - 1 ? 'h-full' : 'hidden'} fixed top-1/3 right-0 text-gray-600 hover:text-gray-800 flex justify-center`}>
                <img src="light_chevron_right.svg" />
            </button>

            {/* Content */}
            {isJP2ENSentence ? renderJapanese2EnglishSentence() : renderEnglish2JapaneseSentence()}

            {/* Menu */}
            <div className="flex flex-col items-center">
                <div className="absolute bottom-10 flex flex-col items-center gap-3">
                    <button className="justify-center bg-slate-50 hover:bg-slate-200 focus:ring-2 focus:outline-none focus:ring-slate-100 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center" onClick={randomSentence}>
                        Next <FaChevronRight className="ml-4 mt-1" />
                    </button>

                    <div className="flex items-center justify-center w-full mb-12 toggle-button">
                        <label for="toggle-jpen" className="flex items-center cursor-pointer">
                            <div className="relative">
                                <input type="checkbox" id="toggle-jpen" className="sr-only" onClick={toggleMode} />
                                <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
                                <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition"><span className={!isJP2ENSentence ? 'ml-1' : 'ml-1.5'}>{!isJP2ENSentence ? 'あ' : 'A'}</span></div>
                            </div>
                        </label>

                    </div>
                </div>
                <div className="absolute bottom-5">
                    <ul className="flex flex-row items-center w-full text-sm font-medium text-white">
                        <li className="w-full">
                            <h1 className="text-center">JLPT</h1>
                        </li>
                        <li className="w-full ">
                            <div className="flex items-center pl-3">
                                <input type="checkbox" value="" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded cursor-pointer" checked={checkBasic} onChange={() => onChangeLevelSentence("Basic")} />
                                <label className="w-full py-3 ml-2 text-sm font-medium">Basic</label>
                            </div>
                        </li>
                        <li className="w-full ">
                            <div className="flex items-center pl-3">
                                <input type="checkbox" value="" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded cursor-pointer" checked={checkIntermediate} onChange={() => onChangeLevelSentence("Intermediate")} />
                                <label className="w-full py-3 ml-2 text-sm font-medium">Intermediate</label>
                            </div>
                        </li>
                        <li className="w-full ">
                            <div className="flex items-center pl-3">
                                <input type="checkbox" value="" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded cursor-pointer" checked={checkAdvanced} onChange={() => onChangeLevelSentence("Advanced")} />
                                <label className="w-full py-3 ml-2 text-sm font-medium">Advanced</label>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </div >
    );
};

export default SentenceTrainer;