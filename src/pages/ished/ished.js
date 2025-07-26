import { useState, useRef, useEffect } from "react";
import SearchBar from "./searchbar";
import List from "./list";
import Modal from "./modal";

// import data from "./data.json";
// import themes from "./themes.json";

let data = JSON.parse(localStorage.getItem("data")) || [];
let themes = JSON.parse(localStorage.getItem("themes")) || [];

export default function IshedApp() {
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [filteredCards, setFilteredCards] = useState([]);
    const [modalCard, setModalCard] = useState(null);
    const [isFocus, setFocus] = useState(false);
    const mainDivRef = useRef(null);

    const handleSearch = (q) => {
        setQuery(q);
        const results = data.filter(
            (Card) =>
                q !== "" && (
                    Card.title.toLowerCase().includes(q.toLowerCase()) ||
                    Card.keywords.some((kw) => kw.toLowerCase().includes(q.toLowerCase())) ||
                    Card.description.toLowerCase().includes(q.toLowerCase())
                )
        );
        setFilteredCards(results);
        setSelectedIndex(0);
    };

    const onSave = (card) => {
        // Save in the json file
        let refinedCard = {
            title: card.title,
            description: card.description,
            keywords: card.keywords.map((kw) => kw.name),
            color: card.color,
        };

        // Check that the title doesn't already exist
        let existingCard = data.find((Card) => Card.title === refinedCard.title);
        if (existingCard) return;

        let newThemes = card.keywords.filter((kw) => !themes.includes(kw));
        console.log("save");
        console.log(themes);
        console.log(newThemes);

        if (newThemes.length > 0) {
            themes.push(...newThemes);
            console.log(themes);
            localStorage.setItem("themes", JSON.stringify(themes));
        }
        data.push(refinedCard);
        console.log(data);
        handleSearch(query);
        handleCloseModal();
    };

    const handleKeyDown = (e) => {
        if (modalCard) return;
        if (e.key === "ArrowDown") {
            setSelectedIndex((prev) => Math.min(prev + 1, filteredCards.length + 1));
        } else if (e.key === "ArrowUp") {
            setSelectedIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === "Enter") {
            if (selectedIndex === 0) {
                setModalCard({ isNew: true });
            } else {
                setModalCard(filteredCards[selectedIndex - 1]);
            }
        }
    };

    const handleCloseModal = () => {
        setModalCard(null);
        requestAnimationFrame(() => {
            mainDivRef.current?.focus();
        });
    };

    useEffect(() => {
        localStorage.setItem("data", JSON.stringify(data));
        localStorage.setItem("themes", JSON.stringify(themes));
    }, [data, themes]);

    return (
        <div tabIndex="1" ref={mainDivRef} className="h-screen bg-gray-900 text-white flex flex-col items-center" onKeyDown={handleKeyDown}>
            <SearchBar query={query} onSearch={handleSearch} setFocus={setFocus} />
            <List cards={filteredCards} selectedIndex={selectedIndex} setSelectedIndex={setSelectedIndex} setModalCard={setModalCard} isFocus={isFocus} />
            {modalCard && <Modal card={modalCard} onClose={handleCloseModal} onSave={onSave} />}
        </div>
    );
}
