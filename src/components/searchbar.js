import React, { useState } from 'react';

const SearchBar = ({ placeholder = "Search...", searchTerm, setSearchTerm }) => {
    const handleInputChange = (e) => {
        setSearchTerm(e.target.value);
    };

    return (
        <div className="relative flex-grow">
            <input
                type="text"
                className="w-full px-4 py-2 pr-10 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={placeholder}
                value={searchTerm}
                onChange={handleInputChange}
            />
            <i className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                <i className="fa fa-search"></i>
            </i>
        </div>
    );
};

export default SearchBar;