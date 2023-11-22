import React, { useState, useEffect } from 'react';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import { Link } from 'react-router-dom';

import Template from '../components/template';
import SearchBar from '../components/searchbar';
import SelectMenu from '../components/dropdown';

import title2uri from '../utils';

import '../style/blog.css';

const Snippet = ({ title = "Title", date, description, keywords, imagePath = "banner.svg" }) => {
    return (
        <Link to={`/blog/${encodeURIComponent(title2uri(title))}`}>
            <div className="container mx-auto p-3 hover:shadow-sm">
                <div style={{ height: "430px" }} className="container max-w-md mx-auto bg-white rounded-md shadow-md overflow-hidden transition-transform transform hover:scale-105">
                    <div className="flex-shrink-0">
                        <img className="w-full h-32 object-cover" src={imagePath} alt="Modern building architecture" />
                    </div>
                    <div className="p-4 xl:p-8" style={{ height: "calc(100% - 32px)" }}>
                        <h1 className="block mt-1 text-lg leading-tight font-medium text-black">{title}</h1>
                        <p className="text-gray-600 text-sm">Posted on {date}</p>
                        <div className="mt-2"></div>
                        {
                            keywords.slice(0, 3).map((keyword, index) => (
                                <span key={index} style={{ fontSize: "9px" }} className="inline-block bg-gray-200 rounded-full px-2 py-1 font-semibold text-gray-700 mr-1 mb-1">{keyword}</span>
                            ))
                        }
                        <p className="mt-2 text-slate-500 h-32 text-sm xl:text-base">{description}</p>
                    </div>
                </div>
            </div>
        </Link>
    );
}

// const Grid = ({ items }) => {
//     return (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//             {items.map((item) => (
//                 <Snippet
//                     key={item.id}
//                     title={item.title}
//                     date={item.date}
//                     description={item.description}
//                 />
//             ))}
//         </div>
//     );
// }

const Blog = ({ dataArticles }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTag, setSelectedTag] = useState('');
    const [sortType, setSortType] = useState('date-recent');

    const filteredArticles = dataArticles
        .filter((snippet) =>
            snippet.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            snippet.keywords.some((keyword) =>
                keyword.toLowerCase().includes(searchTerm.toLowerCase())
            )
        )
        .filter((snippet) =>
            selectedTag ? snippet.keywords.some((keyword) =>
                keyword.toLowerCase() === selectedTag.toLowerCase()
            ) : true
        )
        .sort((a, b) => {
            if (sortType === 'date-recent') {
                return new Date(b.date) - new Date(a.date);
            }
            else if (sortType === 'date-old') {
                return new Date(a.date) - new Date(b.date);
            }
            else {
                return a.title.localeCompare(b.title);
            }
        });


    useEffect(() => {
        document.title = `Blog | Antoine Debouchage`;
    }, []);

    const tagOptions = [
        { value: '', label: 'All Tags' },
        { value: 'mathematics', label: 'Mathematics' },
        { value: 'tensor networks', label: 'Tensor networks' },
        { value: 'chemistry', label: 'Chemistry' },
    ];

    const orderOptions = [
        { value: 'date-recent', label: 'Sort by Date (Recent)' },
        { value: 'date-old', label: 'Sort by Date (Oldest)' },
        { value: 'alphabetical', label: 'Sort Alphabetically' },
    ];

    return (
        <Template iconColor="black">
            <div className="container mx-auto px-4">
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:space-x-4 gap-y-3">
                    <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} placeholder="Search articles..." />
                    <div className="flex space-x-4">
                        <SelectMenu name="tags" selected={selectedTag} setSelected={setSelectedTag} options={tagOptions} />
                        <SelectMenu name="order" selected={sortType} setSelected={setSortType} options={orderOptions} />
                    </div>
                </div>
                <hr className="my-4" />
                <TransitionGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredArticles.map((item, index) => (
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
