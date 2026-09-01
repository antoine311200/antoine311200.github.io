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
    openPanel: false,
    setOpenPanel: () => { },
    isPaused: true,
    setIsPaused: () => { },
    currentIndex: 0,
    setCurrentIndex: () => { }
};
const ReilContext = createContext(initialState);

const ReilNav = () => {
    const { openSettings, setOpenSettings, openPanel, setOpenPanel } = useContext(ReilContext);
    return (
        <nav className='bg-violet-50 text-white p-4 flex flex-row justify-between md:justify-center items-center'>
            <h1><span className="text-xl md:text-2xl font-semibold from-purple-800 to-violet-600 bg-gradient-to-r bg-clip-text text-transparent">Reil - Fast Reader</span></h1>
            <div className='absolute right-4 flex flex-row items-center justify-between gap-2 md:gap-4'>
                <button className='ml-2' onClick={() => setOpenPanel(!openPanel)}><IoCloudUploadOutline className="text-2xl md:text-3xl text-violet-500" /></button>
                {/* <button className='ml-2' onClick={() => 0}><IoDocumentTextOutline  className="text-2xl md:text-3xl text-violet-500" /></button> */}
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
                {isFinished ? (<button className='text-7xl text-violet-600 rotate-180' onClick={() => { setCurrentIndex(0); setFinished(false); setIsPaused(true); }}><IoRefreshCircleOutline /></button>) :
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

const ReilBooks = [
    {
        name: 'Frankenstein',
        author: 'Mary Shelley',
        language: 'English',
        release: 1818,
    },
    {
        name: 'The Picture of Dorian Gray',
        author: 'Oscar Wilde',
        language: 'English',
        release: 1890,
    },
    {
        name: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        language: 'English',
        release: 1925,
    },
]

const ReilPanel = () => {
    const { openPanel, setOpenPanel } = useContext(ReilContext);
    const [activeTab, setActiveTab] = useState(1);

    const inactiveStyle = "inline-block p-4 border-b-2 rounded-t-lg hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300";
    const activeStyle = "inline-block p-4 border-b-2 rounded-t-lg text-purple-600 hover:text-purple-600 dark:text-purple-500 dark:hover:text-purple-500 border-purple-600 dark:border-purple-500";

    return (
        <div className='w-[calc(50vw)] absolute top-[15%] left-1/2 transform -translate-x-1/2 bg-white p-4 rounded-lg shadow-lg ease-in-out transition-all duration-300'>
            <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-row justify-between items-center">
                    <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
                        <li><button onClick={() => setActiveTab(0)} className={activeTab === 0 ? activeStyle : inactiveStyle}>Upload file</button></li>
                        <li><button onClick={() => setActiveTab(1)} className={activeTab === 1 ? activeStyle : inactiveStyle}>Library</button></li>
                    </ul>
                    <button className='mr-2 text-gray-500 dark:text-gray-400' onClick={() => setOpenPanel(false)}><RxCross1 /></button>
                </div>
            </div>
            <div>
                <div className={`p-4 rounded-lg bg-gray-50 dark:bg-gray-800 ${activeTab === 0 ? 'block' : 'hidden'}`}>
                    {/* <p className="text-sm text-gray-500 dark:text-gray-400">This is some placeholder content the <strong className="font-medium text-gray-800 dark:text-white">Profile tab's associated content</strong>. Clicking another tab will toggle the visibility of this one for the next. The tab JavaScript swaps classes to control the content visibility and styling.</p> */}
                    <div>
                        <label htmlFor="file-upload" className="block text-sm font-medium leading-6 text-black">Upload .txt file</label>
                        <div className="mt-2 bg-gray-500 rounded-lg">
                            {/* onDrop={handleDrop} onDragOver={e => e.preventDefault()}> */}
                            <div className="flex items-center justify-center w-full">
                                <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
                                    <div className="flex flex-col items-center justify-between pt-5 pb-6">
                                        <IoCloudUploadOutline className="text-gray-500 text-4xl" />
                                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                        {/* <p className="text-xs text-gray-500 dark:text-gray-400">TEXT</p> */}
                                    </div>
                                    <input id="file-upload" type="file" className="hidden" />
                                    {/* onChange={handleFileInputChange} /> */}
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={`p-4 rounded-lg bg-gray-50 dark:bg-gray-800 ${activeTab === 1 ? 'block' : 'hidden'}`}>
                    <div class="relative overflow-x-auto shadow-md sm:rounded-lg">
                        <table class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                            <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th scope="col" class="px-6 py-3">Book name</th>
                                    <th scope="col" class="px-6 py-3">Author</th>
                                    <th scope="col" class="px-6 py-3">Language</th>
                                    <th scope="col" class="px-6 py-3">Release date</th>
                                    <th scope="col" class="px-6 py-3">Download</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ReilBooks.map((book, index) => (
                                    <tr class="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700">
                                    <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{book.name}</th>
                                    <td class="text-xs px-6 py-4">{book.author}</td>
                                    <td class="text-xs px-6 py-4">{book.language}</td>
                                    <td class="text-xs px-6 py-4">{book.release}</td>
                                    <td class="text-xs px-6 py-4"><a href="#" class="font-medium text-blue-600 dark:text-blue-500 hover:underline">Download</a></td>
                                </tr>))}
                            </tbody>
                        </table>
                    </div>
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
    const [openPanel, setOpenPanel] = useState(false);
    const [isPaused, setIsPaused] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    return (
        <ReilContext.Provider value={{
            text, setText, blocks, setBlocks, speed, setSpeed, display, setDisplay, numWords, setNumWords,
            openSettings, setOpenSettings, openViewer, setOpenViewer, openPanel, setOpenPanel,
            isPaused, setIsPaused, currentIndex, setCurrentIndex
        }}>
            <div className='bg-white h-[100vh] w-[100vw] flex flex-col'>
                <ReilNav />
                <ReilMain />
                {openSettings && <ReilSettings />}
                {openPanel && <ReilPanel />}
                <ReilFooter />
            </div>
        </ReilContext.Provider>
    );
}