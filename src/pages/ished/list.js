// Import Fa Plus button
import { FaPlus } from "react-icons/fa";

export default function List({ cards, isFocus, selectedIndex, setSelectedIndex, setModalCard  }) {
    return (
        // isFocus &&
        <ul className="w-2/3 bg-gray-800 mt-2 rounded-md max-h-60 overflow-auto">
            <li
                className={`text-sm p-1.5 text-emerald-400 cursor-pointer ${selectedIndex === 0 ? "bg-gray-700" : ""}`}
                onClick={() => setSelectedIndex(0)}
                onDoubleClick={() => setModalCard({ isNew: true })}
            >
                <span className="flex gap-x-2 flex-wrap"><FaPlus /> Create New</span>
            </li>
            <li className={`text-sm p-1.5 text-amber-400 cursor-pointer ${selectedIndex === 1 ? "bg-gray-700" : ""}`}
                onClick={() => setSelectedIndex(1)}>
                <span className="flex gap-x-2 flex-wrap"><FaPlus /> Create New Theme</span>
            </li>
            {cards.map((card, idx) => (
                <li
                    key={idx}
                    className={`p-3 cursor-pointer ${selectedIndex === idx + 2 ? "bg-gray-700" : ""}`}
                    onClick={() => setSelectedIndex(idx + 2)}
                    onDoubleClick={() => setModalCard(card)}
                >
                    <span className="flex gap-x-2 flex-wrap">
                    {card.title}
                    {card.keywords.map((kw, idx) => (
                        <span className="inline-flex items-center rounded-md bg-indigo-950 px-2 py-1 text-xs font-medium border-[0.05em] border-indigo-500 text-indigo-500 ring-1 ring-indigo-700/10 ring-inset" key={idx} >{kw}</span>
                    ))}
                    </span>
                </li>
            ))}
        </ul>
    );
}