import React, { useState, useEffect, useRef } from "react";

import { DootContext } from "./dootcontext";

import DootConnection from "./login";
import { DootCard } from "./card";
import DootNetwork from "./network";

function DootApp() {

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const toggleMenu = (event) => {
        setIsMenuOpen(!isMenuOpen);
    }

    // Get the connection status from the cookie
    const [isConnected, setIsConnected] = useState(false);
    useEffect(() => {
        const connectionStatus = localStorage.getItem("isConnected");
        if (connectionStatus) {
            setIsConnected(connectionStatus);
        }
    }, []);

    return (
        <DootContext.Provider value={{ isConnected, setIsConnected }}>
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

            { !isConnected ?
                <div className="flex flex-col items-center mt-[22%] md:mt-[7%] h-screen">
                    <DootConnection />
                </div>
                :
                <div className="flex flex-col items-center mt-[22%] md:mt-[7%] h-screen">
                    {/* <DootCard /> */}
                    <DootNetwork />
                </div>
            }
        </div>
        </DootContext.Provider>
    )
};

export default DootApp;