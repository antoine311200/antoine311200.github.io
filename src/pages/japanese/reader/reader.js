import React, { useState, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider, useQuery } from 'react-query'

import ReaderSidebar from "./sidebar";
import FileUpload from "./fileupload";
import { ReaderContext } from "./readercontext";
import { BsChevronDown } from "react-icons/bs";

const queryClient = new QueryClient();

const defaultSettings = {
    fontSize: "20px", // "20px
    fontColor: '#eeeeee',
    bgColor: '#1e293b',
    selectedFont: 'Arial',
};

function JapaneseReader() {
    const [fileContent, setFileContent] = useState('');
    const [savedWords, setSavedWords] = useState([]);
    const [scrollPosition, setScrollPosition] = useState(0);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDropdownOpen, setDropdownOpen] = useState(false);

    const [settings, setSettings] = useState(defaultSettings);

    const handleFontSizeChange = (e) => {
        console.log(e.target.value);
        setSettings({ ...settings, fontSize: e.target.value+"px" });
    };

    const handleFontColorChange = (color) => {
        setSettings({ ...settings, fontColor: color });
    };

    const handleBgColorChange = (color) => {
        setSettings({ ...settings, bgColor: color });
    };

    const handleFontChange = (e) => {
        setSettings({ ...settings, selectedFont: e.target.value });
    };

    const toggleMenu = (event) => {
        setIsMenuOpen(!isMenuOpen);
    }
    const toggleDropdown = (event) => {
        if (event.target.id === "menu-button") {
            setDropdownOpen(!isDropdownOpen);
        }
    };



    useEffect(() => {
        const closeMenuOnOutsideClick = (event) => {
            const sidebar = document.getElementById('sidebar');
            const menuButton = document.getElementById('menu-button');

            // Set the menu to close if the user clicks outside of the 20% of the screen on the left
            if ((event.clientX > window.innerWidth * 0.3) && isMenuOpen && (menuButton && !menuButton.contains(event.target))) {
                setIsMenuOpen(false);
            }

        };

        document.addEventListener('click', closeMenuOnOutsideClick);

        return () => {
            document.removeEventListener('click', closeMenuOnOutsideClick);
        };
    }, [isMenuOpen]);

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
        <ReaderContext.Provider value={{ fileContent, setFileContent, savedWords, setSavedWords, scrollPosition, setScrollPosition }}>
            <QueryClientProvider client={queryClient}>
                <div className="overflow-hidden h-screen w-screen bg-slate-900">
                    <nav className="bg-slate-900 py-4 fixed w-full top-0 z-10">
                        <div className="px-4 mx-auto flex justify-between items-center">
                            <div className="flex items-center text-xl">
                                <button id="menu-button" onClick={toggleMenu} className="mr-4 relative flex-none inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-500">
                                    {isMenuOpen ?
                                        <img className="h-4 w-4" src="times.svg" alt="Times Icon" />
                                        :
                                        <img className="h-4 w-4" src="bars.svg" />
                                    }
                                </button>
                                <h1 className="grow text-white text-lg font-semibold">Japanese Reader</h1>
                            </div>

                            <div className="flex flex-row items-center">
                                <div className="flex flex-row items-center">
                                    <input
                                        type="file"
                                        id="reader-input"
                                        accept=".txt, .html"
                                        onChange={handleFileChange}
                                        hidden
                                    />
                                    <label
                                        htmlFor="reader-input"
                                        className="block text-sm mr-4 py-1.5 px-3 rounded-md border-0 font-semibold bg-pink-50 text-pink-700 hover:bg-pink-100 cursor-pointer transition duration-100 ease-in-out"
                                    >
                                        Choose file
                                    </label>
                                </div>
                                <details id="dropdown" onClick={toggleDropdown}>
                                    <summary class="select-none cursor-pointer inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50" id="menu-button">
                                        Options
                                        <svg class={`-mr-1 h-5 w-5 text-gray-400 duration-300 ${!isDropdownOpen && "rotate-[180deg]"}`} viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
                                        </svg>
                                    </summary>
                                    <div class="menu dropdown-content absolute right-4 z-10 mt-2 w-56 origin-top-right divide-y px-2 divide-gray-400 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                        <div className="py-1 flex flex-row justify-between gap-x-3">
                                            <label className="text-gray-800 pl-2 py-2 text-sm">
                                                Font Size
                                            </label>
                                            <input
                                                type="range"
                                                id="font-size"
                                                min="15"
                                                max="30"
                                                step="5"
                                                value={Number(settings.fontSize.slice(0, -2))}
                                                onChange={handleFontSizeChange}
                                                className="range transition-all duration-300 ease-in-out"
                                            />
                                        </div>
                                        <div className="py-1 flex flex-row justify-between gap-x-3">
                                            <label className="text-gray-700 block pl-2 py-2 text-sm">
                                                Font Color
                                            </label>
                                            <input
                                                type="color"
                                                id="font-color"
                                                value={settings.fontColor}
                                                onChange={(e) => handleFontColorChange(e.target.value)}
                                            />
                                        </div>
                                        <div className="py-1 flex flex-row justify-between gap-x-3">
                                            <label className="text-gray-700 block pl-2 py-2 text-sm">
                                                Background Color
                                            </label>
                                            <input
                                                type="color"
                                                id="bg-color"
                                                value={settings.bgColor}
                                                onChange={(e) => handleBgColorChange(e.target.value)}
                                            />
                                        </div>

                                        <div className="py-1 flex flex-row justify-center gap-x-3">
                                            <button className="text-gray-700 my-1 py-1.5 px-4 text-sm bg-gray-200 rounded-md hover:bg-gray-300 duration-100 active:bg-gray-400"
                                                onClick={() => setSettings(defaultSettings)}>
                                                Reset
                                            </button>
                                        </div>
                                    </div>
                                </details>
                            </div>
                        </div>
                    </nav>
                    <div className="flex">
                        <div onClick={() => setIsMenuOpen(true)} id="sidebar">
                            <ReaderSidebar isMenuOpen={isMenuOpen} className="z-2" />
                        </div>
                        <div className={`grow flex flex-col items-center gap-x-2 px-5`} style={{ fontSize: `${settings.fontSize}px`, color: `${settings.fontColor}`, backgroundColor: `${settings.bgColor}` }}>
                            <FileUpload settings={settings} />
                        </div>
                    </div>
                </div>
            </QueryClientProvider>
        </ReaderContext.Provider>
    );
}

export default JapaneseReader;