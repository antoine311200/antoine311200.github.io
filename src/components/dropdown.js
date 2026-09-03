import React, { useRef, useState, useEffect } from 'react';

const SelectMenu = ({ name, selected, setSelected, options = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, []);

  const selectedOption = options.find(o => o.value === selected) || options[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(s => !s)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm
          bg-slate-800/70 border border-slate-700 text-slate-300
          hover:border-slate-500 hover:text-slate-200
          transition-colors duration-150 whitespace-nowrap focus:outline-none"
      >
        {selectedOption?.label}
        <svg
          className={`w-3 h-3 text-slate-500 transition-transform duration-150 flex-shrink-0
            ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 10 6"
          fill="none"
        >
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="m1 1 4 4 4-4"
          />
        </svg>
      </button>

      {isOpen && (
        <ul
          className="absolute z-40 right-0 mt-1.5 min-w-[10rem] py-1 rounded-lg
            border border-slate-700 bg-slate-900
            shadow-xl shadow-black/50 overflow-hidden"
        >
          {options.map(option => (
            <li
              key={option.value}
              onClick={() => { setSelected(option.value); setIsOpen(false); }}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors duration-100
                ${option.value === selected
                  ? 'text-orange-300 bg-slate-800'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SelectMenu;
