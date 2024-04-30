import React, { useState, useEffect, useRef } from "react";

import { DootContext } from "./dootcontext";

import DootConnection from "./login";
import { DootCard, MiniDootCard, Doot } from "./card";
import DootNetwork from "./network";

import { BsSearch } from "react-icons/bs";
import { FiFilePlus } from "react-icons/fi";

// const dummy_doots = new Array(160).fill(new Doot(50));

const dummy_doots = [
    new Doot(1, "Title 1", "Description 1", ["keyword1", "keyword2"], "https://via.placeholder.com/150"),
    new Doot(2, "Title 2", "Description 2", ["keyword1", "keyword2"], "https://via.placeholder.com/150"),
    new Doot(3, "Title 3", "Description 3", ["keyword1", "keyword2"], "https://via.placeholder.com/150"),
    new Doot(4, "Title 4", "Description 4", ["keyword1", "keyword2"], "https://via.placeholder.com/150"),
]

function DootApp() {

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const toggleMenu = (event) => {
        setIsMenuOpen(!isMenuOpen);
    }

    const [currentDoot, setCurrentDoot] = useState(null);
    const [gridDoots, setGridDoots] = useState(dummy_doots);
    const [doots, setDoots] = useState(dummy_doots);
    const [window, setWindow] = useState('card');

    const [searchInput, setSearchInput] = useState('');

    // Get the connection status from the cookie
    const [isConnected, setIsConnected] = useState(false);
    useEffect(() => {
        const connectionStatus = localStorage.getItem("isConnected");
        if (connectionStatus) {
            setIsConnected(connectionStatus);
        }
    }, []);

    useEffect(() => {
        if (currentDoot === null && window === 'card') {
            setWindow('grid');
        }
    }, [currentDoot, window]);

    useEffect(() => {
        // searchInput is the search query it can have the following values:
        // keyword:keyword_name
        // title:keyword_name
        // words that are fetch from the description and title
        // id:doot_id

        const searchTerms = searchInput.split(' ');
        const keywords = searchTerms.filter(term => term.includes('keyword:')).map(term => term.split(':')[1]);
        const title_search = searchTerms.filter(term => term.includes('title:')).map(term => term.split(':')[1]);
        const global_search = searchTerms.filter(term => !term.includes(':'));

        if (searchInput !== '') {
            let filteredDoots = doots.filter(doot => {
                let match = true;
                if (keywords.length > 0) {
                    match = match && keywords.some(keyword => doot.keywords.includes(keyword));
                }
                if (title_search.length > 0) {
                    match = match && title_search.some(title => doot.title.includes(title));
                }
                if (global_search.length > 0) {
                    match = match && global_search.some(term => doot.title.includes(term) || doot.description.includes(term));
                }
                return match;
            });
            setGridDoots(filteredDoots);
        }
        else setGridDoots(doots);

    }, [searchInput]);

    return (
        <DootContext.Provider value={{ isConnected, setIsConnected, doots, setDoots, window, setWindow, currentDoot, setCurrentDoot }}>
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
                        <h1 className="grow  hidden md:block">
                            <span className="text-xl font-semibold from-yellow-400 to-lime-400 bg-gradient-to-r bg-clip-text text-transparent">Doot</span>
                            <span className="text-white text-lg font-medium"> - Knowledge Manager</span>
                        </h1>
                    </div>
                    {isConnected &&
                        <div className="flex items-center justify-center">
                            <button className="text-white text-xs font-medium py-1.5 px-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 transition duration-300" onClick={() => setIsConnected(false)}>Disconnect</button>
                        </div>
                    }
                </div>
            </nav>
            <div className="flex flex-col items-center mt-[22%] md:mt-[7%] h-screen">
            { !isConnected ? <DootConnection /> :
                ((window === 'grid' &&
                    // Add scrollable grid
                    <div className="flex flex-col gap-y-4 w-3/4">
                        <div className="flex items-center justify-between px-4 gap-x-2">
                            <div className={`flex items-center rounded-md bg-gray-700 px-4 py-2 gap-x-2 grow`}>
                                <BsSearch className={`text-white text-lg block float-left cursor-pointer mr-2`} />
                                <input
                                    type='search' placeholder='Search'
                                    className={`search-cancel:appearance-none bg-transparent text-white text-base focus:outline-none after:text-yellow-300 grow`}
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                />
                            </div>
                            <button className="text-white bg-green-600 bg-opacity-80 hover:bg-opacity-100 transition-all duration-200 p-3 rounded-full text-xl">
                                <FiFilePlus />
                            </button>
                        </div>
                        <div className="h-[80%] overflow-y-auto">
                            <div className="rounded-xl bg-slate-700 px-4 py-2">
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4">
                                {gridDoots.map((doot, index) => {
                                    return (
                                        <MiniDootCard key={index} title={doot.title} description={doot.description} keywords={doot.keywords} imageUrl={doot.imageUrl} dootId={doot.id}/>
                                    )
                                })}
                                </div>
                            </div>
                        </div>
                    </div>
                )
                ||
                (window === 'network' && <DootNetwork />)
                ||
                (window === 'card' && <DootCard />)
            )}
            </div>
        </div>
        </DootContext.Provider>
    )
};

export default DootApp;