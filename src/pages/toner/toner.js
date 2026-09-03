// SpeakButton.tsx
import React, { useState, useEffect } from "react";

export default function TonePracticeApp() {
    const [text, setText] = useState("Hello, this text will be spoken!");
    const [voices, setVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState("en-US Google Voice");

    useEffect(() => {
        const synth = window.speechSynthesis;
        function loadVoices() {
            const list = synth.getVoices();
            setVoices(list);
            if (list.length > 0 && !selectedVoice) {
                setSelectedVoice(list[0].name);
            }
        }
        loadVoices();
        synth.onvoiceschanged = loadVoices;
        return () => {
            synth.onvoiceschanged = null;
        };
    }, [selectedVoice]);

    const handleSpeak = () => {
        const synth = window.speechSynthesis;
        if (!synth) {
            alert("Speech synthesis not supported.");
            return;
        }
        synth.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        const voice = voices.find(v => v.name === selectedVoice);
        if (voice) utter.voice = voice;
        synth.speak(utter);
    };

    return (
        <div className="p-6 max-w-md mx-auto space-y-4 font-sans">
            <textarea
                className="w-full border rounded p-2 text-gray-800"
                rows={3}
                value={text}
                onChange={e => setText(e.target.value)}
            />
            <div>
                <label className="block mb-1 text-sm font-medium">Select Voice:</label>
                <select
                    className="w-full border rounded p-2"
                    value={selectedVoice}
                    onChange={e => setSelectedVoice(e.target.value)}
                >
                    {voices.map((v, i) => (
                        <option key={i} value={v.name}>
                            {v.name} ({v.lang}){v.default ? " — default" : ""}
                        </option>
                    ))}
                </select>
            </div>
            <button
                onClick={handleSpeak}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded shadow"
            >
                🔊 Speak
            </button>
        </div>
    );
}
