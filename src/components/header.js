import React, { useState } from 'react';

import TextHover from './texthover';

import { Link } from 'react-router-dom';

// // export default function Header() {
// //     return (
// //         <div>
// //             <header className=" text-white px-7">
// //                 <section>
// //                     <nav className='mb-12 py-5 flex justify-between'>
// //                         <h1 className="text-2xl">Antoine Debouchage</h1>
// //                         <ul className='flex justify-center gap-4'>
// //                             <li>
// //                                 <Link to="/">
// //                                     <TextHover text='Home' />
// //                                 </Link>
// //                             </li>
// //                             <li>
// //                                 <Link to="/resume">
// //                                     <TextHover text='Resume' />
// //                                 </Link>
// //                             </li>
// //                             <li>
// //                                 <Link to="/project">
// //                                     <TextHover text='Project' />
// //                                 </Link>
// //                             </li>
// //                             <li>
// //                                 <Link to="/blog">
// //                                     <TextHover text='Blog' />
// //                                 </Link>
// //                             </li>
// //                             <li>
// //                                 <a href="#">
// //                                     <TextHover text='Contact' />
// //                                 </a>
// //                             </li>
// //                         </ul>
// //                     </nav>
// //                 </section>
// //             </header>
// //         </div>
// //     );
// // }
export default function Header() {
    const [menuOpen, setMenuOpen] = useState(false);

    // Function to toggle the menu on small screens
    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    return (
        <div className=''>
            <header className="text-white px-7">
                <section>
                    <nav className="mb-12 py-5 flex justify-between">
                        <h1 className="text-2xl">Antoine Debouchage</h1>
                        {/* Toggle button for small screens */}
                        <button
                            className="lg:hidden text-white focus:outline-none"
                            onClick={toggleMenu}
                        >
                            {!menuOpen ? (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            )}
                        </button>
                        {/* Navigation links */}
                        <ul
                            className={`${menuOpen ? 'block' : 'hidden'
                                } lg:flex lg:justify-center lg:gap-4`}
                        >
                            <li>
                                <Link to="/" onClick={toggleMenu}>
                                    <TextHover text='Home' />
                                </Link>
                            </li>
                            <li>
                                <Link to="/resume" onClick={toggleMenu}>
                                    <TextHover text='Resume' />
                                </Link>
                            </li>
                            <li>
                                <Link to="/project" onClick={toggleMenu}>
                                    <TextHover text='Project' />
                                </Link>
                            </li>
                            <li>
                                <Link to="/blog" onClick={toggleMenu}>
                                    <TextHover text='Blog' />
                                </Link>
                            </li>
                            <li>
                                <a href="#" onClick={toggleMenu}>
                                    <TextHover text='Contact' />
                                </a>
                            </li>
                        </ul>
                    </nav>
                </section>
            </header>
        </div>
    );
}