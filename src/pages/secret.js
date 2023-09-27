import React, { useState, useEffect, useRef } from "react";

import { FaChevronRight } from "react-icons/fa";

// Import jlpt5.json from public/data
import jlpt5 from "../data/jlpt5.json";
import jlpt4 from "../data/jlpt4.json";
import jlpt3 from "../data/jlpt3.json";
import jlpt2 from "../data/jlpt2.json";

// Concatenate all the json files into one array
jlpt5 = jlpt5.concat(jlpt4, jlpt3, jlpt2);

// const JapaneseApp = () => {
//     const [word, setWord] = useState('');
//     const [furigana, setFurigana] = useState('');
//     const [meaning, setMeaning] = useState('');
//     const [isTurned, setIsTurned] = useState(false);

//     const turnRef = useRef(null);

//     const randomVocab = () => {
//         setIsTurned(false);

//         console.log("rnd "+isTurned)

//         const random = Math.floor(Math.random() * jlpt5.length);
//         const vocab = jlpt5[random];

//         setWord(vocab.kanji);
//         setFurigana(vocab.kana);
//         setMeaning(vocab.english);
//     };

//     const handleTurn = (e) => {
//         // console.log(e.target);
//         // console.log('ref');
//         // console.log(turnRef.current);
//         // if (turnRef.current && (turnRef.current.contains(e.target) || turnRef.current === e.target)) {
//         //     setIsTurned(!isTurned);
//         // }
//         if (!e.target.matches('button')) {
//             console.log('toggle');
//             console.log(isTurned)
//             // setIsTurned(!isTurned);
//         }
//     };

//     // Effect on page load to set random vocab
//     useEffect(() => {
//         window.addEventListener('load', randomVocab);
//         window.addEventListener('click', handleTurn);
//         return () => {
//             window.removeEventListener('click', handleTurn);
//         };
//     }, []);

//     return (
//         <div className="bg-slate-800 h-screen w-screen">
//             <div ref={turnRef} className="h-1/2">
//                 <h1 className="text-5xl p-8 mb-24 text-white text-center">Japanese App</h1>
//                 {word != furigana && isTurned && <h1 className="text-3xl text-white text-center">{furigana}</h1>}
//                 <h1 className="text-9xl text-white text-center">{word}</h1>
//                 {isTurned && <h1 className="text-3xl text-white text-center mt-16">{meaning}</h1>}
//             </div>
//             <div className="flex flex-col items-center">
//                 <button className="absolute bottom-20 justify-center bg-slate-50 hover:bg-slate-200 focus:ring-2 focus:outline-none focus:ring-slate-100 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800" onClick={randomVocab}>
//                     Next <FaChevronRight className="ml-4 mt-1" />
//                 </button>
//             </div>
//         </div>
//     )
// };

function JapaneseApp() {
    const [word, setWord] = useState('test');
    const [furigana, setFurigana] = useState('tefst');
    const [meaning, setMeaning] = useState('test');
    const [isToggled, setIsToggled] = useState(false);


    const randomVocab = () => {
        setIsToggled(false);

        const random = Math.floor(Math.random() * jlpt5.length);
        const vocab = jlpt5[random];

        setWord(vocab.kanji);
        setFurigana(vocab.kana);
        setMeaning(vocab.english);
    };


    const handleScreenClick = (e) => {
        if (!e.target.matches('button')) {
            setIsToggled((prevToggled) => !prevToggled);
        }
    };

    useEffect(() => {
        document.addEventListener('click', handleScreenClick);
        return () => {
            document.removeEventListener('click', handleScreenClick);
        };
    }, []);

    return (
        <div className="bg-slate-800 h-screen w-screen">
            <div className="w-full z-10">
                <h1 className="text-5xl p-8 mb-24 text-white text-center">Japanese App</h1>
            </div>
            <div className="flex flex-col items-center gap-10">
                <h1 className="fixed text-9xl text-white text-center">{word}</h1>
                {word != furigana && isToggled && <h1 className="fixed text-3xl text-white text-center top-40">{furigana}</h1>}
                {isToggled && <h1 className="fixed text-3xl text-white text-center bottom-1/3">{meaning}</h1>}
            </div>
            <div className="flex flex-col items-center">
                <button className="absolute bottom-20 justify-center bg-slate-50 hover:bg-slate-200 focus:ring-2 focus:outline-none focus:ring-slate-100 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800" onClick={randomVocab}>
                    Next <FaChevronRight className="ml-4 mt-1" />
                </button>
            </div>
        </div >
    )
};

export default JapaneseApp;