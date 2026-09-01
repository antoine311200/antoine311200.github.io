import { useState } from "react";
import { VscOpenPreview } from "react-icons/vsc";

// Import markdown parser
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

import themes from "./themes.json";
import e from "cors";

const ColorPalette = ({ colors, isOpen, selectedColor, setSelectedColor }) => {
    return (isOpen &&
        <div className="relative top-6 left-6">
            <div className="absolute mt-2 bg-gray-900 border border-gray-700 p-2 grid grid-cols-6 gap-2 w-60 rounded shadow-md">
                {colors.map((color) => (
                    <div
                        key={color}
                        className="w-8 h-8 rounded-full cursor-pointer border-2 flex items-center justify-center"
                        style={{ backgroundColor: color, borderColor: color === selectedColor ? "white" : "transparent" }}
                        onClick={() => setSelectedColor(color)}
                    >
                        {color === selectedColor && "✔"}
                    </div>
                ))}
            </div>
        </div>
    )
};

const Preview = ({ card, setPreview }) => {

    const formatText = (text) => {
        const colorRegex = /(r|g|b|m|y|c|w|k)\{(.*?)\}/g;
        const hexRegex = /#([0-9a-fA-F]{6})\{(.*?)\}/g;

        const colorMap = {
            'r': 'red',
            'g': 'green',
            'b': 'blue',
            'm': 'magenta',
            'y': 'yellow',
            'c': 'cyan',
            'w': 'white',
            'k': 'black'
        };

        text = text.replace(colorRegex, (match, colorCode, content) => {
            return `<span style="color: ${colorMap[colorCode]}">${content}</span>`;
        });

        text = text.replace(hexRegex, (match, hex, content) => {
            return `<span style="color: #${hex}">${content}</span>`;
        });

        return text;
    }

    const handleExit = (e) => {
        if (e.key === "Escape") {
            setPreview(false);
        }
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50" onKeyDown={handleExit} tabIndex={1}>
            <div className="relative bg-gray-900 text-white p-6 rounded-xl w-2/5 border" style={{ borderColor: card.color }}>
                <button className="absolute top-2 right-4 text-white text-xl" onClick={() => setPreview(false)}>×</button>
                <div className="text-lg mb-2"><ReactMarkdown children={formatText(card.title)} /></div>
                <div className="flex gap-2 mt-2 mb-4">
                    {card.keywords.map((keyword) => (
                        <span key={keyword.name} style={{ color: keyword.color, borderColor: keyword.color }} className="text-xs px-2 py-1 border-[0.05em] rounded-md flex items-center gap-2 bg-opacity-5" >
                            {keyword.name}
                        </span>
                    ))}
                </div>
                <div className="text-sm">
                    <ReactMarkdown
                        children={formatText(card.description)}
                        rehypePlugins={[rehypeRaw]} />
                </div>
            </div>
        </div>
    );
};

const previewMd = `## Title r{red text}

This is very __b{interesting in blue}__

Additionally, this is a #fe45f2{test in hex}`;

export default function Modal({ card, onClose, onSave }) {
    const [title, setTitle] = useState(card?.title || "This is a preview");
    const [description, setDescription] = useState(card?.description || previewMd);
    const [keywordInput, setKeywordInput] = useState("");
    const [keywords, setKeywords] = useState(card?.keywords || [themes[0], themes[1]]);
    const [filteredKeywords, setFilteredKeywords] = useState([]);
    const [selectedColor, setSelectedColor] = useState("#14b8a6");
    const [themeColor, setThemeColor] = useState("#14b8a6");
    const [colorMenu, isColorMenu] = useState(false);
    const [colorThemeMenu, setColorThemeMenu] = useState(false);
    const [info, setInfo] = useState("");
    const [isPreview, setPreview] = useState(card.title ? true : false);

    const colors = [
        "#FF6B6B", "#FFE66D", "#4ECDC4", "#556270", "#C7F464",
        "#FF9F1C", "#2EC4B6", "#E71D36", "#FF9F1C", "#6BFFB3",
        "#F25F5C", "#50514F", "#F4A261", "#2A9D8F", "#E76F51",
        "#264653", "#E9C46A", "#F4A261", "#2A9D8F", "#E76F51",
        "#FF1654", "#247BA0", "#70C1B3", "#B2DBBF", "#F3FFBD",
        "#FF6F61", "#6B5B95", "#88B04B", "#F7CAC9", "#92A8D1"
    ];

    const handleSearch = (q) => {
        const results = themes.filter(
            (keyword) => q !== "" && keyword.name.toLowerCase().includes(q.toLowerCase()) && !keywords.includes(keyword.name)
        );
        console.log(results);
        setFilteredKeywords(results);
        setInfo("");
    };

    const handleClick = (keyword) => {
        setKeywords((prev) => [...new Set([...prev, keyword])]);
        setFilteredKeywords((prev) => prev.filter(k => k.name !== keyword.name));
        setInfo("");
    };

    const addKeyword = (e) => {
        if (e.key === "Enter" && keywordInput.trim()) {
            if (!keywords.some(k => k.name === keywordInput)) {
                setKeywords((prev) => [...new Set([...prev, { name: keywordInput, color: themeColor }])]);
                setKeywordInput("");
            }
            else {
                setInfo("Keyword already exists");
            }
        }
    };

    const removeKeyword = (keyword) => {
        setKeywords((prev) => prev.filter(k => k.name !== keyword.name));
        setInfo("");
    };


    return (
        !isPreview ?
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-gray-900 text-white p-6 rounded-xl w-2/5 border border-gray-700">
                    <div className="flex justify-between">
                        <h2 className="text-lg mb-4" style={{ color: selectedColor }}>Create a New Card</h2>
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full border-2 cursor-pointer" style={{ backgroundColor: selectedColor }} onClick={() => isColorMenu(!colorMenu)}>
                                <ColorPalette colors={colors} isOpen={colorMenu} selectedColor={selectedColor} setSelectedColor={setSelectedColor} />
                            </div>
                            <VscOpenPreview className="cursor-pointer w-8 h-8" style={{ color: selectedColor }} onClick={() => setPreview(true)} />
                        </div>
                    </div>

                    <input
                        className="w-full p-2 bg-gray-800 border border-gray-700 text-white rounded mt-2"
                        placeholder="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />

                    <textarea
                        className="w-full p-2 bg-gray-800 border border-gray-700 text-white rounded mt-2"
                        rows="8"
                        placeholder="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />

                    <div className="mt-2">
                        <div className="flex justify-between items-center gap-3">
                            <input
                                className="w-full p-2 bg-gray-800 border border-gray-700 text-white rounded"
                                placeholder="Enter keywords and press Enter"
                                value={keywordInput}
                                onChange={(e) => { setKeywordInput(e.target.value); handleSearch(e.target.value); }}
                                onKeyDown={addKeyword}
                            />
                            <div className="w-8 h-8 rounded-full border-2 cursor-pointer" style={{ backgroundColor: themeColor }} onClick={() => setColorThemeMenu(!colorThemeMenu)}>
                                <ColorPalette colors={colors} isOpen={colorThemeMenu} selectedColor={themeColor} setSelectedColor={setThemeColor} />
                            </div>
                        </div>
                        <div className="relative flex flex-wrap gap-2 mt-2">
                            {keywords.map((keyword) => (
                                <span key={keyword.name} className="text-white px-2 py-1 rounded flex items-center gap-2" style={{ backgroundColor: keyword.color }}>
                                    {keyword.name}
                                    <button onClick={() => removeKeyword(keyword)} className="text-sm font-bold">×</button>
                                </span>
                            ))}
                        </div>
                        <ul className="absolute w-[200px] bg-gray-800 mt-2 rounded-md max-h-60 overflow-auto">
                            {filteredKeywords.map((keyword, idx) => (
                                <li
                                    key={idx}
                                    className={`p-3 cursor-pointer`}
                                    onClick={() => handleClick(keyword)}
                                >
                                    <span className="flex gap-x-2 flex-wrap" style={{ color: keyword.color }}>
                                        {keyword.name}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-red-500 text-sm mt-2">{info}</p>

                    <div className="flex justify-end gap-3 mt-4">
                        <button className="px-4 py-2 border border-gray-700 text-gray-300 rounded" onClick={onClose}>Close</button>
                        <button className="px-4 py-2 hover:bg-teal-600 text-white rounded" style={{ backgroundColor: selectedColor }} onClick={() => { onSave(
                            { title: title, description: description, keywords: keywords, color: selectedColor }
                        ); }}>Save</button>
                    </div>
                </div>
            </div> : <Preview card={{ title: title, description: description, keywords: keywords, color: selectedColor }} setPreview={setPreview} />
    );
}