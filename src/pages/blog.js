import React, { useState, useEffect } from 'react';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import { Link } from 'react-router-dom';

import Template from '../components/template';
import Article from '../components/article';
import SearchBar from '../components/searchbar';

import title2uri from '../utils';

import '../style/blog.css';

const Snippet = ({ title = "Title", date, description, keywords, imagePath = "logo.svg" }) => {
    return (
        <Link to={`/blog/${encodeURIComponent(title2uri(title))}`}>
            <main className="container mx-auto p-4 hover:shadow-sm">
                <div className="bg-white rounded-lg shadow-lg p-6 flex max-w-lg transition-transform transform hover:scale-105">
                    <div className="flex-1">
                        <h1 className="text-3xl font-semibold">{title}</h1>
                        <p className="text-gray-600">Posted on {date}</p>
                        <div className="mt-2"></div>
                        {
                            keywords.slice(0, 3).map((keyword) => (
                                <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-xs font-semibold text-gray-700 mr-2 mb-2">{keyword}</span>
                            ))
                        }
                        <hr className="mb-4 w-5/6" />

                        <div className="w-full mx-2 mt-4 text-justify">
                            <p className='h-44 text-ellipsis overflow-hidden'>{description}</p></div>
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

const Grid = ({ items }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
                <Snippet
                    key={item.id}
                    title={item.title}
                    date={item.date}
                    description={item.description}
                />
            ))}
        </div>
    );
}

const Blog = ({ dataArticles }) => {
    const [filteredItems, setFilteredItems] = useState(dataArticles); // Replace 'data' with your actual data

    const handleSearch = (searchTerm) => {
        const filtered = dataArticles.filter(
            (item) =>
                item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.keywords.some((keyword) =>
                    keyword.toLowerCase().includes(searchTerm.toLowerCase())
                )
        );
        setFilteredItems(filtered);
    };

    useEffect(() => {
        document.title = `Blog | Antoine Debouchage`;
    }, []);


    return (
        <Template>
            <div className="container mx-auto p-4">
                <SearchBar onSearch={handleSearch} placeholder="Search articles..." />
                <hr className="my-4" />
                {/* <Grid items={filteredItems} /> */}
                <TransitionGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredItems.map((item, index) => (
                        <CSSTransition
                            key={index}
                            timeout={300}
                            classNames="fade"
                        >
                            <Snippet {...item} />
                        </CSSTransition>
                    ))}
                </TransitionGroup>
            </div>
        </Template>
    );
};

export default Blog;
