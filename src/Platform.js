import React from 'react';

import './App.css';
import { BsSunFill, BsPencil, BsPaperclip } from 'react-icons/bs'
import { FaLinkedin, FaGithub, FaTwitter, FaKaggle } from 'react-icons/fa';
import {
    BrowserRouter as Router, Route, Routes, Link
} from "react-router-dom";
import Dashboard from './pages/dashboard';

export default function Platform() {
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

            <section className='text-center p-10 pt-32'>
                <h1 className='text-4xl py-2'>Discover <span className='font-bold bg-clip-text bg-gradient-to-r from-teal-600 to-lime-500 text-transparent'>Cactus.io</span></h1>
                <h2 className='text-xl text-gray-800'>The ultimate multi-modal anonymisation and debiasing platform!</h2>
                <p className='py-5 leading-6 text-md text-gray-600'>With <span className='font-bold bg-clip-text bg-gradient-to-r from-teal-600 to-lime-500 text-transparent'>Cactus.io</span>, you can anonymise and debias your data in a few clicks. We provide a large palette of tools, API, models <br />to single client to big business in order to securize your pipeline input and output.</p>
                <div className='flex items-center justify-center gap-x-6 mt-8'>
                    <a className='px-3 py-2 rounded-md bg-green-400 hover:bg-teal-500 transition-colors hover:transition-colors delay-100 text-white font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 cursor-pointer'><Link to="/app">Get started</Link></a>
                    <a className='leading-6 text-gray-900 cursor-pointer'>Learn more <span aria-hidden="true">→</span></a>
                </div>
            </section>

            {/* <section className='flex fixed h-screen left-0 align-middle p-5 pt-8'>
                <ul className="pt-6">
                    <li className='flex rounded-md p-2 cursor-pointer border-lime-600 text-sm items-center gap-x-4'><BsPencil/></li>
                    <li className='flex rounded-md p-2 cursor-pointer border-lime-600 text-sm items-center gap-x-4'><BsPaperclip/></li>
                </ul>
            </section> */}
            <footer className='py-4 fixed text-lg bottom-0 left-0 right-0 text-teal-700 flex justify-center gap-4'>
                <a className="cursor-pointer"><FaLinkedin /></a>
                <a className="cursor-pointer"><FaGithub /></a>
                <a className="cursor-pointer"><FaTwitter /></a>
                <a className="cursor-pointer"><FaKaggle /></a>
            </footer>
        </div>
    );
}
