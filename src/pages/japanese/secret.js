import React, { useState, useEffect, useRef } from "react";
import { isMobile } from 'react-device-detect';

import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

import "../../style/secret.css";

import WordTrainer from "./word";
import SentenceTrainer from "./sentence";


const Tabs = ({ activeTab, setActiveTab }) => {

    const handleTabClick = (tab) => {
        setActiveTab(tab);
    };

    return (
        <div className="flex flex-col items-center gap-10">
            <div className="w-96 z-10 mb-36 pt-4">
                <div className="mx-8 shadow rounded border content-center h-10 flex p-1 relative items-center bg-gray-200">
                    <div
                        className={`w-full flex justify-center h-[95%]
                        }`}
                    >
                        <button className="w-full" onClick={() => handleTabClick('left')}>語彙</button>
                    </div>
                    <div
                        className={`w-full flex justify-center h-[95%]
                        }`}
                    >
                        <button className="w-full" onClick={() => handleTabClick('right')}>文章</button>
                    </div>
                    <span
                        className={`bg-white shadow text-gray-800 flex items-center justify-center w-1/2 rounded h-8 transition-all top-[4px] absolute ${activeTab == 'left' ? 'left-1' : 'left-[155px]'}`}>
                        {activeTab == 'left' ? '語彙' : '文章'}
                    </span>
                </div>
            </div>
        </div>
    );
};


function JapaneseApp() {

    const [activeTab, setActiveTab] = useState('left');

    return (
        <div className="bg-slate-800 h-screen w-screen">

            {/* Tabs */}
            <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

            {activeTab === 'left' ? <WordTrainer /> : <SentenceTrainer />}


        </div >
    )
};

export default JapaneseApp;