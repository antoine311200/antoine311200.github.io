import React, { useState, useMemo, useContext, createContext, useEffect } from 'react';
import { IoSettingsOutline, IoCloudUploadOutline, IoDocumentTextOutline, IoCheckmarkCircleOutline, IoRefreshCircleOutline, IoSpeedometerOutline, IoPlaySkipBackSharp, IoPlaySkipForwardSharp, IoPlayCircleOutline, IoPauseCircleOutline } from "react-icons/io5";
import { RxCross1 } from "react-icons/rx";
import { MdOutlineLibraryBooks, MdUploadFile } from "react-icons/md";
import { FaCheck } from "react-icons/fa6";

const initialState = {
    text: "",
    setText: () => { },
    blocks: [],
    setBlocks: () => { },
    speed: 250,
    setSpeed: () => { },
    display: 'word',
    setDisplay: () => { },
    numWords: 4,
    setNumWords: () => { },
    openSettings: false,
    setOpenSettings: () => { },
    openViewer: false,
    setOpenViewer: () => { },
    isPaused: true,
    setIsPaused: () => { },
    currentIndex: 0,
    setCurrentIndex: () => { }
};
const ReilContext = createContext(initialState);

const ReilNav = () => {
    const { openSettings, setOpenSettings } = useContext(ReilContext);
    return (
        <nav className='bg-violet-50 text-white p-4 flex flex-row justify-between md:justify-center items-center'>
            <h1><span className="text-xl md:text-2xl font-semibold from-purple-800 to-violet-600 bg-gradient-to-r bg-clip-text text-transparent">Reil - Fast Reader</span></h1>
            <div className='absolute right-4 flex flex-row items-center justify-between gap-2 md:gap-4'>
                <button className='ml-2' onClick={() => 0}><IoCloudUploadOutline  className="text-2xl md:text-3xl text-violet-500" /></button>
                <button className='ml-2' onClick={() => 0}><IoDocumentTextOutline  className="text-2xl md:text-3xl text-violet-500" /></button>
                <button className='ml-2' onClick={() => setOpenSettings(!openSettings)}><IoSettingsOutline className="text-2xl md:text-3xl text-violet-500" /></button>
            </div>
        </nav>
    );
}

const ReilHighlightStyle = {
    'highlight': 'bg-yellow-200',
    'bold': 'font-bold',
}

const ReilViewer = () => {
    const { text, blocks, currentIndex } = useContext(ReilContext);
    const [textJSX, setTextJSX] = useState('');

    const styleIndex = 'highlight';

    useEffect(() => {
        console.log("rendering", currentIndex);
        setTextJSX(blocks.map((block, index) => {
            const isCurrent = index === currentIndex;

            return (
                <span>
                <span key={index} className={`text-justify ${isCurrent ? ReilHighlightStyle[styleIndex] : ''}`}>
                    {block}
                </span>
                {index < blocks.length - 1 && <span>&nbsp;</span>}
                </span>
            );
        }));
    }, [blocks, currentIndex]);

    return (
        <div className='flex flex-col justify-center items-center'>
            <p>
            {textJSX}
            </p>
        </div>
    );
};

const ReilMain = () => {

    const { currentIndex, setCurrentIndex, isPaused, setIsPaused, text, setText, blocks, setBlocks, display, setDisplay, numWords, speed, openViewer } = useContext(ReilContext);
    const [isFinished, setFinished] = useState(false);

    const handleIndex = (offset) => {
        if (currentIndex + offset >= 0 && currentIndex + offset < blocks.length - 1) {
            if (isFinished) {
                setFinished(false);
            }
            setCurrentIndex(currentIndex + offset);
        }
        else if (currentIndex + offset >= blocks.length - 1) {
            console.log("finished");
            setCurrentIndex(blocks.length - 1);
            setIsPaused(true);
            setFinished(true);
        }
        else if (currentIndex + offset < 0) {
            setCurrentIndex(0);
        }
    }

    useEffect(() => {
        console.log("pause", isPaused);
    }, [isPaused]);


    useEffect(() => {
        fetch('https://baconipsum.com/api/?type=meat-and-filler&paras=1&format=text')
            .then(response => response.text())
            .then(data => setText(data));
    }, []);

    useEffect(() => {
        const splitText = text.split(' ');
        const blockCount = Math.ceil(splitText.length / numWords);
        const blockArray = Array.from({ length: blockCount }, (_, index) => {
            const start = index * numWords;
            const end = start + numWords;
            return splitText.slice(start, end).join(' ');
        });
        setBlocks(blockArray);
    }, [text, numWords]);

    useEffect(() => {
        setDisplay(blocks[currentIndex]);
    }, [currentIndex, blocks]);

    useEffect(() => {
        const timer = setInterval(() => {
            if (!isPaused) {
                setCurrentIndex((prevIndex) => {
                    if (prevIndex < blocks.length - 1) {
                        return prevIndex + 1;
                    }
                    else {
                        console.log("finished 2");
                        setIsPaused(true);
                        setFinished(true);
                        return prevIndex;
                    }
                });
                // handleIndex(1);
            }
        }, 60000 / speed * numWords);
        return () => clearInterval(timer);
    }, [isPaused, speed, blocks]);

    useEffect(() => {
            if (currentIndex >= blocks.length && blocks.length > 0) {
                console.log("finished 3");
                setFinished(true);
            }
        }, [currentIndex, blocks]);


    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === ' ') {
                setIsPaused(!isPaused);
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPaused]);

    return (
        <main className='grow flex flex-col justify-center items-center'>
            <h1 className='w-full flex flex-col justify-center items-center grow text-xl md:text-4xl'>{display}</h1>
            <div className='flex flex-row justify-center items-center gap-8 m-12 px-4 py-2 border rounded-xl bg-violet-50 '>
                <button className='text-4xl text-violet-600' onClick={() => handleIndex(-1)}><IoPlaySkipBackSharp /></button>
                {isFinished ? (<button className='text-7xl text-violet-600 rotate-180' onClick={() => { setCurrentIndex(0); setFinished(false); setIsPaused(true); }}><IoRefreshCircleOutline  /></button>) :
                    (<button className='text-7xl text-violet-600' onClick={() => setIsPaused(!isPaused)}>{!isPaused ? <IoPauseCircleOutline /> : <IoPlayCircleOutline />}</button>)
                }
                <button className='text-4xl text-violet-600' onClick={() => handleIndex(1)}><IoPlaySkipForwardSharp /></button>
            </div>
            {openViewer && <div className="absolute w-1/4 min-h-full mx-4 py-24 top-1/2 left-0  transform -translate-y-1/2 flex flex-row items-start gap-4">
                <div className='border border-gray-200 rounded-lg p-4 bg-white shadow-lg overflow-visible text-justify'><ReilViewer /></div>
            </div>}
        </main>
    );
}

const ReilFooter = () => {
    return (
        <footer className='w-full bg-gray-100 text-white p-4 flex flex-row justify-center items-center'>

        </footer>
    );
}

const ReilButton = ({ children, onClick }) => {
    return (
        <button className='w-12 text-sm font-medium text-white px-2 py-1 rounded-lg shadow-lg text-center
            bg-emerald-500 hover:bg-emerald-600 transition duration-200 ease-in-out hover:scale-[103%] active:bg-emerald-700'
            onClick={onClick}>{children}</button>
    );
}

const ReilToast = ({ message }) => {
    return (
        <div className='absolute bottom-5 right-5 transform -translate-y-1/2 '>
            <div className='flex items-center w-full max-w-xs p-4 text-gray-500 bg-gray-50 rounded-lg shadow dark:text-gray-400 dark:bg-gray-800' role="alert">
                <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-green-500 bg-green-100 rounded-lg dark:bg-green-800 dark:text-green-200">
                    <IoCheckmarkCircleOutline />
                </div>
                <div className="ms-3 text-sm font-normal">{message}</div>
                <button type="button" className="ms-3 -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex items-center justify-center h-8 w-8 dark:text-gray-500 dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700">
                    <RxCross1 />
                </button>
            </div>
        </div>
    );
}

const ReilSettings = () => {
    const { openViewer, setOpenViewer, openSettings, setOpenSettings, speed, setSpeed, numWords, setNumWords } = useContext(ReilContext);

    const changeSpeed = (delta) => () => {
        console.log(speed + delta);
        setSpeed(Math.max(0, Math.min(speed + delta, 2000)));
    }

    return (
        <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-100 p-4 rounded-lg shadow-lg ease-in-out transition-all duration-300'>
            <div className='flex justify-between items-center mb-5'>
                <h2 className='text-2xl'>Settings</h2>
                <button onClick={() => setOpenSettings(false)}><RxCross1 className='text-2xl text-gray-500' /></button>
            </div>

            <div className='flex flex-col gap-y-6'>
                <div className='flex flex-col gap-y-2'>
                    <label className='text-lg flex flex-row items-center gap-2'><IoSpeedometerOutline />Speed</label>
                    <div className='flex flex-row justify-between items-center gap-2'>
                        <ReilButton onClick={changeSpeed(-100)}>-100</ReilButton>
                        <ReilButton onClick={changeSpeed(-50)}>-50</ReilButton>
                        <ReilButton onClick={changeSpeed(-5)}>-5</ReilButton>
                        <span className='px-2'><span className='font-semibold'>{speed}</span> wpm </span>
                        <ReilButton onClick={changeSpeed(+5)}>+5</ReilButton>
                        <ReilButton onClick={changeSpeed(+50)}>+50</ReilButton>
                        <ReilButton onClick={changeSpeed(+100)}>+100</ReilButton>
                    </div>
                </div>
                <div className='flex flex-col gap-y-2'>
                    <label className='text-lg flex flex-row items-center gap-2'><MdOutlineLibraryBooks />Words number</label>
                    <div className='flex flex-row justify-between items-center gap-2'>
                        <input id="small-range" type="range" min="1" max="10" value={numWords} className="grow h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer range-sm dark:bg-gray-700"
                            onChange={(e) => setNumWords(Math.round(e.target.value))} />
                        <span className='px-2'><span className='font-semibold'>{numWords}</span> words </span>
                    </div>
                </div>
                {/* Show Viewer */}
                <div className='flex flex-col gap-y-2'>

                    <label className='text-lg flex flex-row items-center gap-2'>
                        {/* <MdUploadFile /> */}
                        <input id="small-range" type="checkbox" checked={openViewer} onChange={(e) => setOpenViewer(e.target.checked)} className="
                            peer relative h-5 w-5 cursor-pointer appearance-none rounded-md border border-blue-gray-200 transition-all
                            checked:border-pink-400 checked:bg-pink-400 checked:before:bg-pink-400 hover:before:opacity-10
                            before:absolute before:top-2/4 before:left-2/4 before:block before:h-10 before:w-10 before:-translate-y-2/4 before:-translate-x-2/4 before:rounded-full before:bg-blue-gray-500 before:opacity-0 before:transition-opacity
                         " />
                        <FaCheck className="absolute scale-75 translate-x-[8%] text-white transition-opacity opacity-100 pointer-events-none peer-checked:opacity-100" />
                        Show Viewer
                    </label>
                </div>

            </div>
        </div>
    );

}

export default function ReilApp() {

    const [text, setText] = useState("");
    const [blocks, setBlocks] = useState([]);
    const [speed, setSpeed] = useState(600);
    const [numWords, setNumWords] = useState(3);
    const [display, setDisplay] = useState('word to read fast');
    const [openSettings, setOpenSettings] = useState(false);
    const [openViewer, setOpenViewer] = useState(false);
    const [isPaused, setIsPaused] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    return (
        <ReilContext.Provider value={{
            text, setText, blocks, setBlocks, speed, setSpeed, display, setDisplay, numWords, setNumWords,
            openSettings, setOpenSettings, openViewer, setOpenViewer,
            isPaused, setIsPaused, currentIndex, setCurrentIndex
        }}>
            <div className='bg-white h-[100vh] w-[100vw] flex flex-col'>
                <ReilNav />
                <ReilMain />
                {openSettings && <ReilSettings />}
                {/* <ReilToast message='Settings saved' /> */}
                <ReilFooter />
            </div>
        </ReilContext.Provider>
    );
}