import React, { useState, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider, useQuery } from 'react-query'

import ReaderSidebar from "./sidebar";
import FileUpload from "./fileupload";
import { ReaderContext } from "./readercontext";

const queryClient = new QueryClient()

function JapaneseReader() {
    const [fileContent, setFileContent] = useState('');
    const [savedWords, setSavedWords] = useState([]);

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = (event) => {
        setIsMenuOpen(!isMenuOpen);
    }

    useEffect(() => {
        const closeMenuOnOutsideClick = (event) => {
            const sidebar = document.getElementById('sidebar');
            const menuButton = document.getElementById('menu-button');

            // console.log(event.target);

            // if ((sidebar && !sidebar.contains(event.target) && isMenuOpen) && (menuButton && !menuButton.contains(event.target))) {
            //     setIsMenuOpen(false);
            // }

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



    return (
        <ReaderContext.Provider value={{ fileContent, setFileContent, savedWords, setSavedWords }}>
            <QueryClientProvider client={queryClient}>
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
                    </div>
                </nav>
                <div onClick={() => setIsMenuOpen(true)} id="sidebar">
                    <ReaderSidebar isMenuOpen={isMenuOpen} className="z-2" />
                </div>
                <div className="flex flex-col items-center gap-10 bg-slate-800 h-auto">
                    <main className="mx-auto mt-1">
                        <FileUpload className="pl-[5%] lg:pl-[8%] md:pl-[5%]" />
                    </main>
                </div>
            </QueryClientProvider>
        </ReaderContext.Provider>
    );
}

export default JapaneseReader;