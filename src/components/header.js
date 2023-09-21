import React from 'react';

import TextHover from './texthover';

export default function Header() {
    return (
        <div>
            <header className=" text-white px-7">
                <section>
                    <nav className='mb-12 py-5 flex justify-between'>
                        <h1 className="text-2xl">Antoine Debouchage</h1>
                        <ul className='flex justify-center gap-4'>
                            <li>
                                <a href="#">
                                    <TextHover text='Home' />
                                </a>
                            </li>
                            <li>
                                <a href="#">
                                    <TextHover text='Resume' />
                                </a>
                            </li>
                            <li>
                                <a href="#">
                                    <TextHover text='Project' />
                                </a>
                            </li>
                            <li>
                                <a href="#">
                                    <TextHover text='Blog' />
                                </a>
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