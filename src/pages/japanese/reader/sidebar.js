import React, { useState, useEffect, useRef, useContext } from "react";

import { BsSearch, BsBook, BsThreeDotsVertical } from "react-icons/bs";
import { MdContentCopy } from "react-icons/md";

import { ReaderContext } from "./readercontext";


const WordItem = ({ word, pkey, isMenuOpen }) => {
    const { savedWords, setSavedWords } = useContext(ReaderContext);
    const [isUnrolled, setIsUnrolled] = useState(false);

    const toggleUnrolled = (event) => {
        // Check if the click was on the copy button or one of its children
        if (event.target.id === "copy" || event.target.parentElement.id === "copy") {
            return;
        }
        setIsUnrolled(!isUnrolled);
    }

    const copyToClipboard = (event, text) => {
        navigator.clipboard.writeText(text);
    }

    return (
        <><li index={pkey} className={`flex ${!isMenuOpen && "hidden"} ${!isUnrolled ? "flex-row items-center gap-x-4" : "flex-col w-full"} cursor-pointer hover:bg-slate-800 duration-200 rounded-sm ${isMenuOpen ? "px-4" : "px-2.5"} py-2`} onClick={toggleUnrolled}>
            <div className="flex items-center flex-row justify-between">
                <div className={`text-white font-thin duration-100 text-lg`}>
                    <ruby>
                        {word.kanji}
                        <rt className={`rt ${!isMenuOpen && "hidden"}`}>{word.kana[0][0]}</rt>
                    </ruby>
                </div>
                {/* Add a copy icon */}
                {isUnrolled && (
                    <div className="flex flex-row items-center gap-x-2">
                        <div className={`focus:outline-none text-white font-thin text-sm duration-100 ${!isMenuOpen && "hidden"}`}>
                            <button id="copy" className="focus:outline-none hover:text-green-500 duration-100 active:text-green-800 focus:border-none"
                                onClick={(event) => copyToClipboard(event, word.kanji)}>
                                <MdContentCopy />
                            </button>
                        </div>
                        <div className={`focus:outline-none text-white font-thin text-sm duration-100 ${!isMenuOpen && "hidden"}`}>
                            <button id="copy" className="focus:outline-none hover:text-green-500 duration-100 active:text-green-800 focus:border-none">
                                <BsThreeDotsVertical />
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <div className={`truncate overflow-hidden text-white font-thin text-[12px] duration-100 flex-1 ${!isMenuOpen && "hidden"}`}>
                <ul className="list-decimal list-inside marker:text-green-500">
                    {(isUnrolled ? word.sense.eng : word.sense.eng.slice(0, 1)).map((sense, index) => (
                        <li index={index} className="truncate overflow-hidden">{sense[0].split(' @ ').join(', ')}</li>
                    ))}
                    {word.sense.eng.length > 1 && !isUnrolled && <li index="ellipsis" className="truncate overflow-hidden">...</li>}
                </ul>
            </div>
        </li>
            <div className={`border-t-[0.1px] border-green-800 my-1 ${isMenuOpen ? "px-4" : "hidden"} py-2 w-1/2 mx-auto`}></div>
        </>
    );
}

const filterWords = (searchInput, words) => {
    return words.filter(word => {
        const lowerSearchInput = searchInput.toLowerCase();

        // Check if the search input matches kanji, kana, or English meanings
        return (
            word.kanji.toLowerCase().includes(lowerSearchInput) ||
            word.kana.some(([kana]) => kana.toLowerCase().includes(lowerSearchInput)) ||
            Object.values(word.sense).flat(2).filter((_, index) => index % 2 === 0).some((meaning) => meaning.toLowerCase().includes(lowerSearchInput))
        );
    });
};

const ReaderSidebar = ({ isMenuOpen }) => {
    const { savedWords, setSavedWords } = useContext(ReaderContext);
    const [searchInput, setSearchInput] = useState('');
    const filteredWords = filterWords(searchInput, savedWords);

    return (
        <div className="relative z-2">
            <div className="inset-y-0 flex h-screen"> {/* Sidebar fixed*/}
                <div className={`bg-slate-900 ${isMenuOpen ? "w-72" : "w-20 hidden lg:block"} pt-16 p-5`}>
                    <div className=" duration-300">
                    <div className={`flex items-center rounded-md bg-gray-700 mt-6 ${isMenuOpen ? "px-4" : "px-2.5"} py-2`}>
                        <BsSearch className={`text-white text-lg block float-left cursor-pointer ${isMenuOpen && "mr-2"}`} />
                        <input
                            type='search' placeholder='Search'
                            className={`search-cancel:appearance-none bg-transparent text-white text-base focus:outline-none ${!isMenuOpen && "hidden"} after:text-yellow-300`}
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                    </div>

                    {/* Separator */}
                    <div className={`border-t border-gray-600 mt-6 ${isMenuOpen ? "px-4" : "px-2.5"} py-2`}></div>

                    <ul className="overflow-y-auto h-[calc(100vh-12rem)]">
                        {filteredWords.map((word, index) => (
                            <WordItem word={word} pkey={index} isMenuOpen={isMenuOpen} />
                        ))}
                    </ul></div>
                </div>
            </div>
        </div>
    );
}

export default ReaderSidebar;