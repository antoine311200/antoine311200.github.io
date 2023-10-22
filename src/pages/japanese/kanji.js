import React, { useState, useEffect, useRef } from "react";
import { isMobile } from 'react-device-detect';

import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

import all_kanjis from "../../data/kanji_updated_2.json";

let history = [];
let index = 0;

const test_kanji = {
    "strokes": 10,
    "grade": 4,
    "freq": 449,
    "jlpt_new": 3,
    "meanings": [
        "Distinction",
        "Difference",
        "Variation",
        "Discrepancy",
        "Margin",
        "Balance"
    ],
    "readings_on": [
        "サ"
    ],
    "readings_kun": [
        "さ.す",
        "さ.し"
    ],
    "kanji": "差",
    "words": [
        {
            "kanji": "交差点",
            "kana": "こうさてん",
            "english": "intersection",
            "jlpt": 5
        },
        {
            "kanji": "差す",
            "kana": "さす",
            "english": "to stretch out hands,to raise an umbrella",
            "jlpt": 5
        },
        {
            "kanji": "差し上げる",
            "kana": "さしあげる",
            "english": "(polite) to give",
            "jlpt": 4
        },
        {
            "kanji": "差",
            "kana": "さ",
            "english": "difference,variation",
            "jlpt": 3
        },
        {
            "kanji": "差別",
            "kana": "さべつ",
            "english": "discrimination,distinction,differentiation",
            "jlpt": 3
        },
        {
            "kanji": "交差",
            "kana": "こうさ",
            "english": "cross",
            "jlpt": 2
        },
        {
            "kanji": "差し支え",
            "kana": "さしつかえ",
            "english": "hindrance,impediment",
            "jlpt": 2
        },
        {
            "kanji": "差し引き",
            "kana": "さしひき",
            "english": "deduction,subtraction,balance,ebb and flow,rise and fall",
            "jlpt": 2
        },
        {
            "kanji": "人差指",
            "kana": "ひとさしゆび",
            "english": "index finger",
            "jlpt": 2
        },
        {
            "kanji": "物差し",
            "kana": "ものさし",
            "english": "ruler,measure",
            "jlpt": 2
        },
        {
            "kanji": "格差",
            "kana": "かくさ",
            "english": "qualitative difference, disparity",
            "jlpt": 1
        },
        {
            "kanji": "誤差",
            "kana": "ごさ",
            "english": "error",
            "jlpt": 1
        },
        {
            "kanji": "差異",
            "kana": "さい",
            "english": "difference, disparity",
            "jlpt": 1
        },
        {
            "kanji": "差額",
            "kana": "さがく",
            "english": "balance, difference, margin",
            "jlpt": 1
        },
        {
            "kanji": "差し掛かる",
            "kana": "さしかかる",
            "english": "to come near to, to approach",
            "jlpt": 1
        },
        {
            "kanji": "差し出す",
            "kana": "さしだす",
            "english": "to present, to submit, to tender, to hold out",
            "jlpt": 1
        },
        {
            "kanji": "差し支える",
            "kana": "さしつかえる",
            "english": "to interfere, to hinder, to become impeded",
            "jlpt": 1
        },
        {
            "kanji": "差し引く",
            "kana": "さしひく",
            "english": "to deduct",
            "jlpt": 1
        },
        {
            "kanji": "時差",
            "kana": "じさ",
            "english": "time difference",
            "jlpt": 1
        },
        {
            "kanji": "指差す",
            "kana": "ゆびさす",
            "english": "to point at",
            "jlpt": 1
        }
    ]
};

history.push(test_kanji);

const KanjiTrainer = () => {
    const [kanjis, setKanjis] = useState(all_kanjis);
    const [kanji, setKanji] = useState(test_kanji);
    const [isToggle, setIsToggle] = useState(false);

    const previousKanji = () => {
        if (index === 0) return;
        setKanji(history[index - 1]);
        index--;
    };

    const nextKanji = () => {
        if (index === history.length - 1) return;
        setKanji(history[index + 1]);
        index++;
    };

    const randomKanji = () => {
        const random = Math.floor(Math.random() * kanjis.length);
        const kanji = kanjis[random];

        history.push(kanji);
        index = history.length - 1;

        setKanji(kanji);
    };

    const handleScreenClick = (e) => {
        if (!e.target.matches('button') && !e.target.matches('img') && !e.target.matches('input') && !e.target.matches('.toggle-button') && !e.target.closest('.toggle-button')) {
            setIsToggle((prevToggled) => !prevToggled);
        }
    };


    useEffect(() => {
        document.title = `Japanese App | Antoine Debouchage`;

        if (!isMobile) document.addEventListener('click', handleScreenClick);
        else document.addEventListener('touchstart', handleScreenClick);
        return () => {
            if (!isMobile) document.removeEventListener('click', handleScreenClick);
            else document.removeEventListener('touchstart', handleScreenClick);
        };
    }, []);

    const renderFront = () => {
        return (
            <div className="flex flex-col items-center gap-10">
                <h1 className="fixed top-[15%] lg:top-[20%] px-10 mt-5 text-7xl lg:text-8xl text-white text-center">{kanji.kanji}</h1>
                <div className="absolute lg:top-[15%] top-[12%]">
                    <span className="inline-flex items-center justify-center px-2 py-1 mx-1 text-xs font-bold leading-none text-white bg-teal-600 rounded-full">Strokes {kanji.strokes}</span>
                    {kanji.grade && <span className="inline-flex items-center justify-center px-2 py-1 mx-1 text-xs font-bold leading-none text-white bg-indigo-500 rounded-full">Grade {kanji.grade}</span>}
                    {kanji.jlpt_new && <span className="inline-flex items-center justify-center px-2 py-1 mx-1 text-xs font-bold leading-none text-white bg-orange-500 rounded-full">JLPT N{kanji.jlpt_new}</span>}
                </div>
                {/* List for on and kun yomi */}
                {isToggle && <div className="absolute flex flex-col top-[30%] lg:top-[40%] gap-2">
                    <span className="text-white lg:text-xl flex flex-row items-start">
                        <span className="inline-flex items-center justify-center px-2 py-1.5 mr-4 text-sm leading-none text-white bg-teal-600 rounded-lg">音読み</span>
                        {kanji.readings_on.join("、")}
                    </span>
                    <span className="text-white lg:text-xl flex flex-row items-start">
                        <span className="inline-flex items-center justify-center px-2 py-1.5 mr-4 text-sm leading-none text-white bg-yellow-600 rounded-lg">訓読み</span>
                        {isToggle && kanji.readings_kun.join("、")}
                    </span>
                </div>}
                {/* List for meanings */}
                {isToggle && <div className="absolute flex flex-col top-[42%] lg:top-[53%]">
                    <span className="text-white text-sm lg:text-xl px-5"><span className="underline">Meanings</span> :   {kanji.meanings.join(" / ").toLowerCase()}</span>
                </div>}
                {/* Separator line */}
                <div className="absolute top-[52%] lg:top-[61%] w-1/5 h-0.5 bg-white"></div>
                {/* <h4 className="absolute top-[72%] text-white text-xl">Examples</h4> */}
                {/* List for examples */}
                <div className="absolute px-5 grid grid-cols-1 grid-flow-row lg:grid-rows-4 lg:grid-flow-col lg:gap-x-10 lg:gap-y-1 top-[54%] lg:top-[66%]">
                    {kanji.words.slice(0, 8).map((word, index) => {
                        return (
                            <span key={index} className="text-white text-xs lg:text-base flex items-center">
                                <div className={`text-sm rounded-full w-6 h-6 flex items-center justify-center border border-teal-700 mr-2 text-white`}>
                                    {index + 1}
                                </div>
                                {word.kanji} {isToggle && `: ${word.english.split(",").join(", ")}`}
                            </span>
                        )
                    })}
                </div>
            </div >
        )
    };

    const renderBack = () => {
        return (<div className="flex flex-col items-center gap-10">
            <h1 className="fixed px-10 text-2xl lg:text-4xl text-white text-center">{kanji.kanji}</h1>

        </div >)
    };

    return (
        <div>

            {renderFront()}

            {/* Pagination */}
            <button onClick={previousKanji} className={`${history.length > 0 && index > 0 ? 'h-full' : 'hidden'} fixed top-1/3 left-0 text-gray-600 hover:text-gray-800 flex justify-center`}>
                <img src="light_chevron_left.svg" />
            </button>
            <button onClick={nextKanji} className={`${index < history.length - 1 ? 'h-full' : 'hidden'} fixed top-1/3 right-0 text-gray-600 hover:text-gray-800 flex justify-center`}>
                <img src="light_chevron_right.svg" />
            </button>

            {/* Content */}

            {/* Menu */}
            <div className="flex flex-col items-center">
                <div className="absolute bottom-10 flex flex-col items-center gap-3">
                    <button className="justify-center bg-slate-50 hover:bg-slate-200 focus:ring-2 focus:outline-none focus:ring-slate-100 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center" onClick={randomKanji}>
                        Next <FaChevronRight className="ml-4 mt-1" />
                    </button>
                </div>
            </div>
            {/* <div className="flex flex-col items-center">
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
            </div> */}
        </div >
    );
};

export default KanjiTrainer;