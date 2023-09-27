import React, { useRef, useState, useEffect } from 'react';

const dummyOptions = [
    { value: '', label: 'All Tags' },
    { value: 'mathematics', label: 'Mathematics' },
    { value: 'tensor networks', label: 'Tensor networks' },
    { value: 'chemistry', label: 'Chemistry' },
];

const SelectMenu = ({ name, selected, setSelected, options = dummyOptions }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const selectRef = useRef(null);


    const dropdownId = `select-dropdown-${name}`;

    const handleSelectChange = (value) => {
        setSelected(value);
        closeDropdown();
    };

    const openDropdown = () => {
        setIsDropdownOpen(true);
    };

    const closeDropdown = () => {
        setIsDropdownOpen(false);
    };

    const handleClickOutside = (e) => {
        if (selectRef.current && !selectRef.current.contains(e.target)) {
            closeDropdown();
        }
    };

    useEffect(() => {
        window.addEventListener('click', handleClickOutside);
        return () => {
            window.removeEventListener('click', handleClickOutside);
        };
    }, []);

    return (
        <div className="relative" ref={selectRef}>
            <div className="relative z-10">
                <button
                    onClick={() => {
                        isDropdownOpen ? closeDropdown() : openDropdown();
                    }}
                    className="bg-slate-50 hover:bg-slate-200 focus:ring-2 focus:outline-none focus:ring-slate-100 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
                    type="button">
                    {(options.find((option) => option.value === selected) || options[0]).label}
                    <svg className="w-2.5 h-2.5 ml-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                        <path stroke="currentColor" strokeLinecap='round' strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4" />
                    </svg>
                </button>
            </div>

            {/* Dropdown Options */}
            <ul
                className={`absolute z-20 w-48  mt-2 py-1 bg-white border rounded shadow-lg ${isDropdownOpen ? '' : 'hidden'
                    }`}
            >
                {options.map((option) => (
                    <li
                        key={option.value}
                        onClick={() => handleSelectChange(option.value)}
                        className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                    >
                        {option.label}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default SelectMenu;
