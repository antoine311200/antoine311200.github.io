import React from "react";


export default function Paragraph({ children }) {
    return (
        <span className='mt-4 sm:mt-1'>
            {children}
            <p className="mt-4"/>
        </span>
    );
}