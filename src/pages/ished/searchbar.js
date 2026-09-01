

export default function SearchBar({ query, onSearch, onKeyDown, setFocus }) {
    return (
        <div className="relative mt-24 w-2/3">
            <input
                type="text"
                value={query}
                onChange={(e) => onSearch(e.target.value)}
                onKeyDown={onKeyDown}
                onFocus={() => setFocus(true)}
                onBlur={() => setFocus(false)}
                className="w-full p-6 text-xl bg-gray-800 rounded-xl border-gray-600 focus:outline-none focus:border-white"
                placeholder="Search memos..."
            />
            {/* <i className="absolute  text-gray-400 hover:text-gray-600 cursor-pointer">
                <i className="fa fa-search"></i>
            </i> */}
        </div>
    );
}