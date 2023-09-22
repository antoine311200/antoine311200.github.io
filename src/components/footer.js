import React from 'react';

// Import LinkedIn and GitHub icons
import { FaLinkedin, FaGithub, FaTwitter, FaKaggle } from 'react-icons/fa';

export default function Footer( { iconColor = 'white' } ) {
    return (
        <div>
            <footer className='py-4 fixed bottom-0 left-0 right-0 text-white flex justify-center gap-4'>

                <a href='https://www.linkedin.com/in/antoine-debouchage/' target='_blank' rel='noreferrer'>
                    <FaLinkedin style={{color: iconColor}}/>
                </a>
                <a href='https://github.com/antoine311200/' target='_blank' rel='noreferrer'>
                    <FaGithub style={{color: iconColor}}/>
                </a>
                <a href='https://twitter.com/antoine311200/' target='_blank' rel='noreferrer'>
                    <FaTwitter style={{color: iconColor}}/>
                </a>
                <a href='https://www.kaggle.com/antoinedebouchage/' target='_blank' rel='noreferrer'>
                    <FaKaggle style={{color: iconColor}}/>
                </a>
            </footer>
        </div>
    );
}