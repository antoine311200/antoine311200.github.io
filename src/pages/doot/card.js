import React, { useState, useEffect, useRef, useContext } from "react";
import { MdOutlineEdit } from "react-icons/md";
import { IoEarth, IoTrashOutline, IoReturnUpBack } from "react-icons/io5";
import { IoIosFootball } from "react-icons/io";
import { LuClapperboard, LuAtom, LuLightbulb, LuMusic4, LuBookMarked, LuChurch } from "react-icons/lu";
import { HiOutlinePaintBrush } from "react-icons/hi2";
import { FaYinYang, FaMoneyBillWave } from "react-icons/fa";
import { GiInjustice } from "react-icons/gi";
import { FaBuildingColumns } from "react-icons/fa6";
import { BsThreeDotsVertical } from "react-icons/bs";
import { GiGecko } from "react-icons/gi";
import { IoCloudUploadOutline } from "react-icons/io5";
import { RxCross1 } from "react-icons/rx";

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

import { DootContext } from "./dootcontext";
import TagInput from "../../components/tags";

import { Buffer } from 'buffer';
window.Buffer = Buffer;

const lorem = "Lorem dolor sit amet, consectetur adipiscing elit. Pellentesque vel mi ut \
velit tempor aliquam eget eget enim. Proin cursus eleifend pretium. Aliquam cursus \
pellentesque interdum. Vivamus placerat id leo a pellentesque. Vivamus a congue urna,\
sed porta eros. Etiam finibus magna et est aliquam, sed semper libero facilisis. \
Donec lectus lorem, rhoncus vitae quam eget, vulputate gravida elit. Praesent ultricies\
eros id velit condimentum, eu ultrices nisl consequat."

const DootTags = {
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
    "animal": [<GiGecko className="text-lime-700" />, "lime"],
}

function toBase64(arr) {
    return btoa(
        arr.reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
}

const processImage = (image) => {
    if (image === null) image = "/images/doot/banner_placeholder.jpg";

    if (image instanceof File) {
        return <img src={URL.createObjectURL(image)} alt="Uploaded" className="w-full h-full object-cover" />
    }
    if (image instanceof Object) {
        const base64String = toBase64(image.data);
        return (<img src={`data:image/jpeg;base64,${base64String}`} alt="Placeholder" className="w-full h-full object-cover" />);
    }
    return (<img src={image} alt="Placeholder" className="w-full h-full object-cover" />);
};

export const MiniDootCard = ({ title = "Title", imageUrl = "/images/doot/banner_placeholder.jpg", dootId = 42 }) => {

    const { gridDoots, setGridDoots, doots, setDoots, setCurrentDoot, setWindow } = useContext(DootContext);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

    const handleClick = () => {
        setCurrentDoot(doots.find(doot => doot.id === dootId));
        setWindow('card');
    }

    const handleMenu = (e) => {
        e.stopPropagation();
        setIsMenuOpen(!isMenuOpen);
        setMenuPosition({ x: e.clientX + 15, y: e.clientY + 15 });
    }

    const deleteDoot = () => {
        setDoots(doots.filter(doot => doot.id !== dootId));
        setGridDoots(gridDoots.filter(doot => doot.id !== dootId));
    }

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest(`.dropdown-menu-${dootId}`)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('click', handleClickOutside);

        return () => {
            document.removeEventListener('click', handleClickOutside);
        }
    }, []);

    return (
        <div>
            <div className="relative flex flex-col rounded-xl bg-white px-2 py-1 md:p-2 cursor-pointer hover:shadow-lg hover:shadow-gray-900/20 hover:scale-105 transition-all duration-200 h-32 md:h-40"
                onClick={() => handleClick()}
            >
                <div className="relative overflow-hidden flex items-center text-white shadow-lg rounded-xl bg-gradient-to-r from-yellow-400 to-lime-400 shadow-slate-300 h-32">
                    {processImage(imageUrl)}
                </div>
                <div className="pt-1 md:pt-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[0.5em] md:text-xs font-semibold truncate">{title}</h2>
                        <button onClick={(e) => handleMenu(e)} className="text-gray-800 bg-opacity-90 hover:bg-opacity-100 transition-all duration-200 p-1 rounded-full text-xs hover:ring-1 ring-gray-900 ring-opacity-50">
                            <BsThreeDotsVertical />
                        </button>
                    </div>
                </div>

            </div>
            {isMenuOpen &&
                <div
                    className={`.dropdown-menu-${dootId} absolute bg-white rounded-md shadow-md p-2 flex flex-col gap-2 z-10 text-xs border border-gray-300`}
                    style={{ top: menuPosition.y, left: menuPosition.x }}
                >
                    <button className="text-left rounded-md hover:bg-gray-200 px-2 transition-all duration-300">
                        Edit
                    </button>
                    <button className="text-left rounded-md hover:bg-gray-200 px-2 transition-all duration-300"
                        onClick={() => deleteDoot()}>
                        Delete
                    </button>
                </div>}
        </div>
    )
};


export const DootCard = ({
    title = "Title",
    description = lorem,
    tags = ["music", "cinema", "Keyword 3", "Keyword 4", "Keyword 5"],
    imageUrl = "/images/doot/banner_placeholder.jpg",
    dootId = 42,
    back = true
}) => {

    const { currentDoot, setCurrentDoot, setWindow } = useContext(DootContext);

    const handleClick = () => {
        setCurrentDoot(null);
        setWindow('grid');
    }

    return (
        // Add a back button to return to grid view in absolute position
        <div className="sm:w-[80%] md:w-[80%] lg:w-[60%]">
            {/* <div className="mt-5 relative w-full max-w-[26rem] flex flex-col rounded-xl bg-white p-2 md:p-4 h-auto max-h-[30rem] md:max-h-[38rem]"> */}
            <div className="flex flex-col rounded-xl bg-white p-2 md:p-4 mx-auto">
                {back && <button className="hidden md:block z-10 absolute top-2 -left-16 p-2 text-white bg-slate-700 bg-opacity-60 hover:bg-opacity-100 transition-all duration-200 rounded-full text-3xl"
                    onClick={() => handleClick()}>
                    <IoReturnUpBack />
                </button>}
                <div className="h-48 relative overflow-hidden text-white shadow-lg rounded-xl bg-gradient-to-r from-yellow-400 to-lime-400 shadow-slate-300">
                    {processImage(imageUrl)}
                    {back && <div className="absolute top-2 right-2 flex gap-2">
                        <button className="text-white bg-yellow-400 bg-opacity-90 hover:bg-opacity-100 transition-all duration-200 p-1 rounded-full text-2xl" >
                            <MdOutlineEdit />
                        </button>
                        <button className="text-white bg-teal-400 bg-opacity-90 hover:bg-opacity-100 transition-all duration-200 p-1 rounded-full text-2xl" >
                            <IoTrashOutline />
                        </button>
                    </div>}
                </div>
                <div className="p-2 md:p-6 md:pb-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg md:text-2xl text-black font-semibold line-clamp-2">{title}</h2>
                    </div>
                    {/* <p className="font-sans antialiased break-all text-justify font-light leading-snug text-gray-700 text-xs md:text-sm mt-3 line-clamp-8 md:line-clamp-5"> */}
                    {/* <ReactMarkdown className="text-black"  remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} children={description}/> */}
                    {/* <div className="text-black"><ReactMarkdown>{description}</ReactMarkdown></div> */}
                    {/* </p> */}
                    <ReactMarkdown className="font-sans antialiased break-all font-light text-justify text-gray-700 text-sm leading-snug prose mt-3 line-clamp-8 md:line-clamp-5">{description}</ReactMarkdown>
                    <div className="inline-flex flex-wrap items-center gap-3 mt-2 group">
                        {tags.filter((_, index) => index < 3).map((keyword, index) => {
                            if (DootTags[keyword]) {
                                return (
                                    <div key={index} className="flex items-center gap-1">
                                        <div className={`w-4 h-4 p-4 flex items-center justify-center rounded-full bg-${DootTags[keyword][1]}-100 text-${DootTags[keyword][1]}-700`}>
                                            <span className="text-md">{DootTags[keyword][0]}</span>
                                        </div>
                                    </div>
                                )
                            }
                            return (<span key={index} className="text-xs text-yellow-700 bg-yellow-100 rounded-full px-2 py-1 mr-1">{keyword}</span>);
                        })}
                        {tags.length > 3 &&
                            <span className="text-xs text-yellow-700 bg-yellow-100 rounded-full px-2 py-1 mr-1">+{tags.length - 3} more</span>
                        }
                    </div>
                    <div className="pt-2">
                        <button
                            className="block w-full select-none rounded-lg bg-gray-900 py-2 px-2 text-center align-middle font-sans text-sm font-bold text-white shadow-md shadow-gray-900/10 transition-all hover:shadow-lg hover:shadow-gray-900/20 focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                            type="button">
                            See more
                        </button>
                    </div>
                </div>
            </div>
            <div>
                <button className="md:hidden flex flex-row items-center justify-center gap-x-2 mt-5 w-full select-none rounded-lg bg-emerald-700 py-3 px-2 text-center align-middle font-sans text-sm font-bold text-white shadow-md shadow-gray-900/10 transition-all hover:shadow-lg hover:shadow-gray-900/20 focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                    onClick={() => handleClick()}>
                    <IoReturnUpBack /> Back
                </button>
            </div>
        </div>
    )
}

export const DootCardEdit = ({
    title = "Title...",
    description = "Description...",
    tags = ["Keyword 1", "Keyword 2", "Keyword 3", "Keyword 4", "Keyword 5"],
    imageUrl = "https://caravanedesdixmots.com/placeholder-png/",
    links = []
}) => {

    const { currentDoot, setCurrentDoot, setWindow } = useContext(DootContext);

    const [editTitle, setTitle] = useState(title);
    const [editDescription, setDescription] = useState(description);
    const [editTags, setTags] = useState(tags);
    const [editImage, setImage] = useState(null);
    const [editLinks, setLinks] = useState(links);

    const handleDrop = (event) => {
        event.preventDefault();
        const droppedFile = event.dataTransfer.files[0];
        setImage(droppedFile);
    };

    const handleFileInputChange = (event) => {
        const selectedFile = event.target.files[0];
        setImage(selectedFile);
    };

    const handleClick = () => {
        setCurrentDoot(null);
        setWindow('grid');
    }


    return (
        <div className="flex justify-between gap-5 items-top w-screen text-white px-4 sm:px-16 md:px-16 lg:px-32 pt-12">
            <div className="w-full sm:w-full md:w-1/2 lg:w-1/2">
                <div className="flex flex-col bg-white p-4 rounded-lg gap-y-4">
                    <div>
                        <div className="flex items-center justify-between">
                        <label htmlFor="title" className="block text-sm font-medium leading-6 text-black">Title</label>
                        <button className="hidden md:block p-2 text-white bg-slate-700 bg-opacity-60 hover:bg-opacity-100 transition-all duration-200 rounded-full text-lg" onClick={() => handleClick()}><IoReturnUpBack />
                            </button>
                        </div>
                        <div className="mt-2">
                            <input id="title" name="title" type="text" placeholder="Doot title" required className="px-2 block w-full rounded-md bg-gray-50 border border-gray-300 py-1. text-md p-1 text-gray-900 shadow-sm ring-1 ring-gray-400 placeholder:text-gray-400 focus:ring-blue-500 focus:border-blue-500" onChange={(e) => setTitle(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium leading-6 text-black">Description</label>
                        <div className="mt-2">
                            <textarea className="resize-none rounded-md ring-1 text-black p-2 w-full h-24" onChange={(e) => setDescription(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="tags" className="block text-sm font-medium leading-6 text-black">Tags</label>
                        <div className="mt-2">
                            <TagInput id="tags" whitelist={Object.keys(DootTags)} onTagsChange={t => setTags(t)} />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="file-upload" className="block text-sm font-medium leading-6 text-black">Banner image</label>
                        <div className="mt-2 bg-gray-500 rounded-lg" onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
                            <div className="flex items-center justify-center w-full">
                                {!editImage ?
                                    <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
                                        <div className="flex flex-col items-center justify-between pt-5 pb-6">
                                            <IoCloudUploadOutline className="text-gray-500 text-4xl" />
                                            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">SVG, PNG, JPG or GIF (MAX. 800x400px)</p>
                                        </div>
                                        <input id="file-upload" type="file" className="hidden" onChange={handleFileInputChange}/>
                                    </label>
                                    : <div className="relative w-full h-32">
                                        <img src={URL.createObjectURL(editImage)} alt="Uploaded" className="w-full h-full object-contain" />
                                        <div className="absolute right-0 top-0 flex gap-2">
                                            <button className="text-white m-2 hover:text-yellow-400 transition-all duration-300 p-1 rounded-full text-2xl"
                                             onClick={() => setImage(null)}>
                                                <RxCross1 />
                                            </button>
                                        </div>
                                        <div className="absolute bottom-0 right-0 bg-gray-900 bg-opacity-50 p-1 text-white text-xs">
                                            {editImage.name}
                                        </div>
                                    </div>
                                }
                            </div>
                        </div>
                    </div>
                    <div>
                        <button
                            className="block w-full select-none rounded-lg bg-gray-900 py-2 px-2 text-center align-middle font-sans text-sm font-bold text-white shadow-md shadow-gray-900/10 transition-all hover:shadow-lg hover:shadow-gray-900/20 focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                            type="button">
                            Create Doot
                        </button>
                    </div>
                </div>
            </div>
            <div className="hidden sm:hidden md:flex lg:flex md:w-1/2 h-auto items-center justify-center">
                <DootCard back={false} title={editTitle || "Placeholder Title"} description={editDescription || lorem} tags={editTags} imageUrl={editImage} />
            </div>
        </div>
    )
};

export class Doot {
    constructor(id = 42, title = "Titre", description = "", tags = [], imageUrl = null, links = []) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.tags = tags;
        this.imageUrl = imageUrl;
        this.links = links;
    }

    create() {
        return (
            <DootCard
                title={this.title}
                description={this.description}
                tags={this.tags}
                imageUrl={this.imageUrl}
                id={this.id}
            />
        )
    }
}

export const emptyDoot = new Doot(0, "", "", [], "https://caravanedesdixmots.com/placeholder-png/", []);