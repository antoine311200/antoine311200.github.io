import React, { useState, useEffect, useRef } from "react";

import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

import "../style/secret.css";

// Import jlpt5.json from public/data
import jlpt5 from "../data/jlpt5.json";
import jlpt4 from "../data/jlpt4.json";
import jlpt3 from "../data/jlpt3.json";
import jlpt2 from "../data/jlpt2.json";

// Concatenate all the json files into one array
let jlpt = [];//.concat(jlpt5, jlpt4, jlpt3, jlpt2);
let history = [];
let index = 0;

function JapaneseApp() {
    const [checkN5, setCheckN5] = useState(true);
    const [checkN4, setCheckN4] = useState(true);
    const [checkN3, setCheckN3] = useState(true);
    const [checkN2, setCheckN2] = useState(true);


    const onChangeLevel = (level) => {
        if (level === "N5" && !(!checkN4 && !checkN3 && !checkN2)) setCheckN5(!checkN5);
        else if (level === "N4" && !(!checkN5 && !checkN3 && !checkN2)) setCheckN4(!checkN4);
        else if (level === "N3" && !(!checkN5 && !checkN4 && !checkN2)) setCheckN3(!checkN3);
        else if (level === "N2" && !(!checkN5 && !checkN4 && !checkN3)) setCheckN2(!checkN2);

        jlpt = [];
        if (checkN5) jlpt = jlpt.concat(jlpt5);
        if (checkN4) jlpt = jlpt.concat(jlpt4);
        if (checkN3) jlpt = jlpt.concat(jlpt3);
        if (checkN2) jlpt = jlpt.concat(jlpt2);
    };

    onChangeLevel("N6");

    const [word, setWord] = useState('');
    const [furigana, setFurigana] = useState('');
    const [meaning, setMeaning] = useState('');
    const [isToggled, setIsToggled] = useState(false);

    const [isJP2EN, setIsJP2EN] = useState(true);

    const toggleMode = () => {
        setIsJP2EN(!isJP2EN);
    };

    const setData = (index) => {
        const vocab = history[index];
        setWord(vocab.kanji);
        setFurigana(vocab.kana);
        setMeaning(vocab.english);
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
        setIsToggled(false);

        const random = Math.floor(Math.random() * jlpt.length);
        const vocab = jlpt[random];

        history.push(vocab);
        index = history.length - 1;

        setData(index);
    };

    const handleScreenClick = (e) => {
        // Not match button inout or element with class toggle-button nor contains toggle-button
        if (!e.target.matches('button') && !e.target.matches('input') && !e.target.matches('.toggle-button') && !e.target.closest('.toggle-button')) {
            setIsToggled((prevToggled) => !prevToggled);
        }
    };

    useEffect(() => {
        // Add on start reload
        randomVocab();
        document.addEventListener('load', () => randomVocab());
        document.addEventListener('click', handleScreenClick);
        document.addEventListener('touchstart', handleScreenClick);
        return () => {
            document.removeEventListener('click', handleScreenClick);
            document.removeEventListener('touchstart', handleScreenClick);
        };
    }, []);

    const renderJapanese2English = () => {
        return (
            <div className="flex flex-col items-center gap-10">
                <h1 className="fixed text-6xl lg:text-9xl text-white text-center">{word}</h1>
                {word != furigana && isToggled && <h1 className="fixed text-3xl text-white text-center top-40">{furigana}</h1>}
                {isToggled && <h1 className="fixed text-xl lg:text-3xl text-white text-center bottom-1/3 px-8">{meaning.replace(/,/g, ', ')}</h1>}
            </div >
        )
    }

    const renderEnglish2Japanese = () => {
        return (
            <div className="flex flex-col items-center gap-10">
                <h1 className="fixed text-4xl lg:text-7xl text-white text-center">{meaning.replace(/,/g, ', ')}</h1>
                <div className="fixed bottom-1/3">
                    {word != furigana && isToggled && <h1 className=" text-xl lg:text-3xl text-white text-center px-8">{furigana}</h1>}
                    {isToggled && <h1 className=" text-4xl lg:text-7xl text-white text-center">{word}</h1>}
                </div>
            </div>
        )
    }

    return (
        <div className="bg-slate-800 h-screen w-screen">

            {/* Pagination */}
            <button onClick={previousVocab} className={`${history.length > 0 && index > 0 ? 'h-full' : 'hidden'} fixed top-1/3 left-0 text-gray-600 hover:text-gray-800 flex justify-center`}>
                <img src="light_chevron_left.svg" />
            </button>
            <button onClick={nextVocab} className={`${index < history.length - 1 ? 'h-full' : 'hidden'} fixed top-1/3 right-0 text-gray-600 hover:text-gray-800 flex justify-center`}>
                <img src="light_chevron_right.svg" />
            </button>

            {/* Title */}
            <div className="w-full z-10">
                <h1 className="text-3xl lg:text-5xl p-8 mb-24 text-white text-center">Japanese App</h1>
            </div>

            {/* Content */}
            {isJP2EN ? renderJapanese2English() : renderEnglish2Japanese()}

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
                                <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition"><span className={!isJP2EN ? 'ml-1' : 'ml-1.5'}>{!isJP2EN ? 'あ' : 'A'}</span></div>
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
                                <input type="checkbox" value="" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded cursor-pointer" checked={checkN5} onChange={() => onChangeLevel("N5")} />
                                <label className="w-full py-3 ml-2 text-sm font-medium">N5</label>
                            </div>
                        </li>
                        <li className="w-full ">
                            <div className="flex items-center pl-3">
                                <input type="checkbox" value="" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded cursor-pointer" checked={checkN4} onChange={() => onChangeLevel("N4")} />
                                <label className="w-full py-3 ml-2 text-sm font-medium">N4</label>
                            </div>
                        </li>
                        <li className="w-full ">
                            <div className="flex items-center pl-3">
                                <input type="checkbox" value="" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded cursor-pointer" checked={checkN3} onChange={() => onChangeLevel("N3")} />
                                <label className="w-full py-3 ml-2 text-sm font-medium">N3</label>
                            </div>
                        </li>
                        <li className="w-full ">
                            <div className="flex items-center pl-3">
                                <input type="checkbox" value="" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded cursor-pointer" checked={checkN2} onChange={() => onChangeLevel("N2")} />
                                <label className="w-full py-3 ml-2 text-sm font-medium">N2</label>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </div >
    )
};

export default JapaneseApp;