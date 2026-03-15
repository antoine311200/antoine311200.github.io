import React, { useState } from 'react';

import TextHover from './texthover';

import { Link } from 'react-router-dom';

const NAV_LINKS = [
    { label: 'Home',         to: '/' },
    { label: 'Resume',       to: '/resume' },
    { label: 'Projects',     to: '/projects' },
    { label: 'Publications', to: '/publications' },
    { label: 'Blog',         to: '/blog' },
    { label: 'Contact',      href: '/#/contact' },
];

export default function Header() {
    const [menuOpen, setMenuOpen] = useState(false);
    const close = () => setMenuOpen(false);

    return (
        <>
            <header className="text-white px-7 z-40 relative">
                <nav className="py-5 flex justify-between items-center">
                    <Link to="/" onClick={close}>
                        <h1 className="text-md md:text-2xl">Antoine Debouchage</h1>
                    </Link>

                    {/* Hamburger / close — mobile only */}
                    <button
                        className="lg:hidden text-white focus:outline-none z-[60]"
                        onClick={() => setMenuOpen(s => !s)}
                        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                    >
                        {menuOpen ? (
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                    </button>

                    {/* Desktop nav */}
                    <ul className="hidden lg:flex items-center gap-6">
                        {NAV_LINKS.map(({ label, to, href }) => (
                            <li key={label}>
                                {to ? (
                                    <Link to={to}><TextHover text={label} /></Link>
                                ) : (
                                    <a href={href}><TextHover text={label} /></a>
                                )}
                            </li>
                        ))}
                    </ul>
                </nav>
            </header>

            {/* Mobile dropdown panel */}
            {menuOpen && (
                <div
                    className="lg:hidden fixed top-16 right-4 z-50 w-44 rounded-2xl overflow-hidden shadow-2xl"
                    style={{ border: '1px solid rgba(71,85,105,0.5)' }}
                >
                    <nav
                        style={{ background: 'rgba(13,22,40,0.97)', backdropFilter: 'blur(16px)' }}
                    >
                        {NAV_LINKS.map(({ label, to, href }, i) => {
                            const cls = `block w-full text-left px-5 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors${i < NAV_LINKS.length - 1 ? ' border-b border-slate-800/70' : ''}`;
                            return to ? (
                                <Link key={label} to={to} onClick={close} className={cls}>{label}</Link>
                            ) : (
                                <a key={label} href={href} onClick={close} className={cls}>{label}</a>
                            );
                        })}
                    </nav>
                </div>
            )}
        </>
    );
}