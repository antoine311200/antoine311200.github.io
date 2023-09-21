import React from 'react';


export default function TextHover({ text }) {
    return (
        <p className='relative group'>
            <span>{text}</span>
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all group-hover:w-full duration-500"></span>
        </p>
    );
}