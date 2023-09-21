import React from 'react';

import "../App.css"
import { BsSunFill, BsPencil, BsPaperclip, BsArrowRight } from 'react-icons/bs'
import { FaLinkedin, FaGithub, FaTwitter, FaKaggle } from 'react-icons/fa';

export default function Dashboard() {
    return (
        <div className='bg-white px-10 min-h-screen'>
            <header>
                <nav className='py-5 flex justify-between'>
                    <h1 className='font-bold text-green-600 text-2xl'>Cactus.io</h1>
                    <ul className='flex items-center gap-8 cursor-pointer'>
                        <li><BsSunFill className='text-xl' /></li>
                        <li><a className='bg-gradient-to-r from-teal-500 to-lime-500 text-white px-4 py-2 rounded-md cursor-pointer'>Login</a></li>
                    </ul>
                </nav>
            </header>

            <button data-drawer-target="default-sidebar" data-drawer-toggle="default-sidebar" aria-controls="default-sidebar" type="button" class="inline-flex items-center p-2 mt-2 ml-3 text-sm text-gray-500 rounded-lg sm:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600">
                <span class="sr-only">Open sidebar</span>
                <svg class="w-6 h-6" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path clip-rule="evenodd" fill-rule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"></path>
                </svg>
            </button>
            {/* <a href="#" class="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"> */}

            <aside id="default-sidebar" className='fixed top-1/8 right-0 z-40 w-40 h-screen transition-transform -translate-x-full sm:translate-x-0'>
                <div className='h-full mr-5 px-3 py-4 overflow-y-auto '>
                    <ul className='space-y-2 font-medium'>
                        <li><a className='flex items-center text-white justify-center p-2 gap-x-3 rounded-lg bg-green-400'><span>Process</span><BsArrowRight /></a></li>
                        {/* <li><a>Button 2</a></li>
                        <li><a>Button 3</a></li>
                        <li><a>Button 4</a></li> */}
                    </ul>
                </div>
            </aside>

            <section className='p-4 sm:mr-40 text-center mr-10'>
                <textarea rows="20" className='cactus-scrollbar resize-none bg-white outline-none border-0 border-transparent focus:border-transparent focus:ring-0 p-2 font-thin min-h-fit w-full' placeholder="Paste your document (Ctrl+V) here..." required />
            </section>

            <footer className='py-4 fixed text-lg bottom-0 left-0 right-0 text-teal-700 flex justify-center gap-4'>
                <a className="cursor-pointer"><FaLinkedin /></a>
                <a className="cursor-pointer"><FaGithub /></a>
                <a className="cursor-pointer"><FaTwitter /></a>
                <a className="cursor-pointer"><FaKaggle /></a>
            </footer>
        </div>
    );
}