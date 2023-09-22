import React from 'react';

import TextHover from './texthover';

import { Link } from 'react-router-dom';

export default function Header() {
    return (
        <div>
            <header className=" text-white px-7">
                <section>
                    <nav className='mb-12 py-5 flex justify-between'>
                        <h1 className="text-2xl">Antoine Debouchage</h1>
                        <ul className='flex justify-center gap-4'>
                            <li>
                                <Link to="/">
                                    <TextHover text='Home' />
                                </Link>
                            </li>
                            <li>
                                <Link to="/resume">
                                    <TextHover text='Resume' />
                                </Link>
                            </li>
                            <li>
                                <Link to="/project">
                                    <TextHover text='Project' />
                                </Link>
                            </li>
                            <li>
                                <Link to="/blog">
                                    <TextHover text='Blog' />
                                </Link>
                            </li>
                            <li>
                                <a href="#">
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