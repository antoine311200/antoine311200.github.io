import React, { useState } from 'react';

import TextHover from './texthover';

import { Link } from 'react-router-dom';

export default function Header() {
    const [menuOpen, setMenuOpen] = useState(false);

    // Function to toggle the menu on small screens
    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    return (
        <div className=''>
            <header className="text-white px-7 z-40">
                <section>
                    <nav className="py-5 flex justify-between">
                        <Link to="/"><h1 className="text-md md:text-2xl">Antoine Debouchage</h1></Link>
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
                            className={`${menuOpen ? 'block scale-100' : 'opacity-0 md:opacity-100 hidden'}
                            fixed top-[8%] right-[5%] flex flex-col gap-1 bg-white text-black rounded-md px-3 py-2
                            md:relative md:flex md:justify-center md:gap-4 md:bg-transparent md:text-white md:flex-row md:opacity-100 md:scale-100 md:right-0 md:top-0
                            transition-all duration-100`}>
                            <li key="home">
                                <Link to="/" onClick={toggleMenu}>
                                    <TextHover text='Home' />
                                </Link>
                            </li>
                            <li key="resume">
                                <Link to="/resume" onClick={toggleMenu}>
                                    <TextHover text='Resume' />
                                </Link>
                            </li>
                            <li key="projects">
                                <Link to="/projects" onClick={toggleMenu}>
                                    <TextHover text='Projects' />
                                </Link>
                            </li>
                            <li key="publications">
                                <Link to="/publications" onClick={toggleMenu}>
                                    <TextHover text='Publications' />
                                </Link>
                            </li>
                            <li key="blog">
                                <Link to="/blog" onClick={toggleMenu}>
                                    <TextHover text='Blog' />
                                </Link>
                            </li>
                            <li key="contact">
                                <a href="/#/contact" onClick={toggleMenu}>
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