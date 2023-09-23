import React, { useState, useEffect } from 'react';

import Template from '../components/template';
import Article from '../components/article';

import { Link } from 'react-router-dom';

const Snippet = ({ title = "Title", date, description, imagePath = "logo.svg" }) => {
    return (
        <Link to="/blog">
            <main className="flex-grow container mx-auto p-4 hover:shadow-sm">
                <div className="bg-white rounded-lg shadow-lg p-6 flex max-w-lg transition-transform transform hover:scale-105">
                    <div className="flex-1">
                        <h1 className="text-3xl font-semibold">{title}</h1>
                        <p className="text-gray-600">Posted on September 21, 2023</p>
                        <hr className="mb-4 w-5/6" />

                        <div className="w-full mx-2 mt-4 text-justify">
                            <p className='h-44 text-ellipsis overflow-hidden'>Description of the article. Lorem ipsum dolor sit amet,
                                consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                                Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Cursus turpis massa tincidunt dui ut ornare.
                                Vitae elementum curabitur vitae nunc. Luctus accumsan tortor posuere ac ut. Mauris vitae ultricies leo integer
                                malesuada. Eget aliquet nibh praesent tristique magna sit amet purus gravida. Dolor sed viverra ipsum nunc aliquet
                                bibendum enim facilisis gravida. Iaculis at erat pellentesque adipiscing commodo elit at imperdiet dui. Id neque
                                aliquam vestibulum morbi blandit cursus risus. Dolor sit amet consectetur adipiscing elit. Consequat id porta nibh
                                venenatis. Laoreet id donec ultrices tincidunt. Eu sem integer vitae justo eget magna. Morbi tristique senectus et
                                netus et malesuada fames ac. Arcu ac tortor dignissim convallis aenean. Amet justo donec enim diam.</p></div>
                    </div>
                    <div className="flex-shrink-0">
                        <img
                            src={imagePath}
                            alt="Article Image"
                            className="w-16 h-16 object-cover rounded-full"
                        />
                    </div>
                </div>
            </main>
        </Link>
    );
}

const Blog = () => {
    return (
        <Template>
            <div class="grid grid-rows-4 grid-flow-col gap-4 px-32">
                <Snippet />
                <Snippet />
                <Snippet />
                <Snippet />
                <Snippet />
                <Snippet />
                <Snippet />
                <Snippet />
                <Snippet />
                <Snippet />
                <Snippet />

            </div>
        </Template>
    );
};

export default Blog;
