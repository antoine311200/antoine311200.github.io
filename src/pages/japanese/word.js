import React, { useState, useEffect, useRef } from "react";
import { isMobile } from 'react-device-detect';

import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

// Import jlpt5.json from public/data
import jlpt5 from "../../data/jlpt5.json";
import jlpt4 from "../../data/jlpt4.json";
import jlpt3 from "../../data/jlpt3.json";
import jlpt2 from "../../data/jlpt2.json";
import jlpt1 from "../../data/jlpt1.json";

// Concatenate all the json files into one array
let jlpt = [];//.concat(jlpt5, jlpt4, jlpt3, jlpt2);
let history = [];
let index = 0;

const WordTrainer = () => {
    const [checkN5, setCheckN5] = useState(true);
    const [checkN4, setCheckN4] = useState(true);
    const [checkN3, setCheckN3] = useState(true);
    const [checkN2, setCheckN2] = useState(true);
    const [checkN1, setCheckN1] = useState(true);

    const onChangeLevelWord = (level) => {
        if (level === "N5" && !(!checkN4 && !checkN3 && !checkN2 && !checkN1)) setCheckN5(!checkN5);
        else if (level === "N4" && !(!checkN5 && !checkN3 && !checkN2 && !checkN1)) setCheckN4(!checkN4);
        else if (level === "N3" && !(!checkN5 && !checkN4 && !checkN2 && !checkN1)) setCheckN3(!checkN3);
        else if (level === "N2" && !(!checkN5 && !checkN4 && !checkN3 && !checkN1)) setCheckN2(!checkN2);
        else if (level === "N1" && !(!checkN5 && !checkN4 && !checkN3 && !checkN2)) setCheckN1(!checkN1);
    };

    useEffect(() => {
        jlpt = [];
        if (checkN5) jlpt = jlpt.concat(jlpt5);
        if (checkN4) jlpt = jlpt.concat(jlpt4);
        if (checkN3) jlpt = jlpt.concat(jlpt3);
        if (checkN2) jlpt = jlpt.concat(jlpt2);
        if (checkN1) jlpt = jlpt.concat(jlpt1);
    }, [checkN5, checkN4, checkN3, checkN2, checkN1]);

    onChangeLevelWord("N6");


    const [word, setWord] = useState('');
    const [furiganaWord, setFuriganaWord] = useState('');
    const [meaningWord, setMeaningWord] = useState('');
    const [levelWord, setLevelWord] = useState('');
    const [isToggledWord, setIsToggledWord] = useState(false);

    const [isJP2ENWord, setIsJP2ENWord] = useState(true);


    const toggleMode = () => {
        setIsJP2ENWord(!isJP2ENWord);
    };

    const setData = (index) => {
        const vocab = history[index];
        setWord(vocab.kanji);
        setFuriganaWord(vocab.kana);
        setMeaningWord(vocab.english);
        setLevelWord(vocab.jlpt);
    };

    const previousVocab = () => {
        if (index === 0) return;
        setData(index - 1);
        index--;
    };

    const nextVocab = () => {
        if (index === history.length - 1) return;
        setData(index + 1);
        index++;
    };

    const randomVocab = () => {
        setIsToggledWord(false);

        const random = Math.floor(Math.random() * jlpt.length);
        const vocab = jlpt[random];

        history.push(vocab);
        index = history.length - 1;

        setData(index);
    };

    const handleScreenClick = (e) => {
        // Not match button inout or element with class toggle-button nor contains toggle-button
        if (!e.target.matches('button') && !e.target.matches('img') && !e.target.matches('input') && !e.target.matches('.toggle-button') && !e.target.closest('.toggle-button')) {
            setIsToggledWord((prevToggled) => !prevToggled);
        }
    };

    useEffect(() => {
        // Add on start reload
        randomVocab();
        document.title = `Japanese App | Antoine Debouchage`;
        // document.addEventListener('load', () => randomVocab());
        if (!isMobile) document.addEventListener('click', handleScreenClick);
        else document.addEventListener('touchstart', handleScreenClick);
        return () => {
            if (!isMobile) document.removeEventListener('click', handleScreenClick);
            else document.removeEventListener('touchstart', handleScreenClick);
        };
    }, []);


    const renderJapanese2EnglishWord = () => {
        return (
            <div className="flex flex-col items-center gap-10">
                <h1 className="fixed text-6xl lg:text-9xl text-white text-center">{word}</h1>
                {word != furiganaWord && isToggledWord && <h1 className="fixed text-3xl text-white text-center top-40">{furiganaWord}</h1>}
                {isToggledWord && <h1 className="fixed text-xl lg:text-3xl text-white text-center bottom-1/3 px-8">{meaningWord.replace(/,/g, ', ')}</h1>}
                <div className="absolute top-[18%]">
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">JLPT N{levelWord}</span>
                </div>
            </div >
        )
    };

    const renderEnglish2JapaneseWord = () => {
        return (
            <div className="flex flex-col items-center gap-10">
                <h1 className="fixed text-4xl lg:text-7xl text-white text-center">{meaningWord.replace(/,/g, ', ')}</h1>
                <div className="fixed bottom-1/3">
                    {word != furiganaWord && isToggledWord && <h1 className=" text-xl lg:text-3xl text-white text-center px-8">{furiganaWord}</h1>}
                    {isToggledWord && <h1 className=" text-4xl lg:text-7xl text-white text-center">{word}</h1>}
                    <div className="absolute top-[18%]">
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">JLPT N{levelWord}</span>
                    </div>
                </div>
            </div>
        )
    };

    return (
        <div>

            {/* Pagination */}
            <button onClick={previousVocab} className={`${history.length > 0 && index > 0 ? 'h-full' : 'hidden'} fixed top-1/3 left-0 text-gray-600 hover:text-gray-800 flex justify-center`}>
                <img src="light_chevron_left.svg" />
            </button>
            <button onClick={nextVocab} className={`${index < history.length - 1 ? 'h-full' : 'hidden'} fixed top-1/3 right-0 text-gray-600 hover:text-gray-800 flex justify-center`}>
                <img src="light_chevron_right.svg" />
            </button>

            {/* Content */}
            {isJP2ENWord ? renderJapanese2EnglishWord() : renderEnglish2JapaneseWord()}

            {/* Menu */}
            <div className="flex flex-col items-center">
                <div className="absolute bottom-10 flex flex-col items-center gap-3">
                    <button className="justify-center bg-slate-50 hover:bg-slate-200 focus:ring-2 focus:outline-none focus:ring-slate-100 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center" onClick={randomVocab}>
                        Next <FaChevronRight className="ml-4 mt-1" />
                    </button>

                    <div className="flex items-center justify-center w-full mb-12 toggle-button">
                        <label for="toggle-jpen" className="flex items-center cursor-pointer">
                            <div className="relative">
                                <input type="checkbox" id="toggle-jpen" className="sr-only" onClick={toggleMode} />
                                <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
                                <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition"><span className={!isJP2ENWord ? 'ml-1' : 'ml-1.5'}>{!isJP2ENWord ? 'あ' : 'A'}</span></div>
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
                                <input type="checkbox" value="" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded cursor-pointer" checked={checkN5} onChange={() => onChangeLevelWord("N5")} />
                                <label className="w-full py-3 ml-2 text-sm font-medium">N5</label>
                            </div>
                        </li>
                        <li className="w-full ">
                            <div className="flex items-center pl-3">
                                <input type="checkbox" value="" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded cursor-pointer" checked={checkN4} onChange={() => onChangeLevelWord("N4")} />
                                <label className="w-full py-3 ml-2 text-sm font-medium">N4</label>
                            </div>
                        </li>
                        <li className="w-full ">
                            <div className="flex items-center pl-3">
                                <input type="checkbox" value="" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded cursor-pointer" checked={checkN3} onChange={() => onChangeLevelWord("N3")} />
                                <label className="w-full py-3 ml-2 text-sm font-medium">N3</label>
                            </div>
                        </li>
                        <li className="w-full ">
                            <div className="flex items-center pl-3">
                                <input type="checkbox" value="" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded cursor-pointer" checked={checkN2} onChange={() => onChangeLevelWord("N2")} />
                                <label className="w-full py-3 ml-2 text-sm font-medium">N2</label>
                            </div>
                        </li>
                        <li className="w-full ">
                            <div className="flex items-center pl-3">
                                <input type="checkbox" value="" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded cursor-pointer" checked={checkN1} onChange={() => onChangeLevelWord("N1")} />
                                <label className="w-full py-3 ml-2 text-sm font-medium">N1</label>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </div >
    )
};

export default WordTrainer;