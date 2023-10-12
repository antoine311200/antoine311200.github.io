import React, { useState, useEffect, useRef } from "react";
import { isMobile } from 'react-device-detect';

import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const dummy_card = {
    front: {},
    back: {}
}

const SectionTrainer = () => {
    // Create an object state like dummy_card
    const [deck, setDeck] = useState([]);
    const [card, setCard] = useState(dummy_card);
    const [options, setOptions] = useState([]);
    const [isFront, setIsFront] = useState(true);

    let history = [];
    let index = 0;

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


            {/* Menu */}
            <div className="flex flex-col items-center">
                <div className="absolute bottom-10 flex flex-col items-center gap-3">
                    <button className="justify-center bg-slate-50 hover:bg-slate-200 focus:ring-2 focus:outline-none focus:ring-slate-100 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center" onClick={randomCard}>
                        Next <FaChevronRight className="ml-4 mt-1" />
                    </button>

                    <div className="flex items-center justify-center w-full mb-12 toggle-button">
                        <label for="toggle-jpen" className="flex items-center cursor-pointer">
                            <div className="relative">
                                <input type="checkbox" id="toggle-jpen" className="sr-only" onClick={flipCard} />
                                <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
                                <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition"><span className={!isFront ? 'ml-1' : 'ml-1.5'}>{!isFront ? 'あ' : 'A'}</span></div>
                            </div>
                        </label>
                    </div>
                </div>
                <div className="absolute bottom-5">
                    <ul className="flex flex-row items-center w-full text-sm font-medium text-white">
                        <li className="w-full">
                            <h1 className="text-center">JLPT</h1>
                        </li>
                        {options.map((option, index) => {
                            return (
                                <li className="w-full ">
                                    <div className="flex items-center pl-3">
                                        <input type="checkbox" value="" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded cursor-pointer" checked={option.checked} onChange={() => onChangeOption(option)} />
                                        <label className="w-full py-3 ml-2 text-sm font-medium">{option.label}</label>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            </div>
        </div>

    )
}