import { menu } from '@material-tailwind/react';
import React, { useState, useRef, useEffect } from 'react';
import { FaCheck } from "react-icons/fa6";


export default function TagInput({ whitelist, defaultTags, useDropdown = true, separateTags = true, maxTags = 10, onTagsChange }) {
    const [optionTags, setOptionTags] = useState(whitelist || []);
    const [tags, setTags] = useState(defaultTags || []);
    const [inputValue, setInputValue] = useState('');
    const [error, setError] = useState('')
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

    const inputRef = useRef(null);
    const ulRef = useRef(null);

    const handleInputChange = (e) => {
        setError('');
        setInputValue(e.target.value);
        setOptionTags(whitelist.filter(tag => tag.toLowerCase().includes(e.target.value.toLowerCase())));
    };

    const updateDropdownPosition = () => {
        if (inputRef.current && ulRef.current) {
            const buttonRect = inputRef.current.getBoundingClientRect();
            const dropdownRect = ulRef.current.getBoundingClientRect();
            const top = buttonRect.top + buttonRect.height;
            const left = buttonRect.left;
            setDropdownPosition({ top, left });
        }
    };

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter' && inputValue.trim() !== '') {
            if (tags.includes(inputValue.trim())) {
                setError('Tag already exists');
                return;
            }
            if (tags.length >= maxTags) {
                setError(`You can only add ${maxTags} tags`);
                return;
            }

            e.preventDefault();
            setTags([...tags, inputValue.trim()]);
            setInputValue('');
            setError('');
            setOptionTags(whitelist);
        }
        else if (e.key === 'Backspace' && inputValue === '') {
            handleTagRemove(tags[tags.length - 1]);
        }
        else if (e.key === 'Escape') {
            setIsDropdownOpen(false);
        }
        if (useDropdown) updateDropdownPosition();
    };

    const handleTagRemove = (tagToRemove) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
        if (useDropdown) updateDropdownPosition();
    };

    useEffect(() => {
        onTagsChange(tags);
    }, [tags, onTagsChange]);

    useEffect(() => {
        if (isDropdownOpen) {
            if (useDropdown) updateDropdownPosition();
        }
    }, [isDropdownOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (inputRef.current && !inputRef.current.contains(event.target) && ulRef.current && !ulRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);


    return (
        <div className="flex flex-col gap-1">
            <div className={`flex ${separateTags ? "flex-col" : "flex-wrap"} gap-2 text-black`}>
                <div className='flex flex-wrap gap-2'>
                {tags.map((tag, index) => (
                    <div key={index} className="relative bg-gray-200 rounded-md flex items-center px-3 py-1 ease-in-out duration-200 transition-all">
                        <span className="mr-2">{tag}</span>
                        <button onClick={() => handleTagRemove(tag)} className="text-gray-600 hover:text-gray-800 focus:outline-none">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                ))}
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex-1 bg-gray-100 rounded-md px-3 py-1 focus:outline-none"
                    placeholder="Type and press enter..."
                />
                {useDropdown && optionTags.length > 0 &&
                <ul ref={ulRef} className={`absolute bottom-0 left-0 white-scrollbar overflow-y-scroll text-black z-20 w-48 max-h-48 h-auto mt-2 py-1 bg-white border rounded-md shadow-lg ${isDropdownOpen ? '' : 'hidden'}`}
                    style={{ top: dropdownPosition.top, left: dropdownPosition.left }}>
                    {optionTags.map((option) => (
                        <li
                            key={option}
                            onClick={() => {
                                if (tags.includes(option)) setTags(tags.filter(tag => tag !== option));
                                else {
                                    if (tags.length >= maxTags) {
                                        setError(`You can only add ${maxTags} tags`);
                                        return;
                                    }
                                    setTags([...tags, option]);
                                }
                                updateDropdownPosition();
                            }}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                        >
                            <div className='flex justify-between items-center gap-2'>
                                <span>{option}</span>
                                { tags.includes(option) &&
                                    <span className="text-md text-blue-500"><FaCheck /></span>
                                }
                            </div>
                        </li>
                    ))}
                </ul>}
            </div>
            {error && <span className="text-red-500 text-xs">{error}</span>}
        </div>
    );
}