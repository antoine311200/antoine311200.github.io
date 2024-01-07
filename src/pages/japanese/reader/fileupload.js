// src/FileUpload.js

import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';

import { ReaderContext } from './readercontext';

import { FaStar } from "react-icons/fa6";

function deepEqual(x, y) {
    const ok = Object.keys, tx = typeof x, ty = typeof y;
    return x && y && tx === 'object' && tx === ty ? (
        ok(x).length === ok(y).length &&
        ok(x).every(key => deepEqual(x[key], y[key]))
    ) : (x === y);
}

const FileUpload = ({ settings }) => {
    const { fileContent, setFileContent, savedWords, setSavedWords, scrollPosition, setScrollPosition } = useContext(ReaderContext);

    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    const [popoverVisible, setPopoverVisible] = useState(false);
    const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
    const [popoverContent, setPopoverContent] = useState({
        word: '',
        kana: '',
        level: '',
        meaning: '',
        link: '',
    });


    const popoverRef = useRef(null);

    const searchWord = async (word, x, y) => {
        try {
            const response = await axios.post('https://antoine-server-a0cfee8f2403.herokuapp.com/search', { word });
            const data = response.data;

            console.log(data);

            // Check if error in data
            if (data.error) {
                return null;
            }

            if (Array.isArray(data)) setPopoverContent(data[0]);
            else setPopoverContent(data);

            setPopoverPosition({ y: y, x: x });
            setPopoverVisible(true);

        } catch (error) {
            return null;
        }
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        document.addEventListener('mousemove', handleMouseMove);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    const addFavorite = (event) => {
        event.preventDefault();
        event.stopPropagation();

        // Check that the word is not already in the list
        if (savedWords.includes(popoverContent)) {
            return null;
        }

        setSavedWords([...savedWords, popoverContent]);
        localStorage.setItem('savedWords', JSON.stringify([...savedWords, popoverContent]));

        console.log(popoverContent);
    };


    useEffect(() => {
        const handleSelection = (event) => {
            // Check that the popover is not a parent of the event target
            if (popoverRef.current && popoverRef.current.contains(event.target)) {
                return null;
            }

            let x, y;

            if (event.type === 'mouseup') {
                x = event.clientX;
                y = event.clientY;
            }
            else if (event.type === 'touchend') {
                x = event.changedTouches[0].clientX;
                y = event.changedTouches[0].clientY;
            }

            const selection = window.getSelection();
            const selectedText = selection.toString();


            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();

                x = rect.left;
                y = rect.bottom;
            }

            // Check if selectedText not empty
            if (selectedText.trim().length > 0) {
                console.log('Selected Text:', selectedText);

                searchWord(selectedText, x, y);
            }
        };

        document.addEventListener('mouseup', handleSelection);
        document.addEventListener('touchend', handleSelection);
        return () => {
            document.removeEventListener('mouseup', handleSelection);
            document.removeEventListener('touchend', handleSelection);
        };
    }, []);

    const closePopover = (event) => {
        // Check if the click was on the popover or one of its children
        if (popoverRef.current && event.target !== popoverRef.current && !popoverRef.current.contains(event.target)) {
            setPopoverVisible(false);
            setPopoverContent(null);
        }
    };

    useEffect(() => {
        const storedContent = localStorage.getItem('fileContent');
        const storedScrollPosition = localStorage.getItem('scrollPosition');
        const storedWords = localStorage.getItem('savedWords');

        if (storedContent) {
            setFileContent(storedContent);
        }
        else {
            // Set file content to the default html file in public/files/恐怖 谷崎潤一郎
            // const file = '/files/恐怖 谷崎潤一郎.html';
            const file = '/files/人間失格 太宰治.html';

            fetch(file)
                .then((response) => response.text())
                .then((htmlContent) => {
                    // Set the file content and save to localStorage
                    setFileContent(htmlContent);
                    localStorage.setItem('fileContent', htmlContent);
                })
                .catch((error) => console.error('Error fetching file content:', error));
        }

        if (storedWords) {
            setSavedWords(JSON.parse(storedWords));
        }

        if (storedScrollPosition) {
            setScrollPosition(Number(storedScrollPosition));
            window.scrollTo(0, Number(storedScrollPosition));
        }
    }, [scrollPosition]);

    useEffect(() => {
        const handleScroll = () => {
            localStorage.setItem('scrollPosition', window.scrollY);
        };
        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const isSmartphone = window.innerWidth <= 768;


    return (
        <div className="flex flex-col items-center mt-[22%] md:mt-[7%] h-screen">
            <div className="select-auto selection:rounded-xl selection:border selection:bg-purple-300 selection:text-purple-900 text-left font-normal tracking-wide rounded-xl pl-4 pr-2 md:p-4 md:border-slate-500 md:border-[1px]">
                <div className={`overflow-y-auto h-[calc(100vh-7rem)] p-1 md:p-8 ${settings.fontSize}`}
                    style={{
                        color: settings.fontColor,
                        backgroundColor: settings.bgColor,
                        // fontFamily: selectedFont,
                    }}
                >
                    {fileContent && (
                        <div className='' dangerouslySetInnerHTML={{ __html: fileContent }} />
                    )}
                </div>
            </div>


            {popoverVisible && popoverContent.kana.length > 0 && (
                <div
                    className='fixed top-0 left-0 w-full md:w-full h-full text-black'
                    onClick={closePopover}
                >
                    <div
                        style={{
                            top: isSmartphone ? popoverPosition.y : (window.innerHeight - popoverPosition.y < (58 + popoverContent.sense["eng"].length * 20 + 32) ? popoverPosition.y - (58 + popoverContent.sense["eng"].length * 20 + 32) - 50 : popoverPosition.y) + 5,
                            left: isSmartphone ? popoverPosition.x : (window.innerWidth - popoverPosition.x < (48 + 5.5 * (Math.max(popoverContent.sense["eng"].map((gloss, _) => gloss[0].split(' @ ').join(', ')).map((meaning, _) => meaning.trim().length)))) ? popoverPosition.x - ((48 + 5.5 * (Math.max(popoverContent.sense["eng"].map((gloss, _) => gloss[0].split(' @ ').join(', ')).map((meaning, _) => meaning.trim().length))))) - 20 : popoverPosition.x) + 5,
                        }}
                        className="popover absolute bg-gray-700 text-gray-300 shadow-lg rounded-lg py-3 px-6 z-50 flex flex-col gap-1 text-left w-auto"
                        ref={popoverRef}
                    >
                        <div className="flex flex-col justify-between items-left">
                            <div className="flex flex-row justify-between items-center gap-x-5">
                                <h3 className='text-[14px] md:text-xl font-medium'>{
                                    popoverContent.kanji !== null ? popoverContent.kanji : popoverContent.kana[0]
                                }</h3>
                                <span className="inline-flex items-center justify-center p-1 text-[14px] md:text-sm font-medium leading-none text-white rounded-full">
                                    <button className={`
                                        focus:outline-none hover:text-green-500 duration-100 active:text-green-800 focus:border-none
                                        ${savedWords.some((w) => deepEqual(w, popoverContent)) ? 'text-yellow-400' : 'text-gray-500'}`}
                                        onClick={addFavorite}
                                    >
                                        <FaStar />
                                    </button>
                                </span>
                            </div>
                            <p className='text-[8px] md:text-[12px] pb-2'>{
                                (popoverContent.kanji !== null > 0 ? popoverContent.kana : popoverContent.kana.slice(1)).map((kana, index) => (
                                    <span key={index} className={index !== 0 ? 'pl-2' : ''}>{kana}</span>
                                ))
                            }</p>
                        </div>
                        <ul className='text-[9px] md:text-sm pb-4'>
                            {
                                popoverContent.sense["eng"].map((gloss, index) => (
                                    <li key={index} className='list-decimal list-inside marker:text-green-500'>
                                        {gloss[0].split(' @ ').join(', ')}
                                    </li>
                                ))
                            }
                        </ul>
                    </div>
                </div>
            )
            }
        </div >
    );
};

export default FileUpload;
