// src/FileUpload.js

import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';

import { ReaderContext } from './readercontext';

import { FaStar } from "react-icons/fa6";


const pos = {
    "adj-i": "adjective (keiyoushi)",
    "adj-na": "adjectival nouns or quasi-adjectives (keiyodoshi)",
    "adj-no": "nouns which may take the genitive case particle `no'",
    "adj-pn": "pre-noun adjectival (rentaishi)",
    "adj-t": "`taru' adjective",
    "adj-f": "noun or verb acting prenominally",
    "adj": "former adjective classification (being removed)",
    "adv": "adverb (fukushi)",
    "adv-to": "adverb taking the `to' particle",
    "aux": "auxiliary",
    "aux-v": "auxiliary verb",
    "aux-adj": "auxiliary adjective",
    "conj": "conjunction",
    "ctr": "counter",
    "exp": "Expressions (phrases, clauses, etc.)",
    "int": "interjection (kandoushi)",
    "iv": "irregular verb",
    "n": "noun",
    "n-adv": "adverbial noun (fukushitekimeishi)",
    "n-suf": "noun, used as a suffix",
    "n-pref": "noun, used as a prefix",
    "n-t": "noun (temporal) (jisoumeishi)",
    "num": "numeric",
    "pn": "pronoun",
    "pref": "prefix",
    "prt": "particle",
    "suf": "suffix",
    "v1": "Ichidan verb",
    "v1-s": "Ichidan verb - kureru special class",
    "v2a-s": "Nidan verb with 'u' ending (archaic)",
    "v4h": "Yodan verb with `hu/fu' ending (archaic)",
    "v4r": "Yodan verb with `ru' ending (archaic)",
    "v5aru": "Godan verb - -aru special class",
    "v5b": "Godan verb with `bu' ending",
    "v5g": "Godan verb with `gu' ending",
    "v5k": "Godan verb with `ku' ending",
    "v5k-s": "Godan verb - Iku/Yuku special class",
    "v5m": "Godan verb with `mu' ending",
    "v5n": "Godan verb with `nu' ending",
    "v5r": "Godan verb with `ru' ending",
    "v5r-i": "Godan verb with `ru' ending (irregular verb)",
    "v5s": "Godan verb with `su' ending",
    "v5t": "Godan verb with `tsu' ending",
    "v5u": "Godan verb with `u' ending",
    "v5u-s": "Godan verb with `u' ending (special class)",
    "v5uru": "Godan verb - Uru old class verb (old form of Eru)",
    "vz": "Ichidan verb - zuru verb (alternative form of -jiru verbs)",
    "vi": "intransitive verb",
    "vk": "Kuru verb - special class",
    "vn": "irregular nu verb",
    "vr": "irregular ru verb, plain form ends with -ri",
    "vs": "noun or participle which takes the aux. verb suru",
    "vs-c": "su verb - precursor to the modern suru",
    "vs-s": "suru verb - special class",
    "vs-i": "suru verb - irregular",
    "kyb": "Kyoto-ben",
    "osb": "Osaka-ben",
    "ksb": "Kansai-ben",
    "ktb": "Kantou-ben",
    "tsb": "Tosa-ben",
    "thb": "Touhoku-ben",
    "tsug": "Tsugaru-ben",
    "kyu": "Kyuushuu-ben",
    "rkb": "Ryuukyuu-ben",
    "nab": "Nagano-ben",
    "hob": "Hokkaido-ben",
    "vt": "transitive verb",
    "vulg": "vulgar expression or word",
    "adj-kari": "`kari' adjective (archaic)",
    "adj-ku": "`ku' adjective (archaic)",
    "adj-shiku": "`shiku' adjective (archaic)",
    "adj-nari": "archaic/formal form of na-adjective",
    "n-pr": "proper noun",
    "v-unspec": "verb unspecified",
    "v4k": "Yodan verb with `ku' ending (archaic)",
    "v4g": "Yodan verb with `gu' ending (archaic)",
    "v4s": "Yodan verb with `su' ending (archaic)",
    "v4t": "Yodan verb with `tsu' ending (archaic)",
    "v4n": "Yodan verb with `nu' ending (archaic)",
    "v4b": "Yodan verb with `bu' ending (archaic)",
    "v4m": "Yodan verb with `mu' ending (archaic)",
    "v2k-k": "Nidan verb (upper class) with `ku' ending (archaic)",
    "v2g-k": "Nidan verb (upper class) with `gu' ending (archaic)",
    "v2t-k": "Nidan verb (upper class) with `tsu' ending (archaic)",
};

function deepEqual(x, y) {
    const ok = Object.keys, tx = typeof x, ty = typeof y;
    return x && y && tx === 'object' && tx === ty ? (
        ok(x).length === ok(y).length &&
        ok(x).every(key => deepEqual(x[key], y[key]))
    ) : (x === y);
}

const FileUpload = () => {
    const { fileContent, setFileContent, savedWords, setSavedWords } = useContext(ReaderContext);

    const [scrollPosition, setScrollPosition] = useState(0);
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

            console.log(data[0]);
            console.log(savedWords)

            // Use deepEqual to check if the word is already in the list
            console.log(savedWords.some((savedWord) => deepEqual(savedWord, data[0])));

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

    // useEffect(() => {
    //     const handleCtrlKey = (event) => {
    //         // const mouseDownEvent = new MouseEvent('mousedown', {
    //         //     clientX: mousePosition.x,
    //         //     clientY: mousePosition.y,
    //         //     button: 0,
    //         // });
    //         // const mouseDragEvent = new MouseEvent('drag', {
    //         //     clientX: mousePosition.x,
    //         //     clientY: mousePosition.y,
    //         //     button: 0,
    //         // });
    //         // const mouseDragOverEvent = new MouseEvent('dragover', {
    //         //     clientX: mousePosition.x,
    //         //     clientY: mousePosition.y,
    //         //     button: 0,
    //         // });
    //         // const dropEvent = new MouseEvent('drop', {
    //         //     clientX: mousePosition.x,
    //         //     clientY: mousePosition.y,
    //         //     button: 0,
    //         // });
    //         // const mouseUpEvent = new MouseEvent('mouseup', {
    //         //     clientX: mousePosition.x,
    //         //     clientY: mousePosition.y,
    //         //     button: 0,
    //         // });
    //         // const clickEvent = new MouseEvent('click', {
    //         //     clientX: mousePosition.x,
    //         //     clientY: mousePosition.y,
    //         //     button: 0,
    //         // });

    //         // Get the element at the mouse position
    //         // const element = document.elementFromPoint(
    //         //     mousePosition.x,
    //         //     mousePosition.y
    //         // );
    //         // console.log(element);


    //         // console.log('Control');
    //         // const selection = window.getSelection();
    //         // const range = selection.getRangeAt(0);
    //         // console.log(range.startOffset, range.endOffset);
    //         // const selectedText = range.toString().trim();


    //         // if (selectedText && selectedText.length > 0) {
    //         //     console.log('Selected Word:', selectedText);
    //         //     // Do something with the selected word
    //         // }
    //     };

    //     document.addEventListener('keydown', handleCtrlKey);
    //     return () => {
    //         document.removeEventListener('keydown', handleCtrlKey);
    //     };
    // }, [mousePosition]);

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

            const selection = window.getSelection();
            const selectedText = selection.toString();

            let x = event.clientX;
            let y = event.clientY;

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
        return () => {
            document.removeEventListener('mouseup', handleSelection);
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

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();

            reader.onload = (e) => {
                const content = e.target.result;

                setFileContent(content);
                localStorage.setItem('fileContent', content);

                setScrollPosition(0);
                localStorage.setItem('scrollPosition', '0');

                setSavedWords([]);
            };

            reader.readAsText(file);
        }
    };

    return (
        <div className="flex flex-col items-center text-white">
            <div className="flex flex-row items-center mb-8">
                <input
                    type="file"
                    id="reader-input"
                    accept=".txt, .html"
                    onChange={handleFileChange}
                    hidden
                />
                <label
                    htmlFor="reader-input"
                    className="block text-sm mr-4 py-2 px-4 rounded-md border-0 font-semibold bg-pink-50 text-pink-700 hover:bg-pink-100 cursor-pointer transition duration-100 ease-in-out"
                >
                    Choose file
                </label>
                <label className="block text-sm text-slate-500 py-2 px-4">
                    {fileContent && fileContent.length > 0
                        ? `Selected file: ${fileContent.length} bytes`
                        : 'No file selected'}
                </label>
            </div>
            <div className="select-auto selection:rounded-xl selection:border selection:bg-purple-300 selection:text-purple-900 text-left text-slate-300 font-normal tracking-wide text-xl container bg-slate-800 rounded-xl p-12 border-white border-[1px]">
                {fileContent && (
                    <div dangerouslySetInnerHTML={{ __html: fileContent }} />
                )}
            </div>


            {popoverVisible && popoverContent.kana.length > 0 && (
                <div
                    className='fixed top-0 left-0 w-full h-full text-black'
                    onClick={closePopover}
                >
                    <div
                        style={{
                            top: (window.innerHeight - popoverPosition.y < (58 + popoverContent.sense["eng"].length * 20 + 32) ? popoverPosition.y - (58 + popoverContent.sense["eng"].length * 20 + 32) - 50 : popoverPosition.y) + 5,
                            left: (window.innerWidth - popoverPosition.x < (48 + 5.5 * (Math.max(popoverContent.sense["eng"].map((gloss, _) => gloss[0].split(' @ ').join(', ')).map((meaning, _) => meaning.trim().length)))) ? popoverPosition.x - ((48 + 5.5 * (Math.max(popoverContent.sense["eng"].map((gloss, _) => gloss[0].split(' @ ').join(', ')).map((meaning, _) => meaning.trim().length))))) - 20 : popoverPosition.x) + 5,
                        }}
                        className="popover absolute bg-gray-700 text-gray-300 shadow-lg rounded-lg py-3 px-6 z-50 flex flex-col gap-1 text-left w-auto"
                        ref={popoverRef}
                    >
                        <div className="flex flex-col justify-between items-left">
                            <div className="flex flex-row justify-between items-center gap-x-5">
                                <h3 className='text-xl font-medium'>{
                                    popoverContent.kanji !== null ? popoverContent.kanji : popoverContent.kana[0]
                                }</h3>
                                <span className="inline-flex items-center justify-center p-1 text-sm font-medium leading-none text-white rounded-full">
                                    <button className={`
                                        focus:outline-none hover:text-green-500 duration-100 active:text-green-800 focus:border-none
                                        ${savedWords.some((w) => deepEqual(w, popoverContent)) ? 'text-yellow-400' : 'text-gray-500'}`}
                                        onClick={addFavorite}
                                    >
                                        <FaStar />
                                    </button>
                                </span>
                            </div>
                            <p className='text-[12px] pb-2'>{
                                (popoverContent.kanji !== null > 0 ? popoverContent.kana : popoverContent.kana.slice(1)).map((kana, index) => (
                                    <span key={index} className={index !== 0 ? 'pl-2' : ''}>{kana}</span>
                                ))
                            }</p>
                        </div>
                        <ul className='text-sm pb-4'>
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
