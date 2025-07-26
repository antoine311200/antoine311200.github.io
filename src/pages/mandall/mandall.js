import React, { useState, useEffect, useRef } from "react";
import data from "../../data/freq_mandarin.json";
import meanings from "../../data/hanzicraft_meanings.json";

import { IoChevronDown, IoAddCircleOutline, IoCheckmarkCircleOutline, IoCheckmarkCircle } from "react-icons/io5";

import "../../index.css";

function useStickyState(defaultVal, key) {
    const [val, setVal] = useState(() => {
        const stored = window.localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultVal;
    });
    useEffect(() => {
        window.localStorage.setItem(key, JSON.stringify(val));
    }, [key, val]);
    return [val, setVal];
}

const profile1000 = data.slice(0, 1000);
const profile2000 = data.slice(1000, 2000);
const profile3000 = data.slice(2000, 3000);
const profile4000 = data.slice(3000, 4000);

function chineseToneTransform(input) {
    const toneMap = {
        a: ["ā", "á", "ǎ", "à"],
        e: ["ē", "é", "ě", "è"],
        i: ["ī", "í", "ǐ", "ì"],
        o: ["ō", "ó", "ǒ", "ò"],
        u: ["ū", "ú", "ǔ", "ù"],
        ü: ["ǖ", "ǘ", "ǚ", "ǜ"],
        v: ["ǖ", "ǘ", "ǚ", "ǜ"]
    };

    const syllables = input.trim().split(/\s+/);
    const accented = [];
    const tones = [];

    syllables.forEach(syl => {
        const m = syl.match(/^([a-züv]+)([1-5])$/i);
        if (!m) {
            accented.push(syl);
            tones.push(null);
            return;
        }
        let [, letters, toneChar] = m;
        let toneNum = parseInt(toneChar, 10);
        tones.push(toneNum);

        if (toneNum === 5) {
            accented.push(letters.toLowerCase());
            return;
        }

        const lettersLower = letters.toLowerCase();
        const vowelOrder = ["a", "o", "e"];
        let vow = null;
        for (const v of vowelOrder) {
            if (lettersLower.includes(v)) {
                vow = v;
                break;
            }
        }
        if (!vow) {
            // special combos: iu (mark u), ui (mark i)
            if (lettersLower.includes("iu")) vow = "u";
            else if (lettersLower.includes("ui")) vow = "i";
            else {
                const m2 = lettersLower.match(/[aeiouvü]/);
                vow = m2 ? m2[0] : null;
            }
        }
        if (!vow) {
            accented.push(lettersLower);
            return;
        }

        const toneCharOut = toneMap[vow][toneNum - 1];
        // replace first occurrence
        const accentedSyl = lettersLower.replace(vow, toneCharOut);
        accented.push(accentedSyl);
    });

    return { accented, tones };
}

export default function MandallApp() {
    const [characters] = useState(data);
    const [selectedCharacters, setSelectedCharacters] = useStickyState([], "mandall:selected");
    const [selectedCharacter, setSelectedCharacter] = useState(null);
    const [showFront, setShowFront] = useState(true);

    const [profiles, setProfiles] = useStickyState({
        "Set 1k": profile1000,
        "Set 2k": profile2000,
        "Set 3k": profile3000,
        "Set 4k": profile4000,
    }, "mandall:profiles");
    const [activeProfile, setActiveProfile] = useStickyState("", "mandall:activeProfile");
    const [newProfileName, setNewProfileName] = useState("");
    const [visibleCharacters, setVisibleCharacters] = useState(1000);
    const [rows, setRows] = useState([]);

    const [open, setOpen] = useState(false);
    const contentRef = useRef(null);
    const [contentHeight, setContentHeight] = useState("0px");

    const togglePanel = () => {
        setOpen(o => !o);
    };
    useEffect(() => {
        const el = contentRef.current;
        if (el) {
            if (open) {
                setContentHeight(`${el.scrollHeight}px`);
            } else {
                setContentHeight("0px");
            }
        }
    }, [open, profiles, activeProfile, newProfileName]);

    const toggleCharacter = (char) => {
        setSelectedCharacter(null);
        setSelectedCharacters(prev =>
            prev.includes(char) ? prev.filter(c => c !== char) : [...prev, char]
        );
    };
    const showCharacter = (char) => {
        setSelectedCharacter(char);
        setShowFront(true);
    };
    const pickRandom = () => {
        if (selectedCharacters.length) {
            const rand = selectedCharacters[Math.floor(Math.random() * selectedCharacters.length)];
            showCharacter(rand);
        }
    };

    // On spacebar press, pick a random character
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === "Enter") {
                e.preventDefault();
                pickRandom();
            }
            if (e.code === "Space") {
                e.preventDefault();
                setShowFront(prev => !prev);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [selectedCharacters]);

    const saveProfile = () => {
        let profileName = activeProfile || newProfileName.trim();
        if (!profileName) return;
        setProfiles(prev => ({ ...prev, [profileName]: selectedCharacters }));
        setActiveProfile(profileName);
        setNewProfileName("");
    };
    const loadProfile = (name) => {
        setActiveProfile(name);
        setSelectedCharacters(profiles[name] || []);
        setSelectedCharacter(null);
    };
    const clearProfile = () => {
        if (!activeProfile) return;
        const p = { ...profiles };
        delete p[activeProfile];
        setProfiles(p);
        setActiveProfile("");
        setSelectedCharacters([]);
        setSelectedCharacter(null);
    };

    const showMore = (more) => {
        setVisibleCharacters(prev => Math.min(prev + more, characters.length));
    };

    useEffect(() => {
        const newRows = [];
        for (let i = 0; i < Math.min(visibleCharacters, characters.length); i += 10) {
            newRows.push(characters.slice(i, i + 10));
        }
        setRows(newRows);
    }, [visibleCharacters, characters]);

    return (
        <div className="flex flex-col-reverse md:flex-row h-screen relative white-scrollbar">
            <div className="h-1/3 md:h-screen md:w-1/2 border-r bg-gray-100 border-gray-300 p-4 overflow-auto relative">
                <div className="flex flex-col  mb-4">
                    <div className="grid grid-cols-10 gap-2 font-kaiti ">
                        {rows.map((row, ridx) =>
                            row.map((char, idx) => {
                                const selected = selectedCharacters.includes(char);
                                const single = selectedCharacter === char;
                                const globalIdx = ridx * row.length + idx + 1;
                                return (
                                    <div key={`${ridx}-${idx}`}
                                        onClick={() => toggleCharacter(char)}
                                        onDoubleClick={() => showCharacter(char)}
                                        className={`relative cursor-pointer border rounded py-2 flex items-center justify-center text-xl select-none bg-white hover:bg-gray-100
                                        ${selected && "border-green-400"}`}>
                                        {char}
                                        {selected && (
                                            <span className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2
                                            inline-block text-base leading-none text-green-500
                                            rounded-full px-[2px] py-[1px]"
                                            >
                                                <IoCheckmarkCircle className="inline-block" />
                                            </span>
                                        )}

                                    </div>
                                );
                            })
                        )}
                    </div>
                    {selectedCharacters.length < data.length && (
                        <div className="self-center mt-4 text-sm text-gray-600 mb-10 flex items-center gap-2">
                            <button onClick={() => showMore(100)} className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50" disabled={visibleCharacters >= characters.length}>+ 100</button>
                            <button onClick={() => showMore(250)} className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50" disabled={visibleCharacters >= characters.length}>+ 250</button>
                            <button onClick={() => showMore(500)} className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50" disabled={visibleCharacters >= characters.length}>+ 500</button>
                        </div>
                    )}
                </div>

                {/* Collapsible profile panel */}
                <div className={`fixed left-4 bottom-4 bg-gray-50 shadow-lg rounded ${open ? "w-56 md:w-96" : "w-32 md:w-48"} transition-max-width duration-300 overflow-hidden`}>
                    <button
                        onClick={togglePanel}
                        className="w-full flex justify-between items-center px-3 py-2"
                    >
                        <span className="font-medium">Profiles:</span>
                        <span className={`transform transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
                            <IoChevronDown />
                        </span>
                    </button>
                    <div
                        ref={contentRef}
                        style={{ maxHeight: contentHeight }}
                        className="overflow-hidden transition-max-height duration-300"
                    >
                        <div className="flex items-center space-x-2 mb-2 px-3">
                            <select
                                className="flex-grow border px-2 py-1"
                                value={activeProfile}
                                onChange={e => loadProfile(e.target.value)}
                            >
                                <option value="">New profile</option>
                                {Object.keys(profiles).map(n => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                            <button onClick={clearProfile}
                                disabled={!activeProfile}
                                className="bg-red-500 text-white px-2 py-1 rounded disabled:opacity-50">
                                Clear
                            </button>
                        </div>
                        <div className="flex items-center space-x-2 px-3 pb-3">
                            <input type="text"
                                placeholder="New name"
                                value={activeProfile || newProfileName}
                                onChange={e => setNewProfileName(e.target.value)}
                                className="w-24 border px-2 py-1 flex-grow"
                            />
                            <button onClick={saveProfile}
                                className="bg-green-600 text-white px-3 py-1 rounded">
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-2/3 md:h-screen md:w-1/2 border-r flex flex-col items-center justify-center bg-gray-50 p-4 relative">
                {selectedCharacter ? (
                    <div onClick={() => setShowFront(!showFront)}
                        className="w-3/4 h-2/3 bg-white rounded-lg shadow-md flex items-center justify-center cursor-pointer select-none p-8 transform hover:scale-105 transition">
                        {showFront ? (
                            <div className="text-9xl font-kaiti">{selectedCharacter}</div>
                        ) : (
                            <div className="flex flex-col items-center text-center text-3xl text-gray-700">
                                <div className="text-9xl font-kaiti">{selectedCharacter}</div>
                                <div className="border-t border-gray-300 my-4 w-full"></div>
                                <div className="text-lg text-left text-gray-600 mb-4 overflow-y-auto overflow-x-auto max-h-32 md:max-h-64 flex flex-row flex-wrap gap-4">
                                    {meanings[selectedCharacter].map((m, idx) => {
                                        const [firstPart, ...rest] = m.split("-");
                                        const res = chineseToneTransform(firstPart);
                                        const tone = res.tones[0];
                                        const coloredTone = <span className={`text-2xl font-bold ${tone === 1 ? "text-red-500" : tone === 2 ? "text-blue-500" : tone === 3 ? "text-green-500" : tone === 4 ? "text-purple-500" : "text-gray-500"}`}>{res.accented[0]}</span>;
                                        return (
                                            <div key={idx} className="mb-1">
                                                <div>{coloredTone}</div>
                                                {rest.length > 0 && (
                                                    <ol className="list-disc list-inside pl-4 text-gray-700 text-xs">
                                                        {rest.join('/').split('/').map((part, ridx) => (
                                                            part.trim() && <li key={ridx}>{part}</li>
                                                        ))}
                                                    </ol>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-gray-500 mb-4">Select or randomize a character</div>
                )}
                <div className="mt-4 text-sm text-gray-600">
                    {selectedCharacters.length > 0
                        ? `Selected ${selectedCharacters.length} characters in "${activeProfile || 'current'}"`
                        : "No characters selected"}
                </div>
                <button onClick={pickRandom}
                    disabled={selectedCharacters.length === 0}
                    className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50">
                    Random
                </button>
            </div>
        </div>
    );
}
