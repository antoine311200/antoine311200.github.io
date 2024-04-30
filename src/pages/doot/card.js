import React, { useState, useEffect, useRef, useContext } from "react";
import { MdOutlineEdit } from "react-icons/md";
import { IoEarth } from "react-icons/io5";
import { IoIosFootball } from "react-icons/io";
import { LuClapperboard, LuAtom, LuLightbulb, LuMusic4, LuBookMarked, LuChurch } from "react-icons/lu";
import { HiOutlinePaintBrush } from "react-icons/hi2";
import { FaYinYang, FaMoneyBillWave } from "react-icons/fa";
import { GiInjustice } from "react-icons/gi";
import { FaBuildingColumns } from "react-icons/fa6";



import { DootContext } from "./dootcontext";

const DootKeywords = {
    "geography": [<IoEarth className="text-blue-700" />, "blue"],
    "cinema": [<LuClapperboard className="text-red-700" />, "red"],
    "science": [<LuAtom className="text-lime-700" />, "lime"],
    "history": [<FaBuildingColumns className="text-yellow-700" />, "yellow"],
    "art": [<HiOutlinePaintBrush className="text-green-700" />, "green"],
    "technology": [<LuLightbulb className="text-slate-700" />, "slate"],
    "music": [<LuMusic4 className="text-violet-700" />, "violet"],
    "literature": [<LuBookMarked className="text-pink-700" />, "pink"],
    "philosophy": [<FaYinYang className="text-amber-700" />, "amber"],
    "sports": [<IoIosFootball className="text-orange-700" />, "orange"],
    "politics": [<GiInjustice className="text-gray-700" />, "gray"],
    "economics": [<FaMoneyBillWave className="text-teal-700" />, "teal"],
    "religion": [<LuChurch className="text-emerald-700" />, "emerald"],
}

export const DootCard = ({
    title = "Title",
    description = "Lorem dolor sit amet, consectetur adipiscing elit. Pellentesque vel mi ut \
    velit tempor aliquam eget eget enim. Proin cursus eleifend pretium. Aliquam cursus \
    pellentesque interdum. Vivamus placerat id leo a pellentesque. Vivamus a congue urna,\
    sed porta eros. Etiam finibus magna et est aliquam, sed semper libero facilisis. \
    Donec lectus lorem, rhoncus vitae quam eget, vulputate gravida elit. Praesent ultricies\
    eros id velit condimentum, eu ultrices nisl consequat.",
    keywords = ["music", "cinema", "Keyword 3", "Keyword 4", "Keyword 5"],
    imageUrl = "/images/doot/banner_placeholder.jpg"
}) => {
    return (
        // Create a card container
        <div className="relative w-full max-w-[26rem] flex flex-col rounded-xl bg-white p-4 h-auto max-h-[80%">
            <div className="relative overflow-hidden text-white shadow-lg rounded-xl bg-gradient-to-r from-yellow-400 to-lime-400 shadow-slate-300">
                <img src={imageUrl} alt="Placeholder" className="w-full object-cover" />
                <div>
                    <button className="absolute top-2 right-2 text-white bg-yellow-400 bg-opacity-80 hover:bg-opacity-100 transition-all duration-200 p-1 rounded-full text-2xl" >
                        <MdOutlineEdit />
                    </button>
                </div>
            </div>
            <div className="p-6 pb-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold">{title}</h2>
                </div>
                <p className="font-sans antialiased text-justify font-light leading-snug text-gray-700 text-sm mt-3 line-clamp-5">{description}</p>
                <div class="inline-flex flex-wrap items-center gap-3 mt-2 group">
                    {keywords.filter((keyword, index) => index < 3).map((keyword, index) => {
                        if (DootKeywords[keyword]) {
                            return (
                                <div key={index} className="flex items-center gap-1">
                                    <div className={`w-4 h-4 p-4 flex items-center justify-center rounded-full bg-${DootKeywords[keyword][1]}-100 text-${DootKeywords[keyword][1]}-700`}>
                                        <span className="text-md">{DootKeywords[keyword][0]}</span>
                                    </div>
                                </div>
                            )
                        }
                        return (<span key={index} class="text-xs text-yellow-700 bg-yellow-100 rounded-full px-2 py-1 mr-1">{keyword}</span>);
                    })}
                    {keywords.length > 3 &&
                    <span class="text-xs text-yellow-700 bg-yellow-100 rounded-full px-2 py-1 mr-1">+{keywords.length - 3} more</span>
                    }
                </div>
                <div class="pt-2">
                    <button
                    class="block w-full select-none rounded-lg bg-gray-900 py-2 px-2 text-center align-middle font-sans text-sm font-bold text-white shadow-md shadow-gray-900/10 transition-all hover:shadow-lg hover:shadow-gray-900/20 focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                    type="button">
                    See more
                    </button>
                </div>
            </div>
        </div>
    )
}

export const DootCardEdit = ({
    title = "Title...",
    description = "Description...",
    keywords = ["Keyword 1", "Keyword 2", "Keyword 3", "Keyword 4", "Keyword 5"],
    imageUrl = "/images/doot/banner_placeholder.jpg"
}) => {

};